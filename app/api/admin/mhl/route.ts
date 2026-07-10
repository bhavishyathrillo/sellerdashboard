import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function cleanEmail(e: string): string {
  return (e || '').toLowerCase().trim()
}

async function fetchAllPages(baseQuery: any, idCol: string = 'id', pageSize = 1000): Promise<any[]> {
  let all: any[] = []
  let lastId = 0
  let hasMore = true
  while (hasMore) {
    const q = lastId > 0 ? baseQuery.gt(idCol, lastId) : baseQuery
    const { data: chunk, error } = await q.limit(pageSize)
    if (error) throw error
    if (!chunk || chunk.length === 0) { hasMore = false }
    else {
      all = all.concat(chunk)
      lastId = chunk[chunk.length - 1][idCol]
      if (chunk.length < pageSize) hasMore = false
    }
  }
  return all
}

export async function GET() {
  try {
    // ── Fetch SRS hierarchy ─────────────────────────────────────────────
    // Fetch today's availability
    const todayStr = new Date(Date.now() + 19800000).toISOString().split('T')[0]
    const { data: mhlDailyRaw } = await supabase.schema('seller_day_to_day').from('mhl_daily')
      .select('seller_email, available_today')
      .eq('activity_date', todayStr)
      .limit(1000)

    const absentSellers = new Set((mhlDailyRaw || [])
      .filter((r: any) => r.available_today === false || r.available_today === 'false')
      .map((r: any) => cleanEmail(r.seller_email)))
      
    const isSunday = new Date(Date.now() + 19800000).getDay() === 0

    let { data: srsData } = await supabase
      .from('srs_raw')
      .select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name')
      
    if (!srsData) return NextResponse.json({ l1_data: [] })

    if (isSunday) {
      srsData = []
    } else {
      srsData = srsData.filter(row => !absentSellers.has(cleanEmail(row.seller_email || '')))
    }

    // ── 1) Paginate mishandled leads (mhl_mho = 'Mishandled') ──────────
    const allLeads = await fetchAllPages(
      supabase
        .from('mhl_mho')
        .select('id, lead_id, stage, owner_email, last_call, mhl_mho, updated_at')
        .ilike('mhl_mho', '%mishandled%')
        .order('id', { ascending: true }),
      'id'
    )

    // ── 2) Paginate total open leads from mhl_mho (all non-closed) ──────
    //    Denominator for MHE% — same source table, no mhl_mho column filter
    const allOpenRaw = await fetchAllPages(
      supabase
        .from('mhl_mho')
        .select('id, owner_email')
        .not('stage', 'ilike', '%closed%')
        .order('id', { ascending: true }),
      'id'
    )

    // ── Build per-seller open count map (keyed by owner_email) ─────────
    const openCountMap: Record<string, number> = {}
    allOpenRaw.forEach((r: any) => {
      const e = cleanEmail(r.owner_email || '')
      if (e) openCountMap[e] = (openCountMap[e] || 0) + 1
    })

    // ── Index mishandled leads by owner_email ──────────────────────────
    const leadsByEmail: Record<string, any[]> = {}
    allLeads.forEach((lead: any) => {
      const key = cleanEmail(lead.owner_email || '')
      if (key) {
        if (!leadsByEmail[key]) leadsByEmail[key] = []
        leadsByEmail[key].push(lead)
      }
    })

    // ── Build L1 hierarchy from SRS ────────────────────────────────────
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

    // ── Build response with MHE% ────────────────────────────────────────
    const l1Data: any[] = []

    for (const [, l1] of l1Map) {
      const l2Groups: any[] = []
      let totalLeads = 0
      let totalOpen = 0
      let l2Count = 0

      for (const [, l2] of l1.l2Map) {
        const sellers: any[] = []
        let l2TotalLeads = 0
        let l2TotalOpen = 0

        for (const [sEmail, sName] of l2.sellers) {
          const sellerLeads = leadsByEmail[sEmail] || []
          const sellerOpen = openCountMap[sEmail] || 0

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
            total_open_leads: sellerOpen,
            mhe_pct: sellerOpen > 0 ? Math.round((sellerLeads.length / sellerOpen) * 100) : 0,
            stageGroups,
            leads: sellerLeads
          })
          l2TotalLeads += sellerLeads.length
          l2TotalOpen += sellerOpen
        }

        if (sellers.length > 0) {
          l2Groups.push({
            l2_name: l2.l2_name,
            l2_email: l2.l2_email,
            seller_count: sellers.length,
            total_leads: l2TotalLeads,
            total_open_leads: l2TotalOpen,
            mhe_pct: l2TotalOpen > 0 ? Math.round((l2TotalLeads / l2TotalOpen) * 100) : 0,
            sellers
          })
          l2Count++
        }
        totalLeads += l2TotalLeads
        totalOpen += l2TotalOpen
      }

      l1Data.push({
        l1_name: l1.l1_name,
        l1_email: l1.l1_email,
        total_leads: totalLeads,
        total_open_leads: totalOpen,
        mhe_pct: totalOpen > 0 ? Math.round((totalLeads / totalOpen) * 100) : 0,
        l2_count: l2Count,
        l2_groups: l2Groups
      })
    }

    return NextResponse.json({ l1_data: l1Data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}