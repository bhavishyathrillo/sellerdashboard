import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cleanEmail } from '@/lib/hygiene-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🔥 Helper function to calculate stats matching L1 login calculation
function calculateHygieneStatsForAdmin(sellerData: any[], dateList: string[]) {
  const totalDays = dateList.length
  let totalCalls = 0
  let totalDuration = 0
  let totalSellers = 0

  const processedSellers = sellerData.map((seller: any) => {
    const filteredEffRows = seller.effRows || []
    
    const calls = filteredEffRows.reduce((sum: number, e: any) => sum + (e.call_dials || 0), 0)
    const duration = filteredEffRows.reduce((sum: number, e: any) => sum + Math.round(parseFloat(e.call_duration || '0') || 0), 0)
    const daysWithCalls = filteredEffRows.filter((e: any) => e.call_dials > 0).length

    if (calls > 0 || duration > 0) {
      totalCalls += calls
      totalDuration += duration
      totalSellers++
    }

    const dailyData = dateList.map((dateStr: string) => {
      const found = filteredEffRows.find((e: any) => (e.date || '').split('T')[0] === dateStr)
      const d = new Date(dateStr + 'T00:00:00')
      return {
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        dateRaw: dateStr,
        call_dials: found ? (found.call_dials || 0) : 0,
        call_duration: found ? Math.round(parseFloat(found.call_duration || '0')) || 0 : 0
      }
    })

    return {
      seller_name: seller.seller_name,
      seller_email: seller.seller_email,
      total_calls: calls,
      total_duration: duration,
      days_with_calls: daysWithCalls,
      dailyData
    }
  })

  // 🔥 Team daily averages
  const teamDailyData = dateList.map((dateStr: string, idx: number) => {
    let totalDials = 0
    let totalDur = 0
    let count = 0
    processedSellers.forEach((s: any) => {
      const dd = s.dailyData[idx]
      if (dd && dd.call_dials > 0) {
        totalDials += dd.call_dials
        totalDur += dd.call_duration
        count++
      }
    })
    return {
      date: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      call_dials: count > 0 ? Math.round(totalDials / count) : 0,
      call_duration: count > 0 ? Math.round(totalDur / count) : 0
    }
  })

  return {
    totalCalls,
    totalDuration,
    totalSellers,
    processedSellers,
    teamDailyData
  }
}

