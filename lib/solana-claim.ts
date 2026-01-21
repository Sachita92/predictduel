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
import { sendTransactionWithRetry } from './solana-transaction-wrapper'

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
    
    // Get connection from the client's provider (accessing private field via bracket notation)
    const connection = (client as any).provider?.connection || await getSolanaConnectionWithFallback('confirmed')
    
    // Claim winnings on-chain with transaction wrapper for retry logic and "already processed" handling
    const signature = await sendTransactionWithRetry(
      async () => {
        return await client.claimWinnings(marketPda)
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
        connection: connection,
        onRetry: (attempt, error) => {
          console.warn(`⚠️ Retrying claim winnings (attempt ${attempt}/3):`, error?.message || String(error))
        },
      }
    )
    
    return { signature }
  } catch (error) {
    console.error('Error claiming winnings on-chain:', error)
    
    // Check if transaction was already processed or winnings already claimed
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('already been processed') || 
        errorMessage.includes('already processed') ||
        errorMessage.includes('AlreadyClaimed') ||
        errorMessage.includes('6008')) {
      // Transaction succeeded or already claimed, return a placeholder signature
      return { signature: 'already_processed' }
    }
    
    throw error instanceof Error 
      ? error 
      : new Error('Failed to claim winnings on-chain')
  }
}

