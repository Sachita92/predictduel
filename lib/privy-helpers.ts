import { User } from '@privy-io/react-auth'

/**
 * Supported blockchain types
 */
export type BlockchainType = 'solana' | 'ethereum' | 'base' | 'polygon' | 'arbitrum' | 'optimism' | 'bitcoin'

/**
 * Get wallet address for a specific blockchain from Privy user
 * This function searches through all connected wallets and returns the address
 * for the specified blockchain type
 * 
 * @param user - Privy user object
 * @param chainType - The blockchain to get the address for (defaults to 'solana')
 * @returns The wallet address for the specified chain, or null if not found
 */
export function getWalletAddress(
  user: User | null | undefined, 
  chainType: BlockchainType = 'solana'
): string | null {
  if (!user) return null
  
  // For Solana, ONLY return Solana addresses (no 0x prefix)
  if (chainType === 'solana') {
    // Check linkedAccounts first
    if (user.linkedAccounts && user.linkedAccounts.length > 0) {
      // Find explicitly marked Solana wallet
      const solanaWallet = user.linkedAccounts.find(
        (account: any) => 
          account.type === 'wallet' && 
          account.chainType?.toLowerCase() === 'solana'
      ) as any
      
      if (solanaWallet?.address && !solanaWallet.address.startsWith('0x')) {
        return solanaWallet.address
      }
      
      // Try Phantom (Solana wallet)
      const phantomWallet = user.linkedAccounts.find(
        (account: any) => 
          account.type === 'wallet' && 
          account.walletClientType?.toLowerCase() === 'phantom' &&
          account.address &&
          !account.address.startsWith('0x')
      ) as any
      
      if (phantomWallet?.address) {
        return phantomWallet.address
      }
      
      // Find ANY wallet address that doesn't start with 0x (Solana format)
      const anyNonEthWallet = user.linkedAccounts.find(
        (account: any) => 
          account.type === 'wallet' && 
          account.address &&
          !account.address.startsWith('0x')
      ) as any
      
      if (anyNonEthWallet?.address) {
        return anyNonEthWallet.address
      }
    }
    
    // Check default wallet - only if it's NOT Ethereum
    if (user.wallet?.address && !user.wallet.address.startsWith('0x')) {
      return user.wallet.address
    }
    
    // No Solana wallet found
    return null
  }
  
  // For other chains, use normal logic
  if (!user.linkedAccounts || user.linkedAccounts.length === 0) {
    return user.wallet?.address || null
  }
  
  const wallet = user.linkedAccounts.find(
    (account: any) => 
      account.type === 'wallet' && 
      account.chainType?.toLowerCase() === chainType.toLowerCase()
  ) as any
  
  return wallet?.address || user.wallet?.address || null
}

/**
 * Get Solana wallet address (convenience wrapper)
 */
export function getSolanaAddress(user: User | null | undefined): string | null {
  return getWalletAddress(user, 'solana')
}

/**
 * Get Ethereum wallet address (convenience wrapper)
 */
export function getEthereumAddress(user: User | null | undefined): string | null {
  return getWalletAddress(user, 'ethereum')
}

/**
 * Get all connected wallet addresses grouped by blockchain
 * Useful for displaying all connected wallets to the user
 */
export function getAllWalletAddresses(user: User | null | undefined): Record<string, string> {
  const wallets: Record<string, string> = {}
  
  if (!user?.linkedAccounts) return wallets
  
  user.linkedAccounts.forEach((account: any) => {
    if (account.type === 'wallet' && account.address && account.chainType) {
      wallets[account.chainType] = account.address
    }
  })
  
  return wallets
}

/**
 * Validate address format based on blockchain type
 */
export function isValidAddressForChain(
  address: string | null | undefined, 
  chainType: BlockchainType
): boolean {
  if (!address) return false
  
  switch (chainType) {
    case 'solana':
      // Solana: Base58 encoded, 32-44 characters, no 0x prefix
      if (address.startsWith('0x')) return false
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
    
    case 'ethereum':
    case 'base':
    case 'polygon':
    case 'arbitrum':
    case 'optimism':
      // EVM chains: Hex with 0x prefix, 42 characters total
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    
    case 'bitcoin':
      // Bitcoin: Base58 or Bech32, starts with 1, 3, or bc1
      return /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(address)
    
    default:
      // Unknown chain type, do basic validation
      return address.length > 20
  }
}

/**
 * Check if a wallet address is a valid Solana address
 * Solana addresses are Base58 encoded and do NOT start with 0x
 */
export function isSolanaAddress(address: string | null | undefined): boolean {
  return isValidAddressForChain(address, 'solana')
}

/**
 * Check if a wallet address is a valid Ethereum address
 * Ethereum addresses are hex encoded and start with 0x
 */
export function isEthereumAddress(address: string | null | undefined): boolean {
  return isValidAddressForChain(address, 'ethereum')
}

/**
 * Detect blockchain type from address format
 */
export function detectChainFromAddress(address: string | null | undefined): BlockchainType | null {
  if (!address) return null
  
  if (isValidAddressForChain(address, 'solana')) return 'solana'
  if (isValidAddressForChain(address, 'ethereum')) return 'ethereum'
  if (isValidAddressForChain(address, 'bitcoin')) return 'bitcoin'
  
  return null
}

