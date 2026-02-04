'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'

interface ProbabilityBarChartProps {
  yesProbability: number // 0-100
  noProbability: number // 0-100
  yesLiquidity?: number
  noLiquidity?: number
  height?: number
  theme?: 'light' | 'dark'
  className?: string
}

interface ChartDataItem {
  name: string
  Yes: number
  No: number
}

// Line Chart Interfaces
export interface LineChartData {
  time: string | number
  value: number
  label?: string
}

interface LineChartComponentProps {
  data: LineChartData[]
  height?: number
  theme?: 'light' | 'dark'
  className?: string
  lineColor?: string
  showDots?: boolean
  showArea?: boolean
  yAxisLabel?: string
  xAxisLabel?: string
}

const CustomTooltip = ({ active, payload, theme = 'dark' }: any) => {
  if (active && payload && payload.length) {
    const isDark = theme === 'dark'
    return (
      <div
        className={`rounded-lg px-3 py-2 shadow-xl border backdrop-blur-sm ${
          isDark
            ? 'bg-slate-800/95 border-slate-700/50 text-white'
            : 'bg-white/90 border-gray-200/50 text-gray-900'
        }`}
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : undefined,
        }}
      >
        {payload.map((entry: any, index: number) => (
          <div key={index} className="mb-1 last:mb-0">
            <p className="font-semibold" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const CustomLabel = ({ x, y, width, value, fill }: any) => {
  if (!value || width < 20) return null

  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill={fill}
      textAnchor="middle"
      fontSize={13}
      fontWeight={600}
    >
      {value.toFixed(1)}%
    </text>
  )
}

// Custom Tooltip for Line Chart
const LineChartTooltip = ({ active, payload, theme = 'dark' }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const isDark = theme === 'dark'
    
    return (
      <div
        className={`rounded-lg px-3 py-2 shadow-xl border backdrop-blur-sm ${
          isDark
            ? 'bg-slate-800/95 border-slate-700/50 text-white'
            : 'bg-white/90 border-gray-200/50 text-gray-900'
        }`}
      >
        <p className="font-semibold mb-1">{data.time || data.label || 'Value'}</p>
        <p className="text-sm" style={{ color: payload[0].color }}>
          Value: <span className="font-medium">{data.value.toFixed(2)}</span>
        </p>
      </div>
    )
  }
  return null
}

export default function ProbabilityBarChart({
  yesProbability,
  noProbability,
  yesLiquidity,
  noLiquidity,
  height = 300,
  theme = 'dark',
  className = '',
}: ProbabilityBarChartProps) {
  const isDark = theme === 'dark'

  // Theme colors - Green for Yes, Red for No
  const yesColor = '#10b981' // emerald-500 (green)
  const noColor = '#ef4444' // red-500 (red)
  const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'

  // Prepare data for grouped bar chart
  const data: ChartDataItem[] = [
    {
      name: 'Probability',
      Yes: Math.max(0, Math.min(100, yesProbability)),
      No: Math.max(0, Math.min(100, noProbability)),
    },
  ]

  const formatLiquidity = (value?: number) => {
    if (value === undefined || value === null) return null
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`
    return value.toFixed(0)
  }

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="name"
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 14, fontWeight: 500 }}
            axisLine={{ stroke: borderColor }}
            tickLine={{ stroke: borderColor }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
            tickLine={{ stroke: borderColor }}
          />
          <Tooltip content={<CustomTooltip theme={theme} />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="square"
            formatter={(value) => (
              <span
                style={{
                  color: textColor,
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {value}
              </span>
            )}
          />
          <Bar
            dataKey="Yes"
            fill={yesColor}
            radius={[8, 8, 0, 0]}
            maxBarSize={120}
            isAnimationActive={true}
            animationDuration={800}
          >
            <LabelList
              content={<CustomLabel fill={yesColor} />}
              dataKey="Yes"
            />
          </Bar>
          <Bar
            dataKey="No"
            fill={noColor}
            radius={[8, 8, 0, 0]}
            maxBarSize={120}
            isAnimationActive={true}
            animationDuration={800}
          >
            <LabelList
              content={<CustomLabel fill={noColor} />}
              dataKey="No"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {(yesLiquidity !== undefined || noLiquidity !== undefined) && (
        <div
          className={`mt-3 text-xs text-center ${
            isDark ? 'text-slate-400' : 'text-gray-600'
          }`}
        >
          <span className="font-medium">Liquidity:</span>{' '}
          <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>
            Yes {formatLiquidity(yesLiquidity) ?? '—'}
          </span>
          {' | '}
          <span className={isDark ? 'text-red-400' : 'text-red-600'}>
            No {formatLiquidity(noLiquidity) ?? '—'}
          </span>
        </div>
      )}
    </div>
  )
}

// Line Chart Component using Recharts
export function LineChartComponent({
  data,
  height = 400,
  theme = 'dark',
  className = '',
  lineColor,
  showDots = true,
  showArea = false,
  yAxisLabel,
  xAxisLabel,
}: LineChartComponentProps) {
  const isDark = theme === 'dark'
  const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const defaultLineColor = lineColor || (isDark ? '#3b82f6' : '#2563eb') // Blue color

  if (!data || data.length === 0) {
    return (
      <div className={`w-full ${className} flex items-center justify-center`} style={{ height }}>
        <p className={isDark ? 'text-white/60' : 'text-gray-600'}>No data available</p>
      </div>
    )
  }

  // Calculate min/max for domain with padding
  const values = data.map(d => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue
  const padding = valueRange * 0.1 || 1 // 10% padding, minimum 1

  const domain = [Math.max(0, minValue - padding), maxValue + padding]

  // Transform data for Recharts
  const chartData = data.map((d) => ({
    time: d.time,
    value: d.value,
    label: d.label,
  }))

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="time"
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
            tickLine={{ stroke: borderColor }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: textColor } : undefined}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            domain={domain}
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
            tickLine={{ stroke: borderColor }}
            width={60}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined}
          />
          <Tooltip content={<LineChartTooltip theme={theme} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={defaultLineColor}
            strokeWidth={2}
            dot={showDots ? { fill: defaultLineColor, r: 4 } : false}
            activeDot={{ r: 6, fill: defaultLineColor }}
            isAnimationActive={true}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
