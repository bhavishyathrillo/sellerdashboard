'use client'

import React, { useState, useEffect } from 'react'
import { UserSession } from '@/lib/session'
import Loader from '@/components/ui/Loader'

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

/* ─── Filters ─── */
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

/* ─── Org Alerts ─── */
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

/* ─── Accordion ─── */
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

/* ─── Tables ─── */
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

/* ─── Progress bar ─── */
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

/* ─── Section Tables ─── */

// --- Helper Functions ---
function parseLogin(m) {
  if (m.isAbsent || !m.loginTime) return null;
  const match = m.loginTime.match(/(\\d{1,2}):(\\d{2})/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  if (m.loginTime.toLowerCase().includes('pm') && h < 12) h += 12;
  if (m.loginTime.toLowerCase().includes('am') && h === 12) h = 0;
  return h * 60 + min;
}

function getAvgLoginStr(sellers) {
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
  return \`\${String(h12).padStart(2, '0')}:\${String(m).padStart(2, '0')} \${ampm}\`;
}

function formatTime(raw) {
  if (!raw) return '—'
  const match = raw.match(/(\\d{1,2}):(\\d{2})/)
  if (!match) return '—'
  let h = parseInt(match[1], 10)
  const min = parseInt(match[2], 10)
  if (raw.toLowerCase().includes('pm') && h < 12) h += 12
  if (raw.toLowerCase().includes('am') && h === 12) h = 0
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return \`\${h}:\${min.toString().padStart(2, '0')} \${ampm}\`
}

/* ─── Section Tables ─── */

function LoginSection({ hierarchy }: { hierarchy: any[] }) {
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
                  const tlKey = \`\${catKey}-\${tl.tl_name}\`

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
                        <tr key={s.seller_email} className={\`la-seller-row \${s.isAbsent ? 'la-row-absent' : ''}\`}>
                          <td style={{ paddingLeft: '56px' }}>
                            {s.seller_name}
                            {s.isAbsent && <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Absent</span>}
                          </td>
                          <td>{s.isAbsent ? '—' : formatTime(s.loginTime)}</td>
                          <td style={{ color: s.breakTotalMins > 75 ? '#EF4444' : 'inherit' }}>{s.isAbsent ? '—' : \`\${s.breakTotalMins}m\`}</td>
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
            <th>Total Leads Allotted</th>
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
            const pct = total > 0 ? Math.round((totalRtg / total) * 100) : 0
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                    <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedCat === catKey ? 'rotate(90deg)' : 'none' }}>▶</span>
                    {catKey}
                  </td>
                  <td>{total}</td>
                  <td>{totalRtg}</td>
                  <td>{totalNonRtg}</td>
                  <td style={{ fontWeight: 600 }}>{pct}%</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlRtg = tl.sellers.reduce((s: number, e: any) => s + e.rtgLeads, 0)
                  const tlNonRtg = tl.sellers.reduce((s: number, e: any) => s + e.nonRtgLeads, 0)
                  const tlTotal = tlRtg + tlNonRtg
                  const tlPct = tlTotal > 0 ? Math.round((tlRtg / tlTotal) * 100) : 0
                  const tlKey = \`\${catKey}-\${tl.tl_name}\`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px', color: '#E5E5E5', fontWeight: 600 }}>
                          <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTl === tlKey ? 'rotate(90deg)' : 'none', color: '#8A8278' }}>▶</span>
                          {tl.tl_name}
                        </td>
                        <td>{tlTotal}</td>
                        <td>{tlRtg}</td>
                        <td>{tlNonRtg}</td>
                        <td style={{ fontWeight: 600 }}>{tlPct}%</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.map((s: any) => {
                        const sTotal = s.rtgLeads + s.nonRtgLeads
                        const sPct = sTotal > 0 ? Math.round((s.rtgLeads / sTotal) * 100) : 0
                        return (
                          <tr key={s.seller_email} className={\`la-seller-row \${s.isAbsent ? 'la-row-absent' : ''}\`}>
                            <td style={{ paddingLeft: '56px' }}>
                              {s.seller_name}
                              {s.isAbsent && <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Absent</span>}
                            </td>
                            <td>{sTotal}</td>
                            <td>{s.rtgLeads}</td>
                            <td>{s.nonRtgLeads}</td>
                            <td style={{ fontWeight: 600 }}>{sPct}%</td>
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

function LTASection({ hierarchy }: { hierarchy: any[] }) {
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
                      {expandedTl === tlKey && tl.sellers.map((s: any) => {
                        const sLost = s.ltaPlanned - s.ltaActual
                        const sPct = s.ltaPlanned > 0 ? ((sLost / s.ltaPlanned) * 100).toFixed(1) : '0.0'
                        return (
                          <tr key={s.seller_email} className="la-seller-row">
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

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AdminLTAPage({ session }: AdminLTAPageProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All Categories')

  // IST date
  const todayIST = new Date(Date.now() + 19800000).toISOString().split('T')[0]
  const [dateFrom, setDateFrom] = useState(todayIST)
  const [dateTo, setDateTo] = useState(todayIST)

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

  // Format date for display
  const displayDate = new Date(data.date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  return (
    <>
      <style>{CSS}</style>
      <div className="la-page">

        {/* ─── Header ─── */}
        <div className="la-header">
          <h1 className="la-title">
            Lead <span className="la-title-accent">Allocation</span> — Admin view
          </h1>
          <p className="la-subtitle">
            Operations Head · {selectedCategory} · Today, {displayDate}
          </p>
        </div>

        {/* ─── Filters ─── */}
        <div className="la-filters">
          <select
            className="la-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {allCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="la-date-row">
            <input
              type="date"
              className="la-date-input"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                if (e.target.value > dateTo) setDateTo(e.target.value)
              }}
            />
          </div>

          <span style={{ color: '#5A5650', fontSize: '0.75rem', alignSelf: 'center' }}>to</span>

          <div className="la-date-row">
            <input
              type="date"
              className="la-date-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <button
            className="la-today-btn"
            onClick={() => {
              setDateFrom(todayIST)
              setDateTo(todayIST)
            }}
          >
            Today
          </button>
        </div>

        {/* ─── Org-Level Alerts ─── */}
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

          <div className="la-kpi-card">
            <div className="la-kpi-label">Org MHE %</div>
            <div className="la-kpi-value" style={{ color: '#22C55E' }}>{org.mhePct}%</div>
            <div className="la-kpi-sub">Lower = better</div>
          </div>
        </div>

        {/* ─── Accordion Sections ─── */}
        <div className="la-accordion">
          {/* 3.1 Login & Availability */}
          <AccordionSection
            number="3.1"
            title="Login & Availability"
            badges={[
              ...(alerts.lateLogins > 0 ? [{ text: `${alerts.lateLogins} late logins`, color: 'yellow' }] : []),
              ...(alerts.absentSellers > 0 ? [{ text: `${alerts.absentSellers} absent`, color: 'red' }] : []),
            ]}
          >
            <LoginSection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.2 Break / Unavailability */}
          <AccordionSection
            number="3.2"
            title="Break / Unavailability"
            badges={alerts.longBreakSellers > 0 ? [{ text: `${alerts.longBreakSellers} long breaks`, color: 'yellow' }] : []}
          >
            <BreakSection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.3 RTG vs Non-RTG */}
          <AccordionSection
            number="3.3"
            title="RTG vs Non-RTG"
            badges={[{ text: `Org RTG: ${org.rtgPct}%`, color: 'yellow' }]}
          >
            <RTGSection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.4 Appetite Fulfillment (C→A) */}
          <AccordionSection
            number="3.4"
            title="Appetite Fulfillment (C→A)"
            badges={[{ text: `Org 3PM: ${alerts.orgAppetitePct}%`, color: 'yellow' }]}
          >
            <AppetiteSection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.5 Pax Bifurcation */}
          <AccordionSection
            number="3.5"
            title="Pax Bifurcation"
            badges={[{ text: `Org avg pax: ${alerts.orgAvgPax}`, color: 'green' }]}
          >
            <PaxSection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.6 DOT Month Distribution */}
          <AccordionSection number="3.6" title="DOT Month Distribution">
            <DOTSection dotDistribution={data.dotDistribution || []} />
          </AccordionSection>

          {/* 3.7 Auto vs Manual Allotment */}
          <AccordionSection
            number="3.7"
            title="Auto vs Manual Allotment"
            badges={[
              { text: 'Admin only', color: 'blue' },
              ...(org.manualAllotPct > 20 ? [{ text: `Manual: ${org.manualAllotPct}% — Watch`, color: 'purple' }] : []),
            ]}
          >
            <AutoManualSection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.8 First Lead Received Time */}
          <AccordionSection
            number="3.8"
            title="First Lead Received Time"
            badges={alerts.noLeadBefore11AM > 0 ? [{ text: `${alerts.noLeadBefore11AM} sellers no lead before 11AM`, color: 'red' }] : []}
          >
            <FirstLeadSection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.9 LTA — Lead Time Availability */}
          <AccordionSection number="3.9" title="LTA — Lead Time Availability">
            <LTASection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.10 MHE — Mishandled % */}
          <AccordionSection
            number="3.10"
            title="MHE — Mishandled %"
            badges={[
              { text: `Org avg: ${org.mhePct}%`, color: 'green' },
            ]}
          >
            <MHESection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.11 Goal % Achievement Trend */}
          <AccordionSection
            number="3.11"
            title="Goal % Achievement Trend"
            badges={alerts.categoriesAtRisk > 0 ? [{ text: `${alerts.categoriesAtRisk} categories at risk`, color: 'red' }] : []}
          >
            <GoalSection hierarchy={hierarchy} />
          </AccordionSection>

          {/* 3.12 Leads in Queue */}
          <AccordionSection number="3.12" title="Leads in Queue">
            <QueueSection hierarchy={hierarchy} />
          </AccordionSection>
        </div>

      </div>
    </>
  )
}
