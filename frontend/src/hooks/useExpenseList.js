/**
 * Custom hook for fetching and managing the expense list.
 *
 * Handles:
 * - Initial load and re-fetch after new expense is added
 * - Filter and sort state (URL-synced so refresh preserves state)
 * - Loading and error states for the list
 * - AbortController to cancel stale requests when filters change
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchExpenses, fetchCategorySummary } from '../api/expenseApi';

export function useExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [totalFormatted, setTotalFormatted] = useState('$0.00');
  const [totalCents, setTotalCents] = useState(0);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read initial filter state from URL (survives refresh)
  const getInitialFilters = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      category: params.get('category') || 'all',
      sort: params.get('sort') || 'newest',
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);

  const abortControllerRef = useRef(null);

  const loadExpenses = useCallback(async (currentFilters) => {
    // Cancel any in-flight request from a previous filter change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const [expenseData, summaryData] = await Promise.all([
        fetchExpenses(
          {
            category: currentFilters.category !== 'all' ? currentFilters.category : undefined,
            sort: currentFilters.sort,
          },
          abortControllerRef.current.signal,
        ),
        fetchCategorySummary(abortControllerRef.current.signal),
      ]);

      setExpenses(expenseData.expenses);
      setTotalFormatted(expenseData.totalFormatted);
      setTotalCents(expenseData.totalCents);
      setSummary(summaryData.summary);
    } catch (err) {
      if (err.name === 'AbortError') return; // Stale request — ignore
      setError('Failed to load expenses. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync filter state to URL so browser refresh preserves the view
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.category !== 'all') params.set('category', filters.category);
    if (filters.sort !== 'newest') params.set('sort', filters.sort);

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState(null, '', newUrl);
  }, [filters]);

  // Re-fetch whenever filters change
  useEffect(() => {
    loadExpenses(filters);
  }, [filters, loadExpenses]);

  const handleFilterChange = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  const refresh = useCallback(() => {
    loadExpenses(filters);
  }, [filters, loadExpenses]);

  return {
    expenses,
    totalFormatted,
    totalCents,
    summary,
    loading,
    error,
    filters,
    handleFilterChange,
    refresh,
  };
}
