'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { UserSession } from '@/lib/session'
import styles from './QBStatsPage.module.css'

interface Enquiry {
  code: string
  feasibilityStatus: 'Passed' | 'Failed'
  leadStatus: 'Open' | 'Lost' | 'Won'
}

interface SellerQbData {
  seller_name: string
  seller_email: string
  sent: number
  passed: number
  won: number
  lost: number
  stuck: number
  passRate: number
  enquiries: Enquiry[]
  l1_email?: string
  l1_name?: string
  l2_email?: string
  l2_name?: string
}

type BucketKey = 'po' | 'npo' | 'pl' | 'npl'

const BUCKET_CONFIG = [
  { key: 'po' as BucketKey, label: 'PASSED & OPEN', color: '#22C55E', cssClass: styles.bucketPO, barColor: '#22C55E' },
  { key: 'npo' as BucketKey, label: 'NOT PASSED & OPEN', color: '#F97316', cssClass: styles.bucketNPO, barColor: '#F97316' },
  { key: 'pl' as BucketKey, label: 'PASSED & LOST', color: '#9CA3AF', cssClass: styles.bucketPL, barColor: '#6B7280' },
  { key: 'npl' as BucketKey, label: 'NOT PASSED & LOST', color: '#EC4899', cssClass: styles.bucketNPL, barColor: '#EC4899' },
]

const CM_COLORS = ['#F4631E', '#C9A84C', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#06B6D4', '#84CC16', '#F59E0B']

function getEnqBucket(enq: Enquiry): BucketKey | null {
  if (enq.feasibilityStatus === 'Passed' && enq.leadStatus === 'Open') return 'po'
  if (enq.feasibilityStatus === 'Failed' && enq.leadStatus === 'Open') return 'npo'
  if (enq.feasibilityStatus === 'Passed' && enq.leadStatus === 'Lost') return 'pl'
  if (enq.feasibilityStatus === 'Failed' && enq.leadStatus === 'Lost') return 'npl'
  return null
}

function bucketCounts(enquiries: Enquiry[]) {
  return { po: enquiries.filter(e => getEnqBucket(e) === 'po').length, npo: enquiries.filter(e => getEnqBucket(e) === 'npo').length, pl: enquiries.filter(e => getEnqBucket(e) === 'pl').length, npl: enquiries.filter(e => getEnqBucket(e) === 'npl').length }
}

function initials(name: string) { return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) }
function avatarColor(name: string) { const colors = ['#F4631E', '#C9A84C', '#22C55E', '#3B82F6', '#A855F7', '#EC4899']; let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash); return colors[Math.abs(hash) % colors.length] }

function pillStyle(bg: string, color: string): React.CSSProperties {
  return { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 600, background: bg, color, border: '1px solid ' + color + '33', whiteSpace: 'nowrap' }
}

