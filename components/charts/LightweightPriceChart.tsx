'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Eye, EyeOff, Settings, Trash2, MoreVertical } from 'lucide-react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  AreaData,
  BaselineData,
  Time,
  MouseEventParams,
} from 'lightweight-charts'

type Interval = '1s' | '15s' | '30s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '8h' | '12h' | '1d' | '1w' | '1M'
type TimeRange = '5y' | '1y' | '6m' | '3m' | '1m' | '5d' | '1d'
type Indicator = 'RSI' | 'MACD' | 'none' | string
type ChartType = 'Bars' | 'Candles' | 'Hollow Candles' | 'Line' | 'Line with markers' | 'Step line' | 'Area' | 'HLC area' | 'Baseline' | 'Columns' | 'High-low' | 'Heikin Ashi'

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

// Calculate milliseconds for time range
function getTimeRangeMs(timeRange: TimeRange): number {
  const now = Date.now()
  switch (timeRange) {
    case '5y':
      return now - 5 * 365 * 24 * 60 * 60 * 1000
    case '1y':
      return now - 365 * 24 * 60 * 60 * 1000
    case '6m':
      return now - 6 * 30 * 24 * 60 * 60 * 1000
    case '3m':
      return now - 3 * 30 * 24 * 60 * 60 * 1000
    case '1m':
      return now - 30 * 24 * 60 * 60 * 1000
    case '5d':
      return now - 5 * 24 * 60 * 60 * 1000
    case '1d':
      return now - 24 * 60 * 60 * 1000
    default:
      return now - 365 * 24 * 60 * 60 * 1000 // Default to 1 year
  }
}

// Automatically determine optimal time range based on interval
// This prevents fetching excessive data for small intervals (e.g., 1-minute candles)
function getOptimalTimeRange(interval: Interval): TimeRange {
  switch (interval) {
    case '1s':
    case '15s':
    case '30s':
    case '1m':
      return '1d' // 1 day for 1-minute intervals (max ~1,440 candles)
    case '3m':
    case '5m':
      return '5d' // 5 days (max ~2,400 candles)
    case '15m':
    case '30m':
      return '1m' // 1 month (max ~2,880 candles)
    case '1h':
    case '2h':
    case '4h':
    case '8h':
    case '12h':
      return '3m' // 3 months (max ~2,160 candles)
    case '1d':
      return '1y' // 1 year (365 candles)
    case '1w':
    case '1M':
      return '5y' // 5 years
    default:
      return '1y'
  }
}

// Data cache for fetched OHLC data
interface CacheEntry {
  data: {
    candlestickData: CandlestickData[]
    volumeData: HistogramData[]
  }
  timestamp: number
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const dataCache = new Map<string, CacheEntry>()

// Clean expired cache entries (runs periodically)
function cleanExpiredCache() {
  const now = Date.now()
  Array.from(dataCache.entries()).forEach(([key, entry]) => {
    if (now >= entry.timestamp + CACHE_DURATION) {
      dataCache.delete(key)
    }
  })
}

// Fetch OHLC data from Binance API with time range support and caching
async function fetchBinanceOHLC(
  symbol: string,
  interval: string = '1d',
  timeRange: TimeRange = '1y',
  signal?: AbortSignal
): Promise<{
  candlestickData: CandlestickData[]
  volumeData: HistogramData[]
}> {
  // Validate inputs
  if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
    throw new Error(`Invalid symbol: ${symbol}. Symbol must be a non-empty string.`)
  }

  if (!interval || typeof interval !== 'string') {
    throw new Error(`Invalid interval: ${interval}. Interval must be a non-empty string.`)
  }

  // Strip "BINANCE:" prefix if present
  const cleanSymbol = symbol.replace(/^BINANCE:/i, '').toUpperCase().trim()
  
  if (!cleanSymbol || cleanSymbol.length === 0) {
    throw new Error(`Invalid symbol after processing: ${symbol}`)
  }

  // Check cache first
  const cacheKey = `${cleanSymbol}-${interval}-${timeRange}`
  const cached = dataCache.get(cacheKey)
  if (cached && Date.now() < cached.timestamp + CACHE_DURATION) {
    // Return cached data if not expired
    return cached.data
  }

  // Clean expired entries periodically
  cleanExpiredCache()

  // Check if request was aborted before fetching
  if (signal?.aborted) {
    throw new DOMException('Request aborted', 'AbortError')
  }

  const startTime = getTimeRangeMs(timeRange)
  const endTime = Date.now()
  
  // Binance API limit is 1000 candles per request
  // We'll fetch in batches if needed
  const allKlines: (string | number)[][] = []
  let currentStartTime = startTime
  const maxLimit = 1000

