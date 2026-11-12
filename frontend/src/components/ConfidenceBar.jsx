import React from 'react'

export default function ConfidenceBar({
  value,
  label,
  showValue = true,
  size = 'md',
  colorOverride = null,
  emptyText = 'Not available yet',
}) {
  const isAvailable = value !== null && value !== undefined && !isNaN(value)
  const pct = isAvailable ? Math.round(Number(value) <= 1 ? Number(value) * 100 : Number(value)) : 0

  // Color mapping
  let barColor = colorOverride
  if (!barColor) {
    if (pct >= 85) {
      barColor = 'bg-rose-500' // High intrusion confidence
    } else if (pct >= 70) {
      barColor = 'bg-amber-500'
    } else {
      barColor = 'bg-sky-500'
    }
  }

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2'

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400 font-medium">{label}</span>
          <span className="font-mono text-slate-200">
            {isAvailable ? `${pct}%` : <span className="text-slate-500 italic">{emptyText}</span>}
          </span>
        </div>
      )}

      {isAvailable ? (
        <div className="flex items-center gap-2">
          <div className={`flex-1 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 ${heightClass}`}>
            <div
              className={`${barColor} ${heightClass} rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
          {!label && showValue && (
            <span className="font-mono text-xs text-slate-300 min-w-[2.5rem] text-right font-medium">
              {pct}%
            </span>
          )}
        </div>
      ) : (
        !label && (
          <span className="text-xs text-slate-500 italic">{emptyText}</span>
        )
      )}
    </div>
  )
}

