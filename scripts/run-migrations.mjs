#!/usr/bin/env node
/**
 * run-migrations.mjs
 * Applies all pending SQL migration files in ./migrations/ to the Neon database.
 * Usage: node scripts/run-migrations.mjs
 * Requires DATABASE_URL or POSTGRES_URL in environment.
 */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    VARCHAR(255) PRIMARY KEY,
      applied_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getApplied(client) {
  const result = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
  return new Set(result.rows.map((r) => r.filename));
}

async function main() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql') && !f.includes('.rollback.'))
      .sort();

    const pending = files.filter((f) => !applied.has(f));
    if (!pending.length) {
      console.log('Nothing to apply — all migrations are up to date.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);
    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`  Applying ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations(filename) VALUES($1) ON CONFLICT DO NOTHING',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${file}: ${err.message}`);
        process.exit(1);
      }
    }
    console.log('\nAll migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration runner failed:', err.message);
  process.exit(1);
});
