'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HomePage.module.css'
import Loader from '@/components/ui/Loader'

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

function Particles() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {[...Array(15)].map((_, i) => (
        <div key={i} style={{
          position:'absolute',top:'110%',left:`${Math.random()*100}%`,
          color:'#C9A84C',fontSize:`${0.5+Math.random()*0.8}rem`,
          opacity:0.15+Math.random()*0.2,
          animation:`particleRise ${6+Math.random()*8}s linear infinite`,
          animationDelay:`${Math.random()*8}s`
        }}>
          {['✦','◈','◇','◆','○'][Math.floor(Math.random()*5)]}
        </div>
      ))}
      <style>{`@keyframes particleRise{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:1}90%{opacity:0.5}100%{transform:translateY(-110vh) rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

interface HomePageProps {
  session: UserSession
}

export default function HomePage({ session }: HomePageProps) {
  const [data, setData] = useState<SellerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTopline, setShowTopline] = useState(true)
  const [showBottomline, setShowBottomline] = useState(true)

  const isL2 = session.role === 'L2'

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

  if (loading) return <Loader text="Loading..." />

  if (error) return (
    <div className={styles.errorWrap}><p>{error}</p></div>
  )

  if (!data) return null

  // For L2 managers, filter seller data if they have team data
  // For L2 managers, the data from /api/seller/overview is their personal data
  // The toggle should only affect team view, not personal view
  // But since L2 managers see personal data in Overview, the toggle is hidden for them here
  // The toggle will be visible in Performance/Team view

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
      <Particles />

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.sellerMeta}>
            <span className={styles.flag} style={{ background: flag.bg, color: flag.text }}>{data.current_seller_flag}</span>
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

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Monthly Goal</p>
          <p className={styles.statValue}>{fmt(data.bottomline_goal_monthly)}</p>
          <p className={styles.statHint}><span className={styles.hintNeutral}>Target for this month</span></p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Achieved</p>
          <p className={`${styles.statValue} ${styles.brandColor}`}>{fmt(data.actual_achieved_monthly)}</p>
          {(() => {
            const diff = data.actual_achieved_monthly - data.should_have_been_monthly
            const pctDiff = data.should_have_been_monthly > 0 ? Math.abs((diff / data.should_have_been_monthly) * 100).toFixed(1) : '0'
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
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Required Daily</p>
          <p className={styles.statValue}>{fmt(data.required_daily_monthly)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Should Have Been</p>
          <p className={styles.statValue}>{fmt(data.should_have_been_monthly)}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
          <p className={styles.statLabel}>% Achieved</p>
          <p className={styles.statValue}>{pct.toFixed(1)}%</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          {(() => {
            const sbhPct = data.should_have_been_monthly > 0 ? (data.actual_achieved_monthly / data.should_have_been_monthly) * 100 : 0
            const diff = sbhPct - 100
            const above = diff >= 0
            return (
              <p className={styles.statHint}>
                <span className={above ? styles.hintGreen : styles.hintRed}>
                  {above ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}% {above ? 'ahead of SHB pace' : 'behind SHB pace'}
                </span>
              </p>
            )
          })()}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Weekly Breakdown</h2>
        <div className={styles.weekGrid}>
          {weeks.map(w => {
            const wpct = w.goal > 0 ? (w.achieved / w.goal) * 100 : 0
            return (
              <div key={w.label} className={styles.weekCard}>
                <div className={styles.weekHeader}><span className={styles.weekLabel}>{w.label}</span></div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,color:'#8A8278',fontSize:'0.75rem',marginTop:'1rem',marginBottom:'1rem'}}>
                  Data will come soon
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.bottomGrid}>
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Incentives</h3>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80px',color:'#8A8278',fontSize:'0.75rem'}}>
            Data will come soon
          </div>
        </div>
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Flight Adoption</h3>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80px',color:'#8A8278',fontSize:'0.75rem'}}>
            Data will come soon
          </div>
        </div>
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Impacts</h3>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80px',color:'#8A8278',fontSize:'0.75rem'}}>
            Data will come soon
          </div>
        </div>
      </div>
    </div>
  )
}