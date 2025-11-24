# Polymarket-Style Onboarding Flow

## Overview
A beautiful, modern onboarding flow that collects username and optional email from users after they log in, before taking them to the homepage.

## Flow Structure

### 1. Login → 2. Username Collection → 3. Email Collection (Optional) → 4. Homepage

## Features Implemented

### ✅ Username Collection Screen
- **Location**: `/onboarding` (Step 1)
- **Features**:
  - Clean, modern UI with gradient background
  - Progress indicator (2 steps)
  - Real-time character counter (max 20 characters)
  - Live username preview with avatar
  - Validation:
    - Required field
    - 3-20 characters
    - Letters, numbers, underscores, and hyphens only
  - Smooth animations with Framer Motion

### ✅ Email Collection Screen
- **Location**: `/onboarding` (Step 2)
- **Features**:
  - Optional email input
  - Real-time email validation with green checkmark
  - List of benefits for providing email:
    - Get notified when someone challenges you
    - Receive weekly performance summaries
    - Exclusive tips and market insights
  - Two action buttons:
    1. **Continue** - Saves email and proceeds
    2. **I'll do it later** - Skips email and proceeds
  - Back button to edit username

### ✅ Backend Integration

#### API Endpoint: `/api/onboarding`
- **POST**: Creates/updates user profile with username and email
- **GET**: Checks if user has completed onboarding
- **Features**:
  - Username uniqueness validation
  - Saves to MongoDB User collection
  - Returns user profile data

#### Database Schema Updates
- Added `email` field to User model
- Email is optional and stored in lowercase
- Validated on backend

### ✅ Smart Redirect Logic

#### Login Page (`/login`)
- Checks if user has completed onboarding via API call to database
- If yes → Redirect to `/`
- If no → Redirect to `/onboarding`

#### Onboarding Page (`/onboarding`)
- Checks authentication status
- If not authenticated → Redirect to `/login`
- If already completed (checks database via API) → Redirect to `/`

### ✅ Design Features

#### Visual Design
- Polymarket-inspired clean aesthetic
- Dark gradient background (slate-900 → purple-900)
- Glass-morphism cards with backdrop blur
- Purple-pink gradient buttons with glow effects
- Smooth transitions and animations

#### UX Enhancements
- Auto-focus on input fields
- Character counter for username
- Live preview of username with avatar
- Email validation indicator (green checkmark)
- Loading states on all buttons
- Error messages with red styling
- Back button for navigation

## Files Created/Modified

### New Files
1. `app/onboarding/page.tsx` - Main onboarding component
2. `app/api/onboarding/route.ts` - API endpoint for saving onboarding data
3. `ONBOARDING_FLOW.md` - This documentation

### Modified Files
1. `app/login/page.tsx` - Updated redirect logic
2. `models/User.ts` - Added email field to schema

## Data Storage

### MongoDB (Server-side) - Single Source of Truth
All user data is stored in the database only:
- User document with:
  - `privyId` - Unique Privy user ID
  - `username` - User's chosen username (required)
  - `email` - User's email (optional)
  - `walletAddress` - Connected wallet address
  - `stats` - User statistics
  - Other profile fields

**Note**: No localStorage is used. Onboarding status is checked via API call to the database.

## Testing the Flow

### Step 1: Test Flow (No localStorage clearing needed!)
1. Visit `/login`
2. Login with any method (Wallet, Email, Google, etc.)
3. Should redirect to `/onboarding`
4. Enter username (e.g., "john_doe")
5. See live preview with avatar
6. Click "Continue"
7. On email screen:
   - Option A: Enter email and click "Continue"
   - Option B: Click "I'll do it later"
8. Should redirect to homepage `/`

### Step 2: Verify Data
1. Check profile page at `/profile`
2. Username should be displayed as `@your_username`
3. Email should be saved (if provided)

## Future Enhancements

### Possible Additions
- [ ] Avatar upload during onboarding
- [ ] Username availability check in real-time
- [ ] Social media link collection
- [ ] Profile interests/categories selection
- [ ] Profile completion percentage
- [ ] Skip onboarding option (with reminder)
- [ ] Email verification flow
- [ ] Welcome email after onboarding

## Technical Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Auth**: Privy
- **Database**: MongoDB with Mongoose
- **Validation**: Custom validators + Regex

## Notes
- Onboarding is enforced after login (cannot bypass)
- Username is required, email is optional
- **Data is saved to database only** - no localStorage usage
- Onboarding status is checked via API call to database
- Profile page automatically displays username
- Clean, modern design matching Polymarket aesthetic

