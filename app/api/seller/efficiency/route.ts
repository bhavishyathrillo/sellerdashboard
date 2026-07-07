import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      .from('efficiency')
      .select('*')
      .eq('seller_email', email.toLowerCase().trim())
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: true })
      

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}