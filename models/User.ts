import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  privyId: string // Privy user ID
  walletAddress?: string // Blockchain wallet address (format depends on configured blockchain - Solana: Base58, Ethereum: 0x...)
  name?: string // User's real name (optional but recommended)
  username: string
  email?: string // User's email address (optional)
  avatar?: string
  bio?: string
  stats: {
    wins: number
    losses: number
    totalEarned: number // Total earned in native currency (SOL, ETH, etc. - based on APP_BLOCKCHAIN config)
    winRate: number
    currentStreak: number
    bestStreak: number
  }
  achievements: mongoose.Types.ObjectId[]
  favoriteCategories: string[]
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    privyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    walletAddress: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 200,
    },
    stats: {
      wins: {
        type: Number,
        default: 0,
      },
      losses: {
        type: Number,
        default: 0,
      },
      totalEarned: {
        type: Number,
        default: 0,
      },
      winRate: {
        type: Number,
        default: 0,
      },
      currentStreak: {
        type: Number,
        default: 0,
      },
      bestStreak: {
        type: Number,
        default: 0,
      },
    },
    achievements: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Achievement',
      },
    ],
    favoriteCategories: [
      {
        type: String,
        enum: ['Crypto', 'Weather', 'Sports', 'Meme', 'Local', 'Other'],
      },
    ],
  },
  {
    timestamps: true,
    collection: 'users', // Explicitly set collection name to 'users'
  }
)

// Index for leaderboard queries
UserSchema.index({ 'stats.totalEarned': -1 })
UserSchema.index({ 'stats.winRate': -1 })
UserSchema.index({ 'stats.currentStreak': -1 })

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User

