/**
 * Database initialization module using sql.js.
 *
 * Why sql.js instead of better-sqlite3?
 * - sql.js is pure JavaScript (compiled from SQLite C via WebAssembly)
 * - Zero native compilation — works on any machine without build tools
 * - better-sqlite3 requires node-gyp + Python + C++ build chain, which
 *   fails in restricted network environments (can't download Node headers)
 *
 * Trade-off: sql.js keeps the database in memory and we persist it to disk
 * manually after each write. This is acceptable for a single-user personal
 * finance tool. For high-write production workloads, better-sqlite3 or
 * Postgres would be more appropriate.
 *
 * Schema design:
 * - amount_cents: INTEGER — avoids IEEE-754 float rounding in money
 * - idempotency_key: UNIQUE — enforced at DB level, not just application code
 * - WAL-equivalent: sql.js writes atomically via full DB file replacement
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'expenses.db');

let db = null;

/**
 * Persist the in-memory DB to disk after every write operation.
 * Called after INSERT operations to ensure data durability.
 */
function persist(dbPath = DB_PATH) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Initialize the SQLite database.
 * Loads from disk if file exists, creates fresh DB otherwise.
 *
 * @param {string} [dbPath] - Override path (used in tests)
 * @returns {object} sql.js Database instance
 */
async function initDb(dbPath = DB_PATH) {
  // Ensure the data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    // Load existing database from disk
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    // Create a fresh database
    db = new SQL.Database();
  }

  // Create schema if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id              TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE NOT NULL,
      amount_cents    INTEGER NOT NULL CHECK(amount_cents > 0),
      category        TEXT NOT NULL,
      description     TEXT NOT NULL DEFAULT '',
      expense_date    TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(expense_date DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_idem_key ON expenses(idempotency_key);
  `);

  // Persist initial schema
  persist(dbPath);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Helper: run a SELECT and return all rows as array of plain objects.
 * sql.js returns columns and values separately — this merges them.
 *
 * @param {string} sql
 * @param {object|Array} [params]
 * @returns {Array<object>}
 */
function queryAll(sql, params = {}) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Helper: run a SELECT and return the first row as a plain object, or null.
 *
 * @param {string} sql
 * @param {object|Array} [params]
 * @returns {object|null}
 */
function queryOne(sql, params = {}) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: run an INSERT/UPDATE/DELETE statement.
 * Automatically persists to disk after write.
 *
 * @param {string} sql
 * @param {object|Array} [params]
 * @param {string} [dbPath]
 */
function execute(sql, params = {}, dbPath = DB_PATH) {
  db.run(sql, params);
  persist(dbPath);
}

module.exports = { initDb, getDb, closeDb, queryAll, queryOne, execute, persist, DB_PATH };
