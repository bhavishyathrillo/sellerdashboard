'use client'
import { useEffect, useState, useRef } from 'react'
import styles from './ThrillNews.module.css'

interface Props { email: string; role: string }

export default function ThrillNews({ email, role }: Props) {
  const [items, setItems] = useState<string[]>([])
  const [visible, setVisible] = useState(true)
  const trackRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    async function load() {
      try {
        const [overview, leaderboard, mhlRes] = await Promise.all([
          fetch(`/api/seller/overview?email=${encodeURIComponent(email)}&role=${role}`).then(r=>r.json()),
          fetch(`/api/seller/leaderboard`).then(r=>r.json()),
          fetch(`/api/mhl?email=${encodeURIComponent(email)}&role=${role}&view=${['L1','L2'].includes(role)?'team':'mine'}`).then(r=>r.json())
        ])

        const m = overview?.myMonthly || overview || {}
        const mhlData = Array.isArray(mhlRes) ? mhlRes : []
        const news: string[] = []

        const top = leaderboard?.[0]
        if (top) news.push(`🏆 ${top.seller_name} leads the company — ${(top.goal_achieved_percent||0).toFixed(1)}% achieved!`)

        if (overview?.todayPipeline === null || overview?.todayPipeline === undefined) {
          news.push(`⏰ You haven't submitted pipeline today — Deadline: ${overview?.deadlineStr || '11:00 AM'}`)
        } else {
          news.push(`✅ Pipeline submitted: ₹${(overview.todayPipeline||0).toLocaleString('en-IN')} (${overview.todayStatus||'OK'})`)
        }

        if (role === 'L2') {
          const pct = m.pct || m.goal_achieved_percent || 0
          const gapToSpin = 100 - pct
          if (gapToSpin > 0) news.push(`🎰 You're ${gapToSpin.toFixed(1)}% away from unlocking Premium Spin!`)
          else news.push(`🎉 Goal crushed! Go spin the wheel!`)
          const mhlCount = mhlData.filter((l:any)=>l.mhl_mho==='MHL').length
          const mhoCount = mhlData.filter((l:any)=>l.mhl_mho==='MHO').length
          news.push(`👥 Your team: ${mhlCount} MHL & ${mhoCount} MHO leads`)
          if (overview?.teamTotal?.pct) news.push(`📊 Team performance: ${overview.teamTotal.pct.toFixed(1)}% of goal`)
        }

        if (role === 'L1') {
          const pct = m.pct || m.goal_achieved_percent || 0
          const gapToSpin = 100 - pct
          if (gapToSpin > 0) news.push(`🎰 You're ${gapToSpin.toFixed(1)}% away from unlocking Premium Spin!`)
          else news.push(`🎉 Goal crushed! Go spin the wheel!`)
          const mhlCount = mhlData.filter((l:any)=>l.mhl_mho==='MHL').length
          news.push(`👤 Your sellers: ${mhlCount} MHL leads — Check MHL tab`)
          if (overview?.teamTotal?.pct) news.push(`📊 Team performance: ${overview.teamTotal.pct.toFixed(1)}% of goal`)
        }

        if (role === 'SELLER') {
          const pct = m.pct || m.goal_achieved_percent || 0
          const gapToSpin = 100 - pct
          if (gapToSpin > 0) news.push(`🎰 ${gapToSpin.toFixed(1)}% away from unlocking Premium Spin!`)
          else news.push(`🎉 Goal crushed! Go spin the wheel!`)
          news.push(`📞 Keep up your call hygiene — every call counts!`)
        }

        const mhlCount = mhlData.filter((l:any)=>l.mhl_mho==='MHL').length
        const mhoCount = mhlData.filter((l:any)=>l.mhl_mho==='MHO').length
        if (mhlCount > 0 || mhoCount > 0) news.push(`⚠️ ${mhlCount} MHL | ${mhoCount} MHO — Check MHL/MHO tab`)

        setItems(news)
      } catch {}
    }
    load()
  }, [email, role])

  // Smooth infinite scroll animation
  useEffect(() => {
    const track = trackRef.current
    if (!track || items.length === 0) return

    let pos = 0
    const speed = 1.5

    function animate() {
      pos -= speed
      const singleSetWidth = track!.scrollWidth / 5
      if (Math.abs(pos) >= singleSetWidth) {
        pos = 0
      }
      track!.style.transform = `translateX(${pos}px)`
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [items])

  if (!visible || items.length === 0) return null

  return (
    <div className={styles.bar}>
      <span className={styles.label}><span className={styles.dot}></span> ThrillNews</span>
      <div className={styles.trackWrap}>
        <div className={styles.track} ref={trackRef}>
          {items.map((item, i) => (<span key={i} className={styles.item}>{item}</span>))}
          {items.map((item, i) => (<span key={`d1-${i}`} className={styles.item}>{item}</span>))}
          {items.map((item, i) => (<span key={`d2-${i}`} className={styles.item}>{item}</span>))}
          {items.map((item, i) => (<span key={`d3-${i}`} className={styles.item}>{item}</span>))}
          {items.map((item, i) => (<span key={`d4-${i}`} className={styles.item}>{item}</span>))}
        </div>
      </div>
      <button onClick={() => setVisible(false)} className={styles.close}>✕</button>
    </div>
  )
}