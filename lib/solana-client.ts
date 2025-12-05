/**
 * Solana Client Helper
 * 
 * This file provides utilities to initialize and use the PredictDuel Solana SDK
 * with Privy wallet integration
 */

import { Connection, PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { PredictDuelClient, MarketCategory, MarketType } from '../solana-program/client/sdk'
import { User } from '@privy-io/react-auth'

// Program ID - deployed to devnet
const PROGRAM_ID = new PublicKey('4HJaxVtdUwNYxqbURcNbsaEKR7qtdd75hLajJMsD5wUY')

// RPC endpoints
const RPC_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://localhost:8899',
}

/**
 * Get Solana connection for the specified network
 */
export function getSolanaConnection(network: 'mainnet' | 'devnet' | 'testnet' | 'localnet' = 'devnet'): Connection {
  return new Connection(RPC_ENDPOINTS[network], 'confirmed')
}

/**
 * Initialize PredictDuel client from Privy wallet
 * 
 * Note: This requires the user to have a Solana wallet connected via Privy
 * The wallet must be accessible through Privy's wallet adapter
 */
export async function initializePredictDuelClient(
  user: User | null | undefined,
  network: 'mainnet' | 'devnet' | 'testnet' | 'localnet' = 'devnet'
): Promise<PredictDuelClient | null> {
  if (!user) {
    console.error('User not provided')
    return null
  }

  try {
    // Get Solana wallet from Privy
    // Privy provides wallet access through their SDK
    const connection = getSolanaConnection(network)
    
    // For now, we'll need to get the wallet adapter from Privy
    // This is a placeholder - actual implementation depends on Privy's Solana wallet adapter
    // You may need to use @privy-io/react-auth's useWallets hook or similar
    
    // TODO: Implement actual Privy Solana wallet adapter integration
    // This is a simplified version - you'll need to adapt based on Privy's actual API
    
    console.warn('Solana wallet adapter integration needed - using placeholder')
    return null
    
  } catch (error) {
    console.error('Error initializing PredictDuel client:', error)
    return null
  }
}

/**
 * Map frontend category to SDK MarketCategory enum
 */
export function mapCategoryToMarketCategory(category: string): MarketCategory {
  const categoryMap: Record<string, MarketCategory> = {
    crypto: MarketCategory.Crypto,
    weather: MarketCategory.Weather,
    sports: MarketCategory.Sports,
    meme: MarketCategory.Meme,
    local: MarketCategory.Local,
    other: MarketCategory.Other,
  }
  
  return categoryMap[category.toLowerCase()] || MarketCategory.Other
}

/**
 * Map frontend type to SDK MarketType enum
 */
export function mapTypeToMarketType(type: 'public' | 'friend'): MarketType {
  return type === 'friend' ? MarketType.Challenge : MarketType.Public
}

/**
 * Convert SOL amount to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * anchor.web3.LAMPORTS_PER_SOL)
}

/**
 * Convert lamports to SOL amount
 */
export function lamportsToSol(lamports: number): number {
  return lamports / anchor.web3.LAMPORTS_PER_SOL
}

