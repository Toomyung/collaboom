# Collaboom MVP

## Overview
Collaboom is an influencer campaign management platform connecting US-based TikTok influencers (1,000+ followers) with K-Beauty, Food, and Lifestyle brands for PAID product campaigns, offering free products and cash rewards ($10-$30). It provides influencers with a dashboard for campaign management, content submission, and reputation building. Brands and admins utilize tools for application management, content verification, and performance tracking. The project's vision is to streamline influencer marketing and expand market reach, prioritizing an intuitive influencer experience and robust admin capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript, Vite, Wouter for routing, and React Query for server state.
- **UI/UX:** `shadcn/ui` based on Radix UI, Tailwind CSS with custom design tokens. Influencer UI is marketing-focused; Admin UI is data-dense. Theming uses custom CSS variables and Inter font.
- **State Management:** React Query for server/auth state, React hooks for local state, `react-hook-form` with Zod for validation.
- **Performance:** Route-level code splitting and server-side pagination.

### Backend
- **Server:** Express.js REST API with session-based authentication.
- **Database:** PostgreSQL via Drizzle ORM.
- **Authentication:** Email/password with bcrypt, `express-session`, role-based access control, and Google OAuth.
- **Security:** SESSION_SECRET, Helmet CSP, sameSite cookies, rate limiting.
- **Core Features:**
    - **State Machine:** Manages application, influencer account, and campaign transitions.
    - **Admin Tools:** Notes, score/penalty history, shipping, support tickets, enhanced influencer management.
    - **Campaign Management:** Dual deadlines, extended content sections (Product Info, Step-by-Step, Eligibility), video guidelines, workflow management, archive/delete, address override.
    - **Influencer Features:** Two-step application confirmation, comment system, campaign dismiss.
    - **Email Notifications:** Resend API integration for automated, threaded emails with HTML templates.
    - **Ghosting Detection:** Automated penalties for missed deadlines.
    - **Data Export:** CSV export for admins.
    - **Influencer Scoring & Tiers:** Three-tier progression (Starting, Standard, VIP) with automated upgrades and associated benefits (e.g., VIP automatic application approval).
- **Campaign Types:**
    - **Basic Campaign:** $10 cash + free product, TikTok video URL.
    - **Link in Bio Campaign:** $30 cash + free product, Bio link URL + TikTok video URL.
    - **Amazon Video Upload Campaign:** $30 cash + free product, Amazon Storefront URL + TikTok video URL.
    - **Bonus: Usage of Rights:** Additional $30 for brand content usage.
    - All campaigns follow a unified submission workflow where influencers submit all requirements together, and admins verify everything in a single Uploads tab.

### Payout System
- **Influencer Payout Requests:** Influencers request full available balance via dashboard, requiring PayPal email. Statuses: pending, processing, completed, rejected.
- **Admin Payout Management:** Admins manage payouts via a dedicated page, filtering by status, searching, and updating request statuses.

### Admin Video Verification
- **Uploads Tab:** Admins verify submitted influencer videos and associated requirements (Bio Link, Amazon Storefront URL) in a centralized tab.
- **Overdue Applications:** Identifies applications past deadline without content, allowing admin to mark as "Missed Deadline."

### UI Design System
- **Campaign Type Color Scheme:** Consistent gradients for Basic (Purple-pink), Link in Bio (Emerald-teal), Amazon Video Upload (Amber-orange).
- **Navigation:** Unified `MainLayout` with logo, hamburger menu (mobile-first), auth buttons, and theme toggle.

### Deployment Workflow
- **Environment:** Replit for development, GitHub for staging/main branches, Render for staging/production (collaboom.io).
- **Process:** Replit -> GitHub `staging` -> Render staging. Merge `staging` to `main` on GitHub -> Render production.

### Error Handling
- **User-Facing:** AlertDialog popups with clean, user-friendly messages.
- **Developer Debugging:** Full error details logged to console, using custom `ApiError` class.

## External Dependencies

- **PostgreSQL Database:** Primary data store, accessed via Drizzle ORM (Supabase Postgres).
- **Resend API:** For sending transactional emails.
- **Supabase Storage:** Hosts campaign images in `collaboom-campaign` bucket.
- **Supabase Auth:** Provides Google OAuth for social login.
- **Third-Party UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Google Fonts (Inter).