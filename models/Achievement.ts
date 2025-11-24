import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAchievement extends Document {
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  requirement: {
    type: 'wins' | 'streak' | 'earnings' | 'predictions' | 'category'
    value: number
    category?: string
  }
  reward?: {
    type: 'badge' | 'title' | 'bonus'
    value: string | number
  }
  createdAt: Date
}

const AchievementSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true,
    },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      required: true,
      default: 'common',
    },
    requirement: {
      type: {
        type: String,
        enum: ['wins', 'streak', 'earnings', 'predictions', 'category'],
        required: true,
      },
      value: {
        type: Number,
        required: true,
      },
      category: {
        type: String,
      },
    },
    reward: {
      type: {
        type: String,
        enum: ['badge', 'title', 'bonus'],
      },
      value: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
)

const Achievement: Model<IAchievement> =
  mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema)

export default Achievement

