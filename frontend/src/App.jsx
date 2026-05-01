import React, { useCallback } from 'react';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import CategorySummary from './components/CategorySummary';
import { useExpenseList } from './hooks/useExpenseList';
import { CATEGORIES } from './constants';

/**
 * App — root component.
 *
 * Orchestrates the data flow:
 * ExpenseForm → (onSuccess) → App.handleExpenseAdded → refresh list + summary
 *
 * The form and list are siblings (not parent/child), so we use the parent
 * as the coordinator. This avoids prop drilling and keeps each component focused.
 */
export default function App() {
  const {
    expenses,
    totalFormatted,
    totalCents,
    summary,
    loading,
    error,
    filters,
    handleFilterChange,
    refresh,
  } = useExpenseList();

  const handleExpenseAdded = useCallback((expense, isNew) => {
    // Refresh the list to show the new expense in correct sorted position
    refresh();
  }, [refresh]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">💰</span>
            <div>
              <h1 className="app-title">ExpenseTracker</h1>
              <p className="app-subtitle">Personal finance, production-grade</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-pill">
              <span className="stat-label">Total Tracked</span>
              <span className="stat-value" id="header-total">
                {loading ? '...' : totalFormatted}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="layout">
          {/* Left column: form + category summary */}
          <aside className="sidebar">
            <ExpenseForm onSuccess={handleExpenseAdded} />
            <CategorySummary summary={summary} loading={loading} />
          </aside>

          {/* Right column: expense list */}
          <section className="content">
            <ExpenseList
              expenses={expenses}
              totalFormatted={totalFormatted}
              loading={loading}
              error={error}
              filters={filters}
              onFilterChange={handleFilterChange}
              CATEGORIES={CATEGORIES}
            />
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <p>Built with correctness, not just functionality.</p>
      </footer>
    </div>
  );
}
