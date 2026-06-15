'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './AdminPage.module.css'

interface Props { session: UserSession }

export default function AdminPage({ session }: Props) {
  const [roles, setRoles] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'roles' | 'audit' | 'settings'>('roles')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('SELLER')

  useEffect(() => {
    if (activeTab === 'roles') loadRoles()
    if (activeTab === 'audit') loadAudit()
  }, [activeTab])

  async function loadRoles() {
    const res = await fetch('/api/admin/roles')
    const data = await res.json()
    if (res.ok) setRoles(data || [])
  }

  async function loadAudit() {
    const res = await fetch('/api/admin/audit')
    const data = await res.json()
    if (res.ok) setAuditLogs(data || [])
  }

  async function addRole(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail) return
    await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, role: newRole, addedBy: session.email })
    })
    setNewEmail('')
    loadRoles()
  }

  async function deleteRole(email: string) {
    await fetch('/api/admin/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    loadRoles()
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>⊛ Admin Panel</h1>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'roles' ? styles.tabActive : ''}`} onClick={() => setActiveTab('roles')}>Roles</button>
        <button className={`${styles.tab} ${activeTab === 'audit' ? styles.tabActive : ''}`} onClick={() => setActiveTab('audit')}>Audit Log</button>
        <button className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
      </div>

      {activeTab === 'roles' && (
        <div>
          <form onSubmit={addRole} className={styles.addForm}>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@thrillophilia.com" className={styles.input} required />
            <select value={newRole} onChange={e => setNewRole(e.target.value)} className={styles.select}>
              <option value="ADMIN">Admin</option>
              <option value="MODERATOR">Moderator</option>
              <option value="L1">L1 Manager</option>
              <option value="L2">L2 Manager</option>
              <option value="SELLER">Seller</option>
            </select>
            <button type="submit" className={styles.btn}>Add</button>
          </form>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Email</th><th>Role</th><th>Added By</th><th>Action</th></tr></thead>
              <tbody>
                {roles.map((r: any) => (
                  <tr key={r.id}><td>{r.email}</td><td>{r.role}</td><td>{r.added_by}</td>
                    <td><button onClick={() => deleteRole(r.email)} className={styles.delBtn}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Time</th><th>Email</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>
              {auditLogs.map((l: any) => (
                <tr key={l.id}><td>{new Date(l.created_at).toLocaleString()}</td><td>{l.email}</td><td>{l.action}</td><td>{l.detail}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className={styles.empty}>Settings coming soon</div>
      )}
    </div>
  )
}