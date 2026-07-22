import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cleanEmail } from '@/lib/hygiene-utils'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const trimmedEmail = cleanEmail(email)

  try {
      const { data: _me } = await supabase.from('srs_raw').select('l1_name').eq('l1_email', trimmedEmail).limit(1).maybeSingle()
  const _myName = _me?.l1_name || ''
  
  let _query = supabase.from('srs_raw').select('seller_email, seller_name')
  if (_myName) {
    _query = _query.eq('l1_name', _myName)
  } else {
    _query = _query.eq('l1_email', trimmedEmail)
  }
  const { data: sellers } = await _query
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
    const daysPassed = today.getDate()

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

    // Build seller data
    const sellerData = sellerEmails.map((email) => {
      const effRows = effByEmail[email] || []
      const sellerInfo = sellers.find((s: any) => cleanEmail(s.seller_email) === email)
      
      const dailyData = dateList.map((dateStr: string) => {
        const found = effRows.find((e: any) => (e.date || '').split('T')[0] === dateStr)
        return {
          date: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          call_dials: found ? (found.call_dials || 0) : 0,
          call_duration: found ? Math.round(parseFloat(found.call_duration || '0')) || 0 : 0
        }
      })

      const totalCalls = dailyData.reduce((s: number, d: any) => s + d.call_dials, 0)
      const totalDuration = dailyData.reduce((s: number, d: any) => s + d.call_duration, 0)
      const daysWithCalls = dailyData.filter((d: any) => d.call_dials > 0).length

      return {
        seller_name: sellerInfo?.seller_name || email.split('@')[0],
        seller_email: email,
        total_calls: totalCalls,
        total_duration: totalDuration,
        days_with_calls: daysWithCalls,
        // Option A: avg per working day
        avg_calls_per_day: daysWithCalls > 0 ? Math.round(totalCalls / daysWithCalls) : 0,
        dailyData
      }
    })

    // Calculate team totals
    const totalSellers = sellerData.filter(s => s.total_calls > 0 || s.total_duration > 0).length
    const teamTotalCalls = sellerData.reduce((s, d) => s + d.total_calls, 0)
    const teamTotalDuration = sellerData.reduce((s, d) => s + d.total_duration, 0)

    // Option A: divide by total working days across all sellers (not calendar days)
    const totalWorkingDays = sellerData.filter(s => s.total_calls > 0 || s.total_duration > 0).reduce((s, d) => s + d.days_with_calls, 0)
    const avgCallsPerDay = totalWorkingDays > 0 ? Math.round(teamTotalCalls / totalWorkingDays) : 0
    const avgDurationPerDay = totalWorkingDays > 0 ? Math.round(teamTotalDuration / totalWorkingDays) : 0

    // Team daily data (average per day across sellers)
    const teamDailyData = dateList.map((dateStr: string, idx: number) => {
      let totalDials = 0, totalDur = 0, count = 0
      sellerData.forEach((s: any) => {
        const dd = s.dailyData[idx]
        if (dd && dd.call_dials > 0) { totalDials += dd.call_dials; totalDur += dd.call_duration; count++ }
      })
      return {
        date: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        call_dials: count > 0 ? Math.round(totalDials / count) : 0,
        call_duration: count > 0 ? Math.round(totalDur / count) : 0
      }
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
      dateRange: { from: dateFrom, to: dateTo, count: dateList.length }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
