import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'
import User from '@/models/User'

/**
 * API Route to Place a Bet on a Duel
 * 
 * This updates MongoDB after the on-chain transaction is completed
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectDB()

    // Handle both sync and async params
    const resolvedParams = typeof params === 'object' && 'then' in params
      ? await params
      : params

    const duelId = resolvedParams.id
    const body = await req.json()
    const { 
      privyId, 
      prediction, // 'yes' or 'no'
      stake, 
      transactionSignature,
      participantPda 
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

    if (!prediction || !['yes', 'no'].includes(prediction.toLowerCase())) {
      return NextResponse.json(
        { error: 'Prediction must be "yes" or "no"' },
        { status: 400 }
      )
    }

    if (!stake || stake <= 0) {
      return NextResponse.json(
        { error: 'Valid stake amount is required' },
        { status: 400 }
      )
    }

    if (!transactionSignature) {
      return NextResponse.json(
        { error: 'Transaction signature is required' },
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

    // Find duel
    const duel = await Duel.findById(duelId)
    if (!duel) {
      return NextResponse.json(
        { error: 'Duel not found' },
        { status: 404 }
      )
    }

    // Check if duel is still active
    if (duel.status !== 'pending' && duel.status !== 'active') {
      return NextResponse.json(
        { error: 'Duel is not accepting bets' },
        { status: 400 }
      )
    }

    // Check if deadline hasn't passed
    if (new Date() >= new Date(duel.deadline)) {
      return NextResponse.json(
        { error: 'Duel deadline has passed' },
        { status: 400 }
      )
    }

    // Check if user is the creator (they can't bet on their own duel)
    if (duel.creator.toString() === user._id.toString()) {
      return NextResponse.json(
        { error: 'You cannot bet on your own duel' },
        { status: 400 }
      )
    }

    // Check if user already participated
    const existingParticipation = duel.participants.find(
      (p: any) => p.user.toString() === user._id.toString()
    )

    if (existingParticipation) {
      // User already participated, update their stake
      existingParticipation.stake += parseFloat(stake)
      
      // Update pool and counts
      duel.poolSize += parseFloat(stake)
      if (prediction.toLowerCase() === 'yes') {
        duel.yesCount += 1
      } else {
        duel.noCount += 1
      }
    } else {
      // New participant
      duel.participants.push({
        user: user._id,
        prediction: prediction.toLowerCase(),
        stake: parseFloat(stake),
        won: false,
      })

      // Update pool and counts
      duel.poolSize += parseFloat(stake)
      if (prediction.toLowerCase() === 'yes') {
        duel.yesCount += 1
      } else {
        duel.noCount += 1
      }

      // Activate duel if it was pending
      if (duel.status === 'pending') {
        duel.status = 'active'
      }
    }

    // Save updated duel
    await duel.save()

    return NextResponse.json(
      {
        success: true,
        message: 'Bet placed successfully',
        duel: {
          id: duel._id.toString(),
          poolSize: duel.poolSize,
          yesCount: duel.yesCount,
          noCount: duel.noCount,
          participantsCount: duel.participants.length,
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error placing bet:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to place bet',
      },
      { status: 500 }
    )
  }
}

