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
    heartbeats: Number(data.heartbeats) || 0,
    status_messages: Number(data.status_messages) || 0,
    rejected_other: Number(data.rejected_other) || 0,
    mqtt_connected: Boolean(data.mqtt_connected),
    ws_clients: Number(data.ws_clients) || 0,
    nodes_total: Number(data.nodes_total) || 0,
    nodes_online: Number(data.nodes_online) || 0,
    heartbeat_timeout_s: Number(data.heartbeat_timeout_s) || 30,
  }
}

/**
 * Fetch nodes list from GET /nodes
 */
export async function getNodes(signal) {
  const res = await fetch(`${API_BASE}/nodes`, {
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
    throw new Error('Expected array of nodes from server')
  }

  return list
}

/**
 * Connect to WebSocket /ws/alerts with auto-reconnect (exponential backoff, max 30 s)
 * and ping/pong keep-alive every 25 s.
 *
 * onMessage callback receives parsed message objects:
 *   - { type: "snapshot", data: { nodes: [...] } }
 *   - { type: "alert", data: <raw event> }
 *   - { type: "node_status", data: <node object> }
 *
 * onStatusChange(status: "connected" | "disconnected") is optional
 * Returns cleanup function to disconnect cleanly.
 */
export function connectAlertsSocket(onMessage, onStatusChange = () => {}) {
  let ws = null
  let isClosedIntentionally = false
  let pingTimer = null
  let reconnectTimer = null
  let retryCount = 0

  // Derive ws/wss url from API_BASE
  const apiUrl = new URL(API_BASE)
  const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${wsProtocol}//${apiUrl.host}/ws/alerts`

  function scheduleReconnect() {
    if (isClosedIntentionally) return
    // Exponential backoff: min 1s, doubling, capped at 30s
    const delay = Math.min(30000, 1000 * Math.pow(1.5, retryCount))
    retryCount++
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  function startPing() {
    stopPing()
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('ping')
      }
    }, 25000)
  }

  function stopPing() {
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  function connect() {
    if (isClosedIntentionally) return

    try {
      ws = new WebSocket(wsUrl)
    } catch (err) {
      onStatusChange('disconnected')
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      retryCount = 0
      onStatusChange('connected')
      startPing()
    }

    ws.onmessage = (event) => {
      if (event.data === 'pong') {
        return
      }
      try {
        const parsed = JSON.parse(event.data)
        if (parsed && typeof onMessage === 'function') {
          onMessage(parsed)
        }
      } catch (err) {
        console.warn('[ws] Failed to parse message:', event.data, err)
      }
    }

    ws.onclose = () => {
      stopPing()
      onStatusChange('disconnected')
      scheduleReconnect()
    }

    ws.onerror = () => {
      // onerror is immediately followed by onclose
      stopPing()
      onStatusChange('disconnected')
    }
  }

  connect()

  return function disconnect() {
    isClosedIntentionally = true
    stopPing()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    onStatusChange('disconnected')
  }
}

/**
 * Fetch events list from GET /events
 * Supports limit, offset, nodeId, cls query parameters
 */
export async function fetchEvents({ limit = 500, offset = 0, nodeId = null, cls = null, signal } = {}) {
  const url = new URL(`${API_BASE}/events`)
  if (limit) url.searchParams.set('limit', String(limit))
  if (offset) url.searchParams.set('offset', String(offset))
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
