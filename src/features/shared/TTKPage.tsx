'use client'
import { useEffect, useState } from 'react'
import { useCachedFetch } from '@/hooks/useCachedFetch'
import Loader from '@/components/ui/Loader'
import styles from './TTKPage.module.css'

export default function TTKPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/seller/ttk').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <Loader text="Loading..." />

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>💡 Things to Know</h1>

      <div className={styles.section}>
        <h2>💰 Bottomline Incentive</h2>
        <table className={styles.table}>
          <thead><tr><th>Slab</th><th>Incentive %</th></tr></thead>
          <tbody>
            {data.bottomline?.map((r: any, i: number) => (
              <tr key={i}><td>{r.slab}</td><td style={{fontWeight:700,color:'#22C55E'}}>{r.incentive}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h2>✈️ Min Flight Adoption</h2>
        <div className={styles.grid}>
          {data.flightAdoption?.map((r: any, i: number) => (
            <div key={i} className={styles.card}>
              <span>{r.region}</span>
              <strong>{r.pct}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2>📋 MHL/MHO Rules</h2>
        <table className={styles.table}>
          <thead><tr><th>Stage</th><th>Rule</th><th>Type</th></tr></thead>
          <tbody>
            {data.mhlRules?.map((r: any, i: number) => (
              <tr key={i}><td>{r.stage}</td><td style={{fontSize:'0.75rem'}}>{r.rule}</td><td><span className={r.type==='MHL'?styles.mhl:styles.mho}>{r.type}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}