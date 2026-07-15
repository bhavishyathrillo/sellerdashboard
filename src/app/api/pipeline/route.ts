import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const role = searchParams.get('role')
  const view = searchParams.get('view')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Add 5.5 hours (19800000 ms) to get IST date string
  const today = new Date(Date.now() + 19800000).toISOString().split('T')[0]

  // Setup queries for parallel execution
  const srsPromise = supabase
    .from('srs_raw')
    .select('required_daily_monthly, bottomline_goal_monthly, should_have_been_monthly, actual_achieved_monthly, goal_achieved_percent, defined_goal')
    .eq('seller_email', email.toLowerCase())
    .maybeSingle()

  const settingsPromise = supabase
    .from('settings')
    .select('value')
    .eq('key', 'pipeline_deadline')
    .single()

  const todayRowPromise = supabase
    .from('pnr_pipeline_submissions')
    .select('*')
    .eq('seller_email', email.toLowerCase())
    .eq('date', today)
    .maybeSingle()

  let teamPromise: any = Promise.resolve({ data: [] })
  if (view === 'team' && ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(role || '')) {
    if (role === 'L2') {
      teamPromise = supabase.from('srs_raw').select('seller_email').eq('l2_email', email)
    } else if (role === 'L1') {
      teamPromise = supabase.from('srs_raw').select('seller_email').eq('l1_email', email)
    }
  }

  // Execute first wave in parallel
  const [
    { data: srsData },
    { data: settings },
    { data: todayRow },
    { data: team }
  ] = await Promise.all([srsPromise, settingsPromise, todayRowPromise, teamPromise])

  const required = srsData?.required_daily_monthly || 0
  const is_bottomline_focus_srs = (srsData?.defined_goal === 'Bottomline')

  const deadline = settings?.value || '11:00'
  const [dh, dm] = deadline.split(':').map(Number)
  const now = new Date()
  const past_deadline = now.getHours() > dh || (now.getHours() === dh && now.getMinutes() >= dm)

  const todayStatus = {
    submitted: !!todayRow,
    pnrs: todayRow?.pnrs || [],
    is_bottomline_focus: is_bottomline_focus_srs,
    status: todayRow?.status,
    submitted_at: todayRow?.created_at,
    required_daily: required,
    deadline,
    past_deadline
  }

  // Get history
  let query = supabase
    .from('pnr_pipeline_submissions')
    .select('*')
    .order('date', { ascending: false })
    .limit(60)

  if (view === 'team' && ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(role || '')) {
    const emails = (team || []).map((t: any) => t.seller_email).filter((e: string) => e.toLowerCase() !== email.toLowerCase())
    if (emails.length > 0) query = query.in('seller_email', emails)
    else query = query.eq('seller_email', '__none__')
  } else {
    query = query.eq('seller_email', email.toLowerCase())
  }

  const { data: history } = await query

  const mappedHistory = (history || []).map(h => ({
    ...h,
    required_daily: h.daily_required
  }))

  return NextResponse.json({ today: todayStatus, history: mappedHistory })
}

export async function POST(req: Request) {
  const { email, pnrs } = await req.json()

  if (!email || !pnrs || !Array.isArray(pnrs)) {
    return NextResponse.json({ error: 'Email and PNR array required' }, { status: 400 })
  }

  // Add 5.5 hours (19800000 ms) to get IST date string
  const today = new Date(Date.now() + 19800000).toISOString().split('T')[0]

  // Check already submitted
  const { data: existing } = await supabase
    .from('pnr_pipeline_submissions')
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

  // Get required daily and defined goal
  const { data: srsData } = await supabase
    .from('srs_raw')
    .select('required_daily_monthly, defined_goal')
    .eq('seller_email', email.toLowerCase())
    .single()

  const required = srsData?.required_daily_monthly || 0
  const is_bottomline_focus = srsData?.defined_goal === 'Bottomline'
  
  // Calculate total to determine status
  let total_pipeline = 0;
  for (const p of pnrs) {
      total_pipeline += is_bottomline_focus ? (Number(p.bottomline_value) || 0) : (Number(p.topline_value) || 0);
  }
  
  const status = total_pipeline >= required ? 'GREEN' : 'RED'

  // Insert
  const { error } = await supabase
    .from('pnr_pipeline_submissions')
    .upsert({
      seller_email: email.toLowerCase(),
      date: today,
      pnrs,
      daily_required: Math.round(required),
      is_bottomline_focus,
      status,
      created_at: new Date().toISOString()
    }, { onConflict: 'seller_email, date' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Action tracking
  await supabase.from('user_action_logs').insert({
    user_email: email,
    action_type: 'PIPELINE_SUBMIT',
    metadata: { is_bottomline_focus, total_pipeline, status, required, pnrs_count: pnrs.length },
    created_at: new Date().toISOString()
  })

  return NextResponse.json({ success: true, status, required })
}