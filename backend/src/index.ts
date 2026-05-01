import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database('./expenses.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Delay middleware to simulate slow network
app.use((req, res, next) => {
  setTimeout(next, Math.random() * 500 + 200); // 200-700ms delay
});

// GET /expenses
app.get('/expenses', (req, res) => {
  let query = 'SELECT * FROM expenses';
  const params: any[] = [];
  
  if (req.query.category) {
    query += ' WHERE category = ?';
    params.push(req.query.category);
  }
  
  query += ' ORDER BY date DESC, id DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// POST /expenses
app.post('/expenses', (req, res) => {
  const { amount, category, description, date } = req.body;
  
  // Basic validation
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid positive amount is required' });
  }
  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  const stmt = db.prepare('INSERT INTO expenses (amount, category, description, date) VALUES (?, ?, ?, ?)');
  stmt.run([amount, category, description, date], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      amount,
      category,
      description,
      date
    });
  });
});

app.listen(port, () => {
  console.log(`Backend API running at http://localhost:${port}`);
});
