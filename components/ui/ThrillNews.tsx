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

        // Top performer
        const top = leaderboard?.[0]
        if (top) news.push(`🏆 ${top.seller_name} leads the company — ${(top.goal_achieved_percent||0).toFixed(1)}% achieved!`)

        // Pipeline check - NOT for L1
        if (role !== 'L1') {
          try {
            const today = new Date().toISOString().split('T')[0]
            const pipelineCheck = await fetch(`/api/pipeline/check?email=${encodeURIComponent(email)}&date=${today}`).then(r=>r.json())
            if (pipelineCheck?.submitted) {
              news.push(`✅ Pipeline submitted for today`)
            } else {
              news.push(`⏰ You haven't submitted pipeline today — Deadline: 11:00 AM`)
            }
          } catch {
            news.push(`⏰ Submit your pipeline for today`)
          }
        }

        // ===== L1 MANAGER =====
        if (role === 'L1') {
          // Load L1 team data for accurate stats
          try {
            const l1Res = await fetch(`/api/seller/l1-team?email=${encodeURIComponent(email)}`).then(r=>r.json())
            if (l1Res?.teamTotals) {
              news.push(`📊 Team: ${l1Res.teamTotals.pct.toFixed(1)}% · ${l1Res.totalSellers} sellers · ${l1Res.l2Groups?.length || 0} L2 managers`)
            }
          } catch {}
          
          const mhlCount = mhlData.filter((l:any)=>l.mhl_mho==='MHL').length
          const mhoCount = mhlData.filter((l:any)=>l.mhl_mho==='MHO').length
          if (mhlCount > 0 || mhoCount > 0) {
            news.push(`⚠️ Team: ${mhlCount} MHL | ${mhoCount} MHO — Check MHL/MHO tab`)
          }
          
          // Check team pipeline submissions
          try {
            const today = new Date().toISOString().split('T')[0]
            const pipelineRes = await fetch(`/api/pipeline?email=${encodeURIComponent(email)}&role=L1&view=team`).then(r=>r.json())
            const todaySubs = (pipelineRes?.history || []).filter((h: any) => h.date?.startsWith(today))
            const submittedToday = todaySubs.length
            const totalTeam = l1Res?.totalSellers || 0
            news.push(`📋 Pipeline: ${submittedToday}/${totalTeam} submitted today`)
          } catch {}
        }

        // ===== L2 MANAGER =====
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

        // ===== L1 (continued) =====
        if (role === 'L1') {
          const mhlCount = mhlData.filter((l:any)=>l.mhl_mho==='MHL').length
          const mhoCount = mhlData.filter((l:any)=>l.mhl_mho==='MHO').length
          if (mhlCount > 0 || mhoCount > 0) {
            news.push(`👤 Team leads: ${mhlCount} MHL | ${mhoCount} MHO`)
          }
        }

        // ===== SELLER =====
        if (role === 'SELLER') {
          const pct = m.pct || m.goal_achieved_percent || 0
          const gapToSpin = 100 - pct
          if (gapToSpin > 0) news.push(`🎰 ${gapToSpin.toFixed(1)}% away from unlocking Premium Spin!`)
          else news.push(`🎉 Goal crushed! Go spin the wheel!`)
          news.push(`📞 Keep up your call hygiene — every call counts!`)
        }

        // Common MHL/MHO reminder
        const mhlCount = mhlData.filter((l:any)=>l.mhl_mho==='MHL').length
        const mhoCount = mhlData.filter((l:any)=>l.mhl_mho==='MHO').length
        if (role !== 'L1' && (mhlCount > 0 || mhoCount > 0)) {
          news.push(`⚠️ ${mhlCount} MHL | ${mhoCount} MHO — Check MHL/MHO tab`)
        }

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