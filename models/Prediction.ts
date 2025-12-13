import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPrediction extends Document {
  creator: mongoose.Types.ObjectId // User ID
  question: string
  category: 'Crypto' | 'Weather' | 'Sports' | 'Meme' | 'Local' | 'Other'
  type: 'public' | 'challenge' // Public pool or direct challenge
  challengedUser?: mongoose.Types.ObjectId // If type is 'challenge'
  stake: number // SOL amount
  deadline: Date
  status: 'pending' | 'active' | 'resolving' | 'resolved' | 'cancelled'
  outcome?: 'yes' | 'no' // Final outcome
  participants: {
    user: mongoose.Types.ObjectId
    prediction: 'yes' | 'no'
    stake: number
    won: boolean
    payout?: number
  }[]
  poolSize: number // Total SOL in pool
  yesCount: number
  noCount: number
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

const PredictionSchema: Schema = new Schema(
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
      enum: ['public', 'challenge'],
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
    collection: 'predictions',
  }
)

// Indexes for common queries
PredictionSchema.index({ status: 1, deadline: 1 }) // Active predictions
PredictionSchema.index({ creator: 1, createdAt: -1 }) // User's predictions
PredictionSchema.index({ category: 1, status: 1 }) // Category filtering
PredictionSchema.index({ createdAt: -1 }) // Recent predictions

const Prediction: Model<IPrediction> =
  mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', PredictionSchema)

export default Prediction

