import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const role = searchParams.get('role')
  const view = searchParams.get('view')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // ── Resolve which seller emails are in scope ────────────────────────
  let scopeEmails: string[] | null = null // null = individual only

  if (view === 'team' && ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(role || '')) {
    let srsPromise: any = Promise.resolve({ data: [] })
    if (role === 'L1') {
      srsPromise = supabase.from('srs_raw').select('seller_email').eq('l1_email', email)
    } else if (role === 'L2') {
      srsPromise = supabase.from('srs_raw').select('seller_email').eq('l2_email', email)
    }

    const todayStr = new Date(Date.now() + 19800000).toISOString().split('T')[0]
    const mhlDailyPromise = supabase.schema('seller_day_to_day').from('mhl_daily')
      .select('seller_email, available_today')
      .eq('activity_date', todayStr)
      .limit(1000)

    const [ { data }, { data: mhlDailyRaw } ] = await Promise.all([srsPromise, mhlDailyPromise])

    if (role === 'L1' || role === 'L2') {
      scopeEmails = (data || []).map((s: any) => s.seller_email).filter((e: string) => e.toLowerCase() !== email.toLowerCase())
    }

    if (scopeEmails) {
      const absentSellers = new Set((mhlDailyRaw || [])
        .filter((r: any) => r.available_today === false || r.available_today === 'false')
        .map((r: any) => (r.seller_email || '').toLowerCase().trim()))
        
      const isSunday = new Date(Date.now() + 19800000).getDay() === 0
      
      if (isSunday) {
        scopeEmails = []
      } else {
        scopeEmails = scopeEmails.filter((e: string) => !absentSellers.has(e.toLowerCase().trim()))
      }
    }
  }

  // ── Scope helper ────────────────────────────────────────────────────
  function applyScope<T extends object>(q: any, emailCol: string): any {
    if (scopeEmails !== null) {
      return scopeEmails.length > 0 ? q.in(emailCol, scopeEmails) : q.eq(emailCol, '__none__')
    }
    return q.eq(emailCol, email)
  }

  // ── Parallel Paginate mishandled leads and total open leads ────────
  async function fetchAllConcurrent(baseQuery: any): Promise<any[]> {
    let all: any[] = []
    let from = 0
    let hasMore = true
    const maxConcurrency = 1 // Avoid overwhelming the Supabase connection pool
    const pageSize = 1000

    while (hasMore) {
      const promises = []
      for (let i = 0; i < maxConcurrency; i++) {
        promises.push(baseQuery.range(from, from + pageSize - 1))
        from += pageSize
      }
      const chunks = await Promise.all(promises)
      for (const { data, error } of chunks) {
        if (error) throw error
        if (data && data.length > 0) {
          all = all.concat(data)
          if (data.length < pageSize) hasMore = false
        } else {
          hasMore = false
        }
      }
      if (!hasMore) break
    }
    return all
  }

  const baseMishandled = applyScope(supabase.from('mhl_mho').select('*').ilike('mhl_mho', '%mishandled%').order('updated_at', { ascending: false }), 'owner_email')
  const baseOpen = applyScope(supabase.from('mhl_mho').select('owner_email').not('stage', 'ilike', '%closed%').order('id', { ascending: true }), 'owner_email')

  const [allData, allOpen] = await Promise.all([
    fetchAllConcurrent(baseMishandled),
    fetchAllConcurrent(baseOpen)
  ])

  // ── Build open count map keyed by owner_email ───────────────────────
  const openCountMap: Record<string, number> = {}
  allOpen.forEach((r: any) => {
    const e = (r.owner_email || '').toLowerCase().trim()
    if (e) openCountMap[e] = (openCountMap[e] || 0) + 1
  })
  const totalOpenLeads = Object.values(openCountMap).reduce((s, n) => s + n, 0)

  // ── 3) Attach seller names to each lead ────────────────────────────
  if (allData.length > 0) {
    const emails = [...new Set(allData.map(d => d.owner_email).filter(Boolean))]
    const { data: sellers } = await supabase.from('srs_raw').select('seller_email, seller_name').in('seller_email', emails)
    const nameMap: Record<string, string> = {}
    sellers?.forEach(s => { nameMap[(s.seller_email || '').toLowerCase().trim()] = s.seller_name })
    allData.forEach(d => {
      const key = (d.owner_email || '').toLowerCase().trim()
      ;(d as any).seller_name = nameMap[key] || d.owner_email?.split('@')[0]
      ;(d as any).owner_open_leads = openCountMap[key] || 0
    })
  }

  return NextResponse.json({ leads: allData, totalOpenLeads, openCountMap })
}