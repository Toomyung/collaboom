/**
 * DATABASE CONNECTION CONFIGURATION
 * 
 * MIGRATION NOTES:
 * - Current provider: Neon Postgres (uses @neondatabase/serverless)
 * - To switch to Supabase Postgres: Replace imports and Pool with standard 'pg' package
 *   1. Change: import { Pool } from 'pg';
 *   2. Change: import { drizzle } from 'drizzle-orm/node-postgres';
 *   3. Remove: neonConfig and ws imports/configuration
 *   4. Update: server/migrate.ts to use 'drizzle-orm/node-postgres/migrator'
 * - DB provider can be swapped by changing DATABASE_URL after code updates
 * - Always use Drizzle migrations (npm run db:generate, npm run db:push)
 * - AUTO-SYNC IS FORBIDDEN in production - use migration files only
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

// Neon-specific: WebSocket constructor for serverless connections
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configure pool with connection settings optimized for serverless
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,  // Maximum connections
  idleTimeoutMillis: 60000,  // Keep connections alive for 60 seconds
  connectionTimeoutMillis: 10000,  // Connection timeout
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
