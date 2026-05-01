# ExpenseTracker — Production-Grade Personal Finance Tool

> A full-stack expense tracker built with engineering correctness as the primary concern —
> not feature count.

---

## Live Demo

```
Backend  → http://localhost:3001
Frontend → http://localhost:5173
```

---

## Assignment Summary

| Requirement | Implementation |
|---|---|
| POST /expenses | Idempotent — safe to retry |
| GET /expenses | Filtered (category) + sorted (date) |
| Amount handling | Integer cents — no float errors |
| Duplicate submissions | Idempotency-Key header pattern |
| Refresh correctness | URL-synced filter state |
| UI loading/error states | Skeleton loaders + error banners |
| Meaningful enhancement | Category-wise spending summary |

---

## Key Design Decisions

### 1. Money Storage: Integer Cents (Not Floats)

**Problem:** JavaScript uses IEEE-754 double-precision floats.
`0.1 + 0.2 === 0.30000000000000004` — unacceptable for financial data.

**Solution:** All amounts are stored as INTEGER cents in SQLite.

```
$12.50  →  1250 cents  (stored in DB)
1250    →  "12.50"     (serialized to API response)
```

All monetary arithmetic (including the running total) is done at the DB level using integer
SQL `SUM()` — never in JavaScript. The `money.js` utility module is the **single place**
where dollar↔cents conversion happens, making it easy to audit, test, and swap out.

**Trade-off:** We lose sub-cent precision (irrelevant for personal expenses).

---

### 2. Idempotency: Header-Based UUID Pattern

**Problem:** Users can:
- Click Submit multiple times
- Refresh the page immediately after submitting
- Experience a network timeout after the server processed the request

All of these would create duplicate expenses with a naive implementation.

**Solution:** The client generates a UUID before each submission attempt and sends it as
`Idempotency-Key: <uuid>` in the request header. The server stores this key with a
UNIQUE constraint. If the same key arrives again, it returns the **existing** expense
with HTTP 200 instead of creating a new one with HTTP 201.

```
Client                           Server
  │── POST /expenses ──────────────→│  INSERT (idempotency_key) → 201 Created
  │                                 │
  │── POST /expenses (retry) ──────→│  Key exists → SELECT existing → 200 OK
  │← same expense, no duplicate ───│
```

**Key lifecycle:**
- A new UUID is generated on page load (mount)
- The SAME key is reused on retries of the same submission
- A NEW key is generated after a successful submission
- The UI is locked (`isSubmitting = true`) during the request (belt AND suspenders)

---

### 3. Database: SQLite with better-sqlite3

**Choice rationale:**
- **Synchronous API** eliminates async complexity in a single-process Node app
- **WAL mode** (`PRAGMA journal_mode = WAL`) allows concurrent reads without write blocking
- **Zero infrastructure** — no Docker, no external service, runs anywhere
- **UNIQUE constraint on idempotency_key** — enforced at the DB level, not just in code
- **Integer math for totals** — `SUM(amount_cents)` is exact

**Trade-off accepted:** SQLite doesn't scale horizontally. For a multi-instance deployment,
you'd swap `database.js` internals for a Postgres connection pool — no other file changes
needed because the service layer is decoupled from the DB layer.

---

### 4. Architecture: Layered, Not God-File

```
HTTP Request → Route → Middleware (validate) → Controller → Service → DB
```

Each layer has exactly one job:
- **Route:** maps URL patterns to handlers
- **Middleware:** validates/rejects bad inputs before they touch business logic
- **Controller:** HTTP adapter — parse request, call service, send response
- **Service:** business logic and data access — testable without HTTP
- **DB module:** SQLite connection + schema — swappable

This means tests can import `createApp()` without binding to a port, and service logic
can be unit-tested without supertest.

---

### 5. Frontend: URL-Synced Filter State

When the user selects "Food & Dining" and sorts by "Oldest," the URL becomes:
```
http://localhost:5173/?category=Food+%26+Dining&sort=oldest
```

On page refresh, the filters are **restored from the URL** — not reset to defaults.
This is the correct behavior for any filtered list view and is often overlooked.

**How it works:**
- `useExpenseList` reads initial filter state from `window.location.search` on mount
- Every filter change calls `window.history.replaceState(...)` to update the URL silently
- No router library needed — pure Web APIs

---

### 6. Meaningful Enhancement: Category Summary Panel

The sidebar shows a real-time breakdown of spending by category with:
- Total amount per category
- Number of expenses
- Visual percentage bar (relative to total spending)

**Why this one?** It transforms the app from a data-entry tool into a financial insight
tool. A user can immediately see "I'm spending 45% on Food & Dining — should I cut that?"
This is computed with a single SQL aggregate query (`GROUP BY category`) — not by
downloading all expenses and computing in JS.

