import React from 'react';

const CATEGORY_ICONS = {
  'Food & Dining': '🍽️',
  'Transportation': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Health & Medical': '💊',
  'Bills & Utilities': '💡',
  'Education': '📚',
  'Travel': '✈️',
  'Other': '📌',
};

/**
 * ExpenseList component.
 *
 * Renders the filter/sort controls, the expense table, and the running total.
 * Uses semantic HTML (<table>, <caption>, <thead>, <tbody>) for accessibility.
 *
 * Loading state shows a skeleton placeholder — better UX than a blank page.
 * Error state gives the user actionable information.
 */
export default function ExpenseList({
  expenses,
  totalFormatted,
  loading,
  error,
  filters,
  onFilterChange,
  CATEGORIES,
}) {
  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="list-card">
      {/* Controls */}
      <div className="list-header">
        <h2 className="list-title">Expenses</h2>
        <div className="controls">
          <div className="control-group">
            <label htmlFor="filter-category" className="control-label">
              Category
            </label>
            <select
              id="filter-category"
              className="control-select"
              value={filters.category}
              onChange={(e) => onFilterChange('category', e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="sort-order" className="control-label">
              Sort
            </label>
            <select
              id="sort-order"
              className="control-select"
              value={filters.sort}
              onChange={(e) => onFilterChange('sort', e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="skeleton-container" aria-label="Loading expenses">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton-cell skeleton-wide" />
              <div className="skeleton-cell skeleton-medium" />
              <div className="skeleton-cell skeleton-narrow" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="alert alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          {error}
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💸</div>
          <p className="empty-text">No expenses found</p>
          <p className="empty-subtext">
            {filters.category !== 'all'
              ? `No expenses in "${filters.category}" yet`
              : 'Add your first expense above'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="expense-table" aria-label="Expense list">
            <caption className="visually-hidden">
              List of expenses, sorted by {filters.sort === 'newest' ? 'newest first' : 'oldest first'}
            </caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Category</th>
                <th scope="col">Description</th>
                <th scope="col" className="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="expense-row">
                  <td className="date-cell">{formatDate(expense.expense_date)}</td>
                  <td>
                    <span className="category-badge">
                      <span className="category-icon" aria-hidden="true">
                        {CATEGORY_ICONS[expense.category] || '📌'}
                      </span>
                      {expense.category}
                    </span>
                  </td>
                  <td className="description-cell">
                    {expense.description || <span className="no-description">—</span>}
                  </td>
                  <td className="amount-cell">
                    <span className="amount-value">${parseFloat(expense.amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total — always visible, updates with filters */}
      <div className="total-bar">
        <span className="total-label">
          {filters.category !== 'all' ? `Total (${filters.category})` : 'Total'}
        </span>
        <span className="total-amount" id="expense-total">
          {loading ? '...' : totalFormatted}
        </span>
      </div>
    </div>
  );
}
