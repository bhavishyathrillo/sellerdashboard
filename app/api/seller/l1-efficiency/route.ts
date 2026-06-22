import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cleanEmail, calculateHygieneStats } from '@/lib/hygiene-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const trimmedEmail = cleanEmail(email)

  try {
    const { data: sellers } = await supabase.from('srs_raw').select('seller_email, seller_name').eq('l1_email', trimmedEmail)
    if (!sellers || sellers.length === 0) return NextResponse.json({ teamAverage: null, sellers: [] })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const daysInRange = Math.floor((today.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const dateList: string[] = []
    for (let i = 0; i < daysInRange; i++) {
      const d = new Date(firstOfMonth)
      d.setDate(d.getDate() + i)
      dateList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }

    const dateFrom = dateList[0]
    const dateTo = dateList[dateList.length - 1]

    const sellerEmails = sellers.map((s: any) => cleanEmail(s.seller_email)).filter((e: string) => e !== trimmedEmail)

    // Fetch ALL efficiency using cursor pagination
    let allEfficiency: any[] = []
    let lastId = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('efficiency')
        .select('id, seller_email, date, call_dials, call_duration')
        .in('seller_email', sellerEmails)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('id', { ascending: true })
        .limit(pageSize)

      if (lastId > 0) query = query.gt('id', lastId)

      const { data: chunk, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (!chunk || chunk.length === 0) hasMore = false
      else { allEfficiency = allEfficiency.concat(chunk); lastId = chunk[chunk.length - 1].id; if (chunk.length < pageSize) hasMore = false }
    }

    const effByEmail: Record<string, any[]> = {}
    if (allEfficiency) {
      allEfficiency.forEach((e: any) => {
        const key = cleanEmail(e.seller_email || '')
        if (key) {
          if (!effByEmail[key]) effByEmail[key] = []
          effByEmail[key].push(e)
        }
      })
    }

    const sellerData = sellerEmails.map((email) => {
      const effRows = effByEmail[email] || []
      const sellerInfo = sellers.find((s: any) => cleanEmail(s.seller_email) === email)
      return { seller_name: sellerInfo?.seller_name || email.split('@')[0], seller_email: email, effRows }
    })

    const stats = calculateHygieneStats(sellerData, dateList)

    return NextResponse.json({
      teamAverage: {
        total_calls: stats.totalCalls,
        total_duration: stats.totalDuration,
        avg_calls_per_day: stats.avgCallsPerSellerPerDay,
        avg_duration_per_day: stats.avgDurationPerSellerPerDay,
        total_sellers: stats.totalSellers,
        dailyData: stats.teamDailyData
      },
      sellers: stats.processedSellers,
      dateRange: { from: dateFrom, to: dateTo, count: dateList.length }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}