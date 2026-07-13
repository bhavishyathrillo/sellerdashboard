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
  background: #0F0F0F;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 16px 18px;
  min-width: 0;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s;
}

.la-kpi-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 14px 14px 0 0;
}

.la-kpi-card.clickable {
  cursor: pointer;
}

.la-kpi-card:hover, .la-kpi-card.clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.4);
  border-color: rgba(244,99,30,0.3);
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
        type: 'bar' as const,
        data: {
          labels,
          datasets: [
            { type: 'line', label: 'SHB %', data: shbValues, borderColor: '#EAB308', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderWidth: 2, fill: false, tension: 0.3, pointBackgroundColor: '#EAB308', pointRadius: 4, yAxisID: 'y' },
            { type: 'bar' as const, label: 'Goal %', data: goalValues, backgroundColor: '#3B82F6', borderRadius: 4, barPercentage: 0.6, maxBarThickness: 32, yAxisID: 'y' }
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
  title, badges, children, defaultOpen = false
}: {
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
          <span className="la-acc-title">{title}</span>
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
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
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
                  const tlSellers = tl.sellers
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
                      {expandedTl === tlKey && tl.sellers.map((s: any) => (
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
            <th>Leads Allotted</th>
            <th>Appetite (LTA)</th>
            <th>Overallocation</th>
            <th>Fulfillment %</th>
            <th>Avg C→A Time</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers).filter((s: any) => !s.isAbsent)
            const allotted = allSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
            const appetite = allSellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
            const overallocation = Math.max(0, allotted - appetite)
            const pct = appetite > 0 ? Math.round((allotted / appetite) * 100) : 0
            
            const caSellers = allSellers.filter((s: any) => s.totalLeads > 0 && s.medianCA != null)
            const sumCta = caSellers.reduce((s: number, e: any) => s + (e.medianCA * e.totalLeads), 0)
            const sumLeads = caSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
            const avgCa = sumLeads > 0 ? Math.round(sumCta / sumLeads) : null
            
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{allotted}</td>
                  <td>{appetite}</td>
                  <td style={{ color: overallocation > 0 ? '#EF4444' : '#8A8278' }}>{overallocation}</td>
                  <td style={{ color: pct >= 90 ? '#22C55E' : pct >= 70 ? '#F59E0B' : '#EF4444' }}>{pct}%</td>
                  <td>{avgCa != null ? `${avgCa}m` : '—'}</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlSellers = tl.sellers.filter((s: any) => !s.isAbsent)
                  const tlAllotted = tlSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
                  const tlAppetite = tlSellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
                  const tlOverallocation = Math.max(0, tlAllotted - tlAppetite)
                  const tlPct = tlAppetite > 0 ? Math.round((tlAllotted / tlAppetite) * 100) : 0
                  
                  const tlCaSellers = tlSellers.filter((s: any) => s.totalLeads > 0 && s.medianCA != null)
                  const tlSumCta = tlCaSellers.reduce((s: number, e: any) => s + (e.medianCA * e.totalLeads), 0)
                  const tlSumLeads = tlCaSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
                  const tlAvgCa = tlSumLeads > 0 ? Math.round(tlSumCta / tlSumLeads) : null

                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '24px' }}>
                          <span style={{ fontSize: '10px', marginRight: '6px', opacity: 0.5 }}>▼</span>
                          {tl.tl_name}
                        </td>
                        <td>{tlAllotted}</td>
                        <td>{tlAppetite}</td>
                        <td style={{ color: tlOverallocation > 0 ? '#EF4444' : '#5A5650' }}>{tlOverallocation}</td>
                        <td style={{ color: tlPct >= 90 ? '#22C55E' : tlPct >= 70 ? '#F59E0B' : '#EF4444' }}>{tlPct}%</td>
                        <td>{tlAvgCa != null ? `${tlAvgCa}m` : '—'}</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.filter((s: any) => !s.isAbsent).map((s: any) => {
                        const sPct = s.ltaActual > 0 ? Math.round((s.totalLeads / s.ltaActual) * 100) : 0
                        const sOverallocation = Math.max(0, s.totalLeads - (s.ltaActual || 0))
                        return (
                          <tr key={s.seller_email} className="la-seller-row">
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{s.totalLeads}</td>
                            <td>{s.ltaActual || 0}</td>
                            <td style={{ color: sOverallocation > 0 ? '#EF4444' : '#5A5650' }}>{sOverallocation}</td>
                            <td style={{ color: sPct >= 90 ? '#22C55E' : sPct >= 70 ? '#F59E0B' : '#EF4444' }}>{sPct}%</td>
                            <td>{s.medianCA != null ? `${s.medianCA}m` : '—'}</td>
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

/* ─── LTA Section — Premium Card Design ─── */
function LTASection({ hierarchy, kalpit, onFunnelClick }: { hierarchy: any[]; kalpit: any[]; onFunnelClick: (sellers: any[], title: string) => void }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  // Org-level totals
  const allSellersOrg = hierarchy.flatMap(cat => cat.tls.flatMap((t: any) => t.sellers))
  const orgAllotted = allSellersOrg.reduce((s: number, e: any) => s + (e.totalLeads || 0), 0)
  const orgPlanned = allSellersOrg.reduce((s: number, e: any) => s + (e.ltaPlanned || 0), 0)
  const orgActual = allSellersOrg.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
  const orgFulf = orgActual > 0 ? Math.min(100, Math.round((orgAllotted / orgActual) * 100)) : 0
  const orgFulfColor = orgFulf >= 90 ? '#22C55E' : orgFulf >= 70 ? '#EAB308' : '#EF4444'

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Org summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: '#111', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '0.5rem', color: '#5A5650', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Org Planned</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8A8278' }}>{orgPlanned}</div>
        </div>
        <div style={{ width: '1px', height: '36px', background: '#1E1E1E' }} />
        <div>
          <div style={{ fontSize: '0.5rem', color: '#5A5650', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Org Final LTA</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22C55E' }}>{orgActual}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.5rem', color: '#5A5650', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Allotted</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F0EDE8' }}>{orgAllotted}</div>
        </div>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <div style={{ fontSize: '0.55rem', color: '#5A5650', marginBottom: '5px' }}>Overall fulfillment</div>
          <div style={{ height: '5px', background: '#1A1A1A', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${orgFulf}%`, background: orgFulfColor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: '0.5rem', color: orgFulfColor, marginTop: '3px', fontWeight: 700 }}>{orgAllotted} allotted · {orgFulf}%</div>
        </div>
      </div>

      {/* Per-category groups */}
      {hierarchy.map(cat => {
        const catSellers = cat.tls.flatMap((t: any) => t.sellers)
        const catAllotted = catSellers.reduce((s: number, e: any) => s + (e.totalLeads || 0), 0)
        const catPlanned = catSellers.reduce((s: number, e: any) => s + (e.ltaPlanned || 0), 0)
        const catActual = catSellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
        const catFulf = catActual > 0 ? Math.min(100, Math.round((catAllotted / catActual) * 100)) : 0
        const catFulfColor = catFulf >= 90 ? '#22C55E' : catFulf >= 70 ? '#EAB308' : '#EF4444'
        const catKey = cat.category_name
        const isCatExpanded = expandedCat === catKey

        return (
          <div key={catKey} style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: '16px', marginBottom: '12px', overflow: 'hidden' }}>
            {/* Category Header */}
            <div
              onClick={() => setExpandedCat(isCatExpanded ? null : catKey)}
              style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'inline-block', fontSize: '0.6rem', transition: 'transform 0.2s', transform: isCatExpanded ? 'rotate(90deg)' : 'none', color: '#C9A84C' }}>▶</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#C9A84C', marginBottom: '2px' }}>{catKey}</div>
                <div style={{ fontSize: '0.55rem', color: '#5A5650' }}>{cat.tls.length} teams · {catSellers.length} sellers</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.5rem', color: '#5A5650', textTransform: 'uppercase', marginBottom: '2px' }}>Planned → Final</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F0EDE8' }}>
                  <span style={{ color: '#8A8278' }}>{catPlanned}</span>
                  <span style={{ color: '#3A3A3A', margin: '0 4px' }}>→</span>
                  <span style={{ color: '#22C55E' }}>{catActual}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '80px' }}>
                <div style={{ fontSize: '0.5rem', color: '#5A5650', textTransform: 'uppercase', marginBottom: '4px' }}>Fulfillment</div>
                <div style={{ height: '4px', background: '#1A1A1A', borderRadius: '4px', overflow: 'hidden', marginBottom: '3px' }}>
                  <div style={{ height: '100%', width: `${catFulf}%`, background: catFulfColor, borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.55rem', color: catFulfColor, fontWeight: 700 }}>{catFulf}%</div>
              </div>
            </div>

            {/* Expanded: TL cards */}
            {isCatExpanded && (
              <div style={{ borderTop: '1px solid #1A1A1A', padding: '16px 20px' }}>
                <div style={{ fontSize: '0.58rem', color: '#5A5650', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Teams</div>
                {cat.tls.map((tl: any) => {
                  const tlSellers = tl.sellers
                  const tlAllotted = tlSellers.reduce((s: number, e: any) => s + (e.totalLeads || 0), 0)
                  const tlPlanned = tlSellers.reduce((s: number, e: any) => s + (e.ltaPlanned || 0), 0)
                  const tlActual = tlSellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
                  const tlFulf = tlActual > 0 ? Math.min(100, Math.round((tlAllotted / tlActual) * 100)) : 0
                  const tlFulfColor = tlFulf >= 90 ? '#22C55E' : tlFulf >= 70 ? '#EAB308' : '#EF4444'
                  const tlKey = `${catKey}-${tl.tl_name}`
                  const isTlExpanded = expandedTl === tlKey

                  // Compute LTA step values for TL (aggregate of sellers)
                  const tlDynLta = tlSellers.reduce((s: number, e: any) => s + (e.daily_lta?.real_dynamic_lta || 0), 0)
                  const tlHygLta = tlSellers.reduce((s: number, e: any) => s + (e.daily_lta?.hygiene_lta || 0), 0)
                  const tlRev1Lta = tlSellers.reduce((s: number, e: any) => s + (e.daily_lta?.goal_completion_logic_lta || 0), 0)
                  const tlDynLost = tlPlanned - tlDynLta
                  const tlHygLost = tlDynLta - tlHygLta
                  const tlRev1Lost = tlHygLta - tlRev1Lta
                  const tlRev2Lost = tlRev1Lta - tlActual

                  const tlSteps = [
                    { id: 'planned', label: 'Base target', sublabel: 'Monthly goal ÷ working days', value: tlPlanned, color: '#3B82F6', drop: tlDynLost, dropLabel: tlDynLost > 0 ? 'Overallocation' : tlDynLost < 0 ? 'Bonus' : null },
                    { id: 'dynamic', label: 'Dynamic LTA', sublabel: 'Adjusted for overalloc/underalloc', value: tlDynLta, color: '#EAB308', drop: tlHygLost, dropLabel: tlHygLost > 0 ? 'MHE penalty' : tlHygLost < 0 ? 'Bonus' : null },
                    { id: 'hygiene', label: 'After MHE', sublabel: 'Based on MHE', value: tlHygLta, color: '#F97316', drop: tlRev1Lost, dropLabel: tlRev1Lost > 0 ? 'Goal completion' : tlRev1Lost < 0 ? 'Bonus' : null },
                    { id: 'goalComplete', label: 'After Goal Completion', sublabel: 'Adjusted for goal completion', value: tlRev1Lta, color: '#8B5CF6', drop: tlRev2Lost, dropLabel: tlRev2Lost > 0 ? 'Final adjustment' : tlRev2Lost < 0 ? 'Bonus' : null },
                    { id: 'final', label: "Team's final LTA", sublabel: 'Total team lead appetite', value: tlActual, color: '#22C55E', drop: null, dropLabel: null },
                  ]

                  return (
                    <div key={tlKey} style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
                      {/* TL Header */}
                      <div
                        onClick={() => setExpandedTl(isTlExpanded ? null : tlKey)}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ display: 'inline-block', fontSize: '0.55rem', transition: 'transform 0.2s', transform: isTlExpanded ? 'rotate(90deg)' : 'none', color: '#5A5650' }}>▶</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '1px' }}>{tl.tl_name}</div>
                          <div style={{ fontSize: '0.52rem', color: '#5A5650' }}>{tlSellers.length} sellers</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.48rem', color: '#5A5650', textTransform: 'uppercase', marginBottom: '2px' }}>Planned → Final</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F0EDE8' }}>
                            <span style={{ color: '#8A8278' }}>{tlPlanned}</span>
                            <span style={{ color: '#3A3A3A', margin: '0 4px' }}>→</span>
                            <span style={{ color: '#22C55E' }}>{tlActual}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '70px' }}>
                          <div style={{ height: '3px', background: '#1A1A1A', borderRadius: '3px', overflow: 'hidden', marginBottom: '3px' }}>
                            <div style={{ height: '100%', width: `${tlFulf}%`, background: tlFulfColor, borderRadius: '3px' }} />
                          </div>
                          <div style={{ fontSize: '0.52rem', color: tlFulfColor, fontWeight: 700 }}>{tlFulf}% fulfilled</div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); onFunnelClick(tlSellers, tl.tl_name) }}
                          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6', padding: '5px 10px', borderRadius: '6px', fontSize: '0.58rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                        >
                          View Funnel
                        </button>
                      </div>

                      {/* Expanded: Step flow + seller cards */}
                      {isTlExpanded && (
                        <div style={{ borderTop: '1px solid #1A1A1A', padding: '14px 16px' }}>
                          {/* Step flow */}
                          <div style={{ fontSize: '0.55rem', color: '#5A5650', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>How this team's target was calculated</div>
                          <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto', paddingBottom: '12px', marginBottom: '14px' }}>
                            {(() => {
                              const usedSteps = tlSteps.filter((step) => {
                                const isNotUsed = step.id !== 'planned' && step.id !== 'final' &&
                                  kalpit?.find((k: any) => k.name === (step.id === 'goalComplete' ? 'goal' : step.id))?.value === 0;
                                return !isNotUsed;
                              });

                              const actualSteps = usedSteps.map((step, idx, arr) => {
                                if (idx === arr.length - 1) return step;
                                const nextStep = arr[idx + 1];
                                const dropValue = step.value - nextStep.value;
                                let dropLabel = null;
                                if (dropValue > 0) {
                                  if (nextStep.id === 'dynamic') dropLabel = 'Overallocation';
                                  else if (nextStep.id === 'hygiene') dropLabel = 'MHE penalty';
                                  else if (nextStep.id === 'goalComplete') dropLabel = 'Goal completion';
                                  else if (nextStep.id === 'final') dropLabel = 'Final adjustment';
                                } else if (dropValue < 0) {
                                  dropLabel = 'Bonus added';
                                }
                                return { ...step, drop: dropValue, dropLabel };
                              });

                              return actualSteps.map((step, idx) => {
                                return (
                                  <div key={step.label} style={{ display: 'flex', alignItems: 'stretch', minWidth: 0,  }}>
                                    <div style={{ background: '#111', border: `1px solid ${`${step.color}40`}`, borderRadius: '10px', padding: '10px 14px', minWidth: '110px', flexShrink: 0, position: 'relative' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <div style={{ fontSize: '0.52rem', color: step.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{step.label}</div>
                                        
                                      </div>
                                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F0EDE8', lineHeight: 1 }}>{step.value}</div>
                                      <div style={{ fontSize: '0.48rem', color: '#5A5650', marginTop: '3px', lineHeight: 1.3 }}>{step.sublabel}</div>
                                    </div>
                                  {idx < actualSteps.length - 1 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px', minWidth: '52px' }}>
                                      {step.drop !== null && step.drop !== 0 && (
                                        <div style={{ fontSize: '0.52rem', fontWeight: 700, color: step.drop > 0 ? '#EF4444' : '#22C55E', background: step.drop > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', padding: '2px 5px', borderRadius: '5px', marginBottom: '3px', whiteSpace: 'nowrap' }}>
                                          {step.drop > 0 ? `−${step.drop}` : `+${Math.abs(step.drop)}`}
                                        </div>
                                      )}
                                      <div style={{ fontSize: '0.46rem', color: '#4A4642', textAlign: 'center', lineHeight: 1.2, marginBottom: '3px' }}>{step.dropLabel}</div>
                                      <span style={{ color: '#3A3A3A', fontSize: '0.9rem' }}>→</span>
                                    </div>
                                  )}
                                  </div>
                                )
                              });
                            })()}
                          </div>

                          {/* Seller cards */}
                          <div style={{ fontSize: '0.55rem', color: '#5A5650', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Sellers</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                            {tlSellers.map((s: any) => {
                              const sActual = s.ltaActual || 0
                              const sAllotted = s.totalLeads || 0
                              const sPlanned = s.ltaPlanned || 0
                              const sFulf = sActual > 0 ? Math.min(100, Math.round((sAllotted / sActual) * 100)) : 0
                              const lostPct = sPlanned > 0 ? ((sPlanned - sActual) / sPlanned) * 100 : 0
                              const ltaColor = lostPct < 5 ? '#22C55E' : lostPct <= 15 ? '#EAB308' : '#EF4444'
                              const fulfColor = sFulf >= 90 ? '#22C55E' : sFulf >= 70 ? '#EAB308' : '#EF4444'

                              return (
                                <div
                                  key={s.seller_email}
                                  onClick={() => onFunnelClick([s], s.seller_name)}
                                  style={{ background: '#111', border: `1px solid ${s.isAbsent ? 'rgba(239,68,68,0.15)' : '#1A1A1A'}`, borderRadius: '10px', padding: '12px', cursor: 'pointer', opacity: s.isAbsent ? 0.6 : 1, transition: 'border-color 0.2s, background 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#161616'; e.currentTarget.style.borderColor = '#2A2A2A'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.borderColor = s.isAbsent ? 'rgba(239,68,68,0.15)' : '#1A1A1A'; }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#F0EDE8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.seller_name}</div>
                                    {s.isAbsent && <span style={{ fontSize: '0.45rem', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>ABSENT</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                                    <div>
                                      <div style={{ fontSize: '0.45rem', color: '#5A5650', marginBottom: '1px', textTransform: 'uppercase' }}>Planned</div>
                                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#8A8278' }}>{sPlanned}</div>
                                    </div>
                                    <div style={{ color: '#2A2A2A', alignSelf: 'center', fontSize: '0.7rem' }}>→</div>
                                    <div>
                                      <div style={{ fontSize: '0.45rem', color: '#5A5650', marginBottom: '1px', textTransform: 'uppercase' }}>Final</div>
                                      <div style={{ fontSize: '1rem', fontWeight: 800, color: ltaColor }}>{sActual}</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                      <div style={{ fontSize: '0.45rem', color: '#5A5650', marginBottom: '1px', textTransform: 'uppercase' }}>Allotted</div>
                                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#F0EDE8' }}>{sAllotted}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ height: '3px', background: '#1A1A1A', borderRadius: '3px', overflow: 'hidden', marginBottom: '3px' }}>
                                      <div style={{ height: '100%', width: `${Math.min(100, sFulf)}%`, background: fulfColor, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                    </div>
                                    <div style={{ fontSize: '0.46rem', color: '#5A5650' }}>{sFulf}% fulfilled</div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
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
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#A1A1AA', fontSize: '14px', fontStyle: 'italic' }}>
      Data coming soon...
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

function FunnelModal({ title, funnel, kalpit, onClose }: { title: string, funnel: ReturnType<typeof aggregateLtaFunnel>, kalpit: any[], onClose: () => void }) {
  const stages = [
    { 
      id: 'planned', label: 'Base target', sublabel: 'Planned LTA', value: funnel.planned, color: '#3B82F6', 
      drop: funnel.dynLost, dropLabel: funnel.dynLost > 0 ? 'Overallocation' : funnel.dynLost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'dynamic', label: 'Dynamic LTA', sublabel: 'Adjusted for online time', value: funnel.dynLta, color: '#EAB308', 
      drop: funnel.hygLost, dropLabel: funnel.hygLost > 0 ? 'MHE penalty' : funnel.hygLost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'hygiene', label: 'After MHE', sublabel: 'Based on mishandled', value: funnel.hygLta, color: '#F97316', 
      drop: funnel.rev1Lost, dropLabel: funnel.rev1Lost > 0 ? 'Goal completion' : funnel.rev1Lost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'goalComplete', label: 'After Goal Completion', sublabel: 'Adjusted for goal completion', value: funnel.rev1Lta, color: '#8B5CF6', 
      drop: funnel.rev2Lost, dropLabel: funnel.rev2Lost > 0 ? 'Final adjustment' : funnel.rev2Lost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'final', label: "Final target", sublabel: 'Actual LTA', value: funnel.actual, color: '#22C55E', 
      drop: null, dropLabel: null
    },
  ]
  return (
    <div className="la-modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: 'auto', maxWidth: '95vw', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F0EDE8' }}>{title} — LTA Funnel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto', paddingBottom: '4px' }}>
          {(() => {
            const usedSteps = stages.filter((step) => {
              const isNotUsed = step.id !== 'planned' && step.id !== 'final' &&
                kalpit?.find((k: any) => k.name === (step.id === 'goalComplete' ? 'goal' : step.id))?.value === 0;
              return !isNotUsed;
            });

            const actualSteps = usedSteps.map((step, idx, arr) => {
              if (idx === arr.length - 1) return step;
              const nextStep = arr[idx + 1];
              const dropValue = step.value - nextStep.value;
              let dropLabel = null;
              if (dropValue > 0) {
                if (nextStep.id === 'dynamic') dropLabel = 'Overallocation';
                else if (nextStep.id === 'hygiene') dropLabel = 'MHE penalty';
                else if (nextStep.id === 'goalComplete') dropLabel = 'Goal completion';
                else if (nextStep.id === 'final') dropLabel = 'Final adjustment';
              } else if (dropValue < 0) {
                dropLabel = 'Bonus added';
              }
              return { ...step, drop: dropValue, dropLabel };
            });

            return actualSteps.map((step, idx) => {
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
                  <div style={{ background: '#0D0D0D', border: `1px solid ${`${step.color}40`}`, borderRadius: '10px', padding: '10px 14px', minWidth: '100px', flexShrink: 0, position: 'relative' }}>
                    <div style={{ fontSize: '0.55rem', color: step.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{step.label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F0EDE8', lineHeight: 1 }}>{step.value}</div>
                    <div style={{ fontSize: '0.52rem', color: '#5A5650', marginTop: '3px', lineHeight: 1.3 }}>{step.sublabel}</div>
                  </div>
                  {idx < actualSteps.length - 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px', minWidth: '56px' }}>
                      {step.drop !== null && step.drop !== 0 && (
                        <div style={{ fontSize: '0.55rem', fontWeight: 700, color: step.drop > 0 ? '#EF4444' : '#22C55E', background: step.drop > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', padding: '2px 5px', borderRadius: '5px', marginBottom: '3px', whiteSpace: 'nowrap' }}>
                          {step.drop > 0 ? `−${step.drop}` : `+${Math.abs(step.drop)}`}
                        </div>
                      )}
                      <div style={{ fontSize: '0.5rem', color: '#4A4642', textAlign: 'center', lineHeight: 1.2, marginBottom: '3px' }}>{step.dropLabel}</div>
                      <span style={{ color: '#3A3A3A', fontSize: '0.9rem' }}>→</span>
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}

/* ─── MHE Trend Modal (org / TL / seller drill) ─── */
function MheTrendModal({ hierarchy, dateFrom, onClose }: { hierarchy: any[], dateFrom: string, onClose: () => void }) {
  const [drillSeller, setDrillSeller] = useState<any>(null)
  const [expandedCatKey, setExpandedCatKey] = useState<string | null>(null)
  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)
  
  // Canvas Refs for Monthly Breakdown
  const dotChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const allotmentChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paxChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotChartInstance = useRef<any>(null);
  const allotmentChartInstance = useRef<any>(null);
  const paxChartInstance = useRef<any>(null);
  const lostChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lostChartInstance = useRef<any>(null);



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

  const activeSellers = drillSeller ? [drillSeller] : expandedTlKey ? (flatTls.find(t => t.key === expandedTlKey)?.sellers || []) : expandedCatKey ? (hierarchy.find(c => c.category_name === expandedCatKey)?.tls.flatMap((t: any) => t.sellers) || []) : allSellers
  const dayMap = buildDayMap(activeSellers)
  const sortedDays = Object.keys(dayMap).sort()
  const labels = sortedDays.map(d => {
    const dt = new Date(d)
    return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`
  })
  const values = sortedDays.map(d => parseFloat((dayMap[d].sum / dayMap[d].count).toFixed(1)))
  const avg = values.length > 0 ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : 0
  const isGood = avg <= 20

  const title = drillSeller ? `${drillSeller.seller_name} — MHE Trend` : expandedTlKey ? `${flatTls.find(t => t.key === expandedTlKey)?.tl_name} Team — MHE Trend` : expandedCatKey ? `${expandedCatKey} Team — MHE Trend` : 'Org MHE Trend'

  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card wide" onClick={e => e.stopPropagation()}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          {drillSeller && <button className="la-back-btn" onClick={() => setDrillSeller(null)}>← Back</button>}
          <span className="la-modal-dot" style={{ background: isGood ? '#22C55E' : '#EF4444' }} />
          <span className="la-modal-title">{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row' }}>
          <div style={{ flex: 1, minWidth: '400px', height: '260px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #262626', padding: '16px' }}>
            <MheTrendChart labels={labels} values={values} color={isGood ? '#22C55E' : '#EF4444'} />
          </div>
          {(
            <div style={{ width: '260px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #262626' }}>Team Drill-down</div>
              <div className="la-drill-list">
                {hierarchy.map(cat => {
                  const catSellers = cat.tls.flatMap((t: any) => (t.sellers || []))
                  const cCount = catSellers.length
                  let cmSum = 0
                  catSellers.forEach((s: any) => {
                    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                    if (r && typeof r.mishandled_pct === 'number') cmSum += r.mishandled_pct * 100
                  })
                  const catAvg = cCount > 0 ? parseFloat((cmSum / cCount).toFixed(1)) : 0
                  
                  return (
                    <React.Fragment key={cat.category_name}>
                      <div className="la-drill-tl-row" onClick={() => { setExpandedCatKey(expandedCatKey === cat.category_name ? null : cat.category_name); setExpandedTlKey(null) }}>
                        <span style={{ fontWeight: 600, color: '#F0EDE8' }}>{cat.category_name}</span>
                        <span style={{ color: catAvg <= 20 ? '#22C55E' : '#EF4444' }}>{catAvg}%</span>
                      </div>
                      
                      {expandedCatKey === cat.category_name && cat.tls.map((tl: any) => {
                        const tlKey = `${cat.category_name}-${tl.tl_name}`
                        const tlSellers = tl.sellers || []
                        const tCount = tlSellers.length
                        let tmSum = 0
                        tlSellers.forEach((s: any) => {
                          const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                          if (r && typeof r.mishandled_pct === 'number') tmSum += r.mishandled_pct * 100
                        })
                        const tlAvg = tCount > 0 ? parseFloat((tmSum / tCount).toFixed(1)) : 0
                        
                        return (
                          <React.Fragment key={tlKey}>
                            <div className="la-drill-tl-row" style={{ paddingLeft: '24px' }} onClick={() => setExpandedTlKey(expandedTlKey === tlKey ? null : tlKey)}>
                              <span>{tl.tl_name}</span>
                              <span style={{ color: tlAvg <= 20 ? '#22C55E' : '#EF4444' }}>{tlAvg}%</span>
                            </div>
                            
                            {expandedTlKey === tlKey && tl.sellers.map((s: any) => {
                              const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                              const mAvg = r && typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
                              return (
                                <div key={s.seller_email} className="la-drill-seller-row" style={{ paddingLeft: '40px' }} onClick={() => setDrillSeller(s)}>
                                  <span>{s.seller_name}</span>
                                  <span style={{ color: mAvg <= 20 ? '#22C55E' : '#EF4444' }}>{mAvg}%</span>
                                </div>
                              )
                            })}
                          </React.Fragment>
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
  const [expandedCatKey, setExpandedCatKey] = useState<string | null>(null)
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
    const targetDay = parseInt(dateFrom.split('-')[2])
    const maxDay = targetDay <= daysInMonth ? targetDay : daysInMonth
    const padded = []
    for (let i = 1; i <= maxDay; i++) {
      const dStr = `${y}-${mStr}-${String(i).padStart(2, '0')}`
      if (dayMap[dStr]) {
        padded.push({ date: dStr, goalAvg: parseFloat((dayMap[dStr].goalSum / dayMap[dStr].count).toFixed(0)), shbAvg: parseFloat((dayMap[dStr].shbSum / dayMap[dStr].count).toFixed(0)) })
      } else {
        padded.push({ date: dStr, goalAvg: 0, shbAvg: 0 })
      }
    }
    return padded
  }

  const activeSellers = drillSeller ? [drillSeller] : expandedTlKey ? (flatTls.find(t => t.key === expandedTlKey)?.sellers || []) : expandedCatKey ? (hierarchy.find(c => c.category_name === expandedCatKey)?.tls.flatMap((t: any) => t.sellers) || []) : allSellers
  const activeData = buildPadded(activeSellers)
  const labels = activeData.map(d => {
    const labelDateObj = new Date(d.date)
    labelDateObj.setDate(labelDateObj.getDate() - 1)
    return `${labelDateObj.getDate()} ${labelDateObj.toLocaleString('default', { month: 'short' })}`
  })
  const goalValues = activeData.map(d => d.goalAvg)
  const shbValues = activeData.map(d => d.shbAvg)
  const hasData = goalValues.some(v => v > 0) || shbValues.some(v => v > 0)

  const title = drillSeller ? `${drillSeller.seller_name} — Goal vs SHB` : expandedTlKey ? `${flatTls.find(t => t.key === expandedTlKey)?.tl_name} Team — Goal vs SHB` : expandedCatKey ? `${expandedCatKey} Team — Goal vs SHB Trend` : 'Org Goal vs SHB Trend'

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
          {(
            <div style={{ flex: 1, borderLeft: '1px solid #262626', paddingLeft: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px' }}>Team Drill-down</div>
              <div className="la-drill-list">
                {hierarchy.map(cat => {
                  const catSellers = cat.tls.flatMap((t: any) => (t.sellers || []))
                  let cGSum = 0, cSSum = 0, cValidCount = 0
                  catSellers.forEach((s: any) => {
                    const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                    if (r) {
                      cGSum += (r.goal_completion || 0) * 100
                      cSSum += (r.shb_percent || 0) * 100
                      cValidCount++
                    }
                  })
                  const cgAvg = cValidCount > 0 ? parseFloat((cGSum / cValidCount).toFixed(1)) : 0
                  const csAvg = cValidCount > 0 ? parseFloat((cSSum / cValidCount).toFixed(1)) : 0
                  
                  return (
                    <React.Fragment key={cat.category_name}>
                      <div className="la-drill-tl-row" onClick={() => { setExpandedCatKey(expandedCatKey === cat.category_name ? null : cat.category_name); setExpandedTlKey(null) }}>
                        <span style={{ fontWeight: 600, color: '#F0EDE8' }}>{cat.category_name}</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <span style={{ color: '#3B82F6' }}>{cgAvg}%</span>
                          <span style={{ color: '#EAB308' }}>{csAvg}%</span>
                        </div>
                      </div>
                      
                      {expandedCatKey === cat.category_name && cat.tls.map((tl: any) => {
                        const tlKey = `${cat.category_name}-${tl.tl_name}`
                        const tlSellers = tl.sellers || []
                        let gSum = 0, sSum = 0, tValidCount = 0
                        tlSellers.forEach((s: any) => {
                          const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                          if (r) {
                            gSum += (r.goal_completion || 0) * 100
                            sSum += (r.shb_percent || 0) * 100
                            tValidCount++
                          }
                        })
                        const gAvg = tValidCount > 0 ? parseFloat((gSum / tValidCount).toFixed(1)) : 0
                        const sAvg = tValidCount > 0 ? parseFloat((sSum / tValidCount).toFixed(1)) : 0
                        
                        return (
                          <React.Fragment key={tlKey}>
                            <div className="la-drill-tl-row" style={{ paddingLeft: '24px' }} onClick={() => setExpandedTlKey(expandedTlKey === tlKey ? null : tlKey)}>
                              <span>{tl.tl_name}</span>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <span style={{ color: '#3B82F6' }}>{gAvg}%</span>
                                <span style={{ color: '#EAB308' }}>{sAvg}%</span>
                              </div>
                            </div>
                            
                            {expandedTlKey === tlKey && tl.sellers.map((s: any) => {
                              const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                              const mgAvg = r ? parseFloat(((r.goal_completion || 0) * 100).toFixed(1)) : 0
                              const msAvg = r ? parseFloat(((r.shb_percent || 0) * 100).toFixed(1)) : 0
                              return (
                                <div key={s.seller_email} className="la-drill-seller-row" style={{ paddingLeft: '40px' }} onClick={() => setDrillSeller(s)}>
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

function MonthlyBreakdownSection({ hierarchy, onSellerClick }: { hierarchy: any[], onSellerClick: (seller: any) => void }) {
  const [activeCard, setActiveCard] = useState<'dot' | 'allotment' | 'pax' | 'ca' | 'lost' | null>(null)
  const [lostDrilldownView, setLostDrilldownView] = useState<'main'|'others'>('main')
  const [expandedCatKey, setExpandedCatKey] = useState<string | null>(null)
  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)
  
  // ── Enquiry popup state ──
  const [enquiryPopup, setEnquiryPopup] = useState<{ title: string; bucket: string; leads: any[] } | null>(null)
  
  const dotChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const allotmentChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paxChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotChartInstance = useRef<any>(null);
  const allotmentChartInstance = useRef<any>(null);
  const paxChartInstance = useRef<any>(null);
  const lostChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lostChartInstance = useRef<any>(null);
  const flatTls = hierarchy.flatMap(cat => cat.tls.map((tl: any) => ({ ...tl, category_name: cat.category_name, key: `${cat.category_name}-${tl.tl_name}` })))
  const allMembers = flatTls.flatMap(tl => tl.sellers)

  // ── Lost reason helpers ──
  function classifyLead(raw: string): { buckets: Set<string>, otherReasons: Set<string> } {
    const buckets = new Set<string>()
    const otherReasons = new Set<string>()
    const parts = (raw || '').split(',').map(p => p.trim()).filter(p => p)
    
    if (parts.length === 0) {
      buckets.add('Others')
      otherReasons.add('Unknown')
      return { buckets, otherReasons }
    }

    parts.forEach(part => {
      const p = part.toLowerCase()
      if (p.includes('just checking') || p.includes('no firm')) {
        buckets.add('Just Checking')
      } else if (p.includes('customer never responded')) {
        buckets.add('Customer Never Responded')
      } else if (p.includes('not interested')) {
        buckets.add('Not Interested')
      } else if (p.includes('budget issue')) {
        buckets.add('Budget Issue')
      } else {
        buckets.add('Others')
        otherReasons.add(part) // Keep original case for UI display
      }
    })
    
    return { buckets, otherReasons }
  }

  function formatLeadReason(raw: string, bucket: string): string {
    if (!raw) return '-';
    const parts = Array.from(new Set(raw.split(',').map(p => p.trim()).filter(p => p)));
    if (bucket === 'Just Checking') return parts.filter(p => p.toLowerCase().includes('just checking') || p.toLowerCase().includes('no firm')).join(', ');
    if (bucket === 'Customer Never Responded') return parts.filter(p => p.toLowerCase().includes('customer never responded')).join(', ');
    if (bucket === 'Not Interested') return parts.filter(p => p.toLowerCase().includes('not interested')).join(', ');
    if (bucket === 'Budget Issue') return parts.filter(p => p.toLowerCase().includes('budget issue')).join(', ');
    if (bucket === 'Others') return parts.filter(p => {
      const low = p.toLowerCase();
      return !low.includes('just checking') && !low.includes('no firm') && !low.includes('customer never responded') && !low.includes('not interested') && !low.includes('budget issue');
    }).join(', ');
    return parts.filter(p => p === bucket).join(', ');
  }

  function countLeadsByBucket(lostRows: any[], bucket: string): number {
    let c = 0
    lostRows.forEach((lr: any) => { if (classifyLead(lr.lost_reason_details).buckets.has(bucket)) c++ })
    return c
  }

  function getLeadsForBucket(sellers: any[], bucket: string): any[] {
    const leads: any[] = []
    sellers.forEach((m: any) => {
      ;(m.monthly_lost_reasons || []).forEach((lr: any) => {
        if (classifyLead(lr.lost_reason_details).buckets.has(bucket)) {
          leads.push({ ...lr, seller_name: m.seller_name })
        }
      })
    })
    return leads
  }

  function getLeadsForOtherReason(sellers: any[], reason: string): any[] {
    const leads: any[] = []
    sellers.forEach((m: any) => {
      ;(m.monthly_lost_reasons || []).forEach((lr: any) => {
        if (classifyLead(lr.lost_reason_details).otherReasons.has(reason)) {
          leads.push({ ...lr, seller_name: m.seller_name })
        }
      })
    })
    return leads
  }

  const uniqueOthersReasons = new Set<string>();
  allMembers.forEach((m: any) => {
    (m.monthly_lost_reasons || []).forEach((lr: any) => {
      const res = classifyLead(lr.lost_reason_details);
      res.otherReasons.forEach(r => uniqueOthersReasons.add(r));
    });
  });
  const othersReasonColumns = Array.from(uniqueOthersReasons).sort();

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
  const dotColors = ['#FB923C', '#F59E0B', '#EAB308', '#CA8A04', '#D97706', '#EA580C'];
  dotMonthsConfig.forEach((mo, i) => {
    let val = 0
    Object.entries(dotMap).forEach(([k, v]) => { if (k.endsWith('-' + mo.key)) val += v })
    dotChartData.push({ label: mo.label, value: val, color: dotColors[i] || '#F4631E' })
  })
  let futureSum = 0
  Object.entries(dotMap).forEach(([k, v]) => { if (!dotMonthsConfig.some(mo => k.endsWith('-' + mo.key))) futureSum += v })
  dotChartData.push({ label: '6+ Months', value: futureSum, color: '#5A5650' })
  const maxDot = Math.max(...dotChartData.map(d => d.value), 1)

  const allotmentRows = [
    { label: 'Auto Allotted', value: totalAuto, color: '#6366F1' },
    { label: 'Manual Allotted', value: totalManual, color: '#A855F7' },
    { label: 'RTG Leads', value: totalRtg, color: '#F4631E' },
    { label: 'Non-RTG', value: totalNonRtg, color: '#10B981' },
  ]
  const paxRows = [
    { label: '1-pax', value: totalPax1, color: '#E0F2FE' },
    { label: '2-pax', value: totalPax2, color: '#7DD3FC' },
    { label: '3-pax', value: totalPax3, color: '#38BDF8' },
    { label: '4-pax', value: totalPax4, color: '#0EA5E9' },
    { label: '4+ pax', value: totalPax4Plus, color: '#0369A1' },
  ]

  // ── Lost Reasons (5 fixed buckets) ──
  // Per-lead counting: a lead with "Budget Issue, Not interested" counts in BOTH buckets.
  // "Just Checking, no firm plans" counts as ONE bucket (just checking), not two.
  const allLostRows = allMembers.flatMap((m: any) => m.monthly_lost_reasons || [])
  const lostReasonCounts: Record<string, number> = { 'Just Checking': 0, 'Customer Never Responded': 0, 'Not Interested': 0, 'Budget Issue': 0, 'Others': 0 }
  allLostRows.forEach((r: any) => {
    const buckets = classifyLead(r.lost_reason_details).buckets
    buckets.forEach(b => { lostReasonCounts[b] = (lostReasonCounts[b] || 0) + 1 })
  })
  const totalLost = allLostRows.length
  const lostReasonRows = [
    { label: 'Just Checking', value: lostReasonCounts['Just Checking'], color: '#F59E0B' },
    { label: 'Customer Never Responded', value: lostReasonCounts['Customer Never Responded'], color: '#3B82F6' },
    { label: 'Not Interested', value: lostReasonCounts['Not Interested'], color: '#10B981' },
    { label: 'Budget Issue', value: lostReasonCounts['Budget Issue'], color: '#EC4899' },
    { label: 'Others', value: lostReasonCounts['Others'], color: '#8B5CF6' },
  ]

  // DOT Chart
  useEffect(() => {
    if (!dotChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (dotChartInstance.current) dotChartInstance.current.destroy();
      dotChartInstance.current = new Chart(dotChartCanvasRef.current!, {
        type: 'doughnut',
        data: { labels: dotChartData.map((d: any) => d.label.split(' ')[0]), datasets: [{ data: dotChartData.map((d: any) => d.value), backgroundColor: dotChartData.map((d: any) => d.color), borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111111', titleColor: '#FFFFFF', bodyColor: '#E5E7EB', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, cornerRadius: 6,
              callbacks: {
                label: (ctx: any) => {
                  const val = ctx.raw || 0
                  const sum = dotChartData.reduce((s: any, b: any) => s + b.value, 0)
                  const pctVal = sum > 0 ? ((val / sum) * 100).toFixed(0) : '0'
                  return ` ${ctx.label}: ${val} leads (${pctVal}%)`
                }
              }
            }
          }
        }
      })
    })
    return () => { active = false; if (dotChartInstance.current) dotChartInstance.current.destroy(); }
  }, [JSON.stringify(dotChartData)])

  
  // Allotment Bar Chart
  useEffect(() => {
    if (!allotmentChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (allotmentChartInstance.current) allotmentChartInstance.current.destroy();
      
      const config = {
        type: 'bar' as const,
        data: {
          labels: ['Auto', 'Manual', 'RTG', 'Non-RTG'],
          datasets: [{
            data: [
              totalLeads > 0 ? (totalAuto / totalLeads) * 100 : 0,
              totalLeads > 0 ? (totalManual / totalLeads) * 100 : 0,
              totalLeads > 0 ? (totalRtg / totalLeads) * 100 : 0,
              totalLeads > 0 ? (totalNonRtg / totalLeads) * 100 : 0
            ],
            backgroundColor: ['#6366F1', '#A855F7', '#F4631E', '#10B981'],
            borderRadius: 4,
            barThickness: 12
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111111', titleColor: '#FFFFFF', bodyColor: '#E5E7EB', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, cornerRadius: 6,
              callbacks: {
                label: (ctx: any) => {
                  const rawVals = [totalAuto, totalManual, totalRtg, totalNonRtg]
                  const val = rawVals[ctx.dataIndex] || 0
                  const pctVal = ctx.raw ? Number(ctx.raw).toFixed(0) : '0'
                  return ` ${ctx.label}: ${val} (${pctVal}%)`
                }
              }
            }
          },
          scales: {
            x: { ticks: { display: false }, grid: { display: false } },
            y: { 
              max: 100,
              ticks: { 
                color: '#8A8278', font: { size: 9 },
                callback: function(value: any) {
                  return value + '%';
                }
              }, 
              grid: { color: 'rgba(255,255,255,0.03)' } 
            }
          }
        }
      };
      
      allotmentChartInstance.current = new Chart(allotmentChartCanvasRef.current!, config);
    });
    return () => { active = false; if (allotmentChartInstance.current) allotmentChartInstance.current.destroy(); }
  }, [JSON.stringify(allotmentRows)])
  // PAX Chart
  useEffect(() => {
    if (!paxChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (paxChartInstance.current) paxChartInstance.current.destroy();
      paxChartInstance.current = new Chart(paxChartCanvasRef.current!, {
        type: 'doughnut',
        data: { labels: paxRows.map((d: any) => d.label), datasets: [{ data: paxRows.map((d: any) => d.value), backgroundColor: paxRows.map((d: any) => d.color), borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111111', titleColor: '#FFFFFF', bodyColor: '#E5E7EB', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, cornerRadius: 6,
              callbacks: {
                label: (ctx: any) => {
                  const val = ctx.raw || 0
                  const sum = paxRows.reduce((s: any, b: any) => s + b.value, 0)
                  const pctVal = sum > 0 ? ((val / sum) * 100).toFixed(0) : '0'
                  return ` ${ctx.label}: ${val} leads (${pctVal}%)`
                }
              }
            }
          }
        }
      })
    })
    return () => { active = false; if (paxChartInstance.current) paxChartInstance.current.destroy(); }
  }, [JSON.stringify(paxRows)])

  // Lost Reason Chart
  useEffect(() => {
    if (!lostChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (lostChartInstance.current) lostChartInstance.current.destroy();
      lostChartInstance.current = new Chart(lostChartCanvasRef.current!, {
        type: 'doughnut',
        data: { labels: lostReasonRows.map((d: any) => d.label), datasets: [{ data: lostReasonRows.map((d: any) => d.value), backgroundColor: lostReasonRows.map((d: any) => d.color), borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111111', titleColor: '#FFFFFF', bodyColor: '#E5E7EB', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, cornerRadius: 6,
              callbacks: {
                label: (ctx: any) => {
                  const val = ctx.raw || 0
                  const pctVal = totalLost > 0 ? ((val / totalLost) * 100).toFixed(0) : '0'
                  return ` ${ctx.label}: ${val} leads (${pctVal}%)`
                }
              }
            }
          }
        }
      })
    })
    return () => { active = false; if (lostChartInstance.current) lostChartInstance.current.destroy(); }
  }, [JSON.stringify(lostReasonRows)])

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthStr = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`

  const cardBase: React.CSSProperties = { background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', display: 'flex', flexDirection: 'column', height: '360px', cursor: 'pointer' }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div className="la-section-title">Monthly Breakdown · {monthStr}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '14px', marginBottom: '24px' }}>

        {/* ── DOT Bar Chart (Horizontal) ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'dot' ? null : 'dot'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Date-of-travel spread</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={dotChartCanvasRef} /></div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {dotChartData.map((bar, i) => {
              const totalDOT = dotChartData.reduce((s, b) => s + b.value, 0)
              const barPct = totalDOT > 0 ? Math.round((bar.value / totalDOT) * 100) : 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: bar.color }} />
                    <span style={{ color: '#8A8278' }}>{bar.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: bar.value > 0 ? '#F0EDE8' : '#3A3A3A' }}>{bar.value}</span>
                    <span style={{ color: bar.value > 0 ? bar.color : '#3A3A3A', width: '32px', textAlign: 'right' }}>{barPct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Allotment Breakdown ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'allotment' ? null : 'allotment'); setExpandedTlKey(null); }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>How leads were assigned</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={allotmentChartCanvasRef} /></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
            {allotmentRows.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: item.color,
                  background: `${item.color}15`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {totalLeads > 0 ? Math.round((item.value / totalLeads) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAX Distribution ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'pax' ? null : 'pax'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Pax mix across leads</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={paxChartCanvasRef} /></div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {paxRows.map((p, i) => {
              const paxPct = totalPax > 0 ? Math.round((p.value / totalPax) * 100) : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
                    <span style={{ color: '#8A8278' }}>{p.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: p.value > 0 ? '#F0EDE8' : '#3A3A3A' }}>{p.value}</span>
                    <span style={{ color: p.value > 0 ? p.color : '#3A3A3A', width: '32px', textAlign: 'right' }}>{paxPct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── CA Time ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'ca' ? null : 'ca'); setExpandedCatKey(null); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appetite & C→A Time</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Key process metrics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
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

        {/* ── Lost Reason ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'lost' ? null : 'lost'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lost Reasons</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Why leads were lost ({totalLost})</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={lostChartCanvasRef} /></div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {lostReasonRows.map((p, i) => {
              const lostPct = totalLeads > 0 ? Math.round((p.value / totalLeads) * 100) : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <span style={{ color: '#8A8278', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{p.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: p.value > 0 ? '#F0EDE8' : '#3A3A3A' }}>{p.value}</span>
                    <span style={{ color: p.value > 0 ? p.color : '#3A3A3A', width: '24px', textAlign: 'right' }}>{lostPct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {activeCard && (
        <div className="la-modal-overlay" onClick={() => { setActiveCard(null); setExpandedCatKey(null); setExpandedTlKey(null) }}>
          <div className="la-modal-card wide" onClick={e => e.stopPropagation()} style={(typeof lostDrilldownView !== 'undefined' && lostDrilldownView === 'others') ? { width: '95vw', maxWidth: '1600px' } : {}}>
            <button className="la-modal-close" onClick={() => { setActiveCard(null); setExpandedCatKey(null); setExpandedTlKey(null) }}>✕</button>
            <div className="la-modal-title" style={{ marginBottom: '20px' }}>
              {activeCard === 'dot' ? 'DOT Distribution' : activeCard === 'allotment' ? 'Allotment Breakdown' : activeCard === 'ca' ? 'Appetite & C→A Time' : activeCard === 'lost' ? 'Lost Reasons' : 'Leads by Group Size'}
              <span style={{ fontSize: '0.75rem', color: '#8A8278', marginLeft: '8px', fontWeight: 400 }}>· Team Drill-down</span>
            </div>
            <div className="la-table-wrap">
              <table className="la-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Team</th>
                    {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => <th key={mo.key}>{mo.label}</th>)}<th>6+ Months</th></>)
                      : activeCard === 'allotment' ? (<><th>Auto</th><th>Manual</th><th>RTG</th><th>Non-RTG</th></>)
                      : activeCard === 'ca' ? (<><th>Leads Allotted</th><th>Appetite</th><th>Overallocation</th><th>Fulfillment %</th><th>Avg C→A</th></>)
                      : (activeCard === 'lost') && lostDrilldownView === 'main' ? (
                        <>{lostReasonRows.map((r: any) => <th key={r.label} style={{ whiteSpace: 'nowrap', padding: '0 12px', ...(r.label === 'Others' ? {cursor: 'pointer', color: '#8B5CF6', textDecoration: 'underline'} : {}) }} title={r.label} onClick={() => { if(r.label === 'Others') setLostDrilldownView('others'); }}>{r.label}</th>)}</>
                      ) : (activeCard === 'lost') && lostDrilldownView === 'others' ? (
                        <><th style={{ cursor: 'pointer', color: '#8B5CF6', textDecoration: 'underline', whiteSpace: 'nowrap' }} onClick={() => setLostDrilldownView('main')}>← Back</th>{othersReasonColumns.map(reason => <th key={reason} style={{ whiteSpace: 'nowrap', padding: '0 12px' }} title={reason}>{reason}</th>)}</>
                      ) : (<><th>1-pax</th><th>2-pax</th><th>3-pax</th><th>4-pax</th><th>4+ pax</th></>)}
                  </tr>
                </thead>
                                <tbody>
                  {hierarchy.map(cat => {
                    const catKey = cat.category_name
                    const catSellers = cat.tls.flatMap((t: any) => t.sellers)
                    
                    const getCatDot = (key: string) => { let v = 0; Object.entries(catSellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (k.endsWith('-' + key)) v += val }); return v }
                    const getCatFuture = () => { let v = 0; Object.entries(catSellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (!dotMonthsConfig.some(mo => k.endsWith('-' + mo.key))) v += val }); return v }
                    
                    return (
                      <React.Fragment key={catKey}>
                        <tr className="la-cat-row" onClick={() => setExpandedCatKey(expandedCatKey === catKey ? null : catKey)} style={{ cursor: 'pointer', background: expandedCatKey === catKey ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                          <td style={{ fontWeight: 600, color: '#F0EDE8', whiteSpace: 'nowrap' }}>{catKey}</td>
                          {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => <td key={mo.key}>{getCatDot(mo.key)}</td>)}<td>{getCatFuture()}</td></>)
                            : activeCard === 'allotment' ? (<><td>{sumField(catSellers, 'auto_allotted')}</td><td>{sumField(catSellers, 'manual_allotted')}</td><td>{sumField(catSellers, 'rtg_leads')}</td><td>{sumField(catSellers, 'non_rtg_leads')}</td></>)
                            : activeCard === 'ca' ? (() => {
                                const cAllotted = sumField(catSellers, 'total_leads_allotted')
                                const cAppetite = catSellers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0), 0)
                                const cFulf = cAppetite > 0 ? Math.round((cAllotted / cAppetite) * 100) : 0
                                const cCaRows = catSellers.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
                                const cSumCta = cCaRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
                                const cSumLeads = cCaRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0)
                                const cAvgCa = cSumLeads > 0 ? Math.round(cSumCta / cSumLeads) : null
                                const cOverallocation = Math.max(0, cAllotted - cAppetite)
                                return (<><td>{cAllotted}</td><td>{cAppetite}</td><td style={{ color: cOverallocation > 0 ? '#EF4444' : '#5A5650' }}>{cOverallocation}</td><td style={{ color: cFulf >= 90 ? '#22C55E' : cFulf >= 70 ? '#F59E0B' : '#EF4444' }}>{cFulf}%</td><td>{cAvgCa != null ? `${cAvgCa}m` : '—'}</td></>)
                              })()
                            : activeCard === 'lost' && lostDrilldownView === 'main' ? (<>{ lostReasonRows.map((r: any) => {
                                const catLostRows = catSellers.flatMap((m: any) => m.monthly_lost_reasons || []);
                                const count = countLeadsByBucket(catLostRows, r.label);
                                return <td key={r.label} style={{ cursor: 'pointer', textDecoration: count > 0 ? 'underline' : 'none', color: count > 0 ? r.color : undefined }} onClick={e => { e.stopPropagation(); if (count > 0) setEnquiryPopup({ title: `${catKey} — ${r.label}`, bucket: r.label, leads: getLeadsForBucket(catSellers, r.label) }) }}>{count}</td>;
                              })}</>
                            ) : activeCard === 'lost' && lostDrilldownView === 'others' ? (<><td></td>{ othersReasonColumns.map(reason => {
                                const count = catSellers.flatMap((m: any) => m.monthly_lost_reasons || []).filter((lr: any) => { const raw = (lr.lost_reason_details || '').toLowerCase(); return !raw.includes('just checking') && !raw.includes('no firm') && !raw.includes('customer never responded') && !raw.includes('not interested') && !raw.includes('budget issue') && (lr.lost_reason_details || '').split(',').map((p: string) => p.trim()).includes(reason); }).length;
                                return <td key={reason} style={{ color: count > 0 ? '#F9FAFB' : '#3A3A3A', fontWeight: count > 0 ? 600 : 400, cursor: count > 0 ? 'pointer' : 'default', textDecoration: count > 0 ? 'underline' : 'none' }} onClick={e => { e.stopPropagation(); if (count > 0) setEnquiryPopup({ title: `${catKey} — ${reason}`, bucket: reason, leads: getLeadsForOtherReason(catSellers, reason) }) }}>{count}</td>;
                            })}</>
                            ) : (<><td>{sumField(catSellers, 'pax_1')}</td><td>{sumField(catSellers, 'pax_2')}</td><td>{sumField(catSellers, 'pax_3')}</td><td>{sumField(catSellers, 'pax_4')}</td><td>{sumField(catSellers, 'pax_4_plus')}</td></>)}
                        </tr>
                        {expandedCatKey === catKey && cat.tls.map((tl: any) => {
                          const tlKey = `${catKey}-${tl.tl_name}`
                          const getTlDot = (key: string) => { let v = 0; Object.entries(tl.sellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (k.endsWith('-' + key)) v += val }); return v }
                          const getTlFuture = () => { let v = 0; Object.entries(tl.sellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (!dotMonthsConfig.some(mo => k.endsWith('-' + mo.key))) v += val }); return v }
                          
                          return (
                            <React.Fragment key={tlKey}>
                              <tr className="la-tl-row" onClick={() => setExpandedTlKey(expandedTlKey === tlKey ? null : tlKey)} style={{ cursor: 'pointer' }}>
                                <td style={{ paddingLeft: '28px', color: '#D4D4D8', whiteSpace: 'nowrap' }}>↳ {tl.tl_name}</td>
                                {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => <td key={mo.key}>{getTlDot(mo.key)}</td>)}<td>{getTlFuture()}</td></>)
                                  : activeCard === 'allotment' ? (<><td>{sumField(tl.sellers, 'auto_allotted')}</td><td>{sumField(tl.sellers, 'manual_allotted')}</td><td>{sumField(tl.sellers, 'rtg_leads')}</td><td>{sumField(tl.sellers, 'non_rtg_leads')}</td></>)
                                  : activeCard === 'ca' ? (() => {
                                      const tAllotted = sumField(tl.sellers, 'total_leads_allotted')
                                      const tAppetite = tl.sellers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0), 0)
                                      const tFulf = tAppetite > 0 ? Math.round((tAllotted / tAppetite) * 100) : 0
                                      const tCaRows = tl.sellers.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
                                      const tSumCta = tCaRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
                                      const tSumLeads = tCaRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0)
                                      const tAvgCa = tSumLeads > 0 ? Math.round(tSumCta / tSumLeads) : null
                                      const tOverallocation = Math.max(0, tAllotted - tAppetite)
                                      return (<><td>{tAllotted}</td><td>{tAppetite}</td><td style={{ color: tOverallocation > 0 ? '#EF4444' : '#5A5650' }}>{tOverallocation}</td><td style={{ color: tFulf >= 90 ? '#22C55E' : tFulf >= 70 ? '#F59E0B' : '#EF4444' }}>{tFulf}%</td><td>{tAvgCa != null ? `${tAvgCa}m` : '—'}</td></>)
                                    })()
                                  : activeCard === 'lost' && lostDrilldownView === 'main' ? (<>{ lostReasonRows.map((r: any) => {
                                const tlLostRows = tl.sellers.flatMap((m: any) => m.monthly_lost_reasons || []);
                                const count = countLeadsByBucket(tlLostRows, r.label);
                                return <td key={r.label} style={{ cursor: 'pointer', textDecoration: count > 0 ? 'underline' : 'none', color: count > 0 ? r.color : undefined }} onClick={e => { e.stopPropagation(); if (count > 0) setEnquiryPopup({ title: `${tl.tl_name} — ${r.label}`, bucket: r.label, leads: getLeadsForBucket(tl.sellers, r.label) }) }}>{count}</td>;
                               })}</>
                                  ) : activeCard === 'lost' && lostDrilldownView === 'others' ? (<><td></td>{ othersReasonColumns.map(reason => {
                                const count = tl.sellers.flatMap((m: any) => m.monthly_lost_reasons || []).filter((lr: any) => { const raw = (lr.lost_reason_details || '').toLowerCase(); return !raw.includes('just checking') && !raw.includes('no firm') && !raw.includes('customer never responded') && !raw.includes('not interested') && !raw.includes('budget issue') && (lr.lost_reason_details || '').split(',').map((p: string) => p.trim()).includes(reason); }).length;
                                return <td key={reason} style={{ color: count > 0 ? '#F9FAFB' : '#3A3A3A', fontWeight: count > 0 ? 600 : 400, cursor: count > 0 ? 'pointer' : 'default', textDecoration: count > 0 ? 'underline' : 'none' }} onClick={e => { e.stopPropagation(); if (count > 0) setEnquiryPopup({ title: `${tl.tl_name} — ${reason}`, bucket: reason, leads: getLeadsForOtherReason(tl.sellers, reason) }) }}>{count}</td>;
                            })}</>
                                  ) : (<><td>{sumField(tl.sellers, 'pax_1')}</td><td>{sumField(tl.sellers, 'pax_2')}</td><td>{sumField(tl.sellers, 'pax_3')}</td><td>{sumField(tl.sellers, 'pax_4')}</td><td>{sumField(tl.sellers, 'pax_4_plus')}</td></>)}
                              </tr>
                              {expandedTlKey === tlKey && tl.sellers.map((s: any) => {
                                const getSellerFuture = () => { let v = 0; (s.dot_rows || []).forEach((d: any) => { if (!dotMonthsConfig.some(mo => d.dot_month.endsWith('-' + mo.key))) v += d.total_leads_allotted || 0 }); return v }
                                return (
                                  <tr key={s.seller_email} className="la-seller-row" onClick={() => onSellerClick(s)} style={{ cursor: 'pointer' }}>
                                    <td style={{ paddingLeft: '48px', color: '#A1A1AA' }}>{s.seller_name}</td>
                                    {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => { let v = 0; (s.dot_rows || []).forEach((d: any) => { if (d.dot_month.endsWith('-' + mo.key)) v += d.total_leads_allotted || 0 }); return <td key={mo.key}>{v}</td> })}<td>{getSellerFuture()}</td></>)
                                      : activeCard === 'allotment' ? (<><td>{sumField([s], 'auto_allotted')}</td><td>{sumField([s], 'manual_allotted')}</td><td>{sumField([s], 'rtg_leads')}</td><td>{sumField([s], 'non_rtg_leads')}</td></>)
                                      : activeCard === 'ca' ? (() => {
                                          const sAllotted = sumField([s], 'total_leads_allotted')
                                          const sAppetite = (s.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0)
                                          const sFulf = sAppetite > 0 ? Math.round((sAllotted / sAppetite) * 100) : 0
                                          const sCaRows = (s.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
                                          const sSumCta = sCaRows.reduce((s2: number, r: any) => s2 + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
                                          const sSumLeads = sCaRows.reduce((s2: number, r: any) => s2 + r.total_leads_allotted, 0)
                                          const sAvgCa = sSumLeads > 0 ? Math.round(sSumCta / sSumLeads) : null
                                          const sOverallocation = Math.max(0, sAllotted - sAppetite)
                                          return (<><td>{sAllotted}</td><td>{sAppetite}</td><td style={{ color: sOverallocation > 0 ? '#EF4444' : '#5A5650' }}>{sOverallocation}</td><td style={{ color: sFulf >= 90 ? '#22C55E' : sFulf >= 70 ? '#F59E0B' : '#EF4444' }}>{`${sFulf}%`}</td><td>{(sAvgCa != null ? `${sAvgCa}m` : '—')}</td></>)
                                        })()
                                      : activeCard === 'lost' && lostDrilldownView === 'main' ? (<>{ lostReasonRows.map((r: any) => {
                                const sLostRows = s.monthly_lost_reasons || [];
                                const count = countLeadsByBucket(sLostRows, r.label);
                                return <td key={r.label} style={{ cursor: 'pointer', textDecoration: count > 0 ? 'underline' : 'none', color: count > 0 ? r.color : undefined }} onClick={e => { e.stopPropagation(); if (count > 0) setEnquiryPopup({ title: `${s.seller_name} — ${r.label}`, bucket: r.label, leads: getLeadsForBucket([s], r.label) }) }}>{count}</td>;
                               })}</>
                            ) : activeCard === 'lost' && lostDrilldownView === 'others' ? (<><td></td>{ othersReasonColumns.map(reason => {
                                const count = (s.monthly_lost_reasons || []).filter((lr: any) => { const raw = (lr.lost_reason_details || '').toLowerCase(); return !raw.includes('just checking') && !raw.includes('no firm') && !raw.includes('customer never responded') && !raw.includes('not interested') && !raw.includes('budget issue') && (lr.lost_reason_details || '').split(',').map((p: string) => p.trim()).includes(reason); }).length;
                                return <td key={reason} style={{ color: count > 0 ? '#F9FAFB' : '#3A3A3A', fontWeight: count > 0 ? 600 : 400, cursor: count > 0 ? 'pointer' : 'default', textDecoration: count > 0 ? 'underline' : 'none' }} onClick={e => { e.stopPropagation(); if (count > 0) setEnquiryPopup({ title: `${s.seller_name} — ${reason}`, bucket: reason, leads: getLeadsForOtherReason([s], reason) }) }}>{count}</td>;
                            })}</>
                                      ) : (<><td>{sumField([s], 'pax_1')}</td><td>{sumField([s], 'pax_2')}</td><td>{sumField([s], 'pax_3')}</td><td>{sumField([s], 'pax_4')}</td><td>{sumField([s], 'pax_4_plus')}</td></>)}
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
          </div>
        </div>
      )}

      {/* ── Enquiry Popup Modal ── */}
      {enquiryPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.82)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setEnquiryPopup(null)}>
          <div style={{ background: '#1A1A1A', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px', width: '780px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>
            <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#E5E7EB', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', fontSize: '1rem', lineHeight: 1 }} onClick={() => setEnquiryPopup(null)}>✕</button>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '4px' }}>Lost Leads — Enquiry List</div>
            <div style={{ fontSize: '0.75rem', color: '#8A8278', marginBottom: '20px' }}>{enquiryPopup.title} · {enquiryPopup.leads.length} leads</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#111' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#8A8278', fontWeight: 600, borderBottom: '1px solid #222', whiteSpace: 'nowrap' }}>Enquiry ID</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#8A8278', fontWeight: 600, borderBottom: '1px solid #222', whiteSpace: 'nowrap' }}>Seller</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#8A8278', fontWeight: 600, borderBottom: '1px solid #222' }}>Lost Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiryPopup.leads.map((lead: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e1e1e' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {lead.lead_link ? (
                          <a href={lead.lead_link} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'underline', fontWeight: 600 }}>{lead.enquiry_code || '—'}</a>
                        ) : (
                          <span style={{ color: '#8A8278' }}>{lead.enquiry_code || '—'}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#D4D4D8', whiteSpace: 'nowrap' }}>{lead.seller_name || lead.sales_email_id || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#9CA3AF', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.lost_reason_details}>{formatLeadReason(lead.lost_reason_details, enquiryPopup.bucket)}</td>
                    </tr>
                  ))}
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


function NoLeadsModal({ sellers, onClose }: { sellers: any[], onClose: () => void }) {
  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card" onClick={e => e.stopPropagation()} style={{ width: '850px' }}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          <span className="la-modal-title">Sellers without leads</span>
        </div>
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 2fr', gap: '16px', padding: '0 16px', marginBottom: '8px', fontSize: '0.65rem', fontWeight: 600, color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>SELLER NAME</span>
            <span>STATUS</span>
            <span>CATEGORY MANAGER</span>
            <span>TEAM LEAD</span>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {sellers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8A8278', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No sellers without leads!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sellers.map((s, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 2fr', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#F0EDE8', fontWeight: 500 }}>{s.seller_name}</span>
                    <span style={{ color: '#EF4444', fontWeight: 500 }}>{s.status}</span>
                    <span style={{ color: '#8A8278' }}>{s.catName}</span>
                    <span style={{ color: '#F59E0B' }}>{s.tlName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OverallocationModal({ sellers, onClose }: { sellers: any[], onClose: () => void }) {
  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card" onClick={e => e.stopPropagation()} style={{ width: '850px' }}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          <span className="la-modal-title">Overallocated Sellers</span>
        </div>
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 2fr', gap: '16px', padding: '0 16px', marginBottom: '8px', fontSize: '0.65rem', fontWeight: 600, color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>SELLER NAME</span>
            <span>FULFILLMENT %</span>
            <span>ALLOTTED / LTA</span>
            <span>TEAM LEAD</span>
            <span>CATEGORY MANAGER</span>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {sellers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8A8278', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No overallocated sellers!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sellers.map((s, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 2fr', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#F0EDE8', fontWeight: 500 }}>{s.seller_name}</span>
                    <span style={{ color: '#EF4444', fontWeight: 500 }}>{s.pct}%</span>
                    <span style={{ color: '#8A8278' }}>{s.totalLeads} / {s.ltaActual || 0}</span>
                    <span style={{ color: '#F59E0B' }}>{s.tlName}</span>
                    <span style={{ color: '#3B82F6' }}>{s.catName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


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
  const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)
  const [showOverallocationModal, setShowOverallocationModal] = useState(false)

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


  const noLeadsSellers = hierarchy.flatMap((cat: any) =>
    (cat.tls || []).flatMap((tl: any) =>
      (tl.sellers || []).filter((s: any) => s.totalLeads === 0).map((s: any) => {
        let statusStr = '0 Leads';
        if (s.isAbsent) {
          statusStr = 'Absent';
        } else if (!s.orbit?.first_login) {
          statusStr = 'Not Logged in Orbit';
        } else if (!s.cti?.ready_timestamps) {
          statusStr = 'Not Ready on Ozonetel';
        }
        
        return {
          ...s,
          tlName: tl.tl_name,
          catName: cat.category_name,
          status: statusStr
        };
      })
    )
  )

  const overallocatedSellers = hierarchy.flatMap((cat: any) =>
    (cat.tls || []).flatMap((tl: any) =>
      (tl.sellers || []).filter((s: any) => s.totalLeads > (s.ltaActual || 0)).map((s: any) => {
        return {
          ...s,
          tlName: tl.tl_name,
          catName: cat.category_name,
          overallocation: s.totalLeads - (s.ltaActual || 0),
          pct: s.ltaActual > 0 ? Math.round((s.totalLeads / s.ltaActual) * 100) : 0
        };
      })
    )
  )

  const displayDate =  new Date(data.date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

  // MHE Flat Average
  const allSellersForMhe = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
  let mheCount = 0
  let omheSum = 0
  allSellersForMhe.forEach((s: any) => {
    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
    if (r) mheCount += 1
    if (r && typeof r.mishandled_pct === 'number') omheSum += r.mishandled_pct * 100
  })
  const sumFinalLta = hierarchy.reduce((s: number, cat: any) =>
    s + (cat.tls || []).reduce((s2: number, tl: any) =>
      s2 + (tl.sellers || []).reduce((s3: number, seller: any) => {
        return s3 + (seller.ltaActual || 0)
      }, 0)
    , 0)
  , 0)

  let orgTotalAuto = 0
  let orgTotalManual = 0
  let orgTotalRtg = 0
  let orgTotalNonRtg = 0
  let orgTotalLtaPlanned = 0
  let orgTotalLtaActual = 0

  hierarchy.forEach((cat: any) => {
    (cat.tls || []).forEach((tl: any) => {
      (tl.sellers || []).forEach((seller: any) => {
        orgTotalAuto += seller.autoAllotted || 0
        orgTotalManual += seller.manualAllotted || 0
        orgTotalRtg += seller.rtgLeads || 0
        orgTotalNonRtg += seller.nonRtgLeads || 0
        orgTotalLtaPlanned += seller.ltaPlanned || 0
        orgTotalLtaActual += seller.ltaActual || 0
      })
    })
  })

  const computedOrgMhe = mheCount > 0 ? parseFloat((omheSum / mheCount).toFixed(1)) : 0

  // Goal vs SHB (Calculated exactly like the graph trend)
  const allGoalShbSellers = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
  const kpiDayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
  allGoalShbSellers.forEach((m: any) => {
    ;(m.monthly_goal_shb || []).forEach((r: any) => {
      const d = r.date
      if (!d) return
      if (!kpiDayMap[d]) kpiDayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
      kpiDayMap[d].goalSum += typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
      kpiDayMap[d].shbSum += typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
      kpiDayMap[d].count += 1
    })
  })
  const dData = kpiDayMap[dateFrom]
  const computedOrgGoal = dData ? parseFloat((dData.goalSum / dData.count).toFixed(1)) : 0
  const computedOrgShb = dData ? parseFloat((dData.shbSum / dData.count).toFixed(1)) : 0

  return (
    <>
      <style>{CSS}</style>
      <div className="la-page">

        <div className="la-header">
          <h1 className="la-title">
            Lead <span className="la-title-accent">Allocation</span>
          </h1>
          <p className="la-subtitle">
            Operations Head · {selectedCategory} · Today, {displayDate}
          </p>
        </div>

        <div className="la-filters">
          <div className="la-date-row">
            <input type="date" className="la-date-input" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDateTo(e.target.value); }} />
          </div>
          <button className="la-today-btn" onClick={() => { setDateFrom(todayIST); setDateTo(todayIST) }}>Today</button>
        </div>



        <div className="la-kpi-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {/* LEADS ALLOTTED */}
          <div className="la-kpi-card" style={{ flex: 1.5, padding: '16px 20px' }}>
            <div className="la-kpi-bar" style={{ background: '#F4631E' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.07em' }}>Leads Allotted</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>{org.totalLeads?.toLocaleString() || 0}</span>
              <span style={{ fontSize: '1rem', color: '#71717A', fontWeight: 500 }}>/ {sumFinalLta.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auto</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E5E7EB' }}>{orgTotalAuto}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manual</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9CA3AF' }}>{orgTotalManual}</span>
              </div>
            </div>
          </div>

          {/* RTG BREAKDOWN */}
          <div className="la-kpi-card" style={{ flex: 1, padding: '16px 20px' }}>
            <div className="la-kpi-bar" style={{ background: '#378ADD' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.07em' }}>RTG Breakdown</div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>{org.rtgPct}</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F9FAFB', lineHeight: 1 }}>%</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto' }}>
              <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Count</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#378ADD' }}>{orgTotalRtg}</span>
            </div>
          </div>

          {/* SELLERS NO LEADS & OVERALLOCATION */}
          <div
            className="la-kpi-card"
            style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 0 }}
          >
            {/* UPPER HALF: No Leads */}
            <div 
              style={{ flex: 1, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: noLeadsSellers.length > 0 ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}
              onClick={() => { if (noLeadsSellers.length > 0) setShowNoLeadsModal(true); }}
              onMouseEnter={e => { if(noLeadsSellers.length > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="la-kpi-bar" style={{ background: '#EF4444' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', lineHeight: 1.2, letterSpacing: '0.07em' }}>NO LEADS</div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>{noLeadsSellers.length}</div>
            </div>

            {/* LOWER HALF: Overallocation */}
            <div 
              style={{ flex: 1, padding: '12px 16px', cursor: overallocatedSellers.length > 0 ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
              onClick={() => { if (overallocatedSellers.length > 0) setShowOverallocationModal(true); }}
              onMouseEnter={e => { if(overallocatedSellers.length > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#F59E0B', textTransform: 'uppercase', lineHeight: 1.2, letterSpacing: '0.07em' }}>OVERALLOCATED</div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>{overallocatedSellers.length}</div>
            </div>
          </div>

          {/* MHE TREND */}
          <div
            className="la-kpi-card clickable"
            style={{ padding: '16px 20px', flex: 1.2 }}
            onClick={() => setShowMheModal(true)}
          >
            <div className="la-kpi-bar" style={{ background: '#22C55E' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.07em' }}>MHE Trend</div>
              </div>
              <span style={{ fontSize: '0.55rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tap to view ▸</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>{computedOrgMhe}</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F9FAFB', lineHeight: 1 }}>%</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto' }}>
              <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22C55E' }}>20%</span>
            </div>
          </div>

          {/* GOAL VS SHB */}
          <div
            className="la-kpi-card clickable"
            style={{ padding: '16px 20px', flex: 1.5 }}
            onClick={() => setShowGoalShbModal(true)}
          >
            <div className="la-kpi-bar" style={{ background: '#3B82F6' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.07em' }}>Goal vs SHB</div>
                <span style={{ fontSize: '0.55rem', color: '#6B7280', fontStyle: 'italic' }}>· Yesterday</span>
              </div>
              <span style={{ fontSize: '0.55rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tap to view ▸</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>{computedOrgGoal}</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F9FAFB', lineHeight: 1 }}>%</span>
              </div>
              <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>{computedOrgShb}</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F9FAFB', lineHeight: 1 }}>%</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Goal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>SHB</span>
              </div>
            </div>
          </div>
        </div>

        <MonthlyBreakdownSection hierarchy={hierarchy} onSellerClick={setSelectedSellerTimeline} />

        <div className="la-accordion">
<AccordionSection title="LTA — Lead Time Availability" badges={[{ text: `Planned: ${orgTotalLtaPlanned}`, color: 'blue' }, { text: `Actual: ${orgTotalLtaActual}`, color: 'blue' }]}>
            <LTASection hierarchy={hierarchy} kalpit={data?.kalpit || []} onFunnelClick={(sellers, title) => {
              setFunnelTitle(title)
              setFunnelData(aggregateLtaFunnel(sellers))
            }} />
          </AccordionSection>

<AccordionSection title="Auto vs Manual Allotment" badges={[
            { text: `Auto: ${orgTotalAuto}`, color: 'blue' },
            { text: `Manual: ${orgTotalManual}`, color: 'blue' },
            ...(org.manualAllotPct > 20 ? [{ text: `Manual: ${org.manualAllotPct}% — Watch`, color: 'purple' }] : []),
          ]}>
            <AutoManualSection hierarchy={hierarchy} />
          </AccordionSection>

<AccordionSection title="RTG vs Non-RTG" badges={[{ text: `RTG: ${org.rtgPct}%`, color: 'yellow' }, { text: `RTG Count: ${orgTotalRtg}`, color: 'yellow' }, { text: `Non-RTG Count: ${orgTotalNonRtg}`, color: 'yellow' }]}>
            <RTGSection hierarchy={hierarchy} />
          </AccordionSection>

<AccordionSection title="Pax Bifurcation" badges={[{ text: `Avg pax: ${alerts.orgAvgPax}`, color: 'green' }]}>
            <PaxSection hierarchy={hierarchy} />
          </AccordionSection>

<AccordionSection title="Login & Availability" badges={[
            ...(alerts.lateLogins > 0 ? [{ text: `${alerts.lateLogins} late logins`, color: 'yellow' }] : []),
            ...(alerts.absentSellers > 0 ? [{ text: `${alerts.absentSellers} absent`, color: 'red' }] : []),
          ]}>
            <LoginSection hierarchy={hierarchy} onSellerClick={setSelectedSellerTimeline} />
          </AccordionSection>

<AccordionSection title="Break / Unavailability" badges={alerts.longBreakSellers > 0 ? [{ text: `${alerts.longBreakSellers} long breaks`, color: 'yellow' }] : []}>
            <BreakSection hierarchy={hierarchy} />
          </AccordionSection>


<AccordionSection title="First Lead Received Time" badges={alerts.noLeadBefore11AM > 0 ? [{ text: `${alerts.noLeadBefore11AM} sellers no lead before 11AM`, color: 'red' }] : []}>
            <FirstLeadSection hierarchy={hierarchy} />
          </AccordionSection>

<AccordionSection title="Leads in Queue">
            <QueueSection hierarchy={hierarchy} />
          </AccordionSection>

        </div>

        {selectedSellerTimeline && (
          <SellerTimelineModal seller={selectedSellerTimeline} onClose={() => setSelectedSellerTimeline(null)} />
        )}

        {funnelData && (
          <FunnelModal title={funnelTitle || ''} funnel={funnelData} kalpit={data?.kalpit || []} onClose={() => { setFunnelData(null); setFunnelTitle(null) }} />
        )}

        {showMheModal && (
          <MheTrendModal hierarchy={hierarchy} dateFrom={dateFrom} onClose={() => setShowMheModal(false)} />
        )}

        {showNoLeadsModal && <NoLeadsModal sellers={noLeadsSellers} onClose={() => setShowNoLeadsModal(false)} />}
        {showOverallocationModal && <OverallocationModal sellers={overallocatedSellers} onClose={() => setShowOverallocationModal(false)} />}
        {showGoalShbModal && (
          <GoalShbTrendModal hierarchy={hierarchy} dateFrom={dateFrom} onClose={() => setShowGoalShbModal(false)} />
        )}

      </div>
    </>
  )
}