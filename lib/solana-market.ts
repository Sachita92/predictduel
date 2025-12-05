/**
 * Solana Market Creation Helper
 * 
 * Client-side utilities for creating prediction markets on Solana
 * This handles the on-chain transaction before saving to MongoDB
 */

'use client'

import { Connection, PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
// Import SDK from solana-program directory
// Note: You may need to adjust this path based on your project structure
import { PredictDuelClient, MarketCategory, MarketType } from '../solana-program/client/sdk'

// Program ID - deployed to devnet
const PROGRAM_ID = new PublicKey('4HJaxVtdUwNYxqbURcNbsaEKR7qtdd75hLajJMsD5wUY')

// RPC endpoint
const RPC_ENDPOINT = 'https://api.devnet.solana.com'


/**
 * Create Anchor wallet from Solana provider
 * Note: This creates a wallet adapter that works with Anchor
 */
export function createAnchorWallet(provider: any): anchor.Wallet {
  const publicKey = new PublicKey(provider.publicKey.toString())
  
  // Create a wallet object compatible with Anchor
  // The payer property might not be strictly needed for signing, but TypeScript requires it
  const wallet = {
    publicKey,
    signTransaction: async <T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction>(
      tx: T
    ): Promise<T> => {
      return await provider.signTransaction(tx) as T
    },
    signAllTransactions: async <T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> => {
      return await provider.signAllTransactions(txs) as T[]
    },
  } as anchor.Wallet
  
  return wallet
}

/**
 * Initialize PredictDuel client from Solana wallet provider
 */
export function initializeClient(provider: any): PredictDuelClient {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed')
  const wallet = createAnchorWallet(provider)
  
  return new PredictDuelClient(connection, wallet, PROGRAM_ID)
}

/**
 * Map frontend category to SDK MarketCategory
 */
export function mapCategory(category: string): MarketCategory {
  const map: Record<string, MarketCategory> = {
    crypto: MarketCategory.Crypto,
    weather: MarketCategory.Weather,
    sports: MarketCategory.Sports,
    meme: MarketCategory.Meme,
    local: MarketCategory.Local,
    other: MarketCategory.Other,
  }
  return map[category.toLowerCase()] || MarketCategory.Other
}

/**
 * Map frontend type to SDK MarketType
 */
export function mapType(type: 'public' | 'friend'): MarketType {
  return type === 'friend' ? MarketType.Challenge : MarketType.Public
}

/**
 * Create a prediction market on-chain
 * 
 * @param provider - Solana wallet provider (from window.solana or Privy)
 * @param formData - Market creation data
 * @returns Market PDA and transaction signature
 */
export async function createMarketOnChain(
  provider: any,
  formData: {
    question: string
    category: string
    stake: number
    deadline: Date
    type: 'public' | 'friend'
    marketIndex?: number // Optional: for tracking
  }
): Promise<{ marketPda: string; signature: string }> {
  try {
    // Initialize client
    const client = initializeClient(provider)
    
    // Convert SOL to lamports
    const stakeInLamports = PredictDuelClient.solToLamports(formData.stake)
    
    // Create market on-chain
    // Note: SDK expects deadline as Date object, it converts internally
    const { signature, marketPda } = await client.createMarket({
      marketIndex: formData.marketIndex || 1, // Market index for tracking
      question: formData.question,
      category: mapCategory(formData.category),
      stakeAmount: stakeInLamports,
      deadline: formData.deadline, // SDK expects Date, converts to timestamp internally
      marketType: mapType(formData.type),
    })
    
    return {
      marketPda: marketPda.toString(),
      signature,
    }
  } catch (error) {
    console.error('Error creating market on-chain:', error)
    throw error
  }
}

