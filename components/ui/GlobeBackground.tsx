'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

// Thrillophilia destinations
const DESTINATIONS = [
  { name: 'Ladakh',    lat: 34.1, lng: 77.5,  home: true },
  { name: 'Maldives',  lat: 3.2,  lng: 73.2,  home: true },
  { name: 'Bali',      lat: -8.3, lng: 115.1, home: true },
  { name: 'Bangkok',   lat: 13.7, lng: 100.5, home: true },
  { name: 'Dubai',     lat: 25.2, lng: 55.3,  home: false },
  { name: 'Paris',     lat: 48.8, lng: 2.3,   home: false },
  { name: 'Tokyo',     lat: 35.6, lng: 139.7, home: false },
  { name: 'Kenya',     lat: -1.2, lng: 36.8,  home: false },
  { name: 'London',    lat: 51.5, lng: -0.1,  home: false },
  { name: 'Singapore', lat: 1.3,  lng: 103.8, home: false },
  { name: 'Iceland',   lat: 64.1, lng: -21.8, home: false },
  { name: 'Santorini', lat: 36.4, lng: 25.4,  home: false },
  { name: 'Sydney',    lat: -33.8,lng: 151.2, home: false },
  { name: 'Cairo',     lat: 30.0, lng: 31.2,  home: false },
]

// Flight arcs between destinations
const ARCS = [
  { from: 'Ladakh', to: 'Dubai' },
  { from: 'Dubai', to: 'Paris' },
  { from: 'Paris', to: 'London' },
  { from: 'Bangkok', to: 'Bali' },
  { from: 'Maldives', to: 'Dubai' },
  { from: 'Dubai', to: 'Bangkok' },
  { from: 'Tokyo', to: 'Singapore' },
  { from: 'Kenya', to: 'Dubai' },
  { from: 'Santorini', to: 'Paris' },
  { from: 'Sydney', to: 'Bali' },
  { from: 'Cairo', to: 'Dubai' },
  { from: 'Iceland', to: 'London' },
].map(a => {
  const from = DESTINATIONS.find(d => d.name === a.from)!
  const to = DESTINATIONS.find(d => d.name === a.to)!
  return {
    startLat: from.lat, startLng: from.lng,
    endLat: to.lat, endLng: to.lng,
    color: from.home || to.home ? '#F4631E' : '#C9A84C'
  }
})

export default function GlobeBackground() {
  const globeRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [ready, setReady] = useState(false)

useEffect(() => {
  const update = () => {
    const el = containerRef.current
    if (el) setDims({ width: el.offsetWidth, height: el.offsetHeight })
  }
  update()
  window.addEventListener('resize', update)
  return () => window.removeEventListener('resize', update)
}, [])

  useEffect(() => {
    if (globeRef.current && ready) {
      const globe = globeRef.current
      // Auto rotate
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.5
      globe.controls().enableZoom = false
      globe.controls().enablePan = false
      // Set initial view focused on India/Asia
      globe.pointOfView({ lat: 20, lng: 78, altitude: 2.2 }, 0)
    }
  }, [ready])

  return (
  <div ref={containerRef} style={{
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
}}>
      {dims.width > 0 && (
        <Globe
          ref={globeRef}
          width={dims.width}
          height={dims.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#F4631E"
          atmosphereAltitude={0.18}
          onGlobeReady={() => setReady(true)}

          pointsData={DESTINATIONS}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d: any) => d.home ? '#F4631E' : '#C9A84C'}
          pointAltitude={0.01}
          pointRadius={(d: any) => d.home ? 0.5 : 0.3}
          pointsMerge={false}

          arcsData={ARCS}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcDashLength={0.5}
          arcDashGap={1}
          arcDashAnimateTime={2500}
          arcStroke={0.4}
          arcAltitudeAutoScale={0.4}

          ringsData={DESTINATIONS.filter((d: any) => d.home)}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => '#F4631E'}
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1200}
        />
      )}
    </div>
  )
}