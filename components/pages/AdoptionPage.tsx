'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { UserSession } from '@/lib/session'
import { X, Search, Clock, AlertCircle } from 'lucide-react'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.adp {
  font-family: 'Inter', -apple-system, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px;
  color: #E8E4DD;
  animation: adpIn 0.5s ease;
}

@keyframes adpIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }

/* Accordion for Daily Breakdown */
.adp-daily-section {
  margin-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 15px;
}
.adp-daily-title {
  font-size: 0.9rem;
  color: #fff;
  margin-bottom: 10px;
  font-weight: 500;
}
.adp-day-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
}
.adp-day-hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  cursor: pointer;
}
.adp-day-hdr:hover {
  background: rgba(255,255,255,0.05);
}
.adp-day-date {
  font-size: 0.85rem;
  color: #E8E4DD;
  font-weight: 500;
}
.adp-day-time {
  font-size: 0.8rem;
  color: #F4631E;
}
.adp-day-body {
  padding: 0 15px 10px;
  border-top: 1px solid rgba(255,255,255,0.05);
  margin-top: 5px;
  padding-top: 10px;
}
.adp-day-tab-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #8E8E93;
  padding: 4px 0;
}

.adp-hdr {
  display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 24px;
}
.adp-title h1 {
  font-size: 1.8rem; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 8px 0;
  background: linear-gradient(135deg, #F4631E, #F59E0B); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.adp-title p { color: #8A8278; font-size: 0.85rem; margin: 0; }

.adp-filters { display: flex; gap: 12px; align-items: center; }
.adp-date-grp { display: flex; flex-direction: column; gap: 4px; }
.adp-date-lbl { font-size: 0.65rem; color: #6A6258; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
.adp-date-inp { 
  background: rgba(18,18,18,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; 
  padding: 8px 12px; color: #E8E4DD; font-size: 0.8rem; font-family: 'Inter', sans-serif; outline: none;
}
.adp-date-inp::-webkit-calendar-picker-indicator {
  filter: invert(1) brightness(100);
  cursor: pointer;
}
.adp-date-inp:focus { border-color: #F4631E; }
.adp-btn {
  background: #F4631E; color: #fff; border: none; padding: 9px 20px; border-radius: 8px;
  font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; align-self: flex-end;
}
.adp-btn:hover { background: #e05315; transform: translateY(-1px); }
.adp-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.adp-section { margin-bottom: 40px; }
.adp-sec-hdr { 
  font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; color: #fff; 
  display: flex; align-items: center; gap: 8px;
}
.adp-sec-count {
  background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;
}

/* Inactive Grid */
.adp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.adp-card { 
  background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px;
  padding: 14px; display: flex; flex-direction: column; gap: 4px;
}
.adp-card-name { font-weight: 600; font-size: 0.9rem; color: #EF4444; }
.adp-card-role { font-size: 0.7rem; color: #8A8278; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }

/* Active Table */
.adp-tbl-wrap { 
  background: rgba(14,14,14,0.7); border: 1px solid rgba(255,255,255,0.06); 
  border-radius: 12px; overflow: hidden;
}
.adp-tbl { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.adp-tbl th { 
  text-align: left; padding: 12px 16px; font-size: 0.65rem; color: #8A8278; 
  text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}
.adp-tbl td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); color: #C0B9B0; }
.adp-tbl tbody tr { transition: background 0.2s; cursor: pointer; }
.adp-tbl tbody tr:hover { background: rgba(255,255,255,0.04); }
.adp-time { font-weight: 600; color: #3B82F6; font-variant-numeric: tabular-nums; }
.adp-role-badge {
  display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 0.65rem; font-weight: 700;
  background: rgba(255,255,255,0.1); color: #fff;
}
.role-L1 { background: rgba(139, 92, 246, 0.2); color: #C4B5FD; }
.role-L2 { background: rgba(59, 130, 246, 0.2); color: #93C5FD; }
.role-ADMIN { background: rgba(245, 158, 11, 0.2); color: #FCD34D; }

/* Modal */
.adp-modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; animation: adpFade 0.2s; }
.adp-modal {
  background: #1A1A1A; width: 400px; border-radius: 12px; padding: 24px;
  border: 1px solid rgba(255,255,255,0.1); position: relative;
  max-height: 85vh; overflow-y: auto;
}
.adp-modal::-webkit-scrollbar { width: 6px; }
.adp-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.adp-modal-close { position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #8A8278; cursor: pointer; padding: 4px; border-radius: 50%; transition: background 0.2s; }
.adp-modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.adp-modal-hdr { margin-bottom: 20px; }
.adp-modal-hdr h3 { margin: 0 0 4px 0; font-size: 1.2rem; }
.adp-modal-hdr p { margin: 0; font-size: 0.8rem; color: #8A8278; }

.adp-tab-list { display: flex; flex-direction: column; gap: 8px; }
.adp-tab-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; }
.adp-tab-name { font-size: 0.85rem; font-weight: 500; }
.adp-tab-val { font-size: 0.85rem; font-weight: 600; color: #3B82F6; font-variant-numeric: tabular-nums; }

@keyframes adpFade { from { opacity: 0; } to { opacity: 1; } }
`

interface AdoptionUser {
  name: string
  email: string
  role: string
  totalTime?: number
  tabs?: Record<string, number>
  daily?: Record<string, { totalTime: number, tabs: Record<string, number> }>
}

// Format seconds into HH:MM:SS or Minutes
function formatTime(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatRole(role: string) {
  if (role === 'L1') return 'Category Manager'
  if (role === 'L2') return 'Team Lead'
  return role
}

export default function AdoptionPage({ session }: { session: UserSession }) {
  const [fromDate, setFromDate] = useState('2026-07-13')
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ activeUsers: AdoptionUser[], inactiveUsers: AdoptionUser[] } | null>(null)
  
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdoptionUser | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/adoption?from=${fromDate}&to=${toDate}&email=${encodeURIComponent(session.email)}&role=${session.role}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        alert(json.error || 'Failed to fetch adoption data')
      }
    } catch (e: any) {
      alert(e.message)
    }
    setLoading(false)
  }

  // Fetch on mount
  useEffect(() => {
    fetchData()
  }, [])

  const activeFiltered = useMemo(() => {
    if (!data) return []
    if (!search) return data.activeUsers
    const s = search.toLowerCase()
    return data.activeUsers.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
  }, [data, search])

  const inactiveFiltered = useMemo(() => {
    if (!data) return []
    if (!search) return data.inactiveUsers
    const s = search.toLowerCase()
    return data.inactiveUsers.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
  }, [data, search])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="adp">
        
        <div className="adp-hdr">
          <div className="adp-title">
            <h1>Platform Adoption</h1>
            <p>Track time spent on the dashboard across the organization.</p>
          </div>
          
          <div className="adp-filters">
            <div className="adp-date-grp">
              <span className="adp-date-lbl">From</span>
              <input type="date" className="adp-date-inp" min="2026-07-13" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="adp-date-grp">
              <span className="adp-date-lbl">To</span>
              <input type="date" className="adp-date-inp" min="2026-07-13" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <button className="adp-btn" onClick={fetchData} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Data'}
            </button>
          </div>
        </div>

        {data && (
          <>
            {/* INACTIVE USERS */}
            <div className="adp-section">
              <div className="adp-sec-hdr">
                <AlertCircle size={20} color="#EF4444" />
                No Login Activity
                <span className="adp-sec-count">{inactiveFiltered.length} Users</span>
              </div>
              
              {inactiveFiltered.length > 0 ? (
                <div className="adp-grid">
                  {inactiveFiltered.map(u => (
                    <div key={u.email} className="adp-card">
                      <div className="adp-card-name">{u.name}</div>
                      <div className="adp-card-role">{formatRole(u.role)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#8A8278', fontSize: '0.85rem' }}>Everyone logged in during this period! 🎉</p>
              )}
            </div>

            {/* ACTIVE USERS */}
            <div className="adp-section">
              <div className="adp-sec-hdr" style={{ justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} color="#3B82F6" />
                  Active Users
                  <span className="adp-sec-count">{activeFiltered.length} Users</span>
                </div>
                <div>
                  <input 
                    type="text" 
                    placeholder="Search name or email..." 
                    className="adp-date-inp" 
                    style={{ width: '250px' }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="adp-tbl-wrap">
                <table className="adp-tbl">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th style={{ textAlign: 'right' }}>Total Time Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeFiltered.map(u => (
                      <tr key={u.email} onClick={() => setSelectedUser(u)}>
                        <td style={{ fontWeight: 500, color: '#fff' }}>{u.name}</td>
                        <td style={{ fontSize: '0.75rem' }}>{u.email}</td>
                        <td>
                          <span className={`adp-role-badge role-${u.role}`}>{formatRole(u.role)}</span>
                        </td>
                        <td style={{ textAlign: 'right' }} className="adp-time">
                          {formatTime(u.totalTime || 0)}
                        </td>
                      </tr>
                    ))}
                    {activeFiltered.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#8A8278' }}>
                          No active users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>

      {/* MODAL */}
      {selectedUser && (
        <div className="adp-modal-ov" onClick={() => { setSelectedUser(null); setExpandedDate(null); }}>
          <div className="adp-modal" onClick={e => e.stopPropagation()}>
            <button className="adp-modal-close" onClick={() => { setSelectedUser(null); setExpandedDate(null); }}><X size={18} /></button>
            <div className="adp-modal-hdr">
              <h3>{selectedUser.name}</h3>
              <p>{formatRole(selectedUser.role)} • {formatTime(selectedUser.totalTime || 0)} Total</p>
            </div>
            
            <div className="adp-tab-list">
              {Object.entries(selectedUser.tabs || {})
                .sort((a, b) => b[1] - a[1]) // Sort by time desc
                .map(([tab, time]) => (
                <div key={tab} className="adp-tab-row">
                  <span className="adp-tab-name">{tab}</span>
                  <span className="adp-tab-val">{formatTime(time)}</span>
                </div>
              ))}
              {(!selectedUser.tabs || Object.keys(selectedUser.tabs).length === 0) && (
                <p style={{ textAlign: 'center', color: '#8A8278', fontSize: '0.85rem' }}>No tab data recorded.</p>
              )}
            </div>

            {selectedUser.daily && Object.keys(selectedUser.daily).length > 0 && (
              <div className="adp-daily-section">
                <h4 className="adp-daily-title">Daily Breakdown</h4>
                {Object.entries(selectedUser.daily).sort((a, b) => b[0].localeCompare(a[0])).map(([date, stats]) => (
                  <div key={date} className="adp-day-card">
                    <div className="adp-day-hdr" onClick={() => setExpandedDate(expandedDate === date ? null : date)}>
                      <span className="adp-day-date">{date}</span>
                      <span className="adp-day-time">{formatTime(stats.totalTime)}</span>
                    </div>
                    {expandedDate === date && (
                      <div className="adp-day-body">
                        {Object.entries(stats.tabs).map(([t, tTime]) => (
                          <div key={t} className="adp-day-tab-item">
                            <span>{t}</span>
                            <span>{formatTime(tTime as number)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
