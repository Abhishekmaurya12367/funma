/**
 * Express application factory.
 *
 * The app is created in a separate module from the server entry point
 * so that tests can import `createApp()` without binding to a port.
 * This is a standard pattern for testable Express applications.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const expenseRoutes = require('./routes/expenses');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Request logging — 'dev' format in dev, 'combined' (Apache-style) in prod
  const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(logFormat));

  // CORS — allow requests from the frontend dev server and any deployed origin
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Idempotency-Key'],
    exposedHeaders: ['Idempotency-Key'],
  }));

  app.use(express.json({ limit: '10kb' }));  // Reject oversized payloads
  app.use(express.urlencoded({ extended: false }));

  // Health check — useful for load balancers and readiness probes
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/expenses', expenseRoutes);

  // 404 handler — must come after all routes
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });

  // Global error handler — must be last and must have 4 params
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
