import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

/**
 * Solana RPC endpoint - you should use your own endpoint for production
 * Get a free endpoint from:
 * - https://www.helius.dev (free tier available)
 * 
 * Defaults to devnet for development to avoid rate limits on public mainnet endpoint
 * Fallback endpoints are used if the primary endpoint fails
 */
const SOLANA_RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet', // Fallback: Ankr (free public endpoint)
]

/**
 * Fetch wallet balance for Solana with retry logic
 */
export async function getSolanaBalance(address: string): Promise<number> {
  const publicKey = new PublicKey(address)
  let lastError: Error | null = null
  
  // Try each RPC endpoint in order
  for (let i = 0; i < SOLANA_RPC_ENDPOINTS.length; i++) {
    const endpoint = SOLANA_RPC_ENDPOINTS[i]
    try {
      const connection = new Connection(endpoint, 'confirmed')
      const balance = await connection.getBalance(publicKey)
      return balance / LAMPORTS_PER_SOL
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      lastError = error instanceof Error ? error : new Error(errorMessage)
      
      // Log error but continue to next endpoint
      if (i === 0) {
        // Only log the primary endpoint error
        console.warn(`Primary RPC endpoint failed (${endpoint}):`, errorMessage)
      }
      
      // Check if it's a rate limit or authentication error
      const isRateLimitError = 
        errorMessage.includes('401') || 
        errorMessage.includes('403') || 
        errorMessage.includes('429') ||
        errorMessage.includes('Bad request') ||
        errorMessage.includes('Access forbidden') ||
        errorMessage.includes('rate limit')
      
      if (isRateLimitError && i < SOLANA_RPC_ENDPOINTS.length - 1) {
        // Try next endpoint
        console.log(`Trying fallback RPC endpoint ${i + 2}/${SOLANA_RPC_ENDPOINTS.length}...`)
        continue
      }
      
      // If it's not a rate limit error or we're on the last endpoint, break
      if (!isRateLimitError) {
        break
      }
    }
  }
  
  // All endpoints failed
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError)
  console.error('Error fetching Solana balance from all endpoints:', errorMessage)
  
  // Provide helpful error message
  if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('429')) {
    console.warn(
      '⚠️ RPC endpoint rate limited or unavailable. ' +
      'Consider using a dedicated RPC provider. ' +
      'Set NEXT_PUBLIC_SOLANA_RPC_URL environment variable with your RPC endpoint. ' +
      'Free options: QuickNode, Alchemy, Helius, or Ankr.'
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

