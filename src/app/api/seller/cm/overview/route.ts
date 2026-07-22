import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cmName = searchParams.get('name')

    if (!cmName) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const decodedName = cmName.toLowerCase().trim()

    // 1. Fetch all sellers under this CM from srs_raw, as it is the source of truth for L1/L2 mapping
    // In srs_raw: l1_name is CM, l2_name is TL
    const { data: rawSellers, error: rawError } = await supabase
      .from('srs_raw')
      .select('seller_email, l1_name, l2_name, current_seller_flag')
      .ilike('l1_name', `%${decodedName}%`)

    if (rawError) {
      return NextResponse.json({ error: rawError.message }, { status: 500 })
    }

    if (!rawSellers || rawSellers.length === 0) {
      return NextResponse.json({
        l1_data: [],
        totalSellers: 0,
        totalL1: 0,
        message: 'No sellers found for this CM in srs_raw'
      })
    }

    // Map sellers to their CM (l1_name) and TL (l2_name)
    const sellerMap = new Map<string, { cmName: string, tlName: string, flag: string }>()
    rawSellers.forEach((s: any) => {
      const email = s.seller_email?.toLowerCase().trim()
      if (email) {
        sellerMap.set(email, {
          cmName: s.l1_name?.trim() || 'Unassigned CM',
          tlName: s.l2_name?.trim() || 'Unassigned TL',
          flag: s.current_seller_flag || 'No Flag'
        })
      }
    })

    const sellerEmails = Array.from(sellerMap.keys())

    // 2. Fetch their performance data from srs_july
    const { data: perfRows, error: perfError } = await supabase
      .from('srs_july')
      .select('*')
      .in('seller_email', sellerEmails)

    if (perfError) {
      return NextResponse.json({ error: perfError.message }, { status: 500 })
    }

    if (!perfRows || perfRows.length === 0) {
      return NextResponse.json({ 
        l1_data: [], 
        totalSellers: 0,
        totalL1: 0,
        message: 'No performance data in srs_july for these sellers' 
      })
    }

    // 3. Aggregate KPIs
    let bottomline_goal = 0
    let topline_goal_this_month = 0
    let bottomline_should_have_been = 0
    let bl_actual_splits = 0
    let topline_should_have_been = 0
    let tl_actual_splits = 0

    const allSellerEmails = new Set<string>()
    const cmGroupMap = new Map<string, any[]>()

    perfRows.forEach((r: any) => {
      bottomline_goal += (Number(r.bottomline_goal) || 0)
      topline_goal_this_month += (Number(r.topline_goal_this_month) || 0)
      bottomline_should_have_been += (Number(r.bottomline_should_have_been) || 0)
      bl_actual_splits += (Number(r.bl_actual_splits) || 0)
      topline_should_have_been += (Number(r.topline_should_have_been) || 0)
      tl_actual_splits += (Number(r.tl_actual_splits) || 0)

      const sEmail = r.seller_email?.toLowerCase().trim()
      if (sEmail) {
        allSellerEmails.add(sEmail)
      }

      // Use srs_raw mapping instead of srs_july
      const mapped = sellerMap.get(sEmail)
      const mappedCmName = mapped?.cmName || 'Unassigned CM'
      
      if (!cmGroupMap.has(mappedCmName)) {
        cmGroupMap.set(mappedCmName, [])
      }
      cmGroupMap.get(mappedCmName)!.push({ ...r, mapped })
    })

    const totalUniqueSellers = allSellerEmails.size
    const l1Data: any[] = []

    // Build data for the CM
    for (const [cmName, team] of cmGroupMap.entries()) {
      const totalGoal = team.reduce((s: number, r: any) => s + (Number(r.bottomline_goal) || 0), 0)
      const totalAch = team.reduce((s: number, r: any) => s + (Number(r.bl_actual_splits) || 0), 0)
      const totalShb = team.reduce((s: number, r: any) => s + (Number(r.bottomline_should_have_been) || 0), 0)
      const pct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0

      // Group by TL using srs_raw mapping
      const tlMap = new Map<string, any[]>()
      team.forEach((r: any) => {
        const tlName = r.region?.trim() || 'Unassigned Region'
        if (!tlMap.has(tlName)) {
          tlMap.set(tlName, [])
        }
        tlMap.get(tlName)!.push(r)
      })

      const l2Groups = Array.from(tlMap.entries()).map(([tlName, tlSellers]) => {
        const l2Goal = tlSellers.reduce((s: number, r: any) => s + (Number(r.bottomline_goal) || 0), 0)
        const l2Ach = tlSellers.reduce((s: number, r: any) => s + (Number(r.bl_actual_splits) || 0), 0)

        return {
          l2_name: tlName,
          l2_email: tlName, // Mock email since srs_july doesn't have it
          l2_goal: l2Goal,
          l2_achieved: l2Ach,
          l2_pct: l2Goal > 0 ? (l2Ach / l2Goal) * 100 : 0,
          seller_count: tlSellers.length,
          sellers: tlSellers.map((s: any) => {
            return {
              seller_name: s.seller_name || s.seller_email?.split('@')[0],
              seller_email: s.seller_email,
              goal: Number(s.bottomline_goal) || 0,
              achieved: Number(s.bl_actual_splits) || 0,
              shb: Number(s.bottomline_should_have_been) || 0,
              pct: Number(s.pct_achieved) || 0,
              flag: s.mapped?.flag || s.seller_flag || 'No Flag',
              region: s.region || '',
              haul: s.haul || '',
              duration_in_org_months: s.duration_in_org_months || 0,
              defined_goal: 'bottomline',
              july_data: {
                bl_goal: Number(s.bottomline_goal) || 0,
                bl_shb: Number(s.bottomline_should_have_been) || 0,
                bl_ach: Number(s.bl_actual_splits) || 0,
                tl_goal: Number(s.topline_goal_this_month) || 0,
                tl_shb: Number(s.topline_should_have_been) || 0,
                tl_ach: Number(s.tl_actual_splits) || 0,
                cancellation_impact: Number(s.cancellation_impact) || 0,
                escalation_impacts: Number(s.escalation_impacts) || 0,
                old_bookings_earnings: Number(s.old_bookings_earnings) || 0,
                topline_cancellation_impact: Number(s.topline_cancellation_impact) || 0,
                topline_escalation_impact: Number(s.topline_escalation_impact) || 0,
                topline_old_booking_earnings_impact: Number(s.topline_old_booking_earnings_impact) || 0
              }
            }
          })
        }
      })

      l1Data.push({
        l1_email: cmName, // Just for frontend keys
        l1_name: cmName,
        total_sellers: team.length,
        total_goal: totalGoal,
        total_achieved: totalAch,
        total_shb: totalShb,
        pct: pct,
        l2_groups: l2Groups
      })
    }

    // Build Seller Flag Table
    const flagData = new Map<string, { totalCounts: Record<string, number>, l2Groups: Map<string, Record<string, number>> }>()
    const allFlags = new Set<string>()

    perfRows.forEach((row: any) => {
      const cmName = row.mapped?.cmName || 'Unassigned CM'
      const tlName = row.mapped?.tlName || 'Unassigned TL'
      
      const sEmail = row.seller_email
      if (sEmail && cmName) {
        const flag = row.mapped?.flag || row.seller_flag || 'No Flag'
        allFlags.add(flag)

        if (!flagData.has(cmName)) {
           flagData.set(cmName, { totalCounts: {}, l2Groups: new Map() })
        }
        
        const cmData = flagData.get(cmName)!
        
        cmData.totalCounts[flag] = (cmData.totalCounts[flag] || 0) + 1
        
        if (!cmData.l2Groups.has(tlName)) {
          cmData.l2Groups.set(tlName, {})
        }
        const tlCounts = cmData.l2Groups.get(tlName)!
        tlCounts[flag] = (tlCounts[flag] || 0) + 1
      }
    })

    const flagTable = {
      columns: Array.from(allFlags).sort(),
      rows: Array.from(flagData.entries()).map(([cmName, data]) => ({
        cmName,
        counts: data.totalCounts,
        l2Rows: Array.from(data.l2Groups.entries()).map(([l2Name, counts]) => ({
          l2Name,
          counts
        })).sort((a, b) => a.l2Name.localeCompare(b.l2Name))
      })).sort((a, b) => a.cmName.localeCompare(b.cmName))
    }

    return NextResponse.json({ 
      l1_data: l1Data,
      totalSellers: totalUniqueSellers,
      totalL1: cmGroupMap.size,
      kpis: {
        bottomline_goal,
        topline_goal_this_month,
        bottomline_should_have_been,
        bl_actual_splits,
        topline_should_have_been,
        tl_actual_splits
      },
      flagTable
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
