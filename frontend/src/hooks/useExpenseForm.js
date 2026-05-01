/**
 * Custom hook for the expense form.
 *
 * Key engineering decisions:
 *
 * 1. IDEMPOTENCY KEY LIFECYCLE
 *    A new UUID is generated when the hook mounts (page load/refresh).
 *    The SAME key is reused on submission retries within the same page session.
 *    On successful submission, a NEW key is generated for the next expense.
 *    This matches the semantic: "one key per intended submission, not per click."
 *
 * 2. SUBMISSION LOCK (isSubmitting)
 *    The boolean `isSubmitting` prevents concurrent submissions.
 *    The submit button is disabled while true. This is a UI-level guard.
 *    The idempotency key is the DATA-level guard (server-side safety net).
 *    Both are needed: UI guard for UX, server guard for correctness.
 *
 * 3. ABORT ON UNMOUNT
 *    The AbortController is used to cancel the fetch if the component unmounts
 *    (e.g., user navigates away mid-request). This prevents "Can't perform a
 *    React state update on an unmounted component" warnings.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createExpense } from '../api/expenseApi';

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Health & Medical',
  'Bills & Utilities',
  'Education',
  'Travel',
  'Other',
];

const initialFormState = {
  amount: '',
  category: '',
  description: '',
  expense_date: new Date().toISOString().split('T')[0], // Default to today
};

export function useExpenseForm({ onSuccess }) {
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Idempotency key for the current submission intent
  const idempotencyKeyRef = useRef(uuidv4());
  // AbortController for the current in-flight request
  const abortControllerRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const validate = useCallback(() => {
    const newErrors = {};
    const amount = parseFloat(form.amount);

    if (!form.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Please enter a valid positive amount';
    } else if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) {
      newErrors.amount = 'Amount can have at most 2 decimal places';
    }

    if (!form.category) {
      newErrors.category = 'Please select a category';
    }

    if (!form.expense_date) {
      newErrors.expense_date = 'Please select a date';
    } else if (new Date(form.expense_date) > new Date()) {
      newErrors.expense_date = 'Date cannot be in the future';
    }

    return newErrors;
  }, [form]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) return;

    // Client-side validation first (fast feedback, no round-trip)
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const result = await createExpense(
        {
          amount: form.amount,
          category: form.category,
          description: form.description.trim(),
          expense_date: form.expense_date,
        },
        idempotencyKeyRef.current,
        abortControllerRef.current.signal,
      );

      // Success: reset form, generate NEW idempotency key for next submission
      setForm(initialFormState);
      setErrors({});
      idempotencyKeyRef.current = uuidv4();

      if (onSuccess) onSuccess(result.expense, result.created);

    } catch (err) {
      if (err.name === 'AbortError') return; // User navigated away — ignore

      // Show server-side validation errors inline if available
      if (err.details && err.details.length > 0) {
        const serverErrors = {};
        err.details.forEach(({ field, message }) => {
          serverErrors[field] = message;
        });
        setErrors(serverErrors);
      } else {
        setSubmitError(err.message || 'Something went wrong. Please try again.');
      }
      // Note: we do NOT regenerate the idempotency key on failure.
      // The user can retry the same submission safely with the same key.
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isSubmitting, validate, onSuccess]);

  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setErrors({});
    setSubmitError(null);
    idempotencyKeyRef.current = uuidv4();
  }, []);

  return {
    form,
    errors,
    isSubmitting,
    submitError,
    handleChange,
    handleSubmit,
    resetForm,
    CATEGORIES,
  };
}
