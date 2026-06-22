import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cleanEmail } from '@/lib/hygiene-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: allSellers } = await supabase.from('srs_raw').select('seller_email, seller_name, l1_email, l2_email, l2_name')
    if (!allSellers) return NextResponse.json({ l1_data: [], _srsSellers: [] })

    const l1Map = new Map<string, string>()
    allSellers.forEach((row: any) => {
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

    // Fetch ALL efficiency using cursor pagination
    let allEfficiency: any[] = []
    let lastId = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('efficiency')
        .select('id, seller_email, date, call_dials, call_duration')
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
      
      let l1TotalCalls = 0
      let l1TotalDuration = 0
      let l1SellerCount = 0

      const sellerData = l1Sellers
        .filter((s: any) => cleanEmail(s.seller_email) !== l1Email)
        .map((s: any) => {
          const email = cleanEmail(s.seller_email)
          const rows = effByEmail[email] || []
          const calls = rows.reduce((sum: number, e: any) => sum + (e.call_dials || 0), 0)
          const dur = rows.reduce((sum: number, e: any) => sum + Math.round(parseFloat(e.call_duration || '0') || 0), 0)
          
          if (calls > 0 || dur > 0) {
            l1TotalCalls += calls
            l1TotalDuration += dur
            l1SellerCount++
          }

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

      globalTotalCalls += l1TotalCalls
      globalTotalDuration += l1TotalDuration
      globalTotalSellers += l1SellerCount

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
        total_calls: l1TotalCalls, total_duration: l1TotalDuration,
        avg_calls_per_seller_per_day: l1SellerCount > 0 && daysPassed > 0 ? Math.round(l1TotalCalls / (l1SellerCount * daysPassed)) : 0,
        avg_duration_per_seller_per_day: l1SellerCount > 0 && daysPassed > 0 ? Math.round(l1TotalDuration / (l1SellerCount * daysPassed)) : 0,
        total_sellers: l1SellerCount, l2_count: l2Groups.length, dailyData: [], l2_groups: l2Groups
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}