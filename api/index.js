const createApp = require('../backend/src/app');
const { initDb } = require('../backend/src/db/database');

let app;

module.exports = async (req, res) => {
  if (!app) {
    await initDb();
    app = createApp();
  }
  return app(req, res);
};
