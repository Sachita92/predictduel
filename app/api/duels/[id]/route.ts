import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'
import User from '@/models/User'

/**
 * API Route to Get a Single Duel by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    // Resolve params (Next.js 16+ uses Promise)
    const resolvedParams = await params
    const duelId = resolvedParams.id

    if (!duelId) {
      return NextResponse.json(
        { error: 'Duel ID is required' },
        { status: 400 }
      )
    }

    // Fetch duel with populated creator and participants
    const duel = await Duel.findById(duelId)
      .populate('creator', 'username avatar walletAddress privyId')
      .populate('participants.user', 'username avatar walletAddress')
      .lean()

    if (!duel) {
      return NextResponse.json(
        { error: 'Duel not found' },
        { status: 404 }
      )
    }

    // Format the response
    const creator = duel.creator as any
    const formattedDuel = {
      id: duel._id.toString(),
      question: duel.question,
      category: duel.category,
      stake: duel.stake,
      deadline: duel.deadline,
      status: duel.status,
      outcome: duel.outcome,
      poolSize: duel.poolSize,
      yesCount: duel.yesCount,
      noCount: duel.noCount,
      type: duel.type,
      marketPda: duel.marketPda,
      transactionSignature: duel.transactionSignature,
      creator: {
        id: creator?._id?.toString() || creator?.id?.toString() || '',
        username: creator?.username || 'Unknown',
        avatar: creator?.avatar || '',
        walletAddress: creator?.walletAddress || '',
        privyId: creator?.privyId || '',
      },
      participants: (duel.participants || []).map((p: any) => ({
        id: p._id?.toString() || '',
        user: {
          id: p.user?._id?.toString() || '',
          username: p.user?.username || 'Unknown',
          avatar: p.user?.avatar || '',
          walletAddress: p.user?.walletAddress || '',
        },
        prediction: p.prediction,
        stake: p.stake,
        won: p.won || false,
        payout: p.payout || null,
        claimed: p.claimed || false,
      })),
      createdAt: duel.createdAt,
      updatedAt: duel.updatedAt,
    }

    return NextResponse.json(
      {
        success: true,
        duel: formattedDuel,
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching duel:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch duel',
      },
      { status: 500 }
    )
  }
}

/**
 * API Route to Update a Duel
 * 
 * Only the creator can update their duel (stake, deadline, etc.)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    // Resolve params (Next.js 16+ uses Promise)
    const resolvedParams = await params
    const duelId = resolvedParams.id
    const body = await req.json()
    const { 
      privyId, 
      stake,
      deadline
    } = body

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

    // Find user
    const user = await User.findOne({ privyId })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find duel
    const duel = await Duel.findById(duelId)
    if (!duel) {
      return NextResponse.json(
        { error: 'Duel not found' },
        { status: 404 }
      )
    }

    // Verify user is the creator
    if (duel.creator.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Only the creator can update this duel' },
        { status: 403 }
      )
    }

    // Can only edit if duel is pending or active and no participants
    if (duel.status !== 'pending' && duel.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot edit duel that is not pending or active' },
        { status: 400 }
      )
    }

    if (duel.participants.length > 0) {
      return NextResponse.json(
        { error: 'Cannot edit duel that has participants' },
        { status: 400 }
      )
    }

    // Update fields
    if (stake !== undefined) {
      duel.stake = parseFloat(stake)
      duel.poolSize = parseFloat(stake) // Update pool size if stake changes
    }

    if (deadline) {
      const newDeadline = new Date(deadline)
      if (newDeadline <= new Date()) {
        return NextResponse.json(
          { error: 'Deadline must be in the future' },
          { status: 400 }
        )
      }
      duel.deadline = newDeadline
    }

    await duel.save()

    return NextResponse.json(
      {
        success: true,
        message: 'Duel updated successfully',
        duel: {
          id: duel._id.toString(),
          stake: duel.stake,
          deadline: duel.deadline,
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error updating duel:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update duel',
      },
      { status: 500 }
    )
  }
}

/**
 * API Route to Delete a Duel
 * 
 * Only the creator can delete their duel, and only if it has no participants
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    // Resolve params (Next.js 16+ uses Promise)
    const resolvedParams = await params
    const duelId = resolvedParams.id
    const { searchParams } = new URL(req.url)
    const privyId = searchParams.get('privyId')

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

    // Find user
    const user = await User.findOne({ privyId })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find duel
    const duel = await Duel.findById(duelId)
    if (!duel) {
      return NextResponse.json(
        { error: 'Duel not found' },
        { status: 404 }
      )
    }

    // Verify user is the creator
    if (duel.creator.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Only the creator can delete this duel' },
        { status: 403 }
      )
    }

    // Can only delete if no participants
    if (duel.participants.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete duel that has participants' },
        { status: 400 }
      )
    }

    // Delete the duel
    await Duel.findByIdAndDelete(duelId)

    return NextResponse.json(
      {
        success: true,
        message: 'Duel deleted successfully',
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting duel:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete duel',
      },
      { status: 500 }
    )
  }
}

