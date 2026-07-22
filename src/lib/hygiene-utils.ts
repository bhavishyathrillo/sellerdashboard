// lib/hygiene-utils.ts

export function cleanEmail(e: string): string {
  return (e || '').toLowerCase().trim()
}

export function calculateHygieneStats(sellerData: any[], dateList: string[]) {
  const totalDays = dateList.length
  let totalCalls = 0
  let totalDuration = 0
  let totalDaysWithCalls = 0
  let totalSellers = 0

  const processedSellers = sellerData.map((seller: any) => {
    const filteredEffRows = seller.effRows || []
    
    const calls = filteredEffRows.reduce((sum: number, e: any) => sum + (e.total_dials || 0), 0)
    const duration = filteredEffRows.reduce((sum: number, e: any) => sum + Math.round(parseFloat(e.total_answered_mins || '0') || 0), 0)
    const uniqueDials = filteredEffRows.reduce((sum: number, e: any) => sum + (e.unique_enquiries_called || 0), 0)
    const daysWithCalls = filteredEffRows.filter((e: any) => e.total_dials > 0).length

    if (calls > 0 || duration > 0) {
      totalCalls += calls
      totalDuration += duration
      totalDaysWithCalls += daysWithCalls
      totalSellers++
    }

    const dailyData = dateList.map((dateStr: string) => {
      const found = filteredEffRows.find((e: any) => (e.call_date || '').split('T')[0] === dateStr)
      const d = new Date(dateStr + 'T00:00:00')
      return {
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        dateRaw: dateStr,
        call_dials: found ? (found.total_dials || 0) : 0,
        call_duration: found ? Math.round(parseFloat(found.total_answered_mins || '0')) || 0 : 0,
        unique_dials: found ? (found.unique_enquiries_called || 0) : 0
      }
    })

    return {
      seller_name: seller.seller_name,
      seller_email: seller.seller_email,
      total_calls: calls,
      total_duration: duration,
      total_unique_dials: uniqueDials,
      days_with_calls: daysWithCalls,
      dailyData
    }
  })

  // Calculate averages
  const avgCallsPerSeller = totalSellers > 0 ? Math.round(totalCalls / totalSellers) : 0
  const avgDurationPerSeller = totalSellers > 0 ? Math.round(totalDuration / totalSellers) : 0
  const avgDaysWithCalls = totalSellers > 0 ? Math.round(totalDaysWithCalls / totalSellers) : 0
  
  const avgCallsPerSellerPerDay = avgDaysWithCalls > 0 ? Math.round(avgCallsPerSeller / avgDaysWithCalls) : 0
  const avgDurationPerSellerPerDay = avgDaysWithCalls > 0 ? Math.round(avgDurationPerSeller / avgDaysWithCalls) : 0

  // Team daily averages
  const teamDailyData = dateList.map((dateStr: string, idx: number) => {
    let totalDials = 0
    let totalDur = 0
    let totalUniqueD = 0
    let count = 0
    processedSellers.forEach((s: any) => {
      const dd = s.dailyData[idx]
      if (dd && dd.call_dials > 0) {
        totalDials += dd.call_dials
        totalDur += dd.call_duration
        totalUniqueD += dd.unique_dials
        count++
      }
    })
    return {
      date: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      call_dials: count > 0 ? Math.round(totalDials / count) : 0,
      call_duration: count > 0 ? Math.round(totalDur / count) : 0,
      unique_dials: count > 0 ? Math.round(totalUniqueD / count) : 0
    }
  })

  return {
    totalCalls,
    totalDuration,
    totalSellers,
    totalDaysWithCalls,
    avgCallsPerSellerPerDay,
    avgDurationPerSellerPerDay,
    processedSellers,
    teamDailyData
  }
}