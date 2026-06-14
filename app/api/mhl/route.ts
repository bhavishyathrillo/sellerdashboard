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

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  let query = supabase.from('mhl_mho').select('*').order('updated_at', { ascending: false })

  if (view === 'team' && ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(role || '')) {
    if (role === 'L1') {
      query = query.eq('l1', email)
    } else if (role === 'L2') {
      query = query.eq('l2', email)
    }
    // ADMIN sees all
  } else {
    // Seller or My Leads view
    query = query.eq('owner_email', email)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}