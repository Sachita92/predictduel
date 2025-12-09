import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

/**
 * API Route to Get Leaderboard
 * 
 * Returns users sorted by various stats (wins, totalEarned, winRate, streak)
 * Supports time filters: today, week, all-time
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'all-time' // today, week, all-time
    const sortBy = searchParams.get('sortBy') || 'totalEarned' // totalEarned, wins, winRate, currentStreak
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')
    const privyId = searchParams.get('privyId') // Optional: to get current user's rank

    // Calculate date filters
    let dateFilter: Date | null = null
    if (period === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dateFilter = today
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      dateFilter = weekAgo
    }

    // Build sort object based on sortBy parameter
    let sortObject: any = {}
    if (sortBy === 'totalEarned') {
      sortObject = { 'stats.totalEarned': -1, 'stats.winRate': -1, 'stats.wins': -1 }
    } else if (sortBy === 'wins') {
      sortObject = { 'stats.wins': -1, 'stats.winRate': -1, 'stats.totalEarned': -1 }
    } else if (sortBy === 'winRate') {
      sortObject = { 'stats.winRate': -1, 'stats.wins': -1, 'stats.totalEarned': -1 }
    } else if (sortBy === 'currentStreak') {
      sortObject = { 'stats.currentStreak': -1, 'stats.wins': -1, 'stats.totalEarned': -1 }
    } else {
      sortObject = { 'stats.totalEarned': -1, 'stats.winRate': -1, 'stats.wins': -1 }
    }

    // Build query - filter users who have at least some activity
    const query: any = {
      $or: [
        { 'stats.wins': { $gt: 0 } },
        { 'stats.losses': { $gt: 0 } },
        { 'stats.totalEarned': { $gt: 0 } },
      ],
    }

    // Note: For time-based filtering (today/week), we would need to track
    // when wins/losses occurred. For now, we'll return all-time stats.
    // This can be enhanced later with a separate stats history collection.

    // Fetch users sorted by stats
    const users = await User.find(query)
      .select('username avatar walletAddress privyId stats createdAt')
      .sort(sortObject)
      .limit(limit)
      .skip(skip)
      .lean()

    // Format the response
    const formattedUsers = users.map((user: any, index: number) => ({
      rank: skip + index + 1,
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar || '',
      walletAddress: user.walletAddress || '',
      privyId: user.privyId || '',
      wins: user.stats?.wins || 0,
      losses: user.stats?.losses || 0,
      winRate: user.stats?.winRate || 0,
      totalWon: user.stats?.totalEarned || 0,
      streak: user.stats?.currentStreak || 0,
      bestStreak: user.stats?.bestStreak || 0,
    }))

    // Get current user's rank if privyId is provided
    let userRank: number | null = null
    if (privyId) {
      const currentUser = await User.findOne({ privyId }).lean()
      if (currentUser) {
        // Count users with better stats
        const rankQuery: any = {}
        if (sortBy === 'totalEarned') {
          rankQuery.$or = [
            { 'stats.totalEarned': { $gt: currentUser.stats?.totalEarned || 0 } },
            {
              'stats.totalEarned': currentUser.stats?.totalEarned || 0,
              'stats.winRate': { $gt: currentUser.stats?.winRate || 0 },
            },
            {
              'stats.totalEarned': currentUser.stats?.totalEarned || 0,
              'stats.winRate': currentUser.stats?.winRate || 0,
              'stats.wins': { $gt: currentUser.stats?.wins || 0 },
            },
          ]
        } else if (sortBy === 'wins') {
          rankQuery.$or = [
            { 'stats.wins': { $gt: currentUser.stats?.wins || 0 } },
            {
              'stats.wins': currentUser.stats?.wins || 0,
              'stats.winRate': { $gt: currentUser.stats?.winRate || 0 },
            },
          ]
        } else if (sortBy === 'winRate') {
          rankQuery.$or = [
            { 'stats.winRate': { $gt: currentUser.stats?.winRate || 0 } },
            {
              'stats.winRate': currentUser.stats?.winRate || 0,
              'stats.wins': { $gt: currentUser.stats?.wins || 0 },
            },
          ]
        } else if (sortBy === 'currentStreak') {
          rankQuery.$or = [
            { 'stats.currentStreak': { $gt: currentUser.stats?.currentStreak || 0 } },
            {
              'stats.currentStreak': currentUser.stats?.currentStreak || 0,
              'stats.wins': { $gt: currentUser.stats?.wins || 0 },
            },
          ]
        }

        const usersAbove = await User.countDocuments(rankQuery)
        userRank = usersAbove + 1
      }
    }

    return NextResponse.json(
      {
        success: true,
        leaderboard: formattedUsers,
        count: formattedUsers.length,
        period,
        sortBy,
        userRank,
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch leaderboard',
      },
      { status: 500 }
    )
  }
}

