// One-off script: runs schema.sql against your Render Postgres database.
// Usage:
//   1. npm install pg   (if you haven't already switched package.json over)
//   2. node run-schema.js
//
// Reads DATABASE_URL from your local .env file -- make sure that's set to
// your Render EXTERNAL Database URL before running this from your own PC.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to your local .env file first (use the External Database URL from Render).');
  process.exit(1);
}

const schemaPath = path.join(__dirname, 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error(`Could not find schema.sql next to this script (looked in ${schemaPath}). Make sure schema.sql is in the same folder.`);
  process.exit(1);
}

const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('Connecting to database...');
    await pool.query(schemaSql);
    console.log('Schema applied successfully -- all tables created.');
  } catch (err) {
    console.error('Failed to apply schema:', err.message);
  } finally {
    await pool.end();
  }
})();
