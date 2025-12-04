# Collaboom MVP

## Overview
Collaboom is an influencer campaign management platform designed to connect US-based TikTok influencers (1,000+ followers) with K-Beauty, Food, and Lifestyle brands for free product seeding campaigns (UGC gifting). The platform provides influencers with a centralized dashboard to browse campaigns, apply, track shipments, upload content, and build their reputation. For brands and admins, it offers efficient tools to manage applications, verify content, and track campaign performance. The MVP focuses on a clean, modern influencer experience and robust admin capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build System:** React 18 with TypeScript, Vite for fast development and optimized builds, Wouter for routing, and React Query for server state management.
- **UI Component Strategy:** shadcn/ui built on Radix UI, Tailwind CSS for styling with custom design tokens. Features a dual design approach: marketing-focused for influencers (Linear/Notion inspired) and data-dense for admins (Fluent Design principles). Custom CSS variables enable theming, and Inter font family ensures modern typography.
- **State Management:** React Query manages server and authentication state. Local component state uses React hooks. Form state is managed by `react-hook-form` with Zod validation.
- **Routing:** Public, Influencer (protected), and Admin (protected) routes with `useAuth` hook for protection.

### Backend Architecture
- **Server Framework:** Express.js for a REST API with session-based authentication. Supports separate development and production entry points.
- **API Design:** RESTful endpoints, `express-session` for stateful authentication, and role-based access control (influencer vs. admin).
- **Data Access:** PostgreSQL database via Drizzle ORM and `@neondatabase/serverless` driver. A storage abstraction layer allows for flexible database implementations. Database seeding provides initial admin and sample data.
- **Authentication:** Email/password authentication with bcrypt hashing, separate login flows, and session persistence (7 days with httpOnly cookies).

### Database Design (Drizzle Schema)
- **Core Entities:** `admins`, `influencers` (with profile, social, shipping, scores), `campaigns` (with inventory, deadlines, rewards), `applications` (junction table with workflow states), `shipping`, `uploads` (content verification), `score_events`, `penalty_events`, `admin_notes`, and `notifications`.
- **State Machine Architecture:** Implements state transitions for applications (pending to verified/deadline_missed), influencer accounts (uninitialized to active/restricted), and campaigns (draft to archived). State changes trigger business logic.
- **Key Relationships:** Applications link influencers and campaigns. Shipping, uploads, and reputation events are tied to applications. Admin notes are linked to influencers.

### System Features & Implementations
- **Admin Notes System:** Allows admins to add internal notes to influencer profiles.
- **Score/Penalty Event History:** Tracks and displays influencer reputation events.
- **Shipping Issue Reporting & Admin Management:** Influencers can report shipping problems via "Report Issue" button on their application cards. Admins have a dedicated "Reported Issues" page (`/admin/issues`) with:
  - Stats cards showing Open, Resolved, and Dismissed issue counts
  - Search functionality by influencer name, email, TikTok handle, or campaign name
  - Status filter dropdown (All, Open, Resolved, Dismissed)
  - Detailed issue cards showing influencer info (name, email, TikTok link), campaign details, and issue message
  - Resolve/Dismiss actions with optional admin response
  - Sidebar badge showing count of open issues for quick visibility
- **Ghosting Detection:** Automated penalties for missed deadlines, leading to account restriction.
- **Enhanced Admin Influencer Management:** Tabbed interface for profile, history, notes, and applications.
- **Email Notification System:** Resend API integration sends automated emails on: (1) influencer signup (welcome email), (2) application approval, (3) shipping info entry, (4) admin reply to comments, (5) upload verification (admin verifies video → influencer receives confirmation). Uses non-blocking async sending with beautiful HTML templates. Also logs to notifications table for audit trail.
- **Email Threading System (IMPORTANT):** All campaign-related emails are threaded together per influencer+campaign combination:
  - **Thread Structure:** Welcome emails are standalone. Campaign emails (Approval → Shipping → Admin Reply → future emails) are threaded together.
  - **Implementation:** 
    - Approval email sets custom `Message-ID` header: `<collaboom-{timestamp}-{random}@collaboom.io>`
    - This Message-ID is stored in `applications.emailThreadId` column (PostgreSQL)
    - Subsequent emails reference this via `In-Reply-To` and `References` headers
    - Subject format: `[Collaboom] {Campaign Name} by {Brand Name}` with `Re:` prefix for replies
  - **Key Rule:** Any future campaign-related email type MUST use the stored `emailThreadId` to maintain threading
  - **Database Storage:** Thread IDs persist in PostgreSQL, survives server restarts
- **Pagination & Filtering:** Server-side pagination and filtering for admin interfaces (influencers, campaigns) based on search terms, campaign ID, or status.
- **Influencer Campaign Stats:** Displays aggregated stats (applied, accepted, completed campaigns) per influencer.
- **Influencer Transparency Features:** APIs for influencers to view their own notifications, score, and penalty event history.
- **Flexible Reward System:** Campaigns can offer "Gift Only" or "Gift + Paid" rewards with customizable amounts.
- **Dual Deadline System:** Campaigns have separate `applicationDeadline` and `upload deadline`.
- **Extended Campaign Information:** Campaigns include three additional content sections for admin configuration:
  - **Product Information**: `productDetail` field for detailed product descriptions
  - **Step by Step Process**: `stepByStepProcess` field for influencer workflow instructions
  - **Eligibility and Requirements**: `eligibilityRequirements` field for participation criteria
- **Video Guidelines System:** Comprehensive video creation guidance for influencers:
  - **Essential Cuts**: Required scenes/cuts for the video (`videoEssentialCuts`)
  - **Video Details**: Technical requirements and filming details (`videoDetails`)
  - **Key Points**: Key messages to highlight (`videoKeyPoints`)
  - **Reference Videos**: TikTok video URLs as examples (`videoReferenceUrls` array) with embedded playback
  - Influencers view via Sheet component with TikTok embeds for reference videos
