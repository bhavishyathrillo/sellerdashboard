import React, { useEffect, useState } from 'react'

export default function FarewellMessage({ onProceed }: { onProceed: () => void }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px', overflow: 'hidden',
      opacity: mounted ? 1 : 0, transition: 'opacity 1s ease-in-out',
      perspective: '1000px'
    }}>
      {/* Blurred Background Image */}
      <div style={{
        position: 'absolute', inset: -50,
        background: 'url(/farewell.jpg) center/cover no-repeat',
        filter: 'blur(40px) brightness(0.25)',
        transform: mounted ? 'scale(1)' : 'scale(1.1)',
        transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)'
      }} />

      {/* Golden Particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(40)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            background: '#FFF',
            borderRadius: '50%',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            opacity: Math.random() * 0.3 + 0.1,
            boxShadow: '0 0 10px rgba(255,255,255,0.8)',
            animation: `float ${Math.random() * 10 + 10}s linear infinite`,
            animationDelay: `-${Math.random() * 10}s`
          }} />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes slideInRight {
          from { transform: translateX(60px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes dropInPolaroid {
          from { transform: translateY(-80px) rotate(-12deg) scale(1.1); opacity: 0; box-shadow: 0 0 0 rgba(0,0,0,0); }
          to { transform: translateY(0) rotate(-4deg) scale(1); opacity: 1; box-shadow: 0 40px 100px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.5); }
        }
        @keyframes hoverPolaroid {
          0% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-10px) rotate(-3deg); }
          100% { transform: translateY(0) rotate(-4deg); }
        }
        .polaroid-img {
          animation: dropInPolaroid 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .polaroid-img-wrapper {
          animation: hoverPolaroid 6s ease-in-out infinite;
          animation-delay: 1.2s;
        }
      `}</style>

      {/* Main Content Layout */}
      <div style={{
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '50px',
        width: '100%',
        maxWidth: '1150px',
        zIndex: 10
      }}>
        
        {/* Left: Polaroid Photo */}
        <div className="polaroid-img-wrapper" style={{ flex: '0 1 500px', minWidth: '350px' }}>
          <div className="polaroid-img" style={{
            background: '#FFF',
            padding: '16px 16px 70px 16px',
            borderRadius: '4px',
            opacity: 0, // starts hidden until animation
          }}>
            <img src="/farewell.jpg" alt="Farewell Team" style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '2px',
              border: '1px solid rgba(0,0,0,0.1)'
            }} />
            <div style={{
              color: '#333',
              fontFamily: '"Caveat", "Segoe Script", "Comic Sans MS", cursive',
              fontSize: '2.2rem',
              textAlign: 'center',
              marginTop: '15px',
              position: 'absolute',
              bottom: '15px',
              width: 'calc(100% - 32px)',
              fontWeight: 600,
              opacity: 0.8
            }}>
              Marketing Team '26
            </div>
          </div>
        </div>

        {/* Right: Glassmorphism Text Card */}
        <div style={{
          flex: '1 1 500px',
          background: 'rgba(20, 18, 15, 0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          padding: '45px 50px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'slideInRight 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          animationDelay: '0.3s',
          opacity: 0
        }}>
          <h1 style={{ 
            fontSize: '3rem', color: '#FFF', marginBottom: '24px', 
            fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em',
          }}>
            Thank You,<br/>
            <span style={{ 
              background: 'linear-gradient(135deg, #D4AF37 0%, #FFF2CD 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              Thrillophilia!
            </span>
          </h1>
          
          <div style={{ color: '#E8E4DD', fontSize: '1.05rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFF' }}>To the entire Marketing Team,</p>
            <p>
              Thank you for making these past few months so memorable. We came here as interns, but we're leaving with amazing memories, valuable learnings, and bonds that feel like family. You never treated us like interns—you treated us like your own, and we'll always be grateful for that.
            </p>
            <p>
              We'll truly miss the fun, the chai breaks, the laughs, and working with such an incredible team. Thank you for all the guidance, support, and unforgettable moments. Wishing you all the very best, and we hope to meet again soon!
            </p>
            <p style={{ color: '#F3E5AB', fontSize: '1.15rem', marginTop: '10px' }}>
              <em>Nitish Bhaiya, keyword ROI theek kar dunga... aap tension mat lo. 😄❤️</em>
            </p>
          </div>

          <div style={{ marginTop: '40px' }}>
            <button onClick={onProceed} style={{ 
              background: 'rgba(255,255,255,0.1)', 
              color: '#FFF', padding: '14px 36px', borderRadius: '40px', 
              fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', 
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
            onMouseOver={(e) => { 
              e.currentTarget.style.background = '#FFF'; 
              e.currentTarget.style.color = '#000';
              e.currentTarget.style.transform = 'translateY(-3px)'; 
              e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)'; 
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; 
              e.currentTarget.style.color = '#FFF';
              e.currentTarget.style.transform = 'translateY(0)'; 
              e.currentTarget.style.boxShadow = 'none'; 
            }}
            >
              Continue to Dashboard 
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>&rarr;</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
