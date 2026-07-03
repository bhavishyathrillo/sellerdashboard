import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get ALL data from srs_raw
    const { data: allRows, error } = await supabase
      .from('srs_raw')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!allRows || allRows.length === 0) {
      return NextResponse.json({ 
        l1_data: [], 
        totalSellers: 0,
        totalL1: 0,
        message: 'No data in srs_raw' 
      })
    }

    // Get ALL data from srs_july
    const { data: perfRows } = await supabase
      .from('srs_july')
      .select('*')

    // Aggregate new KPIs
    let bottomline_goal = 0
    let topline_goal_this_month = 0
    let bottomline_should_have_been = 0
    let bl_actual_splits = 0
    let topline_should_have_been = 0
    let tl_actual_splits = 0

    const julyMap = new Map<string, any>()
    if (perfRows) {
      perfRows.forEach((r: any) => {
        bottomline_goal += (Number(r.bottomline_goal) || 0)
        topline_goal_this_month += (Number(r.topline_goal_this_month) || 0)
        bottomline_should_have_been += (Number(r.bottomline_should_have_been) || 0)
        bl_actual_splits += (Number(r.bl_actual_splits) || 0)
        topline_should_have_been += (Number(r.topline_should_have_been) || 0)
        tl_actual_splits += (Number(r.tl_actual_splits) || 0)

        const email = r.seller_email?.toLowerCase().trim()
        if (email) {
          julyMap.set(email, r)
        }
      })
    }

    // Get ALL unique seller emails from srs_raw
    const allSellerEmails = new Set<string>()
    const sellerDataMap: Record<string, any> = {}
    
    allRows.forEach((row: any) => {
      const email = row.seller_email?.toLowerCase().trim()
      if (email) {
        allSellerEmails.add(email)
        if (!sellerDataMap[email]) {
          sellerDataMap[email] = {
            seller_name: row.seller_name || email.split('@')[0],
            region: row.region || '',
            haul: row.haul || '',
            flag: row.current_seller_flag || ''
          }
        }
      }
    })

    const totalUniqueSellers = allSellerEmails.size

    // Build unique L1 map from all rows
    const l1Map = new Map<string, string>()
    allRows.forEach((row: any) => {
      const email = row.l1_email
      const name = row.l1_name
      if (email && email.trim().length > 0) {
        const key = email.toLowerCase().trim()
        if (!l1Map.has(key)) {
          l1Map.set(key, name || key.split('@')[0])
        }
      }
    })

    // Build data for each L1
    const l1Data: any[] = []
    
    for (const [l1Email, l1Name] of l1Map.entries()) {
      const sellers = allRows.filter(
        (s: any) => s.l1_email?.toLowerCase().trim() === l1Email
      )

      const team = sellers;

      const totalGoal = team.reduce((s: number, r: any) => s + (r.bottomline_goal_monthly || 0), 0)
      const totalAch = team.reduce((s: number, r: any) => s + (r.actual_achieved_monthly || 0), 0)
      const totalShb = team.reduce((s: number, r: any) => s + (r.should_have_been_monthly || 0), 0)
      const pct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0

      // L2 groups
      const l2Emails = [...new Set(team.map((s: any) => s.l2_email).filter(Boolean))]
      
      const l2Groups = l2Emails.map((l2Email: string) => {
        const key = l2Email.toLowerCase().trim()
        const l2 = allRows.find((r: any) => r.seller_email?.toLowerCase().trim() === key) || {}
        const l2Sellers = team.filter(
          (s: any) => s.l2_email?.toLowerCase().trim() === key
        )

        return {
          l2_name: l2Sellers[0]?.l2_name || l2.seller_name || l2Email.split('@')[0],
          l2_email: l2Email,
          l2_goal: l2.bottomline_goal_monthly || 0,
          l2_achieved: l2.actual_achieved_monthly || 0,
          l2_pct: (l2.bottomline_goal_monthly || 0) > 0 ? ((l2.actual_achieved_monthly || 0) / l2.bottomline_goal_monthly) * 100 : 0,
          seller_count: l2Sellers.length,
          sellers: l2Sellers.map((s: any) => {
            const july = julyMap.get(s.seller_email?.toLowerCase().trim()) || {}
            return {
              seller_name: s.seller_name,
              seller_email: s.seller_email,
              goal: s.bottomline_goal_monthly || 0,
              achieved: s.actual_achieved_monthly || 0,
              shb: s.should_have_been_monthly || 0,
              pct: s.goal_achieved_percent || 0,
              flag: s.current_seller_flag || '',
              region: s.region || '',
              haul: s.haul || '',
              defined_goal: s.defined_goal || '',
              july_data: {
                bl_goal: Number(july.bottomline_goal) || 0,
                bl_shb: Number(july.bottomline_should_have_been) || 0,
                bl_ach: Number(july.bl_actual_splits) || 0,
                tl_goal: Number(july.topline_goal_this_month) || 0,
                tl_shb: Number(july.topline_should_have_been) || 0,
                tl_ach: Number(july.tl_actual_splits) || 0
              }
            }
          })
        }
      })

      l1Data.push({
        l1_email: l1Email,
        l1_name: l1Name,
        total_sellers: team.length,
        total_goal: totalGoal,
        total_achieved: totalAch,
        total_shb: totalShb,
        pct: pct,
        l2_groups: l2Groups
      })
    }

    // Build Seller Flag Table (L1 -> L2 Hierarchy)
    const flagData = new Map<string, { totalCounts: Record<string, number>, l2Groups: Map<string, Record<string, number>> }>()
    const allFlags = new Set<string>()

    allRows.forEach((row: any) => {
      const email = row.l1_email
      const name = row.l1_name
      const l2Name = row.l2_name || row.l2_email?.split('@')[0] || 'Unassigned L2'
      
      const sEmail = row.seller_email
      if (sEmail && email && email.trim().length > 0) {
        const key = email.toLowerCase().trim()
        const l1Name = name || key.split('@')[0]
        
        if (l1Name.toLowerCase().includes('ram ratan mishra')) return;

        const flag = row.current_seller_flag || 'No Flag'
        allFlags.add(flag)

        if (!flagData.has(l1Name)) {
           flagData.set(l1Name, { totalCounts: {}, l2Groups: new Map() })
        }
        
        const l1Data = flagData.get(l1Name)!
        
        // Add to L1 Total
        l1Data.totalCounts[flag] = (l1Data.totalCounts[flag] || 0) + 1
        
        // Add to L2 Total
        if (!l1Data.l2Groups.has(l2Name)) {
          l1Data.l2Groups.set(l2Name, {})
        }
        const l2Counts = l1Data.l2Groups.get(l2Name)!
        l2Counts[flag] = (l2Counts[flag] || 0) + 1
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
      totalL1: l1Map.size,
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