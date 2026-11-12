// CSV export utility for filtered alerts
import { formatDateTime, calculateLatency } from './time.js'

export function exportAlertsToCsv(events, filename = null) {
  if (!events || events.length === 0) {
    alert('No events to export')
    return
  }

  const headers = [
    'Alert ID',
    'Node ID',
    'Node Name',
    'Class',
    'Class Label',
    'Confidence (%)',
    'Verification Status',
    'Event Timestamp (UTC)',
    'Received At (Server)',
    'Network Delay'
  ]

  const rows = events.map((ev) => {
    const verifiedText = ev.verified ? 'Verified (CCTV)' : 'Unverified (Sensors only)'
    const latency = calculateLatency(ev.timestamp, ev.receivedAt) || 'N/A'
    
    return [
      ev.id,
      ev.nodeId,
      ev.nodeLabel,
      ev.class,
      ev.classLabel,
      `${ev.confidencePercent}%`,
      verifiedText,
      ev.timestamp,
      ev.receivedAt,
      latency
    ].map((val) => {
      const str = String(val ?? '')
      // Escape CSV special characters
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  const defaultFilename = `sentrymesh_alerts_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`
  link.setAttribute('download', filename || defaultFilename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

