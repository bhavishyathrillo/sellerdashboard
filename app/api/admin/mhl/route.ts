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
    // Get all srs_raw data
    const { data: srsData } = await supabase.from('srs_raw').select('*')
    
    if (!srsData) return NextResponse.json({ l1_data: [] })

    // Build set of seller emails
    const srsEmailSet = new Set<string>()
    srsData.forEach((row: any) => {
      const email = cleanEmail(row.seller_email || '')
      if (email) srsEmailSet.add(email)
    })

    // Fetch ALL leads by querying per seller email in batches
    const sellerEmailsArray = Array.from(srsEmailSet)
    const leadsByEmail: Record<string, any[]> = {}
    let totalFetched = 0

    // Process in batches of 30 emails at a time
    for (let i = 0; i < sellerEmailsArray.length; i += 30) {
      const batch = sellerEmailsArray.slice(i, i + 30)
      
      const { data: batchLeads, error } = await supabase
        .from('mhl_mho')
        .select('*')
        .in('owner_email', batch)
        .order('updated_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (batchLeads) {
        totalFetched += batchLeads.length
        batchLeads.forEach((lead: any) => {
          const key = cleanEmail(lead.owner_email || '')
          if (key && srsEmailSet.has(key)) {
            if (!leadsByEmail[key]) leadsByEmail[key] = []
            leadsByEmail[key].push(lead)
          }
        })
      }
    }

    // Build L1 hierarchy
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

    // Build response
    const l1Data: any[] = []
    
    for (const [, l1] of l1Map) {
      const l2Groups: any[] = []
      let totalLeads = 0
      let l2Count = 0

      for (const [, l2] of l1.l2Map) {
        const sellers: any[] = []
        let l2TotalLeads = 0

        for (const [sEmail, sName] of l2.sellers) {
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

    let totalLeadRows = 0
    for (const key in leadsByEmail) totalLeadRows += leadsByEmail[key].length

    return NextResponse.json({
      l1_data: l1Data,
      debug: {
        totalLeadsLoaded: totalLeadRows,
        totalFetchedAcrossBatches: totalFetched,
        uniqueOwnerEmails: Object.keys(leadsByEmail).length,
        srsEmails: srsEmailSet.size,
        batchesProcessed: Math.ceil(sellerEmailsArray.length / 30)
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}