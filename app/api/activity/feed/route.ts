import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'
import User from '@/models/User'

/**
 * API Route to Get Activity Feed for Ticker
 * 
 * Returns recent activity events formatted for the live ticker
 * Also returns aggregate stats for the stats banner
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const activities: any[] = []

    // 1. Get recent wins (resolved duels where users won)
    const recentWins = await Duel.find({
      status: 'resolved',
      outcome: { $in: ['yes', 'no'] },
      'participants.won': true,
    })
      .populate('participants.user', 'username')
      .populate('creator', 'username')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()

    for (const duel of recentWins) {
      const winners = (duel.participants || []).filter((p: any) => p.won)
      for (const winner of winners) {
        const winnerUser = winner.user as any
        // Check if user is populated and has username property
        const username = winnerUser && typeof winnerUser === 'object' && 'username' in winnerUser 
          ? (winnerUser as { username: string }).username 
          : null
        if (username && winner.payout) {
          activities.push({
            type: 'win',
            emoji: '🔥',
            message: `@${username} just won ${winner.payout.toFixed(2)} SOL predicting "${duel.question.substring(0, 40)}${duel.question.length > 40 ? '...' : ''}"!`,
            timestamp: duel.updatedAt || duel.createdAt,
          })
        }
      }
    }

    // 2. Get recent duels created
    const recentDuels = await Duel.find({
      type: 'public',
      status: { $in: ['pending', 'active'] },
    })
      .populate('creator', 'username')
      .sort({ createdAt: -1 })
      .limit(Math.floor(limit / 2))
      .lean()

    for (const duel of recentDuels) {
      const creator = duel.creator as any
      if (creator?.username) {
        activities.push({
          type: 'duel_created',
          emoji: '⚡',
          message: `@${creator.username} created a new duel: "${duel.question.substring(0, 50)}${duel.question.length > 50 ? '...' : ''}"`,
          timestamp: duel.createdAt,
        })
      }
    }

    // 3. Get users with high streaks
    const highStreakUsers = await User.find({
      'stats.currentStreak': { $gte: 5 },
    })
      .select('username stats')
      .sort({ 'stats.currentStreak': -1, updatedAt: -1 })
      .limit(Math.floor(limit / 3))
      .lean()

    for (const user of highStreakUsers) {
      if (user.stats?.currentStreak >= 5) {
        activities.push({
          type: 'streak',
          emoji: '🎯',
          message: `@${user.username} is on a ${user.stats.currentStreak}-win streak!`,
          timestamp: user.updatedAt || user.createdAt,
        })
      }
    }

    // 4. Get top earners (recently)
    const topEarners = await User.find({
      'stats.totalEarned': { $gt: 0 },
    })
      .select('username stats')
      .sort({ 'stats.totalEarned': -1, updatedAt: -1 })
      .limit(Math.floor(limit / 4))
      .lean()

    for (const user of topEarners) {
      if (user.stats?.totalEarned > 1) {
        activities.push({
          type: 'top_earner',
          emoji: '💰',
          message: `@${user.username} has earned ${user.stats.totalEarned.toFixed(2)} SOL total!`,
          timestamp: user.updatedAt || user.createdAt,
        })
      }
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      return timeB - timeA
    })

    // Limit to requested number
    const limitedActivities = activities.slice(0, limit)

    // Get aggregate stats for the banner
    const totalDuels = await Duel.countDocuments({})
    const totalWon = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$stats.totalEarned' },
        },
      },
    ])
    const totalWonAmount = totalWon[0]?.total || 0

    return NextResponse.json(
      {
        success: true,
        activities: limitedActivities,
        count: limitedActivities.length,
        stats: {
          totalDuels,
          totalWon: totalWonAmount,
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch activity feed',
      },
      { status: 500 }
    )
  }
}

