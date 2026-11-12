import React from 'react'
import { ClassBadge, VerificationBadge } from './StatusBadge'
import ConfidenceBar from './ConfidenceBar'
import { formatTime, formatRelativeTime } from '../utils/time'
import { ChevronRight, ShieldAlert, Sparkles } from 'lucide-react'

export default function AlertsTable({
  events = [],
  onSelectAlert = () => {},
  newAlertIds = new Set(),
  loading = false,
  emptyMessage = 'No alerts yet – the perimeter is quiet',
  showPagination = false,
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-800/60 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 mb-3">
          <ShieldAlert className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm font-semibold text-slate-300">{emptyMessage}</p>
        <p className="text-xs text-slate-500 mt-1">
          Sensors are monitoring fence vibration, acoustics, and cloud CCTV streams.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium uppercase tracking-wider">
            <th className="py-3 px-4">Time</th>
            <th className="py-3 px-4">Node</th>
            <th className="py-3 px-4">Classification</th>
            <th className="py-3 px-4 min-w-[130px]">Confidence</th>
            <th className="py-3 px-4">Verification</th>
            <th className="py-3 px-3 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {events.map((ev) => {
            const isNew = newAlertIds.has(ev.id)

            return (
              <tr
                key={ev.id}
                onClick={() => onSelectAlert(ev)}
                className={`group cursor-pointer transition-colors duration-200 ${
                  isNew
                    ? 'bg-rose-950/40 hover:bg-rose-950/60 animate-pulse'
                    : 'hover:bg-slate-800/50'
                }`}
              >
                {/* Time: HH:mm:ss + relative time */}
                <td className="py-3 px-4 font-mono whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {isNew && (
                      <span className="inline-flex items-center text-[10px] uppercase font-bold text-rose-400 bg-rose-950/80 px-1 rounded border border-rose-500/40">
                        NEW
                      </span>
                    )}
                    <span className="font-semibold text-slate-200">
                      {formatTime(ev.timestamp)}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      ({formatRelativeTime(ev.timestamp)})
                    </span>
                  </div>
                </td>

                {/* Node name */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="font-mono font-medium text-cyan-400">
                    {ev.nodeLabel}
                  </span>
                </td>

                {/* Classification badge */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <ClassBadge cls={ev.class} size="sm" />
                </td>

                {/* Confidence Bar */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="w-28">
                    <ConfidenceBar value={ev.confidence} size="sm" />
                  </div>
                </td>

                {/* Verification Badge */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <VerificationBadge verified={ev.verified} size="sm" />
                </td>

                {/* Action Arrow */}
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors inline-block" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

