import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'
import User from '@/models/User'

/**
 * API Route to Get a Single Duel by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()

    // Handle both sync and async params (Next.js 14 vs 15)
    const resolvedParams = typeof params === 'object' && 'then' in params
      ? await params
      : params

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

