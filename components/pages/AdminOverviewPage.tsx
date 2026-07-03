'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import React from 'react'

/* ─── helpers ─── */
function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
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
function AnimCount({ value }: { value: number }) {
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
  return <>{fmt(display)}</>
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

.ov {
  font-family: 'Inter', -apple-system, sans-serif;
  max-width: 1160px;
  margin: 0 auto;
  padding: 28px 24px;
  color: #E8E4DD;
  animation: ovIn 0.7s cubic-bezier(0.16,1,0.3,1);
  position: relative;
}
.ov::before {
  content: '';
  position: fixed;
  top: -200px; right: -200px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
@keyframes ovIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes ovPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes ovFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
@keyframes ovShine { 0%{left:-100%} 100%{left:200%} }
@keyframes ovGlow { 0%,100%{box-shadow:0 0 20px rgba(201,168,76,0.08)} 50%{box-shadow:0 0 40px rgba(201,168,76,0.15)} }
@keyframes ovSpin { to{transform:rotate(360deg)} }
@keyframes ovSlide { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
@keyframes ovCount { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }

/* ── Header ── */
.ov-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  position: relative;
}
.ov-hdr h1 {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  animation: ovShimmer 4s linear infinite;
}
@keyframes ovShimmer { 0%{background-position:0% center} 100%{background-position:200% center} }
.ov-hdr-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 0.7rem;
  color: #6A6258;
  font-weight: 500;
}
.ov-live {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #22C55E;
  animation: ovPulse 2s ease infinite;
  box-shadow: 0 0 10px rgba(34,197,94,0.5);
}

/* Overall ring */
.ov-ring-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  animation: ovGlow 4s ease infinite;
}
.ov-ring-pct {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}
.ov-ring-label {
  font-size: 0.58rem;
  color: #6A6258;
  font-weight: 500;
}

/* Particles */
.ov-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}
.ov-particle {
  position: absolute;
  bottom: -20px;
  background: rgba(201,168,76,0.3);
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(201,168,76,0.8);
  animation: floatUp linear infinite;
}
@keyframes floatUp {
  0% { transform: translateY(0) scale(0); opacity: 0; }
  10% { opacity: 1; transform: translateY(-20px) scale(1); }
  90% { opacity: 1; }
  100% { transform: translateY(-800px) scale(0.5); opacity: 0; }
}

