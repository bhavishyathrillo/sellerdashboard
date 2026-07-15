'use client'
import { useEffect } from 'react'

export default function AutoRefresh({ interval = 300000 }: { interval?: number }) {
  useEffect(() => {
    const timer = setInterval(() => {
      window.location.reload()
    }, interval)
    return () => clearInterval(timer)
  }, [interval])
  return null
}