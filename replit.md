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
- **Database:** PostgreSQL via Drizzle ORM using standard `pg` driver (node-postgres). Provider-agnostic - works with any PostgreSQL instance via DATABASE_URL. A storage abstraction layer allows for flexible database implementations.
- **Authentication:** Email/password with bcrypt, `express-session`, role-based access control, and session persistence. Google OAuth with automatic retry logic (up to 2 attempts with increasing delays) to handle intermittent Supabase 400 errors on first login.
- **Session Store:** MemoryStore for development, PostgreSQL via connect-pg-simple for production (creates `session` table automatically).
- **Security:** SESSION_SECRET required in production, Helmet CSP, sameSite cookies for CSRF protection, rate limiting on auth endpoints.
- **Admin Seeding:** Run `ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx server/scripts/seed-admin.ts` to create the first admin account.
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

Collaboom offers three types of campaigns, plus a bonus earning opportunity. All campaigns follow a unified submission workflow where influencers submit all requirements together, and admins verify everything in a single Uploads tab.

### Unified Workflow (All Campaign Types)
1. Apply to campaign
2. Receive product at address (status: delivered)
3. Submit all requirements together via dashboard:
   - **Gifting:** TikTok video URL only
   - **Link in Bio:** Bio link URL + TikTok video URL
   - **Amazon Video Upload:** Amazon Storefront URL + TikTok video URL
4. Admin verifies all requirements together in Uploads tab
5. Campaign completed, points/rewards awarded

### 1. Gifting Campaign
- **Reward:** Free product (no cash)
- **Platform:** TikTok only
- **Submission Requirements:** TikTok video URL
- **Description:** Brands send free products to influencers in exchange for UGC content.

### 2. Link in Bio Campaign
- **Reward:** $30 cash + free product
- **Platform:** TikTok
- **Submission Requirements:** Bio link URL (Linktree/Beacons) + TikTok video URL
- **Requirements:** Linktree, Beacons, or similar bio link service
- **Schema Fields:** `bioLinkUrl`, `contentUrl` (video), `contentSubmittedAt`

### 3. Amazon Video Upload Campaign
- **Reward:** $30 cash + product
- **Platform:** TikTok + Amazon Storefront
- **Submission Requirements:** Amazon Storefront URL + TikTok video URL
- **Requirements:** Must have active Amazon Influencer Storefront
- **Schema Fields:** `amazonStorefrontUrl`, `contentUrl` (video), `contentSubmittedAt`

### Bonus: Usage of Rights
- **Reward:** Additional $30
- **Applies to:** Any campaign type
- **Description:** If a brand wants to purchase rights to use your video content (for landing pages, social media ads, website, etc.), you receive an extra $30 bonus.

## Payout System

### Influencer Payout Requests
- **Balance Calculation:** Available Balance = Total Earned - Total Payouts Requested
- **Reward Amounts:** $30 for Link in Bio campaigns, $30 for Amazon Video Upload campaigns
- **Requirements:** PayPal email must be set in influencer profile before requesting payouts
- **Request Flow:**
  1. Influencer opens "Cash Earned" sheet from dashboard
  2. Views Total Earned and Available Balance
  3. Clicks "Request Payout" button (entire available balance is requested, no partial payouts)
  4. Confirms request in dialog showing PayPal email
  5. Request is submitted with "pending" status
- **Status Flow:** pending → processing → completed/rejected
- **Notifications:** Admin receives "newPayoutRequest" Socket.IO event when influencer submits request

### Admin Payout Management
- **Location:** `/admin/payouts` page accessible from admin sidebar
- **Features:**
  - Filter by status (pending, processing, completed, rejected)
  - Search by influencer name, email, TikTok handle, or PayPal email
  - View detailed request info including timestamps
  - Actions: Mark as Processing, Mark as Completed, Reject (with optional reason)
- **Notifications:** Influencer receives "payoutRequestUpdated" Socket.IO event when admin updates status
- **Sidebar Badge:** Shows count of pending + processing requests

