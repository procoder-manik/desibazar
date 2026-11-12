require('dotenv').config();
const { connect } = require('./db');
const app = require('./app');

(async () => {
  await connect();
  if (!process.env.MONGO_URI) await require('./seed').run();
  require('./backup').scheduleDaily(require('./pricing').getSettings);
  require('./routes/leads').startSweeper();
  const port = process.env.PORT || 5001;
  app.listen(port, () => console.log(`API on http://localhost:${port}`));
})();
