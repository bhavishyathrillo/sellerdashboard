import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const role = searchParams.get('role')
  const view = searchParams.get('view')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // ── Resolve which seller emails are in scope ────────────────────────
  let scopeEmails: string[] | null = null // null = individual only

  if (view === 'team' && ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(role || '')) {
    if (role === 'L1') {
      const { data } = await supabase.from('srs_raw').select('seller_email').eq('l1_email', email)
      scopeEmails = (data || []).map(s => s.seller_email).filter(e => e.toLowerCase() !== email.toLowerCase())
    } else if (role === 'L2') {
      const { data } = await supabase.from('srs_raw').select('seller_email').eq('l2_email', email)
      scopeEmails = (data || []).map(s => s.seller_email).filter(e => e.toLowerCase() !== email.toLowerCase())
    }

    if (scopeEmails) {
      const todayStr = new Date(Date.now() + 19800000).toISOString().split('T')[0]
      const { data: mhlDailyRaw } = await supabase.schema('seller_day_to_day').from('mhl_daily')
        .select('seller_email, available_today')
        .eq('activity_date', todayStr)
        .limit(1000)

      const absentSellers = new Set((mhlDailyRaw || [])
        .filter((r: any) => r.available_today === false || r.available_today === 'false')
        .map((r: any) => (r.seller_email || '').toLowerCase().trim()))
        
      const isSunday = new Date(Date.now() + 19800000).getDay() === 0
      
      if (isSunday) {
        scopeEmails = []
      } else {
        scopeEmails = scopeEmails.filter(e => !absentSellers.has(e.toLowerCase().trim()))
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

  // ── 1) Paginate mishandled leads from mhl_mho ───────────────────────
  let allData: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const base = supabase.from('mhl_mho').select('*').ilike('mhl_mho', '%mishandled%').order('updated_at', { ascending: false })
    const { data: chunk, error } = await applyScope(base, 'owner_email').range(page * pageSize, (page + 1) * pageSize - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!chunk || chunk.length === 0) { hasMore = false }
    else { allData = allData.concat(chunk); if (chunk.length < pageSize) hasMore = false; else page++ }
  }

  // ── 2) Paginate total open leads from mhl_mho (no mhl_mho filter) ───
  //    This is the denominator: all leads in the pipeline that aren't closed
  let allOpen: any[] = []
  let openPage = 0
  let openHasMore = true

  while (openHasMore) {
    const base = supabase.from('mhl_mho').select('owner_email').not('stage', 'ilike', '%closed%').order('id', { ascending: true })
    const { data: chunk } = await applyScope(base, 'owner_email').range(openPage * pageSize, (openPage + 1) * pageSize - 1)
    if (!chunk || chunk.length === 0) { openHasMore = false }
    else { allOpen = allOpen.concat(chunk); if (chunk.length < pageSize) openHasMore = false; else openPage++ }
  }

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