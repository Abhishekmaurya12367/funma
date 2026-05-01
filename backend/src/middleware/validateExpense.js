/**
 * Expense validation middleware using express-validator.
 *
 * Validation rules are defined separately from the controller to keep
 * each layer focused. These validators run as Express middleware before
 * the controller function is called.
 *
 * Design note on amount validation:
 *   We validate amount as a string matching a decimal pattern BEFORE
 *   converting to cents. This catches obvious issues (negative, non-numeric)
 *   at the boundary without any float arithmetic.
 */

const { body } = require('express-validator');
const { ALLOWED_CATEGORIES } = require('../services/expenseService');
const { MAX_AMOUNT_DOLLARS } = require('../utils/money');

const validateCreateExpense = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number')
    .custom((val) => {
      const num = parseFloat(val);
      if (num > MAX_AMOUNT_DOLLARS) {
        throw new Error(`Amount cannot exceed $${MAX_AMOUNT_DOLLARS.toLocaleString()}`);
      }
      // Reject more than 2 decimal places (e.g. $12.555 is not valid money)
      if (!/^\d+(\.\d{1,2})?$/.test(String(val))) {
        throw new Error('Amount can have at most 2 decimal places');
      }
      return true;
    }),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(ALLOWED_CATEGORIES)
    .withMessage(`Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`),

  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('expense_date')
    .notEmpty().withMessage('Date is required')
    .isISO8601({ strict: true }).withMessage('Date must be a valid ISO date (YYYY-MM-DD)')
    .custom((val) => {
      const expDate = new Date(val);
      const now = new Date();
      // Allow future dates up to 1 day (timezone buffer) but not clearly in the future
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (expDate > oneDayFromNow) {
        throw new Error('Expense date cannot be in the future');
      }
      // Reject dates before year 2000 (obviously erroneous input)
      if (expDate.getFullYear() < 2000) {
        throw new Error('Expense date seems too far in the past (before year 2000)');
      }
      return true;
    }),
];

module.exports = { validateCreateExpense };
