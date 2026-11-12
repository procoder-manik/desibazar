const express = require('express');
const cors = require('cors');
require('express-async-errors');
const security = require('./security');

security.checkConfig();
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1); // behind Nginx/Render/Railway

// Allow CLIENT_URL (comma separated); in development also localhost / LAN IPs on any port.
const allowed = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((s) => s.trim());
const devHost = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowed.includes(origin) || (process.env.NODE_ENV !== 'production' && devHost.test(origin))) }));
app.use(security.headers);
app.use('/api', security.limits.global);

// big bodies only for the admin restore endpoint
app.use('/api/admin/restore', express.json({ limit: '50mb' }));
app.use(express.json({ limit: '200kb' }));
app.use(security.sanitize);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/extras'));
app.use('/api', require('./routes/settings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/catalog'));
app.use('/api/orders', require('./routes/orders'));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  const client = err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000 || err.type === 'entity.too.large';
  if (!client) console.error(err);
  const msg = err.code === 11000 ? 'That value already exists' : client || process.env.NODE_ENV !== 'production' ? err.message : 'Something went wrong';
  res.status(err.status || (client ? 400 : 500)).json({ error: msg });
});
module.exports = app;
