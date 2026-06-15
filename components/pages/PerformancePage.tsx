'use client'
import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './PerformancePage.module.css'

interface Props { session: UserSession }

function fmt(n: number) { if (!n && n !== 0) return '₹0'; if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`; return `₹${n.toFixed(2)}` }

function Particles() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {[...Array(10)].map((_,i)=>(<div key={i} style={{position:'absolute',top:'110%',left:`${Math.random()*100}%`,color:'#C9A84C',fontSize:`${0.5+Math.random()*0.7}rem`,opacity:0.12,animation:`rise ${5+Math.random()*6}s linear infinite`,animationDelay:`${Math.random()*6}s`}}>{['✦','◈','◇','◆'][Math.floor(Math.random()*4)]}</div>))}
      <style>{`@keyframes rise{0%{transform:translateY(0)rotate(0);opacity:0}10%{opacity:0.5}90%{opacity:0.2}100%{transform:translateY(-110vh)rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

function SellerStats({ data, fmt }: { data: any; fmt: any }) {
  const pct = data.pct || data.goal_achieved_percent || 0
  const goal = data.goal || data.bottomline_goal_monthly || 0
  const achieved = data.achieved || data.actual_achieved_monthly || 0
  const required = data.required || data.required_daily_monthly || 0
  const shb = data.shb || data.should_have_been_monthly || 0
  const shbDiff = achieved - shb
  const aboveShb = shbDiff >= 0
  const weeks = data.weeks || [1,2,3,4].map((w:number)=>({week:w, goal:data[`week_${w}_goal`]||0, achieved:data[`week_${w}_achieved`]||0, shb:data[`should_have_been_week_${w}`]||data[`week_${w}_shb`]||0}))

  const maxBarVal = Math.max(...weeks.map((w:any)=>Math.max(w.shb||0,w.achieved||0)),1)

  return (
    <div className={styles.statsWrap}>
      <div className={styles.stats}>
        <div className={styles.stat}><span>Goal</span><strong>{fmt(goal)}</strong></div>
        <div className={styles.stat}><span>Achieved</span><strong style={{color:aboveShb?'#22C55E':'#EF4444'}}>{fmt(achieved)}</strong><span className={styles.hint} style={{color:aboveShb?'#22C55E':'#EF4444'}}>{aboveShb?`↑ ${fmt(shbDiff)} above SHB`:`↓ ${fmt(Math.abs(shbDiff))} below SHB`}</span></div>
        <div className={styles.stat}><span>Required</span><strong>{fmt(required)}</strong></div>
        <div className={styles.stat}><span>SHB</span><strong>{fmt(shb)}</strong></div>
      </div>
      <div className={styles.pctSection}>
        <div className={styles.pctBar}><div className={styles.pctFill} style={{width:`${Math.min(pct,100)}%`}}/></div>
        <p className={styles.pctText}>{pct.toFixed(1)}% of goal</p>
      </div>

      {weeks.length > 0 && (
        <div className={styles.trendChart}>
          <div className={styles.chartHeader}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:4}}>
              <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
            </svg>
            <span>SHB vs Achieved</span>
            <span className={styles.chartHeaderSub}>Weekly</span>
          </div>
          <div className={styles.weekBarChart}>
            <div className={styles.chartYAxis}>
              <span>{maxBarVal.toFixed(2)}</span>
              <span>0</span>
            </div>
            <div className={styles.chartBars}>
              {weeks.map((w:any, i:number) => {
                const shbH = ((w.shb||0)/maxBarVal)*80
                const achH = ((w.achieved||0)/maxBarVal)*80
                return (
                  <div key={i} className={styles.weekBarGroup}>
                    <div className={styles.weekBars}>
                      <div className={styles.barGreen} style={{height:`${Math.max(shbH,2)}px`}} data-tip={`SHB: ${(w.shb||0).toFixed(2)}`}/>
                      <div className={styles.barRed} style={{height:`${Math.max(achH,2)}px`}} data-tip={`Achieved: ${(w.achieved||0).toFixed(2)}`}/>
                    </div>
                    <span className={styles.barLabel}>W{w.week}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className={styles.trendLegend}>
            <span><span className={styles.legendDot} style={{background:'#22C55E'}}/> SHB</span>
            <span><span className={styles.legendDot} style={{background:'#EF4444'}}/> Achieved</span>
          </div>
        </div>
      )}

      {weeks.length>0&&(
        <div className={styles.weeks}><h2>Weekly Breakdown</h2>
          <div className={styles.weekGrid}>{weeks.map((w:any)=>{
            const wpct=w.goal>0?(w.achieved/w.goal)*100:0
            return <div key={w.week} className={styles.weekCard}>
              <div className={styles.weekHeader}><span>Week {w.week}</span><span className={styles.weekPct}>{wpct.toFixed(0)}%</span></div>
              <div className={styles.weekRow}><span>Goal</span><span>{fmt(w.goal)}</span></div>
              <div className={styles.weekRow}><span>Achieved</span><span style={{color:'#F4631E'}}>{fmt(w.achieved)}</span></div>
              <div className={styles.weekBar}><div className={styles.weekBarFill} style={{width:`${Math.min(wpct,100)}%`}}/></div>
            </div>
          })}</div>
        </div>
      )}
    </div>
  )
}

function SellerCard({ s, fmt }: { s: any; fmt: any }) {
  const [expanded, setExpanded] = useState(false)
  const pct = s.goal_achieved_percent || 0
  const achieved = s.actual_achieved_monthly || 0
  const shb = s.should_have_been_monthly || 0
  const aboveShb = achieved >= shb

  return (
    <div className={`${styles.sellerCard} ${aboveShb?styles.sellerAbove:styles.sellerBelow}`}>
      <div className={styles.sellerCardHeader} onClick={()=>setExpanded(!expanded)}>
        <span className={styles.sellerCardName}>{s.seller_name}<span className={`${styles.sellerBadge} ${aboveShb?styles.badgeAbove:styles.badgeBelow}`}>{aboveShb?'↑ Above SHB':'↓ Below SHB'}</span></span>
        <div className={styles.sellerBar}><div className={styles.sellerBarFill} style={{width:`${Math.min(pct,100)}%`,background:aboveShb?'#22C55E':'#F4631E'}}/></div>
        <span className={styles.sellerPct} style={{color:aboveShb?'#22C55E':'#F4631E'}}>{pct.toFixed(1)}%</span>
        <span className={styles.sellerAmt}>{fmt(achieved)}</span>
        <span className={styles.expandIcon}>{expanded?'▲':'▼'}</span>
      </div>
      {expanded && <div className={styles.sellerExpanded}><SellerStats data={s} fmt={fmt} /></div>}
    </div>
  )
}

export default function PerformancePage({ session }: Props) {
  const [data, setData] = useState<any>(null)
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my')

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/seller/overview?email=${encodeURIComponent(session.email)}`)
        const json = await res.json()
        if (res.ok && json && !json.error) setData(json.myMonthly || json)
        if (isManager) {
          const teamRes = await fetch(`/api/seller/team-performance?email=${encodeURIComponent(session.email)}&role=${session.role}`)
          const teamJson = await teamRes.json()
          if (teamRes.ok) setTeamData(teamJson)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [session.email, session.role])

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!data) return <div className={styles.empty}>No performance data found</div>

  const team = teamData?.team || []
  const avgGoal = team.length>0?team.reduce((a:any,b:any)=>a+(b.bottomline_goal_monthly||0),0)/team.length:0
  const avgAch = team.length>0?team.reduce((a:any,b:any)=>a+(b.actual_achieved_monthly||0),0)/team.length:0
  const avgReq = team.length>0?team.reduce((a:any,b:any)=>a+(b.required_daily_monthly||0),0)/team.length:0
  const avgShb = team.length>0?team.reduce((a:any,b:any)=>a+(b.should_have_been_monthly||0),0)/team.length:0
  const avgPct = team.length>0?team.reduce((a:any,b:any)=>a+(b.goal_achieved_percent||0),0)/team.length:0
  const shbDiff = avgAch - avgShb

  return (
    <div className={styles.page}>
      <Particles />
      <div className={styles.header}>
        <h1 className={styles.title}>↗ Performance</h1>
        {isManager && (
          <div className={styles.viewToggle}>
            <button className={`${styles.toggleBtn} ${viewMode==='my'?styles.toggleActive:''}`} onClick={()=>setViewMode('my')}>My Stats</button>
            <button className={`${styles.toggleBtn} ${viewMode==='team'?styles.toggleActive:''}`} onClick={()=>setViewMode('team')}>My Team</button>
          </div>
        )}
      </div>

      {viewMode === 'my' && <SellerStats data={data} fmt={fmt} />}

      {viewMode === 'team' && teamData && (
        <div className={styles.teamSection}>
          <div className={styles.teamKpiWrap}>
            <div className={styles.teamKpiHeader}><h3 className={styles.groupTitle}>📊 TEAM AVERAGE</h3><span className={styles.teamCount}>{teamData.totalSellers} sellers</span></div>
            <div className={styles.stats}>
              <div className={`${styles.stat} ${styles.statPct}`}><span>Avg %</span><strong style={{color:'#C9A84C'}}>{avgPct.toFixed(1)}%</strong></div>
              <div className={styles.stat}><span>Goal</span><strong>{fmt(avgGoal)}</strong></div>
              <div className={styles.stat}><span>Achieved</span><strong style={{color:shbDiff>=0?'#22C55E':'#EF4444'}}>{fmt(avgAch)}</strong></div>
              <div className={styles.stat}><span>SHB</span><strong>{fmt(avgShb)}</strong></div>
              <div className={styles.stat}><span>Required</span><strong>{fmt(avgReq)}</strong></div>
              <div className={`${styles.stat} ${shbDiff>=0?styles.statSuccess:styles.statDanger}`}><span>vs SHB</span><strong style={{color:shbDiff>=0?'#22C55E':'#EF4444'}}>{shbDiff>=0?`+${fmt(shbDiff)}`:fmt(shbDiff)}</strong></div>
            </div>
            <div className={styles.pctSection}><div className={styles.pctBar}><div className={styles.pctFill} style={{width:`${Math.min(avgPct,100)}%`}}/></div><p className={styles.pctText}>{avgPct.toFixed(1)}% avg of goal</p></div>
          </div>

          {teamData.type==='L2' && teamData.l1Groups?.map((group:any)=>(
            <div key={group.l1_name} className={styles.groupCard}>
              <h3 className={styles.groupTitle}>👤 {group.l1_name} <span className={styles.groupCount}>({group.sellers.length})</span></h3>
              {group.l1_performance && <div className={styles.l1PerfCard}><span className={styles.l1PerfLabel}>L1: {group.l1_performance.pct?.toFixed(1)}%</span><span>{fmt(group.l1_performance.achieved)} / {fmt(group.l1_performance.goal)}</span></div>}
              {group.sellers.map((s:any)=><SellerCard key={s.seller_email} s={s} fmt={fmt} />)}
            </div>
          ))}

          {teamData.type==='L1' && (
            <div className={styles.groupCard}><h3 className={styles.groupTitle}>My Team <span className={styles.groupCount}>({teamData.totalSellers})</span></h3>{team.map((s:any)=><SellerCard key={s.seller_email} s={s} fmt={fmt} />)}</div>
          )}
        </div>
      )}
    </div>
  )
}