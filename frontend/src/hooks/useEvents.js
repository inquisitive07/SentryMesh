// Central event and application state hook + context provider
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { fetchEvents, fetchHealth, getNodes, connectAlertsSocket, normalizeEvent } from '../services/api'
import { generateInitialMockEvents, createRawMockEvent, getMockHealth, incrementMockHealth } from '../services/mockData'
import { parseDate } from '../utils/time'
import { playAlarmBeep } from '../utils/sound'
import { usePolling } from './usePolling'

export const EventContext = createContext(null)

export function EventProvider({ children }) {
  // Mode: 'live' or 'demo'
  const [mode, setModeState] = useState(() => {
    try {
      return localStorage.getItem('sentrymesh_mode') || 'live'
    } catch {
      return 'live'
    }
  })

  // Mute state
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('sentrymesh_muted') === 'true'
    } catch {
      return false
    }
  })

  // Backend connection state
  const [isConnected, setIsConnected] = useState(true)
  const [isWsConnected, setIsWsConnected] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [loading, setLoading] = useState(true)

  // Events & health data
  const [events, setEvents] = useState([])
  const [health, setHealth] = useState({
    received: 0,
    stored: 0,
    rejected: 0,
    status: 'ok',
    heartbeats: 0,
    status_messages: 0,
    rejected_other: 0,
    mqtt_connected: true,
    ws_clients: 0,
    nodes_total: 0,
    nodes_online: 0,
    heartbeat_timeout_s: 30,
  })

  // Backend node list from GET /nodes and WebSocket messages
  const [rawNodes, setRawNodes] = useState([])

  // New alert highlights (set of alert IDs)
  const [newAlertIds, setNewAlertIds] = useState(() => new Set())

  // Toasts queue: array of { id, title, message, type, timestamp }
  const [toasts, setToasts] = useState([])

  // Tracking seen events to avoid beeping on initial load
  const isInitialLoadRef = useRef(true)
  const seenEventIdsRef = useRef(new Set())
  const mockEventsRef = useRef([])
  const mockMaxIdRef = useRef(60)

  // Helper to persist mute state
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sentrymesh_muted', String(next))
      } catch (err) {
        console.warn('Failed to save mute state to localStorage', err)
      }
      return next
    })
  }, [])

  // Helper to persist mode
  const setMode = useCallback((newMode) => {
    setModeState(newMode)
    try {
      localStorage.setItem('sentrymesh_mode', newMode)
    } catch (err) {
      console.warn('Failed to save mode to localStorage', err)
    }
  }, [])

  // Toast management
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6)
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]) // keep at most 5 toasts
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Determine if we are showing mock/demo data
  const isMock = mode === 'demo' || isFallback

  // Trigger alert notification for brand-new alerts
  const handleNewAlerts = useCallback(
    (incomingEvents) => {
      if (isInitialLoadRef.current) {
        // Record all existing events without beeping or toasting
        incomingEvents.forEach((ev) => seenEventIdsRef.current.add(ev.id))
        isInitialLoadRef.current = false
        return
      }

      const freshlyArrived = []
      incomingEvents.forEach((ev) => {
        if (!seenEventIdsRef.current.has(ev.id)) {
          seenEventIdsRef.current.add(ev.id)
          freshlyArrived.push(ev)
        }
      })

      if (freshlyArrived.length > 0) {
        // Highlight rows
        setNewAlertIds((prev) => {
          const next = new Set(prev)
          freshlyArrived.forEach((e) => next.add(e.id))
          return next
        })

        // Remove highlights after 8 seconds
        setTimeout(() => {
          setNewAlertIds((prev) => {
            const next = new Set(prev)
            freshlyArrived.forEach((e) => next.delete(e.id))
            return next
          })
        }, 8000)

        // Filter out normal_noise (only true intrusion alerts trigger sound/toast)
        const intrusionAlerts = freshlyArrived.filter((e) => e.class !== 'normal_noise')

        if (intrusionAlerts.length > 0) {
          // Play audio beep
          playAlarmBeep(isMuted)

          // Show toast for the latest alert
          intrusionAlerts.forEach((alert) => {
            const verifiedText = alert.verified ? 'Verified by CCTV' : 'Unverified – sensors only'
            addToast({
              title: `${alert.classLabel} detected at ${alert.nodeLabel}`,
              message: `${alert.confidencePercent}% confidence – ${verifiedText}`,
              type: alert.verified ? 'critical' : 'warning',
              timestamp: new Date(),
              alertId: alert.id,
            })
          })
        }
      }
    },
    [isMuted, addToast]
  )

  // Initialize mock data when needed
  const initMockData = useCallback(() => {
    if (mockEventsRef.current.length === 0) {
      const initialRaws = generateInitialMockEvents(60)
      mockEventsRef.current = initialRaws.map(normalizeEvent)
      mockMaxIdRef.current = Math.max(...mockEventsRef.current.map((e) => e.id), 60)
    }
    setEvents([...mockEventsRef.current])
    setHealth(getMockHealth())
    handleNewAlerts(mockEventsRef.current)
    setLoading(false)
  }, [handleNewAlerts])

  // Helper to merge or update node objects in rawNodes state
  const updateNodesState = useCallback((nodeOrNodes) => {
    setRawNodes((prev) => {
      const map = new Map(prev.map((n) => [n.node_id, n]))
      const incoming = Array.isArray(nodeOrNodes) ? nodeOrNodes : [nodeOrNodes]
      incoming.forEach((node) => {
        if (node && node.node_id) {
          map.set(node.node_id, { ...map.get(node.node_id), ...node })
        }
      })
      return Array.from(map.values())
    })
  }, [])

  // Initial load of history & nodes from HTTP
  const loadInitialData = useCallback(async () => {
    if (mode === 'demo') {
      return
    }

    try {
      const [healthData, eventsData, nodesData] = await Promise.all([
        fetchHealth(),
        fetchEvents({ limit: 500 }),
        getNodes().catch(() => []),
      ])

      setIsConnected(true)
      setIsFallback(false)
      setHealth(healthData)
      setEvents(eventsData)
      if (nodesData && nodesData.length > 0) {
        updateNodesState(nodesData)
      }
      handleNewAlerts(eventsData)
      setLoading(false)
    } catch (err) {
      // Backend unreachable: switch to fallback demo data
      setIsConnected(false)
      setIsFallback(true)
      initMockData()
    }
  }, [mode, handleNewAlerts, initMockData, updateNodesState])

  // Polling fallback for events: ONLY runs when mode === 'live' and WebSocket is NOT connected and not in fallback
  const pollEventsFallback = useCallback(async () => {
    if (mode === 'demo' || isFallback || isWsConnected) {
      return
    }
    try {
      const eventsData = await fetchEvents({ limit: 500 })
      setIsConnected(true)
      setEvents(eventsData)
      handleNewAlerts(eventsData)
    } catch {
      setIsConnected(false)
      setIsFallback(true)
    }
  }, [mode, isFallback, isWsConnected, handleNewAlerts])

  // Poll health every 5s if connected
  const pollHealthOnly = useCallback(async () => {
    if (mode === 'demo' || isFallback) {
      setHealth(getMockHealth())
      return
    }
    try {
      const h = await fetchHealth()
      setHealth(h)
      setIsConnected(true)
    } catch {
      setIsConnected(false)
      setIsFallback(true)
    }
  }, [mode, isFallback])

  // Refresh /nodes every 10 s for last_seen
  const refreshNodes = useCallback(async () => {
    if (mode === 'demo' || isFallback) {
      return
    }
    try {
      const nodesList = await getNodes()
      if (nodesList) {
        updateNodesState(nodesList)
      }
    } catch {
      // ignore transient errors in background refresh
    }
  }, [mode, isFallback, updateNodesState])

  // Connect WebSocket when in 'live' mode
  useEffect(() => {
    if (mode === 'demo' || isFallback) {
      setIsWsConnected(false)
      return
    }

    const disconnect = connectAlertsSocket(
      (msg) => {
        if (!msg || !msg.type) return

        if (msg.type === 'snapshot') {
          if (msg.data?.nodes) {
            updateNodesState(msg.data.nodes)
          }
        } else if (msg.type === 'node_status') {
          if (msg.data) {
            updateNodesState(msg.data)
          }
        } else if (msg.type === 'alert') {
          if (msg.data) {
            const normalized = normalizeEvent(msg.data)
            if (normalized) {
              setEvents((prev) => {
                // Deduplicate by ID
                if (prev.some((e) => e.id === normalized.id)) {
                  return prev
                }
                return [normalized, ...prev]
              })
              handleNewAlerts([normalized])
            }
          }
        }
      },
      (status) => {
        setIsWsConnected(status === 'connected')
        if (status === 'connected') {
          setIsConnected(true)
        }
      }
    )

    return () => {
      disconnect()
      setIsWsConnected(false)
    }
  }, [mode, isFallback, handleNewAlerts, updateNodesState])

  // Initial load effect
  useEffect(() => {
    isInitialLoadRef.current = true
    if (mode === 'demo') {
      setIsConnected(false)
      setIsWsConnected(false)
      setIsFallback(false)
      initMockData()
    } else {
      loadInitialData()
    }
  }, [mode, loadInitialData, initMockData])

  // Poll events every 3s ONLY as a fallback while the socket is disconnected
  usePolling(pollEventsFallback, 3000, mode === 'live' && !isFallback && !isWsConnected)

  // Poll health every 5s
  usePolling(pollHealthOnly, 5000, mode === 'live' && !isFallback)

  // Refresh /nodes every 10s
  usePolling(refreshNodes, 10000, mode === 'live' && !isFallback)

  // Demo simulation timer: add new mock event every 8-15 s when mock data is active
  useEffect(() => {
    if (!isMock) return

    let timeoutId = null
    let isCancelled = false

    function scheduleNextMockEvent() {
      // Random delay between 8,000ms and 14,000ms
      const delay = Math.floor(8000 + Math.random() * 6000)
      timeoutId = setTimeout(() => {
        if (isCancelled) return

        mockMaxIdRef.current += 1
        const raw = createRawMockEvent(mockMaxIdRef.current, new Date())
        const normalized = normalizeEvent(raw)

        incrementMockHealth(true)
        mockEventsRef.current = [normalized, ...mockEventsRef.current.slice(0, 499)]
        setEvents([...mockEventsRef.current])
        setHealth(getMockHealth())
        handleNewAlerts([normalized])

        scheduleNextMockEvent()
      }, delay)
    }

    scheduleNextMockEvent()

    return () => {
      isCancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isMock, handleNewAlerts])

  // Calculate unique nodes and online status
  // When live: use rawNodes (GET /nodes + node_status) as the source of truth for online/offline
  // When in demo mode: fallback to event activity within last 60s
  const nodesStatus = useMemo(() => {
    const nodeMap = new Map()
    const now = Date.now()
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

    if (!isMock && rawNodes.length > 0) {
      // Populate nodes from authoritative backend node list
      rawNodes.forEach((node) => {
        const isOnline = node.status === 'online'
        nodeMap.set(node.node_id, {
          id: node.node_id,
          online: isOnline,
          status: node.status,
          lastSeenTime: node.last_seen ? parseDate(node.last_seen) : null,
          firstSeenTime: node.first_seen ? parseDate(node.first_seen) : null,
          firmwareVersion: node.firmware_version || null,
          ip: node.ip || null,
          alertCount: node.alert_count !== undefined ? node.alert_count : 0,
          lastAlertAt: node.last_alert_at ? parseDate(node.last_alert_at) : null,
          lastEvent: null,
          eventsCount24h: 0,
          alertsCount24h: 0,
          verifiedCount24h: 0,
          classCounts: {},
        })
      })
    } else {
      // Ensure default nodes exist so demo displays cleanly
      const defaultNodes = ['node_01', 'node_02', 'node_03', 'node_04']
      defaultNodes.forEach((nodeId) => {
        nodeMap.set(nodeId, {
          id: nodeId,
          online: false,
          status: 'offline',
          lastEvent: null,
          lastSeenTime: null,
          firstSeenTime: null,
          firmwareVersion: '1.2.0',
          ip: '192.168.1.10' + nodeId.slice(-1),
          alertCount: 0,
          lastAlertAt: null,
          eventsCount24h: 0,
          alertsCount24h: 0,
          verifiedCount24h: 0,
          classCounts: {},
        })
      })
    }

    // Correlate with alerts for recent alert state and 24h metrics
    events.forEach((ev) => {
      if (!nodeMap.has(ev.nodeId)) {
        nodeMap.set(ev.nodeId, {
          id: ev.nodeId,
          online: false,
          status: 'offline',
          lastEvent: null,
          lastSeenTime: null,
          firstSeenTime: null,
          firmwareVersion: null,
          ip: null,
          alertCount: 0,
          lastAlertAt: null,
          eventsCount24h: 0,
          alertsCount24h: 0,
          verifiedCount24h: 0,
          classCounts: {},
        })
      }

      const nodeData = nodeMap.get(ev.nodeId)
      const evDate = parseDate(ev.timestamp)
      const evTime = evDate ? evDate.getTime() : 0

      // Keep latest event (used for fence-line hover and 60s coloring)
      if (!nodeData.lastEvent || evTime > (parseDate(nodeData.lastEvent.timestamp)?.getTime() || 0)) {
        nodeData.lastEvent = ev
        if (!nodeData.lastSeenTime && isMock) {
          nodeData.lastSeenTime = evDate
        }
      }

      // In mock/demo mode only: infer online from 60s activity
      if (isMock && now - evTime <= 60 * 1000) {
        nodeData.online = true
        nodeData.status = 'online'
      }

      // 24h stats
      if (evTime >= twentyFourHoursAgo) {
        nodeData.eventsCount24h += 1
        if (ev.class !== 'normal_noise') {
          nodeData.alertsCount24h += 1
          if (ev.verified) {
            nodeData.verifiedCount24h += 1
          }
        }
        nodeData.classCounts[ev.class] = (nodeData.classCounts[ev.class] || 0) + 1
      }
    })

    const nodesList = Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id))
    const onlineNodes = nodesList.filter((n) => n.online)

    return {
      allNodes: nodesList,
      onlineNodes,
      totalCount: nodesList.length,
      onlineCount: onlineNodes.length,
    }
  }, [events, rawNodes, isMock])

  const contextValue = {
    events,
    health,
    isConnected,
    isWsConnected,
    isFallback,
    isMock,
    mode,
    setMode,
    isMuted,
    toggleMute,
    loading,
    nodesStatus,
    newAlertIds,
    toasts,
    dismissToast,
    refreshEvents: pollEventsFallback,
  }

  return React.createElement(EventContext.Provider, { value: contextValue }, children)
}

export function useEvents() {
  const context = useContext(EventContext)
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider')
  }
  return context
}
