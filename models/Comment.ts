import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IComment extends Document {
  duel: mongoose.Types.ObjectId // Duel ID
  user: mongoose.Types.ObjectId // User ID
  text: string
  createdAt: Date
  updatedAt: Date
}

const CommentSchema: Schema = new Schema(
  {
    duel: {
      type: Schema.Types.ObjectId,
      ref: 'Duel',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'comments',
  }
)

// Index for efficient queries
CommentSchema.index({ duel: 1, createdAt: -1 })

const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema)

export default Comment
