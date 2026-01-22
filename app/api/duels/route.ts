import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import mongoose from 'mongoose'
import User from '@/models/User'
import Duel from '@/models/Duel'

/**
 * API Route to Get All Public Duels
 * 
 * Returns a list of all public duels that users can participate in
 */
export async function GET(req: NextRequest) {
  try {
    // Connect to the database
    await connectDB()
    
    // User model is imported at the top of the file, which registers it with mongoose
    // The model registration happens when the module is loaded, so it should be available

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'active' // active, pending, all
    const category = searchParams.get('category') // optional filter
    const search = searchParams.get('search') // search query for question, category, or creator
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')
    const privyId = searchParams.get('privyId') // optional: check if this user has participated

    // Build query
    const query: any = {
      type: 'public', // Only show public duels
    }

    // Filter by status
    if (status !== 'all') {
      if (status === 'active') {
        // Active means pending or active status, and deadline hasn't passed
        query.status = { $in: ['pending', 'active'] }
        query.deadline = { $gt: new Date() }
      } else if (status === 'resolved') {
        // Resolved duels - show completed duels
        query.status = 'resolved'
      } else {
        query.status = status
      }
    }

    // Filter by category if provided
    if (category) {
      query.category = category
    }

    // Search functionality - search in question, category, or creator username
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i') // Case-insensitive search
      
      // Search in question or category
      query.$or = [
        { question: searchRegex },
        { category: searchRegex },
      ]
      
      // Also search in creator username if we need to populate creator
      // We'll handle this after populating creator
    }

    // Fetch duels with creator information
    let queryBuilder = Duel.find(query)
      .populate('creator', 'username avatar walletAddress privyId')
    
    // If privyId is provided, also populate participants to check participation
    if (privyId) {
      queryBuilder = queryBuilder.populate('participants.user', 'walletAddress privyId')
    }
    
    let duels = await queryBuilder
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit * 2) // Fetch more if searching (we'll filter by creator username)
      .skip(skip)
      .lean() // Convert to plain objects for better performance

    // If searching, also filter by creator username
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase()
      duels = duels.filter((duel: any) => {
        const creatorUsername = duel.creator?.username?.toLowerCase() || ''
        return (
          duel.question.toLowerCase().includes(searchLower) ||
          duel.category.toLowerCase().includes(searchLower) ||
          creatorUsername.includes(searchLower)
        )
      })
      // Apply limit after filtering
      duels = duels.slice(0, limit)
    }

    // Get user info if privyId is provided to check participation
    let currentUser: any = null
    if (privyId) {
      currentUser = await User.findOne({ privyId }).lean()
    }

    // Format the response
    const formattedDuels = duels.map((duel: any) => {
      // Check if current user has participated in this duel
      let hasParticipated = false
      if (currentUser && duel.participants && duel.participants.length > 0) {
        hasParticipated = duel.participants.some((p: any) => {
          // Check if participant's user ID matches current user's ID
          const participantUserId = p.user?._id?.toString() || p.user?.toString()
          if (participantUserId === currentUser._id.toString()) {
            return true
          }
          // Also check by wallet address if available
          if (currentUser.walletAddress && p.user?.walletAddress) {
            return p.user.walletAddress.toLowerCase() === currentUser.walletAddress.toLowerCase()
          }
          return false
        })
      }

      return {
        id: duel._id.toString(),
        question: duel.question,
        category: duel.category,
        stake: duel.stake,
        deadline: duel.deadline,
        status: duel.status,
        outcome: duel.outcome || null,
        poolSize: duel.poolSize,
        yesCount: duel.yesCount,
        noCount: duel.noCount,
        marketPda: duel.marketPda || null,
        creator: {
          id: duel.creator?._id?.toString() || '',
          username: duel.creator?.username || 'Unknown',
          avatar: duel.creator?.avatar || '',
          walletAddress: duel.creator?.walletAddress || '',
          privyId: (duel.creator as any)?.privyId || '',
        },
        participants: duel.participants?.length || 0,
        hasParticipated: hasParticipated, // Add flag for current user's participation
        createdAt: duel.createdAt,
      }
    })

    return NextResponse.json(
      {
        success: true,
        duels: formattedDuels,
        count: formattedDuels.length,
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching duels:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch duels',
      },
      { status: 500 }
    )
  }
}

