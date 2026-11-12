// Create an admin, or promote an existing user and reset their password.
// Usage: npm run make-admin -- <phone> <password> [name]
require('dotenv').config();
const bcrypt = require('bcryptjs');

const [phone, password, name = 'Admin'] = process.argv.slice(2);
if (!/^01\d{9}$/.test(phone || '') || !password || password.length < 6) {
  console.log('Usage: npm run make-admin -- 01XXXXXXXXX yourPassword [Name]   (password 6+ characters)');
  process.exit(1);
}

require('./db').connect().then(async () => {
  const { User } = require('./models');
  const hash = await bcrypt.hash(password, 10);
  const existing = await User.findOne({ phone });
  if (existing) {
    existing.role = 'admin';
    existing.password = hash;
    await existing.save();
    console.log(`Updated ${phone}: role=admin, password reset.`);
  } else {
    await User.create({ name, phone, password: hash, role: 'admin' });
    console.log(`Created admin ${phone}.`);
  }
  process.exit(0);
}).catch((e) => { console.error(e.message); process.exit(1); });
