import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function cleanEmail(e: string): string {
  return (e || '').toLowerCase().trim()
}

export async function GET() {
  try {
    // Step 1: Get srs_raw data
    const { data: srsData } = await supabase.from('srs_raw').select('*')
    
    // Step 2: Build date list for this month
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const daysInRange = Math.floor((today.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const dateList: string[] = []
    for (let i = 0; i < daysInRange; i++) {
      const d = new Date(firstOfMonth); d.setDate(d.getDate() + i)
      dateList.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    }
    const dateFrom = dateList[0]
    const dateTo = dateList[dateList.length - 1]

    // Step 3: Get ALL seller emails from srs_raw
    const allSellerEmails = new Set<string>()
    if (srsData) {
      srsData.forEach((row: any) => {
        const email = cleanEmail(row.seller_email || '')
        if (email) allSellerEmails.add(email)
      })
    }

    // Step 4: Fetch efficiency data in batches for ALL sellers
    const sellerEmailsArray = Array.from(allSellerEmails)
    const effByEmail: Record<string, any[]> = {}
    
    // Fetch in batches of 50 emails at a time
    for (let i = 0; i < sellerEmailsArray.length; i += 50) {
      const batch = sellerEmailsArray.slice(i, i + 50)
      const { data: batchEff } = await supabase
        .from('efficiency')
        .select('*')
        .in('seller_email', batch)
        .gte('date', dateFrom)
        .lte('date', dateTo)
      
      if (batchEff) {
        batchEff.forEach((e: any) => {
          const key = cleanEmail(e.seller_email || '')
          if (key) {
            if (!effByEmail[key]) effByEmail[key] = []
            effByEmail[key].push(e)
          }
        })
      }
    }

    if (!srsData) return NextResponse.json({ l1_data: [] })

    // Step 5: Build L1 hierarchy
    const l1Map = new Map<string, any>()
    srsData.forEach((row: any) => {
      const l1Email = cleanEmail(row.l1_email || '')
      if (!l1Email) return
      
      if (!l1Map.has(l1Email)) {
        l1Map.set(l1Email, {
          l1_name: row.l1_name || l1Email.split('@')[0],
          l1_email: l1Email,
          l2Map: new Map()
        })
      }
      
      const l1 = l1Map.get(l1Email)!
      const l2Email = cleanEmail(row.l2_email || '') || 'direct'
      
      if (!l1.l2Map.has(l2Email)) {
        l1.l2Map.set(l2Email, {
          l2_name: row.l2_name || l2Email.split('@')[0],
          l2_email: l2Email,
          sellers: new Map()
        })
      }
      
      const sEmail = cleanEmail(row.seller_email || '')
      const sName = row.seller_name || sEmail?.split('@')[0] || 'Unknown'
      
      if (sEmail && !l1.l2Map.get(l2Email)!.sellers.has(sEmail)) {
        l1.l2Map.get(l2Email)!.sellers.set(sEmail, sName)
      }
    })

    // Step 6: Build response with efficiency data
    const l1Data: any[] = []
    
    for (const [, l1] of l1Map) {
      const l2Groups: any[] = []
      let l1TotalCalls = 0
      let l1TotalDuration = 0
      let l2Count = 0

      for (const [, l2] of l1.l2Map) {
        const sellers: any[] = []

        for (const [sEmail, sName] of l2.sellers) {
          // Get efficiency for this seller
          const rawEff = effByEmail[sEmail] || []
          
          // Filter by date range (already filtered in query, but double-check)
          const sellerEff = rawEff.filter((e: any) => {
            const d = (e.date || '').split('T')[0]
            return d >= dateFrom && d <= dateTo
          })

          // Build daily data
          const dailyData = dateList.map(dateStr => {
            const found = sellerEff.find((e: any) => (e.date || '').split('T')[0] === dateStr)
            const d = new Date(dateStr + 'T00:00:00')
            return {
              date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              call_dials: found ? (found.call_dials || 0) : 0,
              call_duration: found ? Math.round(parseFloat(found.call_duration || '0')) || 0 : 0
            }
          })

          const totalCalls = dailyData.reduce((s, d) => s + d.call_dials, 0)
          const totalDuration = dailyData.reduce((s, d) => s + d.call_duration, 0)
          
          sellers.push({
            seller_name: sName,
            seller_email: sEmail,
            total_calls: totalCalls,
            total_duration: totalDuration,
            dailyData
          })
        }

        const l2TotalCalls = sellers.reduce((s, sel) => s + sel.total_calls, 0)
        const l2TotalDuration = sellers.reduce((s, sel) => s + sel.total_duration, 0)
        
        if (sellers.length > 0) {
          l2Groups.push({
            l2_name: l2.l2_name,
            l2_email: l2.l2_email,
            seller_count: sellers.length,
            total_calls: l2TotalCalls,
            total_duration: l2TotalDuration,
            sellers
          })
          l2Count++
        }
        
        l1TotalCalls += l2TotalCalls
        l1TotalDuration += l2TotalDuration
      }

      // L1 daily averages
      const l1DailyData = dateList.map((dateStr, idx) => {
        const d = new Date(dateStr + 'T00:00:00')
        let totalDials = 0
        let totalDur = 0
        let count = 0
        
        l2Groups.forEach(l2 => {
          l2.sellers.forEach((s: any) => {
            const dd = s.dailyData[idx]
            if (dd && dd.call_dials > 0) {
              totalDials += dd.call_dials
              totalDur += dd.call_duration
              count++
            }
          })
        })
        
        return {
          date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          call_dials: count > 0 ? Math.round(totalDials / count) : 0,
          call_duration: count > 0 ? Math.round(totalDur / count) : 0
        }
      })

      l1Data.push({
        l1_name: l1.l1_name,
        l1_email: l1.l1_email,
        total_calls: l1TotalCalls,
        total_duration: l1TotalDuration,
        l2_count: l2Count,
        dailyData: l1DailyData,
        l2_groups: l2Groups
      })
    }

    // Count total efficiency rows across all sellers
    let totalEffRows = 0
    for (const key in effByEmail) {
      totalEffRows += effByEmail[key].length
    }

    return NextResponse.json({
      l1_data: l1Data,
      month: today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      debug: {
        effRows: totalEffRows,
        dateRange: `${dateFrom} to ${dateTo}`,
        uniqueEmails: Object.keys(effByEmail).length,
        totalSellers: sellerEmailsArray.length
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}