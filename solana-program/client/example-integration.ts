/**
 * Example Integration with PredictDuel Frontend
 * 
 * This file shows how to integrate the Solana smart contract with your Next.js frontend
 */

import { PredictDuelClient, MarketCategory, MarketType } from './sdk';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Program ID - Deployed to devnet
const PROGRAM_ID = new PublicKey('hLhVAG2CKKaFkueawfYQEMBetyQoyYtnPGdJQaj54xr');

// Solana RPC endpoints
const ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://localhost:8899',
};

/**
 * Initialize the PredictDuel client with user's wallet
 */
export function initializePredictDuelClient(
  wallet: any, // Privy wallet or Phantom wallet
  network: 'mainnet' | 'devnet' | 'testnet' | 'localnet' = 'devnet'
): PredictDuelClient {
  const connection = new Connection(ENDPOINTS[network], 'confirmed');
  const anchorWallet = new anchor.Wallet(wallet);
  
  return new PredictDuelClient(connection, anchorWallet, PROGRAM_ID);
}

/**
 * Create a prediction market from frontend form data
 */
export async function createPredictionMarket(
  client: PredictDuelClient,
  formData: {
    question: string;
    category: string; // 'crypto', 'weather', etc. (lowercase from form)
    stake: number; // SOL amount as decimal
    deadline: Date;
    type: 'public' | 'friend';
  }
) {
  try {
    // Map form category to enum
    const categoryMap: Record<string, MarketCategory> = {
      crypto: MarketCategory.Crypto,
      weather: MarketCategory.Weather,
      sports: MarketCategory.Sports,
      meme: MarketCategory.Meme,
      local: MarketCategory.Local,
      other: MarketCategory.Other,
    };

    const category = categoryMap[formData.category.toLowerCase()] || MarketCategory.Other;
    const marketType = formData.type === 'friend' ? MarketType.Challenge : MarketType.Public;

    // Convert SOL to lamports
    const stakeInLamports = PredictDuelClient.solToLamports(formData.stake);

    // Create market on-chain
    const { signature, marketPda } = await client.createMarket({
      question: formData.question,
      category,
      stakeAmount: stakeInLamports,
      deadline: formData.deadline,
      marketType,
    });

    console.log('Market created on-chain:', {
      signature,
      marketPda: marketPda.toString(),
    });

    return {
      success: true,
      marketPda: marketPda.toString(),
      signature,
    };
  } catch (error) {
    console.error('Error creating market on-chain:', error);
    throw error;
  }
}

/**
 * Place a bet on a prediction market
 */
export async function placeBetOnMarket(
  client: PredictDuelClient,
  marketPdaString: string,
  prediction: 'yes' | 'no',
  stakeAmount: number // SOL amount
) {
  try {
    const marketPda = new PublicKey(marketPdaString);
    const predictionBool = prediction === 'yes';
    const stakeInLamports = PredictDuelClient.solToLamports(stakeAmount);

    const { signature, participantPda } = await client.placeBet({
      marketPda,
      prediction: predictionBool,
      stakeAmount: stakeInLamports,
    });

    console.log('Bet placed:', {
      signature,
      participantPda: participantPda.toString(),
    });

    return {
      success: true,
      signature,
      participantPda: participantPda.toString(),
    };
  } catch (error) {
    console.error('Error placing bet:', error);
    throw error;
  }
}

/**
 * Resolve a market (only creator can do this)
 */
export async function resolveMarketOutcome(
  client: PredictDuelClient,
  marketPdaString: string,
  outcome: 'yes' | 'no'
) {
  try {
    const marketPda = new PublicKey(marketPdaString);
    const outcomeBool = outcome === 'yes';

    const signature = await client.resolveMarket(marketPda, outcomeBool);

    console.log('Market resolved:', { signature, outcome });

    return { success: true, signature };
  } catch (error) {
    console.error('Error resolving market:', error);
    throw error;
  }
}

/**
 * Claim winnings from a resolved market
 */
export async function claimMarketWinnings(
  client: PredictDuelClient,
  marketPdaString: string
) {
  try {
    const marketPda = new PublicKey(marketPdaString);
    const signature = await client.claimWinnings(marketPda);

    console.log('Winnings claimed:', { signature });

    return { success: true, signature };
  } catch (error) {
    console.error('Error claiming winnings:', error);
    throw error;
  }
}

