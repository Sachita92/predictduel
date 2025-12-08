import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

/**
 * API Route to Search Users
 * 
 * Returns a list of users matching the search query (username)
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') // search query for username
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')

    if (!search || !search.trim()) {
      return NextResponse.json(
        {
          success: true,
          users: [],
          count: 0,
        },
        { status: 200 }
      )
    }

    // Search users by username (case-insensitive)
    const searchRegex = new RegExp(search.trim(), 'i')
    
    const users = await User.find({
      username: searchRegex,
    })
      .select('username avatar walletAddress stats privyId')
      .sort({ 'stats.totalEarned': -1, createdAt: -1 }) // Sort by earnings, then by creation date
      .limit(limit)
      .skip(skip)
      .lean()

    // Format the response
    const formattedUsers = users.map((user: any) => ({
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar || '',
      walletAddress: user.walletAddress || '',
      privyId: user.privyId || '',
      stats: {
        wins: user.stats?.wins || 0,
        losses: user.stats?.losses || 0,
        totalEarned: user.stats?.totalEarned || 0,
        winRate: user.stats?.winRate || 0,
        currentStreak: user.stats?.currentStreak || 0,
        bestStreak: user.stats?.bestStreak || 0,
      },
    }))

    return NextResponse.json(
      {
        success: true,
        users: formattedUsers,
        count: formattedUsers.length,
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to search users',
      },
      { status: 500 }
    )
  }
}

