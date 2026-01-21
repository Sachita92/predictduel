'use client'

import { useState } from 'react'

interface TradingViewPriceChartProps {
  symbol: string // e.g., 'BINANCE:SOLUSDT', 'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'
  height?: number
  className?: string
}

type Timeframe = '1' | '5' | '60' | 'D'

export default function TradingViewPriceChart({
  symbol,
  height = 500,
  className = '',
}: TradingViewPriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('60') // Default to 1h

  const params = new URLSearchParams({
    symbol: symbol,
    interval: timeframe,
    theme: 'light', // Changed to light theme to match website better
    style: '1',
    locale: 'en',
    toolbar_bg: '1E293B', // background-darker color
    enable_publishing: 'false',
    withdateranges: 'false',
    range: '1d',
    hide_side_toolbar: 'true', // Hide drawing tools sidebar
    allow_symbol_change: 'false',
    save_image: 'false',
    calendar: 'false',
    support_host: 'https://www.tradingview.com',
  })

  const iframeSrc = `https://www.tradingview.com/widgetembed/?${params.toString()}`
  const iframeKey = `${symbol}-${timeframe}` // Key forces remount on change

  const timeframeLabels: Record<Timeframe, string> = {
    '1': '1m',
    '5': '5m',
    '60': '1h',
    'D': '1d',
  }

  return (
    <div className={`relative ${className}`}>
      {/* Header - Clarify this is for price context only */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white/60 mb-1">Market Price (Reference Only)</h3>
        <p className="text-xs text-white/40">Real asset price for context. Not used for probabilities.</p>
      </div>
      
      {/* Timeframe Selector */}
      <div className="flex gap-2 mb-4 justify-end">
        {(['1', '5', '60', 'D'] as Timeframe[]).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeframe === tf
                ? 'bg-primary-from text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {timeframeLabels[tf]}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div
        className="w-full rounded-lg overflow-hidden bg-background-darker"
        style={{ height: `${height}px` }}
      >
        <iframe
          key={iframeKey}
          src={iframeSrc}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          allowFullScreen
          title="TradingView Chart"
        />
      </div>
    </div>
  )
}
