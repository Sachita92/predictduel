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

// Program ID - deployed to devnet
const PROGRAM_ID = new PublicKey('8aMfhVJxNZeGjgDg38XwdpMqDdrsvM42RPjF67DQ8VVe')

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
 * Initialize PredictDuel client for resolving markets
 */
async function initializeClient(provider: any): Promise<PredictDuelClient> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed')
  const wallet = createAnchorWallet(provider)
  const idl = await loadIDL()
  
  return new PredictDuelClient(connection, wallet, PROGRAM_ID, idl)
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
    
    // Initialize client
    const client = await initializeClient(provider)
    
    // Convert market PDA string to PublicKey
    const marketPda = new PublicKey(resolveData.marketPda)
    
    // Resolve market on-chain
    const signature = await client.resolveMarket(marketPda, resolveData.outcome)
    
    return { signature }
  } catch (error) {
    console.error('Error resolving market on-chain:', error)
    throw error instanceof Error 
      ? error 
      : new Error('Failed to resolve market on-chain')
  }
}

