'use client'

import { useState, useEffect } from 'react'

interface CurrentPriceDisplayProps {
  symbol: 'SOL' | 'BTC' | 'ETH'
  className?: string
}

// Map symbols to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  'SOL': 'solana',
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
}

export default function CurrentPriceDisplay({ 
  symbol, 
  className = '' 
}: CurrentPriceDisplayProps) {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPrice()
    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000)
    return () => clearInterval(interval)
  }, [symbol])

  const fetchPrice = async () => {
    try {
      setLoading(true)
      setError(null)
      const coinId = COINGECKO_IDS[symbol]
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch price')
      }
      
      const data = await response.json()
      setPrice(data[coinId]?.usd || null)
    } catch (err) {
      console.error('Error fetching price:', err)
      setError('Unable to fetch price')
    } finally {
      setLoading(false)
    }
  }

  if (loading && price === null) {
    return (
      <div className={`text-white/60 text-sm ${className}`}>
        Loading price...
      </div>
    )
  }

  if (error && price === null) {
    return (
      <div className={`text-white/40 text-xs ${className}`}>
        {error}
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="text-white/60 text-xs mb-1">Current {symbol} Price</div>
      <div className="text-white text-lg font-semibold">
        ${price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}
      </div>
    </div>
  )
}
