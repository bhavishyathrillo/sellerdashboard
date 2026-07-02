'use client'
import { useEffect, useState, useRef } from 'react'
import styles from './ThrillNews.module.css'

interface Props { email: string; role: string }

export default function ThrillNews({ email, role }: Props) {
  const [items, setItems] = useState<string[]>([])
  const [visible, setVisible] = useState(true)
  const trackRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)

  // ONLY show for L2 and SELLER
  const shouldShow = role === 'L2' || role === 'SELLER'
  
  if (!shouldShow) {
    return null
  }

  useEffect(() => {
    async function load() {
      try {
        const news: string[] = []

        // 1. Get TOP performer from leaderboard
        try {
          const leaderboardRes = await fetch('/api/seller/leaderboard')
          const leaderboard = await leaderboardRes.json()
          if (leaderboard && leaderboard.length > 0) {
            const top = leaderboard[0]
            const pct = (top.goal_achieved_percent || 0).toFixed(1)
            news.push(`🏆 ${top.seller_name} leads the company — ${pct}% achieved!`)
          }
        } catch {}

        // 2. Get SELLER'S OWN data from overview
        let sellerPct = 0
        let sellerGoal = 0
        let sellerAchieved = 0
        try {
          const overviewRes = await fetch(`/api/seller/overview?email=${encodeURIComponent(email)}`)
          const overview = await overviewRes.json()
          if (overview && !overview.error) {
            sellerPct = overview.goal_achieved_percent || 0
            sellerGoal = overview.bottomline_goal_monthly || 0
            sellerAchieved = overview.actual_achieved_monthly || 0
          }
        } catch {}

        // 3. Pipeline check
        try {
          const today = new Date(Date.now() + 19800000).toISOString().split('T')[0]
          const pipelineRes = await fetch(`/api/pipeline/check?email=${encodeURIComponent(email)}&date=${today}`)
          const pipelineCheck = await pipelineRes.json()
          if (pipelineCheck?.submitted) {
            news.push(`✅ Pipeline submitted for today`)
          } else {
            news.push(`⏰ You haven't submitted pipeline today — Deadline: 11:00 AM`)
          }
        } catch {
          news.push(`⏰ Submit your pipeline for today`)
        }

        // 4. Goal progress & spin
        const gapToSpin = Math.max(0, 100 - sellerPct)
        
        if (role === 'L2') {
          // L2 Manager - Show goal progress
          if (gapToSpin > 0) {
            news.push(`🎰 ${gapToSpin.toFixed(1)}% away from unlocking Premium Spin!`)
          } else {
            news.push(`🎉 Goal crushed! Go spin the wheel!`)
          }
          
          // Get TEAM MHL/MHO data
          try {
            const mhlRes = await fetch(`/api/mhl?email=${encodeURIComponent(email)}&role=${role}&view=team`)
            const mhlData = await mhlRes.json()
            if (Array.isArray(mhlData)) {
              const mhlCount = mhlData.filter((l: any) => l.mhl_mho === 'MHL').length
              const mhoCount = mhlData.filter((l: any) => l.mhl_mho === 'MHO').length
              if (mhlCount > 0 || mhoCount > 0) {
                news.push(`👥 Your team: ${mhlCount} MHL & ${mhoCount} MHO leads`)
              }
            }
          } catch {}

          // Get TEAM performance
          try {
            const teamRes = await fetch(`/api/seller/team-performance?email=${encodeURIComponent(email)}&role=${role}`)
            const teamData = await teamRes.json()
            if (teamData?.teamTotal?.pct) {
              news.push(`📊 Team performance: ${teamData.teamTotal.pct.toFixed(1)}% of goal`)
            }
          } catch {}

        } else {
          // SELLER
          if (gapToSpin > 0) {
            news.push(`🎰 ${gapToSpin.toFixed(1)}% away from unlocking Premium Spin!`)
          } else {
            news.push(`🎉 Goal crushed! Go spin the wheel!`)
          }
          
          // Show hygiene reminder
          try {
            const hygieneRes = await fetch(`/api/seller/efficiency?email=${encodeURIComponent(email)}`)
            const hygieneData = await hygieneRes.json()
            if (Array.isArray(hygieneData) && hygieneData.length > 0) {
              const totalCalls = hygieneData.reduce((sum: number, d: any) => sum + (d.call_dials || 0), 0)
              if (totalCalls === 0) {
                news.push(`📞 Start making calls to improve your hygiene!`)
              } else {
                news.push(`📞 Keep up your call hygiene — ${totalCalls} calls this month!`)
              }
            } else {
              news.push(`📞 Start making calls to improve your hygiene!`)
            }
          } catch {
            news.push(`📞 Keep up your call hygiene — every call counts!`)
          }
        }

        // 5. MHL/MHO reminder (for both L2 and SELLER)
        try {
          const view = role === 'L2' ? 'team' : 'mine'
          const mhlRes = await fetch(`/api/mhl?email=${encodeURIComponent(email)}&role=${role}&view=${view}`)
          const mhlData = await mhlRes.json()
          if (Array.isArray(mhlData)) {
            const mhlCount = mhlData.filter((l: any) => l.mhl_mho === 'MHL').length
            const mhoCount = mhlData.filter((l: any) => l.mhl_mho === 'MHO').length
            if (mhlCount > 0 || mhoCount > 0) {
              news.push(`⚠️ ${mhlCount} MHL | ${mhoCount} MHO — Check MHL/MHO tab`)
            }
          }
        } catch {}

        // Remove duplicates
        const uniqueNews = [...new Set(news)]
        setItems(uniqueNews)

      } catch (error) {
        console.error('ThrillNews error:', error)
        // Fallback news if API fails
        setItems([
          '🏆 Keep pushing towards your goals!',
          '📞 Maintain your call hygiene daily',
          '⚠️ Check your MHL/MHO leads'
        ])
      }
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