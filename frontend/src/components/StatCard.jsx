import React from 'react'

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge = null,
  loading = false,
}) {
  const variantStyles = {
    default: {
      border: 'border-slate-800/80 hover:border-slate-700',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      valueColor: 'text-slate-100',
    },
    alert: {
      border: 'border-rose-500/40 bg-rose-950/10 hover:border-rose-500/60',
      iconBg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      valueColor: 'text-rose-400',
    },
    warning: {
      border: 'border-amber-500/40 bg-amber-950/10 hover:border-amber-500/60',
      iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      valueColor: 'text-amber-400',
    },
    success: {
      border: 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      valueColor: 'text-emerald-300',
    },
    info: {
      border: 'border-sky-500/30 bg-sky-950/10 hover:border-sky-500/50',
      iconBg: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      valueColor: 'text-sky-300',
    },
  }

  const currentVariant = variantStyles[variant] || variantStyles.default

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900/80 p-5 shadow-lg backdrop-blur-sm border transition-all duration-200 ${currentVariant.border}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-800 animate-pulse rounded my-1" />
          ) : (
            <div className={`text-2xl font-bold tracking-tight font-mono ${currentVariant.valueColor}`}>
              {value}
            </div>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl ${currentVariant.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <span>{subtitle}</span>
          {badge && <span>{badge}</span>}
        </div>
      )}
    </div>
  )
}

