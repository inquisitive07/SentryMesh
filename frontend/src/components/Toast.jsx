import React, { useEffect } from 'react'
import { ShieldAlert, ShieldCheck, X } from 'lucide-react'

export function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 6000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const isCritical = toast.type === 'critical'

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 max-w-sm w-full ${
        isCritical
          ? 'bg-[#1a0f17] border-rose-500/50 text-slate-100 shadow-rose-950/40'
          : 'bg-[#1c180e] border-amber-500/50 text-slate-100 shadow-amber-950/40'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isCritical ? (
          <ShieldCheck className="w-5 h-5 text-rose-400" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-amber-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold tracking-tight text-slate-100">
          {toast.title}
        </h4>
        <p className="text-xs text-slate-300 mt-0.5 leading-snug">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts = [], onDismiss = () => {} }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