/**
 * Get market details for display
 */
export async function getMarketDetails(
  client: PredictDuelClient,
  marketPdaString: string
) {
  try {
    const marketPda = new PublicKey(marketPdaString);
    const marketData = await client.getMarket(marketPda);

    return {
      creator: marketData.creator.toString(),
      question: marketData.question,
      category: marketData.category,
      stake: PredictDuelClient.lamportsToSol(marketData.stakeAmount),
      deadline: new Date(marketData.deadline * 1000),
      status: marketData.status,
      poolSize: PredictDuelClient.lamportsToSol(marketData.poolSize),
      yesCount: marketData.yesCount,
      noCount: marketData.noCount,
      totalParticipants: marketData.totalParticipants,
      outcome: marketData.outcome,
      createdAt: new Date(marketData.createdAt * 1000),
    };
  } catch (error) {
    console.error('Error fetching market details:', error);
    throw error;
  }
}

/**
 * Check if user has participated in a market
 */
export async function getUserParticipation(
  client: PredictDuelClient,
  marketPdaString: string,
  userPublicKey: string
) {
  try {
    const marketPda = new PublicKey(marketPdaString);
    const userPubkey = new PublicKey(userPublicKey);

    const participant = await client.getParticipant(marketPda, userPubkey);

    return {
      hasParticipated: true,
      prediction: participant.prediction ? 'yes' : 'no',
      stake: PredictDuelClient.lamportsToSol(participant.stake.toNumber()),
      claimed: participant.claimed,
    };
  } catch (error) {
    // Participant account doesn't exist
    return {
      hasParticipated: false,
      prediction: null,
      stake: 0,
      claimed: false,
    };
  }
}

/**
 * Example: Full workflow for creating and participating in a market
 */
export async function exampleWorkflow() {
  // 1. Initialize client (you'd get the wallet from Privy or Phantom)
  const wallet = Keypair.generate(); // In production, use actual wallet
  const client = initializePredictDuelClient(wallet, 'devnet');

  // 2. Create a market
  const createResult = await createPredictionMarket(client, {
    question: 'Will ETH reach $5,000 by end of Q1 2025?',
    category: 'crypto',
    stake: 0.1,
    deadline: new Date('2025-03-31'),
    type: 'public',
  });

  const marketPda = createResult.marketPda;

  // 3. Another user places a bet
  await placeBetOnMarket(client, marketPda, 'yes', 0.1);

  // 4. Get market details
  const marketDetails = await getMarketDetails(client, marketPda);
  console.log('Market details:', marketDetails);

  // 5. After deadline, creator resolves market
  await resolveMarketOutcome(client, marketPda, 'yes');

  // 6. Winner claims their winnings
  await claimMarketWinnings(client, marketPda);
}

/**
 * React Hook example for using in Next.js components
 */
export function useOnChainMarket() {
  // This is a simplified example - you'd integrate with React state
  
  const createMarket = async (formData: any) => {
    // Get wallet from Privy or your wallet provider
    const wallet = null; // Replace with actual wallet
    const client = initializePredictDuelClient(wallet, 'devnet');
    
    return await createPredictionMarket(client, formData);
  };

  const placeBet = async (marketPda: string, prediction: 'yes' | 'no', amount: number) => {
    const wallet = null; // Replace with actual wallet
    const client = initializePredictDuelClient(wallet, 'devnet');
    
    return await placeBetOnMarket(client, marketPda, prediction, amount);
  };

  return {
    createMarket,
    placeBet,
    // ... other functions
  };
}

/**
 * Sync on-chain data with MongoDB
 * 
 * After on-chain operations, you should update your MongoDB database
 * to keep the frontend fast and searchable
 */
export async function syncMarketToDatabase(
  marketPda: string,
  signature: string,
  userId: string
) {
  // Call your Next.js API route to store in MongoDB
  const response = await fetch('/api/duels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      marketPda,
      signature,
      userId,
      // ... other data
    }),
  });

  return await response.json();
}

