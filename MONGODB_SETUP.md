# MongoDB Setup Guide for PredictDuel

This guide will walk you through setting up MongoDB for the PredictDuel application.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Setup (Cloud)](#mongodb-atlas-setup-cloud)
3. [Local MongoDB Setup](#local-mongodb-setup)
4. [Environment Variables](#environment-variables)
5. [Database Models](#database-models)
6. [Testing the Connection](#testing-the-connection)
7. [Usage Examples](#usage-examples)

---

## Prerequisites

- Node.js installed (v18 or higher)
- npm or yarn package manager
- MongoDB account (for Atlas) OR MongoDB installed locally

---

## MongoDB Atlas Setup (Cloud) - Recommended

MongoDB Atlas is the cloud-hosted MongoDB service. It's free for development and recommended for production.

### Step 1: Create MongoDB Atlas Account

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free" and sign up for a free account
3. Verify your email address

### Step 2: Create a Cluster

1. After logging in, click "Build a Database"
2. Choose the **FREE** tier (M0 Sandbox)
3. Select a cloud provider and region (choose closest to your users)
4. Click "Create Cluster"
5. Wait 3-5 minutes for the cluster to be created

### Step 3: Create Database User

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter a username (e.g., `predictduel-admin`)
5. Generate a secure password (click "Autogenerate Secure Password" and **SAVE IT**)
6. Set user privileges to "Atlas Admin" (for development) or "Read and write to any database"
7. Click "Add User"

### Step 4: Whitelist IP Address

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Note**: For production, only allow specific IPs
4. Click "Confirm"

### Step 5: Get Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "5.5 or later"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
6. Replace `<password>` with your database user password
7. Replace `<dbname>` with your database name (e.g., `predictduel`)

**Example connection string:**
```
mongodb+srv://predictduel-admin:yourpassword@cluster0.xxxxx.mongodb.net/predictduel?retryWrites=true&w=majority
```

---

## Local MongoDB Setup

If you prefer to run MongoDB locally:

### Step 1: Install MongoDB

**Windows:**
1. Download MongoDB Community Server from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Complete" installation
4. Install MongoDB as a Windows Service (recommended)

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Step 2: Verify Installation

```bash
mongod --version
```

### Step 3: Connection String

For local MongoDB, use:
```
mongodb://localhost:27017/predictduel
```

---

## Environment Variables

Create or update your `.env.local` file in the project root:

```env
# MongoDB Connection String
# For Atlas (Cloud):
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/predictduel?retryWrites=true&w=majority

# For Local MongoDB:
# MONGODB_URI=mongodb://localhost:27017/predictduel

# Privy App ID (if not already set)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
```

**Important:**
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Replace `username`, `password`, and cluster details with your actual values
- The database name (`predictduel`) will be created automatically

---

## Database Models

The application includes the following MongoDB models:

### 1. User Model (`models/User.ts`)
Stores user profiles and statistics.

**Fields:**
- `privyId`: Unique Privy authentication ID
- `walletAddress`: Solana wallet address
- `username`: Display name
- `stats`: Wins, losses, earnings, win rate, streaks
- `achievements`: Array of achievement IDs
- `favoriteCategories`: User's preferred prediction categories

**Indexes:**
- `privyId` (unique)
- `walletAddress`
- `stats.totalEarned` (for leaderboard)
- `stats.winRate`
- `stats.currentStreak`

### 2. Prediction Model (`models/Prediction.ts`)
Stores all prediction duels.

**Fields:**
- `creator`: User who created the prediction
- `question`: The prediction question
- `category`: Crypto, Weather, Sports, etc.
- `type`: Public pool or direct challenge
- `stake`: SOL amount required to participate
- `deadline`: When the prediction resolves
- `status`: pending, active, resolving, resolved, cancelled
- `outcome`: Final result (yes/no)
- `participants`: Array of users who participated
- `poolSize`: Total SOL in the pool
- `resolutionData`: Context-specific resolution info

**Indexes:**
- `status` + `deadline` (for active predictions)
- `creator` + `createdAt` (user's predictions)
- `category` + `status` (category filtering)
- `question` (text search)

### 3. Achievement Model (`models/Achievement.ts`)
Stores achievement definitions.

**Fields:**
- `name`: Achievement name
- `description`: What it's for
- `icon`: Emoji or icon identifier
- `rarity`: common, rare, epic, legendary
- `requirement`: What's needed to earn it
- `reward`: Optional reward details

### 4. Notification Model (`models/Notification.ts`)
Stores user notifications.

**Fields:**
- `user`: Recipient user ID
- `type`: win, challenge, reminder, achievement, system
- `title`: Notification title
- `message`: Notification message
- `read`: Whether user has seen it
- `actionUrl`: Where to navigate when clicked
- `relatedPrediction`: Related prediction ID (optional)
- `relatedUser`: Related user ID (optional)

**Indexes:**
- `user` + `read` + `createdAt` (for unread notifications)

---

## Testing the Connection

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Test Health Endpoint

Open your browser and navigate to:
```
http://localhost:3000/api/health
```

You should see:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

If you see `"database": "disconnected"`, check:
1. Your `.env.local` file has the correct `MONGODB_URI`
2. MongoDB Atlas cluster is running (if using Atlas)
3. Local MongoDB service is running (if using local)
4. IP address is whitelisted (for Atlas)
5. Database user credentials are correct

---

## Usage Examples

### Example 1: Create a User

```typescript
// app/api/users/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    
    const { privyId, walletAddress, username } = await req.json()
    
    const user = await User.create({
      privyId,
      walletAddress,
      username,
      stats: {
        wins: 0,
        losses: 0,
        totalEarned: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
    })
    
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
```

### Example 2: Get User Profile

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const user = await User.findById(params.id)
      .populate('achievements')
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}
```

### Example 3: Create a Prediction

```typescript
// app/api/predictions/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Prediction from '@/models/Prediction'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    
    const { creatorId, question, category, stake, deadline, type } = await req.json()
    
    // Verify creator exists
    const creator = await User.findById(creatorId)
    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }
    
    const prediction = await Prediction.create({
      creator: creatorId,
      question,
      category,
      stake,
      deadline: new Date(deadline),
      type: type || 'public',
      status: 'pending',
      poolSize: stake, // Creator's stake
      yesCount: 0,
      noCount: 0,
      participants: [],
    })
    
    return NextResponse.json({ prediction }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create prediction' },
      { status: 500 }
    )
  }
}
```

### Example 4: Get Active Predictions

```typescript
// app/api/predictions/active/route.ts
import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Prediction from '@/models/Prediction'

export async function GET() {
  try {
    await connectDB()
    
    const predictions = await Prediction.find({
      status: 'active',
      deadline: { $gt: new Date() },
    })
      .populate('creator', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(20)
    
    return NextResponse.json({ predictions })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    )
  }
}
```

---

## Database Connection Pattern

The connection is handled automatically via `lib/mongodb.ts`:

1. **Connection Caching**: Uses global variable to cache connection across hot reloads
2. **Automatic Reconnection**: Handles reconnection automatically
3. **Error Handling**: Throws clear errors if connection fails

**Usage in API Routes:**
```typescript
import connectDB from '@/lib/mongodb'

export async function GET() {
  await connectDB() // Connect to database
  // Your database operations here
}
```

---

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use strong passwords** for database users
3. **Restrict IP access** in production (don't use 0.0.0.0/0)
4. **Use environment-specific databases** (dev, staging, prod)
5. **Regular backups** - MongoDB Atlas provides automatic backups
6. **Monitor connection limits** - Free tier has connection limits

---

## Troubleshooting

### Connection Timeout
- Check your internet connection
- Verify MongoDB Atlas cluster is running
- Check IP whitelist settings

### Authentication Failed
- Verify username and password in connection string
- Check database user permissions

### Database Not Found
- MongoDB will create the database automatically on first write
- Verify the database name in connection string

### Too Many Connections
- Free tier has connection limits
- Ensure you're using connection caching (already implemented)
- Close unused connections

---

## Next Steps

1. ✅ Set up MongoDB Atlas or local MongoDB
2. ✅ Add `MONGODB_URI` to `.env.local`
3. ✅ Test connection with `/api/health`
4. ✅ Create API routes for your features
5. ✅ Seed initial data (achievements, etc.)

For questions or issues, check the MongoDB documentation or Next.js API routes documentation.

