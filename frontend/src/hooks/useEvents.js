// Central event and application state hook + context provider
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { fetchEvents, fetchHealth, normalizeEvent } from '../services/api'
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
  const [isFallback, setIsFallback] = useState(false)
  const [loading, setLoading] = useState(true)

  // Events & health data
  const [events, setEvents] = useState([])
  const [health, setHealth] = useState({ received: 0, stored: 0, rejected: 0, status: 'ok' })

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

  // Fetch from real backend
  const pollBackend = useCallback(async () => {
    if (mode === 'demo') {
      // In explicit demo mode, don't poll backend
      return
    }

    try {
      const [healthData, eventsData] = await Promise.all([
        fetchHealth(),
        fetchEvents({ limit: 500 }),
      ])

      setIsConnected(true)
      setIsFallback(false)
      setHealth(healthData)
      setEvents(eventsData)
      handleNewAlerts(eventsData)
      setLoading(false)
    } catch (err) {
      // Backend unreachable: switch to fallback demo data
      setIsConnected(false)
      setIsFallback(true)
      initMockData()
    }
  }, [mode, handleNewAlerts, initMockData])

  // Poll health separately every 5s if connected
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

  // Initial load effect
  useEffect(() => {
    isInitialLoadRef.current = true
    if (mode === 'demo') {
      setIsConnected(false)
      setIsFallback(false)
      initMockData()
    } else {
      pollBackend()
    }
  }, [mode, pollBackend, initMockData])

  // Poll events every 3s
  usePolling(pollBackend, 3000, mode === 'live' && !isFallback)

  // Poll health every 5s
  usePolling(pollHealthOnly, 5000, mode === 'live' && !isFallback)

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
  // Node online condition: sent any event in the last 60 seconds
  const nodesStatus = useMemo(() => {
    const nodeMap = new Map()
    const now = Date.now()

    // Ensure default nodes exist so demo/real displays cleanly
    const defaultNodes = ['node_01', 'node_02', 'node_03', 'node_04']
    defaultNodes.forEach((nodeId) => {
      nodeMap.set(nodeId, {
        id: nodeId,
        online: false,
        lastEvent: null,
        lastSeenTime: null,
        eventsCount24h: 0,
        alertsCount24h: 0,
        verifiedCount24h: 0,
        classCounts: {},
      })
    })

    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

    events.forEach((ev) => {
      if (!nodeMap.has(ev.nodeId)) {
        nodeMap.set(ev.nodeId, {
          id: ev.nodeId,
          online: false,
          lastEvent: null,
          lastSeenTime: null,
          eventsCount24h: 0,
          alertsCount24h: 0,
          verifiedCount24h: 0,
          classCounts: {},
        })
      }

      const nodeData = nodeMap.get(ev.nodeId)
      const evDate = parseDate(ev.timestamp)
      const evTime = evDate ? evDate.getTime() : 0

      // Keep latest event
      if (!nodeData.lastEvent || evTime > (parseDate(nodeData.lastEvent.timestamp)?.getTime() || 0)) {
        nodeData.lastEvent = ev
        nodeData.lastSeenTime = evDate
      }

      // Check online status: any event in the last 60s
      if (now - evTime <= 60 * 1000) {
        nodeData.online = true
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
  }, [events])

  const contextValue = {
    events,
    health,
    isConnected,
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
    refreshEvents: pollBackend,
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
