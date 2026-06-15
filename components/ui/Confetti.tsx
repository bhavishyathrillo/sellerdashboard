'use client'
import { useEffect } from 'react'

export default function Confetti() {
  useEffect(() => {
    const colors = ['#F4631E', '#C9A84C', '#22C55E', '#60A5FA', '#F59E0B']
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;'
    document.body.appendChild(container)

    for (let i = 0; i < 50; i++) {
      const dot = document.createElement('div')
      dot.style.cssText = `position:absolute;left:${Math.random()*100}%;top:-10px;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:2px;animation:fall ${1+Math.random()*2}s ease forwards;animation-delay:${Math.random()*0.5}s;`
      container.appendChild(dot)
    }

    setTimeout(() => container.remove(), 3000)
  }, [])

  return null
}