// Mock data generator for SentryMesh demo & fallback mode
// Produces raw objects matching the backend contract exactly

const NODES = ['node_01', 'node_02', 'node_03', 'node_04']
const CLASSES = ['normal_noise', 'walk_run', 'vehicle', 'digging', 'climbing_cutting']

// Weights for realistic distribution:
// normal_noise (35%), walk_run (25%), vehicle (15%), digging (15%), climbing_cutting (10%)
function getRandomClass() {
  const r = Math.random()
  if (r < 0.35) return 'normal_noise'
  if (r < 0.60) return 'walk_run'
  if (r < 0.75) return 'vehicle'
  if (r < 0.90) return 'digging'
  return 'climbing_cutting'
}

function getRandomConfidence(cls) {
  if (cls === 'normal_noise') {
    return +(0.45 + Math.random() * 0.40).toFixed(2)
  }
  return +(0.68 + Math.random() * 0.30).toFixed(2)
}

function formatSqliteDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  const Y = d.getUTCFullYear()
  const M = pad(d.getUTCMonth() + 1)
  const D = pad(d.getUTCDate())
  const h = pad(d.getUTCHours())
  const m = pad(d.getUTCMinutes())
  const s = pad(d.getUTCSeconds())
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

export function createRawMockEvent(id, timestampDate, nodeId = null, cls = null, verified = null) {
  const d = timestampDate || new Date()
  const selectedNode = nodeId || NODES[Math.floor(Math.random() * NODES.length)]
  const selectedClass = cls || getRandomClass()
  const isNormal = selectedClass === 'normal_noise'
  
  // Normal noise is typically not verified by CCTV
  const isVerified = verified !== null 
    ? (verified ? 1 : 0) 
    : (isNormal ? 0 : (Math.random() > 0.35 ? 1 : 0))

  const fusedConf = getRandomConfidence(selectedClass)
  
  // Per-modality confidences for demo preview:
  const seismicConf = +(fusedConf + (Math.random() * 0.12 - 0.06)).toFixed(2)
  const acousticConf = +(fusedConf + (Math.random() * 0.14 - 0.07)).toFixed(2)
  
  // CCTV confidence: only present if verified
  const cctvConf = isVerified === 1 
    ? +(fusedConf + (Math.random() * 0.08 - 0.03)).toFixed(2) 
    : null
  const cctvCls = isVerified === 1 ? selectedClass : null

  // Received at is roughly 100-800ms after timestamp
  const receivedDate = new Date(d.getTime() + Math.floor(120 + Math.random() * 450))

  return {
    id,
    node_id: selectedNode,
    timestamp: d.toISOString(),
    class: selectedClass,
    confidence: Math.min(0.99, Math.max(0.40, fusedConf)),
    verified: isVerified,
    received_at: formatSqliteDate(receivedDate),
    // Optional per-modality breakdown for preview
    cctv_class: cctvCls,
    cctv_confidence: cctvConf ? Math.min(0.99, Math.max(0.40, cctvConf)) : null,
    seismic_confidence: Math.min(0.99, Math.max(0.35, seismicConf)),
    acoustic_confidence: Math.min(0.99, Math.max(0.35, acousticConf)),
  }
}

/**
 * Generates initial ~60 mock events spread over the last 24h
 * Guaranteed to have recent events so nodes appear online
 */
export function generateInitialMockEvents(count = 60) {
  const now = Date.now()
  const events = []

  // Ensure 1-2 very fresh events in the last 40 seconds (for online active status)
  events.push(createRawMockEvent(
    count,
    new Date(now - 12 * 1000),
    'node_01',
    'digging',
    1
  ))

  events.push(createRawMockEvent(
    count - 1,
    new Date(now - 35 * 1000),
    'node_02',
    'walk_run',
    0
  ))

  events.push(createRawMockEvent(
    count - 2,
    new Date(now - 55 * 1000),
    'node_03',
    'normal_noise',
    0
  ))

  // The rest spread across the last 24 hours
  const hoursSpanMs = 24 * 60 * 60 * 1000
  for (let i = 4; i <= count; i++) {
    const id = count - i + 1
    // Exponential or staggered distribution: more recent events, fewer 20h ago
    const factor = Math.pow(Math.random(), 1.4)
    const timeAgoMs = Math.floor(factor * hoursSpanMs) + 60 * 1000
    const eventTime = new Date(now - timeAgoMs)
    events.push(createRawMockEvent(id, eventTime))
  }

  // Sort newest first (highest timestamp / id)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  // Re-index IDs so they are sequential descending
  events.forEach((ev, idx) => {
    ev.id = count - idx
  })

  return events
}

let mockHealthCounters = {
  received: 74,
  stored: 71,
  rejected: 3,
}

export function getMockHealth() {
  return {
    status: 'ok',
    ...mockHealthCounters,
  }
}

export function incrementMockHealth(stored = true) {
  mockHealthCounters.received += 1
  if (stored) {
    mockHealthCounters.stored += 1
  } else {
    mockHealthCounters.rejected += 1
  }
}

