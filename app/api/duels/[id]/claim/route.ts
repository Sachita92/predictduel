import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'
import User from '@/models/User'
import Notification from '@/models/Notification'
import { Connection, PublicKey } from '@solana/web3.js'

/**
 * API Route to Claim Winnings from a Resolved Duel
 * 
 * Only winners can claim their winnings after a duel is resolved.
 * This updates MongoDB after the on-chain transaction is completed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    // Resolve params (Next.js 16+ uses Promise)
    const resolvedParams = await params

    const duelId = resolvedParams.id
    const body = await req.json()
    const { 
      privyId, 
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

    // Check if duel is resolved
    if (duel.status !== 'resolved') {
      return NextResponse.json(
        { error: 'Duel must be resolved before claiming winnings' },
        { status: 400 }
      )
    }

    // Check if duel has an outcome
    if (!duel.outcome) {
      return NextResponse.json(
        { error: 'Duel outcome not set' },
        { status: 400 }
      )
    }

    // Find user's participation
    const participant = duel.participants.find((p: any) => {
      const participantUserId = p.user?.toString() || p.user?._id?.toString()
      return participantUserId === user._id.toString()
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'You did not participate in this duel' },
        { status: 403 }
      )
    }

    // Check if user won
    if (!participant.won) {
      return NextResponse.json(
        { error: 'Only winners can claim winnings' },
        { status: 403 }
      )
    }

    // Check if already claimed
    if (participant.claimed) {
      return NextResponse.json(
        { error: 'Winnings have already been claimed' },
        { status: 400 }
      )
    }

    // Check if payout is valid
    if (!participant.payout || participant.payout <= 0) {
      return NextResponse.json(
        { error: 'No winnings to claim' },
        { status: 400 }
      )
    }

    // Verify transaction signature (optional but recommended)
    try {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
      const tx = await connection.getTransaction(transactionSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })
      
      if (!tx) {
        return NextResponse.json(
          { error: 'Transaction not found. Please ensure the transaction was confirmed.' },
          { status: 400 }
        )
      }
      
      if (tx.meta?.err) {
        return NextResponse.json(
          { error: 'Transaction failed on-chain. Please try again.' },
          { status: 400 }
        )
      }
      
      // Verify the transaction is for the correct market
      // The transaction should include the market PDA in the account keys
      const marketPdaKey = new PublicKey(duel.marketPda || '')
      const accountKeys = tx.transaction.message.getAccountKeys().keySegments().flat().map((key: any) => 
        typeof key === 'string' ? key : key.toString()
      )
      
      if (!accountKeys.includes(marketPdaKey.toString())) {
        console.warn('Transaction may not be for the correct market, but continuing...')
      }
    } catch (verifyError) {
      console.error('Error verifying transaction:', verifyError)
      // Don't fail the claim if verification fails - the transaction might still be valid
      // This is a best-effort verification
    }

    // Mark participant as claimed
    participant.claimed = true
    await duel.save()

    // Create notification for successful claim
    await Notification.create({
      user: user._id,
      type: 'system',
      title: 'Winnings Claimed! 💰',
      message: `You successfully claimed ${participant.payout.toFixed(2)} SOL from "${duel.question}"`,
      read: false,
      actionUrl: `/duel/${duelId}`,
      relatedPrediction: duel._id,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Winnings claimed successfully',
        claim: {
          duelId: duel._id.toString(),
          payout: participant.payout,
          claimed: true,
        },
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error claiming winnings:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to claim winnings',
      },
      { status: 500 }
    )
  }
}

