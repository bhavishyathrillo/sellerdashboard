const fs = require('fs')

const code = `
'use client'

import { useEffect, useState } from 'react'
import React from 'react'
import styles from './HomePage.module.css'

function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  if (n >= 100000) return \`₹\${(n / 100000).toFixed(1)}L\`
  if (n >= 1000) return \`₹\${(n / 1000).toFixed(1)}K\`
  return \`₹\${n.toFixed(0)}\`
}

export default function AdminOverviewPage() {
  const [apiData, setApiData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCms, setExpandedCms] = useState<Record<string, boolean>>({})
  const [expandedTls, setExpandedTls] = useState<Record<string, boolean>>({})
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(r => r.json())
      .then(d => { 
        setApiData(d)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className={styles.loadingWrap}><div className={styles.spinner}/><p>Loading...</p></div>
  )

  const l1Data = apiData?.l1_data || []

  // Global KPIs calculation
  let globalBlGoal = 0, globalBlShb = 0, globalBlAch = 0
  let globalTlGoal = 0, globalTlShb = 0, globalTlAch = 0

  const processedData = l1Data.map((l1: any) => {
    let cmBlGoal = 0, cmTlGoal = 0, cmTotalGoal = 0, cmShb = 0, cmAch = 0
    
    const l2_groups = (l1.l2_groups || []).map((l2: any) => {
      let tlBlGoal = 0, tlTlGoal = 0, tlTotalGoal = 0, tlShb = 0, tlAch = 0
      
      const regionsMap: Record<string, any[]> = {}
      l2.sellers?.forEach((s: any) => {
        const region = s.region || 'Unknown Region'
        if (!regionsMap[region]) regionsMap[region] = []
        regionsMap[region].push(s)
      })

      const regions = Object.keys(regionsMap).map(regionName => {
        let regBlGoal = 0, regTlGoal = 0, regTotalGoal = 0, regShb = 0, regAch = 0
        const sellers = regionsMap[regionName].map((s: any) => {
          const goalType = (s.defined_goal || '').toLowerCase()
          const g = s.goal || 0
          const ach = s.achieved || 0
          const shb = s.shb || 0
          
          let sBlGoal = 0, sTlGoal = 0
          
          if (goalType.includes('bottomline')) {
            sBlGoal = g
            regBlGoal += g
            tlBlGoal += g
            globalBlGoal += g
            globalBlShb += shb
            globalBlAch += ach
          } else if (goalType.includes('topline')) {
            sTlGoal = g
            regTlGoal += g
            tlTlGoal += g
            globalTlGoal += g
            globalTlShb += shb
            globalTlAch += ach
          }
          
          regTotalGoal += g
          regAch += ach
          regShb += shb
          
          return {
            ...s,
            blGoal: sBlGoal,
            tlGoal: sTlGoal,
            totalGoal: g,
            shb: shb,
            ach: ach
          }
        })
        
        tlTotalGoal += regTotalGoal
        tlAch += regAch
        tlShb += regShb
        
        return {
          regionName,
          id: \`\${l2.l2_email}-\${regionName}\`,
          sellers,
          blGoal: regBlGoal,
          tlGoal: regTlGoal,
          totalGoal: regTotalGoal,
          shb: regShb,
          ach: regAch
        }
      })
      
      cmBlGoal += tlBlGoal
      cmTlGoal += tlTlGoal
      cmTotalGoal += tlTotalGoal
      cmShb += tlShb
      cmAch += tlAch
      
      return {
        ...l2,
        regions,
        blGoal: tlBlGoal,
        tlGoal: tlTlGoal,
        totalGoal: tlTotalGoal,
        shb: tlShb,
        ach: tlAch
      }
    })
    
    return {
      ...l1,
      l2_groups,
      blGoal: cmBlGoal,
      tlGoal: cmTlGoal,
      totalGoal: cmTotalGoal,
      shb: cmShb,
      ach: cmAch
    }
  })

  const toggleCm = (email: string) => setExpandedCms(prev => ({ ...prev, [email]: !prev[email] }))
  const toggleTl = (email: string) => setExpandedTls(prev => ({ ...prev, [email]: !prev[email] }))
  const toggleRegion = (id: string) => setExpandedRegions(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className={styles.page} style={{maxWidth:'1100px',margin:'0 auto',padding:'20px'}}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 style={{fontSize:'1.4rem',fontWeight:700,color:'#C9A84C'}}>Admin Overview</h1>
          <p style={{fontSize:'0.72rem',color:'#8A8278'}}>
            {processedData.length} Category Managers
          </p>
        </div>
      </div>

      <div style={{marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
        <div style={{display: 'flex', gap: '12px'}}>
          <div style={{flex: 1, background: '#141414', border: '1px solid rgba(244,99,30,0.3)', borderRadius: '12px', padding: '16px'}}>
            <div style={{fontSize: '0.75rem', color: '#8A8278', marginBottom: '4px'}}>BL Goal</div>
            <div style={{fontSize: '1.2rem', fontWeight: 700, color: '#F0EDE8'}}>{fmt(globalBlGoal)}</div>
          </div>
          <div style={{flex: 1, background: '#141414', border: '1px solid rgba(244,99,30,0.3)', borderRadius: '12px', padding: '16px'}}>
            <div style={{fontSize: '0.75rem', color: '#8A8278', marginBottom: '4px'}}>BL SHB</div>
            <div style={{fontSize: '1.2rem', fontWeight: 700, color: '#F0EDE8'}}>{fmt(globalBlShb)}</div>
          </div>
          <div style={{flex: 1, background: '#141414', border: '1px solid rgba(244,99,30,0.3)', borderRadius: '12px', padding: '16px'}}>
            <div style={{fontSize: '0.75rem', color: '#8A8278', marginBottom: '4px'}}>BL Achieved</div>
            <div style={{fontSize: '1.2rem', fontWeight: 700, color: '#F4631E'}}>{fmt(globalBlAch)}</div>
          </div>
        </div>

        <div style={{display: 'flex', gap: '12px'}}>
          <div style={{flex: 1, background: '#141414', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '16px'}}>
            <div style={{fontSize: '0.75rem', color: '#8A8278', marginBottom: '4px'}}>TL Goal</div>
            <div style={{fontSize: '1.2rem', fontWeight: 700, color: '#F0EDE8'}}>{fmt(globalTlGoal)}</div>
          </div>
          <div style={{flex: 1, background: '#141414', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '16px'}}>
            <div style={{fontSize: '0.75rem', color: '#8A8278', marginBottom: '4px'}}>TL SHB</div>
            <div style={{fontSize: '1.2rem', fontWeight: 700, color: '#F0EDE8'}}>{fmt(globalTlShb)}</div>
          </div>
          <div style={{flex: 1, background: '#141414', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '16px'}}>
            <div style={{fontSize: '0.75rem', color: '#8A8278', marginBottom: '4px'}}>TL Achieved</div>
            <div style={{fontSize: '1.2rem', fontWeight: 700, color: '#22C55E'}}>{fmt(globalTlAch)}</div>
          </div>
        </div>
      </div>

      <div style={{background:'#141414', border:'1px solid #232323', borderRadius:'12px', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.75rem'}}>
          <thead>
            <tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)'}}>
              <th style={{padding:'12px 14px', textAlign:'left', color:'#8A8278', fontWeight: 600}}>Entity</th>
              <th style={{padding:'12px 14px', textAlign:'right', color:'#8A8278', fontWeight: 600}}>BL Goal</th>
              <th style={{padding:'12px 14px', textAlign:'right', color:'#8A8278', fontWeight: 600}}>TL Goal</th>
              <th style={{padding:'12px 14px', textAlign:'right', color:'#8A8278', fontWeight: 600}}>Goal (Total)</th>
              <th style={{padding:'12px 14px', textAlign:'right', color:'#8A8278', fontWeight: 600}}>Goal SHB</th>
              <th style={{padding:'12px 14px', textAlign:'right', color:'#8A8278', fontWeight: 600}}>Achieved</th>
            </tr>
          </thead>
          <tbody>
            {processedData.map((cm: any) => (
              <React.Fragment key={cm.l1_email}>
                <tr 
                  onClick={() => toggleCm(cm.l1_email)} 
                  style={{borderBottom:'1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: expandedCms[cm.l1_email] ? 'rgba(255,255,255,0.02)' : 'transparent'}}
                >
                  <td style={{padding:'10px 14px', fontWeight: 600, color: '#C9A84C'}}>
                    <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedCms[cm.l1_email] ? 'rotate(90deg)' : 'none' }}>▶</span>
                    {cm.l1_name}
                  </td>
                  <td style={{padding:'10px 14px', textAlign:'right'}}>{fmt(cm.blGoal)}</td>
                  <td style={{padding:'10px 14px', textAlign:'right'}}>{fmt(cm.tlGoal)}</td>
                  <td style={{padding:'10px 14px', textAlign:'right', fontWeight: 600}}>{fmt(cm.totalGoal)}</td>
                  <td style={{padding:'10px 14px', textAlign:'right'}}>{fmt(cm.shb)}</td>
                  <td style={{padding:'10px 14px', textAlign:'right', color:'#22C55E', fontWeight: 600}}>{fmt(cm.ach)}</td>
                </tr>

                {expandedCms[cm.l1_email] && cm.l2_groups.map((tl: any) => (
                  <React.Fragment key={tl.l2_email}>
                    <tr 
                      onClick={() => toggleTl(tl.l2_email)}
                      style={{borderBottom:'1px solid rgba(255,255,255,0.03)', background: 'rgba(0,0,0,0.2)', cursor: 'pointer'}}
                    >
                      <td style={{padding:'10px 14px', paddingLeft: '32px', color: '#F0EDE8', fontWeight: 500}}>
                        <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTls[tl.l2_email] ? 'rotate(90deg)' : 'none' }}>▶</span>
                        {tl.l2_name}
                      </td>
                      <td style={{padding:'10px 14px', textAlign:'right'}}>{fmt(tl.blGoal)}</td>
                      <td style={{padding:'10px 14px', textAlign:'right'}}>{fmt(tl.tlGoal)}</td>
                      <td style={{padding:'10px 14px', textAlign:'right', fontWeight: 600}}>{fmt(tl.totalGoal)}</td>
                      <td style={{padding:'10px 14px', textAlign:'right'}}>{fmt(tl.shb)}</td>
                      <td style={{padding:'10px 14px', textAlign:'right', color:'#22C55E', fontWeight: 600}}>{fmt(tl.ach)}</td>
                    </tr>

                    {expandedTls[tl.l2_email] && tl.regions.map((reg: any) => (
                      <React.Fragment key={reg.id}>
                        <tr 
                          onClick={() => toggleRegion(reg.id)}
                          style={{borderBottom:'1px solid rgba(255,255,255,0.02)', background: 'rgba(255,255,255,0.01)', cursor: 'pointer'}}
                        >
                          <td style={{padding:'8px 14px', paddingLeft: '48px', color: '#8A8278'}}>
                            <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedRegions[reg.id] ? 'rotate(90deg)' : 'none' }}>▶</span>
                            {reg.regionName}
                          </td>
                          <td style={{padding:'8px 14px', textAlign:'right', color: '#8A8278'}}>{fmt(reg.blGoal)}</td>
                          <td style={{padding:'8px 14px', textAlign:'right', color: '#8A8278'}}>{fmt(reg.tlGoal)}</td>
                          <td style={{padding:'8px 14px', textAlign:'right', color: '#8A8278'}}>{fmt(reg.totalGoal)}</td>
                          <td style={{padding:'8px 14px', textAlign:'right', color: '#8A8278'}}>{fmt(reg.shb)}</td>
                          <td style={{padding:'8px 14px', textAlign:'right', color: '#22C55E'}}>{fmt(reg.ach)}</td>
                        </tr>

                        {expandedRegions[reg.id] && reg.sellers.map((s: any) => (
                          <tr key={s.seller_email} style={{borderBottom:'1px dashed rgba(255,255,255,0.02)'}}>
                            <td style={{padding:'6px 14px', paddingLeft: '64px', color: '#6A6258', fontSize: '0.7rem'}}>
                              {s.seller_name}
                            </td>
                            <td style={{padding:'6px 14px', textAlign:'right', color: '#6A6258', fontSize: '0.7rem'}}>{fmt(s.blGoal)}</td>
                            <td style={{padding:'6px 14px', textAlign:'right', color: '#6A6258', fontSize: '0.7rem'}}>{fmt(s.tlGoal)}</td>
                            <td style={{padding:'6px 14px', textAlign:'right', color: '#6A6258', fontSize: '0.7rem'}}>{fmt(s.totalGoal)}</td>
                            <td style={{padding:'6px 14px', textAlign:'right', color: '#6A6258', fontSize: '0.7rem'}}>{fmt(s.shb)}</td>
                            <td style={{padding:'6px 14px', textAlign:'right', color: '#1B9C49', fontSize: '0.7rem'}}>{fmt(s.ach)}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
`
fs.writeFileSync('components/pages/AdminOverviewPage.tsx', code)
