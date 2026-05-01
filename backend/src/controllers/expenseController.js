/**
 * Expense Controller — HTTP adapter layer only.
 *
 * Responsibilities:
 *   1. Extract and validate HTTP inputs (delegating heavy validation to middleware)
 *   2. Call the service layer
 *   3. Translate service results into HTTP responses
 *
 * What this controller does NOT do:
 *   - Business logic (that's in the service)
 *   - Data access (that's in the service/db layer)
 *   - Error formatting (that's in the error handler middleware)
 */

const { validationResult } = require('express-validator');
const expenseService = require('../services/expenseService');

/**
 * POST /expenses
 *
 * Expected headers:
 *   Idempotency-Key: <uuid>  (required)
 *
 * Response:
 *   201 Created  — new expense created
 *   200 OK       — idempotent replay (duplicate key detected)
 *   422 Unprocessable Entity — validation failed
 */
async function createExpense(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: 'Validation failed',
        details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Missing required header: Idempotency-Key',
      });
    }

    // Basic UUID format check to prevent arbitrary string injection as key
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      return res.status(400).json({
        error: 'Idempotency-Key must be a valid UUID v4',
      });
    }

    const { amount, category, description, expense_date } = req.body;

    const { expense, created } = expenseService.createExpense({
      idempotency_key: idempotencyKey,
      amount,
      category,
      description,
      expense_date,
    });

    // 201 for new resources, 200 for idempotent replays — client can tell the difference
    return res.status(created ? 201 : 200).json({ expense });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /expenses
 *
 * Query parameters:
 *   category  — filter by category name (optional)
 *   sort      — "newest" (default) | "oldest"
 *
 * Response shape:
 *   { expenses: [...], totalFormatted: "$123.45", totalCents: 12345 }
 */
async function listExpenses(req, res, next) {
  try {
    const { category, sort } = req.query;

    // Validate sort param (whitelist only)
    const validSorts = ['newest', 'oldest'];
    const sortOrder = validSorts.includes(sort) ? sort : 'newest';

    const result = expenseService.listExpenses({ category, sort: sortOrder });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /expenses/summary
 *
 * Returns a category-wise spending breakdown.
 * This is the "meaningful enhancement" — drives the category summary panel in the UI.
 */
async function getCategorySummary(req, res, next) {
  try {
    const summary = expenseService.getCategorySummary();
    return res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { createExpense, listExpenses, getCategorySummary };
