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
  Cell,
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
  value: number
  fill: string
}

const CustomTooltip = ({ active, payload, theme }: any) => {
  if (active && payload && payload.length) {
    const isDark = theme === 'dark'
    return (
      <div
        className={`rounded-lg px-3 py-2 shadow-xl border backdrop-blur-sm ${
          isDark
            ? 'bg-slate-800/90 border-slate-700/50 text-white'
            : 'bg-white/90 border-gray-200/50 text-gray-900'
        }`}
      >
        <p className="font-semibold">{payload[0].name}</p>
        <p
          className={`font-mono ${
            isDark ? 'text-emerald-400' : 'text-emerald-600'
          }`}
        >
          {payload[0].value.toFixed(2)}%
        </p>
      </div>
    )
  }
  return null
}

const CustomLabel = ({ x, y, width, value, theme }: any) => {
  const isDark = theme === 'dark'
  if (!value || width < 30) return null // Don't show label if bar is too small

  return (
    <text
      x={x + width / 2}
      y={y + 15}
      fill={isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'}
      textAnchor="middle"
      fontSize={14}
      fontWeight={600}
    >
      {value.toFixed(1)}%
    </text>
  )
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

  // Theme colors
  const yesColor = isDark ? '#10b981' : '#059669' // emerald-500 / emerald-600
  const noColor = isDark ? '#ef4444' : '#dc2626' // red-500 / red-600
  const backgroundColor = isDark ? '#0f172a' : '#ffffff' // slate-900 / white
  const textColor = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'

  // Prepare data
  const data: ChartDataItem[] = [
    {
      name: 'Yes',
      value: Math.max(0, Math.min(100, yesProbability)),
      fill: yesColor,
    },
    {
      name: 'No',
      value: Math.max(0, Math.min(100, noProbability)),
      fill: noColor,
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
          layout="vertical"
          margin={{ top: 20, right: 50, left: 20, bottom: 20 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: borderColor }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            stroke={textColor}
            tick={{ fill: textColor, fontSize: 14, fontWeight: 500 }}
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
            dataKey="value"
            radius={[0, 8, 8, 0]}
            isAnimationActive={true}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              content={<CustomLabel theme={theme} />}
              dataKey="value"
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
