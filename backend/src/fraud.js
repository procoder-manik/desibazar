// Fraud check for new orders. Adds up a risk score from simple, explainable signals:
//   blocklist hit, fake-looking phone, too many orders from one phone or network, a history of
//   cancelled / returned orders, a repeat of the same pending order, a bot-filled hidden field.
// score >= blockScore  -> the order is refused (logged in FraudLog)
// score >= flagScore   -> the order is placed but marked "needs review" for staff
const { Order, Blocklist, FraudLog } = require('./models');

const DAY = 864e5;
const norm = (v) => String(v || '').trim().toLowerCase();

// 01711111111, 01700000000, 01234567890 and similar made-up numbers
function fakePhone(p) {
  const d = String(p).replace(/\D/g, '').slice(-10); // 1XXXXXXXXX after the leading 0
  if (!d) return false;
  const tail = d.slice(3);                              // the 7 personal digits
  if (/^(\d)\1{6}$/.test(tail)) return true;           // 1111111
  if (/^(\d)\1{7,}/.test(d.slice(2))) return true;
  if ('01234567890123456789'.includes(tail) || '98765432109876543210'.includes(tail)) return true; // 1234567 / 7654321
  if (/^(\d{2})\1{3}$/.test(tail.slice(0, 6)) && new Set(tail).size <= 2) return true; // 121212...
  return false;
}
function fakeName(n) {
  const s = String(n || '').trim();
  return s.length < 2 || /^\d+$/.test(s) || /^(.)\1+$/.test(s.replace(/\s/g, '')) || /^(test|asdf|qwer|xxx|abc)\b/i.test(s);
}

/**
 * @returns {{ action: 'allow'|'review'|'block', score: number, reasons: string[] }}
 * input: { phone, email, ip, name, address, items:[{qty}], honeypot, total, ua }
 */
async function check(settings, input) {
  const cfg = settings.fraud || {};
  const reasons = [];
  let score = 0;
  const add = (pts, why) => { score += pts; reasons.push(why); };

  // always on: a hidden form field only bots fill in
  if (input.honeypot) return { action: 'block', score: 100, reasons: ['Bot signature (hidden field filled in)'] };

  // the blocklist is the owner's own decision, so it applies even when the automatic checks are switched off
  const phone = input.phone; const ip = input.ip; const email = norm(input.email);
  const hit = await Blocklist.findOne({ $or: [{ type: 'phone', value: phone }, ...(ip ? [{ type: 'ip', value: norm(ip) }] : []), ...(email ? [{ type: 'email', value: email }] : [])] }).lean();
  if (hit) return { action: 'block', score: 100, reasons: [`On the blocklist (${hit.type}: ${hit.value}${hit.reason ? ` · ${hit.reason}` : ''})`] };
  if (cfg.enabled === false) return { action: 'allow', score: 0, reasons: [] };

  if (cfg.blockFakePhones !== false && fakePhone(phone)) add(60, 'Phone number looks made up');
  if (fakeName(input.name)) add(15, 'Name looks fake');
  if (String(input.address || '').trim().length < 12) add(10, 'Very short address');
  if ((input.items || []).some((i) => i.qty >= 20)) add(10, 'Unusually large quantity');

  const now = Date.now();
  const [phoneActive, ipRecent, past, dup] = await Promise.all([
    Order.countDocuments({ 'shipping.phone': phone, createdAt: { $gte: new Date(now - DAY) }, status: { $nin: ['cancelled', 'returned'] } }),
    ip ? Order.countDocuments({ 'risk.ip': ip, createdAt: { $gte: new Date(now - 36e5) } }) : 0,
    Order.countDocuments({ 'shipping.phone': phone, status: { $in: ['cancelled', 'returned'] } }),
    Order.countDocuments({ 'shipping.phone': phone, status: 'pending', createdAt: { $gte: new Date(now - 30 * 6e4) } }),
  ]);
  const maxPhone = cfg.maxOrdersPerPhone || 3;
  if (phoneActive >= maxPhone * 2) add(80, `${phoneActive} orders from this phone in 24 hours`);
  else if (phoneActive >= maxPhone) add(50, `${phoneActive} orders from this phone in 24 hours`);
  const maxIp = cfg.maxOrdersPerIp || 5;
  if (ipRecent >= maxIp * 2) add(70, `${ipRecent} orders from this network in 1 hour`);
  else if (ipRecent >= maxIp) add(40, `${ipRecent} orders from this network in 1 hour`);
  const bad = cfg.badHistory || 3;
  if (past >= bad) add(70, `${past} earlier orders from this phone were cancelled or returned`);
  else if (past >= Math.max(1, bad - 1)) add(30, `${past} earlier orders from this phone were cancelled or returned`);
  if (dup) add(30, 'Another pending order from this phone in the last 30 minutes');

  const block = cfg.blockScore || 80; const flag = cfg.flagScore || 40;
  score = Math.min(100, score);
  return { action: score >= block ? 'block' : score >= flag ? 'review' : 'allow', score, reasons };
}

const logBlocked = (input, r) => FraudLog.create({
  phone: input.phone, email: input.email, ip: input.ip, name: input.name, ua: String(input.ua || '').slice(0, 200),
  score: r.score, reasons: r.reasons, total: input.total,
}).catch(() => {});

module.exports = { check, logBlocked, fakePhone };
