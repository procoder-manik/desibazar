// npm run backup                     -> writes backups/backup-<time>.json
// npm run restore -- <file> --yes    -> replaces the database with that backup
require('dotenv').config();
const fs = require('fs');
const backup = require('./backup');

const [cmd, file, flag] = process.argv.slice(2);
require('./db').connect().then(async () => {
  if (cmd === 'backup') {
    console.log('Saved', await backup.saveToDisk());
  } else if (cmd === 'restore') {
    if (!file || !fs.existsSync(file)) throw new Error('Usage: npm run restore -- path/to/backup.json --yes');
    if (flag !== '--yes') throw new Error('This replaces ALL current data. Re-run with --yes to confirm.');
    console.log('Safety copy of current data:', await backup.saveToDisk());
    console.log('Restored:', await backup.restore(JSON.parse(fs.readFileSync(file, 'utf8'))));
  } else throw new Error('Unknown command');
  process.exit(0);
}).catch((e) => { console.error(e.message); process.exit(1); });
