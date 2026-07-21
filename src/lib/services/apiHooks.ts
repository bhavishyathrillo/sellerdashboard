'use client'

import { useCachedFetch } from '@/hooks/useCachedFetch'

export function useAdminMHL() {
  return useCachedFetch('/api/admin/mhl', { bypassCache: true })
}

export function useAdminOverview() {
  return useCachedFetch('/api/admin/overview', { bypassCache: true })
}

export function useAdminLTA(dateFrom: string, category: string) {
  const params = new URLSearchParams({ date: dateFrom })
  if (category !== 'All Categories') params.set('category', category)
  return useCachedFetch(`/api/admin/lta?${params}`, { bypassCache: true })
}

export function useAdminHygiene() {
  return useCachedFetch('/api/admin/hygiene', { bypassCache: true })
}

export function useAdminPipeline() {
  return useCachedFetch('/api/admin/pipeline', { bypassCache: true })
}

export function useAdoption(fromDate: string, toDate: string, email: string, role: string) {
  return useCachedFetch(`/api/admin/adoption?from=${fromDate}&to=${toDate}&email=${encodeURIComponent(email)}&role=${role}`, { bypassCache: true })
}

export function useAdminPerformance() {
  return useCachedFetch('/api/admin/performance', { bypassCache: true })
}

export function useMHL(email: string, role: string, selectedTl: string, view: string, teamId: string | null) {
  const params = new URLSearchParams({ email, role, view })
  if (selectedTl) params.set('tl_name', selectedTl)
  if (teamId) params.set('team_id', teamId)
  return useCachedFetch(`/api/mhl?${params}`)
}

export function usePipeline(email: string, role: string, selectedTl: string, view: string, teamId: string | null) {
  const params = new URLSearchParams({ email, role, view })
  if (selectedTl) params.set('tl_name', selectedTl)
  if (teamId) params.set('team_id', teamId)
  return useCachedFetch(`/api/pipeline?${params}`)
}

export function usePriorityLeads(email: string, role: string, view: string) {
  const params = new URLSearchParams({ email, role, view })
  return useCachedFetch(`/api/priority-leads?${params}`)
}

export function useSellerTeam(email: string, role: string) {
  return useCachedFetch(`/api/seller/team?email=${encodeURIComponent(email)}&role=${role}`)
}

export function useSellerProfile(email: string) {
  return useCachedFetch(`/api/profile?email=${encodeURIComponent(email)}`)
}

export function useSellerLeaderboard(email: string, category: string) {
  const params = new URLSearchParams({ email })
  if (category !== 'All Categories') params.set('category', category)
  return useCachedFetch(`/api/seller/leaderboard?${params}`)
}

export function useL1Rewards(email: string) {
  return useCachedFetch(`/api/seller/l1-rewards?email=${encodeURIComponent(email)}`)
}

export function useSellerRewards(email: string) {
  return useCachedFetch(`/api/seller/rewards?email=${encodeURIComponent(email)}`)
}
