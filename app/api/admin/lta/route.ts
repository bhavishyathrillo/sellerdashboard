import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const queryDate = date || new Date().toISOString().split('T')[0]

    const { data: allSellers, error: sellersError } = await supabase
      .from('srs_raw')
      .select('seller_email, seller_name, l1_name, l1_email, l2_name, l2_email')

    if (sellersError) {
      return NextResponse.json({ error: sellersError.message }, { status: 500 })
    }

    if (!allSellers || allSellers.length === 0) {
      return NextResponse.json({ categories: [] })
    }

    const emails = allSellers.map(s => s.seller_email).filter(Boolean)

    const [ltaRes, attendanceRes] = await Promise.all([
      supabase.from('daily_lta_log').select('*').eq('log_date', queryDate),
      supabase.schema('seller_day_to_day').from('seller_attendance').select('email, break_timestamps').eq('work_date', queryDate)
    ])

    const populatedSellers = allSellers.map(seller => {
      const att = attendanceRes.data?.find(a => a.email === seller.seller_email)
      const lta = ltaRes.data?.find(l => l.seller_email === seller.seller_email)
      
      let planned = 0
      let actual = 0
      let dynLta = 0
      let hygLta = 0
      let rev1Lta = 0

      if (lta) {
        const leadGoal = lta.lead_goal || 0
        const wd = lta.wd || 0
        planned = wd > 0 ? Math.floor(leadGoal / wd) : 0
        actual = Math.floor(lta.final_lta || 0)
        dynLta = lta.real_dynamic_lta || 0
        hygLta = lta.hygiene_revised_lta || 0
        rev1Lta = lta.revised_lta || 0
      }

      const dynLost = planned - dynLta
      const hygLost = dynLta - hygLta
      const rev1Lost = hygLta - rev1Lta
      const rev2Lost = rev1Lta - actual
      const totalLost = planned - actual

      return {
        ...seller,
        isAbsent: !att,
        lta: {
          planned,
          actual,
          dynLta,
          hygLta,
          rev1Lta,
          dynLost,
          hygLost,
          rev1Lost,
          rev2Lost,
          totalLost
        }
      }
    })

    const categoryMap = new Map<string, any[]>()
    populatedSellers.forEach(s => {
      const catName = s.l2_name?.trim() || s.l2_email?.split('@')[0] || 'Unassigned Category'
      if (!categoryMap.has(catName)) categoryMap.set(catName, [])
      categoryMap.get(catName)!.push(s)
    })

    const categories = Array.from(categoryMap.entries()).map(([catName, catSellers]) => {
      const tlMap = new Map<string, any[]>()
      catSellers.forEach(s => {
        const tlName = s.l1_name?.trim() || s.l1_email?.split('@')[0] || 'Unassigned TL'
        if (!tlMap.has(tlName)) tlMap.set(tlName, [])
        tlMap.get(tlName)!.push(s)
      })

      const tls = Array.from(tlMap.entries()).map(([tlName, tlSellers]) => {
        const tlPlanned = tlSellers.reduce((sum, s) => sum + s.lta.planned, 0)
        const tlActual = tlSellers.reduce((sum, s) => sum + s.lta.actual, 0)
        const tlLost = tlSellers.reduce((sum, s) => sum + s.lta.totalLost, 0)
        
        const tlDynLta = tlSellers.reduce((sum, s) => sum + s.lta.dynLta, 0)
        const tlHygLta = tlSellers.reduce((sum, s) => sum + s.lta.hygLta, 0)
        const tlRev1Lta = tlSellers.reduce((sum, s) => sum + s.lta.rev1Lta, 0)

        const tlDynLost = tlSellers.reduce((sum, s) => sum + s.lta.dynLost, 0)
        const tlHygLost = tlSellers.reduce((sum, s) => sum + s.lta.hygLost, 0)
        const tlRev1Lost = tlSellers.reduce((sum, s) => sum + s.lta.rev1Lost, 0)
        const tlRev2Lost = tlSellers.reduce((sum, s) => sum + s.lta.rev2Lost, 0)

        return {
          tl_name: tlName,
          seller_count: tlSellers.length,
          sellers: tlSellers,
          planned: tlPlanned,
          actual: tlActual,
          dynLta: tlDynLta,
          hygLta: tlHygLta,
          rev1Lta: tlRev1Lta,
          dynLost: tlDynLost,
          hygLost: tlHygLost,
          rev1Lost: tlRev1Lost,
          rev2Lost: tlRev2Lost,
          lost: tlLost,
          lostPct: tlPlanned > 0 ? (tlLost / tlPlanned) * 100 : 0
        }
      })

      const catPlanned = tls.reduce((sum, t) => sum + t.planned, 0)
      const catActual = tls.reduce((sum, t) => sum + t.actual, 0)
      const catLost = tls.reduce((sum, t) => sum + t.lost, 0)
      
      const catDynLta = tls.reduce((sum, t) => sum + t.dynLta, 0)
      const catHygLta = tls.reduce((sum, t) => sum + t.hygLta, 0)
      const catRev1Lta = tls.reduce((sum, t) => sum + t.rev1Lta, 0)

      const catDynLost = tls.reduce((sum, t) => sum + t.dynLost, 0)
      const catHygLost = tls.reduce((sum, t) => sum + t.hygLost, 0)
      const catRev1Lost = tls.reduce((sum, t) => sum + t.rev1Lost, 0)
      const catRev2Lost = tls.reduce((sum, t) => sum + t.rev2Lost, 0)

      return {
        category_name: catName,
        tls: tls,
        planned: catPlanned,
        actual: catActual,
        dynLta: catDynLta,
        hygLta: catHygLta,
        rev1Lta: catRev1Lta,
        dynLost: catDynLost,
        hygLost: catHygLost,
        rev1Lost: catRev1Lost,
        rev2Lost: catRev2Lost,
        lost: catLost,
        lostPct: catPlanned > 0 ? (catLost / catPlanned) * 100 : 0
      }
    })

    return NextResponse.json({ categories })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
