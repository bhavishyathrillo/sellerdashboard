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

  const today = new Date().toISOString().split('T')[0]

  // Get seller's required daily from srs_raw
const { data: srsData } = await supabase
  .from('srs_raw')
  .select('required_daily_monthly, bottomline_goal_monthly, should_have_been_monthly, actual_achieved_monthly, goal_achieved_percent')
  .eq('seller_email', email.toLowerCase())
  .maybeSingle()

  const required = srsData?.required_daily_monthly || 0

  // Get settings for deadline
  const { data: settings } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'pipeline_deadline')
    .single()

  const deadline = settings?.value || '11:00'
  const [dh, dm] = deadline.split(':').map(Number)
  const now = new Date()
  const past_deadline = now.getHours() > dh || (now.getHours() === dh && now.getMinutes() >= dm)

  // Check today's submission
const { data: todayRow } = await supabase
  .from('pipeline_submissions')
  .select('*')
  .eq('seller_email', email.toLowerCase())
  .eq('date', today)
  .maybeSingle()

  const todayStatus = {
    submitted: !!todayRow,
    pipeline_value: todayRow?.pipeline_value,
    status: todayRow?.status,
    submitted_at: todayRow?.submitted_at,
    required_daily: required,
    deadline,
    past_deadline
  }

  // Get history
  let query = supabase
    .from('pipeline_submissions')
    .select('*')
    .order('date', { ascending: false })
    .limit(60)

  if (view === 'team' && ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(role || '')) {
    if (role === 'L2') {
      const { data: team } = await supabase
        .from('srs_raw')
        .select('seller_email')
        .eq('l2_email', email)
      const emails = (team || []).map(t => t.seller_email).filter(e => e.toLowerCase() !== email.toLowerCase())
      if (emails.length > 0) query = query.in('seller_email', emails)
      else query = query.eq('seller_email', '__none__')
    } else if (role === 'L1') {
      const { data: team } = await supabase
        .from('srs_raw')
        .select('seller_email')
        .eq('l1_email', email)
      const emails = (team || []).map(t => t.seller_email).filter(e => e.toLowerCase() !== email.toLowerCase())
      if (emails.length > 0) query = query.in('seller_email', emails)
      else query = query.eq('seller_email', '__none__')
    }
  } else {
    query = query.eq('seller_email', email.toLowerCase())
  }

  const { data: history } = await query

  return NextResponse.json({ today: todayStatus, history: history || [] })
}

export async function POST(req: Request) {
  const { email, pipeline_value } = await req.json()

  if (!email || !pipeline_value) {
    return NextResponse.json({ error: 'Email and value required' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Check already submitted
  const { data: existing } = await supabase
    .from('pipeline_submissions')
    .select('id')
    .eq('seller_email', email.toLowerCase())
    .eq('date', today)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Pipeline already submitted and frozen for today.' },
      { status: 400 }
    )
  }

  // Get required daily
const { data: srsData } = await supabase
  .from('srs_raw')
  .select('required_daily_monthly, bottomline_goal_monthly, should_have_been_monthly, actual_achieved_monthly, goal_achieved_percent')
  .eq('seller_email', email.toLowerCase())
  .single()

  const required = srsData?.required_daily_monthly || 0
  const status = pipeline_value >= required ? 'GREEN' : 'RED'

  // Insert
  const { error } = await supabase
    .from('pipeline_submissions')
    .insert({
      date: today,
      seller_email: email.toLowerCase(),
      pipeline_value,
      required_daily: required,
      status,
      submitted_at: new Date().toISOString()
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  await supabase.from('audit_log').insert({
    email,
    action: 'SUBMIT_PIPELINE',
    detail: `${pipeline_value} (${status})`,
    created_at: new Date().toISOString()
  })

return NextResponse.json({ success: true, status, required })
}