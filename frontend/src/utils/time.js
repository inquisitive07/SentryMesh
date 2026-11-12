// Time formatting and calculation utilities

export function parseDate(dateStr) {
  if (!dateStr) return null
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr

  let str = String(dateStr).trim()
  // If it's SQLite "YYYY-MM-DD HH:MM:SS" without T or Z, append Z or treat as UTC
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z'
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function formatTime(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return '--:--:--'
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatDateTime(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return '--'
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatRelativeTime(dateStr, baseDate = new Date()) {
  const d = parseDate(dateStr)
  if (!d) return '--'

  const diffMs = baseDate.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

/**
 * Calculates latency between node alert timestamp and server received_at timestamp
 */
export function calculateLatency(timestamp, receivedAt) {
  if (!timestamp || !receivedAt) return null
  const d1 = parseDate(timestamp)
  const d2 = parseDate(receivedAt)
  if (!d1 || !d2) return null

  const diffMs = d2.getTime() - d1.getTime()
  if (Math.abs(diffMs) < 1000) {
    const sign = diffMs >= 0 ? '+' : '-'
    return `${sign}${Math.abs(diffMs)} ms`
  }
  const diffSec = (diffMs / 1000).toFixed(1)
  const sign = diffMs >= 0 ? '+' : ''
  return `${sign}${diffSec} s`
}

/**
 * Generates 24 hourly buckets for the last 24h
 * Each bucket: { hourLabel: 'HH:00', timestamp: Date, verified: 0, unverified: 0, total: 0 }
 */
export function buildHourlyBuckets(events = [], now = new Date()) {
  const buckets = []
  const currentHourEnd = new Date(now)
  currentHourEnd.setMinutes(59, 59, 999)

  // 24 buckets going backwards
  for (let i = 23; i >= 0; i--) {
    const bucketDate = new Date(currentHourEnd.getTime() - i * 60 * 60 * 1000)
    const hour = bucketDate.getHours()
    const label = `${String(hour).padStart(2, '0')}:00`
    buckets.push({
      hourLabel: label,
      timeSlot: bucketDate,
      verified: 0,
      unverified: 0,
      total: 0,
    })
  }

  const twentyFourHoursAgo = now.getTime() - 24 * 60 * 60 * 1000

  events.forEach((ev) => {
    // Only count alerts (ignore normal_noise in intrusion timeline)
    if (ev.class === 'normal_noise') return

    const d = parseDate(ev.timestamp)
    if (!d) return
    const t = d.getTime()
    if (t < twentyFourHoursAgo || t > now.getTime()) return

    // Find bucket
    const diffHours = Math.floor((now.getTime() - t) / (60 * 60 * 1000))
    const bucketIndex = 23 - diffHours
    if (bucketIndex >= 0 && bucketIndex < 24) {
      if (ev.verified) {
        buckets[bucketIndex].verified += 1
      } else {
        buckets[bucketIndex].unverified += 1
      }
      buckets[bucketIndex].total += 1
    }
  })

  return buckets
}

