import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Comment from '@/models/Comment'
import User from '@/models/User'
import Duel from '@/models/Duel'

/**
 * GET - Fetch all comments for a duel
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const resolvedParams = await params
    const duelId = resolvedParams.id

    if (!duelId) {
      return NextResponse.json(
        { error: 'Duel ID is required' },
        { status: 400 }
      )
    }

    // Verify duel exists
    const duel = await Duel.findById(duelId)
    if (!duel) {
      return NextResponse.json(
        { error: 'Duel not found' },
        { status: 404 }
      )
    }

    // Fetch comments with user info, sorted by newest first
    const comments = await Comment.find({ duel: duelId })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .lean()

    // Format comments
    const formattedComments = comments.map((comment: any) => ({
      id: comment._id.toString(),
      text: comment.text,
      createdAt: comment.createdAt,
      user: {
        id: comment.user._id.toString(),
        username: comment.user.username,
        avatar: comment.user.avatar,
      },
    }))

    return NextResponse.json({ comments: formattedComments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new comment on a duel
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const resolvedParams = await params
    const duelId = resolvedParams.id
    const body = await req.json()
    const { privyId, text } = body

    // Validate inputs
    if (!duelId) {
      return NextResponse.json(
        { error: 'Duel ID is required' },
        { status: 400 }
      )
    }

    if (!privyId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      )
    }

    if (text.trim().length > 500) {
      return NextResponse.json(
        { error: 'Comment must be 500 characters or less' },
        { status: 400 }
      )
    }

    // Find user
    const user = await User.findOne({ privyId })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify duel exists
    const duel = await Duel.findById(duelId)
    if (!duel) {
      return NextResponse.json(
        { error: 'Duel not found' },
        { status: 404 }
      )
    }

    // Create comment
    const comment = await Comment.create({
      duel: duelId,
      user: user._id,
      text: text.trim(),
    })

    // Populate user info for response
    await comment.populate('user', 'username avatar')

    return NextResponse.json({
      comment: {
        id: comment._id.toString(),
        text: comment.text,
        createdAt: comment.createdAt,
        user: {
          id: (comment.user as any)._id.toString(),
          username: (comment.user as any).username,
          avatar: (comment.user as any).avatar,
        },
      },
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
