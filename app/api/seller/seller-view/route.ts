// app/api/seller/seller-view/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'seller_day_to_day' } }
)

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Safe string handling if needed
function asString(val: any): string | null {
  return val ? String(val) : null
}

function monthBounds(date: string): { start: string; end: string } {
  const [y, m] = date.split('-').map(Number)
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const date = searchParams.get('date')

  if (!email || !date) {
    return NextResponse.json({ error: 'Missing email or date' }, { status: 400 })
  }

  try {
    const currentMonth = date.substring(0, 7)
    const { start: monthStart, end: monthEnd } = monthBounds(date)

    const [
      { data: allotmentData },
      { data: attendanceData },
      { data: ctiData },
      { data: hourlyData },
      { data: allDotData },
      { data: monthlyAllotmentRows },
      { data: ltaLogData },
      { data: ltaMonthData },
      { data: goalVsShbData },
      { data: goalShbMonthData },
      { data: orbitData },
      { data: kalpitData },
      { data: plannedLtaData },
    ] = await Promise.all([
      supabase.schema('seller_day_to_day')
        .from('daily_allotment_summary')
        .select('*')
        .eq('seller_email', email)
        .eq('allotment_date', date)
        .maybeSingle(),

      supabase.schema('seller_day_to_day')
        .from('seller_attendance')
        .select('*')
        .eq('email', email)
        .eq('work_date', date)
        .maybeSingle(),

      supabase.schema('seller_day_to_day')
        .from('seller_cti_availability')
        .select('*')
        .eq('seller_email', email)
        .eq('work_date', date)
        .maybeSingle(),

      supabase.schema('seller_day_to_day')
        .from('seller_hourly_allotment')
        .select('*')
        .eq('seller_email', email)
        .eq('allotment_date', date)
        .order('hour_bucket', { ascending: true }),

      // Fetch ALL DOT data for this seller
      supabase.schema('seller_day_to_day')
        .from('seller_dot_distribution')
        .select('*')
        .eq('seller_email', email)
        .order('dot_month', { ascending: true }),

      // Monthly allotment rows
      supabase.schema('seller_day_to_day')
        .from('daily_allotment_summary')
        .select('*')
        .eq('seller_email', email)
        .gte('allotment_date', monthStart)
        .lte('allotment_date', monthEnd),

      // Daily LTA Log
      supabasePublic
        .from('daily_lta_log')
        .select('*')
        .eq('seller_email', email)
        .eq('log_date', date)
        .maybeSingle(),

      // Monthly LTA Trend
      supabasePublic
        .from('daily_lta_log')
        .select('*')
        .eq('seller_email', email)
        .gte('log_date', monthStart)
        .lte('log_date', monthEnd)
        .order('log_date', { ascending: true }),

      // Goal vs SHB
      supabasePublic
        .from('goal_vs_shb')
        .select('*')
        .ilike('seller_email', `${email.split('@')[0].substring(0, 5)}%`)
        .eq('date', date)
        .limit(1)
        .maybeSingle(),

      // Monthly Goal vs SHB Trend
      supabasePublic
        .from('goal_vs_shb')
        .select('*')
        .ilike('seller_email', `${email.split('@')[0].substring(0, 5)}%`)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: true }),

      // Orbit Login Data (seller_availability)
      supabase.schema('seller_day_to_day')
        .from('seller_availability')
        .select('*')
        .eq('seller_email', email)
        .eq('work_date', date)
        .maybeSingle(),
      supabasePublic.from('kalpit').select('*'),
      
      // Planned LTA for the month
      supabasePublic.from('planned_lta')
        .select('*')
        .eq('seller_email', email)
        .gte('log_date', monthStart)
        .lte('log_date', monthEnd)
    ])
    
    console.log('--- DEBUG GOAL VS SHB ---')
    console.log('Query for:', email, date)
    console.log('Result:', goalVsShbData)
    console.log('-------------------------')

    const readyTimestamps = ctiData?.ready_timestamps || null

    // Monthly aggregation
    const monthRows = monthlyAllotmentRows || []
    console.log('COLUMNS:', Object.keys(monthRows[0] || {}));
    const sum = (key: string) => monthRows.reduce((acc: number, r: any) => acc + (r[key] || 0), 0)

    const monthly = {
      total_leads_allotted: sum('total_leads_allotted'),
      auto_allotted: sum('auto_allotted'),
      manual_allotted: sum('manual_allotted'),
      rtg_leads: sum('rtg_leads'),
      non_rtg_leads: sum('non_rtg_leads'),
      pax_1: sum('pax_1'),
      pax_2: sum('pax_2'),
      pax_3: sum('pax_3'),
      pax_4: sum('pax_4'),
      pax_4_plus: sum('pax_4_plus'),
      days_with_data: monthRows.length,
      revised_lta: Math.floor(ltaLogData?.revised_lta_hygiene_goal || 0),
    }

    const mheTrend = (ltaMonthData || []).map((r: any) => {
      const rawPct = r.mishandled_pct || 0
      const mhePct = rawPct * 100
      return {
        date: r.log_date,
        mhePct: parseFloat(mhePct.toFixed(1))
      }
    }).sort((a: any, b: any) => a.date.localeCompare(b.date))

    // ── DOT Bar Chart Data ──
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const [cy, cm] = currentMonth.split('-').map(Number)
    const currentMonthIndex = cm - 1

    // Build map from fetched DOT data
    const dotMap: Record<string, number> = {}
      ; (allDotData || []).forEach((row: any) => {
        dotMap[row.dot_month] = (dotMap[row.dot_month] || 0) + (row.total_leads_allotted || 0)
      })

    // Dynamic sequential color palette for the 6 months: shades from brand orange down to gold/mutes
    const dotColors = ['#F4631E', '#EF562F', '#E06D3E', '#D17F4E', '#C28E5F', '#B39D70']
    const dotChartData: { label: string; value: number; color: string }[] = []

    for (let i = 0; i < 6; i++) {
      let monthIdx = (currentMonthIndex + i) % 12
      let year = cy + Math.floor((currentMonthIndex + i) / 12)
      const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
      dotChartData.push({
        label: monthNames[monthIdx],
        value: dotMap[monthKey] || 0,
        color: dotColors[i],
      })
    }

    let futureSum = 0
    Object.entries(dotMap).forEach(([key, val]) => {
      const [y, m] = key.split('-').map(Number)
      const monthOffset = (y - cy) * 12 + (m - 1 - currentMonthIndex)
      if (monthOffset >= 6) futureSum += val
    })

    dotChartData.push({
      label: '6+ Months',
      value: futureSum,
      color: '#8A8278', // Muted gray
    })

    // DOT current month total
    const dotCurrentMonthKey = currentMonth
    const dotCurrentTotal = dotMap[dotCurrentMonthKey] || 0

    const response = {
      date,
      month: currentMonth,
      isRange: false,

      allotment: {
        total_leads_allotted: allotmentData?.total_leads_allotted || 0,
        first_lead_allotted_at_ist: asString(allotmentData?.first_lead_allotted_at_ist),
        median_creation_to_allotment_mins: allotmentData?.median_creation_to_allotment_mins || null,
        auto_allotted: allotmentData?.auto_allotted || 0,
        manual_allotted: allotmentData?.manual_allotted || 0,
        rtg_leads: allotmentData?.rtg_leads || 0,
        non_rtg_leads: allotmentData?.non_rtg_leads || 0,
        pax_1: allotmentData?.pax_1 || 0,
        pax_2: allotmentData?.pax_2 || 0,
        pax_3: allotmentData?.pax_3 || 0,
        pax_4: allotmentData?.pax_4 || 0,
        pax_4_plus: allotmentData?.pax_4_plus || 0,
      },

      monthly,
      mhe_trend: mheTrend,

      attendance: {
        first_login: asString(attendanceData?.first_login),
        last_logout: asString(attendanceData?.last_logout),
        break_timestamps: asString(attendanceData?.break_timestamps),
      },

      cti: {
        logged_in_at: asString(ctiData?.logged_in_at),
        ready_timestamps: readyTimestamps,
      },

      orbit: {
        first_login: orbitData?.available_timestamps_ist ? orbitData.available_timestamps_ist.split(' ')[0] : null,
      },

      hourly: (hourlyData || []).map((h: any) => ({
        hour_bucket: h.hour_bucket,
        leads_allotted_in_bucket: h.leads_allotted_in_bucket || 0,
      })),

      dot_chart: dotChartData,

      dot_distribution: dotCurrentTotal > 0
        ? { total_leads_allotted: dotCurrentTotal, dot_month: currentMonth }
        : null,
      
      daily_lta: ltaLogData ? { ...ltaLogData, planned_lta_override: plannedLtaData?.find((p: any) => p.log_date === date)?.lta } : null,
      lta_trend: (ltaMonthData || []).map((r: any) => ({ ...r, planned_lta_override: plannedLtaData?.find((p: any) => p.log_date === r.log_date)?.lta })),
      goal_vs_shb: goalVsShbData || null,
      goal_vs_shb_trend: goalShbMonthData || [],
      kalpit: kalpitData || [],
      debug_columns: Object.keys(monthRows[0] || {})
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}