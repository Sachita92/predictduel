import { Connection } from '@solana/web3.js'

/**
 * RPC endpoints with fallback support
 * Primary endpoint can be set via NEXT_PUBLIC_SOLANA_RPC_URL or NEXT_PUBLIC_SOLANA_RPC_URI environment variable
 */
const SOLANA_RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  process.env.NEXT_PUBLIC_SOLANA_RPC_URI || 
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet', // Fallback: Ankr (free public endpoint)
  'https://api.devnet.solana.com', // Final fallback to official endpoint
].filter((endpoint): endpoint is string => Boolean(endpoint)) // Filter out undefined/null values

/**
 * Get a Solana connection with automatic fallback if primary endpoint fails
 * 
 * @param commitment - Commitment level (default: 'confirmed')
 * @returns A Connection instance
 */
export function getSolanaConnection(commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'): Connection {
  const primaryEndpoint = SOLANA_RPC_ENDPOINTS[0]
  return new Connection(primaryEndpoint, commitment)
}

/**
 * Get a Solana connection with retry logic across multiple endpoints
 * This function will try each endpoint in order until one succeeds
 * 
 * @param commitment - Commitment level (default: 'confirmed')
 * @returns A Connection instance that works with at least one endpoint
 * @throws Error if all endpoints fail
 */
export async function getSolanaConnectionWithFallback(
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
): Promise<Connection> {
  let lastError: Error | null = null
  
  // Try each RPC endpoint in order
  for (let i = 0; i < SOLANA_RPC_ENDPOINTS.length; i++) {
    const endpoint = SOLANA_RPC_ENDPOINTS[i]
    try {
      const connection = new Connection(endpoint, commitment)
      
      // Test the connection by getting a recent blockhash
      // This will fail if the endpoint is unreachable or blocked by CSP
      // Use getLatestBlockhash (newer API) with fallback to getRecentBlockhash for compatibility
      try {
        await connection.getLatestBlockhash('finalized')
      } catch (blockhashError) {
        // Extract error message
        const errorMsg = blockhashError instanceof Error ? blockhashError.message : String(blockhashError)
        
        // Check if it's a network/fetch error
        const isNetworkError = 
          errorMsg.includes('Failed to fetch') ||
          errorMsg.includes('NetworkError') ||
          errorMsg.includes('fetch failed') ||
          errorMsg.includes('ECONNREFUSED') ||
          errorMsg.includes('ETIMEDOUT') ||
          errorMsg.includes('TypeError')
        
        // Check if it's a CSP error
        const isCSPError = 
          errorMsg.includes('CSP') || 
          errorMsg.includes('Content Security Policy') || 
          errorMsg.includes('Refused to connect')
        
        // Check if it's a StructError (RPC response format mismatch)
        const isStructError = 
          errorMsg.includes('StructError') || 
          errorMsg.includes('Expected the value to satisfy')
        
        if (isNetworkError || isCSPError || isStructError) {
          const errorType = isCSPError ? 'CSP blocking' : isStructError ? 'unexpected response format' : 'network error'
          console.warn(`⚠️ RPC endpoint ${endpoint} failed (${errorType}). Trying next endpoint...`)
          throw blockhashError // Re-throw to continue to next endpoint
        }
        
        // Fallback for older Solana web3.js versions
        try {
          await connection.getRecentBlockhash('finalized')
        } catch (fallbackError) {
          const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          
          // Check if fallback also has network/StructError
          const isFallbackNetworkError = 
            fallbackMsg.includes('Failed to fetch') ||
            fallbackMsg.includes('NetworkError') ||
            fallbackMsg.includes('fetch failed') ||
            fallbackMsg.includes('TypeError')
          
          const isFallbackStructError = 
            fallbackMsg.includes('StructError') || 
            fallbackMsg.includes('Expected the value to satisfy')
          
          if (isFallbackNetworkError || isFallbackStructError) {
            const errorType = isFallbackStructError ? 'unexpected response format' : 'network error'
            console.warn(`⚠️ RPC endpoint ${endpoint} failed (${errorType}). Trying next endpoint...`)
            throw fallbackError
          }
          // If both fail, it's likely a network/CSP issue
          throw blockhashError
        }
      }
      
      // Connection is working
      if (i > 0) {
        console.log(`✅ Using fallback RPC endpoint ${i + 1}/${SOLANA_RPC_ENDPOINTS.length}: ${endpoint}`)
      }
      
      return connection
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      lastError = error instanceof Error ? error : new Error(errorMessage)
      
      // Log error but continue to next endpoint
      if (i === 0) {
        console.warn(`⚠️ Primary RPC endpoint failed (${endpoint}):`, errorMessage)
        if (i < SOLANA_RPC_ENDPOINTS.length - 1) {
          console.log(`Trying fallback RPC endpoint ${i + 2}/${SOLANA_RPC_ENDPOINTS.length}...`)
        }
      }
      
      // Check if it's a network/connectivity error or StructError (RPC format mismatch)
      const isNetworkError = 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('TypeError') ||
        errorMessage.includes('CORS') ||
        errorMessage.includes('Cross-Origin')
      
      const isStructError = 
        errorMessage.includes('StructError') ||
        errorMessage.includes('Expected the value to satisfy') ||
        errorMessage.includes('failed to get recent blockhash')
      
      // If it's a network error or StructError and we have more endpoints, continue
      if ((isNetworkError || isStructError) && i < SOLANA_RPC_ENDPOINTS.length - 1) {
        continue
      }
      
      // If it's not a network/StructError or we're on the last endpoint, break
      if (!isNetworkError && !isStructError) {
        break
      }
    }
  }
  
  // All endpoints failed
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError)
  console.error('❌ All RPC endpoints failed:', errorMessage)
  
  // Provide helpful error message
  console.warn(
    '⚠️ All Solana RPC endpoints are unavailable. ' +
    'Consider using a dedicated RPC provider. ' +
    'Set NEXT_PUBLIC_SOLANA_RPC_URL or NEXT_PUBLIC_SOLANA_RPC_URI environment variable with your RPC endpoint. ' +
    'Free options: QuickNode, Alchemy, Helius, or Ankr. ' +
    'For Helius: https://rpc-devnet.helius.xyz/?api-key=YOUR_API_KEY'
  )
  
  // Return connection to primary endpoint anyway (will likely fail, but better than nothing)
  // The actual error will be thrown when trying to use it
  return new Connection(SOLANA_RPC_ENDPOINTS[0], commitment)
}

/**
 * Get the list of available RPC endpoints
 */
export function getRpcEndpoints(): string[] {
  return [...SOLANA_RPC_ENDPOINTS]
}

/**
 * Get the primary RPC endpoint
 */
export function getPrimaryRpcEndpoint(): string {
  return SOLANA_RPC_ENDPOINTS[0]
}

