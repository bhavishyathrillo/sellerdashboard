import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cleanEmail } from '@/lib/hygiene-utils'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const trimmedEmail = email.toLowerCase().trim()

  const { data: sellers } = await supabase.from('srs_raw').select('seller_email, seller_name').eq('l2_email', trimmedEmail)
  if (!sellers || sellers.length === 0) return NextResponse.json({ teamAverage: null, sellers: [] })

  const sellerEmails = sellers.map((s: any) => s.seller_email).filter((e: string) => e.toLowerCase() !== trimmedEmail)

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
  const daysPassed = today.getDate()

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
      const key = (e.seller_email || '').toLowerCase().trim()
      if (key) {
        if (!effByEmail[key]) effByEmail[key] = []
        effByEmail[key].push(e)
      }
    })
  }

  const sellerData = sellers
    .filter((s: any) => s.seller_email.toLowerCase() !== trimmedEmail)
    .map((s: any) => {
      const sellerEff = effByEmail[s.seller_email.toLowerCase().trim()] || []
      const dailyData = dateList.map(dateStr => {
        const found = sellerEff.find((e: any) => (e.date || '').split('T')[0] === dateStr)
        const d = new Date(dateStr + 'T00:00:00')
        return { date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), call_dials: found ? (found.call_dials || 0) : 0, call_duration: found ? Math.round(parseFloat(found.call_duration || '0')) || 0 : 0 }
      })
      const totalCalls = dailyData.reduce((sum, d) => sum + d.call_dials, 0)
      const totalDuration = dailyData.reduce((sum, d) => sum + d.call_duration, 0)
      const daysWithCalls = dailyData.filter(d => d.call_dials > 0).length
      return { seller_name: s.seller_name, seller_email: s.seller_email, total_calls: totalCalls, total_duration: totalDuration, days_with_calls: daysWithCalls, avg_calls_per_day: daysWithCalls > 0 ? Math.round(totalCalls / daysWithCalls) : 0, dailyData }
    })

  const totalSellers = sellerData.filter(s => s.total_calls > 0 || s.total_duration > 0).length
  const teamTotalCalls = sellerData.reduce((s, d) => s + d.total_calls, 0)
  const teamTotalDuration = sellerData.reduce((s, d) => s + d.total_duration, 0)

  // Option A: divide by total working days across all sellers (not calendar days)
  const totalWorkingDays = sellerData.filter(s => s.total_calls > 0 || s.total_duration > 0).reduce((s, d) => s + d.days_with_calls, 0)
  const avgCallsPerDay = totalWorkingDays > 0 ? Math.round(teamTotalCalls / totalWorkingDays) : 0
  const avgDurationPerDay = totalWorkingDays > 0 ? Math.round(teamTotalDuration / totalWorkingDays) : 0

  const teamDailyData = dateList.map((dateStr, idx) => {
    const dayData = sellerData.map(s => s.dailyData[idx])
    const sellersWithData = dayData.filter(d => d.call_dials > 0).length
    return { date: dayData[0]?.date || '', call_dials: sellersWithData > 0 ? Math.round(dayData.reduce((s, d) => s + d.call_dials, 0) / sellersWithData) : 0, call_duration: sellersWithData > 0 ? Math.round(dayData.reduce((s, d) => s + d.call_duration, 0) / sellersWithData) : 0 }
  })

  return NextResponse.json({
    teamAverage: {
      total_calls: teamTotalCalls,
      total_duration: teamTotalDuration,
      avg_calls_per_day: avgCallsPerDay,
      avg_duration_per_day: avgDurationPerDay,
      total_sellers: totalSellers,
      dailyData: teamDailyData
    },
    sellers: sellerData,
    dateRange: { from: dateFrom, to: dateTo, count: daysInRange }
  })
}
