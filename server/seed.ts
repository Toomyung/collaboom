import { db, warmupDatabase, startKeepAlive } from './db';
import { admins } from '../shared/schema';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  const isProduction = process.env.NODE_ENV === 'production';
  const enableAdminSeed = process.env.ENABLE_ADMIN_SEED === 'true';
  const allowProdSeed = process.env.ALLOW_PROD_SEED === 'true';
  
  // Always warm up and start keep-alive
  await warmupDatabase();
  startKeepAlive();
  
  // In production, require explicit flags
  if (isProduction && !allowProdSeed) {
    console.log('[Seed] Skipping seeding in production (set ALLOW_PROD_SEED=true to override)');
    return;
  }
  
  // Admin seeding (optional, controlled by ENABLE_ADMIN_SEED)
  if (enableAdminSeed) {
    await seedAdminUser();
  } else {
    console.log('[Seed] Admin seeding disabled (set ENABLE_ADMIN_SEED=true to enable)');
  }
  
  console.log('[Seed] Database initialization complete');
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminEmail || !adminPassword) {
    console.log('[Seed] Admin seeding skipped: ADMIN_EMAIL or ADMIN_PASSWORD not set');
    return;
  }
  
  if (adminPassword.length < 8) {
    console.log('[Seed] Admin seeding skipped: ADMIN_PASSWORD must be at least 8 characters');
    return;
  }
  
  try {
    const [existingAdmin] = await db.select().from(admins).where(eq(admins.email, adminEmail));
    
    if (existingAdmin) {
      console.log(`[Seed] Admin user already exists: ${adminEmail}`);
      return;
    }
    
    console.log(`[Seed] Creating admin user: ${adminEmail}`);
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(admins).values({
      email: adminEmail,
      password: passwordHash,
      name: 'Admin User',
      role: 'admin',
    });
    console.log('[Seed] Admin user created successfully');
  } catch (error) {
    console.error('[Seed] Failed to seed admin user:', error);
  }
}
