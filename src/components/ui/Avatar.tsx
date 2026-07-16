'use client'
import React from 'react'
import { useCachedFetch } from '@/hooks/useCachedFetch'

interface AvatarProps {
  name: string
  email?: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

function getInitials(name: string) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getAvatarColor(name: string) {
  const colors = ['#F4631E','#C9A84C','#22C55E','#3B82F6','#A78BFA','#EC4899','#14B8A6','#F97316']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

export default function Avatar({ name, email, size = 30, className, style }: AvatarProps) {
  const color = getAvatarColor(name || 'Unknown')
  const initials = getInitials(name || 'Unknown')
  
  // Try to load avatars from cache
  const { data: avatars } = useCachedFetch('/api/seller/avatars')
  
  // Determine if we have a photo
  let photoUrl: string | null = null
  if (avatars) {
    if (email && avatars[email.toLowerCase()]) {
      photoUrl = avatars[email.toLowerCase()]
    } else if (name && avatars[name.toLowerCase().trim()]) {
      photoUrl = avatars[name.toLowerCase().trim()]
    }
  }

  // Common styling for both image and initials
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...style
  }

  if (photoUrl) {
    return (
      <img 
        src={photoUrl} 
        alt={name} 
        className={className}
        style={{
          ...baseStyle,
          objectFit: 'cover',
          border: `1.5px solid ${color}44`
        }} 
      />
    )
  }

  return (
    <span 
      className={className}
      style={{
        ...baseStyle,
        background: color + '22',
        color: color,
        border: `1.5px solid ${color}44`,
        fontSize: size * 0.37,
        fontWeight: 700
      }}
    >
      {initials}
    </span>
  )
}
