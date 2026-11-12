import React, { useState } from 'react'
import { Shield, ShieldAlert, ShieldCheck, X, Activity, Radio } from 'lucide-react'
import { formatNodeName, getClassLabel } from '../utils/labels'
import { formatTime, formatRelativeTime } from '../utils/time'

export default function FenceLine({
  nodes = [],
  selectedNode = null,
  onSelectNode = () => {},
  onClearFilter = () => {},
}) {
  const [hoveredNode, setHoveredNode] = useState(null)
  const now = Date.now()

  // Ensure node_01 to node_04 minimum
  const displayNodes = [...nodes]
  if (displayNodes.length === 0) {
    ['node_01', 'node_02', 'node_03', 'node_04'].forEach((id) => {
      displayNodes.push({ id, online: false, lastEvent: null })
    })
  }

  // Determine state for each node:
  // Red pulsing = verified alert in the last 60 s
  // Amber = unverified alert in the last 60 s
  // Green = quiet (online, but no alert in last 60s or only normal_noise)
  // Grey = offline (no event in last 60s)
  function getNodeStatus(node) {
    if (!node.online) {
      return {
        state: 'offline',
        label: 'Offline',
        color: '#64748b', // Slate 500
        bgClass: 'fill-slate-800 stroke-slate-600',
        dotClass: 'bg-slate-500',
        pulse: false,
      }
    }

    const lastEv = node.lastEvent
    const timeSinceLast = lastEv ? now - new Date(lastEv.timestamp).getTime() : Infinity

    if (lastEv && timeSinceLast <= 60000 && lastEv.class !== 'normal_noise') {
      if (lastEv.verified) {
        return {
          state: 'verified_alert',
          label: 'Verified Intrusion',
          color: '#ef4444', // Red
          bgClass: 'fill-rose-950 stroke-rose-500',
          dotClass: 'bg-rose-500',
          pulse: true,
        }
      }
      return {
        state: 'unverified_alert',
        label: 'Unverified Alert',
        color: '#f59e0b', // Amber
        bgClass: 'fill-amber-950 stroke-amber-500',
        dotClass: 'bg-amber-500',
        pulse: false,
      }
    }

    return {
      state: 'quiet',
      label: 'Quiet (Secured)',
      color: '#10b981', // Emerald
      bgClass: 'fill-emerald-950 stroke-emerald-500',
      dotClass: 'bg-emerald-400',
      pulse: false,
    }
  }

  const svgWidth = 840
  const svgHeight = 160
  const postSpacing = svgWidth / (displayNodes.length + 1)

  return (
    <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-5 shadow-lg backdrop-blur-sm">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Physical Fence-Line Perimeter Schematic
          </h2>
          <p className="text-xs text-slate-400">
            Trimodal seismic & acoustic sensors spaced along fence barrier. Click any node to filter alerts.
          </p>
        </div>

        {/* Clear filter chip if node selected */}
        {selectedNode && (
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded-full text-xs text-cyan-300">
            <span>Filtered: <strong>{formatNodeName(selectedNode)}</strong></span>
            <button
              type="button"
              onClick={onClearFilter}
              className="p-0.5 hover:bg-cyan-800/50 rounded-full transition-colors text-cyan-300"
              title="Clear node filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-300">Quiet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="text-slate-300">Unverified Alert (&lt;60s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-slate-300">Verified Intrusion (&lt;60s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block"></span>
            <span className="text-slate-400">Offline</span>
          </div>
        </div>
      </div>

      {/* SVG Fence Graphic */}
      <div className="relative overflow-x-auto py-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-full h-auto min-w-[650px] select-none"
        >
          <defs>
            {/* Pattern for fence chainlink / wire mesh */}
            <pattern id="fenceMesh" width="16" height="16" patternUnits="userSpaceOnUse">
              <path
                d="M 0 8 L 8 0 L 16 8 L 8 16 Z"
                fill="none"
                stroke="#334155"
                strokeWidth="0.8"
                strokeOpacity="0.4"
              />
            </pattern>
            {/* Pulsing ring animation for verified intrusion */}
            <radialGradient id="redGlow">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ground line */}
          <line x1="20" y1="125" x2={svgWidth - 20} y2="125" stroke="#334155" strokeWidth="2" />
          <line x1="20" y1="128" x2={svgWidth - 20} y2="128" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

          {/* Fence wire mesh background area */}
          <rect x="30" y="35" width={svgWidth - 60} height="85" fill="url(#fenceMesh)" />

          {/* Horizontal top, middle, and bottom security tension cables */}
          <line x1="30" y1="35" x2={svgWidth - 30} y2="35" stroke="#475569" strokeWidth="2" />
          <line x1="30" y1="75" x2={svgWidth - 30} y2="75" stroke="#334155" strokeWidth="1.5" />
          <line x1="30" y1="120" x2={svgWidth - 30} y2="120" stroke="#475569" strokeWidth="2" />

          {/* Fence Posts */}
          {displayNodes.map((_, idx) => {
            const x = postSpacing * (idx + 1)
            return (
              <g key={`post-${idx}`}>
                <rect x={x - 3} y="25" width="6" height="100" fill="#334155" rx="1" />
                <path d={`M ${x - 5} 25 L ${x} 18 L ${x + 5} 25 Z`} fill="#475569" />
              </g>
            )
          })}

          {/* Outer edge fence posts */}
          <rect x="25" y="25" width="6" height="100" fill="#334155" rx="1" />
          <rect x={svgWidth - 31} y="25" width="6" height="100" fill="#334155" rx="1" />

          {/* Nodes placed on posts */}
          {displayNodes.map((node, idx) => {
            const x = postSpacing * (idx + 1)
            const y = 60
            const status = getNodeStatus(node)
            const isSelected = selectedNode === node.id

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-transform duration-150 hover:scale-110"
                onClick={() => (isSelected ? onClearFilter() : onSelectNode(node.id))}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Selection indicator ring */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r="28"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Pulsing ring for verified alert */}
                {status.pulse && (
                  <circle cx={x} cy={y} r="26" fill="url(#redGlow)" className="animate-ping opacity-60" />
                )}

                {/* Node Outer Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r="19"
                  className={`${status.bgClass} transition-colors`}
                  strokeWidth="2.5"
                />

                {/* Node Core status circle */}
                <circle cx={x} cy={y} r="8" fill={status.color} />

                {/* Antenna stick */}
                <line x1={x} y1={y - 19} x2={x} y2={y - 32} stroke={status.color} strokeWidth="2" />
                <circle cx={x} cy={y - 32} r="3" fill={status.color} />

                {/* Node ID Label */}
                <text
                  x={x}
                  y="145"
                  textAnchor="middle"
                  className={`text-xs font-mono font-semibold transition-colors ${
                    isSelected ? 'fill-cyan-400 font-bold' : 'fill-slate-300'
                  }`}
                >
                  {formatNodeName(node.id)}
                </text>

                {/* Status caption */}
                <text
                  x={x}
                  y="157"
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 font-sans"
                >
                  {status.label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Hover Popover Tooltip */}
        {hoveredNode && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 border border-slate-700/80 rounded-lg p-3 shadow-2xl text-xs min-w-[220px] backdrop-blur-md"
            style={{
              top: '10px',
              left: `${Math.min(svgWidth - 240, Math.max(10, (displayNodes.findIndex((n) => n.id === hoveredNode.id) + 1) * (100 / (displayNodes.length + 1)) * 7))}%`,
            }}
          >
            <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-1.5 mb-2">
              <span className="text-slate-100">{formatNodeName(hoveredNode.id)}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                  hoveredNode.online
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {hoveredNode.online ? 'Online' : 'Offline'}
              </span>
            </div>

            {hoveredNode.lastEvent ? (
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Class:</span>
                  <span className="font-medium text-slate-200">
                    {hoveredNode.lastEvent.classLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-mono text-slate-200">
                    {hoveredNode.lastEvent.confidencePercent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verification:</span>
                  <span className={hoveredNode.lastEvent.verified ? 'text-emerald-400' : 'text-amber-400'}>
                    {hoveredNode.lastEvent.verified ? 'Verified (CCTV)' : 'Unverified'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                  <span>Last Seen:</span>
                  <span className="font-mono">
                    {formatRelativeTime(hoveredNode.lastEvent.timestamp)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic">No events recorded yet for this sensor</p>
            )}

            <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-cyan-400 text-center font-medium">
              Click node to filter table
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