  while (currentStartTime < endTime) {
    // Check if request was aborted before each fetch
    if (signal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError')
    }

    const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(cleanSymbol)}&interval=${encodeURIComponent(interval)}&startTime=${currentStartTime}&endTime=${endTime}&limit=${maxLimit}`

    const response = await fetch(url, { signal })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch data from Binance: ${response.statusText} - ${errorText}`)
    }

    const responseData = await response.json()
    
    // Check if response is an error object
    if (responseData && typeof responseData === 'object' && 'code' in responseData && 'msg' in responseData) {
      throw new Error(`Binance API error: ${responseData.msg} (code: ${responseData.code})`)
    }
    
    // Ensure response is an array
    if (!Array.isArray(responseData)) {
      throw new Error(`Invalid response format from Binance API: expected array, got ${typeof responseData}`)
    }
    
    const klines: (string | number)[][] = responseData
    
    if (klines.length === 0) break
    
    allKlines.push(...klines)
    
    // If we got less than maxLimit, we've reached the end
    if (klines.length < maxLimit) break
    
    // Update startTime to the last candle's close time + 1ms
    const lastCandle = klines[klines.length - 1]
    if (!lastCandle || !Array.isArray(lastCandle) || lastCandle.length < 7) {
      break // Invalid candle data, stop fetching
    }
    const closeTime = lastCandle[6]
    if (closeTime === undefined || closeTime === null || typeof closeTime !== 'number') {
      break // Invalid closeTime, stop fetching
    }
    currentStartTime = Number(closeTime) + 1 // closeTime is at index 6
  }

  const klines = allKlines

  if (klines.length === 0) {
    throw new Error(`No data received from Binance for symbol ${cleanSymbol}. Please check if the symbol is valid.`)
  }

  const candlestickData: CandlestickData[] = []
  const volumeData: HistogramData[] = []

  for (const kline of klines) {
    // Validate kline structure
    if (!Array.isArray(kline) || kline.length < 6) {
      console.warn('Invalid kline data:', kline)
      continue // Skip invalid data
    }

    // Binance response format: [openTime, open, high, low, close, volume, closeTime, ...]
    // Safely access array indices
    const openTime = kline[0]
    const open = kline[1]
    const high = kline[2]
    const low = kline[3]
    const close = kline[4]
    const volume = kline[5]

    // Validate all required values exist and are not null/undefined
    if (openTime === undefined || openTime === null ||
        open === undefined || open === null ||
        high === undefined || high === null ||
        low === undefined || low === null ||
        close === undefined || close === null ||
        volume === undefined || volume === null) {
      console.warn('Missing or null data in kline:', { kline, openTime, open, high, low, close, volume })
      continue // Skip invalid data
    }

    const openTimeNum = Number(openTime)
    const openNum = parseFloat(String(open))
    const highNum = parseFloat(String(high))
    const lowNum = parseFloat(String(low))
    const closeNum = parseFloat(String(close))
    const volumeNum = parseFloat(String(volume))

    // Validate parsed numbers
    if (isNaN(openTimeNum) || isNaN(openNum) || isNaN(highNum) || 
        isNaN(lowNum) || isNaN(closeNum) || isNaN(volumeNum)) {
      console.warn('Invalid number in kline:', kline)
      continue // Skip invalid data
    }

    // Convert milliseconds to UNIX seconds (Lightweight Charts best practice)
    const time = Math.floor(openTimeNum / 1000) as Time

    // Determine color based on price movement
    const color = closeNum >= openNum ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'

    candlestickData.push({
      time,
      open: openNum,
      high: highNum,
      low: lowNum,
      close: closeNum,
    })

    volumeData.push({
      time,
      value: volumeNum,
      color,
    })
  }

  // Store in cache before returning
  const result = { candlestickData, volumeData }
  dataCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  })

  return result
}

// Convert candlestick data to different chart formats
function convertToLineData(candlestickData: CandlestickData[]): LineData[] {
  return candlestickData.map(d => ({ time: d.time, value: d.close }))
}

function convertToAreaData(candlestickData: CandlestickData[]): AreaData[] {
  return candlestickData.map(d => ({ time: d.time, value: d.close }))
}

function convertToBaselineData(candlestickData: CandlestickData[]): BaselineData[] {
  const firstClose = candlestickData[0]?.close || 0
  return candlestickData.map(d => ({ time: d.time, value: d.close, baselineValue: firstClose }))
}

function convertToBarData(candlestickData: CandlestickData[]): HistogramData[] {
  return candlestickData.map(d => ({
    time: d.time,
    value: d.close,
    color: d.close >= d.open ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)',
  }))
}

function convertToHighLowData(candlestickData: CandlestickData[]): LineData[] {
  return candlestickData.map(d => ({ time: d.time, value: d.high }))
}

