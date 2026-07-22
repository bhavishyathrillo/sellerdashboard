'use client'

import { useState, useEffect, useRef } from 'react'

interface CacheEntry {
  data: any;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry>()
const LOCAL_STORAGE_PREFIX = 'thrillo_cache_v3_'
const CACHE_DURATION = 20 * 60 * 1000

function getFromLocalCache(url: string): CacheEntry | null {
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_PREFIX + url)
    if (item) {
      const parsed = JSON.parse(item) as CacheEntry
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed
      } else {
        localStorage.removeItem(LOCAL_STORAGE_PREFIX + url)
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return null
}

function saveToLocalCache(url: string, entry: CacheEntry) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + url, JSON.stringify(entry))
  } catch (e) {
    console.warn('LocalStorage quota exceeded or unavailable. Falling back to memory cache.')
  }
}

export function primeCache(url: string, data: any) {
  const entry = { data, timestamp: Date.now() }
  globalCache.set(url, entry)
  saveToLocalCache(url, entry)
}

export function useCachedFetch(url: string | null, options?: { bypassCache?: boolean }) {
  const bypassCache = options?.bypassCache ?? false
  const [data, setData] = useState<any>(() => {
    if (!url) return null
    // Always check in-memory cache (cleared on hard refresh)
    if (globalCache.has(url)) {
      return globalCache.get(url)!.data
    }
    // For admin (bypassCache): skip localStorage so hard refresh always fetches fresh
    if (!bypassCache && typeof window !== 'undefined') {
      const local = getFromLocalCache(url)
      if (local) {
        globalCache.set(url, local)
        return local.data
      }
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

        const entry = { data: newData, timestamp: Date.now() }
        globalCache.set(url, entry)
        saveToLocalCache(url, entry)
        
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
    let isFresh = false
    // Always check in-memory globalCache (cleared on hard refresh, persists during SPA navigation)
    let cached = globalCache.get(url)
    // For non-admin: also check localStorage (survives hard refresh)
    if (!cached && !bypassCache && typeof window !== 'undefined') {
      cached = getFromLocalCache(url)
      if (cached) globalCache.set(url, cached)
    }

    if (cached) {
      setData(cached.data)
      setLoading(false)
      // If data is less than 20 minutes old, consider it fresh enough to skip the background refetch
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        isFresh = true
      }
    } else {
      setLoading(true)
    }

    // Always fetch fresh data in background unless it is already fresh
    if (!isFresh) {
      fetchData()
    }

    // Refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        let shouldFetch = true
        let currentCached = globalCache.get(url)
        if (!currentCached && typeof window !== 'undefined') currentCached = getFromLocalCache(url)
        
        if (currentCached) {
          if (Date.now() - currentCached.timestamp < CACHE_DURATION) {
            shouldFetch = false
          }
        }
        if (shouldFetch) fetchData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Poll every 20 minutes if tab is active
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchData()
    }, CACHE_DURATION)

    return () => {
      cancelled = true
      isFetchingRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
    }
  }, [url])

  return { data, loading }
}
