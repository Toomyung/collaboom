# Collaboom MVP

## Vision & Positioning

Collaboom is the **growth platform for nano-influencers** (1,000-10,000 TikTok followers) — positioned as "where small creators become brand partners." Unlike traditional influencer platforms requiring 10K+ followers, Collaboom addresses three key pain points:

1. **No 10K Follower Requirement** - Open to creators with just 1,000+ followers
2. **First Brand Deal Access** - Help nano-influencers land their first paid collaborations
3. **Portfolio Building** - Build credibility and reputation through completed campaigns

The platform connects US-based TikTok influencers with K-Beauty, Food, and Lifestyle brands for **PAID product campaigns** offering free products plus cash rewards ($10-$30).

## User Preferences

- **Communication Style:** Simple, everyday language (Korean preferred)
- **Git Workflow:** Replit → GitHub `staging` → Test on Render → PR to `main` → Production
- **Production URL:** collaboom.io

## Campaign Types & Rewards

### Basic Campaign
- **Reward:** $10 cash + free product
- **Requirements:** TikTok video URL
- **Color Theme:** Purple-pink gradient

### Link in Bio Campaign  
- **Reward:** $30 cash + free product
- **Requirements:** Bio link URL + TikTok video URL
- **Color Theme:** Emerald-teal gradient

### Amazon Video Upload Campaign
- **Reward:** $30 cash + free product
- **Requirements:** Amazon Storefront URL + TikTok video URL
- **Color Theme:** Amber-orange gradient

### Bonus: Usage of Rights
- **Additional:** $30 for brand content usage rights

All campaigns follow a **unified submission workflow** where influencers submit all requirements together, and admins verify everything in a centralized Uploads tab.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript, Vite, Wouter for routing
- **State Management:** TanStack React Query (v5) for server state with `staleTime: Infinity`
- **UI/UX:** shadcn/ui (Radix UI), Tailwind CSS, Framer Motion for animations
- **Design:** Mobile-first, marketing-focused for influencers, data-dense for admins
- **Theming:** Custom CSS variables, Inter font, dark mode support

### Backend
- **Server:** Express.js REST API with session-based authentication
- **Database:** PostgreSQL via Drizzle ORM (Supabase Postgres)
- **Real-time:** Socket.IO for live updates (uses `refetchType: 'active'` due to global staleTime)
- **Authentication:** Email/password with bcrypt, Google OAuth via Supabase Auth
- **Security:** Helmet CSP, sameSite cookies, rate limiting, SESSION_SECRET

### External Services
- **Database:** Supabase Postgres (ihonpsbeebgriddemopf.supabase.co)
- **Email:** Resend API for transactional emails with HTML templates
- **Storage:** Supabase Storage (`collaboom-campaign` bucket) for campaign images
- **OAuth:** Supabase Auth for Google social login

## Core Features

### Influencer Features
- **Signup Flow:** Conversion-optimized with growth-focused messaging
- **Two-Step Application:** Apply → Confirm participation
- **Delivery Confirmation:** Confirm product receipt (+2 points reward with celebration popup)
- **Content Submission:** Unified workflow for all campaign requirements
- **Payout Requests:** Request full available balance via PayPal email
- **Campaign Dismiss:** Hide unwanted campaigns from feed
- **Support Tickets:** Submit and track support requests
- **Score & Tier System:** Three-tier progression (Starting → Standard → VIP)

### Delivery Confirmation System
- **Tracking:** `deliveryConfirmedBy` field tracks who confirmed ('admin' | 'influencer')
- **Points Reward:** +2 points automatically awarded when influencer confirms
- **UI:** Color-coded badges (Amber = Creator confirmed, Blue = Admin confirmed)
- **Celebration:** Modern popup with Trophy icon, confetti animation, counting effect

### Influencer Scoring & Tiers

#### Tier Benefits
| Tier | Score Range | Benefits |
|------|-------------|----------|
| Starting | 0-49 | Base access |
| Standard | 50-99 | Priority consideration |
| VIP | 100+ | Automatic application approval |

#### Score Events
- Completed campaign: +10 points
- Delivery confirmed (by influencer): +2 points
- Missed deadline: -20 points
- Other violations: Variable penalties

### Admin Features
- **Dashboard:** Real-time stats, quick actions, issue alerts
- **Campaign Management:** Create/edit/archive/delete campaigns, dual deadlines
- **Application Management:** Review, approve/reject, track status transitions
- **Uploads Tab:** Centralized content verification for all submission types
- **Influencer Management:** Notes, score history, account status control
- **Shipping Management:** Track shipments, mark delivered
- **Payout Management:** Process payout requests with status tracking
- **Support Tickets:** Respond to influencer inquiries
- **Overdue Detection:** Identify applications past deadline, mark as "Missed Deadline"
- **Data Export:** CSV export for reporting

