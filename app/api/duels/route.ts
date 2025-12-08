import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'
import User from '@/models/User'

/**
 * API Route to Get All Public Duels
 * 
 * Returns a list of all public duels that users can participate in
 */
export async function GET(req: NextRequest) {
  try {
    // Connect to the database
    await connectDB()

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'active' // active, pending, all
    const category = searchParams.get('category') // optional filter
    const search = searchParams.get('search') // search query for question, category, or creator
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

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
    let duels = await Duel.find(query)
      .populate('creator', 'username avatar walletAddress privyId')
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

    // Format the response
    const formattedDuels = duels.map((duel: any) => ({
      id: duel._id.toString(),
      question: duel.question,
      category: duel.category,
      stake: duel.stake,
      deadline: duel.deadline,
      status: duel.status,
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
      createdAt: duel.createdAt,
    }))

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

