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
  height?: number
  theme?: 'light' | 'dark'
  showVolume?: boolean
  className?: string
}

// Mock candlestick data generator
function generateMockCandlestickData(count: number = 30): CandlestickData[] {
  const data: CandlestickData[] = []
  const basePrice = 180
  let currentPrice = basePrice

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - count)

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0] as Time

    const volatility = 5 + Math.random() * 10
    const trend = (Math.random() - 0.45) * 2
    const change = trend + (Math.random() - 0.5) * volatility

    const open = currentPrice
    const close = open + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5

    data.push({
      time: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    })

    currentPrice = close
  }

  return data
}

// Mock volume data generator
function generateMockVolumeData(count: number = 30): HistogramData[] {
  const data: HistogramData[] = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - count)

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0] as Time

    const volume = 1000000 + Math.random() * 5000000
    const color = Math.random() > 0.5 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'

    data.push({
      time: dateStr,
      value: Number(volume.toFixed(0)),
      color,
    })
  }

  return data
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
        priceScaleId: 'right', // or create custom scale if needed
      })

      volumeSeriesRef.current = volumeSeries

      // Position volume at bottom
      chart.priceScale('right').applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 }, // adjust as needed
        borderVisible: false,
      })
    }

    // Load mock data (replace with real fetch later)
    const candlestickData = generateMockCandlestickData(60) // more bars for better look
    candlestickSeries.setData(candlestickData)

    if (showVolume && volumeSeriesRef.current) {
      const volumeData = generateMockVolumeData(60)
      volumeSeriesRef.current.setData(volumeData)
    }

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