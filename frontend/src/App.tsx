import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { PlusCircle, AlertCircle, IndianRupee } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const API_URL = 'http://localhost:3001';

interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Other'];

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterCategory, setFilterCategory] = useState<string>('');
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/expenses`, {
        params: { category: filterCategory || undefined }
      });
      // The backend returns them sorted by date DESC, but we can ensure it here
      const sorted = res.data.sort((a: Expense, b: Expense) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setExpenses(sorted);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }
    if (!date) {
      setFormError('Please select a date.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(`${API_URL}/expenses`, {
        amount: numAmount,
        category,
        description,
        date
      });
      
      // Optimistic update or refetch
      setExpenses(prev => {
        const updated = [res.data, ...prev].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return updated;
      });

      // Reset form
      setAmount('');
      setDescription('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setCategory(CATEGORIES[0]);
    } catch (err) {
      console.error(err);
      setFormError('Failed to add expense. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>Expense Tracker</h1>
        <p>Keep track of your personal finances easily.</p>
      </header>

      <div className="card">
        <h2>Add New Expense</h2>
        {formError && (
          <div className="form-group">
            <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '6px' }}>
              <AlertCircle size={18} />
              {formError}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Amount (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0.01"
                placeholder="0.00"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <input 
                type="text" 
                placeholder="What did you spend on?"
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>
          </div>
          
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <span className="loading-spinner"></span> : <PlusCircle size={20} />}
            {isSubmitting ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>

      <div className="summary">
        <span className="summary-title">Total Expenses</span>
        <span className="summary-amount">₹{totalAmount.toFixed(2)}</span>
      </div>

      <div className="card">
        <div className="filters">
          <h2>Recent Expenses</h2>
          <div className="filter-group">
            <label>Filter by:</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
           <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#ef4444' }}>
             <AlertCircle size={18} />
             {error}
           </div>
        )}

        {loading ? (
          <div className="list-loader">
            <span className="loading-spinner"></span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses found. Add your first expense above!</p>
          </div>
        ) : (
          <div className="expense-list">
            {expenses.map(expense => (
              <div key={expense.id} className="expense-item">
                <div className="expense-info">
                  <span className="expense-category">{expense.category}</span>
                  <span className="expense-description">{expense.description || 'No description'}</span>
                  <span className="expense-date">{format(parseISO(expense.date), 'MMM dd, yyyy')}</span>
                </div>
                <div className="expense-amount">
                  ₹{expense.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
