'use client'

import { useEffect, useRef, useState } from 'react'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>('60') // Default to 1h
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear container
    containerRef.current.innerHTML = ''

    // Create iframe for TradingView widget embed
    // Using TradingView's official widget embed (read-only, no trading buttons)
    const iframe = document.createElement('iframe')
    const params = new URLSearchParams({
      symbol: symbol,
      interval: timeframe,
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '0a0a0a',
      enable_publishing: 'false',
      withdateranges: 'false',
      range: '1d',
      hide_side_toolbar: 'false',
      allow_symbol_change: 'false',
      save_image: 'false',
      calendar: 'false',
      support_host: 'https://www.tradingview.com',
    })

    iframe.src = `https://www.tradingview.com/widgetembed/?${params.toString()}`
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.allowFullscreen = true
    iframe.onload = () => setIsLoading(false)
    iframe.onerror = () => {
      setIsLoading(false)
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-white/60">Failed to load chart</div>'
      }
    }

    containerRef.current.appendChild(iframe)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbol, timeframe])

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf)
  }

  const timeframeLabels: Record<Timeframe, string> = {
    '1': '1m',
    '5': '5m',
    '60': '1h',
    'D': '1d',
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timeframe Selector */}
      <div className="flex gap-2 mb-4 justify-end">
        {(['1', '5', '60', 'D'] as Timeframe[]).map((tf) => (
          <button
            key={tf}
            onClick={() => handleTimeframeChange(tf)}
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
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden bg-background-darker"
        style={{ height: `${height}px` }}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full bg-background-darker">
            <div className="text-white/60">Loading chart...</div>
          </div>
        )}
      </div>
    </div>
  )
}
