import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cleanEmail, calculateHygieneStats } from '@/lib/hygiene-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get all srs_raw for hierarchy
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

    // Get ALL efficiency data with pagination
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
        console.error('Error fetching efficiency:', error)
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

    console.log(`Total efficiency rows loaded: ${allEfficiency.length}`)

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

    // Build L1 map
    const l1Map = new Map<string, { name: string; sellerEmails: Set<string> }>()

    srsData.forEach((row: any) => {
      const l1Email = cleanEmail(row.l1_email || '')
      if (!l1Email) return

      if (!l1Map.has(l1Email)) {
        l1Map.set(l1Email, {
          name: row.l1_name || l1Email.split('@')[0],
          sellerEmails: new Set()
        })
      }

      const sellerEmail = cleanEmail(row.seller_email || '')
      if (sellerEmail && sellerEmail !== l1Email) {
        l1Map.get(l1Email)!.sellerEmails.add(sellerEmail)
      }
    })

    // Calculate global totals for summary
    const allSellerEmails = new Set<string>()
    for (const [, data] of l1Map) {
      for (const email of data.sellerEmails) {
        allSellerEmails.add(email)
      }
    }

    let grandTotalCalls = 0
    let grandTotalDuration = 0
    let sellerWithCalls = 0

    for (const email of allSellerEmails) {
      const effRows = effByEmail[email] || []
      const filteredEffRows = effRows.filter(e => {
        const d = (e.date || '').split('T')[0]
        return d >= dateFrom && d <= dateTo
      })
      const totalCalls = filteredEffRows.reduce((sum, e) => sum + (e.call_dials || 0), 0)
      const totalDuration = filteredEffRows.reduce((sum, e) => sum + Math.round(parseFloat(e.call_duration || '0') || 0), 0)
      if (totalCalls > 0 || totalDuration > 0) {
        sellerWithCalls++
        grandTotalCalls += totalCalls
        grandTotalDuration += totalDuration
      }
    }

    const totalSellers = allSellerEmails.size

    // Build L1 data using shared utility
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

      const stats = calculateHygieneStats(sellerData, dateList)

      // Build L2 groups for drill-down
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
          if (sellerEmail === l1Email || sellerEmail === l2Email) continue

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

      l1Data.push({
        l1_name: data.name,
        l1_email: l1Email,
        total_calls: stats.totalCalls,
        total_duration: stats.totalDuration,
        avg_calls_per_seller_per_day: stats.avgCallsPerSellerPerDay,
        avg_duration_per_seller_per_day: stats.avgDurationPerSellerPerDay,
        total_sellers: stats.totalSellers,
        total_days: totalDays,
        l2_count: l2Groups.length,
        dailyData: stats.teamDailyData,
        l2_groups: l2Groups
      })
    }

    // Global averages
    const globalAvgCalls = totalSellers > 0 ? Math.round(grandTotalCalls / totalSellers) : 0
    const globalAvgDuration = totalSellers > 0 ? Math.round(grandTotalDuration / totalSellers) : 0

    return NextResponse.json({
      l1_data: l1Data,
      month: today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      totalDays: totalDays,
      summary: {
        totalSellers: totalSellers,
        totalCalls: grandTotalCalls,
        totalDuration: grandTotalDuration,
        avgCallsPerSellerPerDay: globalAvgCalls,
        avgDurationPerSellerPerDay: globalAvgDuration,
        sellerWithCalls: sellerWithCalls,
        totalDays: totalDays,
        efficiencyRows: allEfficiency.length,
        pagesFetched: page + 1
      }
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}