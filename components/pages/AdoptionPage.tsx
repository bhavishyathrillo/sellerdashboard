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
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 15px;
}
.adp-daily-title {
  font-size: 0.9rem;
  color: #fff;
  margin-bottom: 10px;
  font-weight: 600;
}
.adp-day-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  transition: background 0.2s;
}
.adp-day-hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
}
.adp-day-hdr:hover {
  background: rgba(255,255,255,0.04);
}
.adp-day-date {
  font-size: 0.85rem;
  color: #E8E4DD;
  font-weight: 600;
}
.adp-day-time {
  font-size: 0.8rem;
  color: #F4631E;
  font-weight: 600;
}
.adp-day-body {
  padding: 0 16px 12px;
  border-top: 1px solid rgba(255,255,255,0.04);
  margin-top: 5px;
  padding-top: 12px;
}
.adp-day-tab-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #A19D94;
  padding: 5px 0;
}

.adp-hdr {
  display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 24px;
}
.adp-title h1 {
  font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 8px 0;
  background: linear-gradient(135deg, #F4631E 0%, #F59E0B 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(244,99,30,0.2));
}
.adp-title p { color: #A19D94; font-size: 0.9rem; margin: 0; font-weight: 500; }

.adp-filters { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }
.adp-date-grp { display: flex; flex-direction: column; gap: 6px; }
.adp-date-lbl { font-size: 0.65rem; color: #8A8278; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
.adp-date-inp { 
  background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; 
  padding: 8px 12px; color: #E8E4DD; font-size: 0.8rem; font-family: 'Inter', sans-serif; outline: none;
  height: 40px; box-sizing: border-box; transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}
.adp-date-inp::-webkit-calendar-picker-indicator {
  filter: invert(1) brightness(100); cursor: pointer; opacity: 0.6; transition: opacity 0.2s;
}
.adp-date-inp::-webkit-calendar-picker-indicator:hover { opacity: 1; }
.adp-date-inp:focus { border-color: #F4631E; box-shadow: 0 0 0 2px rgba(244,99,30,0.15); background: rgba(0,0,0,0.6); }

.adp-btn {
  background: linear-gradient(135deg, #F4631E, #D95315); color: #fff; border: none; padding: 0 22px; border-radius: 8px;
  font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease;
  height: 40px; display: flex; align-items: center; justify-content: center; white-space: nowrap; box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(244,99,30,0.2);
}
.adp-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(244,99,30,0.3); }
.adp-btn:active { transform: translateY(1px); box-shadow: 0 2px 4px rgba(244,99,30,0.2); }
.adp-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; background: #555; }

.adp-section { margin-bottom: 48px; }
.adp-sec-hdr { 
  font-size: 1.15rem; font-weight: 700; margin-bottom: 18px; color: #fff; 
  display: flex; align-items: center; gap: 10px; letter-spacing: -0.01em;
}
.adp-sec-count {
  background: rgba(255,255,255,0.08); padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; color: #E8E4DD;
  backdrop-filter: blur(4px); font-weight: 600;
}

/* Inactive Grid */
.adp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; width: 100%; }
.adp-card { 
  background: linear-gradient(145deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02)); 
  border: 1px solid rgba(239,68,68,0.15); border-radius: 12px;
  padding: 16px; display: flex; flex-direction: column; gap: 6px;
  transition: all 0.2s ease; backdrop-filter: blur(10px);
}
.adp-card:hover {
  transform: translateY(-2px);
  border-color: rgba(239,68,68,0.3);
  box-shadow: 0 6px 20px rgba(239,68,68,0.1);
}
.adp-card-name { font-weight: 600; font-size: 0.95rem; color: #FCA5A5; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.adp-card-role { font-size: 0.7rem; color: rgba(252,165,165,0.7); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }

.adp-grid-container { display: flex; flex-direction: column; gap: 20px; align-items: stretch; width: 100%; }
.adp-show-more {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #E8E4DD;
  padding: 10px 20px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease; font-family: 'Inter', sans-serif; align-self: center;
  backdrop-filter: blur(8px);
}
.adp-show-more:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); transform: translateY(-1px); }

/* Active Table */
.adp-tbl-wrap { 
  background: rgba(20,20,20,0.4); border: 1px solid rgba(255,255,255,0.05); 
  border-radius: 14px; overflow: hidden; backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.adp-tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.adp-tbl th { 
  text-align: left; padding: 14px 18px; font-size: 0.65rem; color: #8A8278; 
  text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.2);
}
.adp-tbl td { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.02); color: #D6D2CC; font-weight: 500; }
.adp-tbl tbody tr { transition: all 0.2s ease; cursor: pointer; }
.adp-tbl tbody tr:hover { background: rgba(255,255,255,0.03); }
.adp-time { font-weight: 700; color: #60A5FA; font-variant-numeric: tabular-nums; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.adp-role-badge {
  display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.65rem; font-weight: 700;
  background: rgba(255,255,255,0.08); color: #fff; letter-spacing: 0.02em;
}
.role-L1 { background: rgba(139, 92, 246, 0.15); color: #DDD6FE; border: 1px solid rgba(139,92,246,0.2); }
.role-L2 { background: rgba(59, 130, 246, 0.15); color: #BFDBFE; border: 1px solid rgba(59,130,246,0.2); }
.role-ADMIN { background: rgba(245, 158, 11, 0.15); color: #FDE68A; border: 1px solid rgba(245,158,11,0.2); }

/* Modal */
.adp-modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; animation: adpFade 0.2s; }
.adp-modal {
  background: linear-gradient(180deg, #1A1A1A 0%, #121212 100%); width: 440px; border-radius: 16px; padding: 28px;
  border: 1px solid rgba(255,255,255,0.08); position: relative;
  max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.5);
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
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0])
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ activeUsers: AdoptionUser[], inactiveUsers: AdoptionUser[] } | null>(null)
  
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState<AdoptionUser | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [showAllInactive, setShowAllInactive] = useState(false)

  const fetchData = async (overrideFrom?: string | React.MouseEvent, overrideTo?: string) => {
    setLoading(true)
    const f = typeof overrideFrom === 'string' ? overrideFrom : fromDate
    const t = typeof overrideTo === 'string' ? overrideTo : toDate
    try {
      const res = await fetch(`/api/admin/adoption?from=${f}&to=${t}&email=${encodeURIComponent(session.email)}&role=${session.role}`)
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
    let arr = data.activeUsers
    if (roleFilter !== 'ALL') {
      arr = arr.filter(u => u.role === roleFilter)
    }
    if (search) {
      const s = search.toLowerCase()
      arr = arr.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
    }
    return arr
  }, [data, search, roleFilter])

  const inactiveFiltered = useMemo(() => {
    if (!data) return []
    let arr = data.inactiveUsers
    if (roleFilter !== 'ALL') {
      arr = arr.filter(u => u.role === roleFilter)
    }
    if (search) {
      const s = search.toLowerCase()
      arr = arr.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
    }
    return arr
  }, [data, search, roleFilter])

  let availableRoles = [{label: 'All', value: 'ALL'}, {label: 'Seller', value: 'SELLER'}]
  if (session.role === 'L2') {
    availableRoles.push({label: 'Team Lead', value: 'L2'})
  } else if (session.role === 'L1') {
    availableRoles = [
      {label: 'All', value: 'ALL'}, 
      {label: 'Seller', value: 'SELLER'}, 
      {label: 'Team Lead', value: 'L2'}, 
      {label: 'Me (Category Manager)', value: 'L1'}
    ]
  } else if (session.role === 'ADMIN') {
    availableRoles = [
      {label: 'All', value: 'ALL'}, 
      {label: 'Seller', value: 'SELLER'}, 
      {label: 'Team Lead', value: 'L2'}, 
      {label: 'Category Manager', value: 'L1'},
      {label: 'Admin', value: 'ADMIN'}
    ]
  }

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
              <span className="adp-date-lbl">Search</span>
              <input 
                type="text" 
                placeholder="Name or email..." 
                className="adp-date-inp" 
                style={{ width: '220px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="adp-btn" style={{background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)'}} onClick={() => {
              const t = new Date().toISOString().split('T')[0];
              setFromDate(t);
              setToDate(t);
              fetchData(t, t);
            }}>
              Today
            </button>
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

        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
          {availableRoles.map(r => (
            <button 
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              style={{
                background: roleFilter === r.value ? 'linear-gradient(135deg, rgba(244,99,30,0.2), rgba(217,83,21,0.1))' : 'rgba(255,255,255,0.03)',
                color: roleFilter === r.value ? '#F4631E' : '#8A8278',
                border: `1px solid ${roleFilter === r.value ? 'rgba(244,99,30,0.4)' : 'rgba(255,255,255,0.05)'}`,
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                backdropFilter: 'blur(8px)',
                boxShadow: roleFilter === r.value ? '0 4px 12px rgba(244,99,30,0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (roleFilter !== r.value) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.color = '#fff'
                }
              }}
              onMouseLeave={(e) => {
                if (roleFilter !== r.value) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = '#8A8278'
                }
              }}
            >
              {r.label}
            </button>
          ))}
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
                <div className="adp-grid-container">
                  <div className="adp-grid">
                    {inactiveFiltered.slice(0, showAllInactive ? inactiveFiltered.length : 12).map(u => (
                      <div key={u.email} className="adp-card">
                        <div className="adp-card-name">{u.name}</div>
                        <div className="adp-card-role">{formatRole(u.role)}</div>
                      </div>
                    ))}
                  </div>
                  {inactiveFiltered.length > 12 && (
                    <button 
                      className="adp-show-more" 
                      onClick={() => setShowAllInactive(!showAllInactive)}
                    >
                      {showAllInactive ? 'Show Less' : `Show All ${inactiveFiltered.length} Users`}
                    </button>
                  )}
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
