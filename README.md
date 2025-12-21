# Collaboom

Influencer campaign management platform connecting US-based TikTok influencers (1,000+ followers) with K-Beauty, Food, and Lifestyle brands for product seeding campaigns.

## Features

### For Influencers
- Browse and apply to campaigns
- Track application status and shipments
- Upload content and receive verification
- Build reputation through tier system (Starting, Standard, VIP)
- Request payouts for completed campaigns

### For Admins
- Manage campaigns (create, edit, archive)
- Review and approve applications
- Track shipments and verify content uploads
- Score/penalty system for influencer management
- Payout management

## Campaign Types

1. **Gifting** - Free product in exchange for TikTok content
2. **Link in Bio** - $30 cash + product for bio link placement
3. **Amazon Video Upload** - $30 cash + product for Amazon Storefront content

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Email/password with bcrypt, session-based auth
- **Email:** Resend API
- **Storage:** Supabase Storage

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=your_postgres_connection_string
SESSION_SECRET=your_session_secret
RESEND_API_KEY=your_resend_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate migration files

## Project Structure

```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
├── server/           # Express backend
│   ├── routes.ts     # API routes
│   ├── storage.ts    # Database operations
│   └── db.ts         # Database connection
├── shared/           # Shared code
│   └── schema.ts     # Drizzle schema
└── docs/             # Documentation
```

## License

Private - All rights reserved
