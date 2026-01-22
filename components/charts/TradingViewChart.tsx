'use client'

interface TradingViewChartProps {
  symbol: string // e.g., "BINANCE:SOLUSDT"
  height?: number
  theme?: 'light' | 'dark'
  className?: string
}

export default function TradingViewChart({
  symbol,
  height = 500,
  theme = 'dark',
  className = '',
}: TradingViewChartProps) {
  // Build TradingView widgetembed URL
  // Using the lightweight widget embed iframe (read-only price context)
  // Note: widgetembed has limited customization, but provides clean price data
  const widgetUrl = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    symbol
  )}&interval=D&theme=${theme}&style=3&locale=en&hide_top_toolbar=0&hide_legend=0&save_image=0&toolbar_bg=${
    theme === 'dark' ? '1e293b' : 'ffffff'
  }&hide_volume=0&withdateranges=0&studies=`

  return (
    <div className={`relative w-full ${className}`} style={{ height: `${height}px` }}>
      <iframe
        src={widgetUrl}
        className="w-full h-full border-0 rounded-lg"
        title="TradingView Chart"
        allow="clipboard-write"
        loading="lazy"
        style={{
          // Ensure iframe doesn't interfere with overlay
          pointerEvents: 'auto',
        }}
      />
    </div>
  )
}
