import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IProbabilityHistory extends Document {
  duel: mongoose.Types.ObjectId // Reference to Duel
  yesStake: number
  noStake: number
  yesProbability: number // 0-100
  noProbability: number // 0-100
  poolSize: number
  yesCount: number
  noCount: number
  timestamp: Date
}

const ProbabilityHistorySchema: Schema = new Schema(
  {
    duel: {
      type: Schema.Types.ObjectId,
      ref: 'Duel',
      required: true,
      index: true,
    },
    yesStake: {
      type: Number,
      required: true,
    },
    noStake: {
      type: Number,
      required: true,
    },
    yesProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    noProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    poolSize: {
      type: Number,
      required: true,
    },
    yesCount: {
      type: Number,
      required: true,
      default: 0,
    },
    noCount: {
      type: Number,
      required: true,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'probability_history',
  }
)

// Index for efficient queries
ProbabilityHistorySchema.index({ duel: 1, timestamp: -1 }) // Get history for a duel, sorted by time

const ProbabilityHistory: Model<IProbabilityHistory> =
  mongoose.models.ProbabilityHistory || mongoose.model<IProbabilityHistory>('ProbabilityHistory', ProbabilityHistorySchema)

export default ProbabilityHistory