// Calculate Heikin Ashi candlesticks
function calculateHeikinAshi(candlestickData: CandlestickData[]): CandlestickData[] {
  if (candlestickData.length === 0) return []
  
  const haData: CandlestickData[] = []
  const first = candlestickData[0]
  
  let haClose = (first.open + first.high + first.low + first.close) / 4
  let haOpen = (first.open + first.close) / 2
  let haHigh = first.high
  let haLow = first.low
  
  haData.push({
    time: first.time,
    open: haOpen,
    high: haHigh,
    low: haLow,
    close: haClose,
  })
  
  for (let i = 1; i < candlestickData.length; i++) {
    const prev = haData[i - 1]
    const curr = candlestickData[i]
    
    haClose = (curr.open + curr.high + curr.low + curr.close) / 4
    haOpen = (prev.open + prev.close) / 2
    haHigh = Math.max(curr.high, haOpen, haClose)
    haLow = Math.min(curr.low, haOpen, haClose)
    
    haData.push({
      time: curr.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    })
  }
  
  return haData
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
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Line' | 'Area' | 'Baseline' | 'Histogram', Time> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram', Time> | null>(null)
  const rsiSeriesRef = useRef<ISeriesApi<'Line', Time> | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [interval, setInterval] = useState<Interval>(initialInterval)
  // Automatically set optimal timeRange based on interval
  const [timeRange, setTimeRange] = useState<TimeRange>(() => getOptimalTimeRange(initialInterval))
  const [indicator, setIndicator] = useState<Indicator>('none')
  const [chartType, setChartType] = useState<ChartType>('Candles')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showDisplayOptions, setShowDisplayOptions] = useState(false)
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false)
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false)
  const [indicatorSearch, setIndicatorSearch] = useState('')
  const [tooltipData, setTooltipData] = useState<{
    price: string
    time: string
    visible: boolean
    x: number
    y: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([])
  const [volumeData, setVolumeData] = useState<HistogramData[]>([])
  const [rsiPeriod, setRsiPeriod] = useState<number>(14)
  const [rsiVisible, setRsiVisible] = useState<boolean>(true)
  const [indicatorToolbar, setIndicatorToolbar] = useState<{
    visible: boolean
    x: number
    y: number
    indicator: string
  } | null>(null)
  const [showRsiSettings, setShowRsiSettings] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [timezone, setTimezone] = useState<string>(() => {
    // Default to user's local timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  const settingsMenuRef = useRef<HTMLDivElement>(null)

  const isDark = theme === 'dark'
  const backgroundColor = isDark ? '#0f172a' : '#ffffff'
  const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const upColor = '#10b981'
  const downColor = '#ef4444'

  // Automatically adjust timeRange when interval changes
  useEffect(() => {
    const optimalTimeRange = getOptimalTimeRange(interval)
    if (timeRange !== optimalTimeRange) {
      setTimeRange(optimalTimeRange)
    }
  }, [interval]) // Only depend on interval to avoid infinite loops

  // Helper function to format time with timezone
  const formatTimeWithTimezone = useCallback((timestamp: number): string => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [timezone])

  // Update chart localization when timezone changes
  useEffect(() => {
    if (chartRef.current) {
      const timeFormatter = (businessDayOrTimestamp: number) => {
        const date = new Date(businessDayOrTimestamp * 1000)
        return date.toLocaleString('en-US', {
          timeZone: timezone,
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      }
      
      chartRef.current.applyOptions({
        localization: {
          timeFormatter: timeFormatter,
        },
      })
    }
  }, [timezone])

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false)
      }
    }
    
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettingsMenu])

  // Memoize RSI calculation
  const rsiData = useMemo(() => {
    if (indicator !== 'RSI' || !candlestickData || candlestickData.length <= rsiPeriod) {
      return null
    }
    
    const closes = candlestickData.map(d => d.close)
    const rsiValues = calculateRSI(closes, rsiPeriod)
    
    // Create RSI data points (skip first 14 points as RSI needs history)
    const rsiDataPoints: LineData[] = []
    for (let i = rsiPeriod; i < candlestickData.length; i++) {
      rsiDataPoints.push({
        time: candlestickData[i].time,
        value: rsiValues[i - rsiPeriod],
      })
    }
    
    return rsiDataPoints.length > 0 ? rsiDataPoints : null
  }, [indicator, candlestickData, rsiPeriod])

  // Memoize Heikin Ashi calculation
  const heikinAshiData = useMemo(() => {
    if (chartType !== 'Heikin Ashi' || !candlestickData || candlestickData.length === 0) {
      return null
    }
    
    return calculateHeikinAshi(candlestickData)
  }, [chartType, candlestickData])

  useEffect(() => {
    // Don't initialize if symbol is missing
    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
      setError('Symbol is required to load chart data')
      setIsLoading(false)
      return
    }

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

      // Create custom time formatter for the selected timezone
      const timeFormatter = (businessDayOrTimestamp: number) => {
        const date = new Date(businessDayOrTimestamp * 1000)
        return date.toLocaleString('en-US', {
          timeZone: timezone,
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      }

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
      localization: {
        timeFormatter: timeFormatter,
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

    // Function to create/update main series based on chart type
    const createMainSeries = (type: ChartType, data: CandlestickData[]) => {
      // Remove existing main series if any
      try {
        if (mainSeriesRef.current && chart) {
        chart.removeSeries(mainSeriesRef.current)
        mainSeriesRef.current = null
      }
      } catch (error) {
        console.warn('Error removing main series:', error)
        mainSeriesRef.current = null
      }
      
      try {
        if (candlestickSeriesRef.current && chart) {
        chart.removeSeries(candlestickSeriesRef.current)
          candlestickSeriesRef.current = null
        }
      } catch (error) {
        console.warn('Error removing candlestick series:', error)
        candlestickSeriesRef.current = null
      }

      if (!data || data.length === 0) {
        console.warn('No data provided to createMainSeries')
        return null
      }

      let series: ISeriesApi<any, Time> | null = null

      switch (type) {
        case 'Candles':
          series = chart.addSeries(CandlestickSeries, {
            upColor,
            downColor,
            borderVisible: true,
            wickUpColor: upColor,
            wickDownColor: downColor,
            borderUpColor: upColor,
            borderDownColor: downColor,
          })
          candlestickSeriesRef.current = series as ISeriesApi<'Candlestick', Time>
          if (series && data.length > 0) {
          series.setData(data)
          }
          break

        case 'Hollow Candles':
          // Hollow candles: up candles are hollow, down candles are filled
          series = chart.addSeries(CandlestickSeries, {
            upColor: 'transparent',
            downColor,
            borderVisible: true,
            wickUpColor: upColor,
            wickDownColor: downColor,
            borderUpColor: upColor,
            borderDownColor: downColor,
          })
          candlestickSeriesRef.current = series as ISeriesApi<'Candlestick', Time>
          if (series && data.length > 0) {
          series.setData(data)
          }
          break

        case 'Heikin Ashi':
          const haData = calculateHeikinAshi(data)
          series = chart.addSeries(CandlestickSeries, {
            upColor,
            downColor,
            borderVisible: true,
            wickUpColor: upColor,
            wickDownColor: downColor,
            borderUpColor: upColor,
            borderDownColor: downColor,
          })
          candlestickSeriesRef.current = series as ISeriesApi<'Candlestick', Time>
          if (series && haData.length > 0) {
          series.setData(haData)
          }
          break

        case 'Line':
        case 'Line with markers':
        case 'Step line':
          series = chart.addSeries(LineSeries, {
            color: upColor,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: true,
            lineStyle: type === 'Step line' ? 2 : 0, // Step line style
            pointMarkersVisible: type === 'Line with markers',
          })
          const lineData = convertToLineData(data)
          if (series && lineData.length > 0) {
            series.setData(lineData)
          }
          break

        case 'Area':
        case 'HLC area':
          series = chart.addSeries(AreaSeries, {
            lineColor: upColor,
            topColor: upColor + '40',
            bottomColor: upColor + '00',
            lineWidth: 2,
          })
          const areaData = convertToAreaData(data)
          if (series && areaData.length > 0) {
            series.setData(areaData)
          }
          break

        case 'Baseline':
          series = chart.addSeries(BaselineSeries, {
            baseValue: { type: 'price', price: data[0]?.close || 0 },
            topLineColor: upColor,
            bottomLineColor: downColor,
            topFillColor1: upColor + '40',
            topFillColor2: upColor + '00',
            bottomFillColor1: downColor + '40',
            bottomFillColor2: downColor + '00',
            lineWidth: 2,
          })
          const baselineData = convertToBaselineData(data)
          if (series && baselineData.length > 0) {
            series.setData(baselineData)
          }
          break

        case 'Bars':
        case 'Columns':
          series = chart.addSeries(HistogramSeries, {
            color: upColor,
            priceFormat: { type: 'price' },
          })
          const barData = convertToBarData(data)
          if (series && barData.length > 0) {
            series.setData(barData)
          }
          break

        case 'High-low':
          series = chart.addSeries(LineSeries, {
            color: upColor,
            lineWidth: 1,
            priceLineVisible: false,
          })
          const highLowData = convertToHighLowData(data)
          if (series && highLowData.length > 0) {
            series.setData(highLowData)
          }
          break
      }

      mainSeriesRef.current = series
      return series
    }

    // Create initial series
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
    mainSeriesRef.current = candlestickSeries

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
      // Cancel any previous request
      if (abortControllerRef.current) { 
        abortControllerRef.current.abort()
      }

      // Create new AbortController for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        // Validate symbol before fetching
        if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
          throw new Error('Invalid symbol: Symbol is required and must be a non-empty string')
        }

        setIsLoading(true)
        setError(null)
        const binanceInterval = mapIntervalToBinance(interval)
        const { candlestickData: fetchedData, volumeData: fetchedVolume } = await fetchBinanceOHLC(
          symbol, 
          binanceInterval, 
          timeRange,
          abortController.signal
        )
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return // Don't update state if aborted
        }
        
        if (!fetchedData || fetchedData.length === 0) {
          throw new Error('No valid data received from Binance. The symbol may not exist or there may be no historical data available.')
        }

        // Store data in state for memoization
        setCandlestickData(fetchedData)
        setVolumeData(fetchedVolume)

        // Update main series based on chart type
        if (!chart || !chartRef.current) {
          throw new Error('Chart not initialized. Cannot set data.')
        }
        
        // Use regular data for initial load (memoized values will update via separate effect)
        createMainSeries(chartType, fetchedData)

        if (showVolume && volumeSeriesRef.current && fetchedVolume && fetchedVolume.length > 0) {
          volumeSeriesRef.current.setData(fetchedVolume)
        }

        // Use memoized RSI data if available
        if (indicator === 'RSI' && rsiData) {
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
          
          if (rsiSeriesRef.current && rsiData.length > 0) {
            rsiSeriesRef.current.setData(rsiData)
            // Apply visibility
            rsiSeriesRef.current.applyOptions({
              visible: rsiVisible,
            })
          }
        } else if (rsiSeriesRef.current && indicator !== 'RSI') {
          // Remove RSI series if indicator is disabled
          try {
            if (chart && rsiSeriesRef.current) {
              chart.removeSeries(rsiSeriesRef.current)
            }
          } catch (error) {
            console.warn('Error removing RSI series:', error)
          }
          rsiSeriesRef.current = null
        }
        
        setIsLoading(false)
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request cancelled')
          return
        }
        
        // Check if request was aborted before setting error
        if (abortController.signal.aborted) {
          return
        }
        
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
        // Hide indicator toolbar when crosshair is out of bounds
        if (indicatorToolbar) {
          setIndicatorToolbar(null)
        }
        return
      }

      // Check if hovering over RSI line
      if (indicator === 'RSI' && rsiSeriesRef.current && rsiVisible) {
        const rsiData = param.seriesData.get(rsiSeriesRef.current) as LineData | undefined
        if (rsiData && 'value' in rsiData && typeof rsiData.value === 'number') {
          // Show indicator toolbar
          const containerRect = chartContainerRef.current!.getBoundingClientRect()
          setIndicatorToolbar({
            visible: true,
            x: param.point.x + containerRect.left,
            y: param.point.y + containerRect.top - 50, // Position above the line
            indicator: 'RSI',
          })
        } else {
          // Only hide if we're not currently showing the toolbar (to prevent flicker)
          // The toolbar will hide when mouse leaves the line area
        }
      } else if (indicator !== 'RSI' || !rsiVisible) {
        // Hide toolbar if RSI is not active or not visible
        if (indicatorToolbar && indicatorToolbar.indicator === 'RSI') {
          setIndicatorToolbar(null)
        }
      }

      // Get data from main series (works with all chart types)
      const series = mainSeriesRef.current || candlestickSeriesRef.current
      if (!series) {
        setTooltipData(null)
        return
      }
      const data = param.seriesData.get(series) as CandlestickData | LineData | AreaData | BaselineData | HistogramData | undefined
      if (!data) {
        setTooltipData(null)
        return
      }

      let timeStr = ''
      if (typeof param.time === 'string') {
        timeStr = param.time
      } else if (typeof param.time === 'number') {
        // Format time with selected timezone
        const date = new Date(param.time * 1000)
        timeStr = date.toLocaleString('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      }

      // Extract price value based on data type
      let price: number | undefined
      if ('close' in data) {
        price = (data as CandlestickData).close
      } else if ('value' in data) {
        price = (data as LineData | AreaData | BaselineData | HistogramData).value
      } else {
        setTooltipData(null)
        return
      }
      
      if (price === undefined || price === null || isNaN(price)) {
        setTooltipData(null)
        return
      }
      
      const priceStr = price.toFixed(2)
      setTooltipData({
        price: `$${priceStr}`,
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
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [symbol, interval, timeRange, height, theme, showVolume, backgroundColor, textColor, gridColor, borderColor, isDark, timezone])

  // Separate effect to update chart when chart type or indicator changes (using memoized values)
  useEffect(() => {
    if (!chartRef.current || !candlestickData || candlestickData.length === 0) return

    const chart = chartRef.current

    // Update chart type with memoized Heikin Ashi if needed
    if (chartType === 'Heikin Ashi' && heikinAshiData) {
      // Remove existing series
      try {
        if (mainSeriesRef.current && chart) {
          chart.removeSeries(mainSeriesRef.current)
          mainSeriesRef.current = null
        }
        if (candlestickSeriesRef.current && chart) {
          chart.removeSeries(candlestickSeriesRef.current)
          candlestickSeriesRef.current = null
        }
      } catch (error) {
        console.warn('Error removing series:', error)
      }

      // Create new series with Heikin Ashi data
      const series = chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderVisible: true,
        wickUpColor: upColor,
        wickDownColor: downColor,
        borderUpColor: upColor,
        borderDownColor: downColor,
      })
      candlestickSeriesRef.current = series as ISeriesApi<'Candlestick', Time>
      mainSeriesRef.current = series
      if (series && heikinAshiData.length > 0) {
        series.setData(heikinAshiData)
      }
    }

    // Update RSI with memoized data
    if (indicator === 'RSI' && rsiData) {
      if (!rsiSeriesRef.current) {
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
        
        chart.priceScale('rsi').applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
          borderVisible: false,
        })
      }
      
      if (rsiSeriesRef.current && rsiData.length > 0) {
        rsiSeriesRef.current.setData(rsiData)
        rsiSeriesRef.current.applyOptions({
          visible: rsiVisible,
        })
      }
    } else if (rsiSeriesRef.current && indicator !== 'RSI') {
      try {
        if (chart && rsiSeriesRef.current) {
          chart.removeSeries(rsiSeriesRef.current)
        }
      } catch (error) {
        console.warn('Error removing RSI series:', error)
      }
      rsiSeriesRef.current = null
    }
  }, [chartType, indicator, heikinAshiData, rsiData, candlestickData, upColor, downColor, rsiVisible])

  // Update RSI visibility when rsiVisible changes
  useEffect(() => {
    if (rsiSeriesRef.current && indicator === 'RSI') {
      rsiSeriesRef.current.applyOptions({
        visible: rsiVisible,
      })
    }
  }, [rsiVisible, indicator])

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showDisplayOptions && !target.closest('[data-dropdown="indicators"]')) {
        setShowDisplayOptions(false)
      }
      if (showIntervalDropdown && !target.closest('[data-dropdown="intervals"]')) {
        setShowIntervalDropdown(false)
      }
      if (showChartTypeDropdown && !target.closest('[data-dropdown="chart-type"]')) {
        setShowChartTypeDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDisplayOptions, showIntervalDropdown, showChartTypeDropdown])

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
            const symbolName = symbol ? symbol.replace(/^BINANCE:/i, '').toUpperCase() : 'CHART'
            link.download = `${symbolName}-${interval}-${new Date().toISOString()}.png`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          }
        })
      }
    }
  }

  // Map interval to Binance API format (Binance doesn't support seconds, so map to 1m)
  const mapIntervalToBinance = (int: Interval): string => {
    if (int === '1s' || int === '15s' || int === '30s') return '1m' // Map seconds to 1m
    return int
  }

  // Favorite intervals to show as buttons
  const favoriteIntervals: Interval[] = ['1m', '30m', '1h']
  
  // All intervals organized by category
  const intervalCategories = {
    Seconds: ['1s', '15s', '30s'] as Interval[],
    Minutes: ['1m', '3m', '5m', '15m', '30m'] as Interval[],
    Hours: ['1h', '2h', '4h', '8h', '12h'] as Interval[],
    Days: ['1d', '1w', '1M'] as Interval[],
  }
  
  // Favorites with star indicator
  const favoriteSet = new Set(['1m', '30m', '1h'] as Interval[])
  
  // Available indicators list
  const availableIndicators = [
    '52 Week High/Low',
    'Accelerator Oscillator',
    'Accumulation/Distribution',
    'Accumulative Swing Index',
    'Advance/Decline',
    'Alligator',
    'Average Directional Index',
    'Average True Range',
    'Awesome Oscillator',
    'Bollinger Bands',
    'Chaikin Money Flow',
    'Chaikin Oscillator',
    'Commodity Channel Index',
    'Detrended Price Oscillator',
    'Directional Movement Index',
    'Ease of Movement',
    'Elder Force Index',
    'Envelope',
    'Fibonacci Retracement',
    'Ichimoku Cloud',
    'Keltner Channel',
    'MACD',
    'Mass Index',
    'Money Flow Index',
    'Moving Average',
    'On Balance Volume',
    'Parabolic SAR',
    'Price Channel',
    'Price Oscillator',
    'Pivot Points',
    'Rate of Change',
    'Relative Strength Index',
    'Stochastic',
    'Triple Exponential Moving Average',
    'Volume Oscillator',
    'Volume Profile',
    'Williams %R',
  ]
  
  // Filter indicators based on search
  const filteredIndicators = availableIndicators.filter(ind =>
    ind.toLowerCase().includes(indicatorSearch.toLowerCase())
  )
  
  const cleanSymbol = symbol.replace(/^BINANCE:/i, '').toUpperCase()

  return (
    <div className={`relative w-full ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-background-dark' : ''}`}>
      {/* Chart Controls Header - Jupiter Style */}
      <div className="flex items-center justify-between px-3 py-2 bg-transparent border-b border-white/5">
        {/* Left: Timeframe Selector - Compact with Dropdown */}
        <div className="flex items-center gap-0.5" data-dropdown="intervals">
          {/* Favorite intervals as buttons */}
          {favoriteIntervals.map((int) => (
            <button
              key={int}
              onClick={() => setInterval(int)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                interval === int
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {int}
            </button>
          ))}
          
          {/* Dropdown button */}
          <div className="relative">
            <button
              onClick={() => setShowIntervalDropdown(!showIntervalDropdown)}
              className={`px-2 py-1 text-xs rounded-md transition-all duration-150 ${
                showIntervalDropdown
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Interval Dropdown Menu */}
            {showIntervalDropdown && (
              <div className="absolute left-0 top-full mt-1.5 bg-[#1a1d29] border border-white/10 rounded-lg shadow-2xl z-30 min-w-[200px] overflow-hidden">
                <div className="py-2">
                  {/* Seconds */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">Seconds</div>
                  <div className="px-2 pb-2">
                    {intervalCategories.Seconds.map((int) => (
                      <button
                        key={int}
                        onClick={() => {
                          setInterval(int)
                          setShowIntervalDropdown(false)
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs rounded-md transition-all ${
                          interval === int
                            ? 'bg-white/10 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {int}
                      </button>
                    ))}
                  </div>
                  
                  {/* Minutes */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">Minutes</div>
                  <div className="px-2 pb-2">
                    {intervalCategories.Minutes.map((int) => (
                      <button
                        key={int}
                        onClick={() => {
                          setInterval(int)
                          setShowIntervalDropdown(false)
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs rounded-md transition-all flex items-center gap-1 ${
                          interval === int
                            ? 'bg-white/10 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {int}
                        {favoriteSet.has(int) && (
                          <span className="text-yellow-400 text-[10px]">★</span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Hours */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">Hours</div>
                  <div className="px-2 pb-2">
                    {intervalCategories.Hours.map((int) => (
                      <button
                        key={int}
                        onClick={() => {
                          setInterval(int)
                          setShowIntervalDropdown(false)
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs rounded-md transition-all flex items-center gap-1 ${
                          interval === int
                            ? 'bg-white/10 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {int}
                        {favoriteSet.has(int) && (
                          <span className="text-yellow-400 text-[10px]">★</span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Days */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">Days</div>
                  <div className="px-2 pb-2">
                    {intervalCategories.Days.map((int) => (
                      <button
                        key={int}
                        onClick={() => {
                          setInterval(int)
                          setShowIntervalDropdown(false)
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs rounded-md transition-all ${
                          interval === int
                            ? 'bg-white/10 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {int}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Chart Type Dropdown - Bars */}
          <div className="relative" data-dropdown="chart-type">
            <button
              onClick={() => setShowChartTypeDropdown(!showChartTypeDropdown)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all duration-150 ${
                showChartTypeDropdown
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {chartType}
            </button>
            
            {showChartTypeDropdown && (
              <div className="absolute left-0 top-full mt-1.5 bg-[#1a1d29] border border-white/10 rounded-lg shadow-2xl z-30 min-w-[180px] overflow-hidden">
                <div className="py-2">
                  {(['Bars', 'Candles', 'Hollow Candles', 'Line', 'Line with markers', 'Step line', 'Area', 'HLC area', 'Baseline', 'Columns', 'High-low', 'Heikin Ashi'] as ChartType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setChartType(type)
                        setShowChartTypeDropdown(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-xs rounded-md transition-all flex items-center gap-2 ${
                        chartType === type
                          ? 'bg-white/10 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {type}
                      {chartType === type && (
                        <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Indicators Button - Right after chart type */}
          <div className="relative" data-dropdown="indicators">
            <button
              onClick={() => setShowDisplayOptions(!showDisplayOptions)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all duration-150 ${
                showDisplayOptions
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              Indicators
            </button>
          </div>
        </div>

        {/* Center: Symbol Info - Jupiter Style */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">{cleanSymbol}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">{interval}</span>
          {indicator !== 'none' && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                {indicator === 'RSI' ? 'RSI' : indicator}
              </span>
            </>
          )}
        </div>

        {/* Right: Controls - Jupiter Style */}
        <div className="flex items-center gap-1">

          {/* Settings Icon - Jupiter Style */}
          <div className="relative" ref={settingsMenuRef}>
            <button 
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-md transition-all duration-150 ${showSettingsMenu ? 'bg-white/10 text-slate-300' : ''}`}
              title="Settings"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {/* Settings Dropdown Menu */}
            {showSettingsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSettingsMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl min-w-[280px] max-h-[400px] overflow-hidden">
                  <div className="p-3 border-b border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-200">Chart Settings</h3>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => {
                        setTimezone(e.target.value)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Phoenix">Arizona Time (MST)</option>
                      <option value="America/Anchorage">Alaska Time (AKT)</option>
                      <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      <option value="UTC">UTC</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Paris">Paris (CET/CEST)</option>
                      <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                      <option value="Europe/Moscow">Moscow (MSK)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">Mumbai (IST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                      <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                      <option value="Australia/Melbourne">Melbourne (AEDT/AEST)</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-2">
                      Chart times will be displayed in the selected timezone
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Screenshot Icon - Jupiter Style */}
          <button
            onClick={takeScreenshot}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-md transition-all duration-150"
            title="Take Screenshot"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Fullscreen Icon - Jupiter Style */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-md transition-all duration-150"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full overflow-hidden bg-transparent" style={{ minHeight: height }} />

      {/* Indicators Modal */}
      {showDisplayOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowDisplayOptions(false)}>
          <div
            className="bg-[#1a1d29] border border-white/10 rounded-lg shadow-2xl w-[400px] max-h-[600px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-dropdown="indicators"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Indicators</h2>
              <button
                onClick={() => setShowDisplayOptions(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={indicatorSearch}
                  onChange={(e) => setIndicatorSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-white/20 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Indicators List */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {filteredIndicators.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">No indicators found</div>
              ) : (
                filteredIndicators.map((indName) => {
                  const isRSI = indName === 'Relative Strength Index'
                  const isMACD = indName === 'MACD'
                  const indicatorKey = isRSI ? 'RSI' : isMACD ? 'MACD' : indName
                  const isSelected = indicator === indicatorKey
                  
                  return (
                    <button
                      key={indName}
                      onClick={() => {
                        if (isRSI) {
                          setIndicator('RSI')
                        } else if (isMACD) {
                          setIndicator('MACD')
                        } else {
                          // For now, only RSI and MACD are implemented
                          // Other indicators can be added later
                          setIndicator('none')
                        }
                        setShowDisplayOptions(false)
                        setIndicatorSearch('')
                      }}
                      className={`w-full px-3 py-2 text-left text-sm rounded-md transition-all ${
                        isSelected
                          ? 'bg-white/10 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {indName}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Indicator Toolbar - appears on hover over indicator line */}
      {indicatorToolbar && indicatorToolbar.visible && indicator === 'RSI' && (
        <div
          className="fixed z-50 bg-[#1a1d29] border border-blue-500 rounded-lg shadow-xl flex items-center gap-2 px-3 py-2"
          style={{
            left: `${indicatorToolbar.x}px`,
            top: `${indicatorToolbar.y}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseEnter={(e) => {
            e.stopPropagation()
            // Keep toolbar visible when hovering over it
          }}
          onMouseLeave={() => {
            setIndicatorToolbar(null)
          }}
        >
          <span className="text-blue-400 font-medium text-sm">RSI</span>
          <span className="text-white text-sm">{rsiPeriod}</span>
          
          {/* Eye icon - Toggle visibility */}
          <button
            onClick={() => {
              setRsiVisible(!rsiVisible)
            }}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title={rsiVisible ? 'Hide RSI' : 'Show RSI'}
          >
            {rsiVisible ? (
              <Eye size={14} className="text-white/80" />
            ) : (
              <EyeOff size={14} className="text-white/40" />
            )}
          </button>

          {/* Settings icon - Configure RSI period */}
          <button
            onClick={() => {
              setShowRsiSettings(!showRsiSettings)
            }}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="RSI Settings"
          >
            <Settings size={14} className="text-white/80" />
          </button>

          {/* Trash icon - Remove indicator */}
          <button
            onClick={() => {
              setIndicator('none')
              setIndicatorToolbar(null)
            }}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Remove RSI"
          >
            <Trash2 size={14} className="text-white/80" />
          </button>

          {/* Three dots - More options */}
          <button
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="More options"
          >
            <MoreVertical size={14} className="text-white/80" />
          </button>
        </div>
      )}

      {/* RSI Settings Modal */}
      {showRsiSettings && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowRsiSettings(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-[#1a1d29] border border-white/10 rounded-lg p-4 shadow-xl min-w-[300px]">
            <h3 className="text-lg font-semibold text-white mb-4">RSI Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2">Period</label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={rsiPeriod}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (value >= 2 && value <= 100) {
                      setRsiPeriod(value)
                    }
                  }}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-white/60 mt-1">Range: 2-100</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRsiSettings(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRsiSettings(false)
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}