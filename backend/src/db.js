const mongoose = require('mongoose');

async function connect() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: MONGO_URI is required in production (the in-memory database loses all data on restart).');
      process.exit(1);
    }
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('ghorerbazar');
    console.log('Using in-memory MongoDB (set MONGO_URI for persistence)');
  }
  if (uri.startsWith('mongodb+srv://')) {
    // Some networks/routers refuse SRV lookups; fall back to public DNS
    const dns = require('dns');
    try { await dns.promises.resolveSrv('_mongodb._tcp.' + new URL(uri).hostname); }
    catch { dns.setServers(['8.8.8.8', '1.1.1.1']); }
  }
  await mongoose.connect(uri);
  return mongoose.connection;
}
module.exports = { connect };
