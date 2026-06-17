import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

  const trimmedEmail = email.toLowerCase().trim()

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

  const sellerEmails = sellers
    .map((s: any) => s.seller_email)
    .filter((e: string) => e.toLowerCase() !== trimmedEmail)

  // Generate EXACTLY 14 dates: today and 13 days back
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const exactDates: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    exactDates.push(`${yyyy}-${mm}-${dd}`)
  }

  const dateFrom = exactDates[0]
  const dateTo = exactDates[13]

  // Get ALL efficiency data and filter manually to be safe
  const { data: allEfficiency, error: effError } = await supabase
    .from('efficiency')
    .select('*')
    .in('seller_email', sellerEmails)

  if (effError) {
    return NextResponse.json({ error: effError.message }, { status: 500 })
  }

  // Build per-seller data - MANUAL strict 14-day filter
  const sellerData = sellers
    .filter((s: any) => s.seller_email.toLowerCase() !== trimmedEmail)
    .map((s: any) => {
      // Get this seller's efficiency rows
      const sellerEff = (allEfficiency || []).filter((e: any) => 
        e.seller_email?.toLowerCase() === s.seller_email.toLowerCase()
      )

      // STRICT: Only include dates from our exact 14-day list
      const dailyData = exactDates.map(dateStr => {
        const found = sellerEff.find((e: any) => {
          const rowDate = (e.date || '').split('T')[0]
          return rowDate === dateStr
        })
        const d = new Date(dateStr + 'T00:00:00')
        return {
          date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          dateRaw: dateStr,
          call_dials: found ? (found.call_dials || 0) : 0,
          call_duration: found ? Math.round(parseFloat(found.call_duration || '0')) || 0 : 0
        }
      })

      const totalCalls = dailyData.reduce((sum, d) => sum + d.call_dials, 0)
      const totalDuration = dailyData.reduce((sum, d) => sum + d.call_duration, 0)
      const daysWithCalls = dailyData.filter(d => d.call_dials > 0).length

      return {
        seller_name: s.seller_name,
        seller_email: s.seller_email,
        total_calls: totalCalls,
        avg_calls_per_day: daysWithCalls > 0 ? Math.round(totalCalls / 14) : 0,
        total_duration: totalDuration,
        avg_duration_per_day: daysWithCalls > 0 ? Math.round(totalDuration / 14) : 0,
        days_with_data: daysWithCalls,
        dailyData
      }
    })

  // Team averages
  const totalSellers = sellerData.length

  const teamDailyData = exactDates.map((dateStr, idx) => {
    const dayData = sellerData.map(s => s.dailyData[idx])
    const sellersWithData = dayData.filter(d => d.call_dials > 0).length
    return {
      date: dayData[0]?.date || '',
      call_dials: sellersWithData > 0 ? Math.round(dayData.reduce((s, d) => s + d.call_dials, 0) / sellersWithData) : 0,
      call_duration: sellersWithData > 0 ? Math.round(dayData.reduce((s, d) => s + d.call_duration, 0) / sellersWithData) : 0
    }
  })

  const teamAvgCalls = totalSellers > 0 ? Math.round(sellerData.reduce((s, d) => s + d.total_calls, 0) / totalSellers) : 0
  const teamAvgDuration = totalSellers > 0 ? Math.round(sellerData.reduce((s, d) => s + d.total_duration, 0) / totalSellers) : 0

  return NextResponse.json({
    teamAverage: {
      total_calls: teamAvgCalls,
      avg_calls_per_day: totalSellers > 0 ? Math.round(teamAvgCalls / 14) : 0,
      total_duration: teamAvgDuration,
      avg_duration_per_day: totalSellers > 0 ? Math.round(teamAvgDuration / 14) : 0,
      total_sellers: totalSellers,
      dailyData: teamDailyData
    },
    sellers: sellerData,
    dateRange: { from: dateFrom, to: dateTo, count: exactDates.length }
  })
}