import React from 'react'
import { Filter, RotateCcw, Download, Check, SlidersHorizontal } from 'lucide-react'
import { ALL_CLASSES, getClassLabel, formatNodeName } from '../utils/labels'

export default function NodeFilter({
  allNodes = [],
  selectedNodes = [],
  onChangeNodes = () => {},
  selectedClasses = [],
  onChangeClasses = () => {},
  verifiedFilter = 'all', // 'all' | 'verified' | 'unverified'
  onChangeVerified = () => {},
  minConfidence = 0,
  onChangeMinConfidence = () => {},
  hideNoise = true,
  onChangeHideNoise = () => {},
  sortField = 'time', // 'time' | 'confidence'
  sortDirection = 'desc', // 'desc' | 'asc'
  onChangeSort = () => {},
  onResetFilters = () => {},
  onExportCsv = () => {},
  filteredCount = 0,
  totalCount = 0,
}) {
  // Toggle a single node in multi-select
  function toggleNode(nodeId) {
    if (selectedNodes.includes(nodeId)) {
      onChangeNodes(selectedNodes.filter((id) => id !== nodeId))
    } else {
      onChangeNodes([...selectedNodes, nodeId])
    }
  }

  // Toggle a class in multi-select
  function toggleClass(cls) {
    if (selectedClasses.includes(cls)) {
      onChangeClasses(selectedClasses.filter((c) => c !== cls))
    } else {
      onChangeClasses([...selectedClasses, cls])
    }
  }

  const availableNodeIds = allNodes.length > 0 ? allNodes.map((n) => n.id) : ['node_01', 'node_02', 'node_03', 'node_04']

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Alert Filters & Controls</h3>
          <span className="text-xs text-slate-400 font-mono">
            (Showing {filteredCount} of {totalCount} events)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-colors"
            title="Download CSV of filtered events"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs transition-colors"
            title="Reset all filters to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Filter Row 1: Node selection & Class selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nodes multi-select buttons */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Nodes Filter ({selectedNodes.length === 0 ? 'All Nodes' : `${selectedNodes.length} selected`})
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChangeNodes([])}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                selectedNodes.length === 0
                  ? 'bg-cyan-600 text-white border-cyan-500 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {availableNodeIds.map((nodeId) => {
              const isSelected = selectedNodes.includes(nodeId)
              return (
                <button
                  key={nodeId}
                  type="button"
                  onClick={() => toggleNode(nodeId)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-semibold'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                  {formatNodeName(nodeId)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Classes multi-select */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Classification ({selectedClasses.length === 0 ? 'All Classes' : `${selectedClasses.length} selected`})
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChangeClasses([])}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                selectedClasses.length === 0
                  ? 'bg-cyan-600 text-white border-cyan-500 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {ALL_CLASSES.map((cls) => {
              const isSelected = selectedClasses.includes(cls)
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => toggleClass(cls)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-semibold'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                  {getClassLabel(cls)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter Row 2: Verification, Min Confidence, Hide Noise, Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800/60">
        
        {/* Verification Status */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Verification
          </label>
          <div className="flex bg-slate-950/80 rounded-lg p-0.5 border border-slate-800 text-xs">
            {['all', 'verified', 'unverified'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeVerified(mode)}
                className={`flex-1 py-1 px-2 rounded-md capitalize transition-colors text-xs ${
                  verifiedFilter === mode
                    ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Min Confidence Slider */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Min Confidence
            </label>
            <span className="font-mono text-xs text-cyan-400 font-semibold">
              {minConfidence}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minConfidence}
            onChange={(e) => onChangeMinConfidence(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Sort selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Sort Order
          </label>
          <select
            value={`${sortField}_${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('_')
              onChangeSort(field, dir)
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="time_desc">Newest First</option>
            <option value="time_asc">Oldest First</option>
            <option value="confidence_desc">Highest Confidence</option>
            <option value="confidence_asc">Lowest Confidence</option>
          </select>
        </div>

        {/* Hide Normal Noise Checkbox */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer pt-3">
            <input
              type="checkbox"
              checked={hideNoise}
              onChange={(e) => onChangeHideNoise(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-xs text-slate-300 font-medium">
              Hide Normal/Noise non-alerts
            </span>
          </label>
        </div>

      </div>
    </div>
  )
}

