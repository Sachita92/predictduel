'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  MouseEventParams,
} from 'lightweight-charts'

interface LightweightPriceChartProps {
  symbol: string // e.g., "BINANCE:SOLUSDT"
  interval?: '1d'  
  height?: number
  theme?: 'light' | 'dark'
  showVolume?: boolean
  className?: string
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
  height = 500,
  theme = 'dark',
  showVolume = true, // changed default to true for better visuals
  className = '',
}: LightweightPriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick', Time> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram', Time> | null>(null)
  const [tooltipData, setTooltipData] = useState<{
    price: string
    time: string
    visible: boolean
    x: number
    y: number
  } | null>(null)

  const isDark = theme === 'dark'
  const backgroundColor = isDark ? '#0f172a' : '#ffffff'
  const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const upColor = '#10b981'
  const downColor = '#ef4444'

  useEffect(() => {
    if (!chartContainerRef.current) return

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
      width: chartContainerRef.current.clientWidth,
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
        const { candlestickData, volumeData } = await fetchBinanceOHLC(symbol)
        candlestickSeries.setData(candlestickData)

        if (showVolume && volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumeData)
        }
      } catch (error) {
        console.error('Error fetching Binance data:', error)
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

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [symbol, height, theme, showVolume]) // removed redundant deps

  return (
    <div className={`relative w-full ${className}`}>
      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" />

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