'use client'

import { useState } from 'react'
import IntroScreen from '@/components/ui/IntroScreen'
import LoginForm from '@/components/auth/LoginForm'

type AppState = 'intro' | 'login' | 'dashboard'

export default function Home() {
  const [state, setState] = useState<AppState>('intro')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const handleIntroComplete = () => setState('login')

  const handleLogin = (email: string) => {
    setUserEmail(email)
    setState('dashboard')
  }

  return (
    <>
      {state === 'intro' && (
        <IntroScreen onComplete={handleIntroComplete} />
      )}

      {state === 'login' && (
        <LoginForm onLogin={handleLogin} />
      )}

      {state === 'dashboard' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
          background: '#080808',
          fontFamily: 'Inter, sans-serif'
        }}>
          <p style={{ color: '#5A5650', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Signed in as
          </p>
          <p style={{ color: '#F4631E', fontSize: '1rem' }}>{userEmail}</p>
          <p style={{ color: '#3A3632', fontSize: '0.75rem', marginTop: '8px' }}>
            Dashboard coming next
          </p>
        </div>
      )}
    </>
  )
}