import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function cleanEmail(e: string): string { return (e || '').toLowerCase().trim() }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const role = searchParams.get('role')
  const view = searchParams.get('view')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  try {
    const { data: allData } = await supabase.from('feasibility_seller_metrics').select('*')
    const metrics = allData || []
    const { data: srsData } = await supabase.from('srs_raw').select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name').limit(5000)

    // ADMIN VIEW
    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      const l1Map = new Map<string, any>()
      srsData?.forEach((row: any) => {
        const l1Email = cleanEmail(row.l1_email || '')
        if (!l1Email) return
        if (!l1Map.has(l1Email)) l1Map.set(l1Email, { l1_name: row.l1_name || l1Email.split('@')[0], l1_email: l1Email, l2Map: new Map() })
        const l1 = l1Map.get(l1Email)!
        const l2Email = cleanEmail(row.l2_email || '') || 'direct'
        if (!l1.l2Map.has(l2Email)) l1.l2Map.set(l2Email, { l2_name: row.l2_name || l2Email.split('@')[0], l2_email: l2Email, sellers: [] })
        const sEmail = cleanEmail(row.seller_email || '')
        if (sEmail && sEmail !== l1Email && sEmail !== l2Email) {
          l1.l2Map.get(l2Email)!.sellers.push({ seller_email: sEmail, seller_name: row.seller_name || sEmail.split('@')[0] })
        }
      })

      const l1Groups: any[] = []
      let totalSent = 0, totalPassed = 0, totalWon = 0, totalLost = 0, totalStuck = 0
      let allPassedOpen: string[] = [], allNotPassedOpen: string[] = [], allPassedLost: string[] = [], allNotPassedLost: string[] = []

      for (const [l1Email, l1] of l1Map) {
        const l2Groups: any[] = []
        let l1Sent = 0, l1Passed = 0, l1Won = 0, l1Lost = 0, l1Stuck = 0
        let l1PassedOpen: string[] = [], l1NotPassedOpen: string[] = [], l1PassedLost: string[] = [], l1NotPassedLost: string[] = []

        for (const [l2Email, l2] of l1.l2Map) {
          const sellers = l2.sellers.map((s: any) => {
            const m = metrics.find((fm: any) => cleanEmail(fm.seller_email) === s.seller_email) || {}
            return buildSellerMetrics(s, m)
          }).filter((s: any) => s.sent > 0)

          const l2Sent = sellers.reduce((sum: number, s: any) => sum + s.sent, 0)
          const l2Passed = sellers.reduce((sum: number, s: any) => sum + s.passed, 0)
          const l2Won = sellers.reduce((sum: number, s: any) => sum + s.won, 0)
          const l2Lost = sellers.reduce((sum: number, s: any) => sum + s.lost, 0)
          const l2Stuck = sellers.reduce((sum: number, s: any) => sum + s.stuck, 0)

          l2Groups.push({
            l2_name: l2.l2_name, l2_email: l2Email, seller_count: sellers.length,
            sent: l2Sent, passed: l2Passed, won: l2Won, lost: l2Lost, stuck: l2Stuck,
            passRate: l2Sent > 0 ? Math.round((l2Passed / l2Sent) * 100) : 0,
            passedOpenCodes: sellers.flatMap((s: any) => s.passedOpenCodes),
            notPassedOpenCodes: sellers.flatMap((s: any) => s.notPassedOpenCodes),
            passedLostCodes: sellers.flatMap((s: any) => s.passedLostCodes),
            notPassedLostCodes: sellers.flatMap((s: any) => s.notPassedLostCodes),
            sellers
          })

          l1Sent += l2Sent; l1Passed += l2Passed; l1Won += l2Won; l1Lost += l2Lost; l1Stuck += l2Stuck
          l1PassedOpen.push(...sellers.flatMap((s: any) => s.passedOpenCodes))
          l1NotPassedOpen.push(...sellers.flatMap((s: any) => s.notPassedOpenCodes))
          l1PassedLost.push(...sellers.flatMap((s: any) => s.passedLostCodes))
          l1NotPassedLost.push(...sellers.flatMap((s: any) => s.notPassedLostCodes))
        }

        l1Groups.push({
          l1_name: l1.l1_name, l1_email: l1Email, l2_count: l2Groups.length,
          seller_count: l2Groups.reduce((s: number, g: any) => s + g.seller_count, 0),
          sent: l1Sent, passed: l1Passed, won: l1Won, lost: l1Lost, stuck: l1Stuck,
          passRate: l1Sent > 0 ? Math.round((l1Passed / l1Sent) * 100) : 0,
          passedOpenCodes: l1PassedOpen, notPassedOpenCodes: l1NotPassedOpen,
          passedLostCodes: l1PassedLost, notPassedLostCodes: l1NotPassedLost,
          l2_groups: l2Groups
        })

        totalSent += l1Sent; totalPassed += l1Passed; totalWon += l1Won; totalLost += l1Lost; totalStuck += l1Stuck
        allPassedOpen.push(...l1PassedOpen); allNotPassedOpen.push(...l1NotPassedOpen)
        allPassedLost.push(...l1PassedLost); allNotPassedLost.push(...l1NotPassedLost)
      }

      return NextResponse.json({
        admin: true,
        metrics: { sent: totalSent, passed: totalPassed, won: totalWon, lost: totalLost, stuck: totalStuck, passRate: totalSent > 0 ? Math.round((totalPassed / totalSent) * 100) : 0, passedOpenCodes: allPassedOpen, notPassedOpenCodes: allNotPassedOpen, passedLostCodes: allPassedLost, notPassedLostCodes: allNotPassedLost },
        l1Groups, totalL1: l1Groups.length, totalSellers: srsData?.length || 0
      })
    }

    // L1 VIEW
    if (role === 'L1') {
      const teamSellers = (srsData || []).filter((s: any) => cleanEmail(s.l1_email) === cleanEmail(email) && cleanEmail(s.seller_email) !== cleanEmail(email))
      const l2Emails = [...new Set(teamSellers.map((s: any) => cleanEmail(s.l2_email)).filter(Boolean))]
      const l2Groups = l2Emails.map((l2Email: string) => {
        const sellers = teamSellers.filter((s: any) => cleanEmail(s.l2_email) === l2Email).map((s: any) => {
          const m = metrics.find((fm: any) => cleanEmail(fm.seller_email) === cleanEmail(s.seller_email)) || {}
          return buildSellerMetrics(s, m)
        }).filter((s: any) => s.sent > 0)
        const l2Sent = sellers.reduce((sum: number, s: any) => sum + s.sent, 0)
        const l2Passed = sellers.reduce((sum: number, s: any) => sum + s.passed, 0)
        const l2Won = sellers.reduce((sum: number, s: any) => sum + s.won, 0)
        const l2Lost = sellers.reduce((sum: number, s: any) => sum + s.lost, 0)
        const l2Stuck = sellers.reduce((sum: number, s: any) => sum + s.stuck, 0)
        return {
          l2_name: teamSellers.find((s: any) => cleanEmail(s.l2_email) === l2Email)?.l2_name || l2Email.split('@')[0],
          l2_email: l2Email, seller_count: sellers.length,
          sent: l2Sent, passed: l2Passed, won: l2Won, lost: l2Lost, stuck: l2Stuck,
          passRate: l2Sent > 0 ? Math.round((l2Passed / l2Sent) * 100) : 0,
          passedOpenCodes: sellers.flatMap((s: any) => s.passedOpenCodes),
          notPassedOpenCodes: sellers.flatMap((s: any) => s.notPassedOpenCodes),
          passedLostCodes: sellers.flatMap((s: any) => s.passedLostCodes),
          notPassedLostCodes: sellers.flatMap((s: any) => s.notPassedLostCodes),
          sellers
        }
      }).filter((g: any) => g.sellers.length > 0)

      const totalSent = l2Groups.reduce((s, g) => s + g.sent, 0)
      const totalPassed = l2Groups.reduce((s, g) => s + g.passed, 0)
      const totalWon = l2Groups.reduce((s, g) => s + g.won, 0)
      const totalLost = l2Groups.reduce((s, g) => s + g.lost, 0)
      const totalStuck = l2Groups.reduce((s, g) => s + g.stuck, 0)

      return NextResponse.json({
        l1: true,
        metrics: { sent: totalSent, passed: totalPassed, won: totalWon, lost: totalLost, stuck: totalStuck, passRate: totalSent > 0 ? Math.round((totalPassed / totalSent) * 100) : 0, passedOpenCodes: l2Groups.flatMap((g: any) => g.passedOpenCodes), notPassedOpenCodes: l2Groups.flatMap((g: any) => g.notPassedOpenCodes), passedLostCodes: l2Groups.flatMap((g: any) => g.passedLostCodes), notPassedLostCodes: l2Groups.flatMap((g: any) => g.notPassedLostCodes) },
        l2Groups, totalSellers: teamSellers.length
      })
    }

    // L2 TEAM VIEW
    if (role === 'L2' && view === 'team') {
      const teamSellers = (srsData || []).filter((s: any) => cleanEmail(s.l2_email) === cleanEmail(email) && cleanEmail(s.seller_email) !== cleanEmail(email))
      const sellers = teamSellers.map((s: any) => {
        const m = metrics.find((fm: any) => cleanEmail(fm.seller_email) === cleanEmail(s.seller_email)) || {}
        return buildSellerMetrics(s, m)
      }).filter((s: any) => s.sent > 0)

      const totalSent = sellers.reduce((sum, s) => sum + s.sent, 0)
      const totalPassed = sellers.reduce((sum, s) => sum + s.passed, 0)
      const totalWon = sellers.reduce((sum, s) => sum + s.won, 0)
      const totalLost = sellers.reduce((sum, s) => sum + s.lost, 0)
      const totalStuck = sellers.reduce((sum, s) => sum + s.stuck, 0)

      return NextResponse.json({
        team: true,
        metrics: { sent: totalSent, passed: totalPassed, won: totalWon, lost: totalLost, stuck: totalStuck, passRate: totalSent > 0 ? Math.round((totalPassed / totalSent) * 100) : 0, passedOpenCodes: sellers.flatMap((s: any) => s.passedOpenCodes), notPassedOpenCodes: sellers.flatMap((s: any) => s.notPassedOpenCodes), passedLostCodes: sellers.flatMap((s: any) => s.passedLostCodes), notPassedLostCodes: sellers.flatMap((s: any) => s.notPassedLostCodes) },
        sellers
      })
    }

    // PERSONAL VIEW
    const m = metrics.find((fm: any) => cleanEmail(fm.seller_email) === cleanEmail(email)) || {}
    const sellerMetrics = buildSellerMetrics({ seller_name: email.split('@')[0], seller_email: email }, m)

    return NextResponse.json({
      personal: true,
      metrics: { sent: sellerMetrics.sent, passed: sellerMetrics.passed, won: sellerMetrics.won, lost: sellerMetrics.lost, stuck: sellerMetrics.stuck, passRate: sellerMetrics.passRate, passedOpenCodes: sellerMetrics.passedOpenCodes, notPassedOpenCodes: sellerMetrics.notPassedOpenCodes, passedLostCodes: sellerMetrics.passedLostCodes, notPassedLostCodes: sellerMetrics.notPassedLostCodes },
      enquiries: sellerMetrics.enquiries
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function buildSellerMetrics(seller: any, m: any) {
  const sent = m.sent_to_feasibility || 0
  const passed = m.feasibility_passed || 0
  const won = m.passed_and_won || 0
  const lost = m.passed_and_lost || 0
  const open = m.passed_and_open || 0
  const stuck = m.not_passed_and_open || 0
  
  const passedOpenCodes = (m.passed_open_enq_codes || '').split(',').map((c: string) => c.trim()).filter(Boolean)
  const notPassedOpenCodes = (m.not_passed_open_enq_codes || '').split(',').map((c: string) => c.trim()).filter(Boolean)
  const passedLostCodes = (m.passed_lost_enq_codes || '').split(',').map((c: string) => c.trim()).filter(Boolean)
  const notPassedLostCodes = (m.not_passed_lost_enq_codes || '').split(',').map((c: string) => c.trim()).filter(Boolean)

  const enquiries = [
    ...passedOpenCodes.map((code: string) => ({ code, feasibilityStatus: 'Passed', leadStatus: 'Open' })),
    ...notPassedOpenCodes.map((code: string) => ({ code, feasibilityStatus: 'Failed', leadStatus: 'Open' })),
    ...passedLostCodes.map((code: string) => ({ code, feasibilityStatus: 'Passed', leadStatus: 'Lost' })),
    ...notPassedLostCodes.map((code: string) => ({ code, feasibilityStatus: 'Failed', leadStatus: 'Lost' })),
  ]

  return {
    seller_name: seller.seller_name || seller.seller_email?.split('@')[0] || 'Unknown',
    seller_email: seller.seller_email,
    sent, passed, won, lost, open, stuck,
    passRate: sent > 0 ? Math.round((passed / sent) * 100) : 0,
    passedOpenCodes, notPassedOpenCodes, passedLostCodes, notPassedLostCodes,
    enquiries
  }
}