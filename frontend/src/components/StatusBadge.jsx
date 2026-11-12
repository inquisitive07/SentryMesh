import React from 'react'
import { ShieldCheck, ShieldAlert, Wifi, WifiOff } from 'lucide-react'
import { getClassConfig } from '../utils/labels'

export function ClassBadge({ cls, size = 'md' }) {
  const config = getClassConfig(cls)
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.badge} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  )
}

export function VerificationBadge({ verified, size = 'md' }) {
  const isSmall = size === 'sm'
  const sizeClasses = isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  if (verified) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 ${sizeClasses}`}
        title="Verified by Cloud CCTV computer vision analysis"
      >
        <ShieldCheck className={isSmall ? 'w-3 h-3 text-emerald-400' : 'w-3.5 h-3.5 text-emerald-400'} />
        <span>Verified by CCTV</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/30 ${sizeClasses}`}
      title="CCTV result timed out; decision based on seismic and acoustic edge sensors"
    >
      <ShieldAlert className={isSmall ? 'w-3 h-3 text-amber-400' : 'w-3.5 h-3.5 text-amber-400'} />
      <span>Unverified – sensors only</span>
    </span>
  )
}

export function NodeStatusBadge({ online, size = 'md' }) {
  const isSmall = size === 'sm'
  const sizeClasses = isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  if (online) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 ${sizeClasses}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Wifi className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Online</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-900 text-slate-400 border border-slate-700/60 ${sizeClasses}`}
    >
      <span className="inline-flex rounded-full h-2 w-2 bg-slate-500" />
      <WifiOff className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>Offline</span>
    </span>
  )
}

export function DemoDataBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded border border-amber-500/40 bg-amber-500/15 text-amber-400">
      DEMO DATA
    </span>
  )
}

export default function StatusBadge({ type, ...props }) {
  if (type === 'class') return <ClassBadge {...props} />
  if (type === 'verification') return <VerificationBadge {...props} />
  if (type === 'node') return <NodeStatusBadge {...props} />
  if (type === 'demo') return <DemoDataBadge />
  return null
}

