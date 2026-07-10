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

  // Step 1: Get all sellers under this TL (could be mapped in l1 or l2 depending on org structure)
  const { data: allSellers, error: sellersError } = await supabase
    .from('srs_raw')
    .select('*')
    .or(`l1_email.eq.${trimmedEmail},l2_email.eq.${trimmedEmail}`)

  if (sellersError) {
    return NextResponse.json({ error: sellersError.message }, { status: 500 })
  }

  if (!allSellers || allSellers.length === 0) {
    return NextResponse.json({ members: [] })
  }

  // Filter: TL and CM must be different. If they are the same, he is a CM.
  // The user says: "take only those as tl whose cm is differnt if cm and tl is same the he is a cm we will build his view later"
  // So we only keep members where l1_email != l2_email.
  let validTeam = allSellers.filter(s => {
    const l1 = (s.l1_email || '').toLowerCase().trim()
    const l2 = (s.l2_email || '').toLowerCase().trim()
    return l1 !== l2
  })

  // Ensure the TL is always included in his own team list!
  const tlSelf = allSellers.find(s => (s.seller_email || '').toLowerCase().trim() === trimmedEmail)
  if (tlSelf && !validTeam.some(s => s.seller_email === tlSelf.seller_email)) {
    validTeam.push(tlSelf)
  }

  if (validTeam.length === 0) {
    return NextResponse.json({ members: [] })
  }

  const emails = validTeam.map(s => s.seller_email)

  // Compute month bounds for monthly data
  const [qy, qm] = queryDate.split('-').map(Number)
  const monthStart = `${qy}-${String(qm).padStart(2, '0')}-01`
  const lastDay = new Date(qy, qm, 0).getDate()
  const monthEnd = `${qy}-${String(qm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const queryMonth = `${qy}-${String(qm).padStart(2, '0')}`

  const emailFilters = emails.map(e => `seller_email.eq.${e}`).join(',')

  // Step 2: Fetch daily data for these sellers
  const [attendanceRes, orbitRes, ctiRes, allotmentRes, ltaRes, hourlyRes, dotRes, monthlyAllotmentRes, monthlyLtaLogRes, goalShbRes, kalpitRes, plannedLtaRes] = await Promise.all([
    supabase.schema('seller_day_to_day').from('seller_attendance').select('*').eq('work_date', queryDate).in('email', emails),
    supabase.schema('seller_day_to_day').from('seller_availability').select('*').eq('work_date', queryDate).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('seller_cti_availability').select('*').eq('work_date', queryDate).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('daily_allotment_summary').select('*').eq('allotment_date', queryDate).in('seller_email', emails),
    supabase.from('daily_lta_log').select('*').eq('log_date', queryDate).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('seller_hourly_allotment').select('*').eq('allotment_date', queryDate).in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('seller_dot_distribution').select('*').in('seller_email', emails),
    supabase.schema('seller_day_to_day').from('daily_allotment_summary').select('*').gte('allotment_date', monthStart).lte('allotment_date', monthEnd).in('seller_email', emails),
    // Monthly LTA logs for MHE trend (mishandled_pct per day per seller)
    supabase.from('daily_lta_log').select('seller_email,log_date,mishandled_pct,mishandled_enquiries').gte('log_date', monthStart).lte('log_date', monthEnd).in('seller_email', emails).order('log_date', { ascending: true }),
    // Monthly Goal vs SHB for the team
    supabase.from('goal_vs_shb').select('*').gte('date', monthStart).lte('date', monthEnd).or(emailFilters).order('date', { ascending: true }),
    supabase.from('kalpit_2').select('*').eq('date', queryDate),
    supabase.from('planned_lta').select('*').gte('log_date', monthStart).lte('log_date', monthEnd).in('seller_email', emails),
  ])

  // Step 3: Combine
  const members = validTeam.map(seller => {
    const exactEmail = seller.seller_email
    const orbitRecord = orbitRes.data?.find(o => o.seller_email === seller.seller_email)

    return {
      ...seller,
      attendance: attendanceRes.data?.find(a => a.email === seller.seller_email) || null,
      orbit: {
        first_login: orbitRecord?.available_timestamps_ist ? orbitRecord.available_timestamps_ist.split(' ')[0] : null,
      },
      cti: ctiRes.data?.find(c => c.seller_email === seller.seller_email) || null,
      allotment: allotmentRes.data?.find(al => al.seller_email === seller.seller_email) || null,
      daily_lta: ltaRes.data?.find(l => l.seller_email === seller.seller_email) 
        ? { 
            ...ltaRes.data.find(l => l.seller_email === seller.seller_email), 
            planned_lta_override: plannedLtaRes.data?.find((p: any) => p.seller_email === seller.seller_email && p.log_date === queryDate)?.lta
          } 
        : { 
            planned_lta_override: plannedLtaRes.data?.find((p: any) => p.seller_email === seller.seller_email && p.log_date === queryDate)?.lta, 
            lead_goal: plannedLtaRes.data?.find((p: any) => p.seller_email === seller.seller_email && p.log_date === queryDate)?.leads_goal, 
            wd: plannedLtaRes.data?.find((p: any) => p.seller_email === seller.seller_email && p.log_date === queryDate)?.wd 
          },
      hourly: hourlyRes.data?.filter(h => h.seller_email === seller.seller_email) || [],
      dot_rows: dotRes.data?.filter(d => d.seller_email === seller.seller_email) || [],
      monthly_rows: (monthlyAllotmentRes.data || []).filter((r: any) => r.seller_email === seller.seller_email),
      monthly_lta_logs: (monthlyLtaLogRes.data || []).filter((r: any) => r.seller_email === seller.seller_email),
      monthly_goal_shb: (goalShbRes.data || []).filter((r: any) => r.seller_email.startsWith(shortPrefix)),
    }
  })

  return NextResponse.json({ members, kalpit: kalpitRes.data || [] })
}
