'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ProbabilityDataPoint {
  time: string // e.g., "10:00", "11:00", "12:00"
  yesProbability: number // 0-100
  noProbability: number // 0-100
}

interface PredictionProbabilityChartProps {
  data?: ProbabilityDataPoint[]
  height?: number
  className?: string
}

// Mock data generator - in production, this would come from pool shares over time
function generateMockData(): ProbabilityDataPoint[] {
  const data: ProbabilityDataPoint[] = []
  const now = new Date()
  
  // Generate 24 data points (one per hour for the last 24 hours)
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hours = time.getHours().toString().padStart(2, '0')
    const minutes = time.getMinutes().toString().padStart(2, '0')
    
    // Simulate probability movements (YES + NO should always sum to ~100%)
    // Add some randomness to make it look realistic
    const baseYes = 50 + Math.sin(i / 3) * 15 + (Math.random() - 0.5) * 5
    const yesProbability = Math.max(5, Math.min(95, baseYes))
    const noProbability = 100 - yesProbability
    
    data.push({
      time: `${hours}:${minutes}`,
      yesProbability: Math.round(yesProbability * 10) / 10,
      noProbability: Math.round(noProbability * 10) / 10,
    })
  }
  
  return data
}

export default function PredictionProbabilityChart({
  data,
  height = 400,
  className = '',
}: PredictionProbabilityChartProps) {
  const chartData = data || generateMockData()

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-darker border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-white/60 text-xs mb-2">{payload[0].payload.time}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value.toFixed(1)}%</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">Market Probabilities</h3>
        <p className="text-xs text-white/60">YES/NO probabilities derived from pool shares</p>
      </div>

      {/* Chart */}
      <div
        className="w-full rounded-lg overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255, 255, 255, 0.05)" 
              vertical={false}
            />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255, 255, 255, 0.4)"
              tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
              tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            />
            <YAxis 
              domain={[0, 100]}
              stroke="rgba(255, 255, 255, 0.4)"
              tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
              tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
              label={{ 
                value: 'Probability (%)', 
                angle: -90, 
                position: 'insideLeft',
                fill: 'rgba(255, 255, 255, 0.6)',
                style: { fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
              formatter={(value) => (
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                  {value}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="yesProbability"
              name="YES"
              stroke="#10b981" // success color (green)
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="noProbability"
              name="NO"
              stroke="#ef4444" // danger color (red)
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
