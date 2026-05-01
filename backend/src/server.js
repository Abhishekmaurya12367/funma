/**
 * Server entry point — binds the Express app to a port.
 *
 * This is the only place that deals with the network. The app itself
 * is in app.js and can be imported independently by tests.
 *
 * initDb() is async (sql.js uses WebAssembly which loads asynchronously).
 * We await it before starting the HTTP server so we fail fast if DB is broken.
 */

const { initDb } = require('./db/database');
const createApp = require('./app');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDb();
    console.log('[DB] sql.js SQLite initialized');
  } catch (err) {
    console.error('[DB] Failed to initialize database:', err.message);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`[SERVER] Expense Tracker API listening on http://localhost:${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown — give in-flight requests time to complete
  const shutdown = (signal) => {
    console.log(`\n[SERVER] ${signal} received — shutting down gracefully`);
    server.close(() => {
      console.log('[SERVER] HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start();
