import { BlockchainType } from './privy-helpers'

/**
 * Blockchain Configuration
 * 
 * This file centralizes blockchain-specific settings for the application.
 * Change APP_BLOCKCHAIN to switch to a different blockchain.
 */

/**
 * The primary blockchain this app uses
 * Change this value to switch blockchains:
 * - 'solana' for Solana
 * - 'ethereum' for Ethereum mainnet
 * - 'base' for Base
 * - 'polygon' for Polygon
 * - etc.
 */
export const APP_BLOCKCHAIN: BlockchainType = 'solana'

/**
 * Currency symbol for the blockchain
 */
export const BLOCKCHAIN_CURRENCY: Record<BlockchainType, string> = {
  solana: 'SOL',
  ethereum: 'ETH',
  base: 'ETH',
  polygon: 'MATIC',
  arbitrum: 'ETH',
  optimism: 'ETH',
  bitcoin: 'BTC',
}

/**
 * Get the currency symbol for the app's blockchain
 */
export function getAppCurrency(): string {
  return BLOCKCHAIN_CURRENCY[APP_BLOCKCHAIN]
}

/**
 * Blockchain display names
 */
export const BLOCKCHAIN_NAMES: Record<BlockchainType, string> = {
  solana: 'Solana',
  ethereum: 'Ethereum',
  base: 'Base',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  bitcoin: 'Bitcoin',
}

/**
 * Get the display name for the app's blockchain
 */
export function getAppBlockchainName(): string {
  return BLOCKCHAIN_NAMES[APP_BLOCKCHAIN]
}

/**
 * Explorer URL templates for different blockchains
 */
export const BLOCKCHAIN_EXPLORERS: Record<BlockchainType, string> = {
  solana: 'https://explorer.solana.com/address/',
  ethereum: 'https://etherscan.io/address/',
  base: 'https://basescan.org/address/',
  polygon: 'https://polygonscan.com/address/',
  arbitrum: 'https://arbiscan.io/address/',
  optimism: 'https://optimistic.etherscan.io/address/',
  bitcoin: 'https://blockchair.com/bitcoin/address/',
}

/**
 * Get explorer URL for an address
 */
export function getExplorerUrl(address: string): string {
  return `${BLOCKCHAIN_EXPLORERS[APP_BLOCKCHAIN]}${address}`
}


