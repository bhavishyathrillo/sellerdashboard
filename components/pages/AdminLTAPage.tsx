'use client'

import React, { useState, useEffect } from 'react'
import { UserSession } from '@/lib/session'
import styles from './L1SellerViewPage.module.css'
import sellerStyles from './SellerViewPage.module.css'
import Loader from '@/components/ui/Loader'

interface AdminLTAPageProps {
  session: UserSession
}

export default function AdminLTAPage({ session }: AdminLTAPageProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [drillLevel, setDrillLevel] = useState<'ORG' | 'CAT'>('ORG')
  const [selectedCat, setSelectedCat] = useState<any>(null)
  
  const [expandedTl, setExpandedTl] = useState<string | null>(null)
  const [showTeamFunnel, setShowTeamFunnel] = useState<boolean>(false)
  const [activeFunnelTl, setActiveFunnelTl] = useState<any>(null)
  const [activeSellerFunnel, setActiveSellerFunnel] = useState<any>(null)

  useEffect(() => {
    fetch('/api/admin/lta')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  if (!data) return <div style={{ color: 'red', padding: '24px' }}>Error: Could not load LTA data. Please try again.</div>

  const categories = data?.categories || []

  // Org level aggregations
  const globalPlanned = categories.reduce((s: number, c: any) => s + c.planned, 0)
  const globalActual = categories.reduce((s: number, c: any) => s + c.actual, 0)
  const globalLost = categories.reduce((s: number, c: any) => s + c.lost, 0)
  const globalLostPct = globalPlanned > 0 ? (globalLost / globalPlanned) * 100 : 0

  const getLostColor = (pct: number) => {
    if (pct < 5) return '#22C55E'
    if (pct <= 15) return '#F59E0B'
    return '#EF4444'
  }

  const renderLostPct = (pct: number) => {
    const color = getLostColor(pct)
    return <span style={{ color, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
  }

  const getFunnelDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>LTA Monitoring Dashboard</h1>
        </div>
        <div className={styles.headerRight}>
          <div className={sellerStyles.dateFilter}>
            <span className={sellerStyles.dateFilterIcon}>📅</span>
            <span>Date: Today</span>
          </div>
        </div>
      </div>

      <div className={styles.statsStrip}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Org Planned LTA</div>
          <div className={styles.statValue}>{globalPlanned} leads</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Org Actual LTA</div>
          <div className={styles.statValue}>{globalActual} leads</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Lost to violations</div>
          <div className={styles.statValue}>
            {globalLost} leads ({globalLostPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', fontSize: '0.85rem' }}>
        <button 
          onClick={() => { setDrillLevel('ORG'); setSelectedCat(null); setExpandedTl(null) }}
          style={{ background: 'none', border: 'none', color: drillLevel === 'ORG' ? '#F4631E' : '#A0A0A0', cursor: 'pointer', fontWeight: 600 }}
        >
          All Categories
        </button>
        {selectedCat && (
          <>
            <span style={{ color: '#666' }}>/</span>
            <span style={{ color: '#F4631E', fontWeight: 600 }}>{selectedCat.category_name}</span>
          </>
        )}
      </div>

      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {drillLevel === 'ORG' && 'LTA by Category'}
            {drillLevel === 'CAT' && `LTA by TL (${selectedCat?.category_name})`}
          </h2>
        </div>
        
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>
                  {drillLevel === 'ORG' ? 'Category' : 'Team (TL)'}
                </th>
                <th>Planned LTA (Leads)</th>
                <th>Actual LTA (Leads)</th>
                <th>Lost Leads</th>
                <th>Lost %</th>
              </tr>
            </thead>
            <tbody>
              {drillLevel === 'ORG' && categories.map((cat: any) => (
                <tr key={cat.category_name} onClick={() => { setSelectedCat(cat); setDrillLevel('CAT') }} style={{ cursor: 'pointer' }}>
                  <td style={{ textAlign: 'left', fontWeight: 600 }}>{cat.category_name}</td>
                  <td>{cat.planned}</td>
                  <td>{cat.actual}</td>
                  <td>{cat.lost}</td>
                  <td>{renderLostPct(cat.lostPct)}</td>
                </tr>
              ))}

              {drillLevel === 'CAT' && selectedCat?.tls.map((tl: any) => (
                <React.Fragment key={tl.tl_name}>
                  <tr 
                    className={styles.tlRow} 
                    onClick={() => setExpandedTl(expandedTl === tl.tl_name ? null : tl.tl_name)} 
                    style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <td style={{ textAlign: 'left', fontWeight: 600, color: '#C9A84C' }}>
                      <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTl === tl.tl_name ? 'rotate(90deg)' : 'none' }}>▶</span>
                      {tl.tl_name}
                    </td>
                    <td>{tl.planned}</td>
                    <td style={{ color: '#22C55E', fontWeight: 600 }}>{tl.actual}</td>
                    <td>{tl.lost}</td>
                    <td>{renderLostPct(tl.lostPct)}</td>
                  </tr>

                  {expandedTl === tl.tl_name && (
                    <tr className={styles.sellerRow}>
                      <td colSpan={5} style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.2)' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveFunnelTl(tl); setShowTeamFunnel(true); }}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          📊 View Team Funnel
                        </button>
                      </td>
                    </tr>
                  )}

                  {expandedTl === tl.tl_name && tl.sellers.map((seller: any) => {
                    const lostPct = seller.lta.planned > 0 ? (seller.lta.totalLost / seller.lta.planned) * 100 : 0
                    return (
                      <tr 
                        key={seller.seller_email} 
                        className={`${styles.sellerRow} ${seller.isAbsent ? styles.absentRow : ''}`} 
                        onClick={() => { if(!seller.isAbsent) setActiveSellerFunnel(seller) }} 
                        style={{ cursor: seller.isAbsent ? 'default' : 'pointer', opacity: seller.isAbsent ? 0.45 : 1 }}
                      >
                        <td style={{ paddingLeft: '32px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{seller.seller_name || seller.seller_email}</span>
                          {seller.isAbsent && <span style={{ background: '#EF4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>Absent</span>}
                        </td>
                        <td>{seller.isAbsent ? '—' : seller.lta.planned}</td>
                        <td style={{ color: seller.isAbsent ? 'inherit' : (lostPct < 5 ? '#22C55E' : lostPct <= 15 ? '#F59E0B' : '#EF4444'), fontWeight: 600 }}>
                          {seller.isAbsent ? '—' : seller.lta.actual}
                        </td>
                        <td>{seller.isAbsent ? '—' : seller.lta.totalLost}</td>
                        <td>{seller.isAbsent ? '—' : renderLostPct(lostPct)}</td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Funnel Modal */}
      {showTeamFunnel && activeFunnelTl && (
        <div className={sellerStyles.modalOverlay} onClick={() => setShowTeamFunnel(false)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '550px', width: '600px' }}>
            <button className={sellerStyles.modalClose} onClick={() => setShowTeamFunnel(false)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
              <span className={sellerStyles.modalTitle}>{activeFunnelTl.tl_name} — LTA Funnel</span>
            </div>

            <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', width: '100%', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
                <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradTeamL1)" opacity="0.08" />
                <defs>
                  <linearGradient id="funnelGradTeamL1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={sellerStyles.ltaFunnelStack}>
                {(() => {
                  const stages = [
                    { id: 'planned', label: 'TEAM PLANNED', value: activeFunnelTl.planned, color: '#3B82F6', dropText: getFunnelDropText(activeFunnelTl.dynLost, 'Dynamic'), width: '100%' },
                    { id: 'dynamic', label: 'TEAM DYNAMIC', value: activeFunnelTl.dynLta, color: '#EAB308', dropText: getFunnelDropText(activeFunnelTl.hygLost, 'Hygiene'), width: '85%' },
                    { id: 'hygiene', label: 'TEAM HYGIENE', value: activeFunnelTl.hygLta, color: '#F97316', dropText: getFunnelDropText(activeFunnelTl.rev1Lost, 'Goal Complete'), width: '70%' },
                    { id: 'goalComplete', label: 'TEAM GOAL COMPLETE', value: activeFunnelTl.rev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(activeFunnelTl.rev2Lost, 'Final'), width: '60%' },
                    { id: 'final', label: 'TEAM FINAL', value: activeFunnelTl.actual, color: '#22C55E', dropText: null, width: '50%' },
                  ]
                  return stages.map((step, idx) => (
                    <div key={step.id} className={sellerStyles.ltaFunnelStepWrap} style={{ animationDelay: `${idx * 0.15}s` } as any}>
                      <div className={sellerStyles.ltaFunnelCard} style={{ '--card-color': step.color, borderColor: step.color, width: step.width } as any}>
                        <div className={sellerStyles.ltaFunnelCardHeader}>
                          <span className={sellerStyles.ltaFunnelCardTitle} style={{ color: step.color }}>{step.label}</span>
                          {step.id === 'planned' && <span className={sellerStyles.ltaFunnelBadge} style={{ background: `${step.color}20`, color: step.color }}>Planned</span>}
                        </div>
                        <div className={sellerStyles.ltaFunnelCardBody}>
                          <span className={sellerStyles.ltaFunnelCardValue}>{step.value}</span>
                          <span className={sellerStyles.ltaFunnelCardLabel}>Leads</span>
                        </div>
                      </div>
                      {step.dropText && (
                        <div className={sellerStyles.ltaFunnelDrop}>
                          <div className={sellerStyles.ltaFunnelLine} />
                          <div className={sellerStyles.ltaFunnelDropText}>{step.dropText}</div>
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Seller Funnel Modal */}
      {activeSellerFunnel && (
        <div className={sellerStyles.modalOverlay} onClick={() => setActiveSellerFunnel(null)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '550px', width: '600px' }}>
            <button className={sellerStyles.modalClose} onClick={() => setActiveSellerFunnel(null)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
              <span className={sellerStyles.modalTitle}>{activeSellerFunnel.seller_name || activeSellerFunnel.seller_email} — LTA Funnel</span>
            </div>

            <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', width: '100%', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
                <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradL1)" opacity="0.08" />
                <defs>
                  <linearGradient id="funnelGradL1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={sellerStyles.ltaFunnelStack}>
                {(() => {
                  const lta = activeSellerFunnel.lta;
                  const stages = [
                    { id: 'planned', label: 'PLANNED LTA', value: lta.planned, color: '#3B82F6', dropText: getFunnelDropText(lta.dynLost, 'Dynamic'), width: '100%' },
                    { id: 'dynamic', label: 'DYNAMIC LTA', value: lta.dynLta, color: '#EAB308', dropText: getFunnelDropText(lta.hygLost, 'Hygiene'), width: '88%' },
                    { id: 'hygiene', label: 'HYGIENE LTA', value: lta.hygLta, color: '#F97316', dropText: getFunnelDropText(lta.rev1Lost, 'Goal Complete'), width: '74%' },
                    { id: 'goalComplete', label: 'GOAL COMPLETE LTA', value: lta.rev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(lta.rev2Lost, 'Final'), width: '62%' },
                    { id: 'final', label: 'FINAL LTA', value: lta.actual, color: '#22C55E', dropText: null, width: '50%' },
                  ]
                  return stages.map((step, idx) => (
                    <div key={step.id} className={sellerStyles.ltaFunnelStepWrap} style={{ animationDelay: `${idx * 0.15}s` } as any}>
                      <div className={sellerStyles.ltaFunnelCard} style={{ '--card-color': step.color, borderColor: step.color, width: step.width } as any}>
                        <div className={sellerStyles.ltaFunnelCardHeader}>
                          <span className={sellerStyles.ltaFunnelCardTitle} style={{ color: step.color }}>{step.label}</span>
                          {step.id === 'planned' && <span className={sellerStyles.ltaFunnelBadge} style={{ background: `${step.color}20`, color: step.color }}>Planned</span>}
                        </div>
                        <div className={sellerStyles.ltaFunnelCardBody}>
                          <span className={sellerStyles.ltaFunnelCardValue}>{step.value}</span>
                          <span className={sellerStyles.ltaFunnelCardLabel}>Leads</span>
                        </div>
                      </div>
                      {step.dropText && (
                        <div className={sellerStyles.ltaFunnelDrop}>
                          <div className={sellerStyles.ltaFunnelLine} />
                          <div className={sellerStyles.ltaFunnelDropText}>{step.dropText}</div>
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
