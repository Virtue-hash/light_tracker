require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const SALT_ROUNDS = 10;

/* ============================================================
   DATABASE CONNECTION
   ============================================================ */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'light_tracker',
  waitForConnections: true,
  connectionLimit: 10
});

/* ============================================================
   ADMIN AUTH
   Simple in-memory token store: POST /api/admin/login checks
   ADMIN_PASSWORD from .env, and on success hands back a random
   token that must be sent as `Authorization: Bearer <token>` on
   any POST/PUT/DELETE route below. Tokens expire after 2 hours
   and live only in memory (they reset if the server restarts --
   fine for a small admin tool, swap for JWT/Redis for production).
   ============================================================ */
const adminTokens = new Map(); // token -> expiresAt (ms)
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function issueAdminToken() {
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function requireAdmin(req, res, next) {
  // AdminDashboard.js sends `x-admin-token`. Authorization: Bearer is also
  // accepted for backward compatibility with anything already using that.
  const bearer = req.headers.authorization || '';
  const token = req.headers['x-admin-token'] || (bearer.startsWith('Bearer ') ? bearer.slice(7) : null);

  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Missing or invalid admin token' });
  }
  const expiresAt = adminTokens.get(token);
  if (Date.now() > expiresAt) {
    adminTokens.delete(token);
    return res.status(401).json({ error: 'Admin token expired, log in again' });
  }
  next();
}

/* ============================================================
   HEALTH CHECK
   ============================================================ */
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ============================================================
   USER REGISTER / LOGIN
   ============================================================ */
app.post('/api/register', async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'full_name, email, and password are required' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [full_name, email, passwordHash]
    );

    res.status(201).json({
      id: result.insertId,
      full_name,
      email
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, password_hash FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ADMIN LOGIN
   ============================================================ */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect admin password' });
  }
  const token = issueAdminToken();
  res.json({ token, expires_in_ms: TOKEN_TTL_MS });
});

/* ============================================================
   GENERIC TABLE ROUTES
   One public GET (list + by id) and admin-protected
   POST/PUT/DELETE per table, built from a small config so the
   column lists stay in sync with schema.sql.
   ============================================================ */
const TABLES = {
  electricity_profiles: {
    columns: ['user_id', 'electricity_type', 'location', 'monthly_budget'],
    orderBy: 'id'
  },
  power_status_events: {
    columns: ['user_id', 'status', 'started_at', 'ended_at', 'duration_minutes'],
    orderBy: 'started_at DESC'
  },
  unit_purchases: {
    columns: ['user_id', 'units', 'amount_naira', 'purchased_at'],
    orderBy: 'purchased_at DESC'
  },
  chat_messages: {
    columns: ['user_id', 'sender', 'message'],
    orderBy: 'created_at ASC'
  },
  user_settings: {
    columns: ['user_id', 'outage_alerts', 'low_unit_reminders', 'community_map', 'data_saver_mode'],
    orderBy: 'id'
  }
};

function registerTableRoutes(tableName, { columns, orderBy }) {
  const base = `/api/${tableName}`;

  // GET /api/<table> -- public, list everything
  app.get(base, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` ORDER BY ${orderBy}`);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/<table>/:id -- public, single row
  app.get(`${base}/:id`, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/<table> -- admin only, create a row.
  // Only columns actually present in the request body are inserted,
  // so optional columns with a DB default (like timestamps) fall
  // back to that default instead of being forced to NULL.
  app.post(base, requireAdmin, async (req, res) => {
    const providedColumns = columns.filter((col) => req.body[col] !== undefined);
    if (providedColumns.length === 0) {
      return res.status(400).json({ error: `Provide at least one of: ${columns.join(', ')}` });
    }
    const values = providedColumns.map((col) => req.body[col]);
    const placeholders = providedColumns.map(() => '?').join(', ');
    try {
      const [result] = await pool.query(
        `INSERT INTO \`${tableName}\` (${providedColumns.join(', ')}) VALUES (${placeholders})`,
        values
      );
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/<table>/:id -- admin only, update a row.
  // Same rule as POST: only columns present in the request body get
  // updated, so leaving a field out doesn't wipe it to NULL.
  app.put(`${base}/:id`, requireAdmin, async (req, res) => {
    const providedColumns = columns.filter((col) => req.body[col] !== undefined);
    if (providedColumns.length === 0) {
      return res.status(400).json({ error: `Provide at least one of: ${columns.join(', ')}` });
    }
    const setClause = providedColumns.map((col) => `\`${col}\` = ?`).join(', ');
    const values = providedColumns.map((col) => req.body[col]);
    try {
      const [result] = await pool.query(
        `UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`,
        [...values, req.params.id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [req.params.id]);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/<table>/:id -- admin only
  app.delete(`${base}/:id`, requireAdmin, async (req, res) => {
    try {
      const [result] = await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

Object.entries(TABLES).forEach(([tableName, config]) => registerTableRoutes(tableName, config));

/* ============================================================
   ADMIN-ONLY USER MANAGEMENT
   Registration already covers "create" for users, so this adds
   admin-protected update/delete on top of that (password_hash is
   never returned by any route).
   ============================================================ */
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, full_name, email, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const { full_name, email } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE users SET full_name = ?, email = ? WHERE id = ?',
      [full_name, email, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    const [rows] = await pool.query('SELECT id, full_name, email, created_at FROM users WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================ */
app.listen(PORT, () => {
  console.log(`Light Tracker API running on http://localhost:${PORT}`);
});
