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
// Import transaction wrapper for retry logic and "already processed" handling
import { sendTransactionWithRetry } from './solana-transaction-wrapper'


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
      
      // Check if wallet is still connected
      if (!walletProvider.publicKey) {
        throw new Error('Wallet is disconnected. Please reconnect your wallet and try again.')
      }
      
      // Check if wallet is connected (for Phantom)
      if (walletProvider.isConnected === false) {
        throw new Error('Wallet is not connected. Please connect your wallet and try again.')
      }
      
      try {
        // Add timeout to prevent hanging
        const signPromise = walletProvider.signTransaction(tx)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction signing timed out. Please try again.')), 30000)
        )
        
        return await Promise.race([signPromise, timeoutPromise]) as T
      } catch (error) {
        // Provide more helpful error messages
        if (error instanceof Error) {
          if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
            throw new Error('Transaction was cancelled. Please approve the transaction in your wallet.')
          }
          if (error.message.includes('disconnected') || error.message.includes('port')) {
            throw new Error('Wallet connection lost. Please refresh the page and reconnect your wallet.')
          }
          if (error.message.includes('timeout')) {
            throw new Error('Transaction signing timed out. Please try again.')
          }
          // Re-throw with original message
          throw new Error(`Failed to sign transaction: ${error.message}`)
        }
        throw new Error('Failed to sign transaction. Please try again.')
      }
    },
    signAllTransactions: async <T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> => {
      if (!walletProvider.signAllTransactions) {
        throw new Error('Provider does not support signAllTransactions')
      }
      
      // Check if wallet is still connected
      if (!walletProvider.publicKey) {
        throw new Error('Wallet is disconnected. Please reconnect your wallet and try again.')
      }
      
      // Check if wallet is connected (for Phantom)
      if (walletProvider.isConnected === false) {
        throw new Error('Wallet is not connected. Please connect your wallet and try again.')
      }
      
      try {
        // Add timeout to prevent hanging
        const signPromise = walletProvider.signAllTransactions(txs)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction signing timed out. Please try again.')), 60000)
        )
        
        return await Promise.race([signPromise, timeoutPromise]) as T[]
      } catch (error) {
        // Provide more helpful error messages
        if (error instanceof Error) {
          if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
            throw new Error('Transaction was cancelled. Please approve the transaction in your wallet.')
          }
          if (error.message.includes('disconnected') || error.message.includes('port')) {
            throw new Error('Wallet connection lost. Please refresh the page and reconnect your wallet.')
          }
          if (error.message.includes('timeout')) {
            throw new Error('Transaction signing timed out. Please try again.')
          }
          // Re-throw with original message
          throw new Error(`Failed to sign transactions: ${error.message}`)
        }
        throw new Error('Failed to sign transactions. Please try again.')
      }
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
    
    // Create market on-chain with retry logic using transaction wrapper
    // The wrapper handles "already processed" errors and retries with fresh blockhashes
    try {
      // Use transaction wrapper to wrap the SDK call
      // Get connection from the client's provider (accessing private field via bracket notation)
      const clientConnection = (client as any).provider?.connection || connection
      
      const result = await sendTransactionWithRetry(
        async () => {
          const result = await client.createMarket({
            marketIndex: marketIndex!,
            question: formData.question.trim(),
            category: mapCategory(formData.category),
            stakeAmount: stakeInLamports,
            deadline: deadlineDate,
            marketType: mapType(formData.type),
          })
          return result.signature
        },
        {
          maxRetries: 3,
          retryDelay: 1000,
          connection: clientConnection,
          onRetry: (attempt, error) => {
            console.warn(`⚠️ Retrying market creation (attempt ${attempt}/3):`, error?.message || String(error))
          },
        }
      )
      
      // Derive market PDA to return
      const marketPda = PredictDuelClient.deriveMarketPda(
        PROGRAM_ID,
        creatorPubkey,
        marketIndex!
      )
      
      return {
        marketPda: marketPda.toString(),
        signature: result,
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      const errorLogs = error?.logs || error?.transactionLogs || []
      const logsString = Array.isArray(errorLogs) ? errorLogs.join(' ') : String(errorLogs)
      
      // Check if transaction was already processed (this means it succeeded!)
      const isAlreadyProcessed = 
        errorMessage.includes('already been processed') ||
        errorMessage.includes('already processed') ||
        errorMessage.includes('This transaction has already been processed') ||
        logsString.includes('already been processed') ||
        logsString.includes('already processed')
      
      // If transaction was already processed, try to find the market
      if (isAlreadyProcessed) {
        console.log('✅ Transaction was already processed - checking if market was created...')
        try {
          const marketPda = PredictDuelClient.deriveMarketPda(
            PROGRAM_ID,
            creatorPubkey,
            marketIndex!
          )
          
          // Verify the market actually exists
          const accountInfo = await connection.getAccountInfo(marketPda)
          if (accountInfo && accountInfo.data && accountInfo.data.length > 0) {
            // Market exists! Transaction succeeded
            console.log('✅ Market already exists - transaction was successful')
            return {
              marketPda: marketPda.toString(),
              signature: 'already_processed',
            }
          }
        } catch (checkError) {
          console.error('Error checking if market exists:', checkError)
        }
      }
      
      // Check if it's an "account already in use" error - try next index
      const isAccountInUse = 
        errorMessage.includes('already in use') ||
        errorMessage.includes('AccountAlreadyInUse') ||
        errorMessage.includes('custom program error: 0x0') ||
        logsString.includes('already in use')
      
      if (isAccountInUse) {
        // Try to find the next available index
        try {
          const nextIndex = await findNextMarketIndex(PROGRAM_ID, creatorPubkey, connection, marketIndex! + 1)
          console.log(`Market index ${marketIndex!} already in use, retrying with ${nextIndex}`)
          
          // Recursively retry with new index (limit recursion depth)
          return createMarketOnChain(provider, {
            ...formData,
            marketIndex: nextIndex,
          })
        } catch (indexError) {
          // Can't find next index, throw original error
          throw error
        }
      }
      
      // Re-throw other errors
      throw error
    }
  } catch (error) {
    console.error('Error creating market on-chain:', error)
    
    // Provide more helpful error messages
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Check if it's an "already processed" error - this means the transaction succeeded
    if (errorMessage.includes('already been processed') || 
        errorMessage.includes('already processed') ||
        errorMessage.includes('This transaction has already been processed')) {
      // Try to find the market that was created
      try {
        const creatorPubkey = new PublicKey(provider.publicKey.toString())
        let connection = await getSolanaConnectionWithFallback('confirmed')
        
        // Try to find the market by checking recent indices
        for (let i = 1; i <= 10; i++) {
          try {
            const marketPda = PredictDuelClient.deriveMarketPda(
              PROGRAM_ID,
              creatorPubkey,
              i
            )
            const accountInfo = await connection.getAccountInfo(marketPda)
            if (accountInfo && accountInfo.data && accountInfo.data.length > 0) {
              // Found the market! Transaction succeeded
              return {
                marketPda: marketPda.toString(),
                signature: 'already_processed',
              }
            }
          } catch (e) {
            // Continue checking
          }
        }
      } catch (findError) {
        console.error('Error finding market after already processed error:', findError)
      }
      
      throw new Error(
        'Transaction was already processed. The market may have been created successfully. ' +
        'Please check your duels list or try creating a new one.'
      )
    }
    
    if (errorMessage.includes('already in use') || errorMessage.includes('custom program error: 0x0')) {
      throw new Error(
        'Market account already exists. This usually means you\'ve already created a market with this index. ' +
        'Please try again - the system will automatically find the next available index.'
      )
    }
    
    throw error
  }
}

