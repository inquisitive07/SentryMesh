import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { DemoDataBadge } from './StatusBadge'

export default function ConnectionIndicator({
  isConnected,
  isWsConnected = false,
  isMock = false,
  isFallback = false,
  mqttConnected = true,
}) {
  // Label determination:
  // "Live (WebSocket)" when socket is open
  // "Live (polling)" when only HTTP works
  // "Backend offline – demo data" when offline/demo fallback
  let statusText = 'Backend offline – demo data'
  let shortText = 'Offline'
  let isGreen = false

  if (!isMock && isConnected) {
    isGreen = true
    if (isWsConnected) {
      statusText = 'Live (WebSocket)'
      shortText = 'Live (WS)'
    } else {
      statusText = 'Live (polling)'
      shortText = 'Live (Poll)'
    }
  } else if (isMock && !isFallback) {
    statusText = 'Demo mode'
    shortText = 'Demo'
  }

  return (
    <div className="flex items-center gap-2">
      {isMock && <DemoDataBadge />}

      {/* MQTT warning pill if broker disconnected in live mode */}
      {!isMock && isConnected && !mqttConnected && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-950/60 text-amber-300 border-amber-500/40 animate-pulse"
          title="Backend cannot reach MQTT broker"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">MQTT broker disconnected</span>
          <span className="md:hidden">MQTT offline</span>
        </div>
      )}

      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isGreen
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
        }`}
        title={
          isGreen
            ? isWsConnected
              ? 'Real-time WebSocket alerts connection active (ws://.../ws/alerts)'
              : 'HTTP REST polling active (WebSocket reconnecting)'
            : isFallback
            ? 'Backend unreachable – automatically running in mock fallback demo mode'
            : 'Explicit demo mode'
        }
      >
        <span className="relative flex h-2 w-2">
          {isGreen ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          )}
        </span>
        <span className="hidden sm:inline">{statusText}</span>
        <span className="sm:hidden">{shortText}</span>
      </div>
    </div>
  )
}
