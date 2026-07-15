import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

// ========== QB HELPERS ==========
function buildQbEnquiries(qbRow: any): any[] {
  const enquiries: any[] = []
  if (qbRow.passed_open_enq_codes) {
    qbRow.passed_open_enq_codes.split(',').forEach((code: string) => {
      const c = code.trim()
      if (c) enquiries.push({ code: c, feasibilityStatus: 'Passed', leadStatus: 'Open' })
    })
  }
  if (qbRow.not_passed_open_enq_codes) {
    qbRow.not_passed_open_enq_codes.split(',').forEach((code: string) => {
      const c = code.trim()
      if (c) enquiries.push({ code: c, feasibilityStatus: 'Failed', leadStatus: 'Open' })
    })
  }
  if (qbRow.passed_lost_enq_codes) {
    qbRow.passed_lost_enq_codes.split(',').forEach((code: string) => {
      const c = code.trim()
      if (c) enquiries.push({ code: c, feasibilityStatus: 'Passed', leadStatus: 'Lost' })
    })
  }
  if (qbRow.not_passed_lost_enq_codes) {
    qbRow.not_passed_lost_enq_codes.split(',').forEach((code: string) => {
      const c = code.trim()
      if (c) enquiries.push({ code: c, feasibilityStatus: 'Failed', leadStatus: 'Lost' })
    })
  }
  return enquiries
}