const selectStyle: React.CSSProperties = { padding: '8px 12px', background: '#141414', border: '1px solid #232323', borderRadius: '10px', color: '#F0EDE8', fontSize: '0.75rem', outline: 'none', cursor: 'pointer', minWidth: 160 }
const alignedCell: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }
const nameStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.78rem', color: '#F0EDE8', whiteSpace: 'nowrap', minWidth: 140 }
const countStyle: React.CSSProperties = { fontSize: '0.65rem', color: '#8A8278', whiteSpace: 'nowrap', minWidth: 70, textAlign: 'left' as const }
const pillWrap: React.CSSProperties = { display: 'flex', gap: 5, whiteSpace: 'nowrap' }
function KpiCards({ data }: { data: SellerQbData }) {
  const pr = data.sent > 0 ? Math.round((data.passed / data.sent) * 100) : 0
  const wp = data.passed > 0 ? Math.round((data.won / data.passed) * 100) : 0
  return React.createElement('div', { className: styles.kpiRow },
    React.createElement('div', { className: styles.kpiCard }, React.createElement('div', { className: styles.kpiBar, style: { background: '#F4631E' } }), React.createElement('div', { className: styles.kpiLabel }, 'Sent to Feasibility'), React.createElement('div', { className: styles.kpiValue, style: { color: '#F4631E' } }, data.sent), React.createElement('div', { className: styles.kpiSub }, 'This month')),
    React.createElement('div', { className: styles.kpiCard }, React.createElement('div', { className: styles.kpiBar, style: { background: '#C9A84C' } }), React.createElement('div', { className: styles.kpiLabel }, 'Feasibility Passed'), React.createElement('div', { className: styles.kpiValue, style: { color: '#C9A84C' } }, data.passed), React.createElement('span', { className: styles.kpiPill, style: { background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' } }, pr + '% Pass Rate')),
    React.createElement('div', { className: styles.kpiCard }, React.createElement('div', { className: styles.kpiBar, style: { background: '#22C55E' } }), React.createElement('div', { className: styles.kpiLabel }, 'Passed & Won'), React.createElement('div', { className: styles.kpiValue, style: { color: '#22C55E' } }, data.won), React.createElement('span', { className: styles.kpiPill, style: { background: 'rgba(34,197,94,0.12)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.2)' } }, wp + '% Won')),
    React.createElement('div', { className: styles.kpiCard }, React.createElement('div', { className: styles.kpiBar, style: { background: '#F4631E' } }), React.createElement('div', { className: styles.kpiLabel }, 'Pass Rate'), React.createElement('div', { className: styles.kpiValue, style: { color: '#F4631E' } }, pr + '%'), React.createElement('div', { className: styles.kpiSub }, data.passed + ' of ' + data.sent))
  )
}

function BucketCards(props: { enquiries: Enquiry[]; activeBuckets: Set<BucketKey>; onToggle: (key: BucketKey) => void }) {
  const { enquiries, activeBuckets, onToggle } = props
  const counts = bucketCounts(enquiries)
  const items = BUCKET_CONFIG.map(function (b) {
    const isActive = activeBuckets.has(b.key)
    const cardClass = styles.bucketCard + ' ' + b.cssClass + ' ' + (isActive ? styles.bucketCardActive : '')
    return React.createElement('div', { key: b.key, className: cardClass, onClick: function () { onToggle(b.key) } },
      React.createElement('div', { className: styles.bucketTopBar, style: { background: b.barColor } }),
      React.createElement('span', { className: styles.bucketIcon, style: { color: b.color, fontSize: 16 } }, '●'),
      React.createElement('div', { className: styles.bucketLabel }, b.label),
      React.createElement('div', { className: styles.bucketCount }, counts[b.key])
    )
  })
  return React.createElement('div', { className: styles.bucketRow }, items)
}

function EnqTable({ enquiries, activeBuckets }: { enquiries: Enquiry[]; activeBuckets: Set<BucketKey> }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => enquiries.filter(e => { if (activeBuckets.size > 0 && !activeBuckets.has(getEnqBucket(e)!)) return false; if (search && !e.code.toLowerCase().includes(search.toLowerCase())) return false; return true }), [enquiries, activeBuckets, search])
  return React.createElement('div', { className: styles.tableSection },
    React.createElement('div', { className: styles.tableToolbar },
      React.createElement('div', { className: styles.searchPill }, React.createElement('span', { className: styles.searchIcon }, '🔍'), React.createElement('input', { type: 'text', placeholder: 'Search ENQ code...', value: search, onChange: function (e: any) { setSearch(e.target.value) } })),
      React.createElement('span', { className: styles.rowCount }, filtered.length + ' of ' + enquiries.length),
      (activeBuckets.size > 0 || search) && React.createElement('button', { className: styles.clearBtn, onClick: function () { setSearch('') } }, 'Clear ×')
    ),
    React.createElement('div', { className: styles.hintRow }, activeBuckets.size === 0 ? (search ? 'Filtering: "' + search + '"' : 'Showing all') : 'Filtering: ' + BUCKET_CONFIG.filter(b => activeBuckets.has(b.key)).map(b => b.label).join(', ')),
    filtered.length === 0 ? React.createElement('div', { className: styles.emptyState }, 'No enquiries') : React.createElement('table', { className: styles.enqTable },
      React.createElement('thead', null, React.createElement('tr', null, React.createElement('th', null, 'Enquiry Code'), React.createElement('th', null, 'Feasibility'), React.createElement('th', null, 'Lead Status'))),
      React.createElement('tbody', null, filtered.map(function (e) {
        return React.createElement('tr', { key: e.code },
          React.createElement('td', null, React.createElement('a', { className: styles.enqCode, href: 'https://admin.thrillophilia.com/admin/1/enquiries?code=' + e.code, target: '_blank', rel: 'noreferrer' }, e.code)),
          React.createElement('td', null, React.createElement('span', { className: styles.pill + ' ' + (e.feasibilityStatus === 'Passed' ? styles.pillPass : styles.pillFail) }, e.feasibilityStatus)),
          React.createElement('td', null, React.createElement('span', { className: styles.pill + ' ' + (e.leadStatus === 'Open' ? styles.pillOpen : e.leadStatus === 'Won' ? styles.pillWon : styles.pillLost) }, e.leadStatus))
        )
      }))
    )
  )
}

function SellerView({ data }: { data: SellerQbData }) {
  const [activeBuckets, setActiveBuckets] = useState<Set<BucketKey>>(new Set())
  const toggle = (key: BucketKey) => setActiveBuckets(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })
  return React.createElement(React.Fragment, null,
    React.createElement(KpiCards, { data: data }),
    React.createElement(BucketCards, { enquiries: data.enquiries, activeBuckets: activeBuckets, onToggle: toggle }),
    React.createElement(EnqTable, { enquiries: data.enquiries, activeBuckets: activeBuckets })
  )
}

function DrillDownOverlay({ breadcrumb, onBack, sellerName, sellerEmail, children }: { breadcrumb: string[]; onBack: () => void; sellerName: string; sellerEmail: string; children: React.ReactNode }) {
  const color = avatarColor(sellerName)
  return React.createElement('div', { style: { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#0a0a0a', animation: 'slideIn 0.2s ease-out' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #1a1a1a', background: '#0d0d0d', flexShrink: 0 } },
      React.createElement('button', { onClick: onBack, style: { background: 'none', border: 'none', color: '#F4631E', fontSize: '1.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 } }, '‹'),
      React.createElement('span', { className: styles.avatar, style: { background: color + '22', color: color, width: 36, height: 36, fontSize: 14 } }, initials(sellerName)),
      React.createElement('div', { style: { flex: 1 } }, React.createElement('div', { style: { fontWeight: 700, fontSize: '0.95rem', color: '#F0EDE8' } }, sellerName), React.createElement('div', { style: { fontSize: '0.65rem', color: '#8A8278' } }, sellerEmail + ' · QB Stats'))
    ),
    React.createElement('div', { style: { flex: 1, overflow: 'auto', padding: 20 } }, React.createElement('div', { style: { marginBottom: 8 } }, React.createElement('span', { style: { fontSize: '0.65rem', color: '#5A5650' } }, breadcrumb.join(' › '))), children),
    React.createElement('style', null, '@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}')
  )
}

function SelectDropdown({ options, value, onChange, placeholder, color }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void; placeholder: string; color?: string }) {
  return React.createElement('select', { value: value, onChange: function (e: any) { onChange(e.target.value) }, style: { ...selectStyle, borderColor: color || '#232323' } },
    React.createElement('option', { value: '' }, placeholder),
    options.map(function (o) { return React.createElement('option', { key: o.value, value: o.value }, o.label) })
  )
} function TeamSummaryTable({ sellers, onSellerClick }: { sellers: SellerQbData[]; onSellerClick: (seller: SellerQbData) => void }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => sellers.filter(s => !search || s.seller_name.toLowerCase().includes(search.toLowerCase()) || s.enquiries.some(e => e.code.toLowerCase().includes(search.toLowerCase()))), [sellers, search])
  return React.createElement('div', { className: styles.tableSection },
    React.createElement('div', { className: styles.tableToolbar },
      React.createElement('div', { className: styles.searchPill }, React.createElement('span', { className: styles.searchIcon }, '🔍'), React.createElement('input', { type: 'text', placeholder: 'Search ENQ or seller...', value: search, onChange: function (e: any) { setSearch(e.target.value) } })),
      React.createElement('span', { className: styles.rowCount }, filtered.length + ' of ' + sellers.length),
      search && React.createElement('button', { className: styles.clearBtn, onClick: function () { setSearch('') } }, 'Clear ×')
    ),
    React.createElement('table', { className: styles.summaryTable },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', null, 'Seller'),
        React.createElement('th', { className: styles.numCol, style: { color: '#22C55E' } }, 'Passed & Open'),
        React.createElement('th', { className: styles.numCol, style: { color: '#F97316' } }, 'Not Passed & Open'),
        React.createElement('th', { className: styles.numCol, style: { color: '#9CA3AF' } }, 'Passed & Lost'),
        React.createElement('th', { className: styles.numCol, style: { color: '#EC4899' } }, 'Not Passed & Lost')
      )),
      React.createElement('tbody', null,
        filtered.map(function (s) {
          var counts = bucketCounts(s.enquiries); var color = avatarColor(s.seller_name)
          var pr = s.sent > 0 ? Math.round((s.passed / s.sent) * 100) : 0; var wp = s.passed > 0 ? Math.round((s.won / s.passed) * 100) : 0
          return React.createElement('tr', { key: s.seller_email, onClick: function () { onSellerClick(s) }, style: { cursor: 'pointer' } },
            React.createElement('td', null, React.createElement('div', { style: alignedCell },
              React.createElement('span', { className: styles.avatar, style: { background: color + '22', color: color, width: 26, height: 26, fontSize: 10, flexShrink: 0 } }, initials(s.seller_name)),
              React.createElement('span', { style: nameStyle }, s.seller_name),
              React.createElement('span', { style: countStyle }, s.sent + ' sent'),
              React.createElement('span', { style: pillWrap },
                React.createElement('span', { style: pillStyle('rgba(201,168,76,0.12)', '#C9A84C') }, pr + '% Pass Rate'),
                React.createElement('span', { style: pillStyle('rgba(34,197,94,0.12)', '#4ADE80') }, wp + '% Won')
              )
            )),
            React.createElement('td', { className: styles.numCell + ' ' + styles.numCellPO, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.po),
            React.createElement('td', { className: styles.numCell + ' ' + styles.numCellNPO, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.npo),
            React.createElement('td', { className: styles.numCell + ' ' + styles.numCellPL, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.pl),
            React.createElement('td', { className: styles.numCell + ' ' + styles.numCellNPL, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.npl)
          )
        }),
        filtered.length === 0 && React.createElement('tr', null, React.createElement('td', { colSpan: 5, className: styles.emptyState }, 'No sellers found'))
      )
    )
  )
}

function TeamEnqTable({ sellers, activeBuckets, onClearBuckets, showCmCol }: { sellers: SellerQbData[]; activeBuckets: Set<BucketKey>; onClearBuckets?: () => void; showCmCol?: boolean }) {
  const [search, setSearch] = useState('')
  const allEnq = useMemo(() => sellers.flatMap(s => s.enquiries.map(e => ({ ...e, sellerName: s.seller_name, sellerEmail: s.seller_email, l1Name: s.l2_name || '', cmName: s.l1_name || '' }))), [sellers])
  const filtered = useMemo(() => allEnq.filter(e => { if (activeBuckets.size > 0 && !activeBuckets.has(getEnqBucket(e)!)) return false; if (search && !e.code.toLowerCase().includes(search.toLowerCase()) && !e.sellerName.toLowerCase().includes(search.toLowerCase()) && !e.l1Name.toLowerCase().includes(search.toLowerCase()) && !e.cmName.toLowerCase().includes(search.toLowerCase())) return false; return true }), [allEnq, activeBuckets, search])
  const handleClear = () => { setSearch(''); if (onClearBuckets) onClearBuckets() }
  const showExtraCols = activeBuckets.size > 0; const hasFilters = activeBuckets.size > 0 || search
  const showCmColumn = !!(showCmCol && showExtraCols); const showL1Column = showExtraCols
  return React.createElement('div', { className: styles.tableSection },
    React.createElement('div', { className: styles.tableToolbar },
      React.createElement('div', { className: styles.searchPill }, React.createElement('span', { className: styles.searchIcon }, '🔍'), React.createElement('input', { type: 'text', placeholder: 'Search ENQ, seller, or manager...', value: search, onChange: function (e: any) { setSearch(e.target.value) } })),
      React.createElement('span', { className: styles.rowCount }, filtered.length + ' of ' + allEnq.length),
      hasFilters && React.createElement('button', { className: styles.clearBtn, onClick: handleClear }, 'Clear ×')
    ),
    React.createElement('div', { className: styles.hintRow }, activeBuckets.size === 0 ? (search ? 'Filtering: "' + search + '"' : 'Showing all') : 'Filtering: ' + BUCKET_CONFIG.filter(b => activeBuckets.has(b.key)).map(b => b.label).join(', ')),
    filtered.length === 0 ? React.createElement('div', { className: styles.emptyState }, 'No enquiries') : React.createElement('table', { className: styles.enqTable },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', null, 'Enquiry Code'),
        showCmColumn && React.createElement('th', null, 'Category Manager'),
        showL1Column && React.createElement('th', null, 'L1 Manager'),
        React.createElement('th', null, 'Seller'),
        React.createElement('th', null, 'Feasibility'),
        React.createElement('th', null, 'Lead Status')
      )),
      React.createElement('tbody', null, filtered.map(function (e, i) {
        var color = avatarColor(e.sellerName)
        return React.createElement('tr', { key: e.code + '-' + i },
          React.createElement('td', null, React.createElement('a', { className: styles.enqCode, href: 'https://admin.thrillophilia.com/admin/1/enquiries?code=' + e.code, target: '_blank', rel: 'noreferrer' }, e.code)),
          showCmColumn && React.createElement('td', null, React.createElement('span', { style: { fontSize: '0.7rem', color: '#F4631E' } }, e.cmName || '—')),
          showL1Column && React.createElement('td', null, React.createElement('span', { style: { fontSize: '0.7rem', color: '#C9A84C' } }, e.l1Name || '—')),
          React.createElement('td', null, React.createElement('div', { className: styles.sellerCell }, React.createElement('span', { className: styles.avatar, style: { background: color + '22', color: color, width: 20, height: 20, fontSize: 9 } }, initials(e.sellerName)), React.createElement('span', { style: { fontSize: 11 } }, e.sellerName))),
          React.createElement('td', null, React.createElement('span', { className: styles.pill + ' ' + (e.feasibilityStatus === 'Passed' ? styles.pillPass : styles.pillFail) }, e.feasibilityStatus)),
          React.createElement('td', null, React.createElement('span', { className: styles.pill + ' ' + (e.leadStatus === 'Open' ? styles.pillOpen : e.leadStatus === 'Won' ? styles.pillWon : styles.pillLost) }, e.leadStatus))
        )
      }))
    )
  )
}

function L1ManagerView({ myData, teamSellers, managerName, breadcrumb, onBack }: { myData: SellerQbData | null; teamSellers: SellerQbData[]; managerName: string; breadcrumb?: string[]; onBack?: () => void }) {
  const [tab, setTab] = useState<'my' | 'team'>(myData ? 'my' : 'team'); const [activeBuckets, setActiveBuckets] = useState<Set<BucketKey>>(new Set()); const [drillSeller, setDrillSeller] = useState<SellerQbData | null>(null)
  const toggleBucket = (key: BucketKey) => setActiveBuckets(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next }); const clearBuckets = () => setActiveBuckets(new Set())
  const teamAllEnq = useMemo(() => teamSellers.flatMap(s => s.enquiries), [teamSellers]); const teamAggData: SellerQbData = useMemo(() => ({ seller_name: managerName, seller_email: '', sent: teamSellers.reduce((a, s) => a + s.sent, 0), passed: teamSellers.reduce((a, s) => a + s.passed, 0), won: teamSellers.reduce((a, s) => a + s.won, 0), lost: teamSellers.reduce((a, s) => a + s.lost, 0), stuck: teamSellers.reduce((a, s) => a + s.stuck, 0), passRate: 0, enquiries: teamAllEnq }), [teamSellers, managerName, teamAllEnq])
  if (drillSeller) return React.createElement(DrillDownOverlay, { breadcrumb: [...(breadcrumb || []), managerName], onBack: function () { setDrillSeller(null) }, sellerName: drillSeller.seller_name, sellerEmail: drillSeller.seller_email }, React.createElement(SellerView, { data: drillSeller }))
  return React.createElement(React.Fragment, null,
    onBack && React.createElement('button', { className: styles.backBtn, onClick: onBack }, '‹ Back'),
    React.createElement('div', { className: styles.toggleRow },
      myData && React.createElement('button', { className: styles.toggleBtn + ' ' + (tab === 'my' ? styles.toggleBtnActive : ''), onClick: function () { setTab('my') } }, '👤 My Stats'),
      React.createElement('button', { className: styles.toggleBtn + ' ' + (tab === 'team' ? styles.toggleBtnActive : ''), onClick: function () { setTab('team') } }, '👥 My Team (' + teamSellers.length + ')')
    ),
    tab === 'my' && myData && React.createElement(SellerView, { data: myData }),
    tab === 'team' && React.createElement(React.Fragment, null,
      React.createElement(KpiCards, { data: teamAggData }),
      React.createElement(BucketCards, { enquiries: teamAllEnq, activeBuckets: activeBuckets, onToggle: toggleBucket }),
      activeBuckets.size === 0 ? React.createElement(TeamSummaryTable, { sellers: teamSellers, onSellerClick: setDrillSeller }) : React.createElement(TeamEnqTable, { sellers: teamSellers, activeBuckets: activeBuckets, onClearBuckets: clearBuckets })
    )
  )
}

interface L2Group { name: string; email: string; sellers: SellerQbData[] }

function CatManagerView({ l1Sellers, managerName, cmEmail, breadcrumb, onBack }: { l1Sellers: SellerQbData[]; managerName: string; cmEmail?: string; breadcrumb?: string[]; onBack?: () => void }) {
  const [activeBuckets, setActiveBuckets] = useState<Set<BucketKey>>(new Set()); const [drillManager, setDrillManager] = useState<L2Group | null>(null); const [drillSeller, setDrillSeller] = useState<SellerQbData | null>(null); const [l1Filter, setL1Filter] = useState('')
  const toggleBucket = (key: BucketKey) => setActiveBuckets(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next }); const clearBuckets = () => setActiveBuckets(new Set())
  const l2Groups = useMemo(() => { const map: Record<string, L2Group> = {}; l1Sellers.forEach(s => { const l2Email = (s.l2_email && s.l2_email !== s.seller_email) ? s.l2_email : s.seller_email; const l2Name = s.l2_name || l2Email.split('@')[0]; if (!map[l2Email]) map[l2Email] = { name: l2Name, email: l2Email, sellers: [] }; map[l2Email].sellers.push(s) }); return Object.values(map) }, [l1Sellers])
  const teamAllEnq = useMemo(() => l1Sellers.flatMap(s => s.enquiries), [l1Sellers]); const teamAggData: SellerQbData = useMemo(() => ({ seller_name: managerName, seller_email: '', sent: l1Sellers.reduce((a, s) => a + s.sent, 0), passed: l1Sellers.reduce((a, s) => a + s.passed, 0), won: l1Sellers.reduce((a, s) => a + s.won, 0), lost: l1Sellers.reduce((a, s) => a + s.lost, 0), stuck: l1Sellers.reduce((a, s) => a + s.stuck, 0), passRate: 0, enquiries: teamAllEnq }), [l1Sellers, managerName, teamAllEnq])
  if (drillSeller) return React.createElement(DrillDownOverlay, { breadcrumb: [...(breadcrumb || []), managerName], onBack: function () { setDrillSeller(null) }, sellerName: drillSeller.seller_name, sellerEmail: drillSeller.seller_email }, React.createElement(SellerView, { data: drillSeller }))
  if (drillManager) {
    const managerSeller = l1Sellers.find(s => s.seller_name === drillManager.name) || l1Sellers.find(s => s.seller_email === drillManager.email) || l1Sellers.find(s => s.l2_email === drillManager.email)
    const isSelf = !!(cmEmail && drillManager.email === cmEmail)
    const managerTeam = l1Sellers.filter(s => s.l2_email === drillManager.email && s.seller_email !== drillManager.email)
    const myData = isSelf ? null : (managerSeller || { seller_name: drillManager.name, seller_email: drillManager.email, sent: 0, passed: 0, won: 0, lost: 0, stuck: 0, passRate: 0, enquiries: [] })
    return React.createElement(DrillDownOverlay, { breadcrumb: [...(breadcrumb || []), managerName], onBack: function () { setDrillManager(null) }, sellerName: drillManager.name, sellerEmail: drillManager.email }, React.createElement(L1ManagerView, { myData: myData, teamSellers: managerTeam, managerName: drillManager.name, breadcrumb: [...(breadcrumb || []), managerName] }))
  }
  const showSellers = !!l1Filter; const tableData = showSellers ? l1Sellers.filter(s => s.l2_email === l1Filter) : l2Groups; const tableTitle = showSellers ? 'Seller' : 'L1 Manager'; const hintText = showSellers ? 'Showing sellers' : 'Click a manager'
  return React.createElement(React.Fragment, null,
    onBack && React.createElement('button', { className: styles.backBtn, onClick: onBack }, '‹ Back'),
    React.createElement(KpiCards, { data: teamAggData }),
    React.createElement(BucketCards, { enquiries: teamAllEnq, activeBuckets: activeBuckets, onToggle: toggleBucket }),
    activeBuckets.size === 0 && React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' } },
      React.createElement(SelectDropdown, { options: l2Groups.map(g => ({ label: g.name + ' (' + g.sellers.length + ')', value: g.email })), value: l1Filter, onChange: function (v) { setL1Filter(v) }, placeholder: 'Select L1 Manager...', color: '#C9A84C' })
    ),
    activeBuckets.size === 0 ? React.createElement('div', { className: styles.tableSection },
      React.createElement('div', { className: styles.hintRow, style: { padding: '10px 16px' } }, hintText),
      React.createElement('table', { className: styles.summaryTable },
        React.createElement('thead', null, React.createElement('tr', null,
          React.createElement('th', null, tableTitle),
          React.createElement('th', { className: styles.numCol, style: { color: '#22C55E' } }, 'Passed & Open'),
          React.createElement('th', { className: styles.numCol, style: { color: '#F97316' } }, 'Not Passed & Open'),
          React.createElement('th', { className: styles.numCol, style: { color: '#9CA3AF' } }, 'Passed & Lost'),
          React.createElement('th', { className: styles.numCol, style: { color: '#EC4899' } }, 'Not Passed & Lost')
        )),
        React.createElement('tbody', null,
          showSellers ? (tableData as SellerQbData[]).map(function (s) {
            var counts = bucketCounts(s.enquiries); var color = avatarColor(s.seller_name)
            var pr = s.sent > 0 ? Math.round((s.passed / s.sent) * 100) : 0; var wp = s.passed > 0 ? Math.round((s.won / s.passed) * 100) : 0
            return React.createElement('tr', { key: s.seller_email, onClick: function () { setDrillSeller(s) }, style: { cursor: 'pointer' } },
              React.createElement('td', null, React.createElement('div', { style: alignedCell },
                React.createElement('span', { className: styles.avatar, style: { background: color + '22', color: color, width: 26, height: 26, fontSize: 10, flexShrink: 0 } }, initials(s.seller_name)),
                React.createElement('span', { style: nameStyle }, s.seller_name),
                React.createElement('span', { style: countStyle }, s.sent + ' sent'),
                React.createElement('span', { style: pillWrap },
                  React.createElement('span', { style: pillStyle('rgba(201,168,76,0.12)', '#C9A84C') }, pr + '% Pass Rate'),
                  React.createElement('span', { style: pillStyle('rgba(34,197,94,0.12)', '#4ADE80') }, wp + '% Won')
                )
              )),
              React.createElement('td', { className: styles.numCell + ' ' + styles.numCellPO, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.po),
              React.createElement('td', { className: styles.numCell + ' ' + styles.numCellNPO, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.npo),
              React.createElement('td', { className: styles.numCell + ' ' + styles.numCellPL, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.pl),
              React.createElement('td', { className: styles.numCell + ' ' + styles.numCellNPL, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.npl)
            )
          }) : (tableData as L2Group[]).map(function (group) {
            var counts = bucketCounts(group.sellers.flatMap(s => s.enquiries)); var color = avatarColor(group.name)
            var tts = group.sellers.reduce((a, s) => a + s.sent, 0); var ttp = group.sellers.reduce((a, s) => a + s.passed, 0)
            var tpr = tts > 0 ? Math.round((ttp / tts) * 100) : 0; var ttw = group.sellers.reduce((a, s) => a + s.won, 0); var twp = ttp > 0 ? Math.round((ttw / ttp) * 100) : 0
            return React.createElement('tr', { key: group.email, onClick: function () { setDrillManager(group) }, style: { cursor: 'pointer' } },
              React.createElement('td', null, React.createElement('div', { style: alignedCell },
                React.createElement('span', { className: styles.avatar, style: { background: color + '22', color: color, width: 26, height: 26, fontSize: 10, flexShrink: 0 } }, initials(group.name)),
                React.createElement('span', { style: nameStyle }, group.name),
                React.createElement('span', { style: countStyle }, group.sellers.length + ' seller' + (group.sellers.length !== 1 ? 's' : '')),
                React.createElement('span', { style: pillWrap },
                  React.createElement('span', { style: pillStyle('rgba(201,168,76,0.12)', '#C9A84C') }, tpr + '% Pass Rate'),
                  React.createElement('span', { style: pillStyle('rgba(34,197,94,0.12)', '#4ADE80') }, twp + '% Won')
                )
              )),
              React.createElement('td', { className: styles.numCell + ' ' + styles.numCellPO, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.po),
              React.createElement('td', { className: styles.numCell + ' ' + styles.numCellNPO, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.npo),
              React.createElement('td', { className: styles.numCell + ' ' + styles.numCellPL, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.pl),
              React.createElement('td', { className: styles.numCell + ' ' + styles.numCellNPL, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.npl)
            )
          })
        )
      )
    ) : React.createElement(TeamEnqTable, { sellers: l1Sellers, activeBuckets: activeBuckets, onClearBuckets: clearBuckets })
  )
}

function AdminView({ qbSellers }: { qbSellers: SellerQbData[] }) {
  const [activeBuckets, setActiveBuckets] = useState<Set<BucketKey>>(new Set()); const [drillCM, setDrillCM] = useState<{ name: string; email: string; sellers: SellerQbData[]; color: string } | null>(null)
  const [cmFilter, setCmFilter] = useState(''); const [l1Filter, setL1Filter] = useState('')
  const toggleBucket = (key: BucketKey) => setActiveBuckets(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next }); const clearBuckets = () => setActiveBuckets(new Set())
  const cmGroups = useMemo(() => { const map: Record<string, { name: string; email: string; sellers: SellerQbData[]; color: string }> = {}; let ci = 0; qbSellers.forEach(s => { const l1e = s.l1_email || 'unmapped'; const l1n = s.l1_name || 'Not Mapped'; if (!map[l1e]) { map[l1e] = { name: l1n, email: l1e, sellers: [], color: CM_COLORS[ci % CM_COLORS.length] }; ci++ } map[l1e].sellers.push(s) }); return Object.values(map) }, [qbSellers])
  const allEnq = useMemo(() => qbSellers.flatMap(s => s.enquiries), [qbSellers]); const orgData: SellerQbData = useMemo(() => ({ seller_name: 'Organisation', seller_email: '', sent: qbSellers.reduce((a, s) => a + s.sent, 0), passed: qbSellers.reduce((a, s) => a + s.passed, 0), won: qbSellers.reduce((a, s) => a + s.won, 0), lost: qbSellers.reduce((a, s) => a + s.lost, 0), stuck: qbSellers.reduce((a, s) => a + s.stuck, 0), passRate: 0, enquiries: allEnq }), [qbSellers, allEnq])
  const l1Options = useMemo(() => { if (!cmFilter) return []; const cm = cmGroups.find(c => c.email === cmFilter); if (!cm) return []; const l1Map: Record<string, string> = {}; cm.sellers.forEach(s => { const l2e = s.l2_email || s.seller_email; const l2n = s.l2_name || l2e.split('@')[0]; if (!l1Map[l2e]) l1Map[l2e] = l2n }); return Object.entries(l1Map).map(([email, name]) => ({ label: name, value: email })) }, [cmFilter, cmGroups])
  if (drillCM) return React.createElement(DrillDownOverlay, { breadcrumb: ['Admin'], onBack: function () { setDrillCM(null) }, sellerName: drillCM.name, sellerEmail: drillCM.email }, React.createElement(CatManagerView, { l1Sellers: drillCM.sellers, managerName: drillCM.name, cmEmail: drillCM.email }))
  const showSellers = !!(cmFilter && l1Filter); const showL1Managers = !!cmFilter && !l1Filter
  const tableData = showSellers ? qbSellers.filter(s => s.l2_email === l1Filter) : showL1Managers ? (cmGroups.find(c => c.email === cmFilter)?.sellers || []) : cmGroups
  const tableTitle = showSellers ? 'Seller' : showL1Managers ? 'L1 Manager' : 'Category Manager'; const hintText = showSellers ? 'Showing sellers' : showL1Managers ? 'Click a manager' : 'Click a Category Manager'
  return React.createElement(React.Fragment, null,
    React.createElement('div', { className: styles.orgKpiLabel }, 'Org KPIs'),
    React.createElement(KpiCards, { data: orgData }),
    React.createElement(BucketCards, { enquiries: allEnq, activeBuckets: activeBuckets, onToggle: toggleBucket }),
    activeBuckets.size === 0 && React.createElement('div', { style: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' } },
      React.createElement(SelectDropdown, { options: cmGroups.map(cm => ({ label: cm.name + ' (' + cm.sellers.length + ')', value: cm.email })), value: cmFilter, onChange: function (v) { setCmFilter(v); setL1Filter('') }, placeholder: 'Select CM...', color: '#F4631E' }),
      cmFilter && React.createElement(SelectDropdown, { options: l1Options, value: l1Filter, onChange: function (v) { setL1Filter(v) }, placeholder: 'Select L1 Manager...', color: '#C9A84C' })
    ),
    activeBuckets.size === 0 ? React.createElement('div', { className: styles.tableSection },
      React.createElement('div', { className: styles.hintRow, style: { padding: '10px 16px' } }, hintText),
      React.createElement('table', { className: styles.summaryTable },
        React.createElement('thead', null, React.createElement('tr', null,
          React.createElement('th', null, tableTitle),
          React.createElement('th', { className: styles.numCol, style: { color: '#22C55E' } }, 'Passed & Open'),
          React.createElement('th', { className: styles.numCol, style: { color: '#F97316' } }, 'Not Passed & Open'),
          React.createElement('th', { className: styles.numCol, style: { color: '#9CA3AF' } }, 'Passed & Lost'),
          React.createElement('th', { className: styles.numCol, style: { color: '#EC4899' } }, 'Not Passed & Lost')
        )),
        React.createElement('tbody', null, tableData.map(function (row: any) {
          var isCM = !cmFilter; var sellers = isCM ? row.sellers : [row]
          var counts = bucketCounts(sellers.flatMap(function (s: SellerQbData) { return s.enquiries }))
          var tts = sellers.reduce(function (a: number, s: SellerQbData) { return a + s.sent }, 0)
          var ttp = sellers.reduce(function (a: number, s: SellerQbData) { return a + s.passed }, 0)
          var tpr = tts > 0 ? Math.round((ttp / tts) * 100) : 0
          var ttw = sellers.reduce(function (a: number, s: SellerQbData) { return a + s.won }, 0)
          var twp = ttp > 0 ? Math.round((ttw / ttp) * 100) : 0
          var name = isCM ? row.name : row.seller_name
          var email = isCM ? row.email : row.seller_email
          var color = isCM ? row.color : avatarColor(name)
          var count = isCM ? row.sellers.length : 1
          var onClick = isCM ? function () { setDrillCM(row) } : undefined
          return React.createElement('tr', { key: email, onClick: onClick, style: { cursor: isCM ? 'pointer' : 'default' } },
            React.createElement('td', null, React.createElement('div', { style: alignedCell },
              React.createElement('span', { className: styles.avatar, style: { background: color + '22', color: color, width: 26, height: 26, fontSize: 10, flexShrink: 0 } }, initials(name)),
              React.createElement('span', { style: nameStyle }, name),
              React.createElement('span', { style: countStyle }, count + ' seller' + (count !== 1 ? 's' : '')),
              React.createElement('span', { style: pillWrap },
                React.createElement('span', { style: pillStyle('rgba(201,168,76,0.12)', '#C9A84C') }, tpr + '% Pass Rate'),
                React.createElement('span', { style: pillStyle('rgba(34,197,94,0.12)', '#4ADE80') }, twp + '% Won')
              )
            )),
            React.createElement('td', { className: styles.numCell + ' ' + styles.numCellPO, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.po),
            React.createElement('td', { className: styles.numCell + ' ' + styles.numCellNPO, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.npo),
            React.createElement('td', { className: styles.numCell + ' ' + styles.numCellPL, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.pl),
            React.createElement('td', { className: styles.numCell + ' ' + styles.numCellNPL, style: { fontSize: '0.85rem', fontWeight: 600 } }, counts.npl)
          )
        }))
      )
    ) : React.createElement(TeamEnqTable, { sellers: qbSellers, activeBuckets: activeBuckets, onClearBuckets: clearBuckets, showCmCol: true })
  )
}

interface QBStatsPageProps { session: UserSession }

export default function QBStatsPage({ session }: QBStatsPageProps) {
  const [qbData, setQbData] = useState<SellerQbData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const role = session.role; const email = session.email; const name = session.name
  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN'; const isCatManager = role === 'L1'; const isL1Manager = role === 'L2'; const isSeller = !isAdmin && !isCatManager && !isL1Manager

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null)
      try {
        const params = new URLSearchParams({ email, role })
        if (isL1Manager) params.set('view', 'team')
        const res = await fetch('/api/priority-leads?' + params.toString())
        if (!res.ok) throw new Error('Failed')
        const json = await res.json()
        setQbData(json.qbSellers || [])
      } catch (e: any) { setError(e.message) }
      finally { setLoading(false) }
    })()
  }, [email, role, isL1Manager])

  const myQbData = useMemo(() => {
    if (isSeller || isL1Manager) {
      const found = qbData.find(s => s.seller_email === email.toLowerCase()) || qbData.find(s => s.seller_name === name)
      if (found) return found
      return { seller_name: name, seller_email: email, sent: 0, passed: 0, won: 0, lost: 0, stuck: 0, passRate: 0, enquiries: [] }
    }
    return null
  }, [qbData, email, name, isSeller, isL1Manager])

  const teamSellers = useMemo(() => {
    if (isCatManager || isL1Manager) return qbData.filter(s => s.seller_email !== email.toLowerCase())
    return qbData
  }, [qbData, email, isCatManager, isL1Manager])

  const sub = isAdmin ? 'Admin · Insights' : isCatManager ? name + ' · Category Manager' : isL1Manager ? name + ' · L1 Manager' : name + ' · Seller'

  return React.createElement('div', { className: styles.page },
    React.createElement('div', { className: styles.header },
      React.createElement('div', { className: styles.titleRow }, React.createElement('span', { className: styles.titleIcon }), React.createElement('h1', { className: styles.title }, 'QB Stats')),
      React.createElement('p', { className: styles.subtitle }, sub + ' · This month')
    ),
    loading && React.createElement('div', { className: styles.loading }, 'Loading...'),
    error && React.createElement('div', { className: styles.emptyState, style: { color: '#F87171' } }, 'Failed: ' + error),
    !loading && !error && React.createElement(React.Fragment, null,
      isSeller && myQbData && React.createElement(SellerView, { data: myQbData }),
      isSeller && !myQbData && React.createElement('div', { className: styles.emptyState }, 'No QB data found.'),
      isL1Manager && React.createElement(L1ManagerView, { myData: myQbData, teamSellers: teamSellers, managerName: name }),
      isCatManager && React.createElement(CatManagerView, { l1Sellers: teamSellers, managerName: name, cmEmail: email }),
      isAdmin && React.createElement(AdminView, { qbSellers: qbData })
    )
  )
}