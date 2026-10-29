import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

export const runMigration = async () => {
  console.log('🚀 Starting Database Migration...');
  let schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.join(__dirname, '../../src/db/schema.sql');
  }

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('⏳ Executing schema DDL...');
    await client.query(sql);
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Auto-run when executed directly via CLI
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migration script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Fatal error during migration:', err);
      process.exit(1);
    });
}
