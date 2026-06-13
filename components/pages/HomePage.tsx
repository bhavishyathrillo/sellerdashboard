'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HomePage.module.css'

interface SellerData {
  seller_email: string
  seller_name: string
  l2_name: string
  l1_name: string
  region: string
  status: string
  haul: string
  ranking: string
  current_seller_flag: string
  defined_goal: string
  bottomline_goal_monthly: number
  actual_achieved_monthly: number
  required_daily_monthly: number
  should_have_been_monthly: number
  goal_achieved_percent: number
  week_1_goal: number
  week_1_achieved: number
  week_2_goal: number
  week_2_achieved: number
  week_3_goal: number
  week_3_achieved: number
  week_4_goal: number
  week_4_achieved: number
  final_incentives: number
  final_amount_to_be_disbursed: number
  flight_adoption: number
  flight_adoption_goal: number
  flight_adoption_pax_goal: number
  flight_adoption_pax_achieved: number
  last_payment_date: string
  one_liner: string
  cancellation_impact: number
  escalation_impacts: number
  duration_in_org: number
  category: string
}

const flagColors: Record<string, { bg: string, text: string }> = {
  '1 White':  { bg: 'rgba(154,154,154,0.12)', text: '#9A9A9A' },
  '2 Red':    { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444' },
  '3 Yellow': { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B' },
  '4 Orange': { bg: 'rgba(244,99,30,0.12)',   text: '#F4631E' },
  '5 Green':  { bg: 'rgba(34,197,94,0.12)',   text: '#22C55E' },
  '6 Star':   { bg: 'rgba(201,168,76,0.12)',  text: '#C9A84C' },
}

const regionLabel = (r: string) =>
  r?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '-'

function fmt(n: number) {
  if (!n) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

interface HomePageProps {
  session: UserSession
}

export default function HomePage({ session }: HomePageProps) {
  const [data, setData] = useState<SellerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/seller/overview?email=${session.email}`)
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Failed to load'); return }
        setData(json)
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session.email])

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p>Loading your overview...</p>
    </div>
  )

  if (error) return (
    <div className={styles.errorWrap}>
      <p>{error}</p>
    </div>
  )

  if (!data) return null

  const flag = flagColors[data.current_seller_flag] || flagColors['1 White']
  const pct = Number(data.goal_achieved_percent) || 0
  const weeks = [
    { label: 'W1', goal: data.week_1_goal, achieved: data.week_1_achieved },
    { label: 'W2', goal: data.week_2_goal, achieved: data.week_2_achieved },
    { label: 'W3', goal: data.week_3_goal, achieved: data.week_3_achieved },
    { label: 'W4', goal: data.week_4_goal, achieved: data.week_4_achieved },
  ]

  return (
    <div className={styles.page}>

      {/* Hero row */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.sellerMeta}>
            <span
              className={styles.flag}
              style={{ background: flag.bg, color: flag.text }}
            >
              {data.current_seller_flag}
            </span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>{regionLabel(data.region)}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>{data.haul}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>Rank #{data.ranking}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>{data.duration_in_org}M tenure</span>
          </div>
          <p className={styles.oneLiner}>{data.one_liner}</p>
        </div>
        <div className={styles.heroRight}>
          <span className={styles.goalType}>{data.defined_goal} Goal</span>
        </div>
      </div>

      {/* Stat cards */}
{/* Stat cards */}
<div className={styles.statGrid}>

  {/* Monthly Goal */}
  <div className={styles.statCard}>
    <p className={styles.statLabel}>Monthly Goal</p>
    <p className={styles.statValue}>{fmt(data.bottomline_goal_monthly)}</p>
    <p className={styles.statHint}>
      <span className={styles.hintNeutral}>Target for this month</span>
    </p>
  </div>

  {/* Achieved */}
  <div className={styles.statCard}>
    <p className={styles.statLabel}>Achieved</p>
    <p className={`${styles.statValue} ${styles.brandColor}`}>
      {fmt(data.actual_achieved_monthly)}
    </p>
    {(() => {
      const diff = data.actual_achieved_monthly - data.should_have_been_monthly
      const pctDiff = data.should_have_been_monthly > 0
        ? Math.abs((diff / data.should_have_been_monthly) * 100).toFixed(1)
        : '0'
      const above = diff >= 0
      return (
        <p className={styles.statHint}>
          <span className={above ? styles.hintGreen : styles.hintRed}>
            {above ? '↑' : '↓'} {fmt(Math.abs(diff))} {above ? 'above' : 'below'} SHB
            <span className={styles.hintPct}> ({pctDiff}%)</span>
          </span>
        </p>
      )
    })()}
  </div>

  {/* Required Daily */}
  <div className={styles.statCard}>
    <p className={styles.statLabel}>Required Daily</p>
    <p className={styles.statValue}>{fmt(data.required_daily_monthly)}</p>
    {(() => {
      const req = data.required_daily_monthly
      const daily = data.bottomline_goal_monthly / 22
      const ratio = req / daily
      let label = '', cls = ''
      if (req <= 0) { label = '✓ Target achieved'; cls = styles.hintGreen }
      else if (ratio > 1.5) { label = '⚠ High pressure'; cls = styles.hintRed }
      else if (ratio > 1) { label = '↑ Above daily avg'; cls = styles.hintYellow }
      else { label = '✓ On track'; cls = styles.hintGreen }
      return <p className={styles.statHint}><span className={cls}>{label}</span></p>
    })()}
  </div>

  {/* Should Have Been */}
  <div className={styles.statCard}>
    <p className={styles.statLabel}>Should Have Been</p>
    <p className={styles.statValue}>{fmt(data.should_have_been_monthly)}</p>
    {(() => {
      const gap = data.should_have_been_monthly - data.actual_achieved_monthly
      const above = gap <= 0
      return (
        <p className={styles.statHint}>
          <span className={above ? styles.hintGreen : styles.hintRed}>
            {above ? '✓ Exceeding pace' : `↓ ${fmt(gap)} gap to close`}
          </span>
        </p>
      )
    })()}
  </div>

  {/* % Achieved */}
  <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
    <p className={styles.statLabel}>% Achieved</p>
    <p className={styles.statValue}>{pct.toFixed(1)}%</p>
    <div className={styles.progressBar}>
      <div className={styles.progressFill} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
    {(() => {
      // Expected pace based on current day of month
      const today = new Date()
      const dayOfMonth = today.getDate()
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const expectedPct = (dayOfMonth / daysInMonth) * 100
      const diff = pct - expectedPct
      const above = diff >= 0
      return (
        <p className={styles.statHint}>
          <span className={above ? styles.hintGreen : styles.hintRed}>
            {above ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}% {above ? 'ahead of' : 'behind'} pace
            <span className={styles.hintPct}> (exp. {expectedPct.toFixed(0)}%)</span>
          </span>
        </p>
      )
    })()}
  </div>

</div>

      {/* Weekly breakdown */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Weekly Breakdown</h2>
        <div className={styles.weekGrid}>
          {weeks.map(w => {
            const wpct = w.goal > 0 ? (w.achieved / w.goal) * 100 : 0
            return (
              <div key={w.label} className={styles.weekCard}>
                <div className={styles.weekHeader}>
                  <span className={styles.weekLabel}>{w.label}</span>
                  <span className={styles.weekPct}>{wpct.toFixed(0)}%</span>
                </div>
                <div className={styles.weekRow}>
                  <span className={styles.weekSub}>Goal</span>
                  <span className={styles.weekVal}>{fmt(w.goal)}</span>
                </div>
                <div className={styles.weekRow}>
                  <span className={styles.weekSub}>Achieved</span>
                  <span className={`${styles.weekVal} ${styles.brandColor}`}>
                    {fmt(w.achieved)}
                  </span>
                </div>
                <div className={styles.weekBar}>
                  <div
                    className={styles.weekBarFill}
                    style={{ width: `${Math.min(wpct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom row */}
      <div className={styles.bottomGrid}>

        {/* Incentives */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Incentives</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Final Incentive</span>
            <span className={styles.infoValue}>{fmt(data.final_incentives)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>To be Disbursed</span>
            <span className={`${styles.infoValue} ${styles.brandColor}`}>
              {fmt(data.final_amount_to_be_disbursed)}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Last Payment</span>
            <span className={styles.infoValue}>{data.last_payment_date || '-'}</span>
          </div>
        </div>

        {/* Flight Adoption */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Flight Adoption</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Adoption Rate</span>
            <span className={styles.infoValue}>
              {((data.flight_adoption || 0) * 100).toFixed(1)}%
              <span className={styles.infoSub}> / {((data.flight_adoption_goal || 0) * 100).toFixed(0)}% goal</span>
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>PAX Achieved</span>
            <span className={styles.infoValue}>
              {data.flight_adoption_pax_achieved || 0}
              <span className={styles.infoSub}> / {data.flight_adoption_pax_goal || 0} goal</span>
            </span>
          </div>
          <div className={styles.weekBar} style={{ marginTop: '10px' }}>
            <div
              className={styles.weekBarFill}
              style={{
                width: `${Math.min(((data.flight_adoption || 0) / (data.flight_adoption_goal || 1)) * 100, 100)}%`,
                background: data.flight_adoption >= data.flight_adoption_goal
                  ? '#22C55E' : '#F4631E'
              }}
            />
          </div>
        </div>

        {/* Impacts */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Impacts</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Cancellation</span>
            <span className={styles.infoValue} style={{ color: data.cancellation_impact < 0 ? '#EF4444' : '#F0EDE8' }}>
              {fmt(data.cancellation_impact)}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Escalation</span>
            <span className={styles.infoValue} style={{ color: data.escalation_impacts < 0 ? '#EF4444' : '#F0EDE8' }}>
              {fmt(data.escalation_impacts)}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>L2 Manager</span>
            <span className={styles.infoValue}>{data.l2_name}</span>
          </div>
        </div>

      </div>
    </div>
  )
}