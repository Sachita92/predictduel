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

// Import RPC utility for reliable connections
import { getSolanaConnectionWithFallback } from './solana-rpc'


/**
 * Create Anchor wallet from Solana provider
 * Note: This creates a wallet adapter that works with Anchor
 */
export function createAnchorWallet(provider: any): anchor.Wallet {
  if (!provider) {
    throw new Error('Provider is required but was not provided')
  }
  
  // The provider IS the wallet (window.solana), not provider.wallet
  const walletProvider = provider.wallet || provider
  
  if (!walletProvider.publicKey) {
    throw new Error(
      'Wallet provider does not have a publicKey. ' +
      'This usually means the wallet is not connected. ' +
      'Please connect your Solana wallet (Phantom, Solflare, etc.) and try again.'
    )
  }
  
  // Debug logging - detailed information about the provider
  console.log('🔍 createAnchorWallet Debug:')
  console.log('  provider type:', typeof provider)
  console.log('  walletProvider type:', typeof walletProvider)
  console.log('  walletProvider.publicKey type:', typeof walletProvider.publicKey)
  console.log('  walletProvider.publicKey instanceof PublicKey:', walletProvider.publicKey instanceof PublicKey)
  console.log('  walletProvider.publicKey value:', walletProvider.publicKey?.toString?.() || walletProvider.publicKey)
  console.log('  walletProvider.publicKey constructor:', walletProvider.publicKey?.constructor?.name)
  console.log('  walletProvider.isConnected:', walletProvider.isConnected)
  console.log('  walletProvider.isPhantom:', walletProvider.isPhantom)
  
  // Check if publicKey looks like a valid Solana address
  const pubkeyStr = walletProvider.publicKey?.toString?.() || String(walletProvider.publicKey || '')
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
    if (typeof walletProvider.publicKey === 'string') {
      publicKeyString = walletProvider.publicKey
    } else if (walletProvider.publicKey && typeof walletProvider.publicKey.toString === 'function') {
      publicKeyString = walletProvider.publicKey.toString()
    } else {
      throw new Error(`Cannot convert publicKey to string. Type: ${typeof walletProvider.publicKey}, value: ${walletProvider.publicKey}`)
    }
    
    // Validate the string is not empty
    if (!publicKeyString || publicKeyString.trim().length === 0) {
      throw new Error('publicKey string is empty')
    }
    
    // Create new PublicKey instance
    publicKey = new PublicKey(publicKeyString)
  } catch (error) {
    console.error('Error creating PublicKey:', error)
    console.error('WalletProvider publicKey details:', {
      type: typeof walletProvider.publicKey,
      value: walletProvider.publicKey,
      hasToString: typeof walletProvider.publicKey?.toString === 'function',
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
      if (!walletProvider.signTransaction) {
        throw new Error('Provider does not support signTransaction')
      }
      return await walletProvider.signTransaction(tx) as T
    },
    signAllTransactions: async <T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> => {
      if (!walletProvider.signAllTransactions) {
        throw new Error('Provider does not support signAllTransactions')
      }
      return await walletProvider.signAllTransactions(txs) as T[]
    },
  } as anchor.Wallet
  
  return wallet
}

/**
 * Load IDL for browser environment
 * Uses bundled IDL from lib/idl.ts which is included in the build
 */
async function loadIDL(): Promise<any> {
  try {
    // Import the IDL from the bundled module
    // This ensures it's available in production without needing to fetch
    const idlModule = await import('./idl')
    return idlModule.default
  } catch (importError) {
    // Fallback to fetch if import fails (shouldn't happen, but just in case)
    try {
      const response = await fetch('/idl/predict_duel.json')
      if (!response.ok) {
        throw new Error(`Failed to fetch IDL: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (fetchError) {
      console.error('Failed to load IDL (both import and fetch failed):', { importError, fetchError })
      throw new Error(
        'IDL not found. Please ensure public/idl/predict_duel.json exists and lib/idl.ts is properly configured. ' +
        `Import error: ${importError instanceof Error ? importError.message : String(importError)}. ` +
        `Fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
      )
    }
  }
}

/**
 * Initialize PredictDuel client from Solana wallet provider
 */
export async function initializeClient(provider: any): Promise<PredictDuelClient> {
  // Use fallback RPC connection to handle endpoint failures
  const connection = await getSolanaConnectionWithFallback('confirmed')
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
    // Use fallback RPC connection to handle endpoint failures
    let connection = await getSolanaConnectionWithFallback('confirmed')
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
    
    // Create market on-chain with retry logic for account conflicts and RPC failures
    let lastError: any = null
    const maxRetries = 3
    let currentClient = client
    let currentConnection = connection
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { signature, marketPda } = await currentClient.createMarket({
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
        
        const errorMessage = error?.message || String(error)
        const errorLogs = error?.transactionLogs || []
        const logsString = Array.isArray(errorLogs) ? errorLogs.join(' ') : String(errorLogs)
        
        // Check if it's a network/RPC error that we can retry with a different endpoint
        const isNetworkError = 
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('failed to get recent blockhash') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('TypeError: Failed to fetch')
        
        // Check if it's an "account already in use" error
        const isAccountInUse = 
          errorMessage.includes('already in use') ||
          errorMessage.includes('AccountAlreadyInUse') ||
          errorMessage.includes('custom program error: 0x0') ||
          logsString.includes('already in use')
        
        // If it's a network error and we have retries left, try reinitializing with fallback endpoint
        if (isNetworkError && attempt < maxRetries - 1) {
          console.warn(`⚠️ RPC error on attempt ${attempt + 1}/${maxRetries}:`, errorMessage)
          console.log('🔄 Retrying with fallback RPC endpoint...')
          
          try {
            // Reinitialize client with fallback connection
            currentConnection = await getSolanaConnectionWithFallback('confirmed')
            const wallet = createAnchorWallet(provider)
            const idl = await loadIDL()
            currentClient = new PredictDuelClient(currentConnection, wallet, PROGRAM_ID, idl)
            
            // Also update the connection used for finding market index
            connection = currentConnection
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue // Retry with new client
          } catch (reinitError) {
            console.error('Failed to reinitialize client with fallback:', reinitError)
            // Continue to next attempt or break
            if (attempt < maxRetries - 1) {
              continue
            }
          }
        } else if (isAccountInUse && attempt < maxRetries - 1) {
          // Try to find the next available index
          try {
            marketIndex = await findNextMarketIndex(PROGRAM_ID, creatorPubkey, currentConnection, marketIndex! + 1)
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

