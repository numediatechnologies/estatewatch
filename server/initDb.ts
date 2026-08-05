import { pool, query } from './db.js';
import { INITIAL_ESTATES } from '../src/data/mockEstates.js';
import { INITIAL_ALERTS } from '../src/data/mockAlerts.js';
import { INITIAL_PIPELINE } from '../src/data/mockPipeline.js';

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

    console.log('✅ Database Schema successfully verified / created.');

    // Seed Data if Estates table is empty
    const { rowCount } = await query('SELECT id FROM estates LIMIT 1;');
    if (rowCount === 0) {
      console.log('🌱 Database is empty. Seeding initial South African deceased estate records...');

      // Seed Estates
      for (const e of INITIAL_ESTATES) {
        await query(
          `INSERT INTO estates (
            id, source_id, deceased_name, id_number_masked, date_of_death, gazette_date,
            province, district, master_office, estate_number, executor_name, executor_contact,
            executor_email, value_band, asset_types, raw_notice_snippet, gazette_ref,
            status, has_property, property_details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (id) DO NOTHING;`,
          [
            e.id, e.sourceId, e.deceasedName, e.idNumberMasked, e.dateOfDeath, e.gazetteDate,
            e.province, e.district, e.masterOffice, e.estateNumber, e.executorName, e.executorContact,
            e.executorEmail, e.valueBand, e.assetTypes, e.rawNoticeSnippet, e.gazetteRef,
            e.status, e.hasProperty, e.propertyDetails || null
          ]
        );
      }

      // Seed Alerts
      for (const a of INITIAL_ALERTS) {
        await query(
          `INSERT INTO alerts (
            id, name, surname_match, provinces, districts, value_bands, asset_types,
            executor_status, channels, is_active, match_count, last_triggered, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING;`,
          [
            a.id, a.name, a.surnameMatch || null, a.provinces, a.districts || [],
            a.valueBands, a.assetTypes, a.executorStatus || [], a.channels,
            a.isActive, a.matchCount, a.lastTriggered || null, a.createdAt
          ]
        );
      }

      // Seed Pipeline
      for (const p of INITIAL_PIPELINE) {
        await query(
          `INSERT INTO pipeline (
            id, estate_id, stage, notes, value_estimate, priority, tags, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;`,
          [
            p.id, p.estateId, p.stage, p.notes, p.valueEstimate || 0,
            p.priority, p.tags, p.updatedAt
          ]
        );
      }

      // Seed Default Ingestion Log
      await query(
        `INSERT INTO ingestion_logs (
          id, timestamp, gazette_issue, total_notices_parsed, matched_alerts_count, ocr_confidence, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING;`,
        ['log-001', new Date().toISOString().replace('T', ' ').substring(0, 16), 'Govt Gazette Vol 715 No 50920', 142, 18, 98.4, 'completed']
      );

      console.log('✅ Initial database seed completed!');
    } else {
      console.log('ℹ️ Database already contains data. Skipping seed.');
    }
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
