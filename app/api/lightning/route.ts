import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'

/**
 * API Route to Get Resolved Duels for Lightning Round
 * 
 * Returns resolved duels with outcomes that can be used for the lightning game
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Fetch resolved duels with outcomes
    // These are duels that have been resolved and have a known outcome
    const duels = await Duel.find({
      status: 'resolved',
      outcome: { $in: ['yes', 'no'] }, // Must have a clear outcome
    })
      .select('question category outcome')
      .sort({ updatedAt: -1 }) // Most recently resolved first
      .limit(limit)
      .lean()

    // Format the response
    const formattedDuels = duels.map((duel: any) => ({
      id: duel._id.toString(),
      question: duel.question,
      category: duel.category,
      outcome: duel.outcome, // 'yes' or 'no'
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
    console.error('Error fetching lightning duels:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch lightning duels',
      },
      { status: 500 }
    )
  }
}

