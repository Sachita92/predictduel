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
const PROGRAM_ID = new PublicKey('8aMfhVJxNZeGjgDg38XwdpMqDdrsvM42RPjF67DQ8VVe')

// RPC endpoint
const RPC_ENDPOINT = 'https://api.devnet.solana.com'


/**
 * Create Anchor wallet from Solana provider
 * Note: This creates a wallet adapter that works with Anchor
 */
export function createAnchorWallet(provider: any): anchor.Wallet {
  if (!provider) {
    throw new Error('Provider is required but was not provided')
  }
  
  if (!provider.publicKey) {
    throw new Error(
      'Wallet provider does not have a publicKey. ' +
      'This usually means the wallet is not connected. ' +
      'Please connect your Solana wallet (Phantom, Solflare, etc.) and try again.'
    )
  }
  
  // Debug logging - detailed information about the provider
  console.log('🔍 createAnchorWallet Debug:')
  console.log('  provider type:', typeof provider)
  console.log('  provider.publicKey type:', typeof provider.publicKey)
  console.log('  provider.publicKey instanceof PublicKey:', provider.publicKey instanceof PublicKey)
  console.log('  provider.publicKey value:', provider.publicKey?.toString?.() || provider.publicKey)
  console.log('  provider.publicKey constructor:', provider.publicKey?.constructor?.name)
  console.log('  provider.isConnected:', provider.isConnected)
  console.log('  provider.isPhantom:', provider.isPhantom)
  
  // Check if publicKey looks like a valid Solana address
  const pubkeyStr = provider.publicKey?.toString?.() || String(provider.publicKey || '')
  if (pubkeyStr && pubkeyStr.length > 0) {
    if (pubkeyStr.startsWith('0x')) {
      console.error('❌ ERROR: This looks like an Ethereum address (starts with 0x), not Solana!')
      throw new Error(
        'Wallet address appears to be an Ethereum address (0x...), but Solana is required. ' +
        'Please make sure your Phantom wallet is set to Solana network, not Ethereum.'
      )
    }
    if (pubkeyStr.length < 32 || pubkeyStr.length > 44) {
      console.warn('⚠️ WARNING: PublicKey length is unusual for Solana:', pubkeyStr.length)
    }
  }
  
  // Handle both PublicKey objects and string representations
  // Always convert to a new PublicKey instance to ensure it's from the correct module
  let publicKey: PublicKey
  try {
    // Get the string representation of the publicKey
    let publicKeyString: string
    if (typeof provider.publicKey === 'string') {
      publicKeyString = provider.publicKey
    } else if (provider.publicKey && typeof provider.publicKey.toString === 'function') {
      publicKeyString = provider.publicKey.toString()
    } else {
      throw new Error(`Cannot convert publicKey to string. Type: ${typeof provider.publicKey}, value: ${provider.publicKey}`)
    }
    
    // Validate the string is not empty
    if (!publicKeyString || publicKeyString.trim().length === 0) {
      throw new Error('publicKey string is empty')
    }
    
    // Create new PublicKey instance
    publicKey = new PublicKey(publicKeyString)
  } catch (error) {
    console.error('Error creating PublicKey:', error)
    console.error('Provider publicKey details:', {
      type: typeof provider.publicKey,
      value: provider.publicKey,
      hasToString: typeof provider.publicKey?.toString === 'function',
    })
    throw new Error(
      `Invalid publicKey format: ${error instanceof Error ? error.message : String(error)}. ` +
      `Please ensure your wallet is properly connected and try again.`
    )
  }
  
  // Validate publicKey is properly initialized
  if (!publicKey || !publicKey.toBuffer) {
    throw new Error('PublicKey is not properly initialized')
  }
  
  console.log('createAnchorWallet - created publicKey type:', typeof publicKey)
  console.log('createAnchorWallet - created publicKey instanceof PublicKey:', publicKey instanceof PublicKey)
  
  // Create a wallet object compatible with Anchor
  // Anchor Wallet interface requires publicKey, signTransaction, and signAllTransactions
  // In browser environments, we don't have access to the secret key, so payer is not set
  const wallet = {
    publicKey,
    signTransaction: async <T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction>(
      tx: T
    ): Promise<T> => {
      if (!provider.signTransaction) {
        throw new Error('Provider does not support signTransaction')
      }
      return await provider.signTransaction(tx) as T
    },
    signAllTransactions: async <T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> => {
      if (!provider.signAllTransactions) {
        throw new Error('Provider does not support signAllTransactions')
      }
      return await provider.signAllTransactions(txs) as T[]
    },
  } as anchor.Wallet
  
  return wallet
}

/**
 * Load IDL for browser environment
 * Fetches from public directory (copied during build)
 */
