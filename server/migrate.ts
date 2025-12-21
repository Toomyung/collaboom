/**
 * DATABASE MIGRATION RUNNER
 * 
 * Uses standard node-postgres migrator compatible with any PostgreSQL provider.
 * Always use Drizzle migrations for schema changes.
 * AUTO-SYNC IS FORBIDDEN in production - use migration files only.
 */
import { db } from './db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(__dirname, '../migrations');
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  
  if (!fs.existsSync(journalPath)) {
    console.log('[DB] No migrations found (run db:generate to create initial migration)');
    return;
  }
  
  console.log('[DB] Starting migrations...');
  const start = Date.now();
  
  try {
    await migrate(db, { migrationsFolder });
    const duration = Date.now() - start;
    console.log(`[DB] Migrations completed in ${duration}ms`);
  } catch (error) {
    console.error('[DB] Migration failed:', error);
    throw error;
  }
}
