import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const date = searchParams.get('date')

  if (!email || !date) {
    return NextResponse.json({ submitted: false }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=59'
    }
  })
  }

  const { data } = await supabase
    .from('pnr_pipeline_submissions')
    .select('id')
    .eq('seller_email', email.toLowerCase())
    .eq('date', date)
    .maybeSingle()

  return NextResponse.json({ submitted: !!data })
}