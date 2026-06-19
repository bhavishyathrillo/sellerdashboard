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

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const trimmedEmail = cleanEmail(email)

  try {
    // Get all sellers under this L1
    const { data: sellers, error: sellersError } = await supabase
      .from('srs_raw')
      .select('seller_email, seller_name')
      .eq('l1_email', trimmedEmail)

    if (sellersError) {
      return NextResponse.json({ error: sellersError.message }, { status: 500 })
    }

    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ teamAverage: null, sellers: [] })
    }

    // Build date list from 1st of this month to today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const daysInRange = Math.floor((today.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const dateList: string[] = []
    for (let i = 0; i < daysInRange; i++) {
      const d = new Date(firstOfMonth)
      d.setDate(d.getDate() + i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      dateList.push(`${y}-${m}-${day}`)
    }

    const dateFrom = dateList[0]
    const dateTo = dateList[dateList.length - 1]

    // 🔥 Get seller emails - Include ALL sellers under this L1
    // EXCLUDE only the L1's own email (L1 is NOT a seller)
    const sellerEmails = sellers
      .map((s: any) => cleanEmail(s.seller_email))
      .filter((e: string, index: number, self: string[]) => 
        e !== trimmedEmail && self.indexOf(e) === index
      )

    // Fetch ALL efficiency data with pagination
    let allEfficiency: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const start = page * pageSize
      const end = (page + 1) * pageSize - 1

      const { data: chunk, error: effError } = await supabase
        .from('efficiency')
        .select('*')
        .in('seller_email', sellerEmails)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .range(start, end)

      if (effError) {
        return NextResponse.json({ error: effError.message }, { status: 500 })
      }

      if (!chunk || chunk.length === 0) {
        hasMore = false
      } else {
        allEfficiency = allEfficiency.concat(chunk)
        if (chunk.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    // Index efficiency by email
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

    // Build seller data
    const sellerData = sellerEmails.map((email) => {
      const effRows = effByEmail[email] || []
      const sellerInfo = sellers.find((s: any) => cleanEmail(s.seller_email) === email)
      return {
        seller_name: sellerInfo?.seller_name || email.split('@')[0],
        seller_email: email,
        effRows: effRows
      }
    })

    // Use shared utility to calculate stats
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
    console.error('L1 Efficiency API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}