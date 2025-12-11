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
import { getSolanaConnectionWithFallback } from './solana-rpc'

// Program ID - deployed to devnet
const PROGRAM_ID = new PublicKey('8aMfhVJxNZeGjgDg38XwdpMqDdrsvM42RPjF67DQ8VVe')

/**
 * Load IDL for browser environment
 * Uses bundled IDL from lib/idl.ts which is included in the build
 */
async function loadIDL(): Promise<any> {
  try {
    // Import the IDL from the bundled module
    const idlModule = await import('./idl')
    return idlModule.default
  } catch (importError) {
    // Fallback to fetch if import fails
    try {
      const response = await fetch('/idl/predict_duel.json')
      if (!response.ok) {
        throw new Error(`Failed to fetch IDL: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (fetchError) {
      console.error('Failed to load IDL:', { importError, fetchError })
      throw new Error(
        'IDL not found. Error: ' + (importError instanceof Error ? importError.message : String(importError))
      )
    }
  }
}

/**
 * Initialize PredictDuel client for claiming winnings
 */
async function initializeClient(provider: any): Promise<PredictDuelClient> {
  // Use fallback RPC connection to handle endpoint failures
  const connection = await getSolanaConnectionWithFallback('confirmed')
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

