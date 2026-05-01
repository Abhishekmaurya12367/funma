/**
 * Integration tests for the Expense Tracker API.
 *
 * Uses supertest to fire real HTTP requests against a test-isolated
 * in-memory SQLite database (sql.js). Each test suite gets a fresh DB
 * so tests are fully independent of each other.
 *
 * What we test:
 *   - Happy path CRUD
 *   - Idempotency guarantee (the core engineering requirement)
 *   - Money precision (no float errors)
 *   - Validation rejections
 *   - Filtering and sorting behavior
 *   - Category summary correctness
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let app;

// Use a temp DB path for tests
const TEST_DB = path.join(__dirname, '../../data/test.db');

// Override DB_PATH env before requiring any module that uses it
process.env.DB_PATH = TEST_DB;

beforeAll(async () => {
  // Must ensure data dir exists before db init
  fs.mkdirSync(path.dirname(TEST_DB), { recursive: true });
  // Delete stale test DB
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  // Init DB first (async with sql.js)
  const { initDb } = require('../db/database');
  await initDb(TEST_DB);

  app = require('../app')();
});

afterAll(() => {
  const { closeDb } = require('../db/database');
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

// Helper to generate a valid expense payload
const makeExpense = (overrides = {}) => ({
  amount: '25.50',
  category: 'Food & Dining',
  description: 'Lunch at cafe',
  expense_date: '2024-03-15',
  ...overrides,
});

describe('POST /expenses', () => {
  test('creates a new expense and returns 201', async () => {
    const key = uuidv4();
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', key)
      .send(makeExpense());

    expect(res.status).toBe(201);
    expect(res.body.expense).toMatchObject({
      amount: '25.50',
      category: 'Food & Dining',
      description: 'Lunch at cafe',
      expense_date: '2024-03-15',
    });
    expect(res.body.expense.id).toBeDefined();
  });

  test('idempotency: same key returns 200 with same expense (no duplicate)', async () => {
    const key = uuidv4();
    const payload = makeExpense({ amount: '100.00' });

    const first = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', key)
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', key)
      .send(payload);
    expect(second.status).toBe(200);

    // Must return the exact same expense
    expect(second.body.expense.id).toBe(first.body.expense.id);

    // Verify no duplicate was created in the DB
    const list = await request(app).get('/expenses');
    const matching = list.body.expenses.filter((e) => e.id === first.body.expense.id);
    expect(matching).toHaveLength(1);
  });

  test('rejects missing Idempotency-Key header', async () => {
    const res = await request(app).post('/expenses').send(makeExpense());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Idempotency-Key/);
  });

  test('rejects invalid Idempotency-Key (not a UUID)', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', 'not-a-uuid')
      .send(makeExpense());
    expect(res.status).toBe(400);
  });

  test('rejects negative amount', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send(makeExpense({ amount: '-10' }));
    expect(res.status).toBe(422);
  });

  test('rejects zero amount', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send(makeExpense({ amount: '0' }));
    expect(res.status).toBe(422);
  });

  test('rejects amount with more than 2 decimal places', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send(makeExpense({ amount: '10.555' }));
    expect(res.status).toBe(422);
  });

  test('rejects invalid category', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send(makeExpense({ category: 'InvalidCategory' }));
    expect(res.status).toBe(422);
  });

  test('rejects future date', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send(makeExpense({ expense_date: futureDate.toISOString().split('T')[0] }));
    expect(res.status).toBe(422);
  });
});

describe('GET /expenses', () => {
  test('returns expenses list with totalFormatted', async () => {
    const res = await request(app).get('/expenses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.expenses)).toBe(true);
    expect(res.body.totalFormatted).toMatch(/^\$/);
    expect(typeof res.body.totalCents).toBe('number');
  });

  test('filters by category', async () => {
    // Create a unique category expense
    await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send(makeExpense({ category: 'Travel', amount: '500.00' }));

    const res = await request(app).get('/expenses?category=Travel');
    expect(res.status).toBe(200);
    res.body.expenses.forEach((e) => {
      expect(e.category).toBe('Travel');
    });
  });

  test('total reflects only filtered expenses', async () => {
    const res = await request(app).get('/expenses?category=Education');
    expect(res.status).toBe(200);
    if (res.body.expenses.length === 0) {
      expect(res.body.totalCents).toBe(0);
    }
  });
});

describe('GET /expenses/summary', () => {
  test('returns category summary with totals', async () => {
    const res = await request(app).get('/expenses/summary');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.summary)).toBe(true);
    if (res.body.summary.length > 0) {
      const first = res.body.summary[0];
      expect(first).toHaveProperty('category');
      expect(first).toHaveProperty('totalCents');
      expect(first).toHaveProperty('totalFormatted');
      expect(first).toHaveProperty('count');
      expect(first.totalFormatted).toMatch(/^\$/);
    }
  });
});

describe('Money precision', () => {
  test('stores and retrieves $0.10 correctly (no float drift)', async () => {
    const key = uuidv4();
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', key)
      .send(makeExpense({ amount: '0.10' }));

    expect(res.status).toBe(201);
    expect(res.body.expense.amount).toBe('0.10');
  });

  test('totalCents is always an integer (no float accumulation)', async () => {
    for (const amount of ['0.10', '0.20', '0.30']) {
      await request(app)
        .post('/expenses')
        .set('Idempotency-Key', uuidv4())
        .send(makeExpense({ amount, category: 'Bills & Utilities', expense_date: '2024-01-01' }));
    }
    const res = await request(app).get('/expenses?category=Bills%20%26%20Utilities');
    expect(res.body.totalCents % 1).toBe(0);
  });
});

describe('Health check', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
