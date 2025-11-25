# Collaboom MVP

## Overview

Collaboom is an influencer campaign management platform focused on free product seeding campaigns (UGC gifting). The platform connects US-based TikTok influencers (1,000+ followers) with K-Beauty, Food, and Lifestyle brands. Influencers can browse campaigns, apply, track shipments, upload content, and build their reputation score in one centralized dashboard.

The MVP prioritizes the influencer experience with a clean, modern interface while providing admins with efficient tools to manage hundreds of applications, verify uploads, and track campaign performance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type safety
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing
- React Query (@tanstack/react-query) for server state management with automatic caching and refetching

**UI Component Strategy**
- shadcn/ui component library built on Radix UI primitives for accessibility
- Tailwind CSS for utility-first styling with custom design tokens
- Dual design approach: Marketing-focused interface for influencers (inspired by Linear/Notion) and data-dense admin interface (Fluent Design principles)
- Custom CSS variables for theming with brand color (#8a01ff) used sparingly as accent
- Inter font family via Google Fonts for clean, modern typography

**State Management Pattern**
- React Query handles all server state (campaigns, applications, user data)
- Session-based authentication state cached via React Query
- Local component state with React hooks for UI interactions
- Form state managed by react-hook-form with Zod schema validation

**Routing Structure**
- Public routes: Landing page, login, register, campaign browsing
- Influencer routes: Dashboard, profile, campaign details (protected)
- Admin routes: Dashboard, campaign management, influencer management, application processing (protected)
- Route protection handled via useAuth hook checking session state

### Backend Architecture

**Server Framework**
- Express.js for REST API with session-based authentication
- Separate dev/prod server entry points (index-dev.ts, index-prod.ts)
- Development mode integrates Vite middleware for HMR
- Production serves pre-built static assets from dist/public

**API Design Pattern**
- RESTful endpoints organized by resource type (auth, campaigns, applications, etc.)
- Session middleware using express-session for stateful authentication
- Role-based access control: influencer vs admin user types
- Middleware functions enforce authentication and authorization per route

**Data Access Layer**
- PostgreSQL database with DatabaseStorage implementation (IStorage interface)
- Connected via Drizzle ORM with @neondatabase/serverless driver
- Storage abstraction allows swapping implementations without changing business logic
- All database interactions go through storage layer methods
- Database seeding on startup creates default admin and sample campaigns

**Authentication Flow**
- Email/password authentication with bcrypt password hashing
- Separate login flows for influencers and admins
- Session data stores userId and userType (influencer|admin)
- Sessions persist 7 days with httpOnly cookies

### Database Design (Drizzle Schema)

**Core Entities**
- `admins`: Internal staff with email/password auth
- `influencers`: User accounts with profile data, social handles, shipping addresses, score/penalty tracking
- `campaigns`: Brand campaigns with inventory limits, deadlines, reward types, and status
- `applications`: Junction table linking influencers to campaigns with approval workflow states
- `shipping`: Tracking information linked to approved applications
- `uploads`: Content verification for influencer submissions
- `score_events`: Positive reputation tracking (successful completions)
- `penalty_events`: Negative reputation tracking (missed deadlines, guideline violations)
- `admin_notes`: Internal communication log per influencer
- `notifications`: Email notification history

**State Machine Architecture**
- Application states: pending → approved/rejected → shipped → delivered → uploaded → verified/deadline_missed
- Influencer account states: uninitialized → active ↔ restricted
- Campaign states: draft → active → closed → archived
- State transitions trigger business logic (inventory updates, notifications, score changes)

**Key Relationships**
- Applications reference both influencer and campaign (many-to-many with state)
- Shipping, uploads, score events, penalty events all reference applications
- Admin notes reference influencers for historical tracking

### External Dependencies

**PostgreSQL Database**
- Primary data store configured via Drizzle ORM
- Connection via @neondatabase/serverless for serverless PostgreSQL
- Migrations managed through drizzle-kit
- Database URL configured via environment variable

**Email Notifications (Planned)**
- Gmail/Google Apps Script for MVP notification delivery
- Future migration path to SMTP services (Resend, Mailgun)
- Triggered on key state transitions (application approved, shipped, deadline reminders)
- Tracked in notifications table for audit trail

**Third-Party UI Components**
- Radix UI primitives (@radix-ui/*) for accessible components
- shadcn/ui pre-built components configured via components.json
- Tailwind CSS for styling with custom configuration
- Google Fonts CDN for Inter font family

**Development Tools (Replit-specific)**
- @replit/vite-plugin-runtime-error-modal for development error overlay
- @replit/vite-plugin-cartographer for code mapping
- @replit/vite-plugin-dev-banner for development indicators
- Conditional loading based on REPL_ID environment variable

## Recent Changes (November 2025)

### Phase 2 Features Implemented

**Admin Notes System**
- API routes: GET/POST `/api/admin/influencers/:id/notes`
- Notes displayed in admin influencer drawer under "Notes" tab
- Each note records admin ID, timestamp, and optional campaign/application context

**Score/Penalty Event History**
- API routes: GET `/api/admin/influencers/:id/score-events` and `/penalty-events`
- History displayed in admin influencer drawer under "History" tab
- Manual score/penalty adjustment controls for admins

**Shipping Issue Reporting**
- Influencers can report shipping problems via `/api/applications/:id/report-issue`
- Issues stored in `shipping_issues` table with status tracking
- Admin routes to view and resolve issues at `/api/admin/issues`

**First-Time Ghosting Detection**
- When influencer misses first deadline with no completed campaigns: +5 penalty
- Storage layer automatically sets `restricted=true` when penalty ≥5
- Subsequent missed deadlines apply +1 penalty only

**Enhanced Admin Influencer Drawer**
- Tabbed interface: Profile, History, Notes, Applications
- Profile tab shows influencer details and account status
- History tab shows score/penalty events chronologically
- Notes tab allows adding and viewing admin notes
- Applications tab shows all campaign applications for the influencer

**Email Notification Infrastructure**
- Notifications logged on all state transitions:
  - `approved`: When application is approved
  - `rejected`: When application is rejected
  - `shipping_shipped`: When product ships
  - `shipping_delivered`: When product is delivered
  - `deadline_missed`: When upload deadline is missed
  - `account_restricted`: When account gets restricted (first ghosting)
- Stored in `notifications` table for future email integration

### Database Migration (November 2025)

**PostgreSQL Implementation**
- Migrated from in-memory storage to PostgreSQL database
- Created `server/db.ts` for database connection using Drizzle ORM
- Created `server/databaseStorage.ts` implementing IStorage interface
- Created `server/seed.ts` for initial data seeding
- Database seeding creates default admin (admin@collaboom.com) and sample campaigns

**Admin Influencers Pagination**
- Server-side pagination with configurable items per page (10, 25, 50, default: 20)
- API: GET `/api/admin/influencers?page=1&pageSize=20&search=&campaignId=`
- Response includes: items (InfluencerWithStats[]), totalCount, page, pageSize
- Page navigation with numbered buttons and prev/next controls
- "Showing X to Y of Z" info display
- Debounced search (300ms delay) for efficient server-side filtering
- Campaign filter support via campaignId query parameter

**Influencer Campaign Stats**
- Each influencer row shows campaign participation: "X applied · Y accepted · Z completed"
- Stats calculated via SQL aggregation (COUNT with case expressions)
- InfluencerWithStats type: Influencer + appliedCount, acceptedCount, completedCount

**Influencer Notifications API**
- API: GET `/api/me/notifications?limit=50&offset=0`
- Returns notifications for the logged-in influencer, sorted by createdAt DESC
- Requires influencer authentication (requireAuth("influencer"))
- Pagination support via limit (max 100) and offset query parameters
- Notification types: approved, rejected, shipping_shipped, shipping_delivered, deadline_missed, account_restricted
- Storage method: `getNotificationsByInfluencer(influencerId, { limit, offset })`

**Influencer Score/Penalty History API (Transparency Feature)**
- API: GET `/api/me/score-events` - Returns influencer's own score event history
- API: GET `/api/me/penalty-events` - Returns influencer's own penalty event history
- Both require influencer authentication (requireAuth("influencer"))
- Returns events sorted by createdAt DESC
- Reuses existing storage methods: `getScoreEventsByInfluencer`, `getPenaltyEventsByInfluencer`
- Supports PRD's "transparent reputation system" philosophy

**Reward Type System Redesign (November 2025)**
- Changed rewardType from fixed options (gift, 20usd, 50usd) to flexible (gift, paid)
- Added `rewardAmount` integer field for custom paid amounts (e.g., 20, 50, 100 USD)
- Admin campaign form shows conditional amount input when "paid" is selected
- All display components (CampaignCard, CampaignDetailPage, AdminCampaignDetailPage) updated
- Legacy support maintained for existing campaigns with "20usd" or "50usd" reward types
- Frontend displays: "Gift Only" for gift type, "Gift + $X Reward" for paid type with amount

**Bug Fixes (November 2025)**
- Fixed admin login navigation: Added small delay to ensure auth state updates before redirecting
- Fixed campaign deadline parsing: Backend now parses deadline string to Date object on both create and update routes
- Added legacy reward type normalization: When editing campaigns with "20usd" or "50usd", form automatically converts to paid type with appropriate amount
- Added reward amount validation: Both frontend (Zod refinement) and backend enforce rewardAmount > 0 for paid campaigns