- **Admin Campaign Workflow:** Streamlined tabbed interface for managing applicants, approved influencers, shipping, and uploads.
- **Admin Campaign Navigation:** Expandable sidebar sub-menu organizes campaigns into Active (draft/active/full), Finished (closed), and Archived views. Supports multi-status filtering via `statuses` query parameter.
- **Campaign Finish Feature:** Admins can manually finish (close) campaigns via "Finish" button in the dropdown menu (above Archive). Shows Korean confirmation dialog "정말로 닫으시겠습니까?" before closing. Finished campaigns move to the "Finished" sidebar section, and influencers see "This campaign is closed" message with gray styling on the campaign detail page. Works regardless of deadline status.
- **Campaign Archive & Delete:** Full lifecycle management with Archive (hide from influencers), Restore (unarchive), and Delete (cascade removal of applications, shipping, uploads, issues) functionality with confirmation dialogs. Server-side security enforces that only archived campaigns can be permanently deleted.
- **Inline Shipping Entry & Bulk Upload:** Admins can enter shipping details individually or via CSV upload, including courier, tracking number, and URL.
- **Enhanced Shipping Display:** Clear display of shipping information for both admins and influencers.
- **Admin Address Override System:** 
  - Applications table stores optional shipping address fields (`shippingAddressLine1`, `shippingAddressLine2`, `shippingCity`, `shippingState`, `shippingZipCode`, `shippingCountry`)
  - Admin can edit shipping address per application without modifying influencer's original profile address
  - Address display shows full address (all lines) with edit button in Approved tab
  - Falls back to influencer's original address when no override exists
- **Influencer Data Export:** Download CSV button exports all approved influencer data including name, email, TikTok handle, Instagram handle, phone, full address (with overrides), status, and dates.
- **Two-Step Application Confirmation:**
  - Step 1: Address confirmation dialog with "Confirm" and "Change my address" buttons
  - Step 2: TikTok verification dialog with clickable handle link, restriction warning, and agreement checkbox
  - Prevents application if no TikTok handle exists
- **Comment System Lifecycle:**
  - Comment button visible for: pending, approved, shipped, delivered statuses
  - Comment button hidden after video upload (uploaded/completed status) to prevent post-completion inquiries
  - Existing comments remain visible with response history
- **Campaign Dismiss Feature:**
  - Dismiss button visible for: rejected, uploaded, completed statuses
  - Confirmation popup explains: "Your records are safe! All your campaign history, points, and achievements are permanently saved in Collaboom. Dismissing this campaign will only remove it from your dashboard view."
  - Dismissed campaigns immediately hidden from influencer dashboard
  - Records remain in database for admin visibility and historical tracking

### Performance Optimizations
- **Route-Level Code Splitting:** All page components use React.lazy and Suspense for on-demand loading. This reduces initial bundle size by deferring admin-specific dependencies (recharts, react-dropzone) until needed.
- **Minimal Campaign API:** Public `/api/campaigns` endpoint supports `?minimal=true` to return only essential fields for list views. Returns `thumbnailUrl` (single image) instead of full `imageUrls` array, dramatically reducing JSON payload from ~500KB+ to ~5KB for typical campaign lists.
- **MinimalCampaign Type:** Strongly typed `MinimalCampaign` interface includes: id, name, brandName, productName, category, rewardType, rewardAmount, inventory, approvedCount, thumbnailUrl, status, deadline, applicationDeadline.
- **Image Utility:** `getCampaignThumbnail()` function in `client/src/lib/imageUtils.ts` accepts campaign objects and handles both MinimalCampaign (thumbnailUrl) and full Campaign (imageUrls/imageUrl) types.
- **Server-Side Pagination:** `/api/campaigns` supports `?page=N&pageSize=M` for true server-side pagination via `getActiveCampaignsPaginated()`.
- **Lightweight Application Status:** `/api/applications/my-ids` endpoint returns only campaign IDs the user has applied to, eliminating the need to fetch full application records just to check application status.
- **Client-Side Pagination:** Campaign list page displays 12 items per page with pagination controls.
- **Performance Logging:** API endpoints include timing and payload size logging for optimization monitoring.

## External Dependencies

- **PostgreSQL Database:** Primary data store, connected via Drizzle ORM and `@neondatabase/serverless`. Migrations handled by `drizzle-kit`.
- **Email Notifications:** Implemented via Resend API for transactional emails (welcome, approval, shipping notifications).
- **Supabase Storage:** Campaign images stored in `collaboom-campaign` bucket. Requires DELETE policy for anon role.
- **Third-Party UI Components:** Radix UI primitives, shadcn/ui, Tailwind CSS, and Google Fonts (Inter).
- **Development Tools (Replit-specific):** `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` for enhanced development experience within Replit.

### Supabase Storage Configuration
- **Bucket Name:** `collaboom-campaign`
- **Image Path Format:** `campaigns/{campaignId}-{index}-{timestamp}.{ext}`
- **Required RLS Policies:**
  - SELECT: Allow anon role (for public image access)
  - DELETE: Allow anon role (for campaign deletion cleanup)
- **Auto Cleanup:** When a campaign is deleted, associated images are automatically removed from Storage
- **Orphan Cleanup APIs:**
  - `GET /api/admin/orphan-images` - Preview orphan files (dry run)
  - `POST /api/admin/cleanup-orphan-images` - Delete orphan files
- **Migration Endpoint:** `POST /api/admin/migrate-images` - Converts base64 images to Storage URLs