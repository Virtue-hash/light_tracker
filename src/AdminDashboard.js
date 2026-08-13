import React, { useState, useEffect, useCallback } from 'react';
import './AdminDashboard.css';

const API_BASE = 'http://localhost:4000/api';
const TOKEN_STORAGE_KEY = 'lt_admin_token';

/* ============================================================
   Table configuration -- one entry per table in schema.sql
   (except `users`, which is handled separately below since it
   uses different routes: GET/PUT/DELETE /api/admin/users, and
   no generic POST -- new users are only created via /api/register).
   ============================================================ */
const TABLES = {
  electricity_profiles: {
    label: 'Electricity Profiles',
    fields: [
      { name: 'user_id', label: 'User ID', type: 'number' },
      {
        name: 'electricity_type',
        label: 'Electricity Type',
        type: 'select',
        options: ['Prepaid', 'Grid', 'Generator', 'Solar']
      },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'monthly_budget', label: 'Monthly Budget (\u20a6)', type: 'number' }
    ]
  },
  power_status_events: {
    label: 'Power Status Events',
    fields: [
      { name: 'user_id', label: 'User ID', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['ON', 'OFF'] },
      { name: 'started_at', label: 'Started At', type: 'datetime' },
      { name: 'ended_at', label: 'Ended At (optional)', type: 'datetime', optional: true },
      { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', optional: true }
    ]
  },
  unit_purchases: {
    label: 'Unit Purchases',
    fields: [
      { name: 'user_id', label: 'User ID', type: 'number' },
      { name: 'units', label: 'Units', type: 'number' },
      { name: 'amount_naira', label: 'Amount (\u20a6)', type: 'number' },
      { name: 'purchased_at', label: 'Purchased At (optional)', type: 'datetime', optional: true }
    ]
  },
  chat_messages: {
    label: 'Chat Messages',
    fields: [
      { name: 'user_id', label: 'User ID', type: 'number' },
      { name: 'sender', label: 'Sender', type: 'select', options: ['user', 'ai'] },
      { name: 'message', label: 'Message', type: 'textarea' }
    ]
  },
  user_settings: {
    label: 'User Settings',
    fields: [
      { name: 'user_id', label: 'User ID', type: 'number' },
      { name: 'outage_alerts', label: 'Outage Alerts', type: 'checkbox' },
      { name: 'low_unit_reminders', label: 'Low Unit Reminders', type: 'checkbox' },
      { name: 'community_map', label: 'Community Map', type: 'checkbox' },
      { name: 'data_saver_mode', label: 'Data Saver Mode', type: 'checkbox' }
    ]
  }
};

const TAB_ORDER = ['users', 'electricity_profiles', 'power_status_events', 'unit_purchases', 'chat_messages', 'user_settings'];

/* ---------------- datetime helpers ----------------
   MySQL wants 'YYYY-MM-DD HH:mm:ss', but <input type="datetime-local">
   gives 'YYYY-MM-DDTHH:mm'. Convert both directions. Tested directly
   against the real server -- ISO strings with a trailing 'Z' are
   REJECTED by MySQL, so don't use toISOString() here. */
