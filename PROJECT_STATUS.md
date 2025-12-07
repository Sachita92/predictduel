# PredictDuel Project Status

## 📊 Overview

This document outlines what is **frontend-only** (UI mockups) and what **work remains** to be completed in the PredictDuel project.

---

## ✅ What's Fully Implemented (Frontend + Backend)

### Backend/API Routes
1. **Profile API** (`/api/profile`)
   - ✅ GET: Fetch user profile, stats, achievements, recent activity
   - ✅ POST: Create new user profile
   - ✅ PUT: Update user profile
   - ✅ Fetches created questions count and list

2. **Duels API** (`/api/duels`)
   - ✅ GET: Fetch all public duels with filtering

3. **Create Prediction API** (`/api/predictions/create`)
   - ✅ POST: Create new duel/prediction in MongoDB
   - ✅ Handles on-chain market creation (stores marketPda and transaction signature)

4. **Database Models**
   - ✅ User model (with stats, achievements)
   - ✅ Duel model (with participants, stakes, outcomes)
   - ✅ Achievement model
   - ✅ Notification model

### Frontend Pages (Functional)
1. **Profile Page** (`/profile`)
   - ✅ Full profile display with stats
   - ✅ Edit profile functionality
   - ✅ Shows created questions (NEW)
   - ✅ Recent activity feed
   - ✅ Category statistics

2. **Create Page** (`/create`)
   - ✅ Multi-step form for creating predictions
   - ✅ On-chain market creation integration
   - ✅ Saves to MongoDB after on-chain creation

3. **Duels List Page** (`/duels`)
   - ✅ Displays all public duels
   - ✅ Category filtering
   - ✅ Real data from API

4. **Login/Auth**
   - ✅ Privy authentication integration
   - ✅ Wallet connection

---

## 🎨 Frontend-Only (Mockups/Placeholders)

### Pages with Mock Data
1. **Feed Page** (`/feed`)
   - ❌ Uses hardcoded `mockPredictions` array
   - ❌ No API integration
   - ❌ No real betting functionality
   - **Status**: UI only, needs API connection

2. **Leaderboard Page** (`/leaderboard`)
   - ❌ Uses hardcoded `mockLeaderboard` array
   - ❌ No API endpoint for leaderboard
   - ❌ Tabs don't filter real data
   - **Status**: UI only, needs backend implementation

3. **Duel Detail Page** (`/duel/[id]`)
   - ❌ Hardcoded data (question, stakes, participants)
   - ❌ No API call to fetch duel by ID
   - ❌ No betting functionality
   - ❌ No resolution functionality
   - ❌ No real-time updates
   - **Status**: UI mockup, needs full implementation

### Components (May Need Work)
1. **NotificationDropdown** (`components/notifications/NotificationDropdown.tsx`)
   - ⚠️ Check if connected to real notification system

2. **SearchModal** (`components/search/SearchModal.tsx`)
   - ⚠️ Check if connected to search API

---

## 🔧 Missing Backend Implementation

### Critical Missing API Routes

1. **Get Duel by ID** (`/api/duels/[id]` or `/api/duel/[id]`)
   - ❌ **MISSING**: Need to fetch individual duel details
   - Should return: question, creator, participants, stakes, status, deadline, etc.

2. **Participate/Bet API** (`/api/duels/[id]/participate` or `/api/duels/[id]/bet`)
   - ❌ **MISSING**: Allow users to place bets on duels
   - Should:
     - Update MongoDB duel with new participant
     - Call Solana `placeBet` on-chain
     - Update pool size, yes/no counts
     - Return transaction signature

3. **Resolve Duel API** (`/api/duels/[id]/resolve`)
   - ❌ **MISSING**: Allow creator to resolve duel
   - Should:
     - Call Solana `resolveMarket` on-chain
     - Update MongoDB duel status to 'resolved'
     - Set outcome (yes/no)
     - Calculate winners

4. **Claim Winnings API** (`/api/duels/[id]/claim`)
   - ❌ **MISSING**: Allow winners to claim their winnings
   - Should:
     - Call Solana `claimWinnings` on-chain
     - Update user stats (wins, totalEarned)
     - Update participant record

5. **Leaderboard API** (`/api/leaderboard`)
   - ❌ **MISSING**: Fetch top users by various metrics
   - Should support:
     - Time filters (today, week, all-time)
     - Sorting (wins, win rate, total earned, streak)
     - Pagination

6. **Feed API** (`/api/feed`)
   - ❌ **MISSING**: Personalized feed of duels
   - Could include:
     - Recommended duels
     - Friends' duels
     - Trending duels
     - User's active duels

7. **Search API** (`/api/search`)
   - ❌ **MISSING**: Search duels by question, category, creator
   - Should support text search on question field

8. **Notifications API** (`/api/notifications`)
   - ⚠️ **UNCLEAR**: Check if implemented
   - Should handle:
     - Duel invitations
     - Resolution notifications
     - Win/loss notifications

