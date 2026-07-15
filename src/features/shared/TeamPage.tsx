'use client'
import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './TeamPage.module.css'
import Loader from '@/components/ui/Loader'
import { useCachedFetch } from '@/hooks/useCachedFetch'

interface Props { session: UserSession }

export default function TeamPage({ session }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const { data: fetchedData, loading: isFetching } = useCachedFetch(`/api/seller/team?email=${encodeURIComponent(session.email)}&role=${session.role}`)

  useEffect(() => {
    if (fetchedData) {
      setData(fetchedData)
      setLoading(false)
    } else if (!isFetching) {
      setLoading(false)
    }
  }, [fetchedData, isFetching])

  if (loading) return <Loader text="Loading team data..." />
  if (!data || data.error) return <div className={styles.empty}>{data?.error || 'No team data'}</div>

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>⊛ Team View</h1>

      <div className={styles.stats}>
        <div className={styles.stat}><span>Members</span><strong>{data.count}</strong></div>
        <div className={styles.stat}><span>Team Goal</span><strong>₹{(data.teamTotal?.goal || 0).toLocaleString('en-IN')}</strong></div>
        <div className={styles.stat}><span>Team Achieved</span><strong style={{color:'#22C55E'}}>₹{(data.teamTotal?.achieved || 0).toLocaleString('en-IN')}</strong></div>
        <div className={styles.stat}><span>Team %</span><strong style={{color:'#C9A84C'}}>{(data.teamTotal?.pct || 0).toFixed(1)}%</strong></div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Seller</th><th>Goal</th><th>Achieved</th><th>%</th><th>Region</th></tr></thead>
          <tbody>
            {data.members?.map((m: any) => (
              <tr key={m.seller_email}>
                <td>{m.seller_name}</td>
                <td>₹{(m.bottomline_goal_monthly || 0).toLocaleString('en-IN')}</td>
                <td style={{color:'#22C55E'}}>₹{(m.actual_achieved_monthly || 0).toLocaleString('en-IN')}</td>
                <td style={{fontWeight:700}}>{(m.goal_achieved_percent || 0).toFixed(1)}%</td>
                <td>{m.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}