'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import React from 'react'
import { useStickyState } from '@/hooks/useStickyState'
import { useAdminOverview } from '@/lib/services/apiHooks'
import Loader from '@/components/ui/Loader'

/* ─── helpers ─── */
function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  const absN = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (absN >= 10000000) return `${sign}₹${(absN / 10000000).toFixed(2)}Cr`
  if (absN >= 100000) return `${sign}₹${(absN / 100000).toFixed(2)}L`
  if (absN >= 1000) return `${sign}₹${(absN / 1000).toFixed(1)}K`
  return `${sign}₹${absN.toFixed(0)}`
}

function pct(ach: number, goal: number) {
  if (!goal) return 0
  return Math.round((ach / goal) * 100)
}

function calcMargin(bl: number, tl: number) {
  if (!tl) return '0%'
  return ((bl / tl) * 100).toFixed(1) + '%'
}

function renderAch(ach: number, shb: number, isBl: boolean, tagMatch: boolean = false) {
  const isUp = ach >= shb;
  let v = 0;
  if (shb > 0) {
    v = Math.round(Math.abs(ach - shb) / shb * 100);
  }
  const tagStyle = isBl 
    ? { background: 'rgba(244,99,30,0.15)', color: '#F4631E', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }
    : { background: 'rgba(34,197,94,0.15)', color: '#22C55E', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 };
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
      <span style={tagMatch ? tagStyle : { color: '#FFF' }}>{fmt(ach)}</span>
      <span style={{ width: '46px', textAlign: 'right', color: isUp ? '#22C55E' : '#EF4444', fontSize: '0.65rem', fontWeight: 700, display: 'inline-block' }}>
        {shb > 0 ? `${isUp ? '▲' : '▼'} ${v}%` : ''}
      </span>
    </div>
  )
}

/* ─── Animated Counter ─── */
function AnimCount({ value, money = true }: { value: number, money?: boolean }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    const start = ref.current; const end = value; const dur = 1400; const t0 = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 4)
      setDisplay(start + (end - start) * e)
      if (p < 1) requestAnimationFrame(tick); else ref.current = end
    }
    requestAnimationFrame(tick)
  }, [value])
  return <>{money ? fmt(display) : Math.round(display)}</>
}

/* ─── Mini Sparkline SVG ─── */
function Spark({ color = '#C9A84C' }: { color?: string }) {
  const pts = useMemo(() => {
    const a: number[] = []
    for (let i = 0; i < 12; i++) a.push(20 + Math.random() * 30)
    // trend upward
    for (let i = 0; i < 12; i++) a[i] += i * 2
    return a
  }, [])
  const max = Math.max(...pts); const min = Math.min(...pts)
  const h = 32; const w = 80
  const d = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ opacity: 0.5 }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#sg-${color.replace('#','')})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.ov {
  font-family: 'Inter', -apple-system, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 28px 48px;
  color: #F0EDE8;
  animation: ovFadeIn 0.45s ease both;
}

@keyframes ovFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ovShimmer { 0%{background-position:0% center} 100%{background-position:200% center} }
@keyframes ovPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes ovSpin { to{transform:rotate(360deg)} }
@keyframes ovSlide { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
@keyframes ovCount { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }

/* ── Header ── */
.ov-hdr {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 40px;
  padding-bottom: 28px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  gap: 24px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(19, 17, 14, 0.95);
  backdrop-filter: blur(12px);
  padding: 32px 28px 24px 28px;
  margin: -32px -28px 40px -28px;
}
.ov-hdr h1 {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 8px;
  animation: ovShimmer 5s linear infinite;
}
.ov-hdr-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #8A8278;
  font-weight: 500;
}
.ov-live {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #22C55E;
  animation: ovPulse 2.2s ease infinite;
  box-shadow: 0 0 8px rgba(34,197,94,0.6);
  flex-shrink: 0;
}

/* ── Ring Widgets ── */
.ov-rings {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}
.ov-ring-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  min-width: 160px;
}
.ov-ring-pct {
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}
.ov-ring-label {
  font-size: 0.65rem;
  color: #8A8278;
  font-weight: 500;
  margin-top: 4px;
  letter-spacing: 0.02em;
}
.ov-ring-sub {
  font-size: 0.7rem;
  color: #6A6258;
  margin-top: 2px;
  font-weight: 500;
}

/* ── Region Filter ── */
.ov-region-select {
  position: relative;
  display: inline-block;
  z-index: 100;
}
.ov-region-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #E8E4DD;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  height: 38px;
}
.ov-region-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(212, 175, 55, 0.4);
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.1);
}
.ov-region-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  background: #151515;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 8px;
  min-width: 180px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 400px;
  overflow-y: auto;
}
.ov-region-menu.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
.ov-region-item {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #B0A898;
  cursor: pointer;
  transition: all 0.2s;
}
.ov-region-item:hover {
  background: rgba(212, 175, 55, 0.1);
  color: #D4AF37;
}
.ov-region-item.active {
  background: rgba(212, 175, 55, 0.15);
  color: #D4AF37;
  font-weight: 700;
}

/* ── KPI Section ── */
.ov-kpi-sec { margin-bottom: 36px; }

.ov-kpi-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  margin-bottom: 14px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.ov-kpi-tag-bl {
  background: rgba(244,99,30,0.1);
  color: #F4631E;
  border: 1px solid rgba(244,99,30,0.2);
}
.ov-kpi-tag-tl {
  background: rgba(34,197,94,0.1);
  color: #22C55E;
  border: 1px solid rgba(34,197,94,0.2);
}

.ov-panel {
  background: linear-gradient(180deg, rgba(25, 23, 20, 0.8) 0%, rgba(15, 14, 12, 0.8) 100%);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  backdrop-filter: blur(12px);
  overflow: hidden;
}
.ov-panel-header {
  padding: 14px 20px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ov-panel-body {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.ov-panel-col {
  padding: 24px 28px;
  position: relative;
  transition: background 0.3s ease;
  display: flex;
  flex-direction: column;
}
.ov-panel-col:hover {
  background: rgba(255,255,255,0.02);
}
.ov-panel-col:not(:nth-child(3n)):not(:last-child)::after {
  content: '';
  position: absolute;
  top: 25%;
  bottom: 25%;
  right: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,0.1), transparent);
}
.ov-panel-col:nth-child(n+4) {
  border-top: 1px solid rgba(255,255,255,0.05);
}
.ov-panel-lbl {
  font-size: 0.7rem;
  font-weight: 600;
  color: #8A8278;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.ov-panel-val {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  color: #F9FAFB;
}
.ov-panel-val-sm {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1;
  color: #F9FAFB;
}
.ov-panel-pct {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 14px;
  align-self: flex-start;
}

