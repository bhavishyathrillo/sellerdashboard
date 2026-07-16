'use client'

import React, { useEffect, useState, useRef } from 'react'
import { UserSession } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'
import { Camera, Save, Loader2, User } from 'lucide-react'
import { useCachedFetch } from '@/hooks/useCachedFetch'
import styles from './ProfilePage.module.css' // We'll create this or just use inline/global CSS

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.prf {
  font-family: 'Inter', -apple-system, sans-serif;
  max-width: 600px;
  margin: 40px auto;
  padding: 32px;
  background: rgba(20,20,20,0.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  color: #E8E4DD;
  animation: prfIn 0.5s ease;
}

@keyframes prfIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }

.prf-hdr {
  text-align: center;
  margin-bottom: 32px;
}
.prf-hdr h1 {
  font-size: 1.8rem; font-weight: 800; margin: 0 0 8px 0;
  background: linear-gradient(135deg, #F4631E, #F59E0B); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.prf-hdr p { color: #8A8278; font-size: 0.9rem; margin: 0; }

.prf-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}
.prf-avatar-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 2px dashed rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}
.prf-avatar-wrapper:hover {
  border-color: #F4631E;
}
.prf-avatar-wrapper img {
  width: 100%; height: 100%; object-fit: cover;
}
.prf-avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.prf-avatar-wrapper:hover .prf-avatar-overlay {
  opacity: 1;
}

.prf-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.prf-grp {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.prf-lbl {
  font-size: 0.75rem; color: #8A8278; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;
}
.prf-inp {
  background: rgba(18,18,18,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; 
  padding: 12px 16px; color: #E8E4DD; font-size: 0.95rem; font-family: 'Inter', sans-serif; outline: none;
  transition: border 0.2s;
}
.prf-inp:focus { border-color: #F4631E; }
.prf-inp:disabled { opacity: 0.5; cursor: not-allowed; }

.prf-btn {
  background: #F4631E; color: #fff; border: none; padding: 14px; border-radius: 10px;
  font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px;
}
.prf-btn:hover:not(:disabled) { background: #e05315; transform: translateY(-1px); }
.prf-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.prf-back {
  background: transparent; border: none; color: #8A8278; font-size: 0.9rem;
  display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 0;
  margin-bottom: 24px; transition: color 0.2s; font-family: 'Inter', sans-serif;
}
.prf-back:hover { color: #fff; }
`

export default function ProfilePage({ session, onBack }: { session: UserSession, onBack: () => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [displayName, setDisplayName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: fetchedData, loading: isFetching } = useCachedFetch(`/api/profile?email=${encodeURIComponent(session.email)}`)

  useEffect(() => {
    if (isFetching) {
      setLoading(true)
    } else if (fetchedData) {
      if (fetchedData.success && fetchedData.data) {
        setDisplayName(fetchedData.data.display_name || '')
        setMobileNumber(fetchedData.data.mobile_number || '')
        setAvatarUrl(fetchedData.data.avatar_url || '')
      }
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [fetchedData, isFetching])

  const fetchProfile = async () => {
    // legacy function kept for compatibility if called directly
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          display_name: displayName,
          mobile_number: mobileNumber,
          avatar_url: avatarUrl
        })
      })
      const json = await res.json()
      if (json.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        // Dispatch an event to update the sidebar instantly
        window.dispatchEvent(new CustomEvent('profile-updated', { 
          detail: { display_name: displayName, avatar_url: avatarUrl } 
        }))
      } else {
        alert(json.error || 'Failed to save profile')
      }
    } catch (e: any) {
      alert(e.message)
    }
    setSaving(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.email.split('@')[0]}-${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setAvatarUrl(publicUrlData.publicUrl)
    } catch (e: any) {
      alert('Error uploading image: ' + e.message)
    }
    setUploading(false)
  }

  if (loading) {
    return <div style={{ color: '#fff', textAlign: 'center', padding: '50px' }}><Loader2 className="animate-spin mx-auto" /></div>
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="prf">
        <button className="prf-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Dashboard
        </button>

        <div className="prf-hdr">
          <h1>My Profile</h1>
          <p>Update your personal information and photo.</p>
        </div>

        <div className="prf-avatar-section">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <div className="prf-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
            {uploading ? (
              <Loader2 className="animate-spin text-gray-400" />
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" />
            ) : (
              <User size={40} color="#6A6258" />
            )}
            {!uploading && (
              <div className="prf-avatar-overlay">
                <Camera color="#fff" size={24} />
              </div>
            )}
          </div>
          <p style={{ marginTop: '12px', fontSize: '0.8rem', color: '#8A8278' }}>
            Click to {avatarUrl ? 'change' : 'upload'} photo
          </p>
        </div>

        <form className="prf-form" onSubmit={handleSave}>
          <div className="prf-grp">
            <label className="prf-lbl">Email Address</label>
            <input type="text" className="prf-inp" value={session.email} disabled />
          </div>

          <div className="prf-grp">
            <label className="prf-lbl">Display Name</label>
            <input 
              type="text" 
              className="prf-inp" 
              placeholder="e.g. Bhavishya" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
            />
          </div>

          <div className="prf-grp">
            <label className="prf-lbl">Mobile Number</label>
            <input 
              type="tel" 
              className="prf-inp" 
              placeholder="+91..." 
              value={mobileNumber} 
              onChange={e => setMobileNumber(e.target.value)} 
            />
          </div>

          <button 
            type="submit" 
            className="prf-btn" 
            disabled={saving || uploading}
            style={saved ? { background: '#10B981' } : {}}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : saved ? 'Saved Successfully!' : 'Save Profile'}
          </button>
        </form>
      </div>
    </>
  )
}
