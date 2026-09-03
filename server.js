require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const SALT_ROUNDS = 10;

/* ============================================================
   EMAIL NOTIFICATIONS
   Uses your own Gmail account -- no separate email service to
   sign up for. Needs EMAIL_USER + EMAIL_APP_PASSWORD in .env.
   (An "app password" is not your normal Gmail password -- Google
   makes you generate a separate one for apps like this. See
   myaccount.google.com/apppasswords, requires 2-Step Verification
   to be turned on first.)

   If those env vars aren't set, sendEmail() logs to the console
   instead of crashing -- so the rest of the app keeps working
   even before email is configured.
   ============================================================ */
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

let transporter = null;
if (EMAIL_USER && EMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD }
  });
}

async function sendEmail(to, subject, text) {
  if (!transporter) {
    console.log(`[EMAIL not configured -- would have sent] To: ${to} | Subject: ${subject} | ${text}`);
    return { sent: false, reason: 'EMAIL_USER/EMAIL_APP_PASSWORD not set in .env' };
  }
  try {
    await transporter.sendMail({
      from: `"Light Tracker" <${EMAIL_USER}>`,
      to,
      subject,
      text
    });
    return { sent: true };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

/* ============================================================
   DATABASE CONNECTION
   Switched from mysql2 to pg (PostgreSQL). Render gives you a
   single DATABASE_URL env var instead of separate host/user/
   password/db vars -- the pg Pool reads it directly.
   ssl is enabled whenever DATABASE_URL is set (Render's managed
   Postgres requires it) and disabled for plain local dev without
   a DATABASE_URL.
   ============================================================ */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
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
   ROOT / HEALTH CHECK
   Added so opening the Render URL directly shows something
   instead of "Cannot GET /".
   ============================================================ */
app.get('/', (req, res) => {
  res.json({ message: 'Light Tracker API is running!', status: 'OK' });
});

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
  const { full_name, email, password, electricity_type, location, monthly_budget, transformer_name } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'full_name, email, and password are required' });
  }

  try {
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows: userRows } = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [full_name, email, passwordHash]
    );
    const userId = userRows[0].id;

    // Save the electricity profile too, if the signup form sent one.
    if (electricity_type && location) {
      let transformerId = null;

      // find-or-create the transformer by name, so the app knows which
      // transformer this user belongs to
      if (transformer_name && transformer_name.trim()) {
        const cleanName = transformer_name.trim();
        const { rows: existingTransformer } = await pool.query(
          'SELECT id FROM transformers WHERE name = $1',
          [cleanName]
        );
        if (existingTransformer.length > 0) {
          transformerId = existingTransformer[0].id;
        } else {
          const { rows: newTransformer } = await pool.query(
            'INSERT INTO transformers (name, location) VALUES ($1, $2) RETURNING id',
            [cleanName, location]
          );
          transformerId = newTransformer[0].id;
        }
      }

      await pool.query(
        'INSERT INTO electricity_profiles (user_id, electricity_type, location, monthly_budget, transformer_id) VALUES ($1, $2, $3, $4, $5)',
        [userId, electricity_type, location, monthly_budget || 0, transformerId]
      );
    }

    sendEmail(
      email,
      'Welcome to Light Tracker',
      `Hi ${full_name},\n\nYour Light Tracker account is ready. We'll let you know when power comes back after an outage, and when you're running low on units.\n\n- Light Tracker`
    ).catch(() => {});

    res.status(201).json({
      id: userId,
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
    const { rows } = await pool.query(
      'SELECT id, full_name, email, password_hash FROM users WHERE email = $1',
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
      const { rows } = await pool.query(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/<table>/:id -- public, single row
  app.get(`${base}/:id`, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
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
    const placeholders = providedColumns.map((_, i) => `$${i + 1}`).join(', ');
    try {
      const { rows } = await pool.query(
        `INSERT INTO ${tableName} (${providedColumns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
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
    const setClause = providedColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const values = providedColumns.map((col) => req.body[col]);
    try {
      const { rows, rowCount } = await pool.query(
        `UPDATE ${tableName} SET ${setClause} WHERE id = $${providedColumns.length + 1} RETURNING *`,
        [...values, req.params.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/<table>/:id -- admin only
  app.delete(`${base}/:id`, requireAdmin, async (req, res) => {
    try {
      const { rowCount } = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
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
    const { rows } = await pool.query('SELECT id, full_name, email, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const { full_name, email } = req.body;
  try {
    const { rows, rowCount } = await pool.query(
      'UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING id, full_name, email, created_at',
      [full_name, email, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   PAYSTACK TOP-UP
   Deliberately NOT behind requireAdmin -- this is the one write
   path a regular logged-in user needs, so any user can call it
   for themselves. In a real production app you'd also verify the
   request actually belongs to that user_id (e.g. via a session/
   JWT), not just trust whatever user_id is passed in -- flagged
   here rather than silently skipped.
   ============================================================ */
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const UNIT_PRICE_NAIRA = Number(process.env.UNIT_PRICE_NAIRA || 200); // ₦ per unit, adjust to your real rate

// Tracks Paystack references already turned into a unit_purchases row,
// so refreshing the callback page twice doesn't double-insert. In-memory
// only -- fine for now, swap for a DB column if you need it to survive
// a server restart.
const processedReferences = new Set();

app.post('/api/topup/initialize', async (req, res) => {
  const { user_id, email, amount_naira } = req.body;
  if (!user_id || !email || !amount_naira) {
    return res.status(400).json({ error: 'user_id, email, and amount_naira are required' });
  }
  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not set in .env' });
  }

  try {
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount_naira * 100), // Paystack expects kobo, not naira
        callback_url: req.body.callback_url || 'http://localhost:3000/',
        metadata: { user_id }
      })
    });
    const data = await paystackRes.json();

    if (!paystackRes.ok || !data.status) {
      return res.status(400).json({ error: data.message || 'Paystack initialize failed' });
    }

    res.json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/topup/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not set in .env' });
  }

  try {
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });
    const data = await paystackRes.json();

    if (!paystackRes.ok || !data.status) {
      return res.status(400).json({ error: data.message || 'Could not verify transaction' });
    }

    const tx = data.data;
    if (tx.status !== 'success') {
      return res.status(200).json({ verified: false, status: tx.status });
    }

    if (processedReferences.has(reference)) {
      return res.json({ verified: true, already_recorded: true });
    }

    const userId = tx.metadata && tx.metadata.user_id;
    const amountNaira = tx.amount / 100; // convert back from kobo
    const units = +(amountNaira / UNIT_PRICE_NAIRA).toFixed(2);

    const { rows: purchaseRows } = await pool.query(
      'INSERT INTO unit_purchases (user_id, units, amount_naira) VALUES ($1, $2, $3) RETURNING *',
      [userId, units, amountNaira]
    );
    processedReferences.add(reference);

    const { rows: userRows } = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
    if (userRows.length > 0) {
      sendEmail(
        userRows[0].email,
        'Top-up successful',
        `Hi ${userRows[0].full_name},\n\nYour top-up of \u20a6${amountNaira} (${units} units) was successful.\n\n- Light Tracker`
      ).catch(() => {});
    }

    res.json({ verified: true, purchase: purchaseRows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   AI CHAT (Groq)
   Also not admin-protected -- this is the other write path a
   regular logged-in user genuinely needs. If GROQ_API_KEY isn't
   set, or the Groq call fails for any reason, this falls back to
   a canned response instead of breaking the chat screen entirely.
   ============================================================ */
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const FALLBACK_AI_REPLY =
  "I can't reach the AI service right now -- check that GROQ_API_KEY is set in .env and try again.";

app.post('/api/chat', async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id and message are required' });
  }

  try {
    // save the user's message first so it's recorded even if the AI call below fails
    await pool.query(
      'INSERT INTO chat_messages (user_id, sender, message) VALUES ($1, $2, $3)',
      [user_id, 'user', message]
    );

    let replyText = FALLBACK_AI_REPLY;

    if (GROQ_API_KEY) {
      // pull the last few messages for this user as conversation context
      const { rows: history } = await pool.query(
        'SELECT sender, message FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 8',
        [user_id]
      );
      const recent = history.reverse().map((m) => ({
        role: m.sender === 'ai' ? 'assistant' : 'user',
        content: m.message
      }));

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are the AI assistant inside Light Tracker, an app that tracks electricity outages and prepaid unit usage. Answer briefly and helpfully about the user\'s electricity usage, costs, and outages. If you do not have specific data on something, say so honestly rather than making up numbers.'
            },
            ...recent
          ],
          temperature: 0.6,
          max_tokens: 200
        })
      });

      const groqData = await groqRes.json();
      if (groqRes.ok && groqData.choices && groqData.choices[0]) {
        replyText = groqData.choices[0].message.content.trim();
      } else {
        console.error('Groq API call failed. Status:', groqRes.status, 'Response:', JSON.stringify(groqData));
        replyText = 'Sorry, I had trouble getting a response just now -- try again in a moment.';
      }
    }

    const { rows: insertedRows } = await pool.query(
      'INSERT INTO chat_messages (user_id, sender, message) VALUES ($1, $2, $3) RETURNING *',
      [user_id, 'ai', replyText]
    );

    res.json({ reply: replyText, message: insertedRows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   TRANSFORMERS
   ============================================================ */
app.get('/api/transformers', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transformers ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transformers/:id/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, ep.location
       FROM electricity_profiles ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.transformer_id = $1`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   TEST NOTIFICATION
   ============================================================ */
app.post('/api/notify/test', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  try {
    const { rows } = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [user_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const result = await sendEmail(
      rows[0].email,
      'Light Tracker test notification',
      `Hi ${rows[0].full_name},\n\nThis is a test notification from Light Tracker. If you got this, email alerts are working.\n\n- Light Tracker`
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================ */
app.listen(PORT, () => {
  console.log(`Light Tracker API running on http://localhost:${PORT}`);
});