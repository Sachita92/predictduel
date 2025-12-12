import { PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js'
import { getRpcEndpoints } from './solana-rpc'

/**
 * Fetch wallet balance for Solana with retry logic and fallback endpoints
 * Uses the centralized RPC utility for reliable connections
 */
export async function getSolanaBalance(address: string): Promise<number> {
  const publicKey = new PublicKey(address)
  let lastError: Error | null = null
  const endpoints = getRpcEndpoints()
  
  // Try each RPC endpoint in order
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i]
    try {
      const connection = new Connection(endpoint, 'confirmed')
      const balance = await connection.getBalance(publicKey)
      
      // Success - log if using fallback
      if (i > 0) {
        console.log(`✅ Balance fetched using fallback RPC endpoint ${i + 1}/${endpoints.length}: ${endpoint}`)
      }
      
      return balance / LAMPORTS_PER_SOL
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      lastError = error instanceof Error ? error : new Error(errorMessage)
      
      // Log error but continue to next endpoint
      if (i === 0) {
        console.warn(`⚠️ Primary RPC endpoint failed (${endpoint}):`, errorMessage)
        if (i < endpoints.length - 1) {
          console.log(`Trying fallback RPC endpoint ${i + 2}/${endpoints.length}...`)
        }
      }
      
      // Check if it's a network/connectivity error that we should retry
      const isNetworkError = 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('failed to get balance') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('TypeError: Failed to fetch')
      
      // Check if it's a rate limit or authentication error
      const isRateLimitError = 
        errorMessage.includes('401') || 
        errorMessage.includes('403') || 
        errorMessage.includes('429') ||
        errorMessage.includes('Bad request') ||
        errorMessage.includes('Access forbidden') ||
        errorMessage.includes('rate limit')
      
      // If it's a network error and we have more endpoints, continue
      if (isNetworkError && i < endpoints.length - 1) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }
      
      // If it's a rate limit error and we have more endpoints, continue
      if (isRateLimitError && i < endpoints.length - 1) {
        continue
      }
      
      // If it's not a retryable error or we're on the last endpoint, break
      if (!isNetworkError && !isRateLimitError) {
        break
      }
    }
  }
  
  // All endpoints failed
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError)
  console.error('❌ Error fetching Solana balance from all endpoints:', errorMessage)
  
  // Provide helpful error message
  if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('429')) {
    console.warn(
      '⚠️ RPC endpoint rate limited or unavailable. ' +
      'Consider using a dedicated RPC provider. ' +
      'Set NEXT_PUBLIC_SOLANA_RPC_URL or NEXT_PUBLIC_SOLANA_RPC_URI environment variable with your RPC endpoint. ' +
      'Free options: QuickNode, Alchemy, Helius, or Ankr.'
    )
  } else if (errorMessage.includes('Failed to fetch')) {
    console.warn(
      '⚠️ Network error connecting to RPC endpoints. ' +
      'Please check your internet connection and verify NEXT_PUBLIC_SOLANA_RPC_URL is set correctly. ' +
      'If using Helius, ensure the endpoint URL includes your API key if required. ' +
      'Example: https://rpc-devnet.helius.xyz/?api-key=YOUR_API_KEY'
    )
  }
  
  return 0
}

/**
 * Fetch wallet balance for Solana
 */
export async function getWalletBalance(address: string | null | undefined): Promise<number> {
  if (!address) return 0
  return await getSolanaBalance(address)
}

/**
 * Format balance for display with appropriate decimal places
 */
export function formatBalance(balance: number, decimals: number = 4): string {
  if (balance === 0) return '0'
  if (balance < 0.0001) return '< 0.0001'
  return balance.toFixed(decimals)
}

/**
 * Check if an address has sufficient balance for a transaction
 */
export async function hasSufficientBalance(
  address: string | null | undefined,
  requiredAmount: number
): Promise<boolean> {
  if (!address) return false
  const balance = await getWalletBalance(address)
  return balance >= requiredAmount
}

