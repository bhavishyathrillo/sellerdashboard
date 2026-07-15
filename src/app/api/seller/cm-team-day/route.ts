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

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const trimmedEmail = email.toLowerCase().trim()
  const queryDate = date || new Date().toISOString().split('T')[0]

  // Step 1: Get all sellers under this CM (L1)
    const { data: _me } = await supabase.from('srs_raw').select('l1_name').eq('l1_email', trimmedEmail).limit(1).maybeSingle()
  const _myName = _me?.l1_name || ''
  
  let _query = supabase.from('srs_raw').select('*')
  if (_myName) {
    _query = _query.eq('l1_name', _myName)
  } else {
    _query = _query.eq('l1_email', trimmedEmail)
  }
  const { data: allSellers, error: sellersError } = await _query

  if (sellersError) {
    return NextResponse.json({ error: sellersError.message }, { status: 500 })
  }

  if (!allSellers || allSellers.length === 0) {
    return NextResponse.json({ l2Groups: [] })
  }

  // Ensure CM is included in his own team list (optional, but good for completeness)
  const cmSelf = allSellers.find(s => (s.seller_email || '').toLowerCase().trim() === trimmedEmail)
  
  const emails = allSellers.map(s => s.seller_email)

  // Compute month bounds for monthly data
  const [qy, qm] = queryDate.split('-').map(Number)
  const monthStart = `${qy}-${String(qm).padStart(2, '0')}-01`
  const lastDay = new Date(qy, qm, 0).getDate()
  const monthEnd = `${qy}-${String(qm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const emailFilters = emails.map(e => `seller_email.eq.${e}`).join(',')

  // Step 2: Fetch daily data for ALL these sellers
  const [attendanceRes, orbitRes, ctiRes, allotmentRes, ltaRes, hourlyRes, dotRes, monthlyAllotmentRes, monthlyLtaRes, goalShbRes, kalpitRes, plannedLtaRes, lostReasonRes] = await Promise.all([
    supabase.schema('seller_day_to_day').from('seller_attendance').select('*').eq('work_date', queryDate).in('email', emails),
    supabase.schema('seller_day_to_day').from('seller_availability').select('*').eq('work_date', queryDate).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('seller_cti_availability').select('*').eq('work_date', queryDate).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('daily_allotment_summary').select('*').eq('allotment_date', queryDate).in('seller_email', emails),
    supabase.from('daily_lta_log').select('*').eq('log_date', queryDate).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('seller_hourly_allotment').select('*').eq('allotment_date', queryDate).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('seller_dot_distribution').select('*').in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('daily_allotment_summary').select('*').gte('allotment_date', monthStart).lte('allotment_date', monthEnd).in('seller_email', emails),
    supabase.from('daily_lta_log').select('*').gte('log_date', monthStart).lte('log_date', monthEnd).in('seller_email', emails),
    supabase.from('goal_vs_shb').select('*').gte('date', monthStart).lte('date', monthEnd).or(emailFilters).order('date', { ascending: true }),
    supabase.from('kalpit_2').select('*').eq('date', queryDate),
    supabase.from('planned_lta').select('*').gte('log_date', monthStart).lte('log_date', monthEnd).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('lead_journey_details').select('sales_email_id, lost_reason_details, lead_assignment_time, enquiry_code, lead_link').ilike('current_lead_state', 'lost').gte('lead_assignment_time', monthStart + 'T00:00:00+05:30').lte('lead_assignment_time', monthEnd + 'T23:59:59+05:30').in('sales_email_id', emails)
  ])

  // Map day-to-day data to sellers
  const populatedSellers = allSellers.map(seller => {
    const orbitRecord = orbitRes.data?.find(o => o.seller_email === seller.seller_email)

    return {
      ...seller,
      attendance: attendanceRes.data?.find(a => a.email === seller.seller_email) || null,
      orbit: {
        first_login: orbitRecord?.available_timestamps_ist ? orbitRecord.available_timestamps_ist.split(' ')[0] : null,
      },
      cti: ctiRes.data?.find(c => c.seller_email === seller.seller_email) || null,
      allotment: allotmentRes.data?.find(al => al.seller_email === seller.seller_email) || null,
      daily_lta: ltaRes.data?.find(l => l.seller_email === seller.seller_email) ? { ...ltaRes.data.find(l => l.seller_email === seller.seller_email), planned_lta_override: plannedLtaRes.data?.find((p: any) => p.seller_email === seller.seller_email && p.log_date === queryDate)?.lta } : null,
      hourly: hourlyRes.data?.filter(h => h.seller_email === seller.seller_email) || [],
      dot_rows: dotRes.data?.filter(d => d.seller_email === seller.seller_email) || [],
      monthly_rows: (monthlyAllotmentRes.data || []).filter((r: any) => r.seller_email === seller.seller_email),
      monthly_lta_rows: (monthlyLtaRes.data || []).filter((r: any) => r.seller_email === seller.seller_email).map((r: any) => ({ ...r, planned_lta_override: plannedLtaRes.data?.find((p: any) => p.seller_email === r.seller_email && p.log_date === r.log_date)?.lta })),
      monthly_goal_shb: (goalShbRes.data || []).filter((r: any) => r.seller_email === seller.seller_email),
      monthly_lost_reasons: (lostReasonRes.data || []).filter((r: any) => (r.sales_email_id || '').toLowerCase().trim() === seller.seller_email),
    }
  })

  // Step 3: Group by L2 Email
  const l2Map: Record<string, any[]> = {}
  
  populatedSellers.forEach(seller => {
    const l2 = (seller.l2_email || trimmedEmail).toLowerCase().trim()
    if (!l2Map[l2]) {
      l2Map[l2] = []
    }
    // Don't duplicate the CM if they appear as their own L2, unless they are acting as a direct TL
    l2Map[l2].push(seller)
  })

  // Create final L2 Groups structure
  const l2Groups = Object.entries(l2Map).map(([l2Email, members]) => {
    // Find L2's personal info
    const l2Info = allSellers.find(s => (s.seller_email || '').toLowerCase().trim() === l2Email)
    const l2Name = l2Info?.seller_name || members[0]?.l2_name || l2Email.split('@')[0]

    return {
      l2_name: l2Name,
      l2_email: l2Email,
      l2_info: l2Info || null,
      members: members
    }
  })

  return NextResponse.json({ l2Groups, kalpit: kalpitRes.data || [] })
}
