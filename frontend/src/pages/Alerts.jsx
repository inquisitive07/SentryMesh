import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import NodeFilter from '../components/NodeFilter'
import AlertsTable from '../components/AlertsTable'
import AlertDetailsDrawer from '../components/AlertDetailsDrawer'
import { exportAlertsToCsv } from '../utils/csv'
import { parseDate } from '../utils/time'

const PAGE_SIZE = 20

export default function Alerts() {
  const { events, nodesStatus, newAlertIds, loading } = useEvents()
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedAlertForDrawer, setSelectedAlertForDrawer] = useState(null)

  // Read filters from URL query parameters
  const selectedNodes = useMemo(() => {
    const raw = searchParams.get('node')
    return raw ? raw.split(',').filter(Boolean) : []
  }, [searchParams])

  const selectedClasses = useMemo(() => {
    const raw = searchParams.get('class')
    return raw ? raw.split(',').filter(Boolean) : []
  }, [searchParams])

  const verifiedFilter = searchParams.get('verified') || 'all'
  const minConfidence = Number(searchParams.get('min_conf')) || 0
  const hideNoise = searchParams.get('hide_noise') !== 'false' // default true
  const sortParam = searchParams.get('sort') || 'time_desc'
  const [sortField, sortDirection] = sortParam.split('_')
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  // Update query params helper
  function updateParams(newParams) {
    const next = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
        next.delete(key)
      } else if (Array.isArray(val)) {
        next.set(key, val.join(','))
      } else {
        next.set(key, String(val))
      }
    })
    setSearchParams(next)
  }

  // Filter handlers
  function handleNodesChange(nodes) {
    updateParams({ node: nodes, page: 1 })
  }

  function handleClassesChange(classes) {
    updateParams({ class: classes, page: 1 })
  }

  function handleVerifiedChange(mode) {
    updateParams({ verified: mode === 'all' ? null : mode, page: 1 })
  }

  function handleMinConfidenceChange(val) {
    updateParams({ min_conf: val === 0 ? null : val, page: 1 })
  }

  function handleHideNoiseChange(val) {
    updateParams({ hide_noise: val ? null : 'false', page: 1 })
  }

  function handleSortChange(field, dir) {
    updateParams({ sort: `${field}_${dir}`, page: 1 })
  }

  function handleResetFilters() {
    setSearchParams(new URLSearchParams())
  }

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => {
        // Hide normal noise if enabled
        if (hideNoise && ev.class === 'normal_noise') {
          return false
        }

        // Node filter
        if (selectedNodes.length > 0 && !selectedNodes.includes(ev.nodeId)) {
          return false
        }

        // Class filter
        if (selectedClasses.length > 0 && !selectedClasses.includes(ev.class)) {
          return false
        }

        // Verification filter
        if (verifiedFilter === 'verified' && !ev.verified) {
          return false
        }
        if (verifiedFilter === 'unverified' && ev.verified) {
          return false
        }

        // Min confidence
        if (ev.confidencePercent < minConfidence) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortField === 'confidence') {
          const diff = a.confidencePercent - b.confidencePercent
          return sortDirection === 'asc' ? diff : -diff
        }
        // default time
        const timeA = parseDate(a.timestamp)?.getTime() || 0
        const timeB = parseDate(b.timestamp)?.getTime() || 0
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA
      })
  }, [events, selectedNodes, selectedClasses, verifiedFilter, minConfidence, hideNoise, sortField, sortDirection])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE))
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredEvents.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredEvents, currentPage])

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > totalPages) return
    updateParams({ page: newPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleExportCsv() {
    exportAlertsToCsv(filteredEvents)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-cyan-400" />
            Alert Audit & Incident Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time feed of sensor-detected intrusion events, verification states, and telemetry.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <NodeFilter
        allNodes={nodesStatus.allNodes}
        selectedNodes={selectedNodes}
        onChangeNodes={handleNodesChange}
        selectedClasses={selectedClasses}
        onChangeClasses={handleClassesChange}
        verifiedFilter={verifiedFilter}
        onChangeVerified={handleVerifiedChange}
        minConfidence={minConfidence}
        onChangeMinConfidence={handleMinConfidenceChange}
        hideNoise={hideNoise}
        onChangeHideNoise={handleHideNoiseChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onChangeSort={handleSortChange}
        onResetFilters={handleResetFilters}
        onExportCsv={handleExportCsv}
        filteredCount={filteredEvents.length}
        totalCount={events.length}
      />

      {/* Alerts Table */}
      <div className="space-y-4">
        <AlertsTable
          events={paginatedEvents}
          onSelectAlert={(alert) => setSelectedAlertForDrawer(alert)}
          newAlertIds={newAlertIds}
          loading={loading}
          emptyMessage="No events match current filter criteria"
        />

        {/* Pagination Bar */}
        {filteredEvents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-400">
            <div>
              Showing{' '}
              <span className="font-mono font-semibold text-slate-200">
                {Math.min(filteredEvents.length, (currentPage - 1) * PAGE_SIZE + 1)}
              </span>{' '}
              to{' '}
              <span className="font-mono font-semibold text-slate-200">
                {Math.min(filteredEvents.length, currentPage * PAGE_SIZE)}
              </span>{' '}
              of <span className="font-mono font-semibold text-slate-200">{filteredEvents.length}</span> events
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <span className="font-mono text-slate-300 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <AlertDetailsDrawer
        isOpen={Boolean(selectedAlertForDrawer)}
        onClose={() => setSelectedAlertForDrawer(null)}
        event={selectedAlertForDrawer}
      />
    </div>
  )
}

