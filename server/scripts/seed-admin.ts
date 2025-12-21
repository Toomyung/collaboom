/**
 * Admin Seed Script
 * 
 * Creates or updates an admin user based on environment variables.
 * This script is idempotent - safe to run multiple times.
 * 
 * Required environment variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - ADMIN_EMAIL: Admin email address
 * - ADMIN_PASSWORD: Admin password (will be hashed)
 * 
 * Optional:
 * - ADMIN_NAME: Admin display name (default: "Admin")
 * 
 * Usage:
 *   npm run seed:admin
 *   # or
 *   tsx server/scripts/seed-admin.ts
 */
import { db } from '../db';
import { admins } from '../../shared/schema';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  console.log('[seed-admin] Starting admin seed...');

  if (!adminEmail) {
    console.error('[seed-admin] ERROR: ADMIN_EMAIL environment variable is required');
    process.exit(1);
  }

  if (!adminPassword) {
    console.error('[seed-admin] ERROR: ADMIN_PASSWORD environment variable is required');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('[seed-admin] ERROR: ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  try {
    const [existingAdmin] = await db.select().from(admins).where(eq(admins.email, adminEmail));

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    if (existingAdmin) {
      console.log(`[seed-admin] Admin with email ${adminEmail} already exists. Updating password...`);
      await db.update(admins)
        .set({ 
          password: passwordHash,
          name: adminName 
        })
        .where(eq(admins.email, adminEmail));
      console.log('[seed-admin] Admin password updated successfully.');
    } else {
      console.log(`[seed-admin] Creating new admin: ${adminEmail}`);
      await db.insert(admins).values({
        email: adminEmail,
        password: passwordHash,
        name: adminName,
        role: 'admin',
      });
      console.log('[seed-admin] Admin created successfully.');
    }

    console.log('[seed-admin] Done.');
    process.exit(0);
  } catch (error) {
    console.error('[seed-admin] Error:', error);
    process.exit(1);
  }
}

seedAdmin();
