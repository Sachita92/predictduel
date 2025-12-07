/**
 * Solana Claim Winnings Helper
 * 
 * Client-side utilities for claiming winnings from resolved prediction markets on Solana
 */

'use client'

import { Connection, PublicKey } from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import { PredictDuelClient } from '../solana-program/client/sdk'
import { createAnchorWallet } from './solana-market'

// Program ID - deployed to devnet
const PROGRAM_ID = new PublicKey('4HJaxVtdUwNYxqbURcNbsaEKR7qtdd75hLajJMsD5wUY')

// RPC endpoint
const RPC_ENDPOINT = 'https://api.devnet.solana.com'

/**
 * Load IDL for browser environment
 */
async function loadIDL(): Promise<any> {
  try {
    const response = await fetch('/idl/predict_duel.json')
    if (!response.ok) {
      throw new Error(`Failed to fetch IDL: ${response.status} ${response.statusText}`)
    }
    return await response.json()
  } catch (fetchError) {
    console.error('Failed to load IDL:', fetchError)
    throw new Error(
      'IDL not found. Please ensure solana-program/target/idl/predict_duel.json exists and ' +
      'is copied to public/idl/predict_duel.json. Error: ' + (fetchError as Error).message
    )
  }
}

/**
 * Initialize PredictDuel client for claiming winnings
 */
async function initializeClient(provider: any): Promise<PredictDuelClient> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed')
  const wallet = createAnchorWallet(provider)
  const idl = await loadIDL()
  
  return new PredictDuelClient(connection, wallet, PROGRAM_ID, idl)
}

/**
 * Claim winnings from a resolved prediction market
 * 
 * @param provider - Solana wallet provider (from window.solana or Privy)
 * @param claimData - Claim data
 * @returns Transaction signature
 */
export async function claimWinningsOnChain(
  provider: any,
  claimData: {
    marketPda: string // Market PDA address
  }
): Promise<{ signature: string }> {
  try {
    // Validate inputs
    if (!claimData.marketPda) {
      throw new Error('Market PDA is required')
    }
    
    // Initialize client
    const client = await initializeClient(provider)
    
    // Convert market PDA string to PublicKey
    const marketPda = new PublicKey(claimData.marketPda)
    
    // Claim winnings on-chain
    const signature = await client.claimWinnings(marketPda)
    
    return { signature }
  } catch (error) {
    console.error('Error claiming winnings on-chain:', error)
    throw error instanceof Error 
      ? error 
      : new Error('Failed to claim winnings on-chain')
  }
}

