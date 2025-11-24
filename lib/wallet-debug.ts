import { User } from '@privy-io/react-auth'
import { 
  getWalletAddress, 
  getAllWalletAddresses, 
  isValidAddressForChain,
  detectChainFromAddress 
} from './privy-helpers'
import { APP_BLOCKCHAIN, getAppCurrency, getAppBlockchainName } from './blockchain-config'

/**
 * Debug utility to diagnose wallet connection issues
 * Use this in console or components to check wallet status
 */
export function debugWalletConnection(user: User | null | undefined) {
  console.group('🔍 Wallet Debug Information')
  
  if (!user) {
    console.error('❌ No user object provided')
    console.groupEnd()
    return
  }
  
  console.log('📋 User ID:', user.id)
  
  // Check default wallet
  console.log('\n💼 Default Wallet (Privy):')
  console.log('  Address:', user.wallet?.address || 'None')
  console.log('  Chain Type:', user.wallet?.chainType || 'Unknown')
  console.log('  Wallet Client:', user.wallet?.walletClientType || 'Unknown')
  
  if (user.wallet?.address) {
    const detectedChain = detectChainFromAddress(user.wallet.address)
    console.log('  Detected Format:', detectedChain || 'Unknown')
    
    if (user.wallet.address.startsWith('0x')) {
      console.warn('  ⚠️  This is an Ethereum address (0x...)')
    } else {
      console.log('  ✅ This appears to be a Solana address (Base58)')
    }
  }
  
  // Check all linked accounts
  console.log('\n🔗 All Linked Accounts:')
  if (!user.linkedAccounts || user.linkedAccounts.length === 0) {
    console.log('  No linked accounts found')
  } else {
    user.linkedAccounts.forEach((account: any, index: number) => {
      console.log(`  [${index + 1}] Type: ${account.type}`)
      if (account.type === 'wallet') {
        console.log(`      Chain: ${account.chainType || 'Unknown'}`)
        console.log(`      Client: ${account.walletClientType || 'Unknown'}`)
        console.log(`      Address: ${account.address || 'None'}`)
        
        if (account.address) {
          const detectedChain = detectChainFromAddress(account.address)
          console.log(`      Format: ${detectedChain || 'Unknown'}`)
        }
      }
    })
  }
  
  // Check app configuration
  console.log('\n⚙️  App Configuration:')
  console.log('  Configured Blockchain:', APP_BLOCKCHAIN)
  console.log('  Currency:', getAppCurrency())
  console.log('  Display Name:', getAppBlockchainName())
  
  // Get wallet address for configured blockchain
  console.log('\n🎯 Current Blockchain Wallet:')
  const configuredAddress = getWalletAddress(user, APP_BLOCKCHAIN)
  
  if (configuredAddress) {
    console.log('  ✅ Address Found:', configuredAddress)
    console.log('  Shortened:', `${configuredAddress.slice(0, 6)}...${configuredAddress.slice(-4)}`)
    
    const isValid = isValidAddressForChain(configuredAddress, APP_BLOCKCHAIN)
    if (isValid) {
      console.log('  ✅ Valid format for', APP_BLOCKCHAIN)
    } else {
      console.error('  ❌ Invalid format for', APP_BLOCKCHAIN)
    }
  } else {
    console.error('  ❌ No wallet found for', APP_BLOCKCHAIN)
    console.log('  💡 Suggestion: Connect a wallet that supports', APP_BLOCKCHAIN)
  }
  
  // Get all wallet addresses
  console.log('\n📍 All Wallet Addresses by Blockchain:')
  const allWallets = getAllWalletAddresses(user)
  
  if (Object.keys(allWallets).length === 0) {
    console.log('  No wallet addresses found')
  } else {
    Object.entries(allWallets).forEach(([chain, address]) => {
      const isForCurrentChain = chain === APP_BLOCKCHAIN
      const prefix = isForCurrentChain ? '  ✅' : '  📌'
      console.log(`${prefix} ${chain}: ${address}`)
    })
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:')
  if (!configuredAddress) {
    console.warn('  ⚠️  No wallet connected for', APP_BLOCKCHAIN)
    console.log('  → Connect a wallet that supports', APP_BLOCKCHAIN)
    if (APP_BLOCKCHAIN === 'solana') {
      console.log('  → Phantom: Switch to Solana network')
    } else if (APP_BLOCKCHAIN === 'ethereum') {
      console.log('  → Phantom or MetaMask: Switch to Ethereum network')
    }
  } else if (configuredAddress.startsWith('0x') && APP_BLOCKCHAIN === 'solana') {
    console.error('  ❌ ISSUE: You have an Ethereum address but app is configured for Solana')
    console.log('  → Solution: In Phantom wallet, switch to Solana network')
    console.log('  → Then disconnect and reconnect your wallet')
  } else if (!configuredAddress.startsWith('0x') && APP_BLOCKCHAIN === 'ethereum') {
    console.error('  ❌ ISSUE: You have a Solana address but app is configured for Ethereum')
    console.log('  → Solution: In wallet, switch to Ethereum network')
    console.log('  → Then disconnect and reconnect your wallet')
  } else {
    console.log('  ✅ Everything looks good!')
  }
  
  console.groupEnd()
  
  return {
    userId: user.id,
    defaultWallet: user.wallet?.address,
    configuredBlockchain: APP_BLOCKCHAIN,
    configuredAddress: configuredAddress,
    allWallets: allWallets,
    isValid: configuredAddress ? isValidAddressForChain(configuredAddress, APP_BLOCKCHAIN) : false,
  }
}

/**
 * Quick check if wallet is properly configured
 * Returns true if everything is good, false if there's an issue
 */
export function isWalletProperlyConfigured(user: User | null | undefined): boolean {
  if (!user) return false
  
  const address = getWalletAddress(user, APP_BLOCKCHAIN)
  if (!address) return false
  
  return isValidAddressForChain(address, APP_BLOCKCHAIN)
}

/**
 * Get a user-friendly error message if wallet is not configured
 */
export function getWalletConfigurationError(user: User | null | undefined): string | null {
  if (!user) {
    return 'Please log in to connect your wallet'
  }
  
  const address = getWalletAddress(user, APP_BLOCKCHAIN)
  
  if (!address) {
    return `No ${APP_BLOCKCHAIN} wallet connected. Please connect a wallet that supports ${getAppBlockchainName()}.`
  }
  
  if (!isValidAddressForChain(address, APP_BLOCKCHAIN)) {
    if (address.startsWith('0x') && APP_BLOCKCHAIN === 'solana') {
      return 'You have an Ethereum wallet connected. Please switch to Solana network in your wallet and reconnect.'
    } else if (!address.startsWith('0x') && APP_BLOCKCHAIN === 'ethereum') {
      return 'You have a Solana wallet connected. Please switch to Ethereum network in your wallet and reconnect.'
    }
    return `Invalid wallet address format for ${getAppBlockchainName()}`
  }
  
  return null // No error, everything is good
}


