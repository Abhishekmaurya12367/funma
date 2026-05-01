/**
 * Expense Service — all business logic lives here, NOT in the route handler.
 *
 * The controller is responsible only for HTTP concerns (parsing req, sending res).
 * The service is responsible for business rules and data access.
 * This separation makes the service independently testable without HTTP overhead.
 */

const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, execute, DB_PATH } = require('../db/database');
const { dollarsToCents, centsToDollars } = require('../utils/money');

/**
 * Allowed categories — a closed enum prevents garbage data accumulating
 * in the database. Adding a new category is a deliberate code change, not
 * something that happens by accident via a typo.
 */
const ALLOWED_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Health & Medical',
  'Bills & Utilities',
  'Education',
  'Travel',
  'Other',
];

/**
 * Create a new expense with idempotency guarantee.
 *
 * Idempotency contract:
 *   If a client sends the same idempotency_key twice (e.g., due to a network
 *   retry or double-click), the second call returns the SAME expense that was
 *   created by the first call — without creating a duplicate row.
 *
 *   The key is inserted with a UNIQUE constraint. If it already exists,
 *   SQLite raises a constraint error. We catch that specific error and
 *   return the existing record.
 *
 * @param {object} params
 * @returns {{ expense: object, created: boolean }}
 */
function createExpense({ idempotency_key, amount, category, description, expense_date }) {
  const amountCents = dollarsToCents(amount);
  const id = uuidv4();
  const now = new Date().toISOString();

  try {
    execute(
      `INSERT INTO expenses (id, idempotency_key, amount_cents, category, description, expense_date, created_at)
       VALUES ($id, $key, $cents, $category, $desc, $date, $now)`,
      {
        $id: id,
        $key: idempotency_key,
        $cents: amountCents,
        $category: category,
        $desc: description || '',
        $date: expense_date,
        $now: now,
      }
    );

    const expense = queryOne('SELECT * FROM expenses WHERE id = $id', { $id: id });
    return { expense: formatExpense(expense), created: true };

  } catch (err) {
    // UNIQUE constraint violation = idempotency_key already exists
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      const existing = queryOne(
        'SELECT * FROM expenses WHERE idempotency_key = $key',
        { $key: idempotency_key }
      );
      return { expense: formatExpense(existing), created: false };
    }
    throw err;
  }
}

/**
 * Retrieve expenses with optional filtering and sorting.
 *
 * Filtering is always done in SQL (not in JS) to avoid loading the entire
 * table into memory. The total returned is the sum of the FILTERED set,
 * matching the UI requirement ("Total of currently visible expenses").
 *
 * @param {object} options
 * @param {string} [options.category] - Filter by category
 * @param {'newest'|'oldest'} [options.sort='newest'] - Sort order
 * @returns {{ expenses: object[], totalCents: number, totalFormatted: string }}
 */
function listExpenses({ category, sort = 'newest' } = {}) {
  const order = sort === 'oldest' ? 'ASC' : 'DESC';
  let rows, totalRow;

  if (category && category !== 'all') {
    rows = queryAll(
      `SELECT * FROM expenses WHERE category = $cat ORDER BY expense_date ${order}, created_at ${order}`,
      { $cat: category }
    );
    totalRow = queryOne(
      'SELECT COALESCE(SUM(amount_cents), 0) as total FROM expenses WHERE category = $cat',
      { $cat: category }
    );
  } else {
    rows = queryAll(
      `SELECT * FROM expenses ORDER BY expense_date ${order}, created_at ${order}`
    );
    totalRow = queryOne(
      'SELECT COALESCE(SUM(amount_cents), 0) as total FROM expenses'
    );
  }

  const total = totalRow ? totalRow.total : 0;
  const totalDollars = (total / 100).toFixed(2);

  return {
    expenses: rows.map(formatExpense),
    totalCents: total,
    totalFormatted: `$${parseFloat(totalDollars).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  };
}

/**
 * Get a breakdown of total spending grouped by category.
 * This is the "meaningful enhancement" — gives users actionable financial insight.
 *
 * @returns {Array<{ category: string, totalCents: number, totalFormatted: string, count: number }>}
 */
function getCategorySummary() {
  const rows = queryAll(`
    SELECT
      category,
      COUNT(*)          AS count,
      SUM(amount_cents) AS total_cents
    FROM expenses
    GROUP BY category
    ORDER BY total_cents DESC
  `);

  return rows.map((row) => ({
    category: row.category,
    count: row.count,
    totalCents: row.total_cents,
    totalFormatted: `$${(row.total_cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  }));
}

/**
 * Transform a raw DB row into the API response shape.
 * Converts amount_cents → amount (dollar string) and removes internal fields.
 *
 * @param {object} row
 * @returns {object}
 */
function formatExpense(row) {
  return {
    id: row.id,
    amount: centsToDollars(row.amount_cents),
    category: row.category,
    description: row.description,
    expense_date: row.expense_date,
    created_at: row.created_at,
  };
}

module.exports = { createExpense, listExpenses, getCategorySummary, ALLOWED_CATEGORIES };
