'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
  MouseEventParams,
} from 'lightweight-charts'

type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'
type Indicator = 'RSI' | 'MACD' | 'none'

interface LightweightPriceChartProps {
  symbol: string // e.g., "BINANCE:SOLUSDT"
  interval?: Interval
  height?: number
  theme?: 'light' | 'dark'
  showVolume?: boolean
  className?: string
}

// Calculate RSI indicator
function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return []
  
  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []
  
  // Calculate initial average gain and loss
  for (let i = 1; i < period + 1; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  let avgGain = gains.reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period
  
  // Calculate first RSI
  if (avgLoss === 0) {
    rsi.push(100)
  } else {
    const rs = avgGain / avgLoss
    rsi.push(100 - (100 / (1 + rs)))
  }
  
  // Calculate subsequent RSI values
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    
    if (avgLoss === 0) {
      rsi.push(100)
    } else {
      const rs = avgGain / avgLoss
      rsi.push(100 - (100 / (1 + rs)))
    }
  }
  
  return rsi
}

// Fetch OHLC data from Binance API
async function fetchBinanceOHLC(
  symbol: string,
  interval: string = '1d'
): Promise<{
  candlestickData: CandlestickData[]
  volumeData: HistogramData[]
}> {
  // Strip "BINANCE:" prefix if present
  const cleanSymbol = symbol.replace(/^BINANCE:/i, '').toUpperCase()

  const url = `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=100`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch data from Binance: ${response.statusText}`)
  }

  const klines: (string | number)[][] = await response.json()

  const candlestickData: CandlestickData[] = []
  const volumeData: HistogramData[] = []

  for (const kline of klines) {
    // Binance response format: [openTime, open, high, low, close, volume, closeTime, ...]
    const openTime = Number(kline[0])
    const open = parseFloat(String(kline[1]))
    const high = parseFloat(String(kline[2]))
    const low = parseFloat(String(kline[3]))
    const close = parseFloat(String(kline[4]))
    const volume = parseFloat(String(kline[5]))

    // Convert milliseconds to UNIX seconds (Lightweight Charts best practice)
    const time = Math.floor(openTime / 1000) as Time

    // Determine color based on price movement
    const color = close >= open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'

    candlestickData.push({
      time,
      open,
      high,
      low,
      close,
    })

    volumeData.push({
      time,
      value: volume,
      color,
    })
  }

  return { candlestickData, volumeData }
}

export default function LightweightPriceChart({
  symbol,
  interval: initialInterval = '1h',
  height = 500,
  theme = 'dark',
  showVolume = true,
  className = '',
}: LightweightPriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram', Time> | null>(null)
  const rsiSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const [interval, setInterval] = useState<Interval>(initialInterval)
  const [indicator, setIndicator] = useState<Indicator>('RSI')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showDisplayOptions, setShowDisplayOptions] = useState(false)
  const [tooltipData, setTooltipData] = useState<{
    price: string
    time: string
    visible: boolean
    x: number
    y: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isDark = theme === 'dark'
  const backgroundColor = isDark ? '#0f172a' : '#ffffff'
  const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const upColor = '#10b981'
  const downColor = '#ef4444'

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Wait for container to have width before creating chart
    const initChart = () => {
      if (!chartContainerRef.current) return

      // Ensure container has width
      const containerWidth = chartContainerRef.current.clientWidth || chartContainerRef.current.offsetWidth || 800
      if (containerWidth === 0) {
        // Retry if container doesn't have width yet
        requestAnimationFrame(initChart)
        return
      }

      setError(null)
      setIsLoading(true)

      const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: backgroundColor },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor, visible: false },
        horzLines: { color: gridColor, visible: true, style: 1 },
      },
      rightPriceScale: {
        borderColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerWidth,
      height,
      crosshair: {
        mode: 1, // Normal
        vertLine: { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', width: 1, style: 0 },
        horzLine: { color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', width: 1, style: 0 },
      },
    })

    chartRef.current = chart

    // Candlestick series (v5+ way)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: true,
      wickUpColor: upColor,
      wickDownColor: downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
    })

    candlestickSeriesRef.current = candlestickSeries

    // Volume series (optional)
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Separate hidden scale for volume (cleaner visuals)
      })

      volumeSeriesRef.current = volumeSeries
    }

    // Fetch and load real data from Binance
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const { candlestickData, volumeData } = await fetchBinanceOHLC(symbol, interval)
        
        if (candlestickData.length === 0) {
          throw new Error('No data received from Binance')
        }

        candlestickSeries.setData(candlestickData)

        if (showVolume && volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumeData)
        }

        // Calculate and add RSI if indicator is enabled
        if (indicator === 'RSI' && candlestickData.length > 14) {
          const closes = candlestickData.map(d => d.close)
          const rsiValues = calculateRSI(closes, 14)
          
          // Create RSI data points (skip first 14 points as RSI needs history)
          const rsiData: LineData[] = []
          for (let i = 14; i < candlestickData.length; i++) {
            rsiData.push({
              time: candlestickData[i].time,
              value: rsiValues[i - 14],
            })
          }

          if (rsiData.length > 0) {
            if (!rsiSeriesRef.current) {
              // Create RSI series in a separate pane
              const rsiSeries = chart.addSeries(LineSeries, {
                color: '#a855f7',
                lineWidth: 2,
                priceScaleId: 'rsi',
                priceFormat: {
                  type: 'price',
                  precision: 2,
                  minMove: 0.01,
                },
              })
              rsiSeriesRef.current = rsiSeries
              
              // Configure RSI price scale (0-100 range)
              chart.priceScale('rsi').applyOptions({
                scaleMargins: {
                  top: 0.8,
                  bottom: 0,
                },
                borderVisible: false,
              })
            }
            
            rsiSeriesRef.current.setData(rsiData)
          }
        } else if (rsiSeriesRef.current && indicator !== 'RSI') {
          // Remove RSI series if indicator is disabled
          chart.removeSeries(rsiSeriesRef.current)
          rsiSeriesRef.current = null
        }
        
        setIsLoading(false)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load chart data'
        console.error('Error fetching Binance data:', error)
        setError(errorMessage)
        setIsLoading(false)
      }
    }

    loadData()

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (
        !param.point ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > height ||
        !param.time
      ) {
        setTooltipData(null)
        return
      }

      const data = param.seriesData.get(candlestickSeries) as CandlestickData | undefined
      if (!data) {
        setTooltipData(null)
        return
      }

      let timeStr = ''
      if (typeof param.time === 'string') {
        timeStr = param.time
      } else if (typeof param.time === 'number') {
        timeStr = new Date(param.time * 1000).toLocaleDateString()
      }

      const price = data.close.toFixed(2)
      setTooltipData({
        price: `$${price}`,
        time: timeStr,
        visible: true,
        x: param.point.x,
        y: param.point.y,
      })
    })

      // Resize handling
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
        }
      }

      resizeObserverRef.current = new ResizeObserver(handleResize)
      resizeObserverRef.current.observe(chartContainerRef.current)
    }

    // Initialize chart
    initChart()

    // Cleanup function for useEffect
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [symbol, interval, indicator, height, theme, showVolume, backgroundColor, textColor, gridColor, borderColor, isDark])

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!chartContainerRef.current) return

    if (!isFullscreen) {
      if (chartContainerRef.current.requestFullscreen) {
        chartContainerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDisplayOptions && !(event.target as Element).closest('.relative')) {
        setShowDisplayOptions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDisplayOptions])

  // Screenshot functionality - uses browser's print/screenshot capabilities
  const takeScreenshot = () => {
    // Note: For full screenshot functionality, you may want to install html2canvas
    // For now, this triggers browser's native screenshot (Cmd/Ctrl + Shift + S on some browsers)
    // or users can use browser dev tools
    if (chartContainerRef.current) {
      // Try to use canvas if available
      const canvas = chartContainerRef.current.querySelector('canvas')
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.download = `${cleanSymbol}-${interval}-${new Date().toISOString()}.png`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          }
        })
      }
    }
  }

  const intervals: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']
  const cleanSymbol = symbol.replace(/^BINANCE:/i, '').toUpperCase()

  return (
    <div className={`relative w-full ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background-dark' : ''}`}>
      {/* Chart Controls Header */}
      <div className="flex items-center justify-between mb-2 px-2 py-1 bg-background-darker/50 rounded-t-lg border-b border-white/10">
        {/* Left: Timeframe Selector */}
        <div className="flex items-center gap-1">
          {intervals.map((int) => (
            <button
              key={int}
              onClick={() => setInterval(int)}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                interval === int
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {int}
            </button>
          ))}
        </div>

        {/* Center: Symbol Info */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-300 font-medium">{cleanSymbol}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{interval}</span>
          {indicator !== 'none' && (
            <>
              <span className="text-slate-500">·</span>
              <span className="text-purple-400">{indicator}</span>
            </>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Indicators Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDisplayOptions(!showDisplayOptions)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all"
            >
              f Indicators
            </button>
            {showDisplayOptions && (
              <div className="absolute right-0 top-full mt-1 bg-background-darker border border-white/20 rounded-lg shadow-xl z-20 min-w-[120px]">
                <button
                  onClick={() => {
                    setIndicator('RSI')
                    setShowDisplayOptions(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-all ${
                    indicator === 'RSI' ? 'text-purple-400' : 'text-slate-300'
                  }`}
                >
                  RSI
                </button>
                <button
                  onClick={() => {
                    setIndicator('none')
                    setShowDisplayOptions(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-all ${
                    indicator === 'none' ? 'text-purple-400' : 'text-slate-300'
                  }`}
                >
                  None
                </button>
              </div>
            )}
          </div>

          {/* Settings Icon */}
          <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Screenshot Icon */}
          <button
            onClick={takeScreenshot}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all"
            title="Take Screenshot"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Fullscreen Icon */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" style={{ minHeight: height }} />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-darker/80 rounded-lg">
          <div className="text-slate-400 text-sm">Loading chart data...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-darker/80 rounded-lg">
          <div className="text-red-400 text-sm text-center px-4">
            <div className="font-semibold mb-1">Error loading chart</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      )}

      {tooltipData && tooltipData.visible && (
        <div
          className="absolute pointer-events-none z-10 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-xl border border-slate-700/50 whitespace-nowrap"
          style={{
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y - 50}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-emerald-400 font-semibold">{tooltipData.price}</div>
          <div className="text-slate-300">{tooltipData.time}</div>
        </div>
      )}
    </div>
  )
}