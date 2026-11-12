// useHealth hook: returns backend counters and connection health
import { useContext } from 'react'
import { EventContext } from './useEvents'

export function useHealth() {
  const context = useContext(EventContext)
  if (!context) {
    throw new Error('useHealth must be used within an EventProvider')
  }

  return {
    health: context.health,
    received: context.health.received,
    stored: context.health.stored,
    rejected: context.health.rejected,
    heartbeats: context.health.heartbeats || 0,
    status_messages: context.health.status_messages || 0,
    rejected_other: context.health.rejected_other || 0,
    mqtt_connected: context.health.mqtt_connected,
    ws_clients: context.health.ws_clients || 0,
    nodes_total: context.health.nodes_total || 0,
    nodes_online: context.health.nodes_online || 0,
    heartbeat_timeout_s: context.health.heartbeat_timeout_s || 30,
    status: context.health.status,
    isConnected: context.isConnected,
    isWsConnected: context.isWsConnected,
    isFallback: context.isFallback,
    isMock: context.isMock,
  }
}
