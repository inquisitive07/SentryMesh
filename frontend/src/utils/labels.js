// Intrusion class definitions, labels, colors, and node formatting

export const CLASS_CONFIG = {
  normal_noise: {
    label: 'Normal/Noise',
    shortLabel: 'Normal',
    color: '#10b981', // Emerald
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    isAlert: false,
  },
  walk_run: {
    label: 'Walk/Run',
    shortLabel: 'Walk/Run',
    color: '#38bdf8', // Sky
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    badge: 'bg-sky-950/60 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400',
    isAlert: true,
  },
  vehicle: {
    label: 'Vehicle',
    shortLabel: 'Vehicle',
    color: '#a855f7', // Purple
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    badge: 'bg-purple-950/60 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
    isAlert: true,
  },
  digging: {
    label: 'Digging',
    shortLabel: 'Digging',
    color: '#f59e0b', // Amber
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    badge: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
    isAlert: true,
  },
  climbing_cutting: {
    label: 'Climbing/Cutting',
    shortLabel: 'Climbing/Cutting',
    color: '#f43f5e', // Rose/Red
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    badge: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400',
    isAlert: true,
  },
}

export const ALL_CLASSES = Object.keys(CLASS_CONFIG)
export const ALERT_CLASSES = ALL_CLASSES.filter((cls) => CLASS_CONFIG[cls].isAlert)

export function getClassLabel(cls) {
  return CLASS_CONFIG[cls]?.label || cls || 'Unknown'
}

export function getClassConfig(cls) {
  return (
    CLASS_CONFIG[cls] || {
      label: cls || 'Unknown',
      shortLabel: cls || 'Unknown',
      color: '#94a3b8',
      bg: 'bg-slate-500/15',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      badge: 'bg-slate-900 text-slate-300 border-slate-700',
      dot: 'bg-slate-400',
      isAlert: true,
    }
  )
}

/**
 * Format raw node_id (e.g. "node_01") into human display label "Node 01"
 */
export function formatNodeName(nodeId) {
  if (!nodeId) return 'Unknown Node'
  const match = String(nodeId).match(/^node_?(\d+)$/i)
  if (match) {
    const num = match[1].padStart(2, '0')
    return `Node ${num}`
  }
  return nodeId
}

