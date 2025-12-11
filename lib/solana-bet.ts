/**
 * Solana Betting Helper
 * 
 * Client-side utilities for placing bets on prediction markets on Solana
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
 * Initialize PredictDuel client for betting
 */
async function initializeClient(provider: any): Promise<PredictDuelClient> {
  // Use fallback RPC connection to handle endpoint failures
  const connection = await getSolanaConnectionWithFallback('confirmed')
  const wallet = createAnchorWallet(provider)
  const idl = await loadIDL()
  
  return new PredictDuelClient(connection, wallet, PROGRAM_ID, idl)
}

/**
 * Place a bet on a prediction market
 * 
 * @param provider - Solana wallet provider (from window.solana or Privy)
 * @param betData - Bet data
 * @returns Transaction signature and participant PDA
 */
export async function placeBetOnChain(
  provider: any,
  betData: {
    marketPda: string // Market PDA address
    prediction: boolean // true = YES, false = NO
    stakeAmount: number // SOL amount as decimal
  }
): Promise<{ signature: string; participantPda: string }> {
  try {
    // Validate inputs
    if (!betData.marketPda) {
      throw new Error('Market PDA is required')
    }
    if (betData.stakeAmount <= 0) {
      throw new Error('Stake amount must be greater than 0')
    }
    
    // Initialize client
    const client = await initializeClient(provider)
    
    // Convert SOL to lamports
    const stakeInLamports = PredictDuelClient.solToLamports(betData.stakeAmount)
    
    // Validate lamports conversion
    if (!stakeInLamports || isNaN(stakeInLamports) || stakeInLamports <= 0) {
      throw new Error(`Invalid stake amount: ${betData.stakeAmount} SOL`)
    }
    
    // Convert market PDA string to PublicKey
    const marketPda = new PublicKey(betData.marketPda)
    
    // Place bet on-chain
    const result = await client.placeBet({
      marketPda,
      prediction: betData.prediction,
      stakeAmount: stakeInLamports,
    })
    
    return {
      signature: result.signature,
      participantPda: result.participantPda.toString(),
    }
  } catch (error) {
    console.error('Error placing bet on-chain:', error)
    throw error instanceof Error 
      ? error 
      : new Error('Failed to place bet on-chain')
  }
}

