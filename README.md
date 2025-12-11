# PredictDuel - Social Prediction Market Platform

A modern, playful, and highly engaging web interface for PredictDuel - a social prediction market dapp on Solana where users challenge friends to prediction battles and win cryptocurrency instantly.

## Features

### Core Functionality
- ✅ **Landing Page** - Hero section with live activity feed and real-time stats
- ✅ **Main Feed** - Swipeable card stack for browsing active duels
- ✅ **Create Duel** - Multi-step wizard for creating predictions with Solana integration
- ✅ **Duel Detail Page** - Complete duel information with betting, resolution, and claiming
- ✅ **Betting System** - Place bets on duels with Yes/No predictions
- ✅ **Resolution System** - Creators can resolve duels after deadline
- ✅ **Claim Winnings** - Winners can claim their payouts on-chain
- ✅ **Leaderboard** - Competitive rankings with sorting and time filters
- ✅ **Profile** - User stats, achievements, created duels, and activity history
- ✅ **Lightning Round** - 60-second rapid prediction game mode
- ✅ **Search** - Search duels and users with real-time results
- ✅ **Notifications** - Real-time notifications for bet events
- ✅ **Wallet Integration** - Connect Solana wallets

### Technical Features
- ✅ **Full Solana Integration** - On-chain market creation, betting, resolution, and claiming
- ✅ **MongoDB Backend** - Complete API with all CRUD operations
- ✅ **Real-time Updates** - Live activity feeds and statistics
- ✅ **Responsive Design** - Mobile-first with smooth animations

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations and interactions
- **React Confetti** - Celebration effects
- **Lucide React** - Icon library

### Backend
- **MongoDB** - Database for storing duels, users, and notifications
- **Mongoose** - MongoDB ODM
- **Next.js API Routes** - RESTful API endpoints

### Blockchain
- **Solana** - Blockchain for prediction markets
- **Anchor Framework** - Solana program development
- **@solana/web3.js** - Solana JavaScript SDK
- **@coral-xyz/anchor** - Anchor TypeScript client

### Authentication & Wallets
- **Privy** - Wallet authentication and user management
- **Solana Wallet Adapter** - Support for Phantom, Solflare, Backpack, etc.

## Design System

### Colors
- Primary Gradient: `#8B5CF6` → `#3B82F6`
- Success: `#10B981`
- Danger: `#EF4444`
- Accent: `#F59E0B`
- Background: `#0F172A` (dark), `#1E293B` (darker)

### Typography
- Display: Space Grotesk (headers)
- Body: Inter (content)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `env.example` to `.env.local`
   - Configure your MongoDB connection (see below)

3. Set up MongoDB:
   
   **Option 1: MongoDB Atlas (Recommended)**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get your connection string
   - Add it to `.env.local` as `MONGODB_URI`
   
   **Option 2: Local MongoDB**
   - Install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Start MongoDB service

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
predictduel/
├── app/                           # Next.js app directory
│   ├── page.tsx                  # Landing page with activity feed
│   ├── feed/                     # Main feed page (swipeable cards)
│   ├── create/                   # Create duel page
│   ├── duels/                    # Duels list page
│   ├── duel/[id]/                # Duel detail page
│   ├── leaderboard/              # Leaderboard page
│   ├── profile/                  # Profile page
│   ├── lightning/                # Lightning round page
│   ├── login/                    # Login/auth page
│   └── api/                      # API routes
│       ├── duels/                # Duels CRUD, bet, resolve, claim
│       ├── profile/              # User profile management
│       ├── notifications/        # Notification system
│       ├── leaderboard/          # Leaderboard data
│       ├── lightning/            # Lightning round data
│       ├── activity/             # Activity feed
│       └── users/                # User search
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── navigation/               # Navigation components
│   ├── feed/                     # Feed-specific components
│   ├── search/                   # Search modal
│   ├── notifications/            # Notification dropdown
│   └── wallet/                   # Wallet connection
├── lib/                          # Utilities
│   ├── solana-market.ts          # Market creation
│   ├── solana-bet.ts             # Betting on-chain
│   ├── solana-resolve.ts         # Resolution on-chain
│   ├── solana-claim.ts           # Claiming winnings
│   └── mongodb.ts                # Database connection
└── solana-program/               # Solana program (Rust)
    └── programs/predict-duel/    # Anchor program
```

## Key Components

### UI Components
- **Button** - Primary, secondary, destructive variants with animations
- **Card** - Glass morphism and gradient variants
- **Badge** - Category and status indicators
- **CountdownTimer** - Animated countdown with urgency states
- **PredictionCard** - Swipeable prediction cards

### Navigation
- **TopNav** - Top navigation with search, notifications, and wallet
- **MobileNav** - Bottom navigation bar for mobile

### Features
- **SearchModal** - Search duels and users with recent searches
- **NotificationDropdown** - Real-time notifications
- **ProfileDropdown** - User profile and wallet info
- **DuelDetailPage** - Complete duel management (bet, resolve, claim)

## Design Highlights

- Glass morphism effects throughout
- Gradient-heavy aesthetic
- Smooth animations and micro-interactions
- Mobile-first responsive design
- Fast, energetic feel
- Satisfying win celebrations

## API Endpoints

### Duels
- `GET /api/duels` - List all duels (with search, filter, pagination)
- `GET /api/duels/[id]` - Get duel details
- `PUT /api/duels/[id]` - Update duel (creator only)
- `DELETE /api/duels/[id]` - Delete duel (creator only)
- `POST /api/duels/[id]/bet` - Place a bet
- `POST /api/duels/[id]/resolve` - Resolve duel (creator only)
- `POST /api/duels/[id]/claim` - Claim winnings (winners only)

### Users & Profile
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create profile
- `PUT /api/profile` - Update profile
- `GET /api/users/search` - Search users by username

### Other
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications` - Mark notifications as read
- `GET /api/leaderboard` - Get leaderboard with filters
- `GET /api/lightning` - Get resolved duels for lightning round
- `GET /api/activity/feed` - Get activity feed for home page

## Current Status

✅ **All Core Features Completed**
- Full Solana integration (create, bet, resolve, claim)
- Complete MongoDB backend with all APIs
- All pages functional with real data
- Search functionality (duels and users)
- Notification system
- User authentication and profiles

## Environment Variables

Create a `.env.local` file with:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Privy
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=devnet  # or mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=your_rpc_url  # optional, uses default if not set

# Program ID (if deploying custom program)
NEXT_PUBLIC_PROGRAM_ID=your_program_id
```

## License

MIT

