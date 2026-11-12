import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShieldAlert, Activity } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { AlertDetailsContent } from '../components/AlertDetailsDrawer'

export default function AlertDetails() {
  const { id } = useParams()
  const { events, loading } = useEvents()

  const alertId = parseInt(id, 10)
  const event = events.find((e) => e.id === alertId)

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="h-64 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
          <ShieldAlert className="w-6 h-6 text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-200">Alert #{id} Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The requested alert record may have expired from the recent audit buffer or does not exist.
        </p>
        <div className="pt-2">
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Alerts</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <div>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Alerts</span>
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <span>Alert Telemetry #{event.id}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Trimodal perimeter intrusion record captured at {event.nodeLabel}
        </p>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm">
        <AlertDetailsContent event={event} showFullPageLink={false} />
      </div>
    </div>
  )
}

