import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

function cleanEmail(e: string): string {
  return (e || '').toLowerCase().trim()
}

export async function GET(req: Request) {
  const fetchAll = async (builder: any) => {
    let allData: any[] = []
    let from = 0
    const step = 1000
    while (true) {
      const { data, error } = await builder.range(from, from + step - 1)
      if (error) { console.error(error); break }
      if (!data || data.length === 0) break
      allData = allData.concat(data)
      if (data.length < step) break
      from += step
    }
    return { data: allData }
  }

  try {
    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    const category = searchParams.get('category') // optional filter

    // Use IST date if none provided
    const queryDate = dateParam || new Date(Date.now() + 19800000).toISOString().split('T')[0]

    // ── 1. Fetch org hierarchy ──────────────────────────────────────────
    const { data: allSellers, error: sellersError } = await supabase
      .from('srs_raw')
      .select('seller_email, seller_name, l1_email, l1_name, l2_email, l2_name')
      .limit(5000)

    if (sellersError) {
      return NextResponse.json({ error: sellersError.message }, { status: 500 })
    }

    if (!allSellers || allSellers.length === 0) {
      return NextResponse.json({ error: 'No sellers found' }, { status: 404 })
    }

    const filteredSellers = category && category !== 'All Categories'
      ? allSellers.filter(s => (s.l1_name || '').trim() === category)
      : allSellers

    const emails = filteredSellers.map(s => s.seller_email).filter(Boolean)

    // Build category/TL/seller counts
    const categorySet = new Set(allSellers.map(s => (s.l1_name || '').trim()).filter(Boolean))
    const tlSet = new Set(allSellers.map(s => (s.l2_name || '').trim()).filter(Boolean))
    const categories = Array.from(categorySet).sort()

    // Compute month bounds for monthly data
    const [qy, qm] = queryDate.split('-').map(Number)
    const monthStart = `${qy}-${String(qm).padStart(2, '0')}-01`
    const lastDay = new Date(qy, qm, 0).getDate()
    const monthEnd = `${qy}-${String(qm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // ── 2. Parallel data fetch ──────────────────────────────────────────
    const [
      attendanceRes,
      orbitRes,
      allotmentRes,
      ltaRes,
      dotRes,
      goalRes,
      srsJulyRes,
      monthlyLtaRes,
      monthlyGoalRes,
      hourlyRes,
      monthlyAllotmentRes,
      ctiRes,
      plannedLtaRes,
    ] = await Promise.all([
      // Attendance (login, breaks)
      supabase.schema('seller_day_to_day')
        .from('seller_attendance')
        .select('email, first_login, last_logout, break_timestamps')
        .eq('work_date', queryDate),

      // Orbit availability
      supabase.schema('seller_day_to_day')
        .from('seller_availability')
        .select('seller_email, available_timestamps_ist')
        .eq('work_date', queryDate),

      // Allotment summary (auto/manual, RTG, pax, first lead time)
      supabase.schema('seller_day_to_day')
        .from('daily_allotment_summary')
        .select('seller_email, total_leads_allotted, auto_allotted, manual_allotted, rtg_leads, non_rtg_leads, pax_1, pax_2, pax_3, pax_4, pax_4_plus, first_lead_allotted_at_ist, median_creation_to_allotment_mins')
        .eq('allotment_date', queryDate),

      // LTA log (LTA funnel + MHE)
      supabase
        .from('daily_lta_log')
        .select('seller_email, lead_goal, wd, final_lta, real_dynamic_lta, hygiene_lta, goal_completion_logic_lta, mishandled_pct, mishandled_enquiries, open_enquiries')
        .eq('log_date', queryDate),

      // DOT distribution
      supabase.schema('seller_day_to_day')
        .from('seller_dot_distribution')
        .select('seller_email, dot_month, total_leads_allotted'),

      // Goal vs SHB
      supabase
        .from('goal_vs_shb')
        .select('seller_email, goal_pct, achievement_pct')
        .eq('date', queryDate),

      // SRS July for monthly goals
      fetchAll(supabase
        .from('srs_july')
        .select('seller_email, bottomline_goal, bl_actual_splits, bottomline_should_have_been, seller_flag')),

      // Monthly LTA log for MHE trend and Appetite
      fetchAll(supabase
        .from('daily_lta_log')
        .select('seller_email, log_date, mishandled_pct, mishandled_enquiries, final_lta')
        .gte('log_date', monthStart)
        .lte('log_date', monthEnd)),

      // Monthly Goal vs SHB for Goal trend
      fetchAll(supabase
        .from('goal_vs_shb')
        .select('seller_email, date, goal_completion, shb_percent')
        .gte('date', monthStart)
        .lte('date', monthEnd)),

      // Hourly Leads for Timeline
      fetchAll(supabase.schema('seller_day_to_day')
        .from('seller_hourly_allotment')
        .select('seller_email, time_bucket, leads_allotted_in_bucket')
        .eq('work_date', queryDate)),

      // Monthly Allotment for Breakdown KPIs
      fetchAll(supabase.schema('seller_day_to_day')
        .from('daily_allotment_summary')
        .select('seller_email, allotment_date, total_leads_allotted, auto_allotted, manual_allotted, rtg_leads, non_rtg_leads, pax_1, pax_2, pax_3, pax_4, pax_4_plus, median_creation_to_allotment_mins')
        .gte('allotment_date', monthStart)
        .lte('allotment_date', monthEnd)),

      // CTI / Ozontell readiness
      supabase.schema('seller_day_to_day')
        .from('seller_cti_availability')
        .select('seller_email, logged_in_at, ready_timestamps')
        .eq('work_date', queryDate),

      // Planned LTA Override
      supabase
        .from('planned_lta')
        .select('seller_email, lta')
        .eq('log_date', queryDate),
    ])

    // ── 3. Build lookup maps ────────────────────────────────────────────
    const attMap = new Map<string, any>()
    ;(attendanceRes.data || []).forEach((a: any) => {
      attMap.set(cleanEmail(a.email), a)
    })

    const orbitMap = new Map<string, any>()
    ;(orbitRes.data || []).forEach((o: any) => {
      orbitMap.set(cleanEmail(o.seller_email), o)
    })

    const allotMap = new Map<string, any>()
    ;(allotmentRes.data || []).forEach((a: any) => {
      allotMap.set(cleanEmail(a.seller_email), a)
    })

    const ltaMap = new Map<string, any>()
    ;(ltaRes.data || []).forEach((l: any) => {
      ltaMap.set(cleanEmail(l.seller_email), l)
    })

    const goalMap = new Map<string, any>()
    ;(goalRes.data || []).forEach((g: any) => {
      goalMap.set(cleanEmail(g.seller_email), g)
    })

    const srsJulyMap = new Map<string, any>()
    ;(srsJulyRes.data || []).forEach((s: any) => {
      srsJulyMap.set(cleanEmail(s.seller_email), s)
    })

    // Group monthly data by seller email
    const monthlyLtaMap = new Map<string, any[]>()
    ;(monthlyLtaRes.data || []).forEach((r: any) => {
      const email = cleanEmail(r.seller_email)
      if (!monthlyLtaMap.has(email)) monthlyLtaMap.set(email, [])
      monthlyLtaMap.get(email)!.push(r)
    })

    const monthlyGoalMap = new Map<string, any[]>()
    ;(monthlyGoalRes.data || []).forEach((r: any) => {
      const email = cleanEmail(r.seller_email)
      if (!monthlyGoalMap.has(email)) monthlyGoalMap.set(email, [])
      monthlyGoalMap.get(email)!.push(r)
    })

    const hourlyMap = new Map<string, any[]>()
    ;(hourlyRes.data || []).forEach((h: any) => {
      const email = cleanEmail(h.seller_email)
      if (!hourlyMap.has(email)) hourlyMap.set(email, [])
      hourlyMap.get(email)!.push(h)
    })

    const monthlyAllotmentMap = new Map<string, any[]>()
    ;(monthlyAllotmentRes.data || []).forEach((a: any) => {
      const email = cleanEmail(a.seller_email)
      if (!monthlyAllotmentMap.has(email)) monthlyAllotmentMap.set(email, [])
      monthlyAllotmentMap.get(email)!.push(a)
    })

    const ctiMap = new Map<string, any>()
    ;(ctiRes.data || []).forEach((c: any) => {
      ctiMap.set(cleanEmail(c.seller_email), c)
    })

    const plannedLtaMap = new Map<string, any>()
    ;(plannedLtaRes.data || []).forEach((p: any) => {
      plannedLtaMap.set(cleanEmail(p.seller_email), p)
    })

    const dotRowsMap = new Map<string, any[]>()
    ;(dotRes.data || []).forEach((d: any) => {
      const email = cleanEmail(d.seller_email)
      if (!dotRowsMap.has(email)) dotRowsMap.set(email, [])
      dotRowsMap.get(email)!.push(d)
    })

    // ── 4. Enrich each seller with all data ─────────────────────────────
    const enriched = filteredSellers.map(seller => {
      const email = cleanEmail(seller.seller_email)
      const att = attMap.get(email)
      const allot = allotMap.get(email)
      const lta = ltaMap.get(email)
      const goal = goalMap.get(email)
      const srsJuly = srsJulyMap.get(email)
      const orbitRecord = orbitMap.get(email)
      const ctiRecord = ctiMap.get(email)
      const prefix = email.split('@')[0].substring(0, 5)
      const monthly_goal_shb = monthlyGoalMap.get(email) || []

      // Parse login time
      let loginMinutes: number | null = null
      if (att?.first_login) {
        const match = att.first_login.match(/(\d{1,2}):(\d{2})/)
        if (match) loginMinutes = parseInt(match[1]) * 60 + parseInt(match[2])
      }

      // Parse breaks
      let breakCount = 0, breakTotalMins = 0
      if (att?.break_timestamps) {
        const entries = att.break_timestamps.split(',').map((s: string) => s.trim()).filter(Boolean)
        entries.forEach((entry: string) => {
          const parts = entry.split(/\s*-\s*/)
          if (parts.length >= 2) {
            const parseT = (t: string) => { const m = t.match(/(\d{1,2}):(\d{2})/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null }
            const s = parseT(parts[0]), e = parseT(parts[1])
            if (s !== null && e !== null) {
              breakCount++
              breakTotalMins += (e >= s ? e - s : e + 1440 - s)
            }
          }
        })
      }

      // Parse first lead time
      let firstLeadMinutes: number | null = null
      if (allot?.first_lead_allotted_at_ist) {
        const match = String(allot.first_lead_allotted_at_ist).match(/(\d{1,2}):(\d{2})/)
        if (match) firstLeadMinutes = parseInt(match[1]) * 60 + parseInt(match[2])
      }

      // LTA computations
      const leadGoal = lta?.lead_goal || 0
      const wd = lta?.wd || 0
      let planned = wd > 0 ? Math.floor(leadGoal / wd) : 0
      const isAfterJuly5 = queryDate >= '2026-07-06'
      const overrideLta = plannedLtaMap.get(email)?.lta
      if (isAfterJuly5 && overrideLta !== undefined) {
        planned = overrideLta
      }
      const finalLta = Math.floor(lta?.final_lta || 0)
      const mhePct = (lta?.mishandled_pct || 0) * 100

      // Goal achievement
      const blGoal = srsJuly?.bottomline_goal || 0
      const blAch = srsJuly?.bl_actual_splits || 0
      const blShb = srsJuly?.bottomline_should_have_been || 0
      const goalPct = blGoal > 0 ? (blAch / blGoal) * 100 : 0

      return {
        seller_email: seller.seller_email,
        seller_name: seller.seller_name || seller.seller_email?.split('@')[0],
        l1_name: seller.l1_name || 'Unknown Category',
        l1_email: seller.l1_email,
        l2_name: seller.l2_name || 'Unknown TL',
        l2_email: seller.l2_email,
        isAbsent: !att,
        isLateLogin: loginMinutes !== null && loginMinutes > 600, // after 10 AM
        loginMinutes,
        loginTime: att?.first_login || null,
        break_timestamps: att?.break_timestamps || null,
        breakCount,
        breakTotalMins,
        totalLeads: allot?.total_leads_allotted || 0,
        autoAllotted: allot?.auto_allotted || 0,
        manualAllotted: allot?.manual_allotted || 0,
        rtgLeads: allot?.rtg_leads || 0,
        nonRtgLeads: allot?.non_rtg_leads || 0,
        pax1: allot?.pax_1 || 0,
        pax2: allot?.pax_2 || 0,
        pax3: allot?.pax_3 || 0,
        pax4: allot?.pax_4 || 0,
        pax4Plus: allot?.pax_4_plus || 0,
        firstLeadMinutes,
        firstLeadTime: allot?.first_lead_allotted_at_ist || null,
        medianCA: allot?.median_creation_to_allotment_mins ?? null,
        ltaPlanned: planned,
        ltaActual: finalLta,
        ltaLost: planned - finalLta,
        mhePct: parseFloat(mhePct.toFixed(1)),
        mishandledCount: lta?.mishandled_enquiries || 0,
        goalPct: parseFloat(goalPct.toFixed(1)),
        blGoal,
        blAch,
        blShb,
        sellerFlag: srsJuly?.seller_flag || 'No Flag',
        monthly_lta_rows: monthlyLtaMap.get(email) || [],
        monthly_goal_shb: monthly_goal_shb,
        monthly_rows: monthlyAllotmentMap.get(email) || [],

        // ── added for CM-parity rendering (funnel / trend / timeline modals) ──
        attendance: att || null,
        orbit: { first_login: orbitRecord?.available_timestamps_ist ? orbitRecord.available_timestamps_ist.split(' ')[0] : null },
        cti: ctiRecord || null,
        allotment: allot || null,
        daily_lta: lta || null,
        dot_rows: dotRowsMap.get(email) || [],
        hourly: (hourlyMap.get(email) || []).map((h: any) => ({
          hour_bucket: h.time_bucket,
          leads_allotted_in_bucket: h.leads_allotted_in_bucket,
        })),
      }
    })

    // ── 5. Aggregate org-level KPIs ─────────────────────────────────────
    const totalLeadsOrg = enriched.reduce((s, e) => s + e.totalLeads, 0)
    const totalRtg = enriched.reduce((s, e) => s + e.rtgLeads, 0)
    const totalNonRtg = enriched.reduce((s, e) => s + e.nonRtgLeads, 0)
    const orgRtgPct = (totalRtg + totalNonRtg) > 0 ? (totalRtg / (totalRtg + totalNonRtg)) * 100 : 0
    const totalAuto = enriched.reduce((s, e) => s + e.autoAllotted, 0)
    const totalManual = enriched.reduce((s, e) => s + e.manualAllotted, 0)
    const autoAllotPct = (totalAuto + totalManual) > 0 ? (totalAuto / (totalAuto + totalManual)) * 100 : 0
    const manualAllotPct = (totalAuto + totalManual) > 0 ? (totalManual / (totalAuto + totalManual)) * 100 : 0
    const sellersAtRisk = enriched.filter(e => e.goalPct < 70 && e.blGoal > 0).length
    const mheValues = enriched.filter(e => !e.isAbsent && e.ltaPlanned > 0).map(e => e.mhePct)
    const orgMhePct = mheValues.length > 0 ? mheValues.reduce((s, v) => s + v, 0) / mheValues.length : 0

    const sellersWithNoLeads = enriched.filter(e => e.totalLeads === 0).length

    // Org-level Goal vs SHB
    const sellersWithGoal = enriched.filter(e => e.blGoal > 0)
    const orgAvgGoalPct = sellersWithGoal.length > 0 ? sellersWithGoal.reduce((s, e) => s + e.goalPct, 0) / sellersWithGoal.length : 0

    const orgAvgShbPct = sellersWithGoal.length > 0
      ? sellersWithGoal.reduce((s, e) => {
          const srs = srsJulyMap.get(cleanEmail(e.seller_email))
          const shb = srs?.bottomline_should_have_been || 0
          return s + (e.blGoal > 0 ? (shb / e.blGoal) * 100 : 0)
        }, 0) / sellersWithGoal.length
      : 0

    // ── 6. Section-level aggregations ───────────────────────────────────

    const lateLogins = enriched.filter(e => e.isLateLogin).length
    const absentSellers = enriched.filter(e => e.isAbsent).length
    const longBreakSellers = enriched.filter(e => e.breakTotalMins > 60).length

    const appetiteSellers = enriched.filter(e => !e.isAbsent && e.ltaPlanned > 0)
    const orgAppetitePct = appetiteSellers.length > 0
      ? (appetiteSellers.reduce((s, e) => s + (e.ltaActual / Math.max(e.ltaPlanned, 1)), 0) / appetiteSellers.length) * 100
      : 0

    const totalPaxLeads = enriched.reduce((s, e) => s + e.pax1 + e.pax2 + e.pax3 + e.pax4 + e.pax4Plus, 0)
    const weightedPax = enriched.reduce((s, e) => s + e.pax1 * 1 + e.pax2 * 2 + e.pax3 * 3 + e.pax4 * 4 + e.pax4Plus * 5, 0)
    const orgAvgPax = totalPaxLeads > 0 ? weightedPax / totalPaxLeads : 0

    const noLeadBefore11AM = enriched.filter(e => !e.isAbsent && (e.firstLeadMinutes === null || e.firstLeadMinutes > 660)).length

    const orgLtaPlanned = enriched.reduce((s, e) => s + e.ltaPlanned, 0)
    const orgLtaActual = enriched.reduce((s, e) => s + e.ltaActual, 0)

    const catsAtRisk = new Set<string>()
    const catGoalMap = new Map<string, number[]>()
    enriched.forEach(e => {
      const cat = e.l1_name
      if (!catGoalMap.has(cat)) catGoalMap.set(cat, [])
      if (e.blGoal > 0) catGoalMap.get(cat)!.push(e.goalPct)
    })
    catGoalMap.forEach((pcts, cat) => {
      const avg = pcts.reduce((s, v) => s + v, 0) / pcts.length
      if (avg < 70) catsAtRisk.add(cat)
    })

    // ── 7. Build category → TL → seller hierarchy ──────────────────────
    const catMap = new Map<string, Map<string, any[]>>()
    enriched.forEach(e => {
      const cat = e.l1_name
      const tl = e.l2_name
      if (!catMap.has(cat)) catMap.set(cat, new Map())
      const tlMap = catMap.get(cat)!
      if (!tlMap.has(tl)) tlMap.set(tl, [])
      tlMap.get(tl)!.push(e)
    })

    const hierarchy = Array.from(catMap.entries()).map(([catName, tlMap]) => {
      const tls = Array.from(tlMap.entries()).map(([tlName, sellers]) => ({
        tl_name: tlName,
        seller_count: sellers.length,
        sellers
      }))
      return {
        category_name: catName,
        tl_count: tls.length,
        seller_count: tls.reduce((s, t) => s + t.seller_count, 0),
        tls
      }
    }).sort((a, b) => a.category_name.localeCompare(b.category_name))

    // ── 8. DOT distribution (org level) ─────────────────────────────────
    const dotData = (dotRes.data || [])
    const dotByMonth = new Map<string, number>()
    dotData.forEach((d: any) => {
      if (emails.includes(d.seller_email)) {
        const key = d.dot_month || 'Unknown'
        dotByMonth.set(key, (dotByMonth.get(key) || 0) + (d.total_leads_allotted || 0))
      }
    })
    const dotDistribution = Array.from(dotByMonth.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // ── Return response ─────────────────────────────────────────────────
    return NextResponse.json({
      date: queryDate,
      categories: categories,
      org: {
        totalLeads: totalLeadsOrg,
        categoryCount: categorySet.size,
        tlCount: tlSet.size,
        sellerCount: allSellers.length,
        rtgPct: parseFloat(orgRtgPct.toFixed(1)),
        totalRtg,
        autoAllotPct: parseFloat(autoAllotPct.toFixed(1)),
        manualAllotPct: parseFloat(manualAllotPct.toFixed(1)),
        totalAuto,
        totalManual,
        sellersAtRisk,
        mhePct: parseFloat(orgMhePct.toFixed(1)),
        sellersWithNoLeads,
        avgGoalPct: parseFloat(orgAvgGoalPct.toFixed(1)),
        avgShbPct: parseFloat(orgAvgShbPct.toFixed(1)),
      },
      alerts: {
        lateLogins,
        absentSellers,
        longBreakSellers,
        orgAppetitePct: parseFloat(orgAppetitePct.toFixed(1)),
        orgAvgPax: parseFloat(orgAvgPax.toFixed(1)),
        noLeadBefore11AM,
        orgLtaPlanned,
        orgLtaActual,
        categoriesAtRisk: catsAtRisk.size,
      },
      hierarchy,
      dotDistribution,
    })

  } catch (err: any) {
    console.error('Admin LTA API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}