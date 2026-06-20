import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      const { data: allSellers } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name')

      if (!allSellers || allSellers.length === 0) {
        return NextResponse.json({ admin: true, teamMetrics: null, l1Groups: [], lastUpdated: null })
      }

      const l1Emails = [...new Set(allSellers.map((s: any) => s.l1_email).filter(Boolean))]
      const sellerEmails = allSellers.map((s: any) => s.seller_email?.toLowerCase().trim()).filter(Boolean)

      const { data: allLeads } = await supabase
        .from('priority_leads')
        .select('*')
        .in('seller_email', sellerEmails)
        .order('updated_at', { ascending: false })

      const leads = allLeads || []
      const lastUpdated = leads.length > 0 ? leads[0].updated_at : null

      const l1Groups = l1Emails.map((l1Email: string) => {
        const l1Key = l1Email.toLowerCase().trim()
        const l1Sellers = allSellers.filter((s: any) => s.l1_email?.toLowerCase().trim() === l1Key)
        const l1Name = l1Sellers[0]?.l1_name || l1Email.split('@')[0]
        const l2Emails = [...new Set(l1Sellers.map((s: any) => s.l2_email).filter(Boolean))]

        const l2Groups = l2Emails.map((l2Email: string) => {
          const l2Key = l2Email.toLowerCase().trim()
          const l2Sellers = l1Sellers.filter((s: any) => s.l2_email?.toLowerCase().trim() === l2Key && s.seller_email?.toLowerCase().trim() !== l1Key && s.seller_email?.toLowerCase().trim() !== l2Key)
          const l2Name = l2Sellers[0]?.l2_name || l2Email.split('@')[0]
          const sellers = l2Sellers.map((s: any) => {
            const sellerLeads = leads.filter((l: any) => l.seller_email?.toLowerCase().trim() === s.seller_email?.toLowerCase().trim())
            return buildSellerData(s, sellerLeads)
          })
          const allL2Leads = sellers.flatMap((s: any) => s.leads)
          return { l2_name: l2Name, l2_email: l2Email, metrics: calcMetrics(allL2Leads), seller_count: sellers.length, sellers }
        })

        const allL1Leads = l2Groups.flatMap((g: any) => g.sellers.flatMap((s: any) => s.leads))
        return { l1_name: l1Name, l1_email: l1Email, metrics: calcMetrics(allL1Leads), l2_count: l2Groups.length, seller_count: l2Groups.reduce((sum, g) => sum + g.seller_count, 0), l2_groups: l2Groups }
      })

      return NextResponse.json({ admin: true, teamMetrics: calcMetrics(leads), l1Groups, totalL1: l1Groups.length, totalSellers: sellerEmails.length, lastUpdated })
    }

    // ========== L1 VIEW ==========
    if (role === 'L1') {
      const { data: allSellers } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name, l2_email, l2_name')
        .eq('l1_email', email.toLowerCase().trim())

      if (!allSellers || allSellers.length === 0) {
        return NextResponse.json({ team: true, isL1: true, teamMetrics: null, l2Groups: [], lastUpdated: null })
      }

      const l2Emails = [...new Set(allSellers.map((s: any) => s.l2_email).filter(Boolean))]
      const sellerEmails = allSellers.map((s: any) => s.seller_email?.toLowerCase().trim()).filter((e: string) => e && e !== email.toLowerCase().trim())

      const { data: allLeads } = await supabase
        .from('priority_leads')
        .select('*')
        .in('seller_email', sellerEmails)
        .order('updated_at', { ascending: false })

      const leads = allLeads || []
      const lastUpdated = leads.length > 0 ? leads[0].updated_at : null

      const l2Groups = l2Emails.map((l2Email: string) => {
        const l2Key = l2Email.toLowerCase().trim()
        const sellersUnderL2 = allSellers.filter((s: any) => s.l2_email?.toLowerCase().trim() === l2Key && s.seller_email?.toLowerCase().trim() !== l2Key && s.seller_email?.toLowerCase().trim() !== email.toLowerCase().trim())
        const l2Name = sellersUnderL2[0]?.l2_name || l2Email.split('@')[0]
        const sellers = sellersUnderL2.map((s: any) => {
          const sellerLeads = leads.filter((l: any) => l.seller_email?.toLowerCase().trim() === s.seller_email?.toLowerCase().trim())
          return buildSellerData(s, sellerLeads)
        })
        const allL2Leads = sellers.flatMap((s: any) => s.leads)
        return { l2_name: l2Name, l2_email: l2Email, metrics: calcMetrics(allL2Leads), seller_count: sellers.length, sellers }
      })

      return NextResponse.json({ team: true, isL1: true, teamMetrics: calcMetrics(leads), l2Groups, totalSellers: sellerEmails.length, lastUpdated })
    }

    // ========== L2 TEAM VIEW ==========
    if (role === 'L2' && view === 'team') {
      const { data: teamSellers } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name')
        .eq('l2_email', email.toLowerCase().trim())

      if (!teamSellers || teamSellers.length === 0) {
        return NextResponse.json({ team: true, isL2: true, sellers: [], metrics: null, lastUpdated: null })
      }

      const sellerEmails = teamSellers.map((s: any) => s.seller_email?.toLowerCase().trim()).filter((e: string) => e && e !== email.toLowerCase().trim())

      const { data: allLeads } = await supabase
        .from('priority_leads')
        .select('*')
        .in('seller_email', sellerEmails)
        .order('updated_at', { ascending: false })

      const leads = allLeads || []
      const lastUpdated = leads.length > 0 ? leads[0].updated_at : null

      const sellers = teamSellers.filter((s: any) => s.seller_email?.toLowerCase().trim() !== email.toLowerCase().trim()).map((s: any) => {
        const sellerLeads = leads.filter((l: any) => l.seller_email?.toLowerCase().trim() === s.seller_email?.toLowerCase().trim())
        return buildSellerData(s, sellerLeads)
      })

      return NextResponse.json({ team: true, isL2: true, teamMetrics: calcMetrics(leads), sellers, lastUpdated })
    }

    // ========== PERSONAL VIEW ==========
    const { data: leads, error } = await supabase
      .from('priority_leads')
      .select('*')
      .eq('seller_email', email.toLowerCase().trim())
      .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const allLeads = leads || []
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
  const mishandledLeads = leads.filter((l: any) => (l.answered_seconds_today || 0) === 0 && (l.dials_today || 0) < 2).length
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