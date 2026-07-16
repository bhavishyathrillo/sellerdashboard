'use client'

import React, { useState, useEffect, useRef } from 'react'
import { UserSession } from '@/lib/session'
import Loader from '@/components/ui/Loader'
import SellerTimelineModal from '@/features/seller/SellerTimelineModal'
import { useCachedFetch } from '@/hooks/useCachedFetch'
import { formatTime, fmtMins, pctOf, extractTimeParts, parseBreaks, computeLtaFunnel, parseLogin, getAvgLoginStr, aggregateLtaFunnel } from "./admin-lta/utils";
import { MheTrendChart, GoalShbTrendChart } from "./admin-lta/LTACharts";
import { FunnelModal, MheTrendModal, GoalShbTrendModal, NoLeadsModal, OverallocationModal } from "./admin-lta/LTAModals";
import { useAdminLTA } from '@/lib/services/apiHooks'
import { AccordionSection, LoginSection, BreakSection, RTGSection, AppetiteSection, PaxSection, DOTSection, AutoManualSection, FirstLeadSection, LTASection, MHESection, GoalSection, QueueSection, MonthlyBreakdownSection, ChevronDown } from "./admin-lta/LTASections";

interface AdminLTAPageProps {
  session: UserSession
}

/* ─── helpers ─── */

interface BreakWindow { startH: number; startM: number; endH: number; endM: number; rawLabel: string }

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
/* ─── Chart: MHE % Trend (line) ─── */
/* ─── Chart: Goal % vs SHB % Trend (bar + line) ─── */
/* ─── Accordion Section ─── */
/* ─── Helper Functions ─── */
/* ─── Section Tables ─── */
/* ─── LTA Section — Premium Card Design ─── */
/* ─── MHE Section ─── */
/* ─── LTA Funnel Modal (team or single seller) ─── */
/* ─── MHE Trend Modal (org / TL / seller drill) ─── */
/* ─── Goal vs SHB Trend Modal ─── */
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
  const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)
  const [showOverallocationModal, setShowOverallocationModal] = useState(false)

  const { data: fetchedData, loading: isFetching } = useAdminLTA(dateFrom, selectedCategory)

  useEffect(() => {
    if (isFetching) {
      setLoading(true)
    } else if (fetchedData) {
      setData(fetchedData)
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [fetchedData, isFetching])

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