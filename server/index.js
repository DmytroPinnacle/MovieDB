const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;
const dbPath = path.join(__dirname, 'moviedb.sqlite');
const db = new Database(dbPath);

console.log(`Database Location: ${dbPath}`);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for large imports

// Helper to ensure tables exist
function ensureTable(tableName) {
  // Simple JSON storage table structure
  try {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        data JSON
        )
    `).run();
  } catch (err) {
    console.log(`Error ensuring table ${tableName}:`, err.message);
  }
}

// GENERIC CRUD ROUTES

// GET ALL
app.get('/api/:resource', (req, res) => {
  const { resource } = req.params;
  ensureTable(resource);
  try {
    const rows = db.prepare(`SELECT data FROM ${resource}`).all();
    const result = rows.map(row => JSON.parse(row.data));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET ONE
app.get('/api/:resource/:id', (req, res) => {
  const { resource, id } = req.params;
  ensureTable(resource);
  try {
    const row = db.prepare(`SELECT data FROM ${resource} WHERE id = ?`).get(id);
    if (row) {
      res.json(JSON.parse(row.data));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE (POST)
app.post('/api/:resource', (req, res) => {
  const { resource } = req.params;
  const item = req.body;
  ensureTable(resource);
  
  if (!item.id) {
    return res.status(400).json({ error: 'Item must have an id' });
  }

  try {
    const stmt = db.prepare(`INSERT OR REPLACE INTO ${resource} (id, data) VALUES (?, ?)`);
    stmt.run(item.id, JSON.stringify(item));
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE (PUT)
app.put('/api/:resource/:id', (req, res) => {
  const { resource, id } = req.params;
  const item = req.body;
  ensureTable(resource);

  if (item.id && item.id !== id) {
     return res.status(400).json({ error: 'ID mismatch' });
  }

  try {
    const stmt = db.prepare(`INSERT OR REPLACE INTO ${resource} (id, data) VALUES (?, ?)`);
    stmt.run(id, JSON.stringify(item));
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE
app.delete('/api/:resource/:id', (req, res) => {
  const { resource, id } = req.params;
  ensureTable(resource);
  try {
    db.prepare(`DELETE FROM ${resource} WHERE id = ?`).run(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// BULK IMPORT (Special route for DataManager)
app.post('/api/bulk-import', (req, res) => {
    const { data, mode } = req.body; // data is { movies: [...], watchers: [...] }, mode is 'replace' | 'merge'
    
    const resources = Object.keys(data);
    
    const transaction = db.transaction(() => {
        resources.forEach(resource => {
            ensureTable(resource);
            if (mode === 'replace') {
                db.prepare(`DELETE FROM ${resource}`).run();
            }
            
            const insert = db.prepare(`INSERT OR REPLACE INTO ${resource} (id, data) VALUES (?, ?)`);
            data[resource].forEach(item => {
                insert.run(item.id, JSON.stringify(item));
            });
        });
    });

    try {
        transaction();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// CLEAR ALL
app.post('/api/clear-all', (req, res) => {
    // Get all tables
    try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        tables.forEach(table => {
            db.prepare(`DELETE FROM ${table.name}`).run();
        });
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


app.listen(PORT, () => {
  console.log(`SQLite Server running at http://localhost:${PORT}`);
});
