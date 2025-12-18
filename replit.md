# Collaboom MVP

## Overview
Collaboom is an influencer campaign management platform connecting US-based TikTok influencers (1,000+ followers) with K-Beauty, Food, and Lifestyle brands for free product seeding campaigns (UGC gifting). The platform provides influencers with a dashboard to browse campaigns, apply, track shipments, upload content, and build reputation. For brands and admins, it offers tools to manage applications, verify content, and track campaign performance. The MVP prioritizes a clean influencer experience and robust admin capabilities with a business vision to streamline influencer marketing and expand market reach for brands.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript, Vite, Wouter for routing, and React Query for server state.
- **UI/UX:** `shadcn/ui` built on Radix UI, Tailwind CSS with custom design tokens. Influencer UI is marketing-focused (Linear/Notion inspired); Admin UI is data-dense (Fluent Design). Theming uses custom CSS variables and Inter font.
- **State Management:** React Query for server and authentication state, React hooks for local component state, `react-hook-form` with Zod for form validation.
- **Performance:** Route-level code splitting (React.lazy, Suspense) for on-demand loading, minimal API endpoints for list views, and server-side pagination.

### Backend
- **Server:** Express.js REST API with session-based authentication.
- **Database:** PostgreSQL via Drizzle ORM and `@neondatabase/serverless` driver. A storage abstraction layer allows for flexible database implementations.
- **Authentication:** Email/password with bcrypt, `express-session`, role-based access control, and session persistence. Google OAuth with automatic retry logic (up to 2 attempts with increasing delays) to handle intermittent Supabase 400 errors on first login.
- **Security:** SESSION_SECRET required in production, Helmet CSP, sameSite cookies for CSRF protection, rate limiting on auth endpoints.
- **Core Features:**
    - **State Machine:** Implements state transitions for applications, influencer accounts, and campaigns.
    - **Admin Tools:** Notes system, score/penalty event history, shipping issue management, support ticket system, enhanced influencer management.
    - **Campaign Management:** Dual deadlines, extended content sections (Product Info, Step-by-Step, Eligibility), video guidelines (essential cuts, details, key points, reference videos with embeds), campaign workflow (applicants, approved, shipping, uploads), archive/delete functionality, address override system.
    - **Influencer Features:** Two-step application confirmation (address, TikTok verification), comment system (visible until video upload), campaign dismiss feature.
    - **Email Notifications:** Resend API integration for automated emails (signup, approval, shipping, replies, upload verification, tier upgrades) with HTML templates.
    - **Email Threading:** All campaign-related emails are threaded using `Message-ID`, `In-Reply-To`, and `References` headers for persistent conversation context.
    - **Ghosting Detection:** Automated penalties for missed deadlines.
    - **Data Export:** CSV export of approved influencer data for admins.
    - **Input Validation:** Custom `PhoneInput` component with US-specific formatting and validation.
    - **Influencer Name Structure:** Uses separate `firstName` and `lastName` fields. Legacy `name` field is auto-populated on save for backward compatibility. Centralized helper function `getInfluencerDisplayName` in `client/src/lib/influencer-utils.ts` handles display with proper fallbacks.
    - **Score & Tier System:** Three-tier progression system with automated tier upgrade detection:
        - **Starting Influencer:** completedCampaigns === 0 OR score < 50. Limited to 1 active campaign.
        - **Standard Influencer:** completedCampaigns >= 1 AND score >= 50 AND < 85.
        - **VIP Influencer:** completedCampaigns >= 1 AND score >= 85. Automatic application approval.
        - Tier upgrades trigger congratulatory emails on first completion or reaching 85 points.
        - Points: +50 signup (auto), +10 address (auto), +0-100 configurable on upload verification.

## Campaign Types

Collaboom offers three types of campaigns, plus a bonus earning opportunity:

### 1. Gifting Campaign (Implemented)
- **Reward:** Free product (no cash)
- **Process:** Apply → Receive product at address → Create TikTok video → Upload link
- **Platform:** TikTok only
- **Description:** Brands send free products to influencers in exchange for UGC content.

### 2. Link in Bio Campaign (Implemented)
- **Reward:** $30 cash + free product
- **Process:**
  1. Apply to campaign
  2. Receive free product at address
  3. Add product purchase link to TikTok bio via Linktree/Beacons
  4. Submit bio link URL for admin verification
  5. Create and upload TikTok video
  6. Receive $30 reward upon both bio link and video verification
- **Platform:** TikTok
- **Requirements:** Linktree, Beacons, or similar bio link service
- **Schema Fields:** `bioLinkUrl` (influencer submission), `bioLinkVerifiedAt` (admin verification timestamp), `bioLinkVerifiedByAdminId` (admin ID)
- **Admin Workflow:** Single "Bio Link" column in Uploads tab shows verification status; admin can verify link after product delivery

### 3. Amazon Video Upload Campaign (Planned)
- **Reward:** $50 cash + product
- **Process:** Apply → Receive product → Create video → Post on BOTH TikTok AND Amazon Storefront → Get $50
- **Platform:** TikTok + Amazon Storefront
- **Requirements:** Must have active Amazon Influencer Storefront
- **Description:** Similar to Gifting but with dual-platform posting requirement and higher reward.

### Bonus: Usage of Rights
- **Reward:** Additional $50
- **Applies to:** Any campaign type
- **Description:** If a brand wants to purchase rights to use your video content (for landing pages, social media ads, website, etc.), you receive an extra $50 bonus.

## UI Design System

### Campaign Type Color Scheme
Consistent color gradients used across the platform for campaign types:
- **Gifting:** Purple-pink gradient (`from-purple-50 to-pink-50` / `from-purple-950 to-pink-950` for dark mode)
- **Link in Bio:** Emerald-teal gradient (`from-emerald-50 to-teal-50` / `from-emerald-950 to-teal-950` for dark mode)
- **Amazon Video Upload:** Amber-orange gradient (`from-amber-50 to-orange-50` / `from-amber-950 to-orange-950` for dark mode)

### Navigation
- **MainLayout:** Unified header component used across all pages with:
  - Collaboom logo linking to home
  - Hamburger menu dropdown with navigation links (Score & Tier, Campaign Types)
  - Authentication buttons (Sign Up / Login for unauthenticated, Dashboard / Logout for authenticated)
  - Theme toggle for dark/light mode
- **Mobile-first:** Hamburger menu provides consistent navigation on all screen sizes

## External Dependencies

- **PostgreSQL Database:** Primary data store, accessed via Drizzle ORM and Neon.
- **Resend API:** Used for sending transactional emails.
- **Supabase Storage:** Hosts campaign images in the `collaboom-campaign` bucket, requiring specific RLS policies for anonymous access and deletion.
- **Third-Party UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Google Fonts (Inter).