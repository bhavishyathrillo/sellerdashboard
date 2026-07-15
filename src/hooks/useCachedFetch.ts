'use client'

import { useState, useEffect, useRef } from 'react'

interface CacheEntry {
  data: any;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry>()

export function useCachedFetch(url: string | null) {
  const [data, setData] = useState<any>(() => {
    if (url && globalCache.has(url)) {
      return globalCache.get(url)!.data
    }
    return null
  })
  
  const [loading, setLoading] = useState<boolean>(() => {
    if (!url) return false
    return !globalCache.has(url)
  })

  const isFetchingRef = useRef(false)

  useEffect(() => {
    if (!url) return

    let cancelled = false

    const fetchData = async () => {
      // Don't double-fetch
      if (isFetchingRef.current) return
      isFetchingRef.current = true

      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const newData = await res.json()

        if (cancelled) return

        globalCache.set(url, { data: newData, timestamp: Date.now() })
        setData(newData)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        console.error(`[useCachedFetch] Error fetching ${url}:`, err)
        setLoading(false)
      } finally {
        isFetchingRef.current = false
      }
    }

    // If we already have cached data, show it instantly and skip loading state
    if (globalCache.has(url)) {
      setData(globalCache.get(url)!.data)
      setLoading(false)
    }

    // Always fetch fresh data in background
    fetchData()

    // Refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Poll every 10 minutes if tab is active
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchData()
    }, 10 * 60 * 1000)

    return () => {
      cancelled = true
      isFetchingRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
    }
  }, [url])

  return { data, loading }
}
