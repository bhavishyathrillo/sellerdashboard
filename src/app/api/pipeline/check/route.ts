import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const date = searchParams.get('date')

  if (!email || !date) {
    return NextResponse.json({ submitted: false })
  }

  const { data } = await supabase
    .from('pnr_pipeline_submissions')
    .select('id')
    .eq('seller_email', email.toLowerCase())
    .eq('date', date)
    .maybeSingle()

  return NextResponse.json({ submitted: !!data })
}