### Email Notifications (Resend API)
- Application status updates
- Shipping notifications
- Payout confirmations
- Threaded email conversations

### State Machine
Manages transitions for:
- Application status: pending → approved → shipped → delivered → completed
- Influencer account status: active ↔ suspended ↔ banned
- Campaign status: active ↔ archived

## UI Design System

### Color Scheme by Campaign Type
- **Basic:** Purple-pink gradient (`from-purple-500 to-pink-500`)
- **Link in Bio:** Emerald-teal gradient (`from-emerald-500 to-teal-500`)
- **Amazon Upload:** Amber-orange gradient (`from-amber-500 to-orange-500`)

### Navigation
- **MainLayout:** Unified layout with logo, hamburger menu (mobile), auth buttons, theme toggle
- **AdminLayout:** Sidebar navigation for admin pages

### Celebrations & Gamification
- **Points Popup:** Trophy icon, confetti effect (50 pieces), counting animation
- **Button Badges:** Show rewards before action (e.g., "+2 pts" on Confirm Delivery)

## Error Handling

- **User-Facing:** Clean AlertDialog popups with friendly messages
- **Developer:** Full error details logged to console via custom `ApiError` class
- **API Errors:** Standardized error response format with proper HTTP status codes

## Deployment

### Environments
- **Development:** Replit with hot reload
- **Staging:** Render (connected to GitHub `staging` branch)
- **Production:** Render at collaboom.io (connected to GitHub `main` branch)

### Deployment Process
1. Develop and test in Replit
2. Push to GitHub `staging` branch
3. Verify on Render staging environment
4. Create PR from `staging` to `main`
5. Merge triggers production deployment

## Recent Changes

### December 2024
- **Real-time Chat System:** Messenger-style 1:1 chat between influencers and admins
  - Floating chat button on influencer dashboard
  - Message gating: influencers can only send one message, then must wait for admin reply
  - Chat accessed through InfluencerDetailSheet (Messages tab), NOT a separate page
  - Real-time message delivery via Socket.IO with global handler in `socket.tsx`
  - Email notifications when admin sends a message
  - Database tables: `chat_rooms`, `chat_messages`
  - **Chat Room Auto-Reactivation:** Ended rooms automatically reactivate when influencer sends message
  - **Unread Badge System:** Red badge on Influencers tab and individual influencer cards
  - **File Attachments:** Support for file uploads in chat (10MB limit)
    - Allowed types: Images (JPG, PNG, GIF, WEBP), PDF, CSV, Excel (XLS, XLSX), ZIP, MP4
    - Files stored in Supabase Storage under `chat/{roomId}/` directory
    - Inline image preview, download links for other file types
    - Schema fields: `attachmentUrl`, `attachmentName`, `attachmentType`, `attachmentSize`
- Added delivery confirmation tracking with `deliveryConfirmedBy` field
- Implemented +2 points reward for influencer delivery confirmation
- Created celebration popup with confetti animation (replaces toast)
- Added "+2 pts" badge to Confirm Delivery button
- Conversion-optimized signup flow with growth messaging
- Color-coded delivery confirmation badges in admin UI

## File Structure

```
client/src/
├── components/
│   ├── admin/          # Admin-specific components
│   ├── layout/         # MainLayout, AdminLayout
│   ├── ui/             # shadcn/ui components
│   └── *.tsx           # Shared components
├── hooks/              # Custom React hooks
├── lib/                # Utilities, API client, Socket.IO
├── pages/
│   ├── admin/          # Admin pages
│   └── *.tsx           # Influencer pages
└── App.tsx             # Router configuration

server/
├── routes.ts           # API endpoints
├── databaseStorage.ts  # Database operations
├── storage.ts          # Storage interface
├── emailService.ts     # Resend email integration
├── socket.ts           # Socket.IO setup
├── security.ts         # Auth middleware
└── db.ts               # Drizzle ORM setup

shared/
└── schema.ts           # Database schema & types
```

## Development Notes

### Socket.IO Integration
Due to global `staleTime: Infinity` in React Query, Socket.IO updates use `refetchType: 'active'` parameter to properly invalidate queries.

### Test Account
- Email: hello@toomyungpeople.com
- Use for testing delivery confirmation and other features

### Database Commands
- Schema push: `npm run db:push`
- Force push (with data loss): `npm run db:push --force`
