import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  try {
    const today = new Date()
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const dateFrom = fmt(firstOfMonth)
    const dateTo = fmt(today)

    const { data, error } = await supabase
      .from('efficiency_2')
      .select('*')
      .eq('seller_email', email.toLowerCase().trim())
      .gte('call_date', dateFrom)
      .lte('call_date', dateTo)
      .order('call_date', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [], {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=59'
    }
  })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