## Admin Video Verification

### Uploads Tab Workflow
- **Purpose:** Shows videos submitted by influencers awaiting admin verification
- **Process:** Influencer submits video URL → Appears in Uploads tab → Admin clicks "Verify" → Video is verified
- **Filter Logic:** Shows applications where:
  - Status is "delivered" or "uploaded"
  - contentUrl exists (video submitted by influencer)
  - pointsAwarded is not set (not yet verified)
- **Display:** Read-only video link with submission date, Points input, Verify/Missed buttons
- **Note:** Admins no longer manually enter video URLs - influencers submit them via their dashboard

### Overdue Applications
- **Filter:** Also shows applications past deadline without contentUrl
- **Display:** Shows "Not submitted" for video link, "Verify" button disabled
- **Actions:** Admin can only click "Missed Deadline" for overdue applications without video
- **Tooltip:** "Video not submitted yet" shown when hovering disabled Verify button

### Campaign-Specific Requirements (Displayed in Uploads Tab)
- **Gifting:** Video URL only
- **Link in Bio:** Bio Link URL + Video URL (both displayed, both verified together)
- **Amazon Video Upload:** Storefront URL + Video URL (both displayed, both verified together)
- **Verification:** Single "Verify" button verifies all requirements at once

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

## Recent Changes

### December 2024: Legacy Code Cleanup
- **Removed Legacy Campaign Type:** `product_cost_covered` campaign type code and references completely removed
- **Schema Cleanup:** Removed 14 unused database columns (13 from applications, 1 from campaigns):
  - `campaigns.productCost`
  - `applications`: productCostSentAt, productCostSentByAdminId, productCostAmount, productCostPaypalTransactionId, purchaseScreenshotUrl, purchaseSubmittedAt, purchaseVerifiedAt, purchaseVerifiedByAdminId, amazonOrderId, reimbursementSentAt, reimbursementSentByAdminId, reimbursementAmount, reimbursementPaypalTransactionId
- **API Cleanup:** Removed 4 unused endpoints: submit-purchase, verify-purchase, send-reimbursement, standalone submit-amazon-storefront
- **Frontend Cleanup:** Removed legacy mutations from DashboardPage and AdminCampaignDetailPage
- **Active Campaign Types:** gifting, link_in_bio, amazon_video_upload (no purchase-based campaigns)

## External Dependencies

- **PostgreSQL Database:** Primary data store, accessed via Drizzle ORM. Currently using Neon Postgres (migration to Supabase Postgres documented in `docs/MIGRATION_READINESS_REPORT.md`).
- **Resend API:** Used for sending transactional emails.
- **Supabase Storage:** Hosts campaign images in the `collaboom-campaign` bucket, requiring specific RLS policies for anonymous access and deletion.
- **Third-Party UI Libraries:** Radix UI, shadcn/ui, Tailwind CSS, Google Fonts (Inter).

## Error Handling Pattern

### User-Facing Errors
- **Display:** All user-facing errors appear as AlertDialog popups that require clicking "Confirm" to dismiss (not toast notifications)
- **Message Format:** Clean, user-friendly messages without technical details (e.g., "PayPal email required for paid campaigns. Please add your PayPal email in your profile to apply.")
- **Implementation:** Use `formatApiError()` from `@/lib/queryClient` to extract clean messages from API errors

### Developer Debugging
- **Console Logging:** Full error details are automatically logged to browser console for debugging:
  - URL, HTTP status code, status text
  - User-friendly message shown to user
  - Full API response details and raw response body
- **ApiError Class:** Custom error class with `status`, `message`, `details`, and `rawResponse` properties
- **Location:** All API error handling centralized in `client/src/lib/queryClient.ts`

### Pattern for New Error Handlers
```typescript
import { formatApiError } from "@/lib/queryClient";

// In mutation onError:
onError: (error: Error) => {
  setErrorMessage(formatApiError(error));
  setShowErrorDialog(true);
}
```