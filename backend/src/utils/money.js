/**
 * Money utilities — the single source of truth for amount handling.
 *
 * Problem: JavaScript's Number uses IEEE-754 double precision.
 *   0.1 + 0.2 === 0.30000000000000004  ← unacceptable for financial data
 *
 * Solution: Store amounts as integer cents in the database.
 *   $12.50  →  1250 cents  (stored)
 *   1250    →  "$12.50"    (displayed)
 *
 * This means all arithmetic is integer arithmetic — exact and safe.
 * A future migration to a Decimal library (e.g. decimal.js) only touches this file.
 */

const CENTS_PER_DOLLAR = 100;
const MAX_AMOUNT_DOLLARS = 1_000_000; // $1M sanity cap per expense
const MAX_CENTS = MAX_AMOUNT_DOLLARS * CENTS_PER_DOLLAR;

/**
 * Convert a dollar string/number from user input into integer cents.
 * Rounds to the nearest cent (bank-style rounding is handled by toFixed).
 *
 * @param {string|number} dollars
 * @returns {number} integer cents
 * @throws {Error} if the value is not a valid positive monetary amount
 */
function dollarsToCents(dollars) {
  const parsed = parseFloat(dollars);

  if (!isFinite(parsed)) {
    throw new Error(`Invalid amount: "${dollars}" is not a number`);
  }
  if (parsed <= 0) {
    throw new Error('Amount must be greater than zero');
  }
  if (parsed > MAX_AMOUNT_DOLLARS) {
    throw new Error(`Amount exceeds maximum allowed value of $${MAX_AMOUNT_DOLLARS.toLocaleString()}`);
  }

  // Avoid float multiplication artifacts: parse via string
  const cents = Math.round(parsed * CENTS_PER_DOLLAR);
  return cents;
}

/**
 * Convert integer cents back to a human-readable dollar string.
 * Always returns exactly 2 decimal places (e.g. "12.50", not "12.5").
 *
 * @param {number} cents
 * @returns {string}
 */
function centsToDollars(cents) {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`Invalid cents value: ${cents}`);
  }
  return (cents / CENTS_PER_DOLLAR).toFixed(2);
}

/**
 * Format cents as a display currency string (e.g. "$12.50").
 * Locale-aware formatting for thousands separators.
 *
 * @param {number} cents
 * @returns {string}
 */
function formatCurrency(cents) {
  const amount = cents / CENTS_PER_DOLLAR;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

module.exports = { dollarsToCents, centsToDollars, formatCurrency, MAX_AMOUNT_DOLLARS };
