// API client for SentryMesh backend + single event normalization function
import { getClassLabel, formatNodeName } from '../utils/labels.js'

export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000'

/**
 * Normalizes a raw event from backend (or mock generator) into
 * a standard, well-typed frontend model.
 * All field mapping is consolidated here.
 */
export function normalizeEvent(raw) {
  if (!raw) return null

  const isVerified = Boolean(raw.verified === 1 || raw.verified === true)
  const confidence = typeof raw.confidence === 'number' ? raw.confidence : parseFloat(raw.confidence) || 0
  const confidencePercent = Math.round(confidence * 100)

  // Per-modality optional values - do NOT invent if missing!
  const seismicConfidence =
    raw.seismic_confidence !== undefined && raw.seismic_confidence !== null
      ? Number(raw.seismic_confidence)
      : null

  const acousticConfidence =
    raw.acoustic_confidence !== undefined && raw.acoustic_confidence !== null
      ? Number(raw.acoustic_confidence)
      : null

  const cctvConfidence =
    raw.cctv_confidence !== undefined && raw.cctv_confidence !== null
      ? Number(raw.cctv_confidence)
      : null

  const cctvClass = raw.cctv_class || null

  return {
    id: raw.id,
    nodeId: raw.node_id,
    nodeLabel: formatNodeName(raw.node_id),
    class: raw.class,
    classLabel: getClassLabel(raw.class),
    confidence: confidence,
    confidencePercent: confidencePercent,
    verified: isVerified,
    timestamp: raw.timestamp,
    receivedAt: raw.received_at,
    // Modality details
    seismicConfidence,
    acousticConfidence,
    cctvConfidence,
    cctvClass,
    // Helper flags
    isNormalNoise: raw.class === 'normal_noise',
    raw, // preserve raw reference if needed
  }
}

/**
 * Fetch health stats from GET /health
 */
export async function fetchHealth(signal) {
  const res = await fetch(`${API_BASE}/health`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${res.statusText}`)
  }

  const data = await res.json()
  return {
    status: data.status || 'ok',
    received: Number(data.received) || 0,
    stored: Number(data.stored) || 0,
    rejected: Number(data.rejected) || 0,
  }
}

/**
 * Fetch events list from GET /events
 * Supports limit, nodeId, cls query parameters
 */
export async function fetchEvents({ limit = 500, nodeId = null, cls = null, signal } = {}) {
  const url = new URL(`${API_BASE}/events`)
  if (limit) url.searchParams.set('limit', String(limit))
  if (nodeId) url.searchParams.set('node_id', nodeId)
  if (cls) url.searchParams.set('class', cls)

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${res.statusText}`)
  }

  const list = await res.json()
  if (!Array.isArray(list)) {
    throw new Error('Expected array of events from server')
  }

  return list.map(normalizeEvent)
}

