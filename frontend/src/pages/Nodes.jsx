import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Wifi, WifiOff, Clock, ShieldCheck, Activity, ArrowRight, Layers, Cpu, Globe } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { NodeStatusBadge, ClassBadge } from '../components/StatusBadge'
import { formatNodeName, getClassLabel } from '../utils/labels'
import { formatRelativeTime } from '../utils/time'

export default function Nodes() {
  const { nodesStatus, loading } = useEvents()
  const navigate = useNavigate()

  function handleCardClick(nodeId) {
    navigate(`/alerts?node=${nodeId}`)
  }

  // Find most frequent class for a node
  function getMostFrequentClass(classCounts) {
    let topClass = null
    let maxCount = 0

    Object.entries(classCounts || {}).forEach(([cls, count]) => {
      // Prioritize intrusion classes over normal noise if available
      if (count > maxCount) {
        maxCount = count
        topClass = cls
      }
    })

    return topClass
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Server className="w-6 h-6 text-cyan-400" />
            Sensor Nodes & Fence Line Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Physical ESP32 edge units deployed along the perimeter fence with piezo seismic and acoustic sensors.
          </p>
        </div>

        {/* Global node stats pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Nodes Online:</span>
          <span className="font-bold text-emerald-400">
            {nodesStatus.onlineCount} / {nodesStatus.totalCount}
          </span>
        </div>
      </div>

      {/* Nodes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-56 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {nodesStatus.allNodes.map((node) => {
            const mostFreqClass = getMostFrequentClass(node.classCounts)
            // Use alert_count from /nodes when available; fallback to calculated 24h count
            const totalAlerts = node.alertCount !== undefined && node.alertCount !== null
              ? node.alertCount
              : node.alertsCount24h

            const verifiedPct =
              node.alertsCount24h > 0
                ? Math.round((node.verifiedCount24h / node.alertsCount24h) * 100)
                : 0

            return (
              <div
                key={node.id}
                onClick={() => handleCardClick(node.id)}
                className="group relative cursor-pointer rounded-xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg hover:border-cyan-500/50 hover:bg-slate-850/90 transition-all duration-200 flex flex-col justify-between"
              >
                {/* Card Top: Node Name & Status */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {formatNodeName(node.id)}
                      </h3>
                      <span className="font-mono text-[11px] text-slate-500">{node.id}</span>
                    </div>
                    <NodeStatusBadge online={node.online} size="sm" />
                  </div>

                  {/* Node Metrics List */}
                  <div className="space-y-2.5 my-4 text-xs">
                    {/* Last seen */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Last Seen
                      </span>
                      <span className="font-mono text-slate-200">
                        {node.lastSeenTime ? formatRelativeTime(node.lastSeenTime) : 'Never'}
                      </span>
                    </div>

                    {/* Alerts (Total / from backend /nodes) */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-slate-500" />
                        Total Alerts
                      </span>
                      <span className="font-mono font-bold text-rose-400">
                        {totalAlerts}
                      </span>
                    </div>

                    {/* Firmware Version (when present) */}
                    {node.firmwareVersion && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-slate-500" />
                          Firmware
                        </span>
                        <span className="font-mono text-slate-300">
                          v{node.firmwareVersion}
                        </span>
                      </div>
                    )}

                    {/* IP address (when present) */}
                    {node.ip && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                          IP Address
                        </span>
                        <span className="font-mono text-slate-300">
                          {node.ip}
                        </span>
                      </div>
                    )}

                    {/* Most frequent class */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        Frequent Event
                      </span>
                      <div>
                        {mostFreqClass ? (
                          <ClassBadge cls={mostFreqClass} size="sm" />
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">None</span>
                        )}
                      </div>
                    </div>

                    {/* Verified % */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        CCTV Verified
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {verifiedPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-cyan-400 font-medium group-hover:text-cyan-300">
                  <span>View filtered alerts</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