async function loadIDL(): Promise<any> {
  try {
    // Fetch IDL from public directory
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
 * Initialize PredictDuel client from Solana wallet provider
 */
export async function initializeClient(provider: any): Promise<PredictDuelClient> {
  const connection = new Connection(RPC_ENDPOINT, 'confirmed')
  const wallet = createAnchorWallet(provider)
  
  // Load IDL for browser compatibility
  const idl = await loadIDL()
  
  return new PredictDuelClient(connection, wallet, PROGRAM_ID, idl)
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
 * Find the next available market index for a creator
 * This checks existing markets to find the first unused index
 */
async function findNextMarketIndex(
  programId: PublicKey,
  creatorPubkey: PublicKey,
  connection: Connection,
  startIndex: number = 1,
  maxAttempts: number = 100
): Promise<number> {
  for (let i = startIndex; i < startIndex + maxAttempts; i++) {
    try {
      // Try to derive the market PDA for this index
      const marketPda = PredictDuelClient.deriveMarketPda(
        programId,
        creatorPubkey,
        i
      )
      
      // Check if the account exists by trying to get its info
      try {
        const accountInfo = await connection.getAccountInfo(marketPda)
        // If account exists and has data, this index is taken
        if (accountInfo && accountInfo.data && accountInfo.data.length > 0) {
          continue // Try next index
        }
        // Account doesn't exist or is empty, this index is available
        return i
      } catch (fetchError: any) {
        // If we can't fetch the account, assume it doesn't exist
        // This index is available
        return i
      }
    } catch (error) {
      // Error deriving PDA, try next index
      continue
    }
  }
  
  // If we couldn't find an available index, throw an error
  throw new Error(
    `Could not find an available market index after ${maxAttempts} attempts. ` +
    `Please try again or contact support.`
  )
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
    // Validate inputs
    if (!formData.question || formData.question.trim().length === 0) {
      throw new Error('Question is required')
    }
    if (!formData.stake || formData.stake <= 0) {
      throw new Error('Stake amount must be greater than 0')
    }
    if (!formData.deadline || !(formData.deadline instanceof Date)) {
      throw new Error('Deadline must be a valid Date object')
    }
    if (!formData.category) {
      throw new Error('Category is required')
    }
    if (!formData.type) {
      throw new Error('Market type is required')
    }
    
    // Initialize client (now async to load IDL)
    const client = await initializeClient(provider)
    
    // Convert SOL to lamports
    const stakeInLamports = PredictDuelClient.solToLamports(formData.stake)
    
    // Validate lamports conversion
    if (!stakeInLamports || isNaN(stakeInLamports) || stakeInLamports <= 0) {
      throw new Error(`Invalid stake amount: ${formData.stake} SOL`)
    }
    
    // Ensure deadline is a Date object
    const deadlineDate = formData.deadline instanceof Date 
      ? formData.deadline 
      : new Date(formData.deadline)
    
    // Get connection and program ID for finding next market index
    const connection = new Connection(RPC_ENDPOINT, 'confirmed')
    const creatorPubkey = new PublicKey(provider.publicKey.toString())
    
    // Find the next available market index if not provided
    let marketIndex = formData.marketIndex
    if (!marketIndex) {
      try {
        marketIndex = await findNextMarketIndex(PROGRAM_ID, creatorPubkey, connection)
        console.log(`Auto-selected market index: ${marketIndex}`)
      } catch (indexError) {
        // If we can't find an index automatically, default to 1 and let the error bubble up
        // The error message will be more helpful
        console.warn('Could not auto-find market index, using 1:', indexError)
        marketIndex = 1
      }
    }
    
    // Create market on-chain with retry logic for account conflicts
    let lastError: any = null
    const maxRetries = 3
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { signature, marketPda } = await client.createMarket({
          marketIndex: marketIndex!,
          question: formData.question.trim(),
          category: mapCategory(formData.category),
          stakeAmount: stakeInLamports,
          deadline: deadlineDate,
          marketType: mapType(formData.type),
        })
        
        return {
          marketPda: marketPda.toString(),
          signature,
        }
      } catch (error: any) {
        lastError = error
        
        // Check if it's an "account already in use" error
        const errorMessage = error?.message || String(error)
        const errorLogs = error?.transactionLogs || []
        const logsString = Array.isArray(errorLogs) ? errorLogs.join(' ') : String(errorLogs)
        
        const isAccountInUse = 
          errorMessage.includes('already in use') ||
          errorMessage.includes('AccountAlreadyInUse') ||
          errorMessage.includes('custom program error: 0x0') ||
          logsString.includes('already in use')
        
        if (isAccountInUse && attempt < maxRetries - 1) {
          // Try to find the next available index
          try {
            marketIndex = await findNextMarketIndex(PROGRAM_ID, creatorPubkey, connection, marketIndex! + 1)
            console.log(`Market index ${marketIndex! - 1} already in use, trying ${marketIndex}`)
            continue // Retry with new index
          } catch (indexError) {
            // Can't find next index, break and throw original error
            break
          }
        } else {
          // Not a retryable error or out of retries
          break
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('Failed to create market after retries')
  } catch (error) {
    console.error('Error creating market on-chain:', error)
    
    // Provide more helpful error messages
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('already in use') || errorMessage.includes('custom program error: 0x0')) {
      throw new Error(
        'Market account already exists. This usually means you\'ve already created a market with this index. ' +
        'Please try again - the system will automatically find the next available index.'
      )
    }
    
    throw error
  }
}

