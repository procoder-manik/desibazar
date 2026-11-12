// Full-database backup and restore as one JSON file. Used by the admin panel, the CLI scripts
// (npm run backup / npm run restore -- <file>) and the automatic daily backup.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const models = require('./models');

const COLLECTIONS = ['User', 'Category', 'Product', 'Review', 'Coupon', 'Order', 'Subscriber', 'Settings', 'Popup'];
const DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const KEEP = Number(process.env.BACKUP_KEEP || 14);

async function dump() {
  const data = {};
  for (const name of COLLECTIONS) data[name] = await models[name].find().lean();
  return { app: 'ghorerbazar', version: 1, createdAt: new Date().toISOString(), counts: Object.fromEntries(COLLECTIONS.map((n) => [n, data[n].length])), data };
}

// Replaces every collection with the backup's contents.
async function restore(backup) {
  if (backup?.app !== 'ghorerbazar' || !backup.data) throw Object.assign(new Error('This is not a Ghorer Bazar backup file'), { status: 400 });
  for (const name of COLLECTIONS) {
    const docs = backup.data[name];
    if (!Array.isArray(docs)) continue;
    const M = models[name];
    await M.deleteMany({});
    if (docs.length) await M.collection.insertMany(docs.map(revive));
  }
  return Object.fromEntries(COLLECTIONS.map((n) => [n, backup.data[n]?.length || 0]));
}

// JSON turns ObjectIds and Dates into strings; turn them back.
const OID = /^[a-f0-9]{24}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
function revive(v, key) {
  if (Array.isArray(v)) return v.map((x) => revive(x, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x, k)]));
  if (typeof v === 'string' && OID.test(v) && key && (key === '_id' || /^(user|product|category|order|variant)$/.test(key))) return new mongoose.Types.ObjectId(v);
  if (typeof v === 'string' && ISO.test(v)) return new Date(v);
  return v;
}

async function saveToDisk() {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(await dump()));
  // keep only the newest KEEP files
  const files = fs.readdirSync(DIR).filter((f) => f.startsWith('backup-') && f.endsWith('.json')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.unlinkSync(path.join(DIR, f));
  return file;
}

// Checks hourly; writes a backup when the last one is older than 24 hours.
function scheduleDaily(getSettings) {
  const tick = async () => {
    try {
      const s = await getSettings();
      if (!s.backups?.auto) return;
      if (s.backups.lastAt && Date.now() - new Date(s.backups.lastAt).getTime() < 24 * 3600e3) return;
      const file = await saveToDisk();
      await models.Settings.updateOne({ key: 'store' }, { 'backups.lastAt': new Date() });
      console.log('Automatic backup saved:', file);
    } catch (e) { console.error('Automatic backup failed:', e.message); }
  };
  setTimeout(tick, 60 * 1000);
  setInterval(tick, 3600 * 1000).unref();
}

module.exports = { dump, restore, saveToDisk, scheduleDaily, DIR };
