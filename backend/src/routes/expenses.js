/**
 * Expense routes — maps HTTP verbs+paths to controllers.
 *
 * Route ordering matters: /expenses/summary MUST come before /expenses/:id
 * to prevent Express matching "summary" as a dynamic :id segment.
 */

const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { validateCreateExpense } = require('../middleware/validateExpense');

// Category summary — specific route before dynamic routes
router.get('/summary', expenseController.getCategorySummary);

// List with filtering/sorting
router.get('/', expenseController.listExpenses);

// Create with validation middleware chain
router.post('/', validateCreateExpense, expenseController.createExpense);

module.exports = router;
