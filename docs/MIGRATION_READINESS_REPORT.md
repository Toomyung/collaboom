# Neon to Supabase Postgres Migration Readiness Report

**Date:** December 2024  
**Status:** Ready for Migration (Code Changes Required)

---

## 1. Files Inspected

| File | Purpose | Neon-Specific Code |
|------|---------|-------------------|
| `server/db.ts` | Database connection | YES - imports, Pool, neonConfig |
| `server/migrate.ts` | Migration runner | YES - migrator import |
| `drizzle.config.ts` | Drizzle configuration | NO - provider agnostic |
| `shared/schema.ts` | Database schema | NO - standard Drizzle/Postgres |
| `server/storage.ts` | Storage abstraction | NO - uses generic db import |
| `package.json` | Dependencies | YES - @neondatabase/serverless |

---

## 2. Neon-Specific Code Found

### server/db.ts (Primary Blocker)
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
```

### server/migrate.ts
```typescript
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
```

### package.json
```json
"@neondatabase/serverless": "^0.10.4"
```

---

## 3. What MUST Change When Switching to Supabase Postgres

### Step 1: Update server/db.ts
**Before:**
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ... });
export const db = drizzle(pool, { schema });
```

**After:**
```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ... });
export const db = drizzle(pool, { schema });
```

### Step 2: Update server/migrate.ts
**Before:**
```typescript
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
```

**After:**
```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator';
```

### Step 3: Install pg package
```bash
npm install pg @types/pg
```

### Step 4: Remove Neon dependency (optional, after verification)
```bash
npm uninstall @neondatabase/serverless
```

### Step 5: Update DATABASE_URL
- Change the environment variable to point to Supabase Postgres connection string

---

## 4. What Must NOT Be Changed

| Item | Reason |
|------|--------|
| `drizzle.config.ts` | Already provider-agnostic, uses standard PostgreSQL dialect |
| `shared/schema.ts` | Uses standard Drizzle/Postgres types |
| `server/storage.ts` | Uses abstracted db import, no Neon-specific code |
| Session store logic | Uses standard connect-pg-simple with DATABASE_URL |
| Supabase Auth logic | Completely separate from Postgres migration |
| Migration files | Compatible with any Postgres provider |

---

## 5. Safe Step-by-Step Migration Checklist

### Pre-Migration (Human Tasks)
- [ ] Export all data from Neon Postgres (pg_dump)
- [ ] Create Supabase Postgres database
- [ ] Import data to Supabase Postgres (pg_restore)
- [ ] Verify data integrity in Supabase
- [ ] Get Supabase DATABASE_URL connection string

### Code Migration (After Data Migration)
- [ ] Install pg package: `npm install pg @types/pg`
- [ ] Update `server/db.ts`:
  - Change imports to use `pg` and `drizzle-orm/node-postgres`
  - Remove neonConfig and ws imports
- [ ] Update `server/migrate.ts`:
  - Change migrator import to `drizzle-orm/node-postgres/migrator`
- [ ] Test locally with Supabase DATABASE_URL
- [ ] Run application and verify all features work
- [ ] Optionally remove `@neondatabase/serverless` dependency

### Post-Migration
- [ ] Update production DATABASE_URL environment variable
- [ ] Deploy and verify production
- [ ] Update documentation (replit.md)
- [ ] Remove `@neondatabase/serverless` from package.json if not done

---

## 6. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Data loss during export/import | Medium | Use pg_dump/pg_restore, verify row counts |
| Connection issues | Low | Supabase provides standard Postgres URL |
| Performance differences | Low | Both are serverless Postgres |
| Schema incompatibility | Very Low | Standard Postgres schema used |

---

## 7. Compatibility Notes

- **Drizzle ORM**: Fully compatible with both Neon and Supabase via different adapters
- **Session Store**: Uses standard pg connection, no changes needed
- **Keep-alive logic**: Standard pg Pool supports the same methods
- **Migrations**: Drizzle Kit works identically with any Postgres provider

---

## 8. Current Safety Comments Added

The following files now contain explicit migration documentation comments:
- `server/db.ts` - Full migration instructions in header comment
- `server/migrate.ts` - Migration notes in header comment
- `drizzle.config.ts` - Already provider-agnostic (no changes allowed)

---

**Report Prepared By:** Replit Agent  
**Action Required:** Human-led data migration, then code changes as documented above