/* ── KPI Section ── */
.ov-kpi-sec {
  margin-bottom: 20px;
}
.ov-kpi-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.58rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ov-kpi-tag-bl {
  background: linear-gradient(135deg, rgba(244,99,30,0.15), rgba(244,99,30,0.05));
  color: #F4631E;
  border: 1px solid rgba(244,99,30,0.2);
}
.ov-kpi-tag-tl {
  background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05));
  color: #22C55E;
  border: 1px solid rgba(34,197,94,0.2);
}
.ov-kpi-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 320px));
  gap: 16px;
  margin-bottom: 24px;
}
.ov-kpi {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  padding: 14px 16px;
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
  cursor: default;
}
.ov-kpi:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 12px 36px rgba(0,0,0,0.3);
}
.ov-kpi::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02), rgba(255,255,255,0.06));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
.ov-kpi::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
  animation: ovShine 6s ease infinite;
  pointer-events: none;
}
.ov-kpi-bl {
  background: linear-gradient(145deg, rgba(244,99,30,0.06) 0%, rgba(15,15,15,0.95) 50%, rgba(244,99,30,0.03) 100%);
}
.ov-kpi-tl {
  background: linear-gradient(145deg, rgba(34,197,94,0.06) 0%, rgba(15,15,15,0.95) 50%, rgba(34,197,94,0.03) 100%);
}
.ov-kpi-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.ov-kpi-lbl {
  font-size: 0.58rem;
  font-weight: 700;
  color: #5A5448;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.ov-kpi-val {
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  animation: ovCount 0.8s cubic-bezier(0.16,1,0.3,1);
}
.ov-kpi-val-bl { color: #F4631E; }
.ov-kpi-val-tl { color: #22C55E; }
.ov-kpi-val-def { color: #E8E4DD; }

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
  color: #4A4438;
  pointer-events: none;
  z-index: 1;
}
.ov-search {
  width: 100%;
  padding: 14px 44px 14px 44px;
  background: rgba(18,18,18,0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  color: #E8E4DD;
  font-size: 0.82rem;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  outline: none;
  transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
}
.ov-search::placeholder { color: #3A3428; font-weight: 400; }
.ov-search:focus {
  border-color: rgba(201,168,76,0.35);
  box-shadow: 0 0 0 4px rgba(201,168,76,0.06), 0 8px 32px rgba(0,0,0,0.3);
  background: rgba(18,18,18,0.95);
}
.ov-search-x {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.06);
  color: #8A8278;
  width: 24px; height: 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.ov-search-x:hover { background: rgba(255,255,255,0.1); color: #E8E4DD; }

/* ── Table ── */
.ov-tbl-wrap {
  background: rgba(14,14,14,0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04);
}
.ov-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}
.ov-tbl thead tr {
  background: linear-gradient(90deg, rgba(201,168,76,0.03), transparent, rgba(201,168,76,0.03));
}
.ov-tbl th {
  padding: 16px 18px;
  text-align: right;
  font-size: 0.6rem;
  font-weight: 800;
  color: #5A5448;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ov-tbl th:first-child { text-align: left; }
.ov-tbl td {
  padding: 14px 18px;
  text-align: right;
  border-bottom: 1px solid rgba(255,255,255,0.025);
}
.ov-tbl td:first-child { text-align: left; }

/* CM Row */
.ov-cm {
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
}
.ov-cm:hover { background: rgba(201,168,76,0.04) !important; }
.ov-cm:active { transform: scale(0.998); }
.ov-cm-open { background: rgba(201,168,76,0.025) !important; }

.ov-cm-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: #D4AF37;
  font-size: 0.82rem;
}
.ov-chev {
  width: 22px; height: 22px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  flex-shrink: 0;
  transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
  background: rgba(212,175,55,0.1);
  color: #D4AF37;
  border: 1px solid rgba(212,175,55,0.15);
}
.ov-chev-open {
  transform: rotate(90deg);
  background: rgba(212,175,55,0.2);
}
.ov-badge {
  font-size: 0.52rem;
  font-weight: 600;
  color: #5A5448;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.04);
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 0.04em;
}

/* Achieved pill */
.ov-ach {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: -0.01em;
}
.ov-ach-g { background: rgba(34,197,94,0.1); color: #22C55E; border: 1px solid rgba(34,197,94,0.15); }
.ov-ach-o { background: rgba(244,99,30,0.1); color: #F4631E; border: 1px solid rgba(244,99,30,0.15); }

/* Progress */
.ov-prog {
  height: 3px;
  width: 56px;
  background: rgba(255,255,255,0.04);
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
  animation: ovSlide 0.3s cubic-bezier(0.16,1,0.3,1);
  transition: all 0.25s;
}
.ov-reg:hover { background: rgba(244,99,30,0.025) !important; }
.ov-reg-name {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 20px;
  color: #B0A898;
  font-weight: 600;
  font-size: 0.76rem;
}
.ov-reg-chev {
  width: 18px; height: 18px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.45rem;
  flex-shrink: 0;
  transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
  background: rgba(244,99,30,0.08);
  color: #F4631E;
  border: 1px solid rgba(244,99,30,0.1);
}
.ov-reg-chev-open {
  transform: rotate(90deg);
  background: rgba(244,99,30,0.15);
}
.ov-reg-cnt {
  font-size: 0.52rem;
  color: #4A4438;
  font-weight: 500;
}

/* Seller Row */
.ov-sel {
  animation: ovSlide 0.25s cubic-bezier(0.16,1,0.3,1);
  transition: all 0.2s;
}
.ov-sel:hover { background: rgba(255,255,255,0.015) !important; }
.ov-sel-name {
  padding-left: 48px;
  color: #7A7268;
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.ov-sel-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

/* Loading */
.ov-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 55vh;
  gap: 20px;
}
.ov-spinner {
  width: 44px; height: 44px;
  border: 3px solid rgba(212,175,55,0.1);
  border-top-color: #D4AF37;
  border-radius: 50%;
  animation: ovSpin 0.8s linear infinite;
}
.ov-loading p { font-size: 0.78rem; color: #5A5448; font-weight: 600; letter-spacing: 0.03em; }

@media (max-width: 768px) {
  .ov-kpi-row { grid-template-columns: 1fr; }
  .ov { padding: 16px; }
  .ov-hdr h1 { font-size: 1.3rem; }
  .ov-kpi-val { font-size: 1.3rem; }
  .ov-tbl { font-size: 0.68rem; }
  .ov-ring-wrap { display: none; }
}
`

export default function AdminOverviewPage({ session }: { session?: any }) {
  const [apiData, setApiData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCms, setExpandedCms] = useState<Record<string, boolean>>({})
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({})
  const [expandedFlagCms, setExpandedFlagCms] = useState<Record<string, boolean>>({})
  const [flagModal, setFlagModal] = useState<{ cmName: string, l2Name?: string, flag: string } | null>(null)
  const [search, setSearch] = useState('')
  const adminName = session?.name || 'Admin'

  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      dur: `${6 + Math.random() * 10}s`,
      size: `${2 + Math.random() * 4}px`
    }))
  }, [])

  useEffect(() => {
    fetch('/api/admin/overview', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setApiData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <><style>{CSS}</style><div className="ov-loading"><div className="ov-spinner"/><p>Loading overview…</p></div></>
  )

  const l1Data = apiData?.l1_data || []
  const kpis = apiData?.kpis || {
    bottomline_goal: 0,
    topline_goal_this_month: 0,
    bottomline_should_have_been: 0,
    bl_actual_splits: 0,
    topline_should_have_been: 0,
    tl_actual_splits: 0
  }
  const flagTable = apiData?.flagTable || { columns: [], rows: [] }
  let gBlG = 0, gBlS = 0, gBlA = 0, gTlG = 0, gTlS = 0, gTlA = 0

  const processed = l1Data.map((l1: any) => {
    let cBG = 0, cBS = 0, cBA = 0, cTG = 0, cTS = 0, cTA = 0
    const rMap: Record<string, any[]> = {}
    ;(l1.l2_groups || []).forEach((l2: any) => {
      l2.sellers?.forEach((s: any) => {
        const r = s.region || 'Unknown'
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
      return { regionName: rn, id: `${l1.l1_email}-${rn}`, sellers, blGoal: rBG, blShb: rBS, blAch: rBA, tlGoal: rTG, tlShb: rTS, tlAch: rTA, totalAch: rBA+rTA, totalGoal: rBG+rTG }
    })
    return { ...l1, regions, blGoal: cBG, blShb: cBS, blAch: cBA, tlGoal: cTG, tlShb: cTS, tlAch: cTA, totalAch: cBA+cTA, totalGoal: cBG+cTG }
  })

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
    <div className="ov">
      <div className="ov-particles">
        {particles.map((p, i) => (
          <div key={i} className="ov-particle" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur, width: p.size, height: p.size }}/>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="ov-hdr">
        <div>
          <h1 style={{ textTransform: 'capitalize' }}>Hi, {adminName} 👋</h1>
          <div className="ov-hdr-sub">
            <span className="ov-live" />
            <span>{processed.length} Category Managers</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div className="ov-ring-wrap">
            <svg width={56} height={56} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={28} cy={28} r={23} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5}/>
              <circle cx={28} cy={28} r={23} fill="none"
                stroke={oPctBl >= 100 ? '#22C55E' : '#F4631E'} strokeWidth={5}
                strokeDasharray={2 * Math.PI * 23}
                strokeDashoffset={2 * Math.PI * 23 - (Math.min(oPctBl, 100) / 100) * 2 * Math.PI * 23}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}/>
            </svg>
            <div>
              <div className="ov-ring-pct" style={{ color: oPctBl >= 100 ? '#22C55E' : '#F4631E' }}>{oPctBl}%</div>
              <div className="ov-ring-label">{fmt(gBlA)} / {fmt(gBlG)} (BL)</div>
            </div>
          </div>
          <div className="ov-ring-wrap">
            <svg width={56} height={56} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={28} cy={28} r={23} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5}/>
              <circle cx={28} cy={28} r={23} fill="none"
                stroke={oPctTl >= 100 ? '#22C55E' : '#22C55E'} strokeWidth={5}
                strokeDasharray={2 * Math.PI * 23}
                strokeDashoffset={2 * Math.PI * 23 - (Math.min(oPctTl, 100) / 100) * 2 * Math.PI * 23}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)' }}/>
            </svg>
            <div>
              <div className="ov-ring-pct" style={{ color: '#22C55E' }}>{oPctTl}%</div>
              <div className="ov-ring-label">{fmt(gTlA)} / {fmt(gTlG)} (TL)</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="ov-kpi-sec">
        <div className="ov-kpi-tag ov-kpi-tag-bl"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 6-8 10-8 16a8 8 0 0016 0c0-6-8-10-8-16z"/></svg> Bottom Line</div>
        <div className="ov-kpi-row">
          {[
            { lbl: 'BL Goal', val: kpis.bottomline_goal, cls: 'ov-kpi-val-def', c: '#F4631E' },
            { lbl: 'BL SHB', val: kpis.bottomline_should_have_been, cls: 'ov-kpi-val-def', c: '#F4631E' },
            { 
              lbl: 'BL Achieved', 
              val: kpis.bl_actual_splits, 
              cls: 'ov-kpi-val-bl', 
              c: '#F4631E', 
              pct: kpis.bottomline_should_have_been > 0 ? Math.round(Math.abs(kpis.bl_actual_splits - kpis.bottomline_should_have_been) / kpis.bottomline_should_have_been * 100) : 0, 
              arrow: kpis.bl_actual_splits >= kpis.bottomline_should_have_been ? '▲' : '▼', 
              pctColor: kpis.bl_actual_splits >= kpis.bottomline_should_have_been ? '#22C55E' : '#EF4444' 
            },
          ].map(k => (
            <div key={k.lbl} className="ov-kpi ov-kpi-bl">
              <div className="ov-kpi-top">
                <div>
                  <div className="ov-kpi-lbl">{k.lbl}</div>
                  <div className={`ov-kpi-val ${k.cls}`}>
                    <AnimCount value={k.val}/>
                    {k.pct !== undefined && <span style={{fontSize:'0.8rem', marginLeft:'8px', color: k.pctColor || k.c, fontWeight:800}}>{k.arrow} {k.pct}%</span>}
                  </div>
                </div>
                <Spark color={k.c}/>
              </div>
            </div>
          ))}
        </div>

        <div className="ov-kpi-tag ov-kpi-tag-tl"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> Top Line</div>
        <div className="ov-kpi-row">
          {[
            { lbl: 'TL Goal', val: kpis.topline_goal_this_month, cls: 'ov-kpi-val-def', c: '#22C55E' },
            { lbl: 'TL SHB', val: kpis.topline_should_have_been, cls: 'ov-kpi-val-def', c: '#22C55E' },
            { 
              lbl: 'TL Achieved', 
              val: kpis.tl_actual_splits, 
              cls: 'ov-kpi-val-tl', 
              c: '#22C55E', 
              pct: kpis.topline_should_have_been > 0 ? Math.round(Math.abs(kpis.tl_actual_splits - kpis.topline_should_have_been) / kpis.topline_should_have_been * 100) : 0, 
              arrow: kpis.tl_actual_splits >= kpis.topline_should_have_been ? '▲' : '▼', 
              pctColor: kpis.tl_actual_splits >= kpis.topline_should_have_been ? '#22C55E' : '#EF4444' 
            },
          ].map(k => (
            <div key={k.lbl} className="ov-kpi ov-kpi-tl">
              <div className="ov-kpi-top">
                <div>
                  <div className="ov-kpi-lbl">{k.lbl}</div>
                  <div className={`ov-kpi-val ${k.cls}`}>
                    <AnimCount value={k.val}/>
                    {k.pct !== undefined && <span style={{fontSize:'0.8rem', marginLeft:'8px', color: k.pctColor || k.c, fontWeight:800}}>{k.arrow} {k.pct}%</span>}
                  </div>
                </div>
                <Spark color={k.c}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Seller Flag Breakdown Table ── */}
      {flagTable.rows.length > 0 && (
        <div className="ov-kpi-sec" style={{ marginTop: '32px', marginBottom: '24px' }}>
          <div className="ov-kpi-tag" style={{ color: '#E8E4DD' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> Seller Flags Breakdown
          </div>
          <div className="ov-flag-tbl-wrap" style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <table className="ov-tbl" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600, color: '#8A8278', fontSize: '0.7rem' }}>Category Manager</th>
                  {flagTable.columns.map((col: string) => (
                    <th key={col} style={{ padding: '8px 12px', fontWeight: 600, color: '#8A8278', fontSize: '0.7rem', textAlign: 'center' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flagTable.rows.map((row: any, i: number) => {
                  const open = expandedFlagCms[row.cmName]
                  return (
                    <React.Fragment key={row.cmName}>
                      <tr className="ov-sel" onClick={() => toggleFlagCm(row.cmName)} style={{ cursor: 'pointer', borderBottom: i < flagTable.rows.length - 1 && !open ? '1px solid rgba(255,255,255,0.03)' : 'none', background: open ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#E8E4DD', fontSize: '0.75rem' }}>
                          <span className={`ov-chev ${open ? 'ov-chev-open' : ''}`} style={{ fontSize: '0.65rem', marginRight: '6px' }}>▶</span>
                          {row.cmName}
                        </td>
                        {flagTable.columns.map((col: string) => (
                          <td key={col} onClick={(e) => { e.stopPropagation(); if (row.counts[col]) setFlagModal({ cmName: row.cmName, flag: col }) }} style={{ cursor: row.counts[col] ? 'pointer' : 'default', padding: '8px 12px', textAlign: 'center', color: row.counts[col] ? '#D4AF37' : '#5A5650', fontSize: '0.75rem', fontWeight: row.counts[col] ? 700 : 400 }}>
                            {row.counts[col] || '-'}
                          </td>
                        ))}
                      </tr>
                      {open && row.l2Rows?.map((l2: any, j: number) => (
                        <tr key={l2.l2Name} style={{ background: 'rgba(0,0,0,0.1)', borderBottom: (i < flagTable.rows.length - 1 && j === row.l2Rows.length - 1) ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                          <td style={{ padding: '6px 12px', paddingLeft: '28px', color: '#B0A898', fontSize: '0.7rem' }}>↳ {l2.l2Name}</td>
                          {flagTable.columns.map((col: string) => (
                            <td key={col} onClick={(e) => { e.stopPropagation(); if (l2.counts[col]) setFlagModal({ cmName: row.cmName, l2Name: l2.l2Name, flag: col }) }} style={{ cursor: l2.counts[col] ? 'pointer' : 'default', padding: '6px 12px', textAlign: 'center', color: l2.counts[col] ? '#C9A84C' : '#5A5650', fontSize: '0.7rem' }}>
                              {l2.counts[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
                <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 800, color: '#E8E4DD', fontSize: '0.75rem' }}>Total</td>
                  {flagTable.columns.map((col: string) => {
                    const t = flagTable.rows.reduce((s: number, r: any) => s + (r.counts[col] || 0), 0)
                    return (
                      <td key={col} onClick={(e) => { e.stopPropagation(); if (t) setFlagModal({ cmName: 'ALL', flag: col }) }} style={{ cursor: t ? 'pointer' : 'default', padding: '8px 12px', textAlign: 'center', color: '#D4AF37', fontSize: '0.75rem', fontWeight: 800 }}>
                        {t || '-'}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Search & Lists ── */}
      <div className="ov-search-wrap">
        <span className="ov-search-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
        <input className="ov-search" type="text" placeholder="Search by CM, Manager, Seller Name or Email..."
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="ov-search-x" onClick={() => setSearch('')}>✕</button>}
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
