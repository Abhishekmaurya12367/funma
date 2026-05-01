import React from 'react';

const CATEGORY_COLORS = {
  'Food & Dining':    { bg: 'rgba(255, 107, 107, 0.15)', accent: '#ff6b6b' },
  'Transportation':   { bg: 'rgba(78, 205, 196, 0.15)',  accent: '#4ecdc4' },
  'Shopping':         { bg: 'rgba(255, 195, 0, 0.15)',   accent: '#ffc300' },
  'Entertainment':    { bg: 'rgba(155, 89, 182, 0.15)',  accent: '#9b59b6' },
  'Health & Medical': { bg: 'rgba(46, 213, 115, 0.15)',  accent: '#2ed573' },
  'Bills & Utilities':{ bg: 'rgba(54, 162, 235, 0.15)', accent: '#36a2eb' },
  'Education':        { bg: 'rgba(255, 159, 64, 0.15)',  accent: '#ff9f40' },
  'Travel':           { bg: 'rgba(255, 99, 132, 0.15)',  accent: '#ff6384' },
  'Other':            { bg: 'rgba(150, 150, 150, 0.15)', accent: '#969696' },
};

/**
 * CategorySummary — the "meaningful enhancement".
 *
 * Shows a breakdown of spending by category with:
 * - The total amount per category
 * - The percentage of overall spending
 * - A visual progress bar for quick comparison
 *
 * This turns raw transaction data into actionable financial insight —
 * "I spent 40% of my money on Food & Dining this month" is far more
 * useful than a flat expense list.
 */
export default function CategorySummary({ summary, loading }) {
  const totalCents = summary.reduce((acc, s) => acc + s.totalCents, 0);

  return (
    <div className="summary-card">
      <h2 className="summary-title">
        <span className="summary-icon">📊</span>
        Spending by Category
      </h2>

      {loading ? (
        <div className="skeleton-container">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-row" style={{ marginBottom: '12px' }}>
              <div className="skeleton-cell skeleton-wide" />
            </div>
          ))}
        </div>
      ) : summary.length === 0 ? (
        <p className="summary-empty">No spending data yet.</p>
      ) : (
        <div className="summary-list">
          {summary.map((item) => {
            const pct = totalCents > 0 ? Math.round((item.totalCents / totalCents) * 100) : 0;
            const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];

            return (
              <div key={item.category} className="summary-item">
                <div className="summary-item-header">
                  <span className="summary-category">{item.category}</span>
                  <div className="summary-right">
                    <span className="summary-count">{item.count} expense{item.count !== 1 ? 's' : ''}</span>
                    <span className="summary-total">{item.totalFormatted}</span>
                  </div>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: colors.accent,
                    }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.category}: ${pct}% of total spending`}
                  />
                </div>
                <span className="summary-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
