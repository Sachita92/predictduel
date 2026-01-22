'use client'

interface ProbabilityOverlayProps {
  yesLiquidity: number
  noLiquidity: number
  className?: string
}

export default function ProbabilityOverlay({
  yesLiquidity,
  noLiquidity,
  className = '',
}: ProbabilityOverlayProps) {
  // Calculate probabilities from liquidity
  const total = yesLiquidity + noLiquidity
  const yesPercent = total > 0 ? (yesLiquidity / total) * 100 : 50
  const noPercent = total > 0 ? (noLiquidity / total) * 100 : 50

  return (
    <div className={`w-full ${className}`}>
      <div className="glass rounded-lg p-4 shadow-lg">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-white/90 mb-1">
            Market Probabilities
          </h3>
          <p className="text-xs text-white/60">
            Derived from liquidity pools
          </p>
        </div>

        {/* Probability Bars */}
        <div className="space-y-3">
          {/* YES Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-success">YES</span>
              <span className="text-sm font-bold text-success">
                {yesPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-300 ease-out"
                style={{ width: `${yesPercent}%` }}
              />
            </div>
            <p className="text-xs text-white/50 mt-1">
              {yesLiquidity.toLocaleString()} liquidity
            </p>
          </div>

          {/* NO Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-danger">NO</span>
              <span className="text-sm font-bold text-danger">
                {noPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-danger rounded-full transition-all duration-300 ease-out"
                style={{ width: `${noPercent}%` }}
              />
            </div>
            <p className="text-xs text-white/50 mt-1">
              {noLiquidity.toLocaleString()} liquidity
            </p>
          </div>
        </div>

        {/* Total Liquidity */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Total Liquidity</span>
            <span className="text-xs font-semibold text-white/80">
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