export async function GET() {
  try {
    const { data: srsData } = await supabase.from('srs_raw').select('*')

    if (!srsData) return NextResponse.json({ l1_data: [] })

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
    const totalDays = dateList.length

    // Get ALL efficiency data
    let allEfficiency: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const start = page * pageSize
      const end = (page + 1) * pageSize - 1

      const { data: chunk, error } = await supabase
        .from('efficiency')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .range(start, end)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
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

    // 🔥 Build L1 map - EXCLUDE L1's own email
    const l1Map = new Map<string, { 
      name: string; 
      sellerEmails: Set<string>;
      l1Email: string;
    }>()

    srsData.forEach((row: any) => {
      const l1Email = cleanEmail(row.l1_email || '')
      if (!l1Email) return

      if (!l1Map.has(l1Email)) {
        l1Map.set(l1Email, {
          name: row.l1_name || l1Email.split('@')[0],
          sellerEmails: new Set(),
          l1Email: l1Email
        })
      }

      const sellerEmail = cleanEmail(row.seller_email || '')
      if (sellerEmail && sellerEmail !== l1Email) {
        l1Map.get(l1Email)!.sellerEmails.add(sellerEmail)
      }
    })

    // Build L1 data
    const l1Data: any[] = []

    for (const [l1Email, data] of l1Map) {
      const sellerData = Array.from(data.sellerEmails).map((email) => {
        const effRows = effByEmail[email] || []
        return {
          seller_name: srsData.find((r: any) => cleanEmail(r.seller_email) === email)?.seller_name || email.split('@')[0],
          seller_email: email,
          effRows: effRows
        }
      })

      // 🔥 Use the admin-specific calculation
      const stats = calculateHygieneStatsForAdmin(sellerData, dateList)

      // Build L2 groups
      const l2Groups: any[] = []
      const l2Emails = new Set<string>()

      srsData.forEach((row: any) => {
        const l1 = cleanEmail(row.l1_email || '')
        if (l1 === l1Email) {
          const l2 = cleanEmail(row.l2_email || '')
          if (l2 && l2 !== l1Email) {
            l2Emails.add(l2)
          }
        }
      })

      for (const l2Email of l2Emails) {
        const sellers: any[] = []
        const l2Row = srsData.find((r: any) => cleanEmail(r.seller_email) === l2Email)

        const l2Sellers = srsData.filter((r: any) => {
          return cleanEmail(r.l1_email) === l1Email && cleanEmail(r.l2_email) === l2Email
        })

        for (const seller of l2Sellers) {
          const sellerEmail = cleanEmail(seller.seller_email)
          if (sellerEmail === l1Email) continue

          const effRows = effByEmail[sellerEmail] || []
          const filteredEffRows = effRows.filter(e => {
            const d = (e.date || '').split('T')[0]
            return d >= dateFrom && d <= dateTo
          })

          const totalCalls = filteredEffRows.reduce((sum, e) => sum + (e.call_dials || 0), 0)
          const totalDuration = filteredEffRows.reduce((sum, e) => sum + Math.round(parseFloat(e.call_duration || '0') || 0), 0)

          const dailyData = dateList.map(dateStr => {
            const found = filteredEffRows.find((e: any) => (e.date || '').split('T')[0] === dateStr)
            const d = new Date(dateStr + 'T00:00:00')
            return {
              date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              dateRaw: dateStr,
              call_dials: found ? (found.call_dials || 0) : 0,
              call_duration: found ? Math.round(parseFloat(found.call_duration || '0')) || 0 : 0
            }
          })

          sellers.push({
            seller_name: seller.seller_name || sellerEmail.split('@')[0],
            seller_email: sellerEmail,
            total_calls: totalCalls,
            total_duration: totalDuration,
            dailyData
          })
        }

        if (sellers.length > 0) {
          l2Groups.push({
            l2_name: l2Row?.l2_name || l2Email.split('@')[0],
            l2_email: l2Email,
            seller_count: sellers.length,
            sellers
          })
        }
      }

      // 🔥 Calculate avg_calls_per_seller_per_day matching L1 login
      // Formula: totalCalls / (totalSellers × daysPassed)
      const daysPassed = today.getDate()
      const avgCallsPerDay = stats.totalSellers > 0 && daysPassed > 0 
        ? Math.round(stats.totalCalls / (stats.totalSellers * daysPassed)) 
        : 0
      const avgDurationPerDay = stats.totalSellers > 0 && daysPassed > 0 
        ? Math.round(stats.totalDuration / (stats.totalSellers * daysPassed)) 
        : 0

      l1Data.push({
        l1_name: data.name,
        l1_email: l1Email,
        total_calls: stats.totalCalls,
        total_duration: stats.totalDuration,
        avg_calls_per_seller_per_day: avgCallsPerDay,  // 🔥 Matching L1 login
        avg_duration_per_seller_per_day: avgDurationPerDay,  // 🔥 Matching L1 login
        total_sellers: stats.totalSellers,
        total_days: totalDays,
        l2_count: l2Groups.length,
        dailyData: stats.teamDailyData,
        l2_groups: l2Groups
      })
    }

    // 🔥 Calculate global averages using the same formula
    let globalTotalCalls = 0
    let globalTotalDuration = 0
    let globalTotalSellers = 0

    l1Data.forEach((l1: any) => {
      globalTotalCalls += l1.total_calls || 0
      globalTotalDuration += l1.total_duration || 0
      globalTotalSellers += l1.total_sellers || 0
    })

    const daysPassed = today.getDate()
    const globalAvgCalls = globalTotalSellers > 0 && daysPassed > 0 
      ? Math.round(globalTotalCalls / (globalTotalSellers * daysPassed)) 
      : 0
    const globalAvgDuration = globalTotalSellers > 0 && daysPassed > 0 
      ? Math.round(globalTotalDuration / (globalTotalSellers * daysPassed)) 
      : 0

    const monthName = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    return NextResponse.json({
      l1_data: l1Data,
      month: monthName,
      totalDays: totalDays,
      daysPassed: daysPassed,
      summary: {
        totalSellers: globalTotalSellers,
        totalCalls: globalTotalCalls,
        totalDuration: globalTotalDuration,
        avgCallsPerSellerPerDay: globalAvgCalls,
        avgDurationPerSellerPerDay: globalAvgDuration
      }
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}