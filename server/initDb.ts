import { query } from './db.js';
import { identityFingerprint, isValidSouthAfricanId, scrubIdentityNumbers } from './identity.js';

export async function initializeDatabase() {
  console.log('⚡ Initializing Neon PostgreSQL Database Schema...');

  try {
    // 1. Estates Table
    await query(`
      CREATE TABLE IF NOT EXISTS estates (
        id VARCHAR(100) PRIMARY KEY,
        source_id VARCHAR(100),
        deceased_name VARCHAR(255) NOT NULL,
        id_number_masked VARCHAR(50),
        date_of_death VARCHAR(50),
        gazette_date VARCHAR(50),
        province VARCHAR(100),
        district VARCHAR(100),
        master_office VARCHAR(100),
        estate_number VARCHAR(100),
        executor_name VARCHAR(255),
        executor_contact VARCHAR(100),
        executor_email VARCHAR(255),
        value_band VARCHAR(100),
        asset_types TEXT[],
        raw_notice_snippet TEXT,
        gazette_ref VARCHAR(255),
        status VARCHAR(100),
        has_property BOOLEAN DEFAULT false,
        property_details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS estates_estate_number_unique ON estates (estate_number);
      CREATE UNIQUE INDEX IF NOT EXISTS estates_source_id_unique ON estates (source_id);
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(50);
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS last_address TEXT;
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS spouse_details TEXT;
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS executor_address TEXT;
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS claim_period_days INT;
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS gazette_number VARCHAR(100);
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS gazette_page INT;
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS source_url TEXT;
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS parser_version VARCHAR(50);
      ALTER TABLE estates ADD COLUMN IF NOT EXISTS id_number_hash VARCHAR(64);
      CREATE INDEX IF NOT EXISTS estates_id_number_hash_idx ON estates (id_number_hash) WHERE id_number_hash IS NOT NULL;
    `);

    // 2. Alerts Table
    await query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        surname_match VARCHAR(255),
        provinces TEXT[],
        districts TEXT[],
        value_bands TEXT[],
        asset_types TEXT[],
        executor_status TEXT[],
        channels TEXT[],
        is_active BOOLEAN DEFAULT true,
        match_count INT DEFAULT 0,
        last_triggered VARCHAR(50),
        created_at VARCHAR(50)
      );
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255);
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(30);
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS id_number_hash VARCHAR(64);
      ALTER TABLE alerts ADD COLUMN IF NOT EXISTS id_number_match_masked VARCHAR(20);
      CREATE INDEX IF NOT EXISTS alerts_id_number_hash_idx ON alerts (id_number_hash) WHERE id_number_hash IS NOT NULL;
    `);

    // 3. Pipeline Table
    await query(`
      CREATE TABLE IF NOT EXISTS pipeline (
        id VARCHAR(100) PRIMARY KEY,
        estate_id VARCHAR(100) REFERENCES estates(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        notes TEXT,
        value_estimate NUMERIC(12, 2),
        priority VARCHAR(50) DEFAULT 'medium',
        tags TEXT[],
        updated_at VARCHAR(50)
      );
    `);

    // 4. Notifications Table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        alert_id VARCHAR(100),
        alert_name VARCHAR(255),
        estate_id VARCHAR(100),
        deceased_name VARCHAR(255),
        estate_number VARCHAR(100),
        channel VARCHAR(50),
        sent_at VARCHAR(50),
        status VARCHAR(50),
        recipient VARCHAR(255)
      );
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS error TEXT;
      DELETE FROM notifications older
      USING notifications newer
      WHERE older.alert_id = newer.alert_id
        AND older.estate_id = newer.estate_id
        AND older.channel = newer.channel
        AND older.ctid < newer.ctid;
      CREATE UNIQUE INDEX IF NOT EXISTS notifications_alert_estate_channel_unique ON notifications (alert_id, estate_id, channel);
      CREATE TABLE IF NOT EXISTS gazette_issues (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT NOT NULL,
        published_date VARCHAR(50) NOT NULL,
        source_url TEXT NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'queued',
        records_accepted INT DEFAULT 0,
        records_rejected INT DEFAULT 0,
        error TEXT,
        processed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS user_profiles (
        auth_subject VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        role VARCHAR(30) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) NOT NULL DEFAULT 'inactive';
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
      CREATE TABLE IF NOT EXISTS registration_verifications (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        phone_number VARCHAR(30) NOT NULL,
        code_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS registration_verifications_email_idx ON registration_verifications(email, created_at DESC);
    `);

    // 5. Ingestion Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS ingestion_logs (
        id VARCHAR(100) PRIMARY KEY,
        timestamp VARCHAR(50),
        gazette_issue VARCHAR(255),
        total_notices_parsed INT DEFAULT 0,
        matched_alerts_count INT DEFAULT 0,
        ocr_confidence NUMERIC(5, 2),
        status VARCHAR(50)
      );
    `);

    // One-time privacy backfill for records ingested before fingerprint support.
    if (process.env.IDENTITY_MATCH_SECRET) {
      const legacy = await query(`SELECT id, raw_notice_snippet FROM estates WHERE raw_notice_snippet ~ '\\m[0-9]{13}\\M'`);
      if (legacy.rows.length) {
        const values: unknown[] = [];
        const placeholders = legacy.rows.map((row: any, index: number) => {
          const candidates = String(row.raw_notice_snippet || '').match(/\b\d{13}\b/g) || [];
          const identity = candidates.find(isValidSouthAfricanId);
          values.push(row.id, identity ? identityFingerprint(identity) : null, scrubIdentityNumbers(row.raw_notice_snippet));
          const offset = index * 3;
          return `($${offset + 1}::varchar,$${offset + 2}::varchar,$${offset + 3}::text)`;
        });
        await query(`UPDATE estates AS estate SET id_number_hash=COALESCE(estate.id_number_hash, incoming.identity_hash), raw_notice_snippet=incoming.snippet FROM (VALUES ${placeholders.join(',')}) AS incoming(id, identity_hash, snippet) WHERE estate.id=incoming.id`, values);
      }
      console.log(`✅ Privacy backfill scrubbed ${legacy.rowCount || 0} legacy estate snippets.`);
    }

    console.log('✅ Database Schema successfully verified / created.');

  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    throw err;
  }
}

// If run directly via `npm run db:init`
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('initDb')) {
  initializeDatabase()
    .then(() => {
      console.log('Finished DB script execution.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
