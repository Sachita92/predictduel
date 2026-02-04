import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import ProbabilityHistory from '@/models/ProbabilityHistory'
import Duel from '@/models/Duel'

/**
 * API Route to Get Probability History for a Duel
 * 
 * Returns historical probability snapshots for a duel
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    // Resolve params (Next.js 16+ uses Promise)
    const resolvedParams = await params
    const duelId = resolvedParams.id

    if (!duelId) {
      return NextResponse.json(
        { error: 'Duel ID is required' },
        { status: 400 }
      )
    }

    // Verify duel exists
    const duel = await Duel.findById(duelId)
    if (!duel) {
      return NextResponse.json(
        { error: 'Duel not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100') // Default to 100 data points
    const hours = parseInt(searchParams.get('hours') || '24') // Default to last 24 hours

    // Calculate time range
    const startTime = new Date()
    startTime.setHours(startTime.getHours() - hours)

    // Fetch probability history
    const history = await ProbabilityHistory.find({
      duel: duelId,
      timestamp: { $gte: startTime },
    })
      .sort({ timestamp: 1 }) // Sort by timestamp ascending (oldest first)
      .limit(limit)
      .lean()

    // Format the response
    const formattedHistory = history.map((entry) => ({
      time: new Date(entry.timestamp).toISOString(),
      timestamp: entry.timestamp,
      yesProbability: entry.yesProbability,
      noProbability: entry.noProbability,
      yesStake: entry.yesStake,
      noStake: entry.noStake,
      poolSize: entry.poolSize,
      yesCount: entry.yesCount,
      noCount: entry.noCount,
    }))

    // Also include current probability if no history exists or to show latest
    const currentTotalStake = duel.poolSize
    const currentYesStake = duel.participants
      .filter((p: any) => p.prediction === 'yes')
      .reduce((sum: number, p: any) => sum + p.stake, 0)
    const currentNoStake = duel.participants
      .filter((p: any) => p.prediction === 'no')
      .reduce((sum: number, p: any) => sum + p.stake, 0)
    
    const currentYesProbability = currentTotalStake > 0 ? (currentYesStake / currentTotalStake) * 100 : 50
    const currentNoProbability = currentTotalStake > 0 ? (currentNoStake / currentTotalStake) * 100 : 50

    // Add current state as the latest point if it's different from the last history entry
    const lastEntry = formattedHistory[formattedHistory.length - 1]
    const shouldAddCurrent = !lastEntry || 
      Math.abs(lastEntry.yesProbability - currentYesProbability) > 0.1 ||
      Math.abs(lastEntry.noProbability - currentNoProbability) > 0.1

    if (shouldAddCurrent) {
      formattedHistory.push({
        time: new Date().toISOString(),
        timestamp: new Date(),
        yesProbability: currentYesProbability,
        noProbability: currentNoProbability,
        yesStake: currentYesStake,
        noStake: currentNoStake,
        poolSize: currentTotalStake,
        yesCount: duel.yesCount,
        noCount: duel.noCount,
      })
    }

    return NextResponse.json(
      {
        success: true,
        history: formattedHistory,
        current: {
          yesProbability: currentYesProbability,
          noProbability: currentNoProbability,
          yesStake: currentYesStake,
          noStake: currentNoStake,
          poolSize: currentTotalStake,
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error fetching probability history:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch probability history',
      },
      { status: 500 }
    )
  }
}
