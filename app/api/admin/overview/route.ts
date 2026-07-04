import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get ALL data from srs_july
    const { data: perfRows, error } = await supabase
      .from('srs_july')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!perfRows || perfRows.length === 0) {
      return NextResponse.json({ 
        l1_data: [], 
        totalSellers: 0,
        totalL1: 0,
        message: 'No data in srs_july' 
      })
    }

    // Aggregate new KPIs
    let bottomline_goal = 0
    let topline_goal_this_month = 0
    let bottomline_should_have_been = 0
    let bl_actual_splits = 0
    let topline_should_have_been = 0
    let tl_actual_splits = 0

    const allSellerEmails = new Set<string>()

    // CM = l2_manager, TL = l1_manager
    // We want the frontend to still see CM as `l1_name` and TL as `l2_name`
    // So we group by `l2_manager` (CM) and then by `l1_manager` (TL)
    const cmMap = new Map<string, any[]>()

    perfRows.forEach((r: any) => {
      bottomline_goal += (Number(r.bottomline_goal) || 0)
      topline_goal_this_month += (Number(r.topline_goal_this_month) || 0)
      bottomline_should_have_been += (Number(r.bottomline_should_have_been) || 0)
      bl_actual_splits += (Number(r.bl_actual_splits) || 0)
      topline_should_have_been += (Number(r.topline_should_have_been) || 0)
      tl_actual_splits += (Number(r.tl_actual_splits) || 0)

      const email = r.seller_email?.toLowerCase().trim()
      if (email) {
        allSellerEmails.add(email)
      }

      const cmName = r.l2_manager?.trim() || 'Unassigned CM'
      if (!cmMap.has(cmName)) {
        cmMap.set(cmName, [])
      }
      cmMap.get(cmName)!.push(r)
    })

    const totalUniqueSellers = allSellerEmails.size
    const l1Data: any[] = []

    // Build data for each CM (Frontend calls this L1)
    for (const [cmName, team] of cmMap.entries()) {
      const totalGoal = team.reduce((s: number, r: any) => s + (Number(r.bottomline_goal) || 0), 0)
      const totalAch = team.reduce((s: number, r: any) => s + (Number(r.bl_actual_splits) || 0), 0)
      const totalShb = team.reduce((s: number, r: any) => s + (Number(r.bottomline_should_have_been) || 0), 0)
      const pct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0

      // Group by TL (Frontend calls this L2)
      const tlMap = new Map<string, any[]>()
      team.forEach((r: any) => {
        const tlName = r.l1_manager?.trim() || 'Unassigned TL'
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
          l2_email: tlName,
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
              flag: s.seller_flag || 'No Flag',
              region: s.region || '',
              haul: s.haul || '',
              defined_goal: 'bottomline', // default or use logic if present
              july_data: {
                bl_goal: Number(s.bottomline_goal) || 0,
                bl_shb: Number(s.bottomline_should_have_been) || 0,
                bl_ach: Number(s.bl_actual_splits) || 0,
                tl_goal: Number(s.topline_goal_this_month) || 0,
                tl_shb: Number(s.topline_should_have_been) || 0,
                tl_ach: Number(s.tl_actual_splits) || 0
              }
            }
          })
        }
      })

      l1Data.push({
        l1_email: cmName,
        l1_name: cmName,
        total_sellers: team.length,
        total_goal: totalGoal,
        total_achieved: totalAch,
        total_shb: totalShb,
        pct: pct,
        l2_groups: l2Groups
      })
    }

    // Build Seller Flag Table (CM -> TL Hierarchy)
    const flagData = new Map<string, { totalCounts: Record<string, number>, l2Groups: Map<string, Record<string, number>> }>()
    const allFlags = new Set<string>()

    perfRows.forEach((row: any) => {
      const cmName = row.l2_manager?.trim() || 'Unassigned CM'
      const tlName = row.l1_manager?.trim() || 'Unassigned TL'
      
      const sEmail = row.seller_email
      if (sEmail && cmName) {
        if (cmName.toLowerCase().includes('ram ratan mishra')) return;

        const flag = row.seller_flag || 'No Flag'
        allFlags.add(flag)

        if (!flagData.has(cmName)) {
           flagData.set(cmName, { totalCounts: {}, l2Groups: new Map() })
        }
        
        const cmData = flagData.get(cmName)!
        
        // Add to CM Total
        cmData.totalCounts[flag] = (cmData.totalCounts[flag] || 0) + 1
        
        // Add to TL Total
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
      totalL1: cmMap.size,
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