/**
 * Solana Market Resolution Helper
 * 
 * Client-side utilities for resolving prediction markets on Solana
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
 * Initialize PredictDuel client for resolving markets
 */
async function initializeClient(provider: any): Promise<PredictDuelClient> {
  // Use fallback RPC connection to handle endpoint failures
  const connection = await getSolanaConnectionWithFallback('confirmed')
  const wallet = createAnchorWallet(provider)
  const idl = await loadIDL()
  
  return new PredictDuelClient(connection, wallet, PROGRAM_ID, idl)
}

/**
 * Fetch market account to verify creator address
 */
export async function fetchMarketAccount(
  provider: any,
  marketPda: string
): Promise<{ creator: string } | null> {
  try {
    const client = await initializeClient(provider)
    const marketPubkey = new PublicKey(marketPda)
    
    // Use the client's fetchMarket method
    const marketAccount = await client.fetchMarket(marketPubkey)
    
    return {
      creator: marketAccount.creator.toString(),
    }
  } catch (error) {
    console.error('Error fetching market account:', error)
    return null
  }
}

/**
 * Resolve a prediction market
 * 
 * @param provider - Solana wallet provider (from window.solana or Privy)
 * @param resolveData - Resolution data
 * @returns Transaction signature
 */
export async function resolveMarketOnChain(
  provider: any,
  resolveData: {
    marketPda: string // Market PDA address
    outcome: boolean // true = YES, false = NO
  }
): Promise<{ signature: string }> {
  try {
    // Validate inputs
    if (!resolveData.marketPda) {
      throw new Error('Market PDA is required')
    }
    
    if (!provider.publicKey) {
      throw new Error('Wallet not connected. Please connect your wallet.')
    }
    
    // Initialize client
    const client = await initializeClient(provider)
    
    // Convert market PDA string to PublicKey
    const marketPda = new PublicKey(resolveData.marketPda)
    
    // Verify the creator address matches before attempting to resolve
    const connectedWalletAddress = provider.publicKey.toString()
    const marketAccount = await fetchMarketAccount(provider, resolveData.marketPda)
    
    if (marketAccount && marketAccount.creator !== connectedWalletAddress) {
      throw new Error(
        `Unauthorized: Only the creator can resolve this market. ` +
        `Market creator: ${marketAccount.creator.slice(0, 8)}...${marketAccount.creator.slice(-8)}, ` +
        `Connected wallet: ${connectedWalletAddress.slice(0, 8)}...${connectedWalletAddress.slice(-8)}. ` +
        `Please connect the wallet that was used to create this market.`
      )
    }
    
    // Get connection from the client's provider (accessing private field via bracket notation)
    const connection = (client as any).provider?.connection || await getSolanaConnectionWithFallback('confirmed')
    
    // Resolve market on-chain with transaction wrapper for retry logic and "already processed" handling
    const signature = await sendTransactionWithRetry(
      async () => {
        return await client.resolveMarket(marketPda, resolveData.outcome)
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
        connection: connection,
        onRetry: (attempt, error) => {
          console.warn(`⚠️ Retrying market resolution (attempt ${attempt}/3):`, error?.message || String(error))
        },
      }
    )
    
    return { signature }
  } catch (error) {
    console.error('Error resolving market on-chain:', error)
    
    // Check if transaction was already processed
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('already been processed') || 
        errorMessage.includes('already processed')) {
      // Transaction succeeded, return a placeholder signature
      return { signature: 'already_processed' }
    }
    
    throw error instanceof Error 
      ? error 
      : new Error('Failed to resolve market on-chain')
  }
}

