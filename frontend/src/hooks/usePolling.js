// usePolling hook: executes callback at specified interval, pauses when tab is hidden, cleans up on unmount
import { useEffect, useRef } from 'react'

export function usePolling(callback, intervalMs, enabled = true) {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (!enabled || intervalMs === null || intervalMs === undefined) {
      return
    }

    let timerId = null
    let isTabVisible = document.visibilityState !== 'hidden'

    function tick() {
      if (isTabVisible && savedCallback.current) {
        savedCallback.current()
      }
    }

    function handleVisibilityChange() {
      const nowVisible = document.visibilityState !== 'hidden'
      if (nowVisible && !isTabVisible) {
        // Tab just became visible: trigger immediately and restart timer
        isTabVisible = true
        tick()
        if (timerId) clearInterval(timerId)
        timerId = setInterval(tick, intervalMs)
      } else if (!nowVisible && isTabVisible) {
        // Tab hidden: pause polling
        isTabVisible = false
        if (timerId) {
          clearInterval(timerId)
          timerId = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Start interval
    timerId = setInterval(tick, intervalMs)

    return () => {
      if (timerId) clearInterval(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intervalMs, enabled])
}

