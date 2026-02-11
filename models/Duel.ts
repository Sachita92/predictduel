import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDuel extends Document {
  creator: mongoose.Types.ObjectId // User ID
  question: string
  category: 'Crypto' | 'Weather' | 'Sports' | 'Meme' | 'Local' | 'Other'
  type: 'public' | 'friend' // Public pool or direct challenge to friend
  challengedUser?: mongoose.Types.ObjectId // If type is 'friend'
  stake: number // Stake amount in native currency (SOL, ETH, etc. - based on APP_BLOCKCHAIN config)
  deadline: Date
  status: 'pending' | 'active' | 'resolving' | 'resolved' | 'cancelled'
  outcome?: 'yes' | 'no' // Final outcome
  participants: {
    user: mongoose.Types.ObjectId
    prediction: 'yes' | 'no'
    stake: number
    won: boolean
    payout?: number
    claimed?: boolean
  }[]
  poolSize: number // Total amount in pool (in native currency)
  yesCount: number
  noCount: number
  marketPda?: string // On-chain market address (Solana PDA)
  transactionSignature?: string // Transaction signature for on-chain creation
  options?: string[] // Optional options for the duel (e.g., ["Option 1", "Option 2"])
  resolutionData?: {
    // For crypto predictions
    targetPrice?: number
    actualPrice?: number
    // For weather predictions
    location?: string
    condition?: string
    // For sports predictions
    team1?: string
    team2?: string
    score?: string
  }
  createdAt: Date
  updatedAt: Date
}

const DuelSchema: Schema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      maxlength: 200,
      index: 'text', // For text search
    },
    category: {
      type: String,
      enum: ['Crypto', 'Weather', 'Sports', 'Meme', 'Local', 'Other'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['public', 'friend'],
      required: true,
      default: 'public',
    },
    challengedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    stake: {
      type: Number,
      required: true,
      min: 0.01,
    },
    deadline: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'resolving', 'resolved', 'cancelled'],
      default: 'pending',
      index: true,
    },
    outcome: {
      type: String,
      enum: ['yes', 'no'],
    },
    participants: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        prediction: {
          type: String,
          enum: ['yes', 'no'],
          required: true,
        },
        stake: {
          type: Number,
          required: true,
        },
        won: {
          type: Boolean,
          default: false,
        },
        payout: {
          type: Number,
        },
        claimed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    poolSize: {
      type: Number,
      default: 0,
    },
    yesCount: {
      type: Number,
      default: 0,
    },
    noCount: {
      type: Number,
      default: 0,
    },
    marketPda: {
      type: String,
      index: true, // Index for quick lookups
    },
    transactionSignature: {
      type: String,
    },
    options: {
      type: [String],
      default: [],
    },
    resolutionData: {
      targetPrice: Number,
      actualPrice: Number,
      location: String,
      condition: String,
      team1: String,
      team2: String,
      score: String,
    },
  },
  {
    timestamps: true,
    collection: 'duels', // Explicitly set collection name
  }
)

// Indexes for common queries
DuelSchema.index({ status: 1, deadline: 1 }) // Active duels
DuelSchema.index({ creator: 1, createdAt: -1 }) // User's duels
DuelSchema.index({ category: 1, status: 1 }) // Category filtering
DuelSchema.index({ createdAt: -1 }) // Recent duels

const Duel: Model<IDuel> =
  mongoose.models.Duel || mongoose.model<IDuel>('Duel', DuelSchema)

export default Duel

