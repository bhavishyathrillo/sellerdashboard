'use client'
import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './CalendarPage.module.css'

interface Props { session: UserSession }

export default function CalendarPage({ session }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pipelineData, setPipelineData] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/pipeline?email=${encodeURIComponent(session.email)}&role=${session.role}`)
      .then(r => r.json()).then(d => setPipelineData(d.history || []))
  }, [session.email])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const monthName = currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function getDayStatus(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const entry = pipelineData.find(p => p.date?.startsWith(dateStr))
    if (!entry) return null
    if (entry.status === 'GREEN') return 'green'
    if (entry.status === 'RED') return 'red'
    return null
  }

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className={styles.navBtn}>← Prev</button>
        <h2 className={styles.monthLabel}>{monthName}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className={styles.navBtn}>Next →</button>
      </div>

      <div className={styles.calendar}>
        {dayNames.map(d => <div key={d} className={styles.dayName}>{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className={styles.emptyCell} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
          const status = getDayStatus(day)
          return (
            <div key={day} className={`${styles.cell} ${isToday ? styles.today : ''} ${status ? styles[status] : ''}`}>
              <span className={styles.dayNum}>{day}</span>
              {status && <span className={`${styles.dot} ${styles[status + 'Dot']}`} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}