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
    const { data: l1List } = await supabase.from('srs_raw').select('l1_email, l1_name')
    if (!l1List) return NextResponse.json({ l1_data: [] })

    const l1Map = new Map<string, string>()
    l1List.forEach((row: any) => {
      const email = cleanEmail(row.l1_email || '')
      if (email && !l1Map.has(email)) l1Map.set(email, row.l1_name || email.split('@')[0])
    })

    const { data: allSellers } = await supabase.from('srs_raw').select('seller_email, seller_name, l1_email, l2_email, l2_name')
    if (!allSellers) return NextResponse.json({ l1_data: [] })

    // Build set of valid seller emails from SRS
    const srsEmailSet = new Set<string>()
    allSellers.forEach((s: any) => {
      const e = cleanEmail(s.seller_email || '')
      if (e) srsEmailSet.add(e)
    })

    // 🔥 Fetch ALL leads from mhl_mho (no .in() filter — get everything)
    const pageSize = 1000
    const totalPages = Math.ceil(totalRecords / pageSize)
    
    // 2. Fetch all pages in parallel
    const promises = []
    for (let page = 0; page < totalPages; page++) {
      const start = page * pageSize
      const end = start + pageSize - 1
      promises.push(
        supabase
          .from('mhl_mho')
          .select('id, lead_id, stage, owner_email, last_call, mhl_mho, updated_at')
          .order('updated_at', { ascending: false })
          .range(start, end)
      )
    }

    const results = await Promise.all(promises)
    let allLeads: any[] = []
    
    for (const res of results) {
      if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
      if (res.data) allLeads = allLeads.concat(res.data)
    }

    // 🔥 Filter leads to ONLY include sellers in srs_raw
    const leadsByEmail: Record<string, any[]> = {}
    let totalFilteredLeads = 0
    allLeads.forEach((lead: any) => {
      const key = cleanEmail(lead.owner_email || '')
      if (key && srsEmailSet.has(key)) {
        if (!leadsByEmail[key]) leadsByEmail[key] = []
        leadsByEmail[key].push(lead)
        totalFilteredLeads++
      }
    })

    // Build L1 data
    const l1Data: any[] = []

    for (const [l1Email, l1Name] of l1Map) {
      const teamSellers = allSellers.filter((s: any) => cleanEmail(s.l1_email) === l1Email && cleanEmail(s.seller_email) !== l1Email)
      
      if (teamSellers.length === 0) {
        l1Data.push({ l1_name: l1Name, l1_email: l1Email, total_leads: 0, l2_count: 0, l2_groups: [] })
        continue
      }

      const l2Emails = [...new Set(teamSellers.map((s: any) => cleanEmail(s.l2_email)).filter(Boolean))]
      const l2Groups: any[] = []
      let totalLeads = 0
      let l2Count = 0

      for (const l2Email of l2Emails) {
        const sellersUnderL2 = teamSellers.filter((s: any) => cleanEmail(s.l2_email) === l2Email)
        if (sellersUnderL2.length === 0) continue

        const l2Name = sellersUnderL2[0]?.l2_name || l2Email.split('@')[0]
        const sellers: any[] = []
        let l2TotalLeads = 0

        for (const s of sellersUnderL2) {
          const sEmail = cleanEmail(s.seller_email)
          const sellerLeads = leadsByEmail[sEmail] || []
          const stageGroups: Record<string, any[]> = {}
          sellerLeads.forEach((lead: any) => {
            const stage = lead.stage || 'unknown'
            if (!stageGroups[stage]) stageGroups[stage] = []
            stageGroups[stage].push(lead)
          })
          sellers.push({ seller_name: s.seller_name || sEmail.split('@')[0], seller_email: sEmail, total_leads: sellerLeads.length, stageGroups, leads: sellerLeads })
          l2TotalLeads += sellerLeads.length
        }

        if (sellers.length > 0) {
          l2Groups.push({ l2_name: l2Name, l2_email: l2Email, seller_count: sellers.length, total_leads: l2TotalLeads, sellers })
          l2Count++
        }
        totalLeads += l2TotalLeads
      }

      l1Data.push({ l1_name: l1Name, l1_email: l1Email, total_leads: totalLeads, l2_count: l2Count, l2_groups: l2Groups })
    }

    return NextResponse.json({ l1_data: l1Data, debug: { totalLeadsLoaded: allLeads.length, totalFilteredLeads, uniqueSellers: Object.keys(leadsByEmail).length, srsEmails: srsEmailSet.size } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}