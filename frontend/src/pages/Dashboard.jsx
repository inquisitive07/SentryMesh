import React, { useState, useMemo } from 'react'
import {
  ShieldAlert,
  AlertOctagon,
  ShieldCheck,
  Percent,
  Server,
  Activity,
  HardDrive,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useHealth } from '../hooks/useHealth'
import StatCard from '../components/StatCard'
import FenceLine from '../components/FenceLine'
import ClassChart from '../components/ClassChart'
import TimelineChart from '../components/TimelineChart'
import AlertsTable from '../components/AlertsTable'
import AlertDetailsDrawer from '../components/AlertDetailsDrawer'
import { parseDate } from '../utils/time'
import { formatNodeName } from '../utils/labels'

export default function Dashboard() {
  const { events, nodesStatus, newAlertIds, loading } = useEvents()
  const { received, stored, rejected, isConnected } = useHealth()

  // Selected node filter on dashboard (from clicking on FenceLine)
  const [selectedNodeFilter, setSelectedNodeFilter] = useState(null)

  // Drawer state for clicked alert row
  const [selectedAlertForDrawer, setSelectedAlertForDrawer] = useState(null)

  // Filter events if node filter is active
  const filteredEvents = useMemo(() => {
    if (!selectedNodeFilter) return events
    return events.filter((e) => e.nodeId === selectedNodeFilter)
  }, [events, selectedNodeFilter])

  // Compute key dashboard metrics for the last 24h and last 5min
  const metrics = useMemo(() => {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

    let alerts24hCount = 0
    let verified24hCount = 0
    let totalConfSum = 0
    let activeIntrusions5m = 0

    filteredEvents.forEach((ev) => {
      // Non-alerts (normal_noise) are excluded from intrusion totals
      if (ev.class === 'normal_noise') return

      const evDate = parseDate(ev.timestamp)
      const evTime = evDate ? evDate.getTime() : 0

      if (evTime >= fiveMinutesAgo) {
        activeIntrusions5m += 1
      }

      if (evTime >= twentyFourHoursAgo) {
        alerts24hCount += 1
        totalConfSum += ev.confidencePercent
        if (ev.verified) {
          verified24hCount += 1
        }
      }
    })

    const verifiedPct = alerts24hCount > 0 ? Math.round((verified24hCount / alerts24hCount) * 100) : 0
    const avgConfidence = alerts24hCount > 0 ? Math.round(totalConfSum / alerts24hCount) : 0

    return {
      alerts24hCount,
      activeIntrusions5m,
      verifiedPct,
      avgConfidence,
    }
  }, [filteredEvents])

  // Recent 10 alerts for the dashboard table
  const recentAlerts = useMemo(() => {
    return filteredEvents.slice(0, 10)
  }, [filteredEvents])

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-400" />
            Perimeter Security Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Live fused telemetry from ESP32 seismic/acoustic edge nodes and cloud CCTV computer vision.
          </p>
        </div>

        {selectedNodeFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Dashboard scope:</span>
            <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold">
              {formatNodeName(selectedNodeFilter)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedNodeFilter(null)}
              className="text-xs text-slate-400 hover:text-white underline ml-1"
            >
              Reset to all
            </button>
          </div>
        )}
      </div>

      {/* 1. Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Alerts (24h)"
          value={metrics.alerts24hCount}
          subtitle="Excludes normal/noise"
          icon={ShieldAlert}
          variant="default"
          loading={loading}
        />

        <StatCard
          title="Active Intrusions"
          value={metrics.activeIntrusions5m}
          subtitle="Last 5 minutes"
          icon={AlertOctagon}
          variant={metrics.activeIntrusions5m > 0 ? 'alert' : 'default'}
          badge={
            metrics.activeIntrusions5m > 0 ? (
              <span className="animate-pulse text-rose-400 font-semibold">Live Threat</span>
            ) : null
          }
          loading={loading}
        />

        <StatCard
          title="Verified Intrusions"
          value={`${metrics.verifiedPct}%`}
          subtitle="Confirmed by cloud CCTV"
          icon={ShieldCheck}
          variant="success"
          loading={loading}
        />

        <StatCard
          title="Avg Confidence"
          value={`${metrics.avgConfidence}%`}
          subtitle="Multimodal fused score"
          icon={Percent}
          variant="info"
          loading={loading}
        />

        <StatCard
          title="Nodes Online"
          value={`${nodesStatus.onlineCount} / ${nodesStatus.totalCount}`}
          subtitle="Active in last 60s"
          icon={Server}
          variant={nodesStatus.onlineCount > 0 ? 'success' : 'warning'}
          loading={loading}
        />
      </div>

      {/* 2. Fence-Line Schematic */}
      <FenceLine
        nodes={nodesStatus.allNodes}
        selectedNode={selectedNodeFilter}
        onSelectNode={(nodeId) => setSelectedNodeFilter(nodeId)}
        onClearFilter={() => setSelectedNodeFilter(null)}
      />

      {/* 3. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClassChart events={filteredEvents} includeNoise={false} />
        <TimelineChart events={filteredEvents} />
      </div>

      {/* 4. Recent Alerts Table & Backend Health Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table taking 2 columns */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-200">Recent Alerts</h2>
              <p className="text-xs text-slate-400">Latest 10 security events across perimeter</p>
            </div>
            <Link
              to="/alerts"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 group"
            >
              <span>View full audit log</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <AlertsTable
            events={recentAlerts}
            onSelectAlert={(alert) => setSelectedAlertForDrawer(alert)}
            newAlertIds={newAlertIds}
            loading={loading}
            emptyMessage={
              selectedNodeFilter
                ? `No alerts detected for ${formatNodeName(selectedNodeFilter)}`
                : 'No alerts yet – the perimeter is quiet'
            }
          />
        </div>

        {/* Backend Counters Panel taking 1 column */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">Backend Pipeline Telemetry</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                isConnected
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950 text-amber-400 border border-amber-500/30'
              }`}>
                {isConnected ? 'MQTT LIVE' : 'DEMO MODE'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Live counters reported by FastAPI <code className="text-slate-300 font-mono">/health</code> endpoint.
            </p>

            <div className="space-y-2.5">
              {/* Received */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-300">Packets Received</span>
                    <p className="text-[10px] text-slate-500">MQTT edge ingress</p>
                  </div>
                </div>
                <span className="font-mono text-base font-bold text-slate-100">{received}</span>
              </div>

              {/* Stored */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-300">Packets Stored</span>
                    <p className="text-[10px] text-slate-500">SQLite audit trail</p>
                  </div>
                </div>
                <span className="font-mono text-base font-bold text-emerald-400">{stored}</span>
              </div>

              {/* Rejected */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-300">Packets Rejected</span>
                    <p className="text-[10px] text-slate-500">Schema validation failed</p>
                  </div>
                </div>
                <span className={`font-mono text-base font-bold ${rejected > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {rejected}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Storage Success Rate:</span>
            <span className="font-mono text-slate-300 font-semibold">
              {received > 0 ? `${Math.round((stored / received) * 100)}%` : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Slide-out drawer when alert clicked */}
      <AlertDetailsDrawer
        isOpen={Boolean(selectedAlertForDrawer)}
        onClose={() => setSelectedAlertForDrawer(null)}
        event={selectedAlertForDrawer}
      />
    </div>
  )
}

