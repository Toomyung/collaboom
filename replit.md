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
- **Process:** Apply → Receive product at address → Create TikTok video → Submit video link → Admin verifies
- **Platform:** TikTok only
- **Description:** Brands send free products to influencers in exchange for UGC content.
- **Video Submission:** Influencers manually submit their TikTok video URL via the dashboard after product delivery.

### 2. Link in Bio Campaign (Implemented)
- **Reward:** $30 cash + free product
- **Process:**
  1. Apply to campaign
  2. Receive free product at address
  3. Add product purchase link to TikTok bio via Linktree/Beacons
  4. Submit bio link URL for admin verification
  5. Wait for bio link verification (UI shows "Next step" message)
  6. Submit TikTok video link after bio is verified
  7. Receive $30 reward upon both bio link and video verification
- **Platform:** TikTok
- **Requirements:** Linktree, Beacons, or similar bio link service
- **Schema Fields:** `bioLinkUrl` (influencer submission), `bioLinkVerifiedAt` (admin verification timestamp), `bioLinkVerifiedByAdminId` (admin ID), `contentSubmittedAt` (video submission timestamp)
- **Admin Workflow:** "Bio" tab between Shipping and Uploads tabs shows bio link verification status; admin can verify link after product delivery
- **Notification:** Sends "Bio Link Verified!" notification when admin verifies the bio link
- **Video Submission Gating:** Video submission form only appears after bio link is verified

### 3. Amazon Video Upload Campaign (Implemented)
- **Reward:** $50 cash + product
- **Process:**
  1. Apply to campaign
  2. Receive free product at address
  3. Upload product video to Amazon Influencer Storefront AND create TikTok video
  4. Submit BOTH Amazon Storefront URL and TikTok video URL together (combined submission)
  5. Admin verifies both storefront and video
  6. Receive $50 reward upon verification
- **Platform:** TikTok + Amazon Storefront
- **Requirements:** Must have active Amazon Influencer Storefront
- **Schema Fields:** `amazonStorefrontUrl` (influencer submission), `amazonStorefrontVerifiedAt` (admin verification timestamp), `amazonStorefrontVerifiedByAdminId` (admin ID), `contentSubmittedAt` (video submission timestamp)
- **Admin Workflow:** "Amazon" tab between Shipping and Uploads tabs shows storefront verification status; admin can verify link after product delivery
- **Notification:** Sends "Amazon Storefront Verified!" notification when admin verifies the storefront link
- **Combined Submission:** Influencer must submit both Amazon Storefront URL and TikTok video URL at the same time. Submit button is disabled until both fields are filled. Tab is labeled "Submission" in the dashboard.
- **Backward Compatibility:** If an influencer previously submitted only the storefront URL (legacy flow), they can still submit just the video URL to complete their submission.

### Bonus: Usage of Rights
- **Reward:** Additional $30
- **Applies to:** Any campaign type
- **Description:** If a brand wants to purchase rights to use your video content (for landing pages, social media ads, website, etc.), you receive an extra $30 bonus.

## Payout System

### Influencer Payout Requests
- **Balance Calculation:** Available Balance = Total Earned - Total Payouts Requested
- **Reward Amounts:** $30 for Link in Bio campaigns, $50 for Amazon Video Upload campaigns
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