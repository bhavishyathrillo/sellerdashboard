import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: srsData } = await supabase.from('srs_raw').select('*')
    const { data: submissions } = await supabase.from('pipeline_submissions').select('*').order('date', { ascending: false }).limit(5000)

    if (!srsData) return NextResponse.json({ l1_data: [] })

    const l1Map = new Map<string, any>()
    srsData.forEach((row: any) => {
      const l1Email = row.l1_email?.toLowerCase().trim()
      if (!l1Email) return
      if (!l1Map.has(l1Email)) l1Map.set(l1Email, { l1_name: row.l1_name || l1Email.split('@')[0], l1_email: l1Email, l2Map: new Map() })
      const l1 = l1Map.get(l1Email)!
      const l2Email = row.l2_email?.toLowerCase().trim() || 'direct'
      if (!l1.l2Map.has(l2Email)) l1.l2Map.set(l2Email, { l2_name: row.l2_name || l2Email.split('@')[0], l2_email: l2Email, sellers: new Set() })
      const sellerEmail = row.seller_email?.toLowerCase().trim()
      if (sellerEmail) l1.l2Map.get(l2Email)!.sellers.add(sellerEmail)
    })

    const l1Data: any[] = []
    for (const [, l1] of l1Map) {
      const l2Groups: any[] = []
      let totalSubs = 0, greenCount = 0, l2Count = 0
      for (const [, l2] of l1.l2Map) {
        const sellerEmails = Array.from(l2.sellers)
        const l2Subs = (submissions || []).filter((s: any) => sellerEmails.includes(s.seller_email?.toLowerCase().trim()))
        const l2Green = l2Subs.filter((s: any) => s.status === 'GREEN').length
        if (sellerEmails.length > 0) { l2Groups.push({ l2_name: l2.l2_name, l2_email: l2.l2_email, seller_count: sellerEmails.length, submissions: l2Subs }); l2Count++; totalSubs += l2Subs.length; greenCount += l2Green }
      }
      l1Data.push({ l1_name: l1.l1_name, l1_email: l1.l1_email, total_submissions: totalSubs, green_count: greenCount, l2_count: l2Count, submissions: l2Groups.flatMap((g: any) => g.submissions), l2_groups: l2Groups })
    }

    return NextResponse.json({ l1_data: l1Data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}