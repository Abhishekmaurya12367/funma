/**
 * Global error handler middleware.
 *
 * Express error handlers are identified by having exactly 4 parameters.
 * This must be registered AFTER all routes.
 *
 * Error response format is consistent across the entire API:
 *   { error: string, ...(optional extra fields) }
 *
 * We deliberately do NOT leak stack traces or internal error messages
 * to the client in production — only in development.
 */

const errorHandler = (err, req, res, next) => {
  // Log the full error server-side for debugging
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Known application errors
  if (err.name === 'ValidationError') {
    return res.status(422).json({ error: err.message });
  }

  // SQLite errors we don't explicitly handle in the service
  if (err.code && err.code.startsWith('SQLITE_')) {
    return res.status(500).json({ error: 'Database error. Please try again.' });
  }

  // Default: internal server error
  return res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again.'
        : err.message,
  });
};

module.exports = errorHandler;
