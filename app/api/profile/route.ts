import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Achievement from '@/models/Achievement'
import Duel from '@/models/Duel'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const privyId = searchParams.get('privyId')
    const walletAddress = searchParams.get('walletAddress')

    if (!privyId && !walletAddress) {
      return NextResponse.json(
        { error: 'privyId or walletAddress is required' },
        { status: 400 }
      )
    }

    // Find user by privyId or walletAddress
    const query = privyId ? { privyId } : { walletAddress }
    
    // Try to find user without populate first to avoid errors
    const user = await User.findOne(query)

    if (!user) {
      // Return a default profile structure for new users
      return NextResponse.json({
        user: null,
        message: 'User not found. Please create a profile.',
      })
    }

    // Safely populate achievements
    let achievements: any[] = []
    try {
      if (user.achievements && user.achievements.length > 0) {
        const populatedUser = await User.findOne(query).populate('achievements')
        achievements = populatedUser?.achievements || []
      }
    } catch (error) {
      console.error('Error populating achievements:', error)
      // Continue without achievements
    }

    // Get recent duels for activity feed - show all duels user participated in (not just resolved)
    let recentDuels: any[] = []
    try {
      recentDuels = await Duel.find({
        'participants.user': user._id,
      })
        .sort({ updatedAt: -1 })
        .limit(20)
        .populate('creator', 'username')
        .populate('participants.user', 'username')
    } catch (error) {
      console.error('Error fetching duels:', error)
      // Continue without duels
    }

    // Calculate category stats
    let categoryStats: any[] = []
    try {
      categoryStats = await calculateCategoryStats(user._id)
    } catch (error) {
      console.error('Error calculating category stats:', error)
      // Continue without stats
    }

    // Get duels created by the user
    let createdDuels: any[] = []
    let totalCreatedCount = 0
    try {
      // Get total count
      totalCreatedCount = await Duel.countDocuments({
        creator: user._id,
      })
      
      // Get recent created duels
      createdDuels = await Duel.find({
        creator: user._id,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('participants.user', 'username')
        .lean()
    } catch (error) {
      console.error('Error fetching created duels:', error)
      // Continue without created duels
    }

    return NextResponse.json({
      user: {
        id: user._id,
        privyId: user.privyId,
        walletAddress: user.walletAddress,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        stats: user.stats,
        achievements: achievements,
        favoriteCategories: user.favoriteCategories,
        createdAt: user.createdAt,
      },
      recentActivity: recentDuels.map((duel: any) => {
        // Find the user's participation
        const userParticipation = duel.participants.find(
          (p: any) => p.user._id.toString() === user._id.toString()
        )
        // Find opponent (other participant or creator if no other participants)
        const opponent = duel.participants.find(
          (p: any) => p.user._id.toString() !== user._id.toString()
        ) || { user: duel.creator }

        return {
          id: duel._id.toString(),
          opponent: opponent?.user?.username || duel.creator?.username || 'Unknown',
          prediction: duel.question,
          outcome: duel.status === 'resolved' 
            ? (userParticipation?.won ? 'Won' : 'Lost')
            : duel.status === 'active' 
            ? 'Active'
            : duel.status === 'pending'
            ? 'Pending'
            : duel.status,
          amount: userParticipation?.stake || 0,
          date: duel.updatedAt || duel.createdAt,
          status: duel.status,
          category: duel.category,
        }
      }),
      categoryStats,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// Helper function to calculate category statistics
async function calculateCategoryStats(userId: any) {
  try {
    const duels = await Duel.find({
      'participants.user': userId,
      status: 'resolved',
    })

    const categoryCount: Record<string, number> = {}
    let totalDuels = 0

    duels.forEach((duel: any) => {
      if (duel.category) {
        categoryCount[duel.category] = (categoryCount[duel.category] || 0) + 1
        totalDuels++
      }
    })

    // Convert to percentages
    const categoryStats = Object.entries(categoryCount).map(
      ([category, count]) => ({
        label: category,
        value: totalDuels > 0 ? Math.round((count / totalDuels) * 100) : 0,
        color:
          category === 'Crypto'
            ? 'bg-primary-from'
            : category === 'Weather'
            ? 'bg-primary-to'
            : category === 'Sports'
            ? 'bg-success'
            : 'bg-accent',
      })
    )

    // Sort by value descending
    categoryStats.sort((a, b) => b.value - a.value)

    return categoryStats
  } catch (error) {
    console.error('Error calculating category stats:', error)
    return []
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { privyId, name, username, avatar, bio } = body

    if (!privyId) {
      return NextResponse.json(
        { error: 'privyId is required' },
        { status: 400 }
      )
    }

    // Find and update user
    const user = await User.findOne({ privyId })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update fields if provided
    if (name !== undefined) user.name = name
    if (username !== undefined) user.username = username
    if (avatar !== undefined) user.avatar = avatar
    if (bio !== undefined) user.bio = bio

    await user.save()

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
      },
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { privyId, walletAddress, username } = body

    if (!privyId || !username) {
      return NextResponse.json(
        { error: 'privyId and username are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ privyId })
    if (existingUser) {
      // Return the existing user instead of an error
      return NextResponse.json(
        {
          success: true,
          user: {
            id: existingUser._id,
            privyId: existingUser.privyId,
            walletAddress: existingUser.walletAddress,
            name: existingUser.name,
            username: existingUser.username,
            avatar: existingUser.avatar,
            bio: existingUser.bio,
            stats: existingUser.stats,
            achievements: existingUser.achievements || [],
            favoriteCategories: existingUser.favoriteCategories || [],
            createdAt: existingUser.createdAt,
          },
        },
        { status: 200 }
      )
    }

    // Create new user
    const newUser = new User({
      privyId,
      walletAddress,
      username,
      stats: {
        wins: 0,
        losses: 0,
        totalEarned: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
      achievements: [],
      favoriteCategories: [],
    })

    await newUser.save()

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser._id,
          privyId: newUser.privyId,
          walletAddress: newUser.walletAddress,
          name: newUser.name,
          username: newUser.username,
          avatar: newUser.avatar,
          bio: newUser.bio,
          stats: newUser.stats,
          achievements: newUser.achievements || [],
          favoriteCategories: newUser.favoriteCategories || [],
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}

