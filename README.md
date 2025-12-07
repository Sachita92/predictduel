# PredictDuel - Social Prediction Market Platform

A modern, playful, and highly engaging web interface for PredictDuel - a social prediction market dapp on Solana where users challenge friends to prediction battles and win cryptocurrency instantly.

## Features

- **Landing Page** - Hero section with live activity feed and stats
- **Main Feed** - Tinder-style card stack for browsing predictions
- **Create Duel** - Step-by-step wizard for creating predictions
- **Active Duel Detail** - Real-time tracking of predictions
- **Win/Loss Screens** - Celebratory animations and results
- **Leaderboard** - Competitive rankings with top predictors
- **Profile** - User stats, achievements, and activity history
- **Lightning Round** - 60-second rapid prediction mode
- **Wallet Integration** - Connect Solana wallets seamlessly

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations and interactions
- **React Confetti** - Celebration effects
- **MongoDB** - Database for storing duels and user data
- **Mongoose** - MongoDB ODM
- **Solana** - Blockchain for prediction markets
- **Privy** - Wallet authentication

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
   - Use `mongodb://127.0.0.1:27017/predictduel` in `.env.local`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
predictduel/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Landing page
│   ├── feed/              # Main feed page
│   ├── create/            # Create duel page
│   ├── leaderboard/       # Leaderboard page
│   ├── profile/           # Profile page
│   └── lightning/         # Lightning round page
├── components/
│   ├── ui/                # Reusable UI components
│   ├── navigation/        # Navigation components
│   ├── feed/              # Feed-specific components
│   ├── results/           # Win/loss screens
│   └── wallet/            # Wallet connection
└── lib/                   # Utilities
```

## Key Components

- **Button** - Primary, secondary, destructive variants with animations
- **Card** - Glass morphism and gradient variants
- **Badge** - Category and status indicators
- **CountdownTimer** - Animated countdown with urgency states
- **PredictionCard** - Swipeable prediction cards
- **MobileNav** - Bottom navigation bar
- **TopNav** - Top navigation with search and wallet

## Design Highlights

- Glass morphism effects throughout
- Gradient-heavy aesthetic
- Smooth animations and micro-interactions
- Mobile-first responsive design
- Fast, energetic feel
- Satisfying win celebrations

## Next Steps

- Integrate Solana wallet SDK
- Connect to on-chain prediction market contracts
- Add real-time data feeds
- Implement user authentication
- Add social sharing features
- Deploy to production

## License

MIT

