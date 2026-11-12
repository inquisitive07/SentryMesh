import React, { useEffect } from 'react'
import { X, ShieldCheck, ShieldAlert, Cpu, Radio, Video, Clock, Layers, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClassBadge, VerificationBadge } from './StatusBadge'
import ConfidenceBar from './ConfidenceBar'
import { formatDateTime, calculateLatency, formatRelativeTime } from '../utils/time'
import { formatNodeName } from '../utils/labels'

export function AlertDetailsContent({ event, showFullPageLink = true }) {
  if (!event) return null

  const latency = calculateLatency(event.timestamp, event.receivedAt)

  return (
    <div className="space-y-6">
      {/* Top Banner: Verification & Summary */}
      <div
        className={`p-4 rounded-xl border ${
          event.verified
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
            : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold text-sm mb-1.5">
          {event.verified ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <span>{event.verified ? 'Verified Intrusion' : 'Unverified Alert (Edge Sensors Only)'}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {event.verified
            ? 'Confirmed by CCTV analysis: Optical verification cross-referenced with seismic/acoustic signals.'
            : 'CCTV result not received within timeout – decision made on seismic + acoustic only.'}
        </p>
      </div>

      {/* Primary Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Alert ID</span>
          <p className="font-mono font-semibold text-slate-200 text-sm">#{event.id}</p>
        </div>

        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Source Node</span>
          <p className="font-mono font-semibold text-cyan-400 text-sm">{event.nodeLabel}</p>
          <span className="text-[10px] text-slate-500">ID: {event.nodeId}</span>
        </div>

        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Classification</span>
          <div>
            <ClassBadge cls={event.class} size="sm" />
          </div>
        </div>

        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
          <span className="text-slate-400 uppercase tracking-wider text-[10px]">Fused Confidence</span>
          <div className="pt-1">
            <ConfidenceBar value={event.confidence} size="md" />
          </div>
        </div>
      </div>

      {/* Trimodal Sensor Breakdown */}
      <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            Trimodal Sensor Breakdown
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">Edge + Cloud Fusion</span>
        </div>

        {/* 1. Seismic Sensor */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300 font-medium">Piezo Vibration (Seismic)</span>
          </div>
          <ConfidenceBar
            value={event.seismicConfidence}
            colorOverride="bg-indigo-500"
            emptyText="Not available yet"
          />
        </div>

        {/* 2. Acoustic Sensor */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-300 font-medium">Acoustic Microphone</span>
          </div>
          <ConfidenceBar
            value={event.acousticConfidence}
            colorOverride="bg-sky-500"
            emptyText="Not available yet"
          />
        </div>

        {/* 3. CCTV Video */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-300 font-medium">Cloud CCTV Video Analysis</span>
            </div>
            {event.cctvClass && (
              <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
                {event.cctvClass}
              </span>
            )}
          </div>
          <ConfidenceBar
            value={event.cctvConfidence}
            colorOverride="bg-purple-500"
            emptyText="Not available yet"
          />
        </div>

        {/* 4. Final Fused Confidence */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-200 font-bold">Overall Fused Decision</span>
            <span className="font-mono font-bold text-cyan-400">{event.confidencePercent}%</span>
          </div>
          <ConfidenceBar
            value={event.confidence}
            colorOverride="bg-cyan-500"
            showValue={false}
            size="lg"
          />
        </div>
      </div>

      {/* Timestamps & Telemetry Latency */}
      <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          Event Telemetry & Latency
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Node Timestamp (UTC):</span>
            <span className="font-mono text-slate-200">{formatDateTime(event.timestamp)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Received at Backend:</span>
            <span className="font-mono text-slate-200">{formatDateTime(event.receivedAt)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Transmission Latency:</span>
            <span className="font-mono font-semibold text-emerald-400">
              {latency || 'Sub-second (<100ms)'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Age:</span>
            <span className="text-slate-300">{formatRelativeTime(event.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Link to dedicated alert page */}
      {showFullPageLink && (
        <div className="pt-2">
          <Link
            to={`/alerts/${event.id}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
          >
            <span>Open standalone page</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default function AlertDetailsDrawer({
  isOpen,
  onClose,
  event,
}) {
  // ESC key handler to close drawer
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !event) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Right Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0e1628] border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b1120]">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Alert Details
                <span className="text-xs font-mono text-cyan-400">#{event.id}</span>
              </h2>
              <p className="text-xs text-slate-400">Node event telemetry & trimodal analysis</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
              title="Close drawer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            <AlertDetailsContent event={event} showFullPageLink={true} />
          </div>
        </div>
      </div>
    </div>
  )
}