---

## 🔗 Solana Integration Status

### ✅ Implemented
1. **Solana Program** (`solana-program/`)
   - ✅ Rust program with all instructions (create_market, place_bet, resolve_market, claim_winnings)
   - ✅ Client SDK (`solana-program/client/sdk.ts`)
   - ✅ Market creation helper (`lib/solana-market.ts`)

2. **Market Creation**
   - ✅ `createMarketOnChain()` function exists
   - ✅ Called from create page
   - ✅ Stores marketPda and transaction signature in MongoDB

### ❌ Missing/Incomplete
1. **Solana Wallet Integration**
   - ⚠️ `lib/solana-client.ts` has TODO comment
   - ⚠️ `initializePredictDuelClient()` returns null (placeholder)
   - ⚠️ Privy Solana wallet adapter integration incomplete

2. **Betting on Solana**
   - ❌ No frontend call to `placeBet()` SDK method
   - ❌ No API route that calls Solana `placeBet`

3. **Resolving on Solana**
   - ❌ No frontend call to `resolveMarket()` SDK method
   - ❌ No API route that calls Solana `resolveMarket`

4. **Claiming Winnings on Solana**
   - ❌ No frontend call to `claimWinnings()` SDK method
   - ❌ No API route that calls Solana `claimWinnings`

---

## 🎯 Priority Work Items

### High Priority (Core Functionality)

1. **Implement Duel Detail Page API**
   - Create `/api/duels/[id]/route.ts`
   - Fetch duel from MongoDB by ID
   - Populate creator and participants
   - Return full duel data

2. **Implement Betting Functionality**
   - Create `/api/duels/[id]/bet/route.ts`
   - Update MongoDB duel (add participant, update pool)
   - Call Solana `placeBet()` on-chain
   - Handle transaction signing

3. **Update Duel Detail Page**
   - Connect to real API
   - Add betting UI (Yes/No buttons)
   - Show real participant data
   - Handle real-time updates (or polling)

4. **Implement Resolution Flow**
   - Create `/api/duels/[id]/resolve/route.ts`
   - Only allow creator to resolve
   - Call Solana `resolveMarket()`
   - Update MongoDB status and outcome
   - Calculate and update winner stats

5. **Implement Claim Winnings**
   - Create `/api/duels/[id]/claim/route.ts`
   - Call Solana `claimWinnings()`
   - Update user stats
   - Transfer SOL to winner

### Medium Priority

6. **Leaderboard Backend**
   - Create `/api/leaderboard/route.ts`
   - Query users sorted by stats
   - Support time filters
   - Connect to leaderboard page

7. **Feed Backend**
   - Create `/api/feed/route.ts`
   - Return personalized duel list
   - Connect to feed page

8. **Search Functionality**
   - Create `/api/search/route.ts`
   - Text search on questions
   - Filter by category, status
   - Connect to search modal

### Low Priority (Polish)

9. **Real-time Updates**
   - WebSocket or polling for live duel updates
   - Update pool sizes, participant counts

10. **Notifications System**
    - Implement notification creation
    - Connect to notification dropdown
    - Real-time notification delivery

11. **Friend Challenges**
    - Implement friend duel flow
    - User search/selection
    - Direct challenge creation

---

## 📝 Technical Debt / TODOs Found

1. **`lib/solana-client.ts`** (Line 55)
   - TODO: Implement actual Privy Solana wallet adapter integration
   - Currently returns null

2. **`lib/api-helpers.ts`** (Line 33)
   - TODO: Extract Privy user ID from request headers/cookies
   - Currently placeholder implementation

3. **`app/create/page.tsx`** (Line 148)
   - Comment: "Privy's wallet structure may need different access"
   - May need adjustment based on Privy's actual API

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Complete all High Priority items
- [ ] Test Solana wallet integration end-to-end
- [ ] Test betting flow (create → bet → resolve → claim)
- [ ] Set up MongoDB indexes for performance
- [ ] Configure environment variables
- [ ] Set up error monitoring
- [ ] Test on Solana devnet/mainnet
- [ ] Implement rate limiting on APIs
- [ ] Add input validation and sanitization
- [ ] Set up database backups

---

## 📊 Summary

**Frontend-Only Pages:**
- Feed page (mock data)
- Leaderboard page (mock data)
- Duel detail page (hardcoded data)

**Missing Backend APIs:**
- Get duel by ID
- Bet/participate in duel
- Resolve duel
- Claim winnings
- Leaderboard
- Feed
- Search

**Solana Integration:**
- ✅ Market creation works
- ❌ Betting not connected
- ❌ Resolution not connected
- ❌ Claiming not connected
- ⚠️ Wallet adapter needs work

**Estimated Completion:**
- Core betting flow: ~2-3 days
- All features: ~1-2 weeks