function buildSellerQbData(qbRow: any, sellerName: string, sellerEmail: string, srsRow?: any) {
  const enquiries = buildQbEnquiries(qbRow)
  const sent = Number(qbRow.sent_to_feasibility) || 0
  const passed = Number(qbRow.feasibility_passed) || 0
  const won = Number(qbRow.passed_and_won) || 0
  const lost = Number(qbRow.passed_and_lost) || 0
  const passedOpen = Number(qbRow.passed_and_open) || 0
  const notPassedOpen = Number(qbRow.not_passed_and_open) || 0
  const stuck = passedOpen + notPassedOpen
  const passRate = sent > 0 ? Math.round((passed / sent) * 100) : 0
  return {
    seller_name: sellerName,
    seller_email: sellerEmail,
    sent, passed, won, lost, stuck, passRate, enquiries,
    l1_email: srsRow?.l1_email || '',
    l1_name: srsRow?.l1_name || '',
    l2_email: srsRow?.l2_email || '',
    l2_name: srsRow?.l2_name || '',
  }
}
// ========== END QB HELPERS ==========

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
      const [
        { data: allSrs },
        { data: allLeads },
        { data: qbData }
      ] = await Promise.all([
        supabase.from('srs_raw').select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name'),
        supabase.from('priority_leads').select('*').order('updated_at', { ascending: false }),
        supabase.from('feasibility_seller_metrics').select('*')
      ])
      const qbSellers: any[] = (qbData || []).map((row: any) => {
        const emailKey = (row.seller_email || '').toLowerCase().trim()
        const srsRow = (allSrs || []).find((s: any) => (s.seller_email || '').toLowerCase().trim() === emailKey)
        const name = srsRow?.seller_name || emailKey.split('@')[0]
        return buildSellerQbData(row, name, emailKey, srsRow)
      })

      const leads = filterFollowUp(allLeads || [])
      const lastUpdated = leads.length > 0 ? leads[0].updated_at : null

      const srsMap: Record<string, any> = {}
      ;(allSrs || []).forEach((s: any) => {
        const key = (s.seller_email || '').toLowerCase().trim()
        if (key) srsMap[key] = s
      })

      const leadsBySeller: Record<string, any[]> = {}
      leads.forEach((l: any) => {
        const key = (l.seller_email || '').toLowerCase().trim()
        if (!leadsBySeller[key]) leadsBySeller[key] = []
        leadsBySeller[key].push(l)
      })

      const allSellerEmails = Object.keys(leadsBySeller)
      const l1GroupsMap: Record<string, any> = {}

      allSellerEmails.forEach((sellerEmail: string) => {
        const srsData = srsMap[sellerEmail]
        const sellerLeads = leadsBySeller[sellerEmail] || []
        const sellerName = srsData?.seller_name || sellerEmail.split('@')[0]

        let l1Email: string, l1Name: string, l2Email: string, l2Name: string

        if (srsData) {
          l1Email = (srsData.l1_email || '').toLowerCase().trim()
          l1Name = srsData.l1_name || l1Email.split('@')[0]
          l2Email = (srsData.l2_email || '').toLowerCase().trim()
          l2Name = srsData.l2_name || l2Email.split('@')[0]
          if (!l2Email || l2Email === l1Email) { l2Email = l1Email; l2Name = l1Name }
        } else {
          l1Email = 'unmapped'; l1Name = 'Not Mapped'
          l2Email = 'unknown'; l2Name = 'Unknown'
        }

        if (!l1GroupsMap[l1Email]) l1GroupsMap[l1Email] = { l1_name: l1Name, l1_email: l1Email, l2GroupsMap: {} }
        if (!l1GroupsMap[l1Email].l2GroupsMap[l2Email]) l1GroupsMap[l1Email].l2GroupsMap[l2Email] = { l2_name: l2Name, l2_email: l2Email, sellers: [] }
        l1GroupsMap[l1Email].l2GroupsMap[l2Email].sellers.push(buildSellerData({ seller_name: sellerName, seller_email: sellerEmail }, sellerLeads))
      })

      const l1Groups = Object.values(l1GroupsMap).map((l1: any) => {
        const l2Groups = Object.values(l1.l2GroupsMap).map((l2: any) => {
          const allL2Leads = l2.sellers.flatMap((s: any) => s.leads)
          return { l2_name: l2.l2_name, l2_email: l2.l2_email, metrics: calcMetrics(allL2Leads), seller_count: l2.sellers.length, sellers: l2.sellers }
        })
        const allL1Leads = l2Groups.flatMap((g: any) => g.sellers.flatMap((s: any) => s.leads))
        return { l1_name: l1.l1_name, l1_email: l1.l1_email, metrics: calcMetrics(allL1Leads), l2_count: l2Groups.length, seller_count: l2Groups.reduce((sum: number, g: any) => sum + g.seller_count, 0), l2_groups: l2Groups }
      })

      return NextResponse.json({ admin: true, teamMetrics: calcMetrics(leads), l1Groups, totalL1: l1Groups.length, totalSellers: allSellerEmails.length, lastUpdated, qbSellers })
    }

    // ========== CATEGORY MANAGER VIEW (role=L1 in DB) ==========
    if (role === 'L1') {
      const { data: allUnderCM } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name')
        .eq('l1_email', email.toLowerCase().trim())

      if (!allUnderCM || allUnderCM.length === 0) {
        return NextResponse.json({ team: true, isL1: true, teamMetrics: calcMetrics([]), l2Groups: [], lastUpdated: null, totalSellers: 0, qbSellers: [] })
      }

      const allSellerEmails = [...new Set(
        allUnderCM.map((s: any) => s.seller_email?.toLowerCase().trim()).filter((e: string) => e && e !== email.toLowerCase().trim())
      )]

      const [
        { data: qbData },
        { data: allLeads }
      ] = await Promise.all([
        supabase.from('feasibility_seller_metrics').select('*').in('seller_email', allSellerEmails),
        supabase.from('priority_leads').select('*').in('seller_email', allSellerEmails).order('updated_at', { ascending: false })
      ])

      const qbSellers: any[] = (qbData || []).map((row: any) => {
        const emailKey = (row.seller_email || '').toLowerCase().trim()
        const srsRow = (allUnderCM || []).find((s: any) => (s.seller_email || '').toLowerCase().trim() === emailKey)
        return buildSellerQbData(row, srsRow?.seller_name || emailKey.split('@')[0], emailKey, srsRow)
      })

      const leads = filterFollowUp(allLeads || [])
      const leadsBySeller: Record<string, any[]> = {}
      leads.forEach((l: any) => { const key = (l.seller_email || '').toLowerCase().trim(); if (!leadsBySeller[key]) leadsBySeller[key] = []; leadsBySeller[key].push(l) })

      const l2GroupsMap: Record<string, any> = {}
      allUnderCM.forEach((s: any) => {
        const sKey = (s.seller_email || '').toLowerCase().trim()
        if (sKey === email.toLowerCase().trim()) return
        let l2Email = (s.l2_email || '').toLowerCase().trim()
        let l2Name = s.l2_name || l2Email.split('@')[0]
        if (!l2Email || l2Email === email.toLowerCase().trim()) { l2Email = email.toLowerCase().trim(); l2Name = 'Direct' }
        if (!l2GroupsMap[l2Email]) l2GroupsMap[l2Email] = { l2_name: l2Name, l2_email: l2Email, sellers: [] }
        const sellerLeads = leadsBySeller[sKey] || []
        if (sellerLeads.length > 0) l2GroupsMap[l2Email].sellers.push(buildSellerData({ seller_name: s.seller_name || sKey.split('@')[0], seller_email: sKey }, sellerLeads))
      })

      const l2Groups = Object.values(l2GroupsMap).map((l2: any) => { const allL2Leads = l2.sellers.flatMap((s: any) => s.leads); return { ...l2, metrics: calcMetrics(allL2Leads), seller_count: l2.sellers.length } })

      return NextResponse.json({ team: true, isL1: true, teamMetrics: calcMetrics(leads), l2Groups, totalSellers: allSellerEmails.length, lastUpdated: leads.length > 0 ? leads[0].updated_at : null, qbSellers })
    }

    // ========== L1 MANAGER VIEW (role=L2 in DB) ==========
    if (role === 'L2' && view === 'team') {
      const { data: teamSellers } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name')
        .eq('l2_email', email.toLowerCase().trim())

      if (!teamSellers || teamSellers.length === 0) {
        return NextResponse.json({ team: true, isL2: true, sellers: [], teamMetrics: calcMetrics([]), lastUpdated: null, qbSellers: [] })
      }

      const sellerEmails = teamSellers
        .map((s: any) => s.seller_email?.toLowerCase().trim())
        .filter((e: string) => e && e !== email.toLowerCase().trim())

      const [
        { data: qbData },
        { data: myQbRow },
        { data: managerSrsRow },
        { data: allLeads }
      ] = await Promise.all([
        supabase.from('feasibility_seller_metrics').select('*').in('seller_email', sellerEmails),
        supabase.from('feasibility_seller_metrics').select('*').eq('seller_email', email.toLowerCase().trim()).single(),
        supabase.from('srs_raw').select('seller_name').eq('seller_email', email.toLowerCase().trim()).single(),
        supabase.from('priority_leads').select('*').in('seller_email', sellerEmails).order('updated_at', { ascending: false })
      ])

      const managerName = managerSrsRow?.seller_name || email.split('@')[0]

      const qbSellers: any[] = (qbData || []).map((row: any) => {
        const emailKey = (row.seller_email || '').toLowerCase().trim()
        const srsRow = (teamSellers || []).find((s: any) => (s.seller_email || '').toLowerCase().trim() === emailKey)
        return buildSellerQbData(row, srsRow?.seller_name || emailKey.split('@')[0], emailKey, srsRow)
      })

      // Add the L1 Manager's own data at the beginning (with correct name so frontend can match by email)
      if (myQbRow) {
        qbSellers.unshift(buildSellerQbData(myQbRow, managerName, email.toLowerCase().trim()))
      } else {
        // Always include the manager as an entry with zeros so the frontend can find them by email
        qbSellers.unshift({ seller_name: managerName, seller_email: email.toLowerCase().trim(), sent: 0, passed: 0, won: 0, lost: 0, stuck: 0, passRate: 0, enquiries: [], l1_email: '', l1_name: '', l2_email: '', l2_name: '' })
      }

      const leads = filterFollowUp(allLeads || [])
      const leadsBySeller: Record<string, any[]> = {}
      leads.forEach((l: any) => { const key = (l.seller_email || '').toLowerCase().trim(); if (!leadsBySeller[key]) leadsBySeller[key] = []; leadsBySeller[key].push(l) })

      const sellers = teamSellers
        .filter((s: any) => s.seller_email?.toLowerCase().trim() !== email.toLowerCase().trim())
        .map((s: any) => buildSellerData(s, leadsBySeller[(s.seller_email || '').toLowerCase().trim()] || []))
        .filter((s: any) => s.metrics.totalLeads > 0)

      return NextResponse.json({ team: true, isL2: true, teamMetrics: calcMetrics(leads), sellers, lastUpdated: leads.length > 0 ? leads[0].updated_at : null, qbSellers })
    }

    // ========== PERSONAL VIEW ==========
    const [
      { data: leads, error },
      { data: qbRow }
    ] = await Promise.all([
      supabase.from('priority_leads').select('*').eq('seller_email', email.toLowerCase().trim()).order('updated_at', { ascending: false }),
      supabase.from('feasibility_seller_metrics').select('*').eq('seller_email', email.toLowerCase().trim()).single()
    ])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let qbSellers: any[] = []
    if (qbRow) qbSellers = [buildSellerQbData(qbRow, '', email.toLowerCase().trim())]

    const allLeads = filterFollowUp(leads || [])
    return NextResponse.json({ team: false, leads: allLeads, metrics: calcMetrics(allLeads), lastUpdated: allLeads.length > 0 ? allLeads[0].updated_at : null, qbSellers })
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
  const mishandledLeads = leads.filter((l: any) => (l.final_status || '').toLowerCase() === 'mishandled').length
  const mishandledPct = totalLeads > 0 ? Math.round((mishandledLeads / totalLeads) * 100 * 10) / 10 : 0
  const calledLeadsData = leads.filter((l: any) => (l.dials_today || 0) > 0)
  const totalDuration = calledLeadsData.reduce((sum: number, l: any) => sum + (l.answered_seconds_today || 0), 0)
  const avgDurationSeconds = calledLeadsData.length > 0 ? Math.round(totalDuration / calledLeadsData.length) : 0
  const conversationHappenedLeads = leads.filter((l: any) => { const s = (l.final_status || '').toLowerCase().trim(); return s === 'convo happened' || s === 'conversation happened' }).length
  const twoAttemptsDoneLeads = leads.filter((l: any) => { const s = (l.final_status || '').toLowerCase().trim(); return s === '2 attempts done' || s === 'two attempts done' }).length
  return { totalLeads, calledLeads, notCalledLeads: totalLeads - calledLeads, mishandledLeads, mishandledPct, avgDurationSeconds, avgDurationFormatted: fmtDuration(avgDurationSeconds), conversationHappenedLeads, twoAttemptsDoneLeads }
}

function fmtDuration(seconds: number) {
  if (seconds === 0) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}