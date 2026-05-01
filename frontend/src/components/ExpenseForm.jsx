import React from 'react';
import { useExpenseForm } from '../hooks/useExpenseForm';

/**
 * ExpenseForm component.
 *
 * Design decisions:
 * - All form state is controlled (value + onChange) — React is the source of truth
 * - Submit button text changes to "Adding..." with a spinner during submission
 * - The button is disabled during isSubmitting (not just the onClick guard in the hook)
 *   because pointer-events: none alone isn't sufficient — keyboard Enter can still submit
 * - Errors are shown inline below each field for accessibility
 * - A global submitError is shown at the top of the form in an alert banner
 */
export default function ExpenseForm({ onSuccess }) {
  const {
    form,
    errors,
    isSubmitting,
    submitError,
    handleChange,
    handleSubmit,
    CATEGORIES,
  } = useExpenseForm({ onSuccess });

  return (
    <div className="form-card">
      <h2 className="form-title">
        <span className="form-title-icon">+</span>
        Add New Expense
      </h2>

      {submitError && (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount" className="form-label">
              Amount ($) <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={`form-input input-with-prefix ${errors.amount ? 'input-error' : ''}`}
                value={form.amount}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-describedby={errors.amount ? 'amount-error' : undefined}
              />
            </div>
            {errors.amount && (
              <span id="amount-error" className="field-error" role="alert">
                {errors.amount}
              </span>
            )}
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="category" className="form-label">
              Category <span className="required">*</span>
            </label>
            <select
              id="category"
              name="category"
              className={`form-input form-select ${errors.category ? 'input-error' : ''}`}
              value={form.category}
              onChange={handleChange}
              disabled={isSubmitting}
              aria-describedby={errors.category ? 'category-error' : undefined}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <span id="category-error" className="field-error" role="alert">
                {errors.category}
              </span>
            )}
          </div>
        </div>

        <div className="form-row">
          {/* Date */}
          <div className="form-group">
            <label htmlFor="expense_date" className="form-label">
              Date <span className="required">*</span>
            </label>
            <input
              id="expense_date"
              name="expense_date"
              type="date"
              className={`form-input ${errors.expense_date ? 'input-error' : ''}`}
              value={form.expense_date}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              disabled={isSubmitting}
              aria-describedby={errors.expense_date ? 'date-error' : undefined}
            />
            {errors.expense_date && (
              <span id="date-error" className="field-error" role="alert">
                {errors.expense_date}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <input
              id="description"
              name="description"
              type="text"
              placeholder="What was this expense for?"
              className="form-input"
              value={form.description}
              onChange={handleChange}
              disabled={isSubmitting}
              maxLength={500}
            />
          </div>
        </div>

        <button
          type="submit"
          id="submit-expense-btn"
          className="btn btn-primary submit-btn"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Adding...
            </>
          ) : (
            'Add Expense'
          )}
        </button>
      </form>
    </div>
  );
}
