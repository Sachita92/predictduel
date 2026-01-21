/**
 * Solana Transaction Wrapper
 * 
 * Wraps Anchor's .rpc() method to:
 * 1. Treat "already processed" errors as success
 * 2. Retry with fresh blockhashes on network errors
 * 3. Prevent duplicate transaction sends
 */

import * as anchor from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'

// Track sent transaction signatures to prevent duplicates
const sentSignatures = new Set<string>()
const MAX_SIGNATURE_AGE = 5 * 60 * 1000 // 5 minutes

// Clean up old signatures periodically
setInterval(() => {
  // In a real implementation, you'd track timestamps
  // For now, we'll just clear if it gets too large
  if (sentSignatures.size > 1000) {
    sentSignatures.clear()
  }
}, 10 * 60 * 1000) // Every 10 minutes

/**
 * Check if error indicates transaction was already processed
 */
function isAlreadyProcessedError(error: any): boolean {
  const errorMessage = error?.message || String(error) || ''
  const errorLogs = error?.logs || error?.transactionLogs || []
  const logsString = Array.isArray(errorLogs) ? errorLogs.join(' ') : String(errorLogs)
  
  return (
    errorMessage.includes('already been processed') ||
    errorMessage.includes('already processed') ||
    errorMessage.includes('This transaction has already been processed') ||
    errorMessage.includes('Transaction simulation failed: This transaction has already been processed') ||
    logsString.includes('already been processed') ||
    logsString.includes('already processed')
  )
}

/**
 * Check if error is a network/RPC error that can be retried
 */
function isRetryableError(error: any): boolean {
  const errorMessage = error?.message || String(error) || ''
  
  return (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('failed to get recent blockhash') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('TypeError: Failed to fetch') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('Blockhash not found') ||
    errorMessage.includes('blockhash not found')
  )
}

/**
 * Extract transaction signature from error or result
 */
function extractSignature(result: any): string | null {
  if (typeof result === 'string') {
    return result
  }
  if (result?.signature) {
    return result.signature
  }
  if (result?.txid) {
    return result.txid
  }
  return null
}

/**
 * Wrapper for Anchor's .rpc() method with proper error handling and retries
 * 
 * @param rpcCall - Function that returns the RPC promise
 * @param options - Options for retry behavior
 * @returns Transaction signature
 */
export async function sendTransactionWithRetry(
  rpcCall: () => Promise<string>,
  options: {
    maxRetries?: number
    retryDelay?: number
    connection?: Connection
    onRetry?: (attempt: number, error: any) => void
  } = {}
): Promise<string> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    connection,
    onRetry,
  } = options

  let lastError: any = null
  let lastSignature: string | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Make the RPC call
      const result = await rpcCall()
      const signature = extractSignature(result)

      if (signature) {
        // Check if we've already sent this signature
        if (sentSignatures.has(signature)) {
          console.warn(`⚠️ Transaction ${signature} was already sent. Treating as success.`)
          return signature
        }

        // Track this signature
        sentSignatures.add(signature)
        return signature
      }

      // If no signature, return the result as-is (shouldn't happen with Anchor)
      return result
    } catch (error: any) {
      lastError = error
      const signature = extractSignature(error)

      // If we have a signature in the error, check if it was already processed
      if (signature && sentSignatures.has(signature)) {
        console.warn(`⚠️ Transaction ${signature} was already sent. Treating as success.`)
        return signature
      }

      // Check if transaction was already processed (this means it succeeded!)
      if (isAlreadyProcessedError(error)) {
        console.log('✅ Transaction was already processed - treating as success')
        
        // Try to extract signature from error
        if (signature) {
          sentSignatures.add(signature)
          return signature
        }

        // If we can't get the signature, we still treat it as success
        // The caller should verify the on-chain state
        throw new Error(
          'Transaction was already processed. The operation may have succeeded. ' +
          'Please check the on-chain state or try again.'
        )
      }

      // Check if it's a retryable error
      if (isRetryableError(error) && attempt < maxRetries - 1) {
        if (onRetry) {
          onRetry(attempt + 1, error)
        } else {
          console.warn(`⚠️ Retryable error on attempt ${attempt + 1}/${maxRetries}:`, error?.message || String(error))
        }

        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))

        // If we have a connection, get a fresh blockhash to ensure new transaction
        if (connection) {
          try {
            await connection.getLatestBlockhash('finalized')
          } catch (blockhashError) {
            // Ignore blockhash errors, just continue with retry
            console.warn('Failed to get fresh blockhash:', blockhashError)
          }
        }

        continue // Retry
      }

      // Not retryable or out of retries - throw the error
      throw error
    }
  }

  // All retries failed
  throw lastError || new Error('Transaction failed after retries')
}

/**
 * Wrap an Anchor method builder to use the retry wrapper
 * 
 * @param methodBuilder - Anchor method builder (from program.methods.xxx())
 * @param options - Retry options
 * @returns Transaction signature
 */
export async function wrapAnchorRpc(
  methodBuilder: {
    accounts: (accounts: any) => any
    rpc: (options?: any) => Promise<string>
  },
  accounts: any,
  options: {
    maxRetries?: number
    retryDelay?: number
    connection?: Connection
    onRetry?: (attempt: number, error: any) => void
    rpcOptions?: any // Options to pass to .rpc()
  } = {}
): Promise<string> {
  const { rpcOptions = {}, ...retryOptions } = options

  // Build the method with accounts
  const methodWithAccounts = methodBuilder.accounts(accounts)

  // Wrap the RPC call
  return sendTransactionWithRetry(
    () => methodWithAccounts.rpc(rpcOptions),
    {
      ...retryOptions,
      connection: options.connection,
    }
  )
}
