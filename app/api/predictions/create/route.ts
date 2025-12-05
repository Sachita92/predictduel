import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Duel from '@/models/Duel'
import User from '@/models/User'

/**
 * API Route to Create a New Duel
 * 
 * This is like a mailbox - when the form submits, it sends data here.
 * We then save it to the duels collection in MongoDB.
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: Connect to the database
    // Think of this like opening a filing cabinet
    try {
      await connectDB()
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 500 }
      )
    }

    // Step 2: Get the data from the form
    // This is like reading a letter someone sent you
    let body
    try {
      body = await req.json()
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError)
      return NextResponse.json(
        { error: 'Invalid request data. Please try again.' },
        { status: 400 }
      )
    }
    const { 
      creatorId,      // Who is creating this duel
      question,       // What they're predicting (e.g., "Will BTC hit $100K?")
      category,       // What type (crypto, weather, etc. - lowercase from form)
      stake,          // How much SOL they're betting
      deadline,       // When does this prediction end
      type,           // Is it public or a challenge to a friend?
      walletAddress,  // Wallet address from Privy
      marketPda,      // On-chain market address (from Solana)
      transactionSignature // Transaction signature (from Solana)
    } = body

    // Step 3: Validate required fields
    if (!creatorId || !question || !category || !stake || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Step 4: Map category from lowercase (form) to capitalized (database)
    const categoryMap: Record<string, string> = {
      'crypto': 'Crypto',
      'weather': 'Weather',
      'sports': 'Sports',
      'meme': 'Meme',
      'local': 'Local',
      'other': 'Other'
    }
    const mappedCategory = categoryMap[category.toLowerCase()] || 'Other'

    // Step 5: Map type from form ('friend' or 'public') to database format
    const duelType = type === 'friend' ? 'friend' : 'public'

    // Step 6: Make sure the person creating this exists in our database
    // Like checking if someone has an account before they can post
    // First, try to find user by Privy ID (since we're using Privy for auth)
    let creator = await User.findOne({ privyId: creatorId })
    
    // If user doesn't exist, create them (first time user)
    if (!creator) {
      creator = await User.create({
        privyId: creatorId,
        walletAddress: walletAddress || undefined,
        username: `user_${creatorId.slice(0, 8)}`, // Temporary username
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
    }

    // Step 7: Create the duel and save it to the duels collection
    // This is like writing the duel on a piece of paper and filing it
    const duel = await Duel.create({
      creator: creator._id, // Use MongoDB _id, not Privy ID
      question: question.trim(),
      category: mappedCategory,
      stake: parseFloat(stake), // Make sure it's a number
      deadline: new Date(deadline), // Convert to a date
      type: duelType,
      status: 'pending', // It starts as pending (waiting for people to join)
      poolSize: parseFloat(stake), // The creator's stake is the initial pool
      yesCount: 0, // No one has voted yet
      noCount: 0,
      participants: [], // No participants yet
      // Store on-chain data if provided
      ...(marketPda && { marketPda }),
      ...(transactionSignature && { transactionSignature }),
    })

    // Step 8: Send back a success message with the duel
    // Like sending a confirmation letter back
    return NextResponse.json(
      { 
        success: true, 
        prediction: {
          id: duel._id.toString(),
          question: duel.question,
          category: duel.category,
          status: duel.status,
        }
      },
      { status: 201 } // 201 means "created successfully"
    )

  } catch (error) {
    // If something goes wrong, send an error message
    // Like if the filing cabinet is locked or the paper is torn
    console.error('Error creating duel:', error)
    
    // Ensure we always return JSON, never HTML
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to create duel. Please try again.'
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined
      },
      { status: 500 } // 500 means "server error"
    )
  }
}

