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
  const { data: allSellers, error: sellersError } = await supabase
    .from('srs_raw')
    .select('*')
    .eq('l1_email', trimmedEmail)

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

  const emailFilters = emails.map(e => `seller_email.ilike.${e.split('@')[0].substring(0, 5)}%`).join(',')

  // Step 2: Fetch daily data for ALL these sellers
  const [attendanceRes, orbitRes, ctiRes, allotmentRes, ltaRes, hourlyRes, dotRes, monthlyAllotmentRes, monthlyLtaRes, goalShbRes] = await Promise.all([
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
      daily_lta: ltaRes.data?.find(l => l.seller_email === seller.seller_email) || null,
      hourly: hourlyRes.data?.filter(h => h.seller_email === seller.seller_email) || [],
      dot_rows: dotRes.data?.filter(d => d.seller_email === seller.seller_email) || [],
      monthly_rows: (monthlyAllotmentRes.data || []).filter((r: any) => r.seller_email === seller.seller_email),
      monthly_lta_rows: (monthlyLtaRes.data || []).filter((r: any) => r.seller_email === seller.seller_email),
      monthly_goal_shb: (goalShbRes.data || []).filter((r: any) => r.seller_email.startsWith(seller.seller_email.split('@')[0].substring(0, 5))),
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

  return NextResponse.json({ l2Groups })
}
