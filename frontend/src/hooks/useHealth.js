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
    status: context.health.status,
    isConnected: context.isConnected,
    isFallback: context.isFallback,
    isMock: context.isMock,
  }
}

