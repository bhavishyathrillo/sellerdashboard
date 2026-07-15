import React, { useState, useEffect, useRef } from 'react';
import { formatTime, fmtMins, pctOf, parseBreaks, computeLtaFunnel, parseLogin, getAvgLoginStr } from './utils';
import { FunnelModal, MheTrendModal, GoalShbTrendModal, NoLeadsModal, OverallocationModal } from './LTAModals';
import { MheTrendChart, GoalShbTrendChart } from './LTACharts';

export function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

export function AccordionSection({
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

export function LoginSection({ hierarchy, onSellerClick }: { hierarchy: any[], onSellerClick: (seller: any) => void }) {
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

export function BreakSection({ hierarchy }: { hierarchy: any[] }) {
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

export function RTGSection({ hierarchy }: { hierarchy: any[] }) {
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

export function AppetiteSection({ hierarchy }: { hierarchy: any[] }) {
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

export function PaxSection({ hierarchy }: { hierarchy: any[] }) {
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

export function DOTSection({ dotDistribution }: { dotDistribution: any[] }) {
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

export function AutoManualSection({ hierarchy }: { hierarchy: any[] }) {
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

export function FirstLeadSection({ hierarchy }: { hierarchy: any[] }) {
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

export function LTASection({ hierarchy, kalpit, onFunnelClick }: { hierarchy: any[]; kalpit: any[]; onFunnelClick: (sellers: any[], title: string) => void }) {
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

export function MHESection({ hierarchy }: { hierarchy: any[] }) {
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

export function GoalSection({ hierarchy }: { hierarchy: any[] }) {
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

export function QueueSection({ hierarchy }: { hierarchy: any[] }) {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#A1A1AA', fontSize: '14px', fontStyle: 'italic' }}>
      Data coming soon...
    </div>
  )
}

export function MonthlyBreakdownSection({ hierarchy, onSellerClick }: { hierarchy: any[], onSellerClick: (seller: any) => void }) {
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

