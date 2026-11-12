// HTTP hardening: security headers, rate limits and NoSQL-injection filtering.
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const limiter = (windowMin, max, message) => rateLimit({
  windowMs: windowMin * 60 * 1000, max, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: message || 'Too many requests. Please wait a few minutes and try again.' },
});

const limits = {
  global: limiter(1, 300),
  auth: limiter(15, 10, 'Too many sign-in attempts. Please wait 15 minutes.'),
  order: limiter(10, 20, 'Too many orders from this network. Please wait a few minutes.'),
  light: limiter(10, 40),
};

// Drop keys like "$gt" or "a.b" anywhere in body/query/params so they can't change Mongo queries.
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    for (const k of Object.keys(v)) {
      if (k.startsWith('$') || k.includes('.')) delete v[k];
      else v[k] = clean(v[k]);
    }
  }
  return v;
}
function sanitize(req, _res, next) {
  clean(req.body); clean(req.params);
  // Express 4 query object is writable; strip operator objects from it too
  for (const k of Object.keys(req.query || {})) if (typeof req.query[k] === 'object') delete req.query[k];
  next();
}

function checkConfig() {
  const prod = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET || '';
  if (prod && (secret.length < 32 || secret === 'change-me')) {
    console.error('FATAL: set a strong JWT_SECRET (32+ random characters) in production.');
    process.exit(1);
  }
  if (!secret) console.warn('Warning: JWT_SECRET is not set; using an insecure development secret.');
}

module.exports = {
  headers: helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }),
  limits, sanitize, checkConfig,
};
