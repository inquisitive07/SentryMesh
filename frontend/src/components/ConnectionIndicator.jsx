import React from 'react'
import { Radio, AlertTriangle } from 'lucide-react'
import { DemoDataBadge } from './StatusBadge'

export default function ConnectionIndicator({ isConnected, isMock, isFallback }) {
  return (
    <div className="flex items-center gap-2">
      {isMock && <DemoDataBadge />}

      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isConnected
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
        }`}
        title={
          isConnected
            ? 'FastAPI backend connection active (HTTP 200)'
            : isFallback
            ? 'Backend unreachable – automatically running in mock fallback demo mode'
            : 'Explicit demo mode'
        }
      >
        <span className="relative flex h-2 w-2">
          {isConnected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          )}
        </span>
        <span className="hidden sm:inline">
          {isConnected ? 'Backend connected' : 'Backend offline – demo data'}
        </span>
        <span className="sm:hidden">
          {isConnected ? 'Connected' : 'Offline'}
        </span>
      </div>
    </div>
  )
}

