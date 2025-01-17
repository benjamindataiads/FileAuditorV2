import { db } from "./index";
import { rules, audits, auditResults } from "./schema";
import { seedDefaultRules } from "./defaultRules";

export async function migrate() {
  try {
    // Add new columns to audits table
    await db.execute(`
      ALTER TABLE audits 
      ADD COLUMN IF NOT EXISTS file_content TEXT,
      ADD COLUMN IF NOT EXISTS column_mapping JSONB;
    `);

    console.log('Added file_content and column_mapping columns to audits table');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export async function createTables() {
  try {
    // Drop existing tables in correct order
    await db.execute(`DROP TABLE IF EXISTS audit_results CASCADE`);
    await db.execute(`DROP TABLE IF EXISTS audits CASCADE`);
    await db.execute(`DROP TABLE IF EXISTS rules CASCADE`);

    // Create rules table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        condition JSONB NOT NULL,
        criticality TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create audits table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        total_products INTEGER NOT NULL,
        compliant_products INTEGER NOT NULL,
        warning_products INTEGER NOT NULL,
        critical_products INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create audit_results table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_results (
        id SERIAL PRIMARY KEY,
        audit_id INTEGER NOT NULL REFERENCES audits(id),
        rule_id INTEGER NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        FOREIGN KEY (audit_id) REFERENCES audits(id),
        FOREIGN KEY (rule_id) REFERENCES rules(id)
      );
    `);

    // Add new columns to audits table
    await db.execute(`
      ALTER TABLE audits 
      ADD COLUMN IF NOT EXISTS file_content TEXT,
      ADD COLUMN IF NOT EXISTS column_mapping JSONB;
    `);

    console.log('Added file_content and column_mapping columns to audits table');

    // Seed default rules
    await seedDefaultRules(db);
    
    console.log('Database tables reset and default rules seeded successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

// Only run createTables if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables();
}
