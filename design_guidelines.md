# Collaboom MVP Design Guidelines

## Design Approach

**Hybrid Strategy**: This platform serves two distinct user types requiring different design approaches:

**Influencer Interface** (Landing, Campaigns, Dashboard): Reference-based design drawing from **Linear** (clean typography, subtle interactions), **Notion** (approachable productivity), and **Airbnb** (trust-building, visual product cards). Focus on creating an aspirational, opportunity-driven aesthetic.

**Admin Interface**: System-based design following **Fluent Design** principles for data-dense productivity applications with clear information hierarchy and efficient workflows.

## Core Design Principles

1. **Dual Personality**: Inspiring and opportunity-focused for influencers; efficient and data-dense for admins
2. **Trust Through Transparency**: Score/penalty systems must be clearly explained, never punitive in tone
3. **Progressive Disclosure**: Complex information revealed progressively, never overwhelming
4. **Brand Color as Accent**: #8a01ff used sparingly for primary actions, never as dominant background

## Typography System

**Font Stack**:
- Primary: Inter (via Google Fonts) - clean, modern, excellent for UI
- Fallback: system-ui, sans-serif

**Hierarchy**:
- Hero Headlines: text-5xl md:text-6xl font-bold tracking-tight
- Page Titles: text-3xl md:text-4xl font-bold
- Section Headers: text-2xl font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base font-normal
- Captions/Meta: text-sm text-gray-600
- Small Labels: text-xs font-medium uppercase tracking-wide

## Layout System

**Spacing Primitives**: Use consistent units of 4, 8, 16, 24, 32 (p-1, p-2, p-4, p-6, p-8)

**Container Strategy**:
- Marketing pages: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Dashboard content: max-w-screen-2xl mx-auto px-6
- Prose content: max-w-3xl
- Forms: max-w-2xl

**Grid Patterns**:
- Campaign cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Admin tables: Full-width with horizontal scroll on mobile
- Dashboard stats: grid grid-cols-2 lg:grid-cols-4 gap-4

## Component Library

### Influencer Components

**Campaign Cards**:
- Elevated cards with rounded-xl, soft shadow
- Featured image (16:9 aspect ratio) with rounded-t-xl
- Reward badge positioned absolute top-4 right-4
- Status indicators (Active/Full/Closed) as subtle badges
- Inventory display: "24/50 slots" in muted text
- Deadline countdown in small bold text
- Clear CTA button at card bottom

**Dashboard Tabs**:
- Horizontal tab navigation with border-b-2 for active state
- Tab badges showing count (e.g., "Pending (3)")
- Smooth transition between tab panels
- Each tab shows cards in vertical list on mobile, 2-column on desktop

**Profile Form**:
- Single-column layout with clear field grouping
- Required field indicators (asterisk)
- Inline validation feedback
- Prominent "Save Profile" button
- Progress indicator showing profile completion percentage

### Admin Components

**Data Tables**:
- Dense, scannable rows with alternating subtle background
- Fixed header on scroll
- Checkbox column for bulk actions
- Action buttons (Approve/Reject) right-aligned per row
- Sort indicators on column headers
- Sticky bulk action bar when items selected

**Campaign Creation Form**:
- Multi-section form with clear visual separation
- Image preview for uploaded campaign images
- Hashtag/mention inputs with tag-style display
- Status toggle (Draft/Active) prominently placed
- Save/Publish split button pattern

**Detail Drawers**:
- Slide-in from right (w-full max-w-2xl)
- Header with influencer name and quick stats
- Tabbed content for different data views
- Sticky action buttons at drawer bottom

### Universal Components

**Buttons**:
- Primary: bg-[#8a01ff] text-white hover:bg-[#7301dd] with rounded-lg
- Secondary: border border-gray-300 hover:bg-gray-50
- Danger: bg-red-600 text-white hover:bg-red-700
- Ghost: hover:bg-gray-100
- All buttons: px-4 py-2 font-medium transition-colors

**Badges**:
- Score: Gradient from green (100) to yellow (50) to gray (0)
- Status: Contextual colors (green=approved, yellow=pending, red=rejected, blue=shipped)
- Penalty: Red with subtle background, never prominent
- Reward: Purple gradient matching brand

**Modals**:
- Centered with backdrop blur
- max-w-lg with rounded-xl
- Clear title, description, and action buttons
- ESC to close, click outside to dismiss

## Page-Specific Layouts

### Influencer Landing Page
- **Hero Section** (80vh): 
  - Split layout: Left side with headline + CTA, right side with dashboard preview image
  - Headline emphasizes "Free products" and "Build your portfolio"
  - Single primary CTA: "Sign in with Google"
  - Trust indicators: "Join 500+ creators" with avatar stack
  
- **How It Works** (3 steps):
  - Horizontal cards on desktop, vertical on mobile
  - Icons for Browse → Apply → Create → Earn
  - Each card has number badge (01, 02, 03)

- **Featured Campaigns** (showcase 6):
  - Same card pattern as campaign list
  - "View All Campaigns" CTA below

- **FAQ Section**:
  - Accordion pattern with 5-6 common questions
  - Questions about score, deadlines, requirements

### Campaign List Page
- Filter bar at top with category pills (All, Beauty, Food, Lifestyle)
- Grid of campaign cards with lazy loading
- Empty state for "No campaigns match your filters"

### Influencer Dashboard
- Stats row at top: Score (large, prominent) | Total Campaigns | Success Rate
- Tab navigation immediately below
- Restricted account banner (if applicable): Red background, clear messaging, contact CTA
- Cards within tabs show campaign thumbnail, status timeline, next action

### Admin Dashboard (Home)
- 4 summary cards in grid: Active Campaigns | Pending Applicants | Shipping Pending | Upload Pending
- Global search bar prominently placed
- Recent activity feed below metrics
- Quick actions for "Create Campaign" and "Review Applications"

### Admin Campaign Detail
- Campaign header with image, name, edit button
- 5 tabs: Overview | Applicants | Shipping | Uploads | Notes
- **Applicants Tab**: Data table with bulk select, filters for status, score range
- **Shipping Tab**: Upload CSV button prominent, table showing tracking info
- **Uploads Tab**: Table with verification actions, deadline indicators

## Visual Treatments

**Shadows**: Use sparingly
- Cards: shadow-sm hover:shadow-md transition-shadow
- Modals: shadow-2xl
- Dropdowns: shadow-lg

**Borders**: 
- Default: border-gray-200
- Interactive: border-gray-300 hover:border-gray-400
- Focus: ring-2 ring-[#8a01ff] ring-offset-2

**Backgrounds**:
- Page: bg-gray-50
- Cards: bg-white
- Hover states: bg-gray-100
- Active elements: bg-[#8a01ff]/10 (subtle purple tint)

**Transitions**: transition-all duration-200 for most interactive elements

## Images

**Hero Section**: Dashboard preview mockup showing campaign cards and stats - positioned on right side of hero split layout, subtle perspective tilt for depth

**Campaign Cards**: Product photography (16:9) - beauty products, food items, lifestyle goods in clean, well-lit settings

**Empty States**: Friendly illustrations for "No campaigns yet", "Complete your profile", "No applicants"

**Profile Avatars**: Circular, loaded from Google OAuth, 40x40 default size with 2px border