---

### 7. What I Intentionally Did NOT Do

| Feature | Reason skipped |
|---|---|
| Authentication / user sessions | Out of scope — no multi-user requirement |
| Pagination | Overkill for personal expense volumes |
| Edit / Delete expenses | Not in the assignment spec |
| Decimal.js or big.js | Integer cents is sufficient and simpler |
| Redux / Zustand | Two custom hooks are all the state management needed |
| Docker Compose | Adds complexity without improving correctness for this scope |
| Date range filter | Nice-to-have, not in spec, would have diluted focus |

---

## Project Structure

```
funma1/
├── backend/
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── expenses.test.js   # Integration tests (supertest)
│   │   │   └── money.test.js      # Unit tests for money utils
│   │   ├── controllers/
│   │   │   └── expenseController.js
│   │   ├── db/
│   │   │   └── database.js        # SQLite init, WAL mode, schema
│   │   ├── middleware/
│   │   │   ├── errorHandler.js    # Global error handler
│   │   │   └── validateExpense.js # express-validator rules
│   │   ├── routes/
│   │   │   └── expenses.js
│   │   ├── services/
│   │   │   └── expenseService.js  # Idempotency + money + filtering
│   │   ├── utils/
│   │   │   └── money.js           # dollarsToCents / centsToDollars
│   │   ├── app.js                 # Express app factory (testable)
│   │   └── server.js              # Port binding + graceful shutdown
│   ├── data/                      # SQLite file (gitignored)
│   ├── .gitignore
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── expenseApi.js      # All fetch() calls, AbortController
    │   ├── components/
    │   │   ├── CategorySummary.jsx
    │   │   ├── ExpenseForm.jsx
    │   │   └── ExpenseList.jsx
    │   ├── hooks/
    │   │   ├── useExpenseForm.js  # Idempotency key + submission lock
    │   │   └── useExpenseList.js  # Fetch + filter + URL sync
    │   ├── App.jsx
    │   ├── constants.js
    │   ├── index.css              # Design system (dark glass UI)
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Backend

```bash
cd backend
npm install
npm run dev        # Starts on :3001 with nodemon
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Starts on :5173, proxies /expenses to :3001
```

### Tests

```bash
cd backend
npm test           # Runs all unit + integration tests
npm run test:coverage  # With coverage report
```

---

## API Reference

### POST /expenses

**Headers required:**
```
Idempotency-Key: <uuid-v4>
Content-Type: application/json
```

**Request body:**
```json
{
  "amount": "25.50",
  "category": "Food & Dining",
  "description": "Lunch at cafe",
  "expense_date": "2024-03-15"
}
```

**Responses:**
- `201 Created` — new expense created
- `200 OK` — idempotent replay (same key, no duplicate created)
- `400 Bad Request` — missing or invalid Idempotency-Key
- `422 Unprocessable Entity` — validation failed

---

### GET /expenses

**Query params:**
```
?category=Food%20%26%20Dining  (optional, filters results)
?sort=newest|oldest            (default: newest)
```

**Response:**
```json
{
  "expenses": [...],
  "totalCents": 12550,
  "totalFormatted": "$125.50"
}
```

---

### GET /expenses/summary

**Response:**
```json
{
  "summary": [
    {
      "category": "Food & Dining",
      "count": 12,
      "totalCents": 45000,
      "totalFormatted": "$450.00"
    }
  ]
}
```

---

## Valid Categories

`Food & Dining`, `Transportation`, `Shopping`, `Entertainment`,
`Health & Medical`, `Bills & Utilities`, `Education`, `Travel`, `Other`

---

## Edge Cases Handled

| Scenario | Behavior |
|---|---|
| Submit → network timeout → retry | Same idempotency key → no duplicate |
| Click Submit 3 times fast | Button disabled after first click |
| Refresh page with filters active | Filters restored from URL params |
| API returns slow response | Skeleton loader shown, button locked |
| API returns 5xx error | Error banner with user-friendly message |
| Amount `0.1 + 0.2` float issue | Stored as 30 cents — exact |
| Amount `10.555` (3 decimals) | Rejected by validator (422) |
| Future expense date | Rejected by validator (422) |
| Category typo in request | Rejected by whitelist validator |

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Backend runtime | Node.js + Express | Familiar, minimal boilerplate |
| Database | SQLite (better-sqlite3) | Zero infra, synchronous, WAL mode |
| Validation | express-validator | Declarative, well-tested |
| Frontend | React 18 + Vite | Fast HMR, JSX, hooks |
| State | Custom hooks only | No over-engineering for this scope |
| HTTP client | Fetch API | No extra dependency needed |
| Tests | Jest + Supertest | Standard Node.js testing stack |
