import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function filterFollowUp(leads: any[]) {
  return leads.filter((l: any) => {
    const stage = (l.stage || '').toLowerCase().trim()
    const leadStatus = (l.lead_status || '').toLowerCase().trim()
    const finalStatus = (l.final_status || '').toLowerCase().trim()
    if (stage === 'follow up') return false
    if (leadStatus === 'follow up') return false
    if (finalStatus === 'follow up') return false
    return true
  })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const role = searchParams.get('role')
  const view = searchParams.get('view')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  try {
    // ========== ADMIN VIEW ==========
    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      // Get ALL srs_raw data for mapping
      const { data: allSrs } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name')

      // Get ALL priority leads
      const { data: allLeads } = await supabase
        .from('priority_leads')
        .select('*')
        .order('updated_at', { ascending: false })

      const leads = filterFollowUp(allLeads || [])
      const lastUpdated = leads.length > 0 ? leads[0].updated_at : null

      // Build SRS lookup: seller_email → { l1_email, l1_name, l2_email, l2_name }
      const srsMap: Record<string, any> = {}
      const srsEmailSet = new Set<string>()
      ;(allSrs || []).forEach((s: any) => {
        const key = (s.seller_email || '').toLowerCase().trim()
        if (key) {
          srsMap[key] = s
          srsEmailSet.add(key)
        }
      })

      // Index leads by seller
      const leadsBySeller: Record<string, any[]> = {}
      leads.forEach((l: any) => {
        const key = (l.seller_email || '').toLowerCase().trim()
        if (!leadsBySeller[key]) leadsBySeller[key] = []
        leadsBySeller[key].push(l)
      })

      // Get all unique seller emails from priority_leads
      const allSellerEmails = Object.keys(leadsBySeller)

      // Group by L1
      const l1GroupsMap: Record<string, any> = {}

      allSellerEmails.forEach((sellerEmail: string) => {
        const srsData = srsMap[sellerEmail]
        const sellerLeads = leadsBySeller[sellerEmail] || []
        const sellerName = srsData?.seller_name || sellerEmail.split('@')[0]

        let l1Email: string
        let l1Name: string
        let l2Email: string
        let l2Name: string

        if (srsData) {
          l1Email = (srsData.l1_email || '').toLowerCase().trim()
          l1Name = srsData.l1_name || l1Email.split('@')[0]
          l2Email = (srsData.l2_email || '').toLowerCase().trim()
          l2Name = srsData.l2_name || l2Email.split('@')[0]

          // If no L2 or L2 = L1, seller reports directly to L1
          if (!l2Email || l2Email === l1Email) {
            l2Email = l1Email
            l2Name = l1Name
          }
        } else {
          // Not in SRS → unmapped
          l1Email = 'unmapped'
          l1Name = 'Not Mapped'
          l2Email = 'unknown'
          l2Name = 'Unknown'
        }

        // Initialize L1 group
        if (!l1GroupsMap[l1Email]) {
          l1GroupsMap[l1Email] = {
            l1_name: l1Name,
            l1_email: l1Email,
            l2GroupsMap: {}
          }
        }

        // Initialize L2 group
        if (!l1GroupsMap[l1Email].l2GroupsMap[l2Email]) {
          l1GroupsMap[l1Email].l2GroupsMap[l2Email] = {
            l2_name: l2Name,
            l2_email: l2Email,
            sellers: []
          }
        }

        // Add seller
        l1GroupsMap[l1Email].l2GroupsMap[l2Email].sellers.push(
          buildSellerData({ seller_name: sellerName, seller_email: sellerEmail }, sellerLeads)
        )
      })

      // Convert maps to arrays
      const l1Groups = Object.values(l1GroupsMap).map((l1: any) => {
        const l2Groups = Object.values(l1.l2GroupsMap).map((l2: any) => {
          const allL2Leads = l2.sellers.flatMap((s: any) => s.leads)
          return {
            l2_name: l2.l2_name,
            l2_email: l2.l2_email,
            metrics: calcMetrics(allL2Leads),
            seller_count: l2.sellers.length,
            sellers: l2.sellers
          }
        })

        const allL1Leads = l2Groups.flatMap((g: any) => g.sellers.flatMap((s: any) => s.leads))
        return {
          l1_name: l1.l1_name,
          l1_email: l1.l1_email,
          metrics: calcMetrics(allL1Leads),
          l2_count: l2Groups.length,
          seller_count: l2Groups.reduce((sum: number, g: any) => sum + g.seller_count, 0),
          l2_groups: l2Groups
        }
      })

      const teamMetrics = calcMetrics(leads)
      const totalSellers = allSellerEmails.length

      return NextResponse.json({ admin: true, teamMetrics, l1Groups, totalL1: l1Groups.length, totalSellers, lastUpdated })
    }

    // ========== L1 VIEW ==========
    if (role === 'L1') {
      const { data: allSellers } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name, l2_email, l2_name')
        .eq('l1_email', email.toLowerCase().trim())

      if (!allSellers || allSellers.length === 0) {
        return NextResponse.json({ team: true, isL1: true, teamMetrics: calcMetrics([]), l2Groups: [], lastUpdated: null, totalSellers: 0 })
      }

      const sellerEmails = allSellers
        .map((s: any) => s.seller_email?.toLowerCase().trim())
        .filter((e: string) => e && e !== email.toLowerCase().trim())

      const { data: allLeads } = await supabase
        .from('priority_leads')
        .select('*')
        .in('seller_email', sellerEmails)
        .order('updated_at', { ascending: false })

      const leads = filterFollowUp(allLeads || [])
      const lastUpdated = leads.length > 0 ? leads[0].updated_at : null

      const leadsBySeller: Record<string, any[]> = {}
      leads.forEach((l: any) => {
        const key = (l.seller_email || '').toLowerCase().trim()
        if (!leadsBySeller[key]) leadsBySeller[key] = []
        leadsBySeller[key].push(l)
      })

      // Group by L2
      const l2GroupsMap: Record<string, any> = {}

      allSellers.forEach((s: any) => {
        const sKey = (s.seller_email || '').toLowerCase().trim()
        if (sKey === email.toLowerCase().trim()) return

        let l2Email = (s.l2_email || '').toLowerCase().trim()
        let l2Name = s.l2_name || l2Email.split('@')[0]

        if (!l2Email || l2Email === email.toLowerCase().trim()) {
          l2Email = email.toLowerCase().trim()
          l2Name = 'Direct'
        }

        if (!l2GroupsMap[l2Email]) {
          l2GroupsMap[l2Email] = { l2_name: l2Name, l2_email: l2Email, sellers: [] }
        }

        const sellerLeads = leadsBySeller[sKey] || []
        if (sellerLeads.length > 0) {
          l2GroupsMap[l2Email].sellers.push(
            buildSellerData({ seller_name: s.seller_name || sKey.split('@')[0], seller_email: sKey }, sellerLeads)
          )
        }
      })

      const l2Groups = Object.values(l2GroupsMap).map((l2: any) => {
        const allL2Leads = l2.sellers.flatMap((s: any) => s.leads)
        return { ...l2, metrics: calcMetrics(allL2Leads), seller_count: l2.sellers.length }
      })

      const teamMetrics = calcMetrics(leads)

      return NextResponse.json({ team: true, isL1: true, teamMetrics, l2Groups, totalSellers: sellerEmails.length, lastUpdated })
    }

    // ========== L2 TEAM VIEW ==========
    if (role === 'L2' && view === 'team') {
      const { data: teamSellers } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name')
        .eq('l2_email', email.toLowerCase().trim())

      if (!teamSellers || teamSellers.length === 0) {
        return NextResponse.json({ team: true, isL2: true, sellers: [], teamMetrics: calcMetrics([]), lastUpdated: null })
      }

      const sellerEmails = teamSellers
        .map((s: any) => s.seller_email?.toLowerCase().trim())
        .filter((e: string) => e && e !== email.toLowerCase().trim())

      const { data: allLeads } = await supabase
        .from('priority_leads')
        .select('*')
        .in('seller_email', sellerEmails)
        .order('updated_at', { ascending: false })

      const leads = filterFollowUp(allLeads || [])
      const lastUpdated = leads.length > 0 ? leads[0].updated_at : null

      const leadsBySeller: Record<string, any[]> = {}
      leads.forEach((l: any) => {
        const key = (l.seller_email || '').toLowerCase().trim()
        if (!leadsBySeller[key]) leadsBySeller[key] = []
        leadsBySeller[key].push(l)
      })

      const sellers = teamSellers
        .filter((s: any) => s.seller_email?.toLowerCase().trim() !== email.toLowerCase().trim())
        .map((s: any) => {
          const key = (s.seller_email || '').toLowerCase().trim()
          const sellerLeads = leadsBySeller[key] || []
          return buildSellerData(s, sellerLeads)
        })
        .filter((s: any) => s.metrics.totalLeads > 0)

      const teamMetrics = calcMetrics(leads)

      return NextResponse.json({ team: true, isL2: true, teamMetrics, sellers, lastUpdated })
    }

    // ========== PERSONAL VIEW ==========
    const { data: leads, error } = await supabase
      .from('priority_leads')
      .select('*')
      .eq('seller_email', email.toLowerCase().trim())
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const allLeads = filterFollowUp(leads || [])
    const lastUpdated = allLeads.length > 0 ? allLeads[0].updated_at : null

    return NextResponse.json({ team: false, leads: allLeads, metrics: calcMetrics(allLeads), lastUpdated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function buildSellerData(seller: any, leads: any[]) {
  return { seller_name: seller.seller_name || seller.seller_email?.split('@')[0] || 'Unknown', seller_email: seller.seller_email, metrics: calcMetrics(leads), leads }
}

function calcMetrics(leads: any[]) {
  const totalLeads = leads.length
  const calledLeads = leads.filter((l: any) => (l.dials_today || 0) > 0).length
  const notCalledLeads = totalLeads - calledLeads
  const mishandledLeads = leads.filter((l: any) => (l.final_status || '').toLowerCase() === 'mishandled').length
  const mishandledPct = totalLeads > 0 ? Math.round((mishandledLeads / totalLeads) * 100 * 10) / 10 : 0
  const calledLeadsData = leads.filter((l: any) => (l.dials_today || 0) > 0)
  const totalDuration = calledLeadsData.reduce((sum: number, l: any) => sum + (l.answered_seconds_today || 0), 0)
  const avgDurationSeconds = calledLeadsData.length > 0 ? Math.round(totalDuration / calledLeadsData.length) : 0
  return { totalLeads, calledLeads, notCalledLeads, mishandledLeads, mishandledPct, avgDurationSeconds, avgDurationFormatted: fmtDuration(avgDurationSeconds) }
}

function fmtDuration(seconds: number) {
  if (seconds === 0) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}