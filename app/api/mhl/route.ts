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

  let query = supabase.from('mhl_mho').select('*').eq('mhl_mho', 'Mishandled').order('updated_at', { ascending: false })

  if (view === 'team' && ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(role || '')) {
    if (role === 'L1') {
      const { data: teamSellers } = await supabase.from('srs_raw').select('seller_email').eq('l1_email', email)
      const emails = (teamSellers || []).map(s => s.seller_email).filter(e => e.toLowerCase() !== email.toLowerCase())
      if (emails.length > 0) query = query.in('owner_email', emails)
      else query = query.eq('owner_email', '__none__')
    } else if (role === 'L2') {
      const { data: teamSellers } = await supabase.from('srs_raw').select('seller_email').eq('l2_email', email)
      const emails = (teamSellers || []).map(s => s.seller_email).filter(e => e.toLowerCase() !== email.toLowerCase())
      if (emails.length > 0) query = query.in('owner_email', emails)
      else query = query.eq('owner_email', '__none__')
    }
  } else {
    query = query.eq('owner_email', email)
  }

  // 🔥 Fetch ALL rows using pagination
  let allData: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const start = page * pageSize
    const end = (page + 1) * pageSize - 1

    const { data: chunk, error } = await query.range(start, end)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!chunk || chunk.length === 0) {
      hasMore = false
    } else {
      allData = allData.concat(chunk)
      if (chunk.length < pageSize) {
        hasMore = false
      } else {
        page++
      }
    }
  }

  // Add seller names
  if (allData.length > 0) {
    const emails = [...new Set(allData.map(d => d.owner_email).filter(Boolean))]
    const { data: sellers } = await supabase.from('srs_raw').select('seller_email, seller_name').in('seller_email', emails)
    const nameMap: any = {}
    sellers?.forEach(s => { nameMap[s.seller_email] = s.seller_name })
    allData.forEach(d => { (d as any).seller_name = nameMap[d.owner_email] || d.owner_email?.split('@')[0] })
  }

  return NextResponse.json(allData || [])
}