import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { APP_BLOCKCHAIN } from './blockchain-config'

/**
 * Solana RPC endpoint - you should use your own endpoint for production
 * Get a free endpoint from:
 * - https://www.quicknode.com
 * - https://www.alchemy.com
 * - https://rpcpool.com
 */
const SOLANA_RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

/**
 * Ethereum RPC endpoint
 */
const ETHEREUM_RPC_ENDPOINT = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'

/**
 * Fetch wallet balance for Solana
 */
export async function getSolanaBalance(address: string): Promise<number> {
  try {
    const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed')
    const publicKey = new PublicKey(address)
    const balance = await connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Error fetching Solana balance:', error)
    return 0
  }
}

/**
 * Fetch wallet balance for Ethereum and EVM chains
 */
export async function getEthereumBalance(address: string, rpcUrl?: string): Promise<number> {
  try {
    const endpoint = rpcUrl || ETHEREUM_RPC_ENDPOINT
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    })

    const data = await response.json()
    if (data.result) {
      // Convert from Wei to ETH
      const balanceInWei = BigInt(data.result)
      const balanceInEth = Number(balanceInWei) / 1e18
      return balanceInEth
    }
    return 0
  } catch (error) {
    console.error('Error fetching Ethereum balance:', error)
    return 0
  }
}

/**
 * Fetch wallet balance based on the configured blockchain
 */
export async function getWalletBalance(address: string | null | undefined): Promise<number> {
  if (!address) return 0

  try {
    switch (APP_BLOCKCHAIN) {
      case 'solana':
        return await getSolanaBalance(address)
      
      case 'ethereum':
        return await getEthereumBalance(address)
      
      case 'base':
        return await getEthereumBalance(
          address,
          process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
        )
      
      case 'polygon':
        return await getEthereumBalance(
          address,
          process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com'
        )
      
      case 'arbitrum':
        return await getEthereumBalance(
          address,
          process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
        )
      
      case 'optimism':
        return await getEthereumBalance(
          address,
          process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io'
        )
      
      default:
        console.warn(`Balance fetching not implemented for ${APP_BLOCKCHAIN}`)
        return 0
    }
  } catch (error) {
    console.error(`Error fetching ${APP_BLOCKCHAIN} balance:`, error)
    return 0
  }
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