/* ── Search ── */
.ov-search-wrap {
  position: relative;
  margin-bottom: 20px;
}
.ov-search-ico {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: #5A5448;
  pointer-events: none;
  z-index: 1;
}
.ov-search {
  width: 100%;
  padding: 13px 44px 13px 44px;
  background: #111111;
  border: 1px solid #1E1E1E;
  border-radius: 12px;
  color: #F0EDE8;
  font-size: 0.85rem;
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.ov-search::placeholder { color: #5A5448; }
.ov-search:focus {
  border-color: rgba(212,175,55,0.4);
  box-shadow: 0 0 0 3px rgba(212,175,55,0.06);
}
.ov-search-x {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: #8A8278;
  width: 26px; height: 26px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.ov-search-x:hover { background: rgba(255,255,255,0.1); color: #F0EDE8; }

/* ── Table ── */
.ov-tbl-wrap {
  background: #111111;
  border: 1px solid #1E1E1E;
  border-radius: 16px;
  overflow: hidden;
}
.ov-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.ov-tbl thead tr {
  background: rgba(255,255,255,0.02);
}
.ov-tbl th {
  padding: 14px 18px;
  text-align: right;
  font-size: 0.63rem;
  font-weight: 700;
  color: #6A6258;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 1px solid #1E1E1E;
  white-space: nowrap;
}
.ov-tbl th:first-child { text-align: left; }
.ov-tbl td {
  padding: 14px 18px;
  text-align: right;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  vertical-align: middle;
}
.ov-tbl td:first-child { text-align: left; }
.ov-tbl tr:last-child td { border-bottom: none; }

/* CM Row */
.ov-cm {
  cursor: pointer;
  transition: background 0.2s;
}
.ov-cm:hover { background: rgba(212,175,55,0.04) !important; }
.ov-cm-open { background: rgba(212,175,55,0.025) !important; }

.ov-cm-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: #D4AF37;
  font-size: 0.86rem;
}
.ov-chev {
  width: 22px; height: 22px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.48rem;
  flex-shrink: 0;
  transition: transform 0.3s ease, background 0.2s;
  background: rgba(212,175,55,0.1);
  color: #D4AF37;
  border: 1px solid rgba(212,175,55,0.15);
}
.ov-chev-open {
  transform: rotate(90deg);
  background: rgba(212,175,55,0.18);
}
.ov-badge {
  font-size: 0.58rem;
  font-weight: 600;
  color: #6A6258;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  padding: 3px 8px;
  border-radius: 6px;
}

/* Achieved pill */
.ov-ach {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.78rem;
}
.ov-ach-g { background: rgba(34,197,94,0.1); color: #22C55E; border: 1px solid rgba(34,197,94,0.15); }
.ov-ach-o { background: rgba(244,99,30,0.1); color: #F4631E; border: 1px solid rgba(244,99,30,0.15); }

/* Progress */
.ov-prog {
  height: 3px;
  width: 52px;
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
  overflow: hidden;
  display: inline-block;
  margin-left: 8px;
  vertical-align: middle;
}
.ov-prog-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 1s cubic-bezier(0.16,1,0.3,1);
}

/* Region Row */
.ov-reg {
  cursor: pointer;
  animation: ovSlide 0.25s ease both;
  transition: background 0.2s;
}
.ov-reg:hover { background: rgba(244,99,30,0.03) !important; }
.ov-reg-name {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 22px;
  color: #B0A898;
  font-weight: 600;
  font-size: 0.8rem;
}
.ov-reg-chev {
  width: 18px; height: 18px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.42rem;
  flex-shrink: 0;
  transition: transform 0.3s ease, background 0.2s;
  background: rgba(244,99,30,0.08);
  color: #F4631E;
  border: 1px solid rgba(244,99,30,0.12);
}
.ov-reg-chev-open {
  transform: rotate(90deg);
  background: rgba(244,99,30,0.14);
}
.ov-reg-cnt {
  font-size: 0.6rem;
  color: #5A5448;
  font-weight: 500;
}

/* Seller Row */
.ov-sel {
  animation: ovSlide 0.2s ease both;
  transition: background 0.2s;
}
.ov-sel:hover { background: rgba(255,255,255,0.02) !important; }
.ov-sel-name {
  padding-left: 48px;
  color: #8A8278;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.ov-sel-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 5px currentColor;
}

/* Flag Table */
.ov-flag-tbl-wrap {
  overflow-x: auto;
  background: #111111;
  border-radius: 12px;
  border: 1px solid #1E1E1E;
}

/* Loading */
.ov-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 55vh;
  gap: 16px;
}
.ov-spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(212,175,55,0.1);
  border-top-color: #D4AF37;
  border-radius: 50%;
  animation: ovSpin 0.75s linear infinite;
}
.ov-loading p {
  font-size: 0.8rem;
  color: #6A6258;
  font-weight: 600;
  letter-spacing: 0.04em;
}

@media (max-width: 900px) {
  .ov-kpi-row { grid-template-columns: repeat(2, 1fr); }
  .ov { padding: 20px 16px; }
  .ov-hdr h1 { font-size: 1.5rem; }
  .ov-rings { flex-wrap: wrap; }
  .ov-ring-wrap { min-width: 140px; }
}
@media (max-width: 600px) {
  .ov-kpi-row { grid-template-columns: 1fr; }
}
`


export default function AdminOverviewPage({ session }: { session?: any }) {
  const [apiData, setApiData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCms, setExpandedCms] = useState<Record<string, boolean>>({})
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({})
  const [expandedFlagCms, setExpandedFlagCms] = useState<Record<string, boolean>>({})
  const [flagModal, setFlagModal] = useState<{ cmName: string, l2Name?: string, flag: string } | null>(null)
  const [search, setSearch] = useStickyState('', 'AdminOverview_search')
  const [selectedRegion, setSelectedRegion] = useStickyState('All', 'AdminOverview_region')
  const [selectedCm, setSelectedCm] = useStickyState('All', 'AdminOverview_cm')
  const [regionOpen, setRegionOpen] = useState(false)
  const [cmOpen, setCmOpen] = useState(false)
  const [bucketView, setBucketView] = useState<'flag' | 'tenure'>('flag')
  const [bucketModal, setBucketModal] = useState<{ bucketName: string, sellers: any[] } | null>(null)
  const [modalCmFilter, setModalCmFilter] = useState<string>('All')
  const [modalRegionFilter, setModalRegionFilter] = useState<string>('All')
  const adminName = session?.name || 'Admin'

  const { data: fetchedData, loading: fetchLoading } = useAdminOverview()

  useEffect(() => {
    if (fetchLoading) {
      setLoading(true)
    } else if (fetchedData) {
      setApiData(fetchedData)
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [fetchedData, fetchLoading])

  if (loading) return <Loader text="Loading overview..." />

  const l1Data = apiData?.l1_data || []
  const kpis = apiData?.kpis || {
    bottomline_goal: 0,
    topline_goal_this_month: 0,
    bottomline_should_have_been: 0,
    bl_actual_splits: 0,
    topline_should_have_been: 0,
    tl_actual_splits: 0,
    enquiries_created: 0,
    sellers_called: 0,
    total_calls: 0
  }
  const flagTable = apiData?.flagTable || { columns: [], rows: [] }
  let gBlG = 0, gBlS = 0, gBlA = 0, gTlG = 0, gTlS = 0, gTlA = 0
  let gBlCan = 0, gBlEsc = 0, gBlOld = 0, gTlCan = 0, gTlEsc = 0, gTlOld = 0

  const formatRegionName = (region: string) => {
    if (!region || region === 'All') return 'All';
    let name = region;
    if (name.toLowerCase().endsWith('_tours')) {
      name = name.substring(0, name.length - 6);
    }
    name = name.replace(/_/g, ' ');
    return name.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
  }

  const allCms = (() => {
    const cSet = new Set<string>()
    l1Data.forEach((l1: any) => {
      let hasRegion = false;
      if (selectedRegion === 'All') {
        hasRegion = true;
      } else {
        l1.l2_groups?.forEach((l2: any) => {
          l2.sellers?.forEach((s: any) => {
            if (s.region === selectedRegion) hasRegion = true;
          })
        })
      }
      if (hasRegion && l1.l1_name) cSet.add(l1.l1_name)
    })
    return ['All', ...Array.from(cSet).sort()]
  })()

  const allRegions = (() => {
    const rSet = new Set<string>()
    l1Data.forEach((l1: any) => {
      if (selectedCm !== 'All' && l1.l1_name !== selectedCm) return;
      l1.l2_groups?.forEach((l2: any) => {
        l2.sellers?.forEach((s: any) => {
          if (s.region) rSet.add(s.region)
        })
      })
    })
    return ['All', ...Array.from(rSet).sort()]
  })()

  const processed = l1Data.map((l1: any) => {
    if (selectedCm !== 'All' && l1.l1_name !== selectedCm) return null;
    let cBG = 0, cBS = 0, cBA = 0, cTG = 0, cTS = 0, cTA = 0
    const rMap: Record<string, any[]> = {}
    ;(l1.l2_groups || []).forEach((l2: any) => {
      l2.sellers?.forEach((s: any) => {
        const r = s.region || 'Unknown'
        if (selectedRegion !== 'All' && r !== selectedRegion) return;
        
        if (!rMap[r]) rMap[r] = []
        rMap[r].push(s)
      })
    })
    const regions = Object.keys(rMap).map(rn => {
      let rBG = 0, rBS = 0, rBA = 0, rTG = 0, rTS = 0, rTA = 0
      const sellers = rMap[rn].map((s: any) => {
        const j = s.july_data || {}
        const blG = j.bl_goal||0, blS = j.bl_shb||0, blA = j.bl_ach||0
        const tlG = j.tl_goal||0, tlS = j.tl_shb||0, tlA = j.tl_ach||0
        
        const blCan = j.cancellation_impact||0, blEsc = j.escalation_impacts||0, blOld = j.old_bookings_earnings||0
        const tlCan = j.topline_cancellation_impact||0, tlEsc = j.topline_escalation_impact||0, tlOld = j.topline_old_booking_earnings_impact||0

        gBlCan += blCan; gBlEsc += blEsc; gBlOld += blOld;
        gTlCan += tlCan; gTlEsc += tlEsc; gTlOld += tlOld;

        rBG += blG; rBS += blS; rBA += blA
        rTG += tlG; rTS += tlS; rTA += tlA
        cBG += blG; cBS += blS; cBA += blA
        cTG += tlG; cTS += tlS; cTA += tlA
        gBlG += blG; gBlS += blS; gBlA += blA
        gTlG += tlG; gTlS += tlS; gTlA += tlA
        
        // Check topline/bottomline tag
        const isTop = ['thailand_tours', 'singapore_tours', 'disney_cruise', 'maldives_tours', 'kenya_tours'].includes(s.region?.toLowerCase())
        
        return { ...s, blGoal: blG, blShb: blS, blAch: blA, tlGoal: tlG, tlShb: tlS, tlAch: tlA, tag: isTop ? 'Topline' : 'Bottomline', totalAch: blA+tlA, totalGoal: blG+tlG }
      })
      return { regionName: formatRegionName(rn), id: `${l1.l1_email}-${rn}`, sellers, blGoal: rBG, blShb: rBS, blAch: rBA, tlGoal: rTG, tlShb: rTS, tlAch: rTA, totalAch: rBA+rTA, totalGoal: rBG+rTG }
    })
    return { ...l1, regions, blGoal: cBG, blShb: cBS, blAch: cBA, tlGoal: cTG, tlShb: cTS, tlAch: cTA, totalAch: cBA+cTA, totalGoal: cBG+cTG }
  }).filter(Boolean).filter((l1: any) => l1.regions.length > 0)

  const toggleCm = (e: string) => setExpandedCms(p => ({ ...p, [e]: !p[e] }))
  const toggleReg = (id: string) => setExpandedRegions(p => ({ ...p, [id]: !p[id] }))
  const toggleFlagCm = (name: string) => setExpandedFlagCms(p => ({ ...p, [name]: !p[name] }))

  const totalG = gBlG + gTlG, totalA = gBlA + gTlA
  const oPct = pct(totalA, totalG)
  const oPctBl = pct(gBlA, gBlG)
  const oPctTl = pct(gTlA, gTlG)
  const q = search.toLowerCase().trim()

  const filtered = processed.filter((cm: any) => {
    if (!q) return true
    if (cm.l1_name?.toLowerCase().includes(q)) return true
    return cm.regions.some((r: any) =>
      r.regionName?.toLowerCase().includes(q) ||
      r.sellers.some((s: any) => s.seller_name?.toLowerCase().includes(q) || s.seller_email?.toLowerCase().includes(q))
    )
  })

  let modalSellers: any[] = []
  if (flagModal) {
    if (flagModal.cmName === 'ALL') {
       l1Data.forEach((l1: any) => {
         l1.l2_groups?.forEach((l2: any) => {
           l2.sellers?.forEach((s: any) => {
             if (s.flag === flagModal.flag) modalSellers.push({ ...s, cmName: l1.l1_name, l2Name: l2.l2_name })
           })
         })
       })
    } else {
      const l1 = l1Data.find((l: any) => l.l1_name === flagModal.cmName)
      if (l1) {
        l1.l2_groups?.forEach((l2: any) => {
          if (flagModal.l2Name && l2.l2_name !== flagModal.l2Name) return;
          l2.sellers?.forEach((s: any) => {
            if (s.flag === flagModal.flag) modalSellers.push({ ...s, cmName: l1.l1_name, l2Name: l2.l2_name })
          })
        })
      }
    }
  }


  return (
    <><style>{CSS}</style>
    {flagModal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setFlagModal(null)}>
        <div style={{ background: '#1A1815', padding: '24px', borderRadius: '12px', width: '80%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#E8E4DD', fontWeight: 600 }}>
                {flagModal.cmName === 'ALL' ? `All Sellers` : `Sellers under ${flagModal.cmName}`}
                {flagModal.l2Name ? ` (${flagModal.l2Name})` : ''}
                {' '}— <span style={{ color: '#D4AF37' }}>{flagModal.flag}</span>
              </h2>
              <button onClick={() => setFlagModal(null)} style={{ background: 'none', border: 'none', color: '#E8E4DD', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
           </div>
           <table className="ov-tbl" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
             <thead>
               <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                 <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem' }}>Seller</th>
                 <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem' }}>Region</th>
                 <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem' }}>L2 Manager</th>
                 <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem' }}>CM</th>
               </tr>
             </thead>
             <tbody>
               {modalSellers.map((s, i) => (
                 <tr key={i} style={{ borderBottom: i < modalSellers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                   <td style={{ padding: '8px', color: '#FFF', fontSize: '0.75rem' }}>{s.seller_name}</td>
                   <td style={{ padding: '8px', color: '#B0A898', fontSize: '0.75rem' }}>{s.region}</td>
                   <td style={{ padding: '8px', color: '#B0A898', fontSize: '0.75rem' }}>{s.l2Name}</td>
                   <td style={{ padding: '8px', color: '#D4AF37', fontSize: '0.75rem' }}>{s.cmName}</td>
                 </tr>
               ))}
               {modalSellers.length === 0 && (
                 <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#8A8278' }}>No sellers found</td></tr>
               )}
             </tbody>
           </table>
        </div>
      </div>
    )}

    {bucketModal && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setBucketModal(null)}>
        <div style={{ background: '#1A1815', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '1100px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#E8E4DD', fontWeight: 600 }}>
                Sellers in Bucket: <span style={{ color: '#F4631E' }}>{bucketModal.bucketName}</span>
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select 
                  value={modalCmFilter} 
                  onChange={e => setModalCmFilter(e.target.value)}
                  style={{ background: '#2C2822', color: '#E8E4DD', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', outline: 'none' }}
                >
                  <option value="All">All CMs</option>
                  {Array.from(new Set(bucketModal.sellers.filter((s: any) => modalRegionFilter === 'All' || s.region === modalRegionFilter).map((s: any) => s.cmName))).filter(Boolean).sort().map((cm: any) => (
                    <option key={cm} value={cm}>{cm}</option>
                  ))}
                </select>
                <select 
                  value={modalRegionFilter} 
                  onChange={e => setModalRegionFilter(e.target.value)}
                  style={{ background: '#2C2822', color: '#E8E4DD', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', outline: 'none' }}
                >
                  <option value="All">All Regions</option>
                  {Array.from(new Set(bucketModal.sellers.filter((s: any) => modalCmFilter === 'All' || s.cmName === modalCmFilter).map((s: any) => s.region))).filter(Boolean).sort().map((reg: any) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
                <button onClick={() => { setBucketModal(null); setModalCmFilter('All'); setModalRegionFilter('All'); }} style={{ background: 'none', border: 'none', color: '#E8E4DD', cursor: 'pointer', fontSize: '1.2rem', marginLeft: '8px' }}>✕</button>
              </div>
           </div>
           <div style={{ overflowX: 'auto' }}>
             <table className="ov-tbl" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '800px' }}>
               <thead>
                 <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Seller</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Region</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>CM</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>BL Goal</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>BL Achieved</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>BL %</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>BL Shortfall</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>TL Goal</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>TL Achieved</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>TL %</th>
                   <th style={{ padding: '8px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>TL Shortfall</th>
                 </tr>
               </thead>
               <tbody>
                 {bucketModal.sellers
                   .filter((s: any) => modalCmFilter === 'All' || s.cmName === modalCmFilter)
                   .filter((s: any) => modalRegionFilter === 'All' || s.region === modalRegionFilter)
                   .map((s: any, i: number) => {
                   const blGoal = s.blGoal || 0;
                   const blAch = s.blAch || 0;
                   const blShb = s.blShb || 0;
                   const tlGoal = s.tlGoal || 0;
                   const tlAch = s.tlAch || 0;
                   const tlShb = s.tlShb || 0;

                   const blPct = blGoal > 0 ? (blAch / blGoal) * 100 : 0;
                   const tlPct = tlGoal > 0 ? (tlAch / tlGoal) * 100 : 0;
                   const blShort = blShb - blAch;
                   const tlShort = tlShb - tlAch;

                   const formatCurrency = (val: number) => {
                     if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`
                     if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`
                     if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
                     return `₹${val.toFixed(0)}`
                   }

                   return (
                     <tr key={i} style={{ borderBottom: i < bucketModal.sellers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: 'transparent' }} className="ov-tr-hover">
                       <td style={{ padding: '8px', color: '#FFF', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{s.seller_name}</td>
                       <td style={{ padding: '8px', color: '#B0A898', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{s.region}</td>
                       <td style={{ padding: '8px', color: '#D4AF37', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{s.cmName}</td>
                       <td style={{ padding: '8px', color: '#B0A898', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(blGoal)}</td>
                       <td style={{ padding: '8px', color: '#E8E4DD', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(blAch)}</td>
                       <td style={{ padding: '8px', color: blPct >= 100 ? '#22C55E' : blPct >= 50 ? '#EAB308' : '#EF4444', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{blPct.toFixed(1)}%</td>
                       <td style={{ padding: '8px', color: blShort > 0 ? '#EF4444' : '#22C55E', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{blShort > 0 ? formatCurrency(blShort) : '-'}</td>
                       
                       <td style={{ padding: '8px', color: '#B0A898', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(tlGoal)}</td>
                       <td style={{ padding: '8px', color: '#E8E4DD', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(tlAch)}</td>
                       <td style={{ padding: '8px', color: tlPct >= 100 ? '#22C55E' : tlPct >= 50 ? '#EAB308' : '#EF4444', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{tlPct.toFixed(1)}%</td>
                       <td style={{ padding: '8px', color: tlShort > 0 ? '#EF4444' : '#22C55E', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{tlShort > 0 ? formatCurrency(tlShort) : '-'}</td>
                     </tr>
                   )
                 })}
                 {bucketModal.sellers.filter((s: any) => (modalCmFilter === 'All' || s.cmName === modalCmFilter) && (modalRegionFilter === 'All' || s.region === modalRegionFilter)).length === 0 && (
                   <tr><td colSpan={11} style={{ padding: '16px', textAlign: 'center', color: '#8A8278', fontSize: '0.8rem' }}>No sellers found for selected filters</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    )}
    <div className="ov">

      {/* ── Header ── */}
      <div className="ov-hdr">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h1 style={{ textTransform: 'capitalize' }}>Hi, {adminName} 👋</h1>
            <div className="ov-hdr-sub">
              <span className="ov-live" />
              <span>{processed.length} Category Managers</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="ov-region-select">
              <button className="ov-region-btn" onClick={() => setCmOpen(!cmOpen)}>
                <span style={{color: '#8A8278'}}>CM:</span> {selectedCm}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: cmOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              
              <div className={`ov-region-menu ${cmOpen ? 'open' : ''}`}>
                {allCms.map(c => (
                  <div key={c} className={`ov-region-item ${c === selectedCm ? 'active' : ''}`} onClick={() => { setSelectedCm(c); setCmOpen(false) }}>
                    {c}
                  </div>
                ))}
              </div>
              {cmOpen && <div style={{position: 'fixed', inset: 0, zIndex: -1}} onClick={() => setCmOpen(false)} />}
            </div>

            <div className="ov-region-select">
              <button className="ov-region-btn" onClick={() => setRegionOpen(!regionOpen)}>
                <span style={{color: '#8A8278'}}>Region:</span> {formatRegionName(selectedRegion)}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: regionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              
              <div className={`ov-region-menu ${regionOpen ? 'open' : ''}`}>
                {allRegions.map(r => (
                  <div key={r} className={`ov-region-item ${r === selectedRegion ? 'active' : ''}`} onClick={() => { setSelectedRegion(r); setRegionOpen(false) }}>
                    {formatRegionName(r)}
                  </div>
                ))}
              </div>
              {regionOpen && <div style={{position: 'fixed', inset: 0, zIndex: -1}} onClick={() => setRegionOpen(false)} />}
            </div>
          </div>
        </div>
        <div className="ov-rings">
          <div className="ov-ring-wrap">
            <svg width={52} height={52} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
              <circle cx={26} cy={26} r={21} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4}/>
              <circle cx={26} cy={26} r={21} fill="none"
                stroke={oPctBl >= 100 ? '#22C55E' : '#F4631E'} strokeWidth={4}
                strokeDasharray={2 * Math.PI * 21}
                strokeDashoffset={2 * Math.PI * 21 - (Math.min(oPctBl, 100) / 100) * 2 * Math.PI * 21}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}/>
            </svg>
            <div>
              <div className="ov-ring-pct" style={{ color: oPctBl >= 100 ? '#22C55E' : '#F4631E' }}>{oPctBl}%</div>
              <div className="ov-ring-label">Bottom Line</div>
              <div className="ov-ring-sub">{fmt(gBlA)} / {fmt(gBlG)}</div>
            </div>
          </div>
          <div className="ov-ring-wrap">
            <svg width={52} height={52} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
              <circle cx={26} cy={26} r={21} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4}/>
              <circle cx={26} cy={26} r={21} fill="none"
                stroke="#22C55E" strokeWidth={4}
                strokeDasharray={2 * Math.PI * 21}
                strokeDashoffset={2 * Math.PI * 21 - (Math.min(oPctTl, 100) / 100) * 2 * Math.PI * 21}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}/>
            </svg>
            <div>
              <div className="ov-ring-pct" style={{ color: '#22C55E' }}>{oPctTl}%</div>
              <div className="ov-ring-label">Top Line</div>
              <div className="ov-ring-sub">{fmt(gTlA)} / {fmt(gTlG)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="ov-kpi-sec">

        {/* BOTTOM LINE PANEL */}
        <div className="ov-panel">
          <div className="ov-panel-header" style={{ color: '#F4631E' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 6-8 10-8 16a8 8 0 0016 0c0-6-8-10-8-16z"/></svg> 
            Bottom Line
          </div>
          <div className="ov-panel-body">
            {[
              { lbl: 'Goal', val: gBlG, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
              { lbl: 'Expected (SHB)', val: gBlS, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { 
                lbl: 'Achieved', 
                val: gBlA, 
                c: '#F4631E',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
                pct: gBlS > 0 ? Math.round(Math.abs(gBlA - gBlS) / gBlS * 100) : 0, 
                arrow: gBlA >= gBlS ? '▲' : '▼', 
                pctColor: gBlA >= gBlS ? '#22C55E' : '#EF4444' 
              },
              { lbl: 'Cancellation Impact', val: gBlCan, c: '#EF4444', sm: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
              { lbl: 'Escalation Impact', val: gBlEsc, c: '#EF4444', sm: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
              { lbl: 'Old Booking Earnings', val: gBlOld, c: '#3B82F6', sm: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> }
            ].map(k => (
              <div key={k.lbl} className="ov-panel-col" style={k.c ? { background: `radial-gradient(circle at top right, ${k.c}15 0%, transparent 70%)` } : {}}>
                <div className="ov-panel-lbl" style={k.c ? { color: k.c } : {}}>
                  {k.icon} {k.lbl}
                </div>
                <div className="ov-panel-val" style={k.c ? { color: k.c, textShadow: `0 0 20px ${k.c}40` } : {}}>
                  <AnimCount value={k.val}/>
                </div>
                {k.pct !== undefined && (
                  <div className="ov-panel-pct" style={{ color: k.pctColor, background: `${k.pctColor}15` }}>
                    {k.arrow} {k.pct}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* TOP LINE PANEL */}
        <div className="ov-panel">
          <div className="ov-panel-header" style={{ color: '#22C55E' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            Top Line
          </div>
          <div className="ov-panel-body">
            {[
              { lbl: 'Goal', val: gTlG, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
              { lbl: 'Expected (SHB)', val: gTlS, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { 
                lbl: 'Achieved', 
                val: gTlA, 
                c: '#22C55E',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
                pct: gTlS > 0 ? Math.round(Math.abs(gTlA - gTlS) / gTlS * 100) : 0, 
                arrow: gTlA >= gTlS ? '▲' : '▼', 
                pctColor: gTlA >= gTlS ? '#22C55E' : '#EF4444' 
              }
            ].map(k => (
              <div key={k.lbl} className="ov-panel-col" style={k.c ? { background: `radial-gradient(circle at top right, ${k.c}15 0%, transparent 70%)` } : {}}>
                <div className="ov-panel-lbl" style={k.c ? { color: k.c } : {}}>
                  {k.icon} {k.lbl}
                </div>
                <div className="ov-panel-val" style={k.c ? { color: k.c, textShadow: `0 0 20px ${k.c}40` } : {}}>
                  <AnimCount value={k.val}/>
                </div>
                {k.pct !== undefined && (
                  <div className="ov-panel-pct" style={{ color: k.pctColor, background: `${k.pctColor}15` }}>
                    {k.arrow} {k.pct}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── SELLER BUCKETS ── */}
      <div className="ov-kpi-sec" style={{ marginTop: '32px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', background: '#13110E', padding: '0' }}>
        <div style={{ padding: '24px 24px 0 24px' }}>
          <div style={{ color: '#8A8278', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Seller Buckets
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button onClick={() => setBucketView('flag')} style={{ background: bucketView === 'flag' ? 'rgba(244,99,30,0.1)' : 'transparent', color: bucketView === 'flag' ? '#F4631E' : '#8A8278', border: bucketView === 'flag' ? '1px solid #F4631E' : '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              Flag View
            </button>
            <button onClick={() => setBucketView('tenure')} style={{ background: bucketView === 'tenure' ? 'rgba(244,99,30,0.1)' : 'transparent', color: bucketView === 'tenure' ? '#F4631E' : '#8A8278', border: bucketView === 'tenure' ? '1px solid #F4631E' : '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              Tenure View
            </button>
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="ov-tbl" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>BUCKET</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>COUNT</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>BL GOAL</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>BL ACHIEVED</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>BL%</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>BL SHORTFALL</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>TL GOAL</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>TL ACHIEVED</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>TL%</th>
                <th style={{ padding: '10px 16px', fontWeight: 600, color: '#8A8278', fontSize: '0.65rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>TL SHORTFALL</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const allFilteredSellers: any[] = []
                processed.forEach((cm: any) => {
                  cm.regions.forEach((reg: any) => {
                    reg.sellers.forEach((s: any) => {
                      allFilteredSellers.push({
                        ...s,
                        cmName: cm.l1_name,
                        l2Name: cm.l2Name || 'Unknown L2'
                      })
                    })
                  })
                })

                const buckets: Record<string, any> = {}
                if (bucketView === 'flag') {
                  ['6 Star 🌟', '5 Green', '4 Orange', '3 Yellow', '2 Red'].forEach(b => {
                    buckets[b] = { name: b, count: 0, blGoal: 0, blShb: 0, blAch: 0, tlGoal: 0, tlShb: 0, tlAch: 0, sellers: [] }
                  })
                } else {
                  ['New Joiners', '1-3 months', '4-6 months', '7-12 months', '13+ months'].forEach(b => {
                    buckets[b] = { name: b, count: 0, blGoal: 0, blShb: 0, blAch: 0, tlGoal: 0, tlShb: 0, tlAch: 0, sellers: [] }
                  })
                }

                allFilteredSellers.forEach(s => {
                  let bKey = 'Unknown'
                  if (bucketView === 'flag') {
                    bKey = s.flag || '1 White'
                  } else {
                    const duration = parseInt(s.duration_in_org_months) || 0
                    if (duration <= 1) bKey = 'New Joiners'
                    else if (duration === 2 || duration === 3) bKey = '1-3 months'
                    else if (duration >= 4 && duration <= 6) bKey = '4-6 months'
                    else if (duration >= 7 && duration <= 12) bKey = '7-12 months'
                    else bKey = '13+ months'
                  }
                  
                  if (!buckets[bKey]) {
                    buckets[bKey] = { name: bKey, count: 0, blGoal: 0, blShb: 0, blAch: 0, tlGoal: 0, tlShb: 0, tlAch: 0, sellers: [] }
                  }
                  
                  buckets[bKey].count += 1
                  buckets[bKey].sellers.push(s)
                  buckets[bKey].blGoal += (s.blGoal || 0)
                  buckets[bKey].blShb += (s.blShb || 0)
                  buckets[bKey].blAch += (s.blAch || 0)
                  buckets[bKey].tlGoal += (s.tlGoal || 0)
                  buckets[bKey].tlShb += (s.tlShb || 0)
                  buckets[bKey].tlAch += (s.tlAch || 0)
                })

                const sortedBuckets = Object.values(buckets)
                  .sort((a: any, b: any) => {
                    if (bucketView === 'flag') {
                       const numA = parseInt(a.name) || 0
                       const numB = parseInt(b.name) || 0
                       return numB - numA
                    } else if (bucketView === 'tenure') {
                       const order = ['New Joiners', '1-3 months', '4-6 months', '7-12 months', '13+ months']
                       return order.indexOf(a.name) - order.indexOf(b.name)
                    }
                    return 0
                  })
                  .filter((b: any) => b.count > 0 || (bucketView === 'flag' && ['6 Star 🌟', '5 Green', '4 Orange', '3 Yellow', '2 Red'].includes(b.name)) || (bucketView === 'tenure' && ['New Joiners', '1-3 months', '4-6 months', '7-12 months', '13+ months'].includes(b.name)))
                  
                const formatCurrency = (val: number) => {
                  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`
                  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`
                  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
                  return `₹${val.toFixed(0)}`
                }
                const flagColor = (name: string) => {
                  if (name.includes('6 Star')) return '#FDE047'
                  if (name.includes('5 Green')) return '#22C55E'
                  if (name.includes('4 Orange')) return '#F97316'
                  if (name.includes('3 Yellow')) return '#EAB308'
                  if (name.includes('2 Red')) return '#EF4444'
                  if (name === 'New Joiners') return '#8B5CF6'
                  if (name === '1-3 months') return '#10B981'
                  if (name === '4-6 months') return '#EAB308'
                  if (name === '7-12 months') return '#F97316'
                  if (name === '13+ months') return '#22C55E'
                  return '#E8E4DD'
                }

                return sortedBuckets.map((b: any, i: number) => {
                  const blPct = b.blGoal > 0 ? (b.blAch / b.blGoal) * 100 : 0
                  const tlPct = b.tlGoal > 0 ? (b.tlAch / b.tlGoal) * 100 : 0
                  const blShort = b.blShb - b.blAch
                  const tlShort = b.tlShb - b.tlAch
                  
                  const blShortStr = blShort > 0 ? formatCurrency(blShort) : '-'
                  const tlShortStr = tlShort > 0 ? formatCurrency(tlShort) : '-'
                  
                  const blShortPct = b.blShb > 0 && blShort > 0 ? `(${(blShort / b.blShb * 100).toFixed(1)}%)` : ''
                  const tlShortPct = b.tlShb > 0 && tlShort > 0 ? `(${(tlShort / b.tlShb * 100).toFixed(1)}%)` : ''

                  return (
                    <tr key={b.name} onClick={() => setBucketModal({ bucketName: b.name, sellers: b.sellers })} style={{ borderBottom: i < sortedBuckets.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', background: 'transparent', cursor: 'pointer' }} className="ov-tr-hover">
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#E8E4DD', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: flagColor(b.name), flexShrink: 0 }} />
                        {b.name}
                      </td>
                      <td style={{ padding: '12px 10px', color: '#8A8278', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{b.count}</td>
                      <td style={{ padding: '12px 10px', color: '#B0A898', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(b.blGoal)}</td>
                      <td style={{ padding: '12px 10px', color: '#E8E4DD', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(b.blAch)}</td>
                      <td style={{ padding: '12px 10px', color: blPct >= 100 ? '#22C55E' : blPct >= 50 ? '#EAB308' : '#EF4444', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{blPct.toFixed(1)}%</td>
                      <td style={{ padding: '12px 10px', color: blShort > 0 ? '#EF4444' : '#22C55E', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {blShortStr} <span style={{ color: '#5A5650', fontSize: '0.65rem', marginLeft: '4px' }}>{blShortPct}</span>
                      </td>
                      <td style={{ padding: '12px 10px', color: '#B0A898', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(b.tlGoal)}</td>
                      <td style={{ padding: '12px 10px', color: '#E8E4DD', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(b.tlAch)}</td>
                      <td style={{ padding: '12px 10px', color: tlPct >= 100 ? '#22C55E' : tlPct >= 50 ? '#EAB308' : '#EF4444', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{tlPct.toFixed(1)}%</td>
                      <td style={{ padding: '12px 16px', color: tlShort > 0 ? '#EF4444' : '#22C55E', fontSize: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {tlShortStr} <span style={{ color: '#5A5650', fontSize: '0.65rem', marginLeft: '4px' }}>{tlShortPct}</span>
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div className="ov-search-wrap" style={{ flex: 1, marginBottom: 0 }}>
          <span className="ov-search-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input className="ov-search" type="text" placeholder="Search by CM, Manager, Seller Name or Email..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="ov-search-x" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="ov-tbl-wrap">
        {q ? (() => {
          // Flat seller search results
          const allSellers: any[] = []
          processed.forEach((cm: any) => {
            cm.regions.forEach((reg: any) => {
              reg.sellers.forEach((s: any) => {
                const match = cm.l1_name?.toLowerCase().includes(q) ||
                  reg.regionName?.toLowerCase().includes(q) ||
                  s.seller_name?.toLowerCase().includes(q) ||
                  s.seller_email?.toLowerCase().includes(q)
                if (match) {
                  allSellers.push({ ...s, cmName: cm.l1_name, regionName: reg.regionName })
                }
              })
            })
          })
          return (
            <table className="ov-tbl">
              <thead>
                <tr>
                  <th>Seller Name</th>
                  <th>Category Manager</th>
                  <th>Region</th>
                  <th>BL Goal</th>
                  <th>BL SHB</th>
                  <th style={{ color: '#F4631E' }}>BL Achieved</th>
                  <th>TL Goal</th>
                  <th>TL SHB</th>
                  <th style={{ color: '#22C55E' }}>TL Achieved</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {allSellers.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#5A5448' }}>No results found for &ldquo;{search}&rdquo;</td></tr>
                ) : (<>
                  {/* Totals summary row */}
                  {(() => {
                    const tBl = allSellers.reduce((s, x) => s + (x.blGoal || 0), 0)
                    const tTl = allSellers.reduce((s, x) => s + (x.tlGoal || 0), 0)
                    const tG = allSellers.reduce((s, x) => s + (x.totalGoal || 0), 0)
                    const tS = allSellers.reduce((s, x) => s + (x.shb || 0), 0)
                    const tA = allSellers.reduce((s, x) => s + (x.ach || 0), 0)
                    const tP = pct(tA, tG)
                    return (
                      <tr style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.06), rgba(201,168,76,0.02))', borderBottom: '2px solid rgba(201,168,76,0.15)' }}>
                        <td style={{ fontWeight: 800, color: '#D4AF37', fontSize: '0.78rem' }}>
                          Total ({allSellers.length} sellers)
                        </td>
                        <td style={{ color: '#5A5448', fontSize: '0.68rem' }}>—</td>
                        <td style={{ color: '#5A5448', fontSize: '0.68rem' }}>—</td>
                        <td style={{ fontWeight: 800, fontSize: '0.78rem' }}>{fmt(allSellers.reduce((s, x) => s + (x.blGoal || 0), 0))}</td>
                        <td style={{ fontWeight: 800, fontSize: '0.78rem' }}>{fmt(allSellers.reduce((s, x) => s + (x.blShb || 0), 0))}</td>
                        <td>{renderAch(allSellers.reduce((s, x) => s + (x.blAch || 0), 0), allSellers.reduce((s, x) => s + (x.blShb || 0), 0), true)}</td>
                        <td style={{ fontWeight: 800, fontSize: '0.78rem', color: '#FFF' }}>{fmt(allSellers.reduce((s, x) => s + (x.tlGoal || 0), 0))}</td>
                        <td style={{ fontWeight: 800, fontSize: '0.78rem', color: '#FFF' }}>{fmt(allSellers.reduce((s, x) => s + (x.tlShb || 0), 0))}</td>
                        <td>{renderAch(allSellers.reduce((s, x) => s + (x.tlAch || 0), 0), allSellers.reduce((s, x) => s + (x.tlShb || 0), 0), false)}</td>
                        <td>
                          <span className="ov-ach" style={{ fontWeight: 900, fontSize: '0.78rem', color: '#D4AF37' }}>{calcMargin(allSellers.reduce((s, x) => s + (x.blAch || 0), 0), allSellers.reduce((s, x) => s + (x.tlAch || 0), 0))}</span>
                        </td>
                      </tr>
                    )
                  })()}
                  {allSellers.map((s: any, i: number) => {
                  const sP = pct(s.ach, s.totalGoal)
                  return (
                    <tr key={`${s.seller_email}-${i}`} className="ov-sel" style={{ animation: `ovSlide 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.03}s both` }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontWeight: 600, color: '#E8E4DD' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="ov-sel-dot" style={{ background: sP >= 100 ? '#22C55E' : sP >= 50 ? '#D4AF37' : '#EF4444', color: sP >= 100 ? '#22C55E' : sP >= 50 ? '#D4AF37' : '#EF4444' }}/>
                            {s.seller_name}
                          </div>
                          <span style={{ fontSize: '0.6rem', padding: '2px 4px', background: s.tag === 'Topline' ? 'rgba(34,197,94,0.1)' : 'rgba(244,99,30,0.1)', color: s.tag === 'Topline' ? '#22C55E' : '#F4631E', borderRadius: '4px' }}>{s.tag}</span>
                        </div>
                      </td>
                      <td style={{ color: '#D4AF37', fontWeight: 600, fontSize: '0.72rem' }}>{s.cmName}</td>
                      <td style={{ color: '#B0A898', fontSize: '0.72rem' }}>{s.regionName}</td>
                      <td style={{ fontSize: '0.72rem', color: '#FFF' }}>{fmt(s.blGoal)}</td>
                      <td style={{ fontSize: '0.72rem', color: '#FFF' }}>{fmt(s.blShb)}</td>
                      <td style={{ fontSize: '0.72rem' }}>{renderAch(s.blAch, s.blShb, true, s.tag === 'Bottomline')}</td>
                      <td style={{ fontSize: '0.72rem', color: '#FFF' }}>{fmt(s.tlGoal)}</td>
                      <td style={{ fontSize: '0.72rem', color: '#FFF' }}>{fmt(s.tlShb)}</td>
                      <td style={{ fontSize: '0.72rem' }}>{renderAch(s.tlAch, s.tlShb, false, s.tag === 'Topline')}</td>
                      <td>
                        <span className="ov-ach" style={{ color: '#D4AF37', fontWeight: 700 }}>{calcMargin(s.blAch, s.tlAch)}</span>
                      </td>
                    </tr>
                  )
                })}
                </>)}
              </tbody>
            </table>
          )
        })() : (
        <table className="ov-tbl">
          <thead>
            <tr>
              <th>Category Manager</th>
              <th>BL Goal</th>
              <th>BL SHB</th>
              <th style={{ color: '#F4631E' }}>BL Achieved</th>
              <th>TL Goal</th>
              <th>TL SHB</th>
              <th style={{ color: '#22C55E' }}>TL Achieved</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cm: any) => {
              const cmP = pct(cm.ach, cm.totalGoal)
              const open = expandedCms[cm.l1_email]
              return (
                <React.Fragment key={cm.l1_email}>
                  <tr className={`ov-cm ${open ? 'ov-cm-open' : ''}`} onClick={() => toggleCm(cm.l1_email)}>
                    <td>
                      <div className="ov-cm-name">
                        <span className={`ov-chev ${open ? 'ov-chev-open' : ''}`}>▶</span>
                        {cm.l1_name}
                        <span className="ov-badge">{cm.regions.length} regions</span>
                      </div>
                    </td>
                    <td style={{ color: '#FFF' }}>{fmt(cm.blGoal)}</td>
                    <td style={{ color: '#FFF' }}>{fmt(cm.blShb)}</td>
                    <td>{renderAch(cm.blAch, cm.blShb, true)}</td>
                    <td style={{ color: '#FFF' }}>{fmt(cm.tlGoal)}</td>
                    <td style={{ color: '#FFF' }}>{fmt(cm.tlShb)}</td>
                    <td>{renderAch(cm.tlAch, cm.tlShb, false)}</td>
                    <td>
                      <span className="ov-ach" style={{ color: '#D4AF37', fontWeight: 700 }}>{calcMargin(cm.blAch, cm.tlAch)}</span>
                    </td>
                  </tr>

                  {open && cm.regions.map((reg: any) => {
                    const rP = pct(reg.ach, reg.totalGoal)
                    const rOpen = expandedRegions[reg.id]
                    return (
                      <React.Fragment key={reg.id}>
                        <tr className="ov-reg" onClick={() => toggleReg(reg.id)}
                          style={{ background: rOpen ? 'rgba(244,99,30,0.02)' : 'rgba(0,0,0,0.12)' }}>
                          <td>
                            <div className="ov-reg-name">
                              <span className={`ov-reg-chev ${rOpen ? 'ov-reg-chev-open' : ''}`}>▶</span>
                              {reg.regionName}
                              <span className="ov-reg-cnt">{reg.sellers.length} sellers</span>
                            </div>
                          </td>
                          <td style={{ color: '#FFF' }}>{fmt(reg.blGoal)}</td>
                          <td style={{ color: '#FFF' }}>{fmt(reg.blShb)}</td>
                          <td>{renderAch(reg.blAch, reg.blShb, true)}</td>
                          <td style={{ color: '#FFF' }}>{fmt(reg.tlGoal)}</td>
                          <td style={{ color: '#FFF' }}>{fmt(reg.tlShb)}</td>
                          <td>{renderAch(reg.tlAch, reg.tlShb, false)}</td>
                          <td>
                            <span className="ov-ach" style={{ color: '#D4AF37', fontWeight: 700 }}>{calcMargin(reg.blAch, reg.tlAch)}</span>
                          </td>
                        </tr>

                        {rOpen && reg.sellers.map((s: any) => {
                          const sP = pct(s.ach, s.totalGoal)
                          return (
                            <tr key={s.seller_email} className="ov-sel" style={{ background: 'rgba(0,0,0,0.2)' }}>
                              <td>
                                <div className="ov-sel-name" style={{ justifyContent: 'space-between', paddingRight: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="ov-sel-dot" style={{ background: sP >= 100 ? '#22C55E' : sP >= 50 ? '#D4AF37' : '#EF4444', color: sP >= 100 ? '#22C55E' : sP >= 50 ? '#D4AF37' : '#EF4444' }}/>
                                    {s.seller_name}
                                  </div>
                                  <span style={{ fontSize: '0.6rem', padding: '2px 4px', background: s.tag === 'Topline' ? 'rgba(34,197,94,0.1)' : 'rgba(244,99,30,0.1)', color: s.tag === 'Topline' ? '#22C55E' : '#F4631E', borderRadius: '4px' }}>{s.tag}</span>
                                </div>
                              </td>
                              <td style={{ color: '#FFF', fontSize: '0.72rem' }}>{fmt(s.blGoal)}</td>
                              <td style={{ color: '#FFF', fontSize: '0.72rem', opacity: 0.7 }}>{fmt(s.blShb)}</td>
                              <td style={{ fontSize: '0.72rem' }}>{renderAch(s.blAch, s.blShb, true, s.tag === 'Bottomline')}</td>
                              <td style={{ color: '#FFF', fontSize: '0.72rem' }}>{fmt(s.tlGoal)}</td>
                              <td style={{ color: '#FFF', fontSize: '0.72rem', opacity: 0.7 }}>{fmt(s.tlShb)}</td>
                              <td style={{ fontSize: '0.72rem' }}>{renderAch(s.tlAch, s.tlShb, false, s.tag === 'Topline')}</td>
                              <td>
                                <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.72rem' }}>{calcMargin(s.blAch, s.tlAch)}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
    </>
  )
}
