# MongoDB Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up MongoDB Atlas (Free Cloud Database)

1. **Sign up** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a free cluster** (M0 Sandbox)
3. **Create database user:**
   - Go to "Database Access" → "Add New Database User"
   - Username: `predictduel-admin`
   - Password: Generate secure password (SAVE IT!)
4. **Whitelist IP:**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
5. **Get connection string:**
   - Go to "Database" → Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your password
   - Replace `<dbname>` with `predictduel`

### 3. Add to .env.local

Create `.env.local` in project root:
```env
MONGODB_URI=mongodb+srv://predictduel-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/predictduel?retryWrites=true&w=majority
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### 4. Test Connection

```bash
npm run dev
```

Visit: `http://localhost:3000/api/health`

Should show: `{"status":"ok","database":"connected"}`

---

## 📁 What Was Created

### Database Connection
- **`lib/mongodb.ts`** - Handles MongoDB connection with caching
- **`types/global.d.ts`** - TypeScript types for global mongoose cache

### Database Models
- **`models/User.ts`** - User profiles, stats, achievements
- **`models/Prediction.ts`** - Prediction duels and outcomes
- **`models/Achievement.ts`** - Achievement definitions
- **`models/Notification.ts`** - User notifications

### API Helpers
- **`lib/api-helpers.ts`** - Helper functions for API routes
- **`app/api/health/route.ts`** - Health check endpoint

### Scripts
- **`scripts/seed-achievements.ts`** - Seed initial achievements

---

## 📚 Full Documentation

See **`MONGODB_SETUP.md`** for complete documentation including:
- Detailed setup instructions
- Local MongoDB setup
- Model schemas explained
- Usage examples
- Troubleshooting

---

## ✅ Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Set up MongoDB Atlas
3. ✅ Add `MONGODB_URI` to `.env.local`
4. ✅ Test connection: Visit `/api/health`
5. ⏭️ Create API routes for your features
6. ⏭️ Seed achievements: `npx ts-node scripts/seed-achievements.ts`

---

## 🔍 Model Overview

### User Model
- Stores user profiles linked to Privy ID
- Tracks wins, losses, earnings, streaks
- Links to achievements

### Prediction Model
- Stores all prediction duels
- Tracks participants and outcomes
- Supports public pools and direct challenges

### Achievement Model
- Defines unlockable achievements
- Tracks requirements and rewards

### Notification Model
- Stores user notifications
- Supports different notification types

---

## 🛠️ Usage Example

```typescript
// app/api/predictions/route.ts
import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Prediction from '@/models/Prediction'

export async function GET() {
  await connectDB()
  const predictions = await Prediction.find({ status: 'active' })
  return NextResponse.json({ predictions })
}
```

---

## ❓ Troubleshooting

**Connection failed?**
- Check `.env.local` has correct `MONGODB_URI`
- Verify MongoDB Atlas cluster is running
- Check IP whitelist includes your IP
- Verify database user credentials

**Type errors?**
- Run `npm install` to install mongoose
- Restart TypeScript server in your IDE

---

For detailed help, see `MONGODB_SETUP.md`

