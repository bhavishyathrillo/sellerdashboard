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
    // Get ALL srs_raw data for hierarchy
    const { data: srsData } = await supabase.from('srs_raw').select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name').limit(5000)
    if (!srsData) return NextResponse.json({ l1_data: [] })

    // 🔥 Fetch ALL mhl_mho leads using cursor pagination (SAME as personal API)
    let allLeads: any[] = []
    let lastId = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('mhl_mho')
        .select('id, lead_id, stage, owner_email, last_call, mhl_mho, updated_at')
        .order('id', { ascending: true })
        .limit(pageSize)

      if (lastId > 0) query = query.gt('id', lastId)
      const { data: chunk, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!chunk || chunk.length === 0) hasMore = false
      else { allLeads = allLeads.concat(chunk); lastId = chunk[chunk.length - 1].id; if (chunk.length < pageSize) hasMore = false }
    }

    // 🔥 Index leads by owner_email (SAME as personal API)
    const leadsByEmail: Record<string, any[]> = {}
    allLeads.forEach((lead: any) => {
      const key = cleanEmail(lead.owner_email || '')
      if (key) {
        if (!leadsByEmail[key]) leadsByEmail[key] = []
        leadsByEmail[key].push(lead)
      }
    })

    // Build L1 hierarchy from SRS
    const l1Map = new Map<string, any>()
    srsData.forEach((row: any) => {
      const l1Email = cleanEmail(row.l1_email || '')
      if (!l1Email) return
      if (!l1Map.has(l1Email)) l1Map.set(l1Email, {
        l1_name: row.l1_name || l1Email.split('@')[0],
        l1_email: l1Email,
        l2Map: new Map()
      })
      
      const l1 = l1Map.get(l1Email)!
      const l2Email = cleanEmail(row.l2_email || '') || 'direct'
      if (!l1.l2Map.has(l2Email)) l1.l2Map.set(l2Email, {
        l2_name: row.l2_name || l2Email.split('@')[0],
        l2_email: l2Email,
        sellers: new Map()
      })
      
      const sEmail = cleanEmail(row.seller_email || '')
      const sName = row.seller_name || sEmail?.split('@')[0] || 'Unknown'
      if (sEmail && !l1.l2Map.get(l2Email)!.sellers.has(sEmail)) {
        l1.l2Map.get(l2Email)!.sellers.set(sEmail, sName)
      }
    })

    // Build response using SAME lead counts as personal API
    const l1Data: any[] = []
    
    for (const [, l1] of l1Map) {
      const l2Groups: any[] = []
      let totalLeads = 0
      let l2Count = 0

      for (const [, l2] of l1.l2Map) {
        const sellers: any[] = []
        let l2TotalLeads = 0

        for (const [sEmail, sName] of l2.sellers) {
          // 🔥 Use EXACT same leadsByEmail as personal API
          const sellerLeads = leadsByEmail[sEmail] || []
          
          const stageGroups: Record<string, any[]> = {}
          sellerLeads.forEach((lead: any) => {
            const stage = lead.stage || 'unknown'
            if (!stageGroups[stage]) stageGroups[stage] = []
            stageGroups[stage].push(lead)
          })

          sellers.push({
            seller_name: sName,
            seller_email: sEmail,
            total_leads: sellerLeads.length,
            stageGroups,
            leads: sellerLeads
          })
          l2TotalLeads += sellerLeads.length
        }

        if (sellers.length > 0) {
          l2Groups.push({
            l2_name: l2.l2_name,
            l2_email: l2.l2_email,
            seller_count: sellers.length,
            total_leads: l2TotalLeads,
            sellers
          })
          l2Count++
        }
        totalLeads += l2TotalLeads
      }

      l1Data.push({
        l1_name: l1.l1_name,
        l1_email: l1.l1_email,
        total_leads: totalLeads,
        l2_count: l2Count,
        l2_groups: l2Groups
      })
    }

    return NextResponse.json({ l1_data: l1Data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}