function isoToDatetimeLocal(value) {
  if (!value) return '';
  // value from the API looks like '2026-08-12T09:30:00.000Z'
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function datetimeLocalToMysql(value) {
  if (!value) return null;
  // value looks like '2026-08-12T09:30' -> '2026-08-12 09:30:00'
  return value.replace('T', ' ') + ':00';
}

/* ============================================================
   Login screen
   ============================================================ */
function AdminLogin({ onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      onLoggedIn(data.token);
    } catch (err) {
      setError('Could not reach the server \u2014 is it running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <h1>Light Tracker Admin</h1>
        <p>Enter the admin password to continue.</p>
        <input
          type="password"
          className="admin-input"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div className="admin-error">{error}</div>}
        <button type="submit" className="admin-btn" disabled={submitting}>
          {submitting ? 'Checking\u2026' : 'Log in'}
        </button>
      </form>
    </div>
  );
}

/* ============================================================
   Generic form for add/edit, built from a table's field config
   ============================================================ */
function RecordForm({ fields, values, onChange, onSubmit, onCancel, submitLabel }) {
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {fields.map((f) => {
        const val = values[f.name] ?? '';
        if (f.type === 'select') {
          return (
            <label className="admin-field" key={f.name}>
              {f.label}
              <select value={val} onChange={(e) => onChange(f.name, e.target.value)} required>
                <option value="" disabled>
                  Choose\u2026
                </option>
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        if (f.type === 'checkbox') {
          return (
            <label className="admin-field admin-field-checkbox" key={f.name}>
              <input
                type="checkbox"
                checked={Boolean(val)}
                onChange={(e) => onChange(f.name, e.target.checked)}
              />
              {f.label}
            </label>
          );
        }
        if (f.type === 'textarea') {
          return (
            <label className="admin-field" key={f.name}>
              {f.label}
              <textarea
                value={val}
                onChange={(e) => onChange(f.name, e.target.value)}
                required={!f.optional}
                rows={3}
              />
            </label>
          );
        }
        if (f.type === 'datetime') {
          return (
            <label className="admin-field" key={f.name}>
              {f.label}
              <input
                type="datetime-local"
                value={val}
                onChange={(e) => onChange(f.name, e.target.value)}
                required={!f.optional}
              />
            </label>
          );
        }
        return (
          <label className="admin-field" key={f.name}>
            {f.label}
            <input
              type={f.type}
              value={val}
              onChange={(e) => onChange(f.name, e.target.value)}
              required={!f.optional}
            />
          </label>
        );
      })}
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn">
          {submitLabel}
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   Generic table manager -- list + add/edit/delete, driven by
   the TABLES config above so all 5 non-user tables share one
   implementation instead of five near-duplicate components.
   ============================================================ */
function TableManager({ tableName, config, token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${tableName}`);
      if (!res.ok) throw new Error('Failed to load');
      setRows(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    load();
  }, [load]);

  function blankForm() {
    const blank = {};
    config.fields.forEach((f) => {
      blank[f.name] = f.type === 'checkbox' ? false : '';
    });
    return blank;
  }

  function openAdd() {
    setEditingId(null);
    setFormValues(blankForm());
    setFormOpen(true);
  }

  function openEdit(row) {
    const values = {};
    config.fields.forEach((f) => {
      if (f.type === 'datetime') values[f.name] = isoToDatetimeLocal(row[f.name]);
      else if (f.type === 'checkbox') values[f.name] = Boolean(row[f.name]);
      else values[f.name] = row[f.name] ?? '';
    });
    setEditingId(row.id);
    setFormValues(values);
    setFormOpen(true);
  }

  function handleFieldChange(name, value) {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  function buildPayload() {
    const payload = {};
    config.fields.forEach((f) => {
      const raw = formValues[f.name];
      if (f.optional && (raw === '' || raw === undefined)) return; // omit empty optional fields
      if (f.type === 'datetime') payload[f.name] = datetimeLocalToMysql(raw);
      else if (f.type === 'checkbox') payload[f.name] = Boolean(raw);
      else payload[f.name] = raw;
    });
    return payload;
  }

  async function handleSubmit() {
    const payload = buildPayload();
    const url = editingId ? `${API_BASE}/${tableName}/${editingId}` : `${API_BASE}/${tableName}`;
    const method = editingId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Save failed');
        return;
      }
      setFormOpen(false);
      load();
    } catch (err) {
      alert('Could not reach the server');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(`Delete row ${id} from ${tableName}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/${tableName}/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Delete failed');
        return;
      }
      load();
    } catch (err) {
      alert('Could not reach the server');
    }
  }

  return (
    <div>
      <div className="admin-panel-head">
        <h2>{config.label}</h2>
        <button className="admin-btn" onClick={openAdd}>
          + Add {config.label.replace(/s$/, '')}
        </button>
      </div>

      {formOpen && (
        <RecordForm
          fields={config.fields}
          values={formValues}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          submitLabel={editingId ? 'Save changes' : 'Create'}
        />
      )}

      {loading && <p className="admin-muted">Loading\u2026</p>}
      {error && <p className="admin-error">{error}</p>}

      {!loading && !error && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              {config.fields.map((f) => (
                <th key={f.name}>{f.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                {config.fields.map((f) => (
                  <td key={f.name}>
                    {f.type === 'checkbox'
                      ? row[f.name]
                        ? 'Yes'
                        : 'No'
                      : f.type === 'datetime'
                      ? row[f.name]
                        ? new Date(row[f.name]).toLocaleString()
                        : '\u2014'
                      : String(row[f.name] ?? '\u2014')}
                  </td>
                ))}
                <td className="admin-row-actions">
                  <button className="admin-link-btn" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  <button className="admin-link-btn admin-link-danger" onClick={() => handleDelete(row.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={config.fields.length + 2} className="admin-muted">
                  No rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ============================================================
   Users tab -- different routes (/api/admin/users), no add form
   (accounts are created via /api/register, not from here),
   password_hash is never fetched or shown.
   ============================================================ */
function UsersManager({ token }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState({ full_name: '', email: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'x-admin-token': token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(row) {
    setEditingId(row.id);
    setFormValues({ full_name: row.full_name, email: row.email });
  }

  async function handleSubmit() {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(formValues)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Save failed');
        return;
      }
      setEditingId(null);
      load();
    } catch (err) {
      alert('Could not reach the server');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(`Delete user ${id}? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Delete failed');
        return;
      }
      load();
    } catch (err) {
      alert('Could not reach the server');
    }
  }

  return (
    <div>
      <div className="admin-panel-head">
        <h2>Users</h2>
      </div>
      <p className="admin-muted">
        New accounts are created via sign-up (/api/register), not from here \u2014 this tab is
        for editing or removing existing users.
      </p>

      {editingId && (
        <RecordForm
          fields={[
            { name: 'full_name', label: 'Full name', type: 'text' },
            { name: 'email', label: 'Email', type: 'email' }
          ]}
          values={formValues}
          onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
          onSubmit={handleSubmit}
          onCancel={() => setEditingId(null)}
          submitLabel="Save changes"
        />
      )}

      {loading && <p className="admin-muted">Loading\u2026</p>}
      {error && <p className="admin-error">{error}</p>}

      {!loading && !error && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Full name</th>
              <th>Email</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.full_name}</td>
                <td>{row.email}</td>
                <td>{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="admin-row-actions">
                  <button className="admin-link-btn" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  <button className="admin-link-btn admin-link-danger" onClick={() => handleDelete(row.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ============================================================
   Top-level AdminDashboard
   ============================================================ */
export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_STORAGE_KEY));
  const [activeTab, setActiveTab] = useState('users');

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
  }

  if (!token) {
    return <AdminLogin onLoggedIn={setToken} />;
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>Light Tracker Admin</h1>
        <button className="admin-btn admin-btn-ghost" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <nav className="admin-tabs">
        {TAB_ORDER.map((key) => (
          <button
            key={key}
            className={activeTab === key ? 'active' : ''}
            onClick={() => setActiveTab(key)}
          >
            {key === 'users' ? 'Users' : TABLES[key].label}
          </button>
        ))}
      </nav>

      <main className="admin-main">
        {activeTab === 'users' ? (
          <UsersManager token={token} />
        ) : (
          <TableManager tableName={activeTab} config={TABLES[activeTab]} token={token} />
        )}
      </main>
    </div>
  );
}
