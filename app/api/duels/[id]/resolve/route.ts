import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'
import User from '@/models/User'
import Notification from '@/models/Notification'

/**
 * API Route to Resolve a Duel
 * 
 * Only the creator can resolve a duel after the deadline has passed.
 * This updates MongoDB after the on-chain transaction is completed.
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
      outcome, // 'yes' or 'no'
      transactionSignature 
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

    if (!outcome || !['yes', 'no'].includes(outcome.toLowerCase())) {
      return NextResponse.json(
        { error: 'Outcome must be "yes" or "no"' },
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

    // Verify user is the creator
    if (duel.creator.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'Only the creator can resolve this duel' },
        { status: 403 }
      )
    }

    // Check if duel is already resolved
    if (duel.status === 'resolved') {
      return NextResponse.json(
        { error: 'Duel is already resolved' },
        { status: 400 }
      )
    }

    // Check if deadline has passed
    const now = new Date()
    if (now < new Date(duel.deadline)) {
      return NextResponse.json(
        { error: 'Cannot resolve duel before deadline' },
        { status: 400 }
      )
    }

    // Check if duel is active
    if (duel.status !== 'active' && duel.status !== 'pending') {
      return NextResponse.json(
        { error: 'Duel must be active or pending to resolve' },
        { status: 400 }
      )
    }

    const finalOutcome = outcome.toLowerCase() as 'yes' | 'no'

    // Update duel status and outcome
    duel.status = 'resolved'
    duel.outcome = finalOutcome

    // Calculate winners and payouts
    const winningPool = finalOutcome === 'yes' 
      ? duel.participants.filter(p => p.prediction === 'yes').reduce((sum, p) => sum + p.stake, 0)
      : duel.participants.filter(p => p.prediction === 'no').reduce((sum, p) => sum + p.stake, 0)

    // Update participants with win/loss status and calculate payouts
    const participantUpdates: Promise<void>[] = []
    const userStatsUpdates: Map<string, { won: boolean; payout: number }> = new Map()

    for (const participant of duel.participants) {
      const won = participant.prediction === finalOutcome
      participant.won = won

      // Calculate payout for winners (proportional share of total pool)
      if (won && winningPool > 0) {
        const participantShare = participant.stake / winningPool
        participant.payout = duel.poolSize * participantShare
        participant.payout = Math.round(participant.payout * 100) / 100 // Round to 2 decimals
      } else {
        participant.payout = 0
      }

      // Track user stats updates
      const userId = participant.user.toString()
      if (!userStatsUpdates.has(userId)) {
        userStatsUpdates.set(userId, { won, payout: participant.payout })
      } else {
        const existing = userStatsUpdates.get(userId)!
        existing.won = existing.won || won
        existing.payout += participant.payout
      }
    }

    // Save updated duel
    await duel.save()

    // Update user stats for all participants
    const userUpdatePromises = Array.from(userStatsUpdates.entries()).map(async ([userId, { won, payout }]) => {
      const participantUser = await User.findById(userId)
      if (participantUser) {
        if (won) {
          participantUser.stats.wins += 1
          participantUser.stats.totalEarned += payout
        } else {
          participantUser.stats.losses += 1
        }

        // Update win rate
        const totalGames = participantUser.stats.wins + participantUser.stats.losses
        participantUser.stats.winRate = totalGames > 0 
          ? (participantUser.stats.wins / totalGames) * 100 
          : 0

        // Update streaks
        if (won) {
          participantUser.stats.currentStreak += 1
          if (participantUser.stats.currentStreak > participantUser.stats.bestStreak) {
            participantUser.stats.bestStreak = participantUser.stats.currentStreak
          }
        } else {
          participantUser.stats.currentStreak = 0
        }

        await participantUser.save()
      }
    })

    await Promise.all(userUpdatePromises)

    // Create notifications for all participants about the duel resolution
    try {
      const notificationPromises = duel.participants.map(async (participant: any) => {
        const participantUser = await User.findById(participant.user)
        if (!participantUser) return

        const won = participant.won
        const payout = participant.payout || 0

        // Create notification based on win/loss
        if (won) {
          await Notification.create({
            user: participant.user,
            type: 'win',
            title: 'You Won! 🎉',
            message: `You won ${payout.toFixed(2)} SOL in "${duel.question}"! The outcome was ${finalOutcome.toUpperCase()}.`,
            read: false,
            actionUrl: `/duel/${duelId}`,
            relatedPrediction: duel._id,
          })
        } else {
          await Notification.create({
            user: participant.user,
            type: 'system',
            title: 'Duel Resolved',
            message: `The duel "${duel.question}" has been resolved. The outcome was ${finalOutcome.toUpperCase()}. Better luck next time!`,
            read: false,
            actionUrl: `/duel/${duelId}`,
            relatedPrediction: duel._id,
          })
        }
      })

      // Also notify the creator that their duel was resolved
      const creatorUser = await User.findById(duel.creator)
      if (creatorUser) {
        await Notification.create({
          user: duel.creator,
          type: 'duel_resolved',
          title: 'Your Duel Has Been Resolved',
          message: `Your duel "${duel.question}" has been resolved. The outcome was ${finalOutcome.toUpperCase()}.`,
          read: false,
          actionUrl: `/duel/${duelId}`,
          relatedPrediction: duel._id,
        })
      }

      // Create notifications in parallel (don't fail if some fail)
      Promise.all(notificationPromises).catch((error) => {
        console.error('Error creating resolution notifications:', error)
        // Don't fail the resolution if notifications fail
      })
    } catch (notifError) {
      console.error('Error setting up resolution notifications:', notifError)
      // Don't fail the resolution if notifications fail
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Duel resolved successfully',
        duel: {
          id: duel._id.toString(),
          status: duel.status,
          outcome: duel.outcome,
          participants: duel.participants.map((p: any) => ({
            id: p._id?.toString() || '',
            won: p.won,
            payout: p.payout,
          })),
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error resolving duel:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to resolve duel',
      },
      { status: 500 }
    )
  }
}

