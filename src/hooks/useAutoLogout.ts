'use client'

import { useEffect, useRef } from 'react'

const INACTIVITY_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds

export function useAutoLogout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const logout = () => {
    try {
      // The login page handles clearing the session cookie if we route to it or there might be an auth logout api.
      // Let's clear any local storage and redirect to home.
      localStorage.clear()
      // Use document.cookie to clear session if it's stored in cookies
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      window.location.href = '/'
    } catch (err) {
      console.error('Auto-logout failed', err)
    }
  }

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(logout, INACTIVITY_TIMEOUT)
    }

    // Initial timer start
    resetTimer()

    // Events that reset the inactivity timer
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    
    // We throttle the event listener so it doesn't fire constantly on mouse move
    let throttleTimer: NodeJS.Timeout | null = null
    const handleActivity = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        resetTimer()
        throttleTimer = null
      }, 5000) // only reset timer at most every 5 seconds
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (throttleTimer) clearTimeout(throttleTimer)
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [])
}
