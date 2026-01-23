'use client'

import { useState, useEffect } from 'react'
import LightweightPriceChart from './LightweightPriceChart'
import ProbabilityOverlay from './ProbabilityOverlay'

interface PredictionMarketChartProps {
  symbol?: string // Chart symbol identifier, e.g., "BINANCE:SOLUSDT"
  yesLiquidity: number
  noLiquidity: number
  height?: number
  theme?: 'light' | 'dark'
  className?: string
}

export default function PredictionMarketChart({
  symbol = 'BINANCE:SOLUSDT',
  yesLiquidity,
  noLiquidity,
  height = 500,
  theme = 'dark',
  className = '',
}: PredictionMarketChartProps) {
  // Detect theme from system preference or use provided theme
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(theme)

  useEffect(() => {
    // If theme is not explicitly provided, detect from system
    if (theme === 'dark') {
      // Check for system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
      const handleChange = (e: MediaQueryListEvent) => {
        setCurrentTheme(e.matches ? 'light' : 'dark')
      }

      // Set initial theme
      setCurrentTheme(mediaQuery.matches ? 'light' : 'dark')

      // Listen for changes
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      setCurrentTheme(theme)
    }
  }, [theme])

  return (
    <div className={`w-full rounded-lg overflow-hidden bg-background-darker ${className}`}>
      {/* Lightweight Price Chart */}
      <div className="w-full">
        <LightweightPriceChart
          symbol={symbol}
          height={height}
          theme={currentTheme}
          showVolume={false}
          className="w-full"
        />
      </div>

      {/* Probability Overlay - Below Chart */}
      <div className="mt-4">
        <ProbabilityOverlay
          yesLiquidity={yesLiquidity}
          noLiquidity={noLiquidity}
        />
      </div>
    </div>
  )
}
