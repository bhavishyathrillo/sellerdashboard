import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cleanEmail, calculateHygieneStats } from '@/lib/hygiene-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: allL1Emails } = await supabase.from('srs_raw').select('l1_email, l1_name').limit(5000)
    if (!allL1Emails) return NextResponse.json({ l1_data: [], _srsSellers: [] })

    const l1Map = new Map<string, string>()
    allL1Emails.forEach((row: any) => {
      const email = cleanEmail(row.l1_email || '')
      if (email && !l1Map.has(email)) l1Map.set(email, row.l1_name || email.split('@')[0])
    })

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

    // 🔥 Fetch ALL srs_raw — include l1_name
    const { data: allSellers } = await supabase
      .from('srs_raw')
      .select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name')
      .limit(5000)

    if (!allSellers || allSellers.length === 0) return NextResponse.json({ l1_data: [], _srsSellers: [] })

    // 1. Get exact count of efficiency records matching criteria
    const activeEmails = [...new Set(allSellers.map((s: any) => cleanEmail(s.seller_email)).filter(Boolean))]
    
    // We fetch count first
    const { count, error: countError } = await supabase
      .from('efficiency')
      .select('*', { count: 'exact', head: true })
      .gte('date', dateFrom)
      .lte('date', dateTo)

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
    
    const totalRecords = count || 0
    const pageSize = 1000
    const totalPages = Math.ceil(totalRecords / pageSize)
    
    // 2. Fetch all pages in parallel
    const promises = []
    for (let page = 0; page < totalPages; page++) {
      const start = page * pageSize
      const end = start + pageSize - 1
      promises.push(
        supabase
          .from('efficiency')
          .select('seller_email, date, call_dials, call_duration')
          .gte('date', dateFrom)
          .lte('date', dateTo)
          .range(start, end)
      )
    }

    const results = await Promise.all(promises)
    let allEfficiency: any[] = []
    
    for (const res of results) {
      if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
      if (res.data) allEfficiency = allEfficiency.concat(res.data)
    }

    const effByEmail: Record<string, any[]> = {}
    allEfficiency.forEach((e: any) => {
      const key = cleanEmail(e.seller_email || '')
      if (key) {
        if (!effByEmail[key]) effByEmail[key] = []
        effByEmail[key].push(e)
      }
    })

    const l1Data: any[] = []
    let globalTotalCalls = 0, globalTotalDuration = 0, globalTotalSellers = 0

    for (const [l1Email, l1Name] of l1Map) {
      const l1Sellers = allSellers.filter((s: any) => cleanEmail(s.l1_email) === l1Email)
      
      const sellerData = l1Sellers
        .filter((s: any) => cleanEmail(s.seller_email) !== l1Email)
        .map((s: any) => {
          const email = cleanEmail(s.seller_email)
          return { seller_name: s.seller_name || email.split('@')[0], seller_email: email, effRows: effByEmail[email] || [] }
        })

      const stats = calculateHygieneStats(sellerData, dateList)
      globalTotalCalls += stats.totalCalls
      globalTotalDuration += stats.totalDuration
      globalTotalSellers += stats.totalSellers

      const l2Groups: any[] = []
      const l2Emails = [...new Set(l1Sellers.map((s: any) => cleanEmail(s.l2_email)).filter(Boolean))]

      for (const l2Email of l2Emails) {
        const l2Sellers = l1Sellers.filter((s: any) => cleanEmail(s.l2_email) === l2Email)
        if (l2Sellers.length === 0) continue

        const l2Name = l2Sellers[0]?.l2_name || l2Email.split('@')[0]
        const sellers = l2Sellers.map((s: any) => {
          const email = cleanEmail(s.seller_email)
          const rows = effByEmail[email] || []
          const calls = rows.reduce((sum: number, e: any) => sum + (e.call_dials || 0), 0)
          const dur = rows.reduce((sum: number, e: any) => sum + Math.round(parseFloat(e.call_duration || '0') || 0), 0)
          return {
            seller_name: s.seller_name || email.split('@')[0], seller_email: email,
            total_calls: calls, total_duration: dur,
            dailyData: dateList.map(dateStr => {
              const found = rows.find((e: any) => (e.date || '').split('T')[0] === dateStr)
              return {
                date: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                call_dials: found ? (found.call_dials || 0) : 0,
                call_duration: found ? Math.round(parseFloat(found.call_duration || '0')) || 0 : 0
              }
            })
          }
        })
        l2Groups.push({ l2_name: l2Name, l2_email: l2Email, seller_count: sellers.length, sellers })
      }

      const daysPassed = today.getDate()
      l1Data.push({
        l1_name: l1Name, l1_email: l1Email,
        total_calls: stats.totalCalls, total_duration: stats.totalDuration,
        avg_calls_per_seller_per_day: stats.avgCallsPerSellerPerDay,
        avg_duration_per_seller_per_day: stats.avgDurationPerSellerPerDay,
        total_sellers: stats.totalSellers, l2_count: l2Groups.length,
        dailyData: stats.teamDailyData, l2_groups: l2Groups
      })
    }

    const daysPassed = today.getDate()
    const monthName = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    return NextResponse.json({
      l1_data: l1Data, month: monthName, daysPassed,
      _srsSellers: allSellers,
      summary: {
        totalSellers: globalTotalSellers, totalCalls: globalTotalCalls, totalDuration: globalTotalDuration,
        avgCallsPerSellerPerDay: globalTotalSellers > 0 && daysPassed > 0 ? Math.round(globalTotalCalls / (globalTotalSellers * daysPassed)) : 0,
        avgDurationPerSellerPerDay: globalTotalSellers > 0 && daysPassed > 0 ? Math.round(globalTotalDuration / (globalTotalSellers * daysPassed)) : 0
      }
    })
  } catch (error: any) {
    console.error('Admin Hygiene Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}