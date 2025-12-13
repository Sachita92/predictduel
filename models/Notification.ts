import mongoose, { Schema, Document, Model } from 'mongoose'

export interface INotification extends Document {
  user: mongoose.Types.ObjectId // User who receives the notification
  type: 'win' | 'challenge' | 'reminder' | 'achievement' | 'system' | 'bet' | 'duel_created' | 'duel_resolved'
  title: string
  message: string
  read: boolean
  actionUrl?: string // URL to navigate when clicked
  relatedPrediction?: mongoose.Types.ObjectId
  relatedUser?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['win', 'challenge', 'reminder', 'achievement', 'system', 'bet', 'duel_created', 'duel_resolved'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: {
      type: String,
    },
    relatedPrediction: {
      type: Schema.Types.ObjectId,
      ref: 'Prediction',
    },
    relatedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
)

// Index for unread notifications
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 })

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)

export default Notification

