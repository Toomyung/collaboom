/**
 * DATABASE CONNECTION CONFIGURATION
 * 
 * This configuration uses standard 'pg' package compatible with any PostgreSQL provider:
 * - Supabase Postgres
 * - Neon Postgres  
 * - Any standard PostgreSQL database
 * 
 * DB provider can be swapped by only changing DATABASE_URL environment variable.
 * Always use Drizzle migrations (npm run db:generate, npm run db:push)
 * AUTO-SYNC IS FORBIDDEN in production - use migration files only
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Clean the DATABASE_URL (remove any leading/trailing whitespace, newlines, or literal \n characters)
const cleanDatabaseUrl = process.env.DATABASE_URL
  .replace(/^\\n+/, '')  // Remove literal \n at start
  .replace(/^\n+/, '')   // Remove actual newlines at start  
  .trim();

// Configure pool with connection settings
export const pool = new Pool({ 
  connectionString: cleanDatabaseUrl,
  max: 10,  // Maximum connections
  idleTimeoutMillis: 60000,  // Keep connections alive for 60 seconds
  connectionTimeoutMillis: 10000,  // Connection timeout
  ssl: { rejectUnauthorized: false },  // Required for Supabase connection
});

export const db = drizzle(pool, { schema });

// Warm up the database connection
export async function warmupDatabase(): Promise<void> {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    console.log(`[DB] Connection warmed up in ${Date.now() - start}ms`);
  } catch (error) {
    console.error('[DB] Warmup failed:', error);
  }
}

// Keep connection alive with periodic pings
let keepAliveInterval: NodeJS.Timeout | null = null;

export function startKeepAlive(): void {
  // Ping every 30 seconds to prevent cold starts
  keepAliveInterval = setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      console.error('[DB] Keep-alive ping failed:', error);
    }
  }, 30000);
}

export function stopKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}
