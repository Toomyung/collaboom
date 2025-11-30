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
- **Shipping Issue Reporting:** Influencers can report shipping problems, which admins can view and resolve.
- **Ghosting Detection:** Automated penalties for missed deadlines, leading to account restriction.
- **Enhanced Admin Influencer Management:** Tabbed interface for profile, history, notes, and applications.
- **Email Notification System:** Resend API integration sends automated emails on: (1) influencer signup (welcome email), (2) application approval, (3) shipping info entry. Uses non-blocking async sending with beautiful HTML templates. Also logs to notifications table for audit trail.
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
- **Campaign Archive & Delete:** Full lifecycle management with Archive (hide from influencers), Restore (unarchive), and Delete (cascade removal of applications, shipping, uploads, issues) functionality with confirmation dialogs. Server-side security enforces that only archived campaigns can be permanently deleted.
- **Inline Shipping Entry & Bulk Upload:** Admins can enter shipping details individually or via CSV upload, including courier, tracking number, and URL.
- **Enhanced Shipping Display:** Clear display of shipping information for both admins and influencers.

### Performance Optimizations
- **Route-Level Code Splitting:** All page components use React.lazy and Suspense for on-demand loading. This reduces initial bundle size by deferring admin-specific dependencies (recharts, react-dropzone) until needed.
- **Minimal Campaign API:** Public `/api/campaigns` endpoint supports `?minimal=true` to return only essential fields (id, name, brandName, category, etc.) for list views, reducing JSON payload significantly.
- **Server-Side Pagination:** `/api/campaigns` supports `?page=N&pageSize=M` for true server-side pagination via `getActiveCampaignsPaginated()`.
- **Lightweight Application Status:** `/api/applications/my-ids` endpoint returns only campaign IDs the user has applied to, eliminating the need to fetch full application records just to check application status.
- **Client-Side Pagination:** Campaign list page displays 12 items per page with pagination controls.

## External Dependencies

- **PostgreSQL Database:** Primary data store, connected via Drizzle ORM and `@neondatabase/serverless`. Migrations handled by `drizzle-kit`.
- **Email Notifications:** Implemented via Resend API for transactional emails (welcome, approval, shipping notifications).
- **Third-Party UI Components:** Radix UI primitives, shadcn/ui, Tailwind CSS, and Google Fonts (Inter).
- **Development Tools (Replit-specific):** `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` for enhanced development experience within Replit.