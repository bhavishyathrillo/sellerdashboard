'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './QBStatsPage.module.css'
import Avatar from '@/components/ui/Avatar'

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

function DrillDownOverlay({ breadcrumb, onBack, sellerName, sellerEmail, children }: { breadcrumb: string[]; onBack: () => void; sellerName: string; sellerEmail: string; children?: React.ReactNode }) {
  const color = avatarColor(sellerName)
  return React.createElement('div', { style: { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#0a0a0a', animation: 'slideIn 0.2s ease-out' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #1a1a1a', background: '#0d0d0d', flexShrink: 0 } },
      React.createElement('button', { onClick: onBack, style: { background: 'none', border: 'none', color: '#F4631E', fontSize: '1.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 } }, '‹'),
      React.createElement(Avatar, { name: sellerName, size: 36, className: styles.avatar }),
      React.createElement('div', { style: { flex: 1 } }, React.createElement('div', { style: { fontWeight: 700, fontSize: '0.95rem', color: '#F0EDE8' } }, sellerName), React.createElement('div', { style: { fontSize: '0.65rem', color: '#8A8278' } }, sellerEmail + ' · QB Stats'))
    ),
    React.createElement('div', { style: { flex: 1, overflow: 'auto', padding: 20 } }, React.createElement('div', { style: { marginBottom: 8 } }, React.createElement('span', { style: { fontSize: '0.65rem', color: '#5A5650' } }, breadcrumb.join(' › '))), children),
    React.createElement('style', null, '@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}')
  )
}

function SelectDropdown({ options, value, onChange, placeholder, color }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void; placeholder: string; color?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const accentColor = color || '#F4631E'
  const selected = options.find(o => o.value === value)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 190 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          width: '100%', padding: '8px 12px',
          background: '#1A1A1A',
          border: `1.5px solid ${open ? accentColor : '#2A2A2A'}`,
          borderRadius: '10px',
          color: selected ? accentColor : '#5A5650',
          fontSize: '0.75rem', fontWeight: selected ? 600 : 400,
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
          boxShadow: open ? `0 0 0 3px ${accentColor}18` : 'none',
          outline: 'none',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected ? selected.label : placeholder}
        </span>
        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
          background: '#1A1A1A',
          border: `1.5px solid ${accentColor}44`,
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          animation: 'ddOpen 0.15s ease-out',
          maxHeight: 280,
          overflowY: 'auto',
        }}>
          {/* Clear/placeholder option */}
          <div
            onClick={() => { onChange(''); setOpen(false) }}
            style={{
              padding: '9px 14px', fontSize: '0.72rem', color: '#5A5650',
              cursor: 'pointer', borderBottom: '1px solid #242424',
              background: !value ? 'rgba(255,255,255,0.03)' : 'transparent',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = !value ? 'rgba(255,255,255,0.03)' : 'transparent')}
          >
            {placeholder}
          </div>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                padding: '9px 14px', fontSize: '0.75rem',
                color: o.value === value ? accentColor : '#C0BDB8',
                fontWeight: o.value === value ? 600 : 400,
                cursor: 'pointer',
                background: o.value === value ? `${accentColor}12` : 'transparent',
                borderBottom: '1px solid #1E1E1E',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.background = o.value === value ? `${accentColor}12` : 'transparent' }}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes ddOpen{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
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
              React.createElement(Avatar, { name: s.seller_name, size: 26, className: styles.avatar }),
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
          React.createElement('td', null, React.createElement('div', { className: styles.sellerCell }, React.createElement(Avatar, { name: e.sellerName, size: 20, className: styles.avatar }), React.createElement('span', { style: { fontSize: 11 } }, e.sellerName))),
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
    const managerSeller = l1Sellers.find(s => s.seller_email === drillManager.email)
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
                React.createElement(Avatar, { name: s.seller_name, size: 26, className: styles.avatar }),
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
                React.createElement(Avatar, { name: group.name, size: 26, className: styles.avatar }),
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
  const [activeBuckets, setActiveBuckets] = useState<Set<BucketKey>>(new Set())
  const [drillCM, setDrillCM] = useState<{ name: string; email: string; sellers: SellerQbData[]; color: string } | null>(null)
  const [drillL1, setDrillL1] = useState<{ name: string; email: string; sellers: SellerQbData[] } | null>(null)
  const [drillSeller, setDrillSeller] = useState<SellerQbData | null>(null)
  const [cmFilter, setCmFilter] = useState(''); const [l1Filter, setL1Filter] = useState('')
  const toggleBucket = (key: BucketKey) => setActiveBuckets(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next }); const clearBuckets = () => setActiveBuckets(new Set())
  const cmGroups = useMemo(() => { const map: Record<string, { name: string; email: string; sellers: SellerQbData[]; color: string }> = {}; let ci = 0; qbSellers.forEach(s => { const l1e = s.l1_email || 'unmapped'; const l1n = s.l1_name || 'Not Mapped'; if (!map[l1e]) { map[l1e] = { name: l1n, email: l1e, sellers: [], color: CM_COLORS[ci % CM_COLORS.length] }; ci++ } map[l1e].sellers.push(s) }); return Object.values(map) }, [qbSellers])
  const allEnq = useMemo(() => qbSellers.flatMap(s => s.enquiries), [qbSellers]); const orgData: SellerQbData = useMemo(() => ({ seller_name: 'Organisation', seller_email: '', sent: qbSellers.reduce((a, s) => a + s.sent, 0), passed: qbSellers.reduce((a, s) => a + s.passed, 0), won: qbSellers.reduce((a, s) => a + s.won, 0), lost: qbSellers.reduce((a, s) => a + s.lost, 0), stuck: qbSellers.reduce((a, s) => a + s.stuck, 0), passRate: 0, enquiries: allEnq }), [qbSellers, allEnq])
  // Group selected CM's sellers by l2_email to build L1 Manager groups
  const l1Groups = useMemo(() => {
    if (!cmFilter) return [] as { name: string; email: string; sellers: SellerQbData[] }[]
    const cmSellers = cmGroups.find(c => c.email === cmFilter)?.sellers || []
    const map: Record<string, { name: string; email: string; sellers: SellerQbData[] }> = {}
    cmSellers.forEach(s => {
      const l2e = (s.l2_email && s.l2_email !== s.seller_email) ? s.l2_email : s.seller_email
      const l2n = s.l2_name || l2e.split('@')[0]
      if (!map[l2e]) map[l2e] = { name: l2n, email: l2e, sellers: [] }
      map[l2e].sellers.push(s)
    })
    return Object.values(map)
  }, [cmFilter, cmGroups])

  const l1Options = useMemo(() => l1Groups.map(g => ({ label: g.name + ' (' + g.sellers.length + ')', value: g.email })), [l1Groups])

  // Drill overlays — order matters: most specific first
  if (drillSeller) return React.createElement(DrillDownOverlay, { breadcrumb: ['Admin', cmFilter ? (cmGroups.find(c => c.email === cmFilter)?.name || '') : '', drillL1?.name || ''].filter(Boolean), onBack: function () { setDrillSeller(null) }, sellerName: drillSeller.seller_name, sellerEmail: drillSeller.seller_email }, React.createElement(SellerView, { data: drillSeller }))
  if (drillL1) {
    const managerSeller = qbSellers.find(s => s.seller_email === drillL1.email)
    const myData = managerSeller || { seller_name: drillL1.name, seller_email: drillL1.email, sent: 0, passed: 0, won: 0, lost: 0, stuck: 0, passRate: 0, enquiries: [] }
    const teamSellers = drillL1.sellers.filter(s => s.seller_email !== drillL1.email)
    return React.createElement(DrillDownOverlay, { breadcrumb: ['Admin', cmFilter ? (cmGroups.find(c => c.email === cmFilter)?.name || '') : ''].filter(Boolean), onBack: function () { setDrillL1(null) }, sellerName: drillL1.name, sellerEmail: drillL1.email }, React.createElement(L1ManagerView, { myData: myData, teamSellers: teamSellers, managerName: drillL1.name, breadcrumb: ['Admin'] }))
  }
  if (drillCM) return React.createElement(DrillDownOverlay, { breadcrumb: ['Admin'], onBack: function () { setDrillCM(null) }, sellerName: drillCM.name, sellerEmail: drillCM.email }, React.createElement(CatManagerView, { l1Sellers: drillCM.sellers, managerName: drillCM.name, cmEmail: drillCM.email }))

  // 3-level filter states
  const showCMs = !cmFilter
  const showL1Groups = !!cmFilter && !l1Filter
  const showSellers = !!(cmFilter && l1Filter)

  // Each level's data
  const sellerRows = showSellers ? qbSellers.filter(s => s.l2_email === l1Filter) : []
  const tableTitle = showSellers ? 'Seller' : showL1Groups ? 'L1 Manager' : 'Category Manager'
  const hintText = showSellers ? 'Showing sellers' : showL1Groups ? 'Click an L1 Manager to see sellers, or use the dropdown' : 'Click a Category Manager to drill in'

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
        React.createElement('tbody', null,
          // ── Level 1: No filter — show CM groups ──
          showCMs && cmGroups.map(function (cm) {
            var counts = bucketCounts(cm.sellers.flatMap(s => s.enquiries))
            var tts = cm.sellers.reduce((a, s) => a + s.sent, 0), ttp = cm.sellers.reduce((a, s) => a + s.passed, 0)
            var tpr = tts > 0 ? Math.round((ttp / tts) * 100) : 0
            var ttw = cm.sellers.reduce((a, s) => a + s.won, 0), twp = ttp > 0 ? Math.round((ttw / ttp) * 100) : 0
            return React.createElement('tr', { key: cm.email, onClick: function () { setDrillCM(cm) }, style: { cursor: 'pointer' } },
              React.createElement('td', null, React.createElement('div', { style: alignedCell },
                React.createElement(Avatar, { name: cm.name, size: 26, className: styles.avatar }),
                React.createElement('span', { style: nameStyle }, cm.name),
                React.createElement('span', { style: countStyle }, cm.sellers.length + ' seller' + (cm.sellers.length !== 1 ? 's' : '')),
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
          }),
          // ── Level 2: CM selected — show L1 Manager groups ──
          showL1Groups && l1Groups.map(function (group) {
            var counts = bucketCounts(group.sellers.flatMap(s => s.enquiries))
            var tts = group.sellers.reduce((a, s) => a + s.sent, 0), ttp = group.sellers.reduce((a, s) => a + s.passed, 0)
            var tpr = tts > 0 ? Math.round((ttp / tts) * 100) : 0
            var ttw = group.sellers.reduce((a, s) => a + s.won, 0), twp = ttp > 0 ? Math.round((ttw / ttp) * 100) : 0
            var color = avatarColor(group.name)
            return React.createElement('tr', { key: group.email, onClick: function () { setDrillL1(group) }, style: { cursor: 'pointer' } },
              React.createElement('td', null, React.createElement('div', { style: alignedCell },
                React.createElement(Avatar, { name: group.name, size: 26, className: styles.avatar }),
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
          }),
          // ── Level 3: CM + L1 selected — show individual sellers ──
          showSellers && sellerRows.map(function (s) {
            var counts = bucketCounts(s.enquiries)
            var tpr = s.sent > 0 ? Math.round((s.passed / s.sent) * 100) : 0
            var twp = s.passed > 0 ? Math.round((s.won / s.passed) * 100) : 0
            var color = avatarColor(s.seller_name)
            return React.createElement('tr', { key: s.seller_email, onClick: function () { setDrillSeller(s) }, style: { cursor: 'pointer' } },
              React.createElement('td', null, React.createElement('div', { style: alignedCell },
                React.createElement(Avatar, { name: s.seller_name, size: 26, className: styles.avatar }),
                React.createElement('span', { style: nameStyle }, s.seller_name),
                React.createElement('span', { style: countStyle }, s.sent + ' sent'),
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
          }),
          // Empty state
          (showL1Groups && l1Groups.length === 0 || showSellers && sellerRows.length === 0) &&
            React.createElement('tr', null, React.createElement('td', { colSpan: 5, className: styles.emptyState }, 'No data found'))
        )
      )
    ) : React.createElement(TeamEnqTable, { sellers: qbSellers, activeBuckets: activeBuckets, onClearBuckets: clearBuckets, showCmCol: true })
  )
}

interface QBStatsPageProps { session: UserSession }

const QB_CONTEXT = {
  seller: {
    icon: '🎯',
    headline: 'Your feasibility pipeline — this month',
    body: 'These are the enquiries where you sent a feasibility check this month. Each one is a real buyer who showed interest. The ones that passed feasibility are near-converting — follow up hard on Passed & Open to close them before they go cold.',
    accent: '#F4631E',
  },
  l1: {
    icon: '👥',
    headline: "Your team's feasibility pipeline — this month",
    body: "Every enquiry here went to feasibility — meaning it almost converted. These are the hottest leads in your book. Whether it's you or someone on your team, don't let a single one slip. Passed & Open need a closure push right now. Passed & Lost — understand what happened and see if it can be reversed. These are too close to the finish line to leave on the table.",
    accent: '#C9A84C',
  },
  cm: {
    icon: '📊',
    headline: 'Category feasibility health — this month',
    body: "These leads cleared the hardest gate — they went to feasibility and almost converted. Use the L1 view to see which ones can still be saved. Get context on who owns each lead, which L1 it sits under, and make sure every Passed & Open one gets closed. These are real revenue sitting in the pipeline.",
    accent: '#22C55E',
  },
  admin: {
    icon: '🏢',
    headline: 'Org-wide feasibility funnel — this month',
    body: 'Full-org view of enquiries sent to feasibility this month. These are the highest-intent leads in the system — they got far enough for a feasibility check. Passed & Open across the org = the immediate revenue opportunity. Drill into any CM or L1 to see where the pipeline is stuck.',
    accent: '#3B82F6',
  },
}

function QBContextBanner({ role }: { role: 'seller' | 'l1' | 'cm' | 'admin' }) {
  const [dismissed, setDismissed] = useState(false)
  const ctx = QB_CONTEXT[role]
  if (dismissed) return null
  return (
    <div style={{
      background: `linear-gradient(135deg, ${ctx.accent}0A 0%, rgba(20,20,20,0) 60%)`,
      border: `1px solid ${ctx.accent}28`,
      borderLeft: `3px solid ${ctx.accent}`,
      borderRadius: '10px',
      padding: '12px 16px',
      marginBottom: '16px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      position: 'relative',
    }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>{ctx.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ctx.accent, letterSpacing: '0.3px', marginBottom: '4px', textTransform: 'uppercase' }}>{ctx.headline}</div>
        <div style={{ fontSize: '0.71rem', color: '#8A8278', lineHeight: 1.6 }}>{ctx.body}</div>
      </div>
      <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: '#5A5650', fontSize: '1rem', cursor: 'pointer', padding: '0 0 0 8px', lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  )
}

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
      const found = qbData.find(s => s.seller_email === email.toLowerCase())
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
  const bannerRole: 'seller' | 'l1' | 'cm' | 'admin' = isAdmin ? 'admin' : isCatManager ? 'cm' : isL1Manager ? 'l1' : 'seller'

  return React.createElement('div', { className: styles.page },
    React.createElement('div', { className: styles.header },
      React.createElement('div', { className: styles.titleRow }, React.createElement('span', { className: styles.titleIcon }), React.createElement('h1', { className: styles.title }, 'QB Stats')),
      React.createElement('p', { className: styles.subtitle }, sub + ' · This month')
    ),
    React.createElement(QBContextBanner, { role: bannerRole }),
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