'use client'

import React, { useState, useEffect, useRef } from 'react'
import { UserSession } from '@/lib/session'
import Loader from '@/components/ui/Loader'
import SellerTimelineModal from './SellerTimelineModal'

interface AdminLTAPageProps {
  session: UserSession
}

/* ─── helpers ─── */
function formatTime(raw: string | null): string {
  if (!raw) return '—'
  const match = String(raw).match(/(\d{1,2}):(\d{2})/)
  if (!match) return '—'
  let h = parseInt(match[1])
  const m = match[2]
  const ampm = h >= 12 ? 'pm' : 'am'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`
}

function fmtMins(mins: number): string {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m`
}

function pctOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function extractTimeParts(raw: string | null): { h: number; m: number } | null {
  if (!raw) return null
  const s = String(raw).trim()
  const match = s.match(/(?:^|T|\s)(\d{1,2}):(\d{2})/)
  if (match) return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) }
  return null
}

interface BreakWindow { startH: number; startM: number; endH: number; endM: number; rawLabel: string }

function parseBreaks(raw: string | null): { count: number; totalMinutes: number; longestMinutes: number; windows: BreakWindow[] } {
  if (!raw?.trim()) return { count: 0, totalMinutes: 0, longestMinutes: 0, windows: [] }
  try {
    let count = 0, total = 0, longest = 0
    const windows: BreakWindow[] = []
    raw.split(',').map(s => s.trim()).filter(Boolean).forEach(entry => {
      const parts = entry.split(/\s*-\s*/)
      if (parts.length >= 2) {
        const pa = extractTimeParts(parts[0])
        const pb = extractTimeParts(parts[1])
        if (pa && pb) {
          const start = pa.h * 60 + pa.m
          let end = pb.h * 60 + pb.m
          if (end < start) end += 24 * 60
          const m = end - start
          count++
          total += m
          longest = Math.max(longest, m)
          windows.push({ startH: pa.h, startM: pa.m, endH: pb.h, endM: pb.m, rawLabel: entry })
        }
      }
    })
    return { count, totalMinutes: total, longestMinutes: longest, windows }
  } catch { return { count: 0, totalMinutes: 0, longestMinutes: 0, windows: [] } }
}

function computeLtaFunnel(seller: any) {
  const dl = seller?.daily_lta || {}
  const leadGoal = dl.lead_goal || 0
  const wd = dl.wd || 0
  const planned = wd > 0 ? Math.floor(leadGoal / wd) : 0
  const dynLta = dl.real_dynamic_lta || 0
  const hygLta = dl.hygiene_lta || 0
  const rev1Lta = dl.goal_completion_logic_lta || 0
  const actual = Math.floor(dl.final_lta || 0)
  const dynLost = planned - dynLta
  const hygLost = dynLta - hygLta
  const rev1Lost = hygLta - rev1Lta
  const rev2Lost = rev1Lta - actual
  return { planned, dynLta, hygLta, rev1Lta, actual, dynLost, hygLost, rev1Lost, rev2Lost }
}

/* ─── CSS ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.la-page {
  font-family: 'Inter', -apple-system, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 16px 60px;
  color: #F0EDE8;
  min-height: 100vh;
}

.la-header {
  margin-bottom: 24px;
}

.la-title {
  font-size: 1.3rem;
  font-weight: 800;
  margin: 0 0 4px;
}

.la-title-accent {
  color: #F4631E;
}

.la-subtitle {
  font-size: 0.78rem;
  color: #8A8278;
  margin: 0;
}

.la-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #F4631E;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.la-filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.la-select, .la-date-input {
  width: 100%;
  padding: 12px 16px;
  background: #141414;
  border: 1px solid #2A2A2A;
  border-radius: 12px;
  color: #F0EDE8;
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.la-select:focus, .la-date-input:focus {
  border-color: #F4631E;
}

.la-date-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.la-date-label {
  font-size: 0.7rem;
  color: #5A5650;
}

.la-today-btn {
  align-self: flex-start;
  padding: 8px 20px;
  background: #1A1A1A;
  border: 1px solid #333;
  border-radius: 20px;
  color: #F0EDE8;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.la-today-btn:hover {
  background: #222;
  border-color: #F4631E;
}

.la-alerts-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  font-size: 0.82rem;
  color: #8A8278;
  margin-bottom: 12px;
}

.la-alerts-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid #5A5650;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #8A8278;
}

.la-kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 28px;
}

.la-kpi-card {
  background: #141414;
  border: 1px solid #232323;
  border-radius: 14px;
  padding: 16px;
  min-width: 0;
}

.la-kpi-card.clickable {
  cursor: pointer;
  transition: border-color 0.2s;
}

.la-kpi-card.clickable:hover {
  border-color: #F4631E;
}

.la-kpi-label {
  font-size: 0.7rem;
  color: #8A8278;
  margin-bottom: 6px;
  text-transform: capitalize;
}

.la-kpi-value {
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 4px;
  line-height: 1.1;
}

.la-kpi-sub {
  font-size: 0.65rem;
  color: #5A5650;
  line-height: 1.3;
}

.la-accordion {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.la-acc-item {
  background: #111111;
  border: 1px solid #1E1E1E;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.la-acc-item:hover {
  border-color: #333;
}

.la-acc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
}

.la-acc-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.la-acc-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #F0EDE8;
  white-space: nowrap;
}

.la-acc-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.la-badge-yellow {
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
}

.la-badge-red {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
}

.la-badge-green {
  background: rgba(34, 197, 94, 0.15);
  color: #22C55E;
}

.la-badge-blue {
  background: rgba(59, 130, 246, 0.15);
  color: #3B82F6;
}

.la-badge-purple {
  background: rgba(168, 85, 247, 0.15);
  color: #A855F7;
}

.la-acc-chevron {
  color: #5A5650;
  font-size: 0.8rem;
  transition: transform 0.25s;
  flex-shrink: 0;
  margin-left: 12px;
}

.la-acc-chevron.open {
  transform: rotate(180deg);
}

.la-acc-body {
  padding: 0 20px 20px;
  border-top: 1px solid #1A1A1A;
}

.la-table-wrap {
  overflow-x: auto;
  margin-top: 12px;
}

.la-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.la-table th {
  text-align: left;
  padding: 10px 12px;
  color: #8A8278;
  font-weight: 600;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #1E1E1E;
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: #111111;
}

.la-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #141414;
  color: #D0CCC5;
  white-space: nowrap;
}

.la-table tr:hover td {
  background: rgba(255,255,255,0.02);
}

.la-cat-row {
  cursor: pointer;
}

.la-cat-row td {
  font-weight: 700;
  color: #F0EDE8;
  background: #0D0D0D;
}

.la-tl-row {
  cursor: pointer;
}

.la-tl-row td {
  font-weight: 600;
  color: #C9A84C;
  background: rgba(201, 168, 76, 0.03);
}

.la-seller-row td {
  font-size: 0.72rem;
}

.la-flag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
}

.la-flag-late {
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
}

.la-flag-absent {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
}

.la-flag-ok {
  background: rgba(34, 197, 94, 0.1);
  color: #22C55E;
}

.la-no-data {
  text-align: center;
  color: #5A5650;
  padding: 24px;
  font-size: 0.82rem;
}

.la-progress-bg {
  width: 60px;
  height: 6px;
  background: #1E1E1E;
  border-radius: 3px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
}

.la-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.la-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.75);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.la-modal-card {
  background: #141414;
  border: 1px solid #262626;
  border-radius: 16px;
  padding: 24px;
  max-width: 900px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
}

.la-modal-card.wide {
  max-width: 1000px;
}

.la-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: #8A8278;
  font-size: 1.2rem;
  cursor: pointer;
}

.la-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.la-modal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.la-modal-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
}

.la-back-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid #444;
  color: #E5E5E5;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.la-funnel-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 12px 0;
}

.la-funnel-card {
  border: 2px solid;
  border-radius: 12px;
  padding: 14px 18px;
  background: #0D0D0D;
  margin: 0 auto;
  transition: width 0.3s;
  text-align: center;
}

.la-funnel-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.la-funnel-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  margin-top: 4px;
}

.la-funnel-unit {
  font-size: 0.7rem;
  color: #8A8278;
  margin-left: 4px;
  font-weight: 400;
}

.la-funnel-drop {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 8px 0;
  color: #8A8278;
}

.la-drill-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.la-drill-tl-row {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  color: #C9A84C;
}

.la-drill-seller-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px 6px 24px;
  cursor: pointer;
  font-size: 0.78rem;
  color: #E5E5E5;
  border-left: 1px solid #333;
  margin-left: 6px;
}

.la-drill-seller-row:hover {
  background: rgba(255,255,255,0.06);
}

@media (min-width: 600px) {
  .la-filters {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .la-select {
    max-width: 260px;
  }
  .la-date-row {
    max-width: 200px;
  }
}
`

/* ─── Chevron SVG ─── */
function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

/* ─── Chart: MHE % Trend (line) ─── */
function MheTrendChart({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return
    let instance: any = null
    let active = true
    import('chart.js/auto').then(mod => {
      if (!active || !canvasRef.current) return
      const Chart = mod.default || mod
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      instance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'MHE %',
            data: values,
            borderColor: color,
            backgroundColor: `${color}18`,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.parsed.y}% MHE` } } },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { max: 100, beginAtZero: true, ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => `${v}%` }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      })
    })
    return () => { active = false; if (instance) instance.destroy() }
  }, [labels.join(','), values.join(','), color])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

/* ─── Chart: Goal % vs SHB % Trend (bar + line) ─── */
function GoalShbTrendChart({ labels, goalValues, shbValues }: { labels: string[]; goalValues: number[]; shbValues: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return
    let instance: any = null
    let active = true
    import('chart.js/auto').then(mod => {
      if (!active || !canvasRef.current) return
      const Chart = mod.default || mod
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      const maxDataVal = Math.max(...goalValues, ...shbValues, 0)
      const yMax = Math.max(20, Math.ceil((maxDataVal + 5) / 10) * 10)
      instance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { type: 'line', label: 'SHB %', data: shbValues, borderColor: '#EAB308', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderWidth: 2, fill: false, tension: 0.3, pointBackgroundColor: '#EAB308', pointRadius: 4, yAxisID: 'y' },
            { type: 'bar', label: 'Goal %', data: goalValues, backgroundColor: '#3B82F6', borderRadius: 4, barPercentage: 0.6, maxBarThickness: 32, yAxisID: 'y' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, labels: { color: '#8A8278' } },
            tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } }
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { max: yMax, beginAtZero: true, ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => `${v}%` }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      })
    })
    return () => { active = false; if (instance) instance.destroy() }
  }, [labels, goalValues, shbValues])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

/* ─── Accordion Section ─── */
function AccordionSection({
  number, title, badges, children, defaultOpen = false
}: {
  number: string
  title: string
  badges?: { text: string; color: string }[]
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="la-acc-item">
      <div className="la-acc-header" onClick={() => setOpen(!open)}>
        <div className="la-acc-header-left">
          <span className="la-acc-title">{number} · {title}</span>
          {badges?.map((b, i) => (
            <span key={i} className={`la-acc-badge la-badge-${b.color}`}>{b.text}</span>
          ))}
        </div>
        <span className={`la-acc-chevron ${open ? 'open' : ''}`}>
          <ChevronDown />
        </span>
      </div>
      {open && <div className="la-acc-body">{children}</div>}
    </div>
  )
}

/* ─── Helper Functions ─── */
function parseLogin(m: any) {
  if (m.isAbsent || !m.loginTime) return null;
  const match = String(m.loginTime).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  if (String(m.loginTime).toLowerCase().includes('pm') && h < 12) h += 12;
  if (String(m.loginTime).toLowerCase().includes('am') && h === 12) h = 0;
  return h * 60 + min;
}

function getAvgLoginStr(sellers: any[]) {
  const total = sellers.reduce((sum, s) => {
    const min = parseLogin(s);
    return sum + (min || 0);
  }, 0);
  const valid = sellers.filter(s => parseLogin(s) !== null).length;
  if (valid === 0) return '—';
  const avg = Math.round(total / valid);
  const h = Math.floor(avg / 60);
  const m = avg % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* ─── Section Tables ─── */

function LoginSection({ hierarchy, onSellerClick }: { hierarchy: any[], onSellerClick: (seller: any) => void }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Avg Login Time</th>
            <th>Avg Break</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
            const catAvgLogin = getAvgLoginStr(allSellers)
            const catBreakTotal = allSellers.reduce((s: number, e: any) => s + e.breakTotalMins, 0)
            const catOnline = allSellers.filter((s: any) => !s.isAbsent).length
            const catAvgBreak = catOnline > 0 ? Math.round(catBreakTotal / catOnline) : 0
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                    <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedCat === catKey ? 'rotate(90deg)' : 'none' }}>▶</span>
                    {catKey}
                  </td>
                  <td>{catAvgLogin}</td>
                  <td>{catAvgBreak}m</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlAvgLogin = getAvgLoginStr(tl.sellers)
                  const tlBreakTotal = tl.sellers.reduce((s: number, e: any) => s + e.breakTotalMins, 0)
                  const tlOnline = tl.sellers.filter((s: any) => !s.isAbsent).length
                  const tlAvgBreak = tlOnline > 0 ? Math.round(tlBreakTotal / tlOnline) : 0
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px', color: '#E5E5E5', fontWeight: 600 }}>
                          <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTl === tlKey ? 'rotate(90deg)' : 'none', color: '#8A8278' }}>▶</span>
                          {tl.tl_name}
                        </td>
                        <td>{tlAvgLogin}</td>
                        <td>{tlAvgBreak}m</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.map((s: any) => (
                        <tr key={s.seller_email} style={{ background: "rgba(255,255,255,0.02)", cursor: "pointer" }} onClick={() => onSellerClick(s)}>
                          <td style={{ paddingLeft: '56px' }}>
                            {s.seller_name}
                            {s.isAbsent && <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Absent</span>}
                          </td>
                          <td>{s.isAbsent ? '—' : formatTime(s.loginTime)}</td>
                          <td style={{ color: s.breakTotalMins > 75 ? '#EF4444' : 'inherit' }}>{s.isAbsent ? '—' : `${s.breakTotalMins}m`}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BreakSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Avg Break (min)</th>
            <th>Sellers &gt;60min</th>
            <th>Total Break (hrs)</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers).filter((s: any) => !s.isAbsent)
            const totalBreak = allSellers.reduce((s: number, e: any) => s + e.breakTotalMins, 0)
            const avgBreak = allSellers.length > 0 ? Math.round(totalBreak / allSellers.length) : 0
            const longBreaks = allSellers.filter((s: any) => s.breakTotalMins > 60).length
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{avgBreak}m</td>
                  <td style={{ color: longBreaks > 0 ? '#EF4444' : '#22C55E' }}>{longBreaks}</td>
                  <td>{Math.round(totalBreak / 60)}h {totalBreak % 60}m</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlSellers = tl.sellers.filter((s: any) => !s.isAbsent)
                  const tlTotal = tlSellers.reduce((s: number, e: any) => s + e.breakTotalMins, 0)
                  const tlAvg = tlSellers.length > 0 ? Math.round(tlTotal / tlSellers.length) : 0
                  const tlLong = tlSellers.filter((s: any) => s.breakTotalMins > 60).length
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlAvg}m</td>
                        <td style={{ color: tlLong > 0 ? '#EF4444' : '#22C55E' }}>{tlLong}</td>
                        <td>{fmtMins(tlTotal)}</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.filter((s: any) => !s.isAbsent).map((s: any) => (
                        <tr key={s.seller_email} className="la-seller-row">
                          <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                          <td>{s.breakTotalMins}m</td>
                          <td>{s.breakTotalMins > 60 ? <span className="la-flag la-flag-late">⚠ Long</span> : '—'}</td>
                          <td>{s.breakCount} breaks</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RTGSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Total Leads</th>
            <th>RTG</th>
            <th>Non-RTG</th>
            <th>RTG %</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
            const totalRtg = allSellers.reduce((s: number, e: any) => s + e.rtgLeads, 0)
            const totalNonRtg = allSellers.reduce((s: number, e: any) => s + e.nonRtgLeads, 0)
            const total = totalRtg + totalNonRtg
            const pct = total > 0 ? ((totalRtg / total) * 100).toFixed(1) : '0.0'
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{total}</td>
                  <td>{totalRtg}</td>
                  <td>{totalNonRtg}</td>
                  <td style={{ color: '#F59E0B' }}>{pct}%</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlRtg = tl.sellers.reduce((s: number, e: any) => s + e.rtgLeads, 0)
                  const tlNonRtg = tl.sellers.reduce((s: number, e: any) => s + e.nonRtgLeads, 0)
                  const tlTotal = tlRtg + tlNonRtg
                  const tlPct = tlTotal > 0 ? ((tlRtg / tlTotal) * 100).toFixed(1) : '0.0'
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlTotal}</td>
                        <td>{tlRtg}</td>
                        <td>{tlNonRtg}</td>
                        <td style={{ color: '#F59E0B' }}>{tlPct}%</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.map((s: any) => {
                        const sTotal = s.rtgLeads + s.nonRtgLeads
                        const sPct = sTotal > 0 ? ((s.rtgLeads / sTotal) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={s.seller_email} className="la-seller-row">
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{sTotal}</td>
                            <td>{s.rtgLeads}</td>
                            <td>{s.nonRtgLeads}</td>
                            <td>{sPct}%</td>
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
    </div>
  )
}

function AppetiteSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>LTA Planned</th>
            <th>LTA Actual</th>
            <th>Fulfillment %</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers).filter((s: any) => !s.isAbsent)
            const planned = allSellers.reduce((s: number, e: any) => s + e.ltaPlanned, 0)
            const actual = allSellers.reduce((s: number, e: any) => s + e.ltaActual, 0)
            const pct = planned > 0 ? ((actual / planned) * 100).toFixed(1) : '0.0'
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{planned}</td>
                  <td>{actual}</td>
                  <td style={{ color: parseFloat(pct) < 50 ? '#EF4444' : '#F59E0B' }}>{pct}%</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlSellers = tl.sellers.filter((s: any) => !s.isAbsent)
                  const tlPlanned = tlSellers.reduce((s: number, e: any) => s + e.ltaPlanned, 0)
                  const tlActual = tlSellers.reduce((s: number, e: any) => s + e.ltaActual, 0)
                  const tlPct = tlPlanned > 0 ? ((tlActual / tlPlanned) * 100).toFixed(1) : '0.0'
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlPlanned}</td>
                        <td>{tlActual}</td>
                        <td style={{ color: parseFloat(tlPct) < 50 ? '#EF4444' : '#F59E0B' }}>{tlPct}%</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.filter((s: any) => !s.isAbsent).map((s: any) => {
                        const sPct = s.ltaPlanned > 0 ? ((s.ltaActual / s.ltaPlanned) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={s.seller_email} className="la-seller-row">
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{s.ltaPlanned}</td>
                            <td>{s.ltaActual}</td>
                            <td>{sPct}%</td>
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
    </div>
  )
}

function PaxSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  const calcAvgPax = (sellers: any[]) => {
    const total = sellers.reduce((s: number, e: any) => s + e.pax1 + e.pax2 + e.pax3 + e.pax4 + e.pax4Plus, 0)
    const weighted = sellers.reduce((s: number, e: any) => s + e.pax1 * 1 + e.pax2 * 2 + e.pax3 * 3 + e.pax4 * 4 + e.pax4Plus * 5, 0)
    return total > 0 ? (weighted / total).toFixed(1) : '0.0'
  }

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Pax 1</th>
            <th>Pax 2</th>
            <th>Pax 3</th>
            <th>Pax 4+</th>
            <th>Avg Pax</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{allSellers.reduce((s: number, e: any) => s + e.pax1, 0)}</td>
                  <td>{allSellers.reduce((s: number, e: any) => s + e.pax2, 0)}</td>
                  <td>{allSellers.reduce((s: number, e: any) => s + e.pax3, 0)}</td>
                  <td>{allSellers.reduce((s: number, e: any) => s + e.pax4 + e.pax4Plus, 0)}</td>
                  <td style={{ color: '#22C55E' }}>{calcAvgPax(allSellers)}</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlKey = `${catKey}-${tl.tl_name}`
                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tl.sellers.reduce((s: number, e: any) => s + e.pax1, 0)}</td>
                        <td>{tl.sellers.reduce((s: number, e: any) => s + e.pax2, 0)}</td>
                        <td>{tl.sellers.reduce((s: number, e: any) => s + e.pax3, 0)}</td>
                        <td>{tl.sellers.reduce((s: number, e: any) => s + e.pax4 + e.pax4Plus, 0)}</td>
                        <td style={{ color: '#22C55E' }}>{calcAvgPax(tl.sellers)}</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.map((s: any) => {
                        const sTotal = s.pax1 + s.pax2 + s.pax3 + s.pax4 + s.pax4Plus
                        const sAvg = sTotal > 0 ? ((s.pax1 * 1 + s.pax2 * 2 + s.pax3 * 3 + s.pax4 * 4 + s.pax4Plus * 5) / sTotal).toFixed(1) : '—'
                        return (
                          <tr key={s.seller_email} className="la-seller-row">
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{s.pax1}</td>
                            <td>{s.pax2}</td>
                            <td>{s.pax3}</td>
                            <td>{s.pax4 + s.pax4Plus}</td>
                            <td>{sAvg}</td>
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
    </div>
  )
}

function DOTSection({ dotDistribution }: { dotDistribution: any[] }) {
  if (!dotDistribution || dotDistribution.length === 0) {
    return <div className="la-no-data">No DOT distribution data available</div>
  }

  const maxVal = Math.max(...dotDistribution.map(d => d.count), 1)

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '120px', padding: '0 4px' }}>
        {dotDistribution.slice(0, 7).map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: '#F0EDE8', fontWeight: 600 }}>{d.count}</span>
            <div style={{
              width: '100%',
              maxWidth: '40px',
              height: `${Math.max((d.count / maxVal) * 90, 4)}px`,
              background: i < 6 ? 'linear-gradient(to top, #F4631E, #F4631E88)' : '#5A5650',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.5s ease'
            }} />
            <span style={{ fontSize: '0.6rem', color: '#8A8278' }}>{d.month.split('-').pop() || d.month}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AutoManualSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Total</th>
            <th>Auto</th>
            <th>Manual</th>
            <th>Manual %</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
            const total = allSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
            const auto = allSellers.reduce((s: number, e: any) => s + e.autoAllotted, 0)
            const manual = allSellers.reduce((s: number, e: any) => s + e.manualAllotted, 0)
            const manPct = total > 0 ? ((manual / total) * 100).toFixed(1) : '0.0'
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{total}</td>
                  <td>{auto}</td>
                  <td>{manual}</td>
                  <td style={{ color: parseFloat(manPct) > 25 ? '#F59E0B' : '#22C55E' }}>{manPct}%</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlTotal = tl.sellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
                  const tlAuto = tl.sellers.reduce((s: number, e: any) => s + e.autoAllotted, 0)
                  const tlManual = tl.sellers.reduce((s: number, e: any) => s + e.manualAllotted, 0)
                  const tlPct = tlTotal > 0 ? ((tlManual / tlTotal) * 100).toFixed(1) : '0.0'
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlTotal}</td>
                        <td>{tlAuto}</td>
                        <td>{tlManual}</td>
                        <td style={{ color: parseFloat(tlPct) > 25 ? '#F59E0B' : '#22C55E' }}>{tlPct}%</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.map((s: any) => {
                        const sPct = s.totalLeads > 0 ? ((s.manualAllotted / s.totalLeads) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={s.seller_email} className="la-seller-row">
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{s.totalLeads}</td>
                            <td>{s.autoAllotted}</td>
                            <td>{s.manualAllotted}</td>
                            <td>{sPct}%</td>
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
    </div>
  )
}

function FirstLeadSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Sellers</th>
            <th>No Lead Before 11AM</th>
            <th>Earliest Lead</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers).filter((s: any) => !s.isAbsent)
            const noLead = allSellers.filter((s: any) => s.firstLeadMinutes === null || s.firstLeadMinutes > 660).length
            const earliest = allSellers.filter((s: any) => s.firstLeadMinutes !== null).sort((a: any, b: any) => a.firstLeadMinutes - b.firstLeadMinutes)[0]
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{allSellers.length}</td>
                  <td style={{ color: noLead > 0 ? '#EF4444' : '#22C55E' }}>{noLead}</td>
                  <td>{earliest ? formatTime(earliest.firstLeadTime) : '—'}</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlSellers = tl.sellers.filter((s: any) => !s.isAbsent)
                  const tlNoLead = tlSellers.filter((s: any) => s.firstLeadMinutes === null || s.firstLeadMinutes > 660).length
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlSellers.length}</td>
                        <td style={{ color: tlNoLead > 0 ? '#EF4444' : '#22C55E' }}>{tlNoLead}</td>
                        <td>—</td>
                      </tr>
                      {expandedTl === tlKey && tlSellers.map((s: any) => (
                        <tr key={s.seller_email} className="la-seller-row">
                          <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                          <td>—</td>
                          <td>{(s.firstLeadMinutes === null || s.firstLeadMinutes > 660) ? <span className="la-flag la-flag-absent">No Lead</span> : '✓'}</td>
                          <td>{formatTime(s.firstLeadTime)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── LTA Section (with funnel drill-down) ─── */
function LTASection({ hierarchy, onTlFunnelClick, onSellerFunnelClick }: { hierarchy: any[], onTlFunnelClick: (tl: any, catName: string) => void, onSellerFunnelClick: (seller: any) => void }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Planned</th>
            <th>Actual</th>
            <th>Lost</th>
            <th>Lost %</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
            const planned = allSellers.reduce((s: number, e: any) => s + e.ltaPlanned, 0)
            const actual = allSellers.reduce((s: number, e: any) => s + e.ltaActual, 0)
            const lost = planned - actual
            const lostPct = planned > 0 ? ((lost / planned) * 100).toFixed(1) : '0.0'
            const catKey = cat.category_name
            const lostColor = parseFloat(lostPct) < 5 ? '#22C55E' : parseFloat(lostPct) <= 15 ? '#F59E0B' : '#EF4444'

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{planned}</td>
                  <td>{actual}</td>
                  <td>{lost}</td>
                  <td style={{ color: lostColor }}>{lostPct}%</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlPlanned = tl.sellers.reduce((s: number, e: any) => s + e.ltaPlanned, 0)
                  const tlActual = tl.sellers.reduce((s: number, e: any) => s + e.ltaActual, 0)
                  const tlLost = tlPlanned - tlActual
                  const tlPct = tlPlanned > 0 ? ((tlLost / tlPlanned) * 100).toFixed(1) : '0.0'
                  const tlColor = parseFloat(tlPct) < 5 ? '#22C55E' : parseFloat(tlPct) <= 15 ? '#F59E0B' : '#EF4444'
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlPlanned}</td>
                        <td>{tlActual}</td>
                        <td>{tlLost}</td>
                        <td style={{ color: tlColor }}>{tlPct}%</td>
                      </tr>
                      {expandedTl === tlKey && (
                        <tr>
                          <td colSpan={5} style={{ padding: '8px 16px 8px 28px', background: 'rgba(0,0,0,0.2)' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); onTlFunnelClick(tl, catKey) }}
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              📊 View Team Funnel
                            </button>
                          </td>
                        </tr>
                      )}
                      {expandedTl === tlKey && tl.sellers.map((s: any) => {
                        const sLost = s.ltaPlanned - s.ltaActual
                        const sPct = s.ltaPlanned > 0 ? ((sLost / s.ltaPlanned) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={s.seller_email} className="la-seller-row" onClick={() => onSellerFunnelClick(s)} style={{ cursor: 'pointer' }}>
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{s.ltaPlanned}</td>
                            <td>{s.ltaActual}</td>
                            <td>{sLost}</td>
                            <td>{sPct}%</td>
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
    </div>
  )
}

/* ─── MHE Section ─── */
function MHESection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Sellers</th>
            <th>Avg MHE %</th>
            <th>Mishandled Count</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers).filter((s: any) => !s.isAbsent)
            const mheVals = allSellers.filter((s: any) => s.ltaPlanned > 0).map((s: any) => s.mhePct)
            const avgMhe = mheVals.length > 0 ? (mheVals.reduce((s: number, v: number) => s + v, 0) / mheVals.length).toFixed(1) : '0.0'
            const totalMh = allSellers.reduce((s: number, e: any) => s + e.mishandledCount, 0)
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{allSellers.length}</td>
                  <td style={{ color: parseFloat(avgMhe) < 10 ? '#22C55E' : '#EF4444' }}>{avgMhe}%</td>
                  <td>{totalMh}</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlSellers = tl.sellers.filter((s: any) => !s.isAbsent && s.ltaPlanned > 0)
                  const tlMhe = tlSellers.length > 0 ? (tlSellers.reduce((s: number, e: any) => s + e.mhePct, 0) / tlSellers.length).toFixed(1) : '0.0'
                  const tlMhCount = tl.sellers.reduce((s: number, e: any) => s + e.mishandledCount, 0)
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlSellers.length}</td>
                        <td style={{ color: parseFloat(tlMhe) < 10 ? '#22C55E' : '#EF4444' }}>{tlMhe}%</td>
                        <td>{tlMhCount}</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.filter((s: any) => !s.isAbsent).map((s: any) => (
                        <tr key={s.seller_email} className="la-seller-row">
                          <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                          <td>—</td>
                          <td style={{ color: s.mhePct < 10 ? '#22C55E' : '#EF4444' }}>{s.mhePct}%</td>
                          <td>{s.mishandledCount}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GoalSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Sellers</th>
            <th>Avg Goal %</th>
            <th>At Risk (&lt;70%)</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers).filter((s: any) => s.blGoal > 0)
            const avgGoal = allSellers.length > 0 ? (allSellers.reduce((s: number, e: any) => s + e.goalPct, 0) / allSellers.length).toFixed(1) : '0.0'
            const atRisk = allSellers.filter((s: any) => s.goalPct < 70).length
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{allSellers.length}</td>
                  <td style={{ color: parseFloat(avgGoal) >= 70 ? '#22C55E' : '#EF4444' }}>{avgGoal}%</td>
                  <td style={{ color: atRisk > 0 ? '#EF4444' : '#22C55E' }}>{atRisk}</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlSellers = tl.sellers.filter((s: any) => s.blGoal > 0)
                  const tlAvg = tlSellers.length > 0 ? (tlSellers.reduce((s: number, e: any) => s + e.goalPct, 0) / tlSellers.length).toFixed(1) : '0.0'
                  const tlRisk = tlSellers.filter((s: any) => s.goalPct < 70).length
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlSellers.length}</td>
                        <td style={{ color: parseFloat(tlAvg) >= 70 ? '#22C55E' : '#EF4444' }}>{tlAvg}%</td>
                        <td style={{ color: tlRisk > 0 ? '#EF4444' : '#22C55E' }}>{tlRisk}</td>
                      </tr>
                      {expandedTl === tlKey && tlSellers.map((s: any) => (
                        <tr key={s.seller_email} className="la-seller-row">
                          <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                          <td>—</td>
                          <td style={{ color: s.goalPct >= 70 ? '#22C55E' : '#EF4444' }}>{s.goalPct}%</td>
                          <td>{s.goalPct < 70 ? <span className="la-flag la-flag-absent">At Risk</span> : '✓'}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function QueueSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>TLs</th>
            <th>Sellers</th>
            <th>Total Leads Today</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
            const totalLeads = allSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{cat.tl_count}</td>
                  <td>{cat.seller_count}</td>
                  <td>{totalLeads}</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlLeads = tl.sellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
                  return (
                    <tr key={`${catKey}-${tl.tl_name}`} className="la-tl-row">
                      <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                      <td>—</td>
                      <td>{tl.seller_count}</td>
                      <td>{tlLeads}</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── LTA Funnel Modal (team or single seller) ─── */
function aggregateLtaFunnel(sellers: any[]) {
  const funnels = sellers.map(computeLtaFunnel)
  const sum = (key: string) => funnels.reduce((s, f: any) => s + (f[key] || 0), 0)
  return {
    planned: sum('planned'), dynLta: sum('dynLta'), hygLta: sum('hygLta'),
    rev1Lta: sum('rev1Lta'), actual: sum('actual'),
    dynLost: sum('dynLost'), hygLost: sum('hygLost'), rev1Lost: sum('rev1Lost'), rev2Lost: sum('rev2Lost'),
  }
}

function FunnelModal({ title, funnel, onClose }: { title: string, funnel: ReturnType<typeof aggregateLtaFunnel>, onClose: () => void }) {
  const getDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`
  const stages = [
    { label: 'PLANNED LTA', value: funnel.planned, color: '#3B82F6', dropText: getDropText(funnel.dynLost, 'Dynamic'), width: '100%' },
    { label: 'DYNAMIC LTA', value: funnel.dynLta, color: '#EAB308', dropText: getDropText(funnel.hygLost, 'Hygiene'), width: '86%' },
    { label: 'HYGIENE LTA', value: funnel.hygLta, color: '#F97316', dropText: getDropText(funnel.rev1Lost, 'Goal Complete'), width: '72%' },
    { label: 'GOAL COMPLETE LTA', value: funnel.rev1Lta, color: '#8B5CF6', dropText: getDropText(funnel.rev2Lost, 'Final'), width: '60%' },
    { label: 'FINAL LTA', value: funnel.actual, color: '#22C55E', dropText: null, width: '48%' },
  ]
  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card" onClick={e => e.stopPropagation()}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          <span className="la-modal-dot" style={{ background: '#3B82F6' }} />
          <span className="la-modal-title">{title} — LTA Funnel</span>
        </div>
        <div className="la-funnel-stack">
          {stages.map((step, idx) => (
            <div key={idx} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="la-funnel-card" style={{ borderColor: step.color, width: step.width }}>
                <div className="la-funnel-label" style={{ color: step.color }}>{step.label}</div>
                <div className="la-funnel-value">{step.value}<span className="la-funnel-unit">leads</span></div>
              </div>
              {step.dropText && <div className="la-funnel-drop">{step.dropText}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── MHE Trend Modal (org / TL / seller drill) ─── */
function MheTrendModal({ hierarchy, onClose }: { hierarchy: any[], onClose: () => void }) {
  const [drillSeller, setDrillSeller] = useState<any>(null)
  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)

  const flatTls = hierarchy.flatMap(cat => cat.tls.map((tl: any) => ({ ...tl, category_name: cat.category_name, key: `${cat.category_name}-${tl.tl_name}` })))
  const allSellers = flatTls.flatMap(tl => tl.sellers)

  const buildDayMap = (sellers: any[]) => {
    const dayMap: Record<string, { sum: number; count: number }> = {}
    sellers.forEach((m: any) => {
      ;(m.monthly_lta_rows || []).forEach((r: any) => {
        const d = r.log_date
        if (!d) return
        const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
        if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
        dayMap[d].sum += pct
        dayMap[d].count += 1
      })
    })
    return dayMap
  }

  const activeSellers = drillSeller ? [drillSeller] : (expandedTlKey ? (flatTls.find(t => t.key === expandedTlKey)?.sellers || []) : allSellers)
  const dayMap = buildDayMap(activeSellers)
  const sortedDays = Object.keys(dayMap).sort()
  const labels = sortedDays.map(d => {
    const dt = new Date(d)
    return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`
  })
  const values = sortedDays.map(d => parseFloat((dayMap[d].sum / dayMap[d].count).toFixed(1)))
  const avg = values.length > 0 ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : 0
  const isGood = avg <= 20

  const title = drillSeller ? `${drillSeller.seller_name} — MHE Trend` : expandedTlKey ? `${flatTls.find(t => t.key === expandedTlKey)?.tl_name} — MHE Trend` : 'Org MHE Trend'

  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card wide" onClick={e => e.stopPropagation()}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          {drillSeller && <button className="la-back-btn" onClick={() => setDrillSeller(null)}>← Back</button>}
          <span className="la-modal-dot" style={{ background: isGood ? '#22C55E' : '#EF4444' }} />
          <span className="la-modal-title">{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexDirection: drillSeller ? 'column' : 'row' }}>
          <div style={{ flex: 1, minWidth: '400px', height: '260px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #262626', padding: '16px' }}>
            <MheTrendChart labels={labels} values={values} color={isGood ? '#22C55E' : '#EF4444'} />
          </div>
          {!drillSeller && (
            <div style={{ width: '260px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #262626' }}>Team Drill-down</div>
              <div className="la-drill-list">
                {flatTls.map(tl => {
                  const tlDayMap = buildDayMap(tl.sellers)
                  const tlDays = Object.keys(tlDayMap)
                  const tlAvg = tlDays.length > 0 ? parseFloat((tlDays.reduce((s, d) => s + (tlDayMap[d].sum / tlDayMap[d].count), 0) / tlDays.length).toFixed(1)) : 0
                  return (
                    <React.Fragment key={tl.key}>
                      <div className="la-drill-tl-row" onClick={() => setExpandedTlKey(expandedTlKey === tl.key ? null : tl.key)}>
                        <span>{tl.category_name} · {tl.tl_name}</span>
                        <span style={{ color: tlAvg <= 20 ? '#22C55E' : '#EF4444' }}>{tlAvg}%</span>
                      </div>
                      {expandedTlKey === tl.key && tl.sellers.map((s: any) => {
                        let mSum = 0, mDays = 0
                        ;(s.monthly_lta_rows || []).forEach((r: any) => { if (typeof r.mishandled_pct === 'number') { mSum += r.mishandled_pct * 100; mDays++ } })
                        const mAvg = mDays > 0 ? parseFloat((mSum / mDays).toFixed(1)) : 0
                        return (
                          <div key={s.seller_email} className="la-drill-seller-row" onClick={() => setDrillSeller(s)}>
                            <span>{s.seller_name}</span>
                            <span style={{ color: mAvg <= 20 ? '#22C55E' : '#EF4444' }}>{mAvg}%</span>
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Goal vs SHB Trend Modal ─── */
function GoalShbTrendModal({ hierarchy, dateFrom, onClose }: { hierarchy: any[], dateFrom: string, onClose: () => void }) {
  const [drillSeller, setDrillSeller] = useState<any>(null)
  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)

  const flatTls = hierarchy.flatMap(cat => cat.tls.map((tl: any) => ({ ...tl, category_name: cat.category_name, key: `${cat.category_name}-${tl.tl_name}` })))
  const allSellers = flatTls.flatMap(tl => tl.sellers)

  const [y, mStr] = dateFrom.split('-')
  const daysInMonth = new Date(parseInt(y), parseInt(mStr), 0).getDate()

  const buildPadded = (sellers: any[]) => {
    const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
    sellers.forEach((m: any) => {
      ;(m.monthly_goal_shb || []).forEach((r: any) => {
        const d = r.date
        if (!d) return
        if (!dayMap[d]) dayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
        dayMap[d].goalSum += typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
        dayMap[d].shbSum += typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
        dayMap[d].count += 1
      })
    })
    const padded = []
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${y}-${mStr}-${String(i).padStart(2, '0')}`
      if (dayMap[dStr]) {
        padded.push({ date: dStr, goalAvg: parseFloat((dayMap[dStr].goalSum / dayMap[dStr].count).toFixed(0)), shbAvg: parseFloat((dayMap[dStr].shbSum / dayMap[dStr].count).toFixed(0)) })
      } else {
        padded.push({ date: dStr, goalAvg: 0, shbAvg: 0 })
      }
    }
    return padded
  }

  const activeSellers = drillSeller ? [drillSeller] : (expandedTlKey ? (flatTls.find(t => t.key === expandedTlKey)?.sellers || []) : allSellers)
  const activeData = buildPadded(activeSellers)
  const labels = activeData.map(d => `${parseInt(d.date.split('-')[2])} ${new Date(d.date).toLocaleString('default', { month: 'short' })}`)
  const goalValues = activeData.map(d => d.goalAvg)
  const shbValues = activeData.map(d => d.shbAvg)
  const hasData = goalValues.some(v => v > 0) || shbValues.some(v => v > 0)

  const title = drillSeller ? `${drillSeller.seller_name} — Goal vs SHB` : expandedTlKey ? `${flatTls.find(t => t.key === expandedTlKey)?.tl_name} — Goal vs SHB` : 'Org Goal vs SHB Trend'

  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card wide" onClick={e => e.stopPropagation()}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          {drillSeller && <button className="la-back-btn" onClick={() => setDrillSeller(null)}>← Back</button>}
          <span className="la-modal-dot" style={{ background: '#3B82F6' }} />
          <span className="la-modal-title">{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 2, height: '280px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #262626', padding: '16px' }}>
            {hasData ? <GoalShbTrendChart labels={labels} goalValues={goalValues} shbValues={shbValues} /> : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No data for this month yet.</div>
            )}
          </div>
          {!drillSeller && (
            <div style={{ flex: 1, borderLeft: '1px solid #262626', paddingLeft: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px' }}>Team Drill-down</div>
              <div className="la-drill-list">
                {flatTls.map(tl => {
                  let gSum = 0, sSum = 0, cnt = 0
                  tl.sellers.forEach((m: any) => (m.monthly_goal_shb || []).forEach((r: any) => { gSum += (r.goal_completion || 0) * 100; sSum += (r.shb_percent || 0) * 100; cnt++ }))
                  const gAvg = cnt > 0 ? Math.round(gSum / cnt) : 0
                  const sAvg = cnt > 0 ? Math.round(sSum / cnt) : 0
                  return (
                    <React.Fragment key={tl.key}>
                      <div className="la-drill-tl-row" onClick={() => setExpandedTlKey(expandedTlKey === tl.key ? null : tl.key)}>
                        <span>{tl.category_name} · {tl.tl_name}</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <span style={{ color: '#3B82F6' }}>{gAvg}%</span>
                          <span style={{ color: '#EAB308' }}>{sAvg}%</span>
                        </div>
                      </div>
                      {expandedTlKey === tl.key && tl.sellers.map((s: any) => {
                        let mg = 0, ms = 0, mc = 0
                        ;(s.monthly_goal_shb || []).forEach((r: any) => { mg += (r.goal_completion || 0) * 100; ms += (r.shb_percent || 0) * 100; mc++ })
                        const mgAvg = mc > 0 ? Math.round(mg / mc) : 0
                        const msAvg = mc > 0 ? Math.round(ms / mc) : 0
                        return (
                          <div key={s.seller_email} className="la-drill-seller-row" onClick={() => setDrillSeller(s)}>
                            <span>{s.seller_name}</span>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <span style={{ color: '#3B82F6' }}>{mgAvg}%</span>
                              <span style={{ color: '#EAB308' }}>{msAvg}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Monthly Breakdown Section (DOT / Allotment / Pax / Appetite&CA) ─── */
function MonthlyBreakdownSection({ hierarchy, onSellerClick }: { hierarchy: any[], onSellerClick: (seller: any) => void }) {
  const [activeCard, setActiveCard] = useState<'dot' | 'allotment' | 'pax' | 'ca' | null>(null)
  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)

  const flatTls = hierarchy.flatMap(cat => cat.tls.map((tl: any) => ({ ...tl, category_name: cat.category_name, key: `${cat.category_name}-${tl.tl_name}` })))
  const allMembers = flatTls.flatMap(tl => tl.sellers)

  const sumField = (members: any[], key: string) => members.reduce((s: number, m: any) => s + (m.monthly_rows || []).reduce((s2: number, r: any) => s2 + (r[key] || 0), 0), 0)

  const totalLeads = sumField(allMembers, 'total_leads_allotted')
  const totalAuto = sumField(allMembers, 'auto_allotted')
  const totalManual = sumField(allMembers, 'manual_allotted')
  const totalRtg = sumField(allMembers, 'rtg_leads')
  const totalNonRtg = sumField(allMembers, 'non_rtg_leads')
  const totalPax1 = sumField(allMembers, 'pax_1')
  const totalPax2 = sumField(allMembers, 'pax_2')
  const totalPax3 = sumField(allMembers, 'pax_3')
  const totalPax4 = sumField(allMembers, 'pax_4')
  const totalPax4Plus = sumField(allMembers, 'pax_4_plus')
  const totalPax = totalPax1 + totalPax2 + totalPax3 + totalPax4 + totalPax4Plus

  const totalAppetite = allMembers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0), 0)
  const fulfPct = totalAppetite > 0 ? Math.round((totalLeads / totalAppetite) * 100) : 0
  const caRows = allMembers.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
  const sumCta = caRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
  const sumCtaLeads = caRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0)
  const avgCA = sumCtaLeads > 0 ? Math.round(sumCta / sumCtaLeads) : null

  const dotMonthsConfig = [
    { label: 'July', key: '07' }, { label: 'August', key: '08' }, { label: 'Sept', key: '09' },
    { label: 'Oct', key: '10' }, { label: 'Nov', key: '11' }, { label: 'Dec', key: '12' }
  ]
  const dotMap: Record<string, number> = {}
  allMembers.forEach((m: any) => (m.dot_rows || []).forEach((d: any) => { dotMap[d.dot_month] = (dotMap[d.dot_month] || 0) + (d.total_leads_allotted || 0) }))
  const dotChartData: { label: string; value: number; color: string }[] = []
  dotMonthsConfig.forEach(mo => {
    let val = 0
    Object.entries(dotMap).forEach(([k, v]) => { if (k.endsWith('-' + mo.key)) val += v })
    dotChartData.push({ label: mo.label, value: val, color: '#F4631E' })
  })
  let futureSum = 0
  Object.entries(dotMap).forEach(([k, v]) => { if (!dotMonthsConfig.some(mo => k.endsWith('-' + mo.key))) futureSum += v })
  dotChartData.push({ label: '6+ Months', value: futureSum, color: '#5A5650' })
  const maxDot = Math.max(...dotChartData.map(d => d.value), 1)

  const allotmentRows = [
    { label: 'Auto Allotted', value: totalAuto, color: '#E5E7EB' },
    { label: 'Manual Allotted', value: totalManual, color: '#9CA3AF' },
    { label: 'RTG Leads', value: totalRtg, color: '#F4631E' },
    { label: 'Non-RTG', value: totalNonRtg, color: '#4B5563' },
  ]
  const paxRows = [
    { label: '1-pax', value: totalPax1, color: '#F3F4F6' },
    { label: '2-pax', value: totalPax2, color: '#E5E7EB' },
    { label: '3-pax', value: totalPax3, color: '#D1D5DB' },
    { label: '4-pax', value: totalPax4, color: '#9CA3AF' },
    { label: '4+ pax', value: totalPax4Plus, color: '#6B7280' },
  ]

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthStr = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`

  const cardBase = { background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer' as const }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div className="la-section-title">Monthly Breakdown · {monthStr}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'dot' ? null : 'dot'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase' }}>DOT Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dotChartData.map((bar, i) => {
              const totalDOT = dotChartData.reduce((s, b) => s + b.value, 0)
              const barPct = pctOf(bar.value, totalDOT)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '52px', fontSize: '0.6rem', color: '#8A8278', textAlign: 'right' }}>{bar.label}</div>
                  <div style={{ flex: 1, height: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${(bar.value / maxDot) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${bar.color}40, ${bar.color}90)`, borderRadius: '6px', minWidth: bar.value > 0 ? '4px' : '0' }} />
                  </div>
                  <div style={{ width: '28px', fontSize: '0.68rem', fontWeight: 700, color: bar.value > 0 ? bar.color : '#5A5650', textAlign: 'right' }}>{bar.value}</div>
                  <span style={{ fontSize: '0.55rem', fontWeight: 600, color: bar.value > 0 ? bar.color : '#5A5650', background: bar.value > 0 ? `${bar.color}15` : 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '100px', minWidth: '32px', textAlign: 'center' }}>{barPct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'allotment' ? null : 'allotment'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase' }}>Allotment Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allotmentRows.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 600, color: item.color, background: `${item.color}15`, padding: '2px 8px', borderRadius: '100px' }}>{pctOf(item.value, totalLeads)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'pax' ? null : 'pax'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase' }}>Leads by Group Size</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {paxRows.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{p.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.value > 0 ? p.color : '#5A5650' }}>{p.value}</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 600, color: p.color, background: `${p.color}15`, padding: '2px 8px', borderRadius: '100px' }}>{pctOf(p.value, totalPax)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'ca' ? null : 'ca'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase' }}>Appetite & C→A Time</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.64rem', color: '#8A8278', fontWeight: 600, textTransform: 'uppercase' }}>Fulfillment</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: fulfPct >= 90 ? '#22C55E' : fulfPct >= 70 ? '#F59E0B' : '#EF4444' }}>{fulfPct}%</span>
              </div>
              <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(fulfPct, 100)}%`, height: '100%', background: fulfPct >= 90 ? 'linear-gradient(90deg,#22C55E40,#22C55E90)' : fulfPct >= 70 ? 'linear-gradient(90deg,#F59E0B40,#F59E0B90)' : 'linear-gradient(90deg,#EF444440,#EF444490)', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Appetite (LTA)</span><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F4631E' }}>{totalAppetite}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Leads Allotted</span><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{totalLeads}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Avg C→A Time</span><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{avgCA != null ? `${avgCA}m` : '—'}</span></div>
          </div>
        </div>
      </div>

      {activeCard && (
        <div className="la-modal-overlay" onClick={() => { setActiveCard(null); setExpandedTlKey(null) }}>
          <div className="la-modal-card wide" onClick={e => e.stopPropagation()}>
            <button className="la-modal-close" onClick={() => { setActiveCard(null); setExpandedTlKey(null) }}>✕</button>
            <div className="la-modal-title" style={{ marginBottom: '20px' }}>
              {activeCard === 'dot' ? 'DOT Distribution' : activeCard === 'allotment' ? 'Allotment Breakdown' : activeCard === 'ca' ? 'Appetite & C→A Time' : 'Leads by Group Size'}
              <span style={{ fontSize: '0.75rem', color: '#8A8278', marginLeft: '8px', fontWeight: 400 }}>· Team Drill-down</span>
            </div>
            <div className="la-table-wrap">
              <table className="la-table">
                <thead>
                  <tr>
                    <th>Team (TL)</th>
                    {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => <th key={mo.key}>{mo.label}</th>)}<th>6+ Months</th></>)
                      : activeCard === 'allotment' ? (<><th>Auto</th><th>Manual</th><th>RTG</th><th>Non-RTG</th></>)
                      : activeCard === 'ca' ? (<><th>Leads Allotted</th><th>Appetite</th><th>Fulfillment %</th><th>Avg C→A</th></>)
                      : (<><th>1-pax</th><th>2-pax</th><th>3-pax</th><th>4-pax</th><th>4+ pax</th></>)}
                  </tr>
                </thead>
                <tbody>
                  {flatTls.map(tl => {
                    const getTlDot = (key: string) => { let v = 0; Object.entries(tl.sellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (k.endsWith('-' + key)) v += val }); return v }
                    return (
                      <React.Fragment key={tl.key}>
                        <tr className="la-tl-row" onClick={() => setExpandedTlKey(expandedTlKey === tl.key ? null : tl.key)}>
                          <td>{tl.category_name} · {tl.tl_name}</td>
                          {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => <td key={mo.key}>{getTlDot(mo.key)}</td>)}<td>—</td></>)
                            : activeCard === 'allotment' ? (<><td>{sumField(tl.sellers, 'auto_allotted')}</td><td>{sumField(tl.sellers, 'manual_allotted')}</td><td>{sumField(tl.sellers, 'rtg_leads')}</td><td>{sumField(tl.sellers, 'non_rtg_leads')}</td></>)
                            : activeCard === 'ca' ? (() => {
                                const tAllotted = sumField(tl.sellers, 'total_leads_allotted')
                                const tAppetite = tl.sellers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0), 0)
                                const tFulf = tAppetite > 0 ? Math.round((tAllotted / tAppetite) * 100) : 0
                                const tCaRows = tl.sellers.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
                                const tSumCta = tCaRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
                                const tSumLeads = tCaRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0)
                                const tAvgCa = tSumLeads > 0 ? Math.round(tSumCta / tSumLeads) : null
                                return (<><td>{tAllotted}</td><td>{tAppetite}</td><td style={{ color: tFulf >= 90 ? '#22C55E' : tFulf >= 70 ? '#F59E0B' : '#EF4444' }}>{tFulf}%</td><td>{tAvgCa != null ? `${tAvgCa}m` : '—'}</td></>)
                              })()
                            : (<><td>{sumField(tl.sellers, 'pax_1')}</td><td>{sumField(tl.sellers, 'pax_2')}</td><td>{sumField(tl.sellers, 'pax_3')}</td><td>{sumField(tl.sellers, 'pax_4')}</td><td>{sumField(tl.sellers, 'pax_4_plus')}</td></>)}
                        </tr>
                        {expandedTlKey === tl.key && tl.sellers.map((s: any) => (
                          <tr key={s.seller_email} className="la-seller-row" onClick={() => onSellerClick(s)} style={{ cursor: 'pointer' }}>
                            <td style={{ paddingLeft: '28px' }}>{s.seller_name}{s.isAbsent && <span className="la-flag la-flag-absent" style={{ marginLeft: '6px' }}>Absent</span>}</td>
                            {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => { let v = 0; (s.dot_rows || []).forEach((d: any) => { if (d.dot_month.endsWith('-' + mo.key)) v += d.total_leads_allotted || 0 }); return <td key={mo.key}>{s.isAbsent ? '—' : v}</td> })}<td>—</td></>)
                              : activeCard === 'allotment' ? (<><td>{s.isAbsent ? '—' : sumField([s], 'auto_allotted')}</td><td>{s.isAbsent ? '—' : sumField([s], 'manual_allotted')}</td><td>{s.isAbsent ? '—' : sumField([s], 'rtg_leads')}</td><td>{s.isAbsent ? '—' : sumField([s], 'non_rtg_leads')}</td></>)
                              : activeCard === 'ca' ? (() => {
                                  const sAllotted = sumField([s], 'total_leads_allotted')
                                  const sAppetite = (s.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0)
                                  const sFulf = sAppetite > 0 ? Math.round((sAllotted / sAppetite) * 100) : 0
                                  const sCaRows = (s.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
                                  const sSumCta = sCaRows.reduce((s2: number, r: any) => s2 + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
                                  const sSumLeads = sCaRows.reduce((s2: number, r: any) => s2 + r.total_leads_allotted, 0)
                                  const sAvgCa = sSumLeads > 0 ? Math.round(sSumCta / sSumLeads) : null
                                  return (<><td>{s.isAbsent ? '—' : sAllotted}</td><td>{s.isAbsent ? '—' : sAppetite}</td><td>{s.isAbsent ? '—' : `${sFulf}%`}</td><td>{s.isAbsent ? '—' : (sAvgCa != null ? `${sAvgCa}m` : '—')}</td></>)
                                })()
                              : (<><td>{s.isAbsent ? '—' : sumField([s], 'pax_1')}</td><td>{s.isAbsent ? '—' : sumField([s], 'pax_2')}</td><td>{s.isAbsent ? '—' : sumField([s], 'pax_3')}</td><td>{s.isAbsent ? '—' : sumField([s], 'pax_4')}</td><td>{s.isAbsent ? '—' : sumField([s], 'pax_4_plus')}</td></>)}
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AdminLTAPage({ session }: AdminLTAPageProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All Categories')

  const todayIST = new Date(Date.now() + 19800000).toISOString().split('T')[0]
  const [dateFrom, setDateFrom] = useState(todayIST)
  const [dateTo, setDateTo] = useState(todayIST)
  const [selectedSellerTimeline, setSelectedSellerTimeline] = useState<any>(null)

  const [funnelTitle, setFunnelTitle] = useState<string | null>(null)
  const [funnelData, setFunnelData] = useState<ReturnType<typeof aggregateLtaFunnel> | null>(null)
  const [showMheModal, setShowMheModal] = useState(false)
  const [showGoalShbModal, setShowGoalShbModal] = useState(false)

  const fetchData = (date: string, cat: string) => {
    setLoading(true)
    const params = new URLSearchParams({ date })
    if (cat !== 'All Categories') params.set('category', cat)

    fetch(`/api/admin/lta?${params}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchData(dateFrom, selectedCategory)
  }, [dateFrom, selectedCategory])

  const openTlFunnel = (tl: any, catName: string) => {
    setFunnelTitle(`${catName} · ${tl.tl_name}`)
    setFunnelData(aggregateLtaFunnel(tl.sellers))
  }
  const openSellerFunnel = (seller: any) => {
    setFunnelTitle(seller.seller_name)
    setFunnelData(aggregateLtaFunnel([seller]))
  }

  if (loading) return <Loader />

  if (!data || data.error) {
    return (
      <div style={{ color: '#EF4444', padding: '24px', textAlign: 'center' }}>
        Error: {data?.error || 'Could not load data. Please try again.'}
      </div>
    )
  }

  const org = data.org || {}
  const alerts = data.alerts || {}
  const hierarchy = data.hierarchy || []
  const allCategories = ['All Categories', ...(data.categories || [])]

  const displayDate = new Date(data.date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

  return (
    <>
      <style>{CSS}</style>
      <div className="la-page">

        <div className="la-header">
          <h1 className="la-title">
            Lead <span className="la-title-accent">Allocation</span> — Admin view
          </h1>
          <p className="la-subtitle">
            Operations Head · {selectedCategory} · Today, {displayDate}
          </p>
        </div>

        <div className="la-filters">
          <select className="la-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {allCategories.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>

          <div className="la-date-row">
            <input type="date" className="la-date-input" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value) }} />
          </div>

          <span style={{ color: '#5A5650', fontSize: '0.75rem', alignSelf: 'center' }}>to</span>

          <div className="la-date-row">
            <input type="date" className="la-date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <button className="la-today-btn" onClick={() => { setDateFrom(todayIST); setDateTo(todayIST) }}>Today</button>
        </div>

        <div className="la-alerts-header">
          <span className="la-alerts-icon">ⓘ</span>
          <span>Org-level alerts ({
            (alerts.lateLogins > 0 ? 1 : 0) +
            (alerts.absentSellers > 0 ? 1 : 0) +
            (org.sellersAtRisk > 0 ? 1 : 0) +
            (org.mhePct > 0 ? 1 : 0)
          })</span>
        </div>

        <div className="la-kpi-row">
          <div className="la-kpi-card">
            <div className="la-kpi-label">Total leads (org)</div>
            <div className="la-kpi-value" style={{ color: '#F0EDE8' }}>{org.totalLeads?.toLocaleString() || 0}</div>
            <div className="la-kpi-sub">{org.categoryCount} categories · {org.tlCount} TLs · {org.sellerCount} sellers</div>
          </div>

          <div className="la-kpi-card">
            <div className="la-kpi-label">Org RTG %</div>
            <div className="la-kpi-value" style={{ color: '#F4631E' }}>{org.rtgPct}%</div>
            <div className="la-kpi-sub">Weighted avg across org</div>
          </div>

          <div className="la-kpi-card">
            <div className="la-kpi-label">Auto allotment %</div>
            <div className="la-kpi-value" style={{ color: '#F0EDE8' }}>{org.autoAllotPct}%</div>
            <div className="la-kpi-sub">Target &gt;80%</div>
          </div>

          <div className="la-kpi-card">
            <div className="la-kpi-label">Sellers at risk</div>
            <div className="la-kpi-value" style={{ color: '#EF4444' }}>{org.sellersAtRisk}</div>
            <div className="la-kpi-sub">Goal &lt;70% across org</div>
          </div>

          <div className="la-kpi-card clickable" onClick={() => setShowMheModal(true)}>
            <div className="la-kpi-label">Org MHE % <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>· tap</span></div>
            <div className="la-kpi-value" style={{ color: '#22C55E' }}>{org.mhePct}%</div>
            <div className="la-kpi-sub">Lower = better</div>
          </div>

          <div className="la-kpi-card clickable" onClick={() => setShowGoalShbModal(true)}>
            <div className="la-kpi-label">Goal vs SHB <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>· tap</span></div>
            <div className="la-kpi-value" style={{ color: '#3B82F6' }}>{org.avgGoalPct}%</div>
            <div className="la-kpi-sub">SHB: {org.avgShbPct}%</div>
          </div>
        </div>

        <MonthlyBreakdownSection hierarchy={hierarchy} onSellerClick={setSelectedSellerTimeline} />

        <div className="la-accordion">
          <AccordionSection number="3.1" title="Login & Availability" badges={[
            ...(alerts.lateLogins > 0 ? [{ text: `${alerts.lateLogins} late logins`, color: 'yellow' }] : []),
            ...(alerts.absentSellers > 0 ? [{ text: `${alerts.absentSellers} absent`, color: 'red' }] : []),
          ]}>
            <LoginSection hierarchy={hierarchy} onSellerClick={setSelectedSellerTimeline} />
          </AccordionSection>

          <AccordionSection number="3.2" title="Break / Unavailability" badges={alerts.longBreakSellers > 0 ? [{ text: `${alerts.longBreakSellers} long breaks`, color: 'yellow' }] : []}>
            <BreakSection hierarchy={hierarchy} />
          </AccordionSection>

          <AccordionSection number="3.3" title="RTG vs Non-RTG" badges={[{ text: `Org RTG: ${org.rtgPct}%`, color: 'yellow' }]}>
            <RTGSection hierarchy={hierarchy} />
          </AccordionSection>

          <AccordionSection number="3.4" title="Appetite Fulfillment (C→A)" badges={[{ text: `Org 3PM: ${alerts.orgAppetitePct}%`, color: 'yellow' }]}>
            <AppetiteSection hierarchy={hierarchy} />
          </AccordionSection>

          <AccordionSection number="3.5" title="Pax Bifurcation" badges={[{ text: `Org avg pax: ${alerts.orgAvgPax}`, color: 'green' }]}>
            <PaxSection hierarchy={hierarchy} />
          </AccordionSection>

          <AccordionSection number="3.6" title="DOT Month Distribution">
            <DOTSection dotDistribution={data.dotDistribution || []} />
          </AccordionSection>

          <AccordionSection number="3.7" title="Auto vs Manual Allotment" badges={[
            { text: 'Admin only', color: 'blue' },
            ...(org.manualAllotPct > 20 ? [{ text: `Manual: ${org.manualAllotPct}% — Watch`, color: 'purple' }] : []),
          ]}>
            <AutoManualSection hierarchy={hierarchy} />
          </AccordionSection>

          <AccordionSection number="3.8" title="First Lead Received Time" badges={alerts.noLeadBefore11AM > 0 ? [{ text: `${alerts.noLeadBefore11AM} sellers no lead before 11AM`, color: 'red' }] : []}>
            <FirstLeadSection hierarchy={hierarchy} />
          </AccordionSection>

          <AccordionSection number="3.9" title="LTA — Lead Time Availability">
            <LTASection hierarchy={hierarchy} onTlFunnelClick={openTlFunnel} onSellerFunnelClick={openSellerFunnel} />
          </AccordionSection>

          <AccordionSection number="3.10" title="MHE — Mishandled %" badges={[{ text: `Org avg: ${org.mhePct}%`, color: 'green' }]}>
            <MHESection hierarchy={hierarchy} />
          </AccordionSection>

          <AccordionSection number="3.11" title="Goal % Achievement Trend" badges={alerts.categoriesAtRisk > 0 ? [{ text: `${alerts.categoriesAtRisk} categories at risk`, color: 'red' }] : []}>
            <GoalSection hierarchy={hierarchy} />
          </AccordionSection>

          <AccordionSection number="3.12" title="Leads in Queue">
            <QueueSection hierarchy={hierarchy} />
          </AccordionSection>
        </div>

        {selectedSellerTimeline && (
          <SellerTimelineModal seller={selectedSellerTimeline} onClose={() => setSelectedSellerTimeline(null)} />
        )}

        {funnelData && (
          <FunnelModal title={funnelTitle || ''} funnel={funnelData} onClose={() => { setFunnelData(null); setFunnelTitle(null) }} />
        )}

        {showMheModal && (
          <MheTrendModal hierarchy={hierarchy} onClose={() => setShowMheModal(false)} />
        )}

        {showGoalShbModal && (
          <GoalShbTrendModal hierarchy={hierarchy} dateFrom={dateFrom} onClose={() => setShowGoalShbModal(false)} />
        )}

      </div>
    </>
  )
}