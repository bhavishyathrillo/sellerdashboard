import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const l1Email = searchParams.get('l1Email')
  const q = searchParams.get('q') || ''

  if (!l1Email) {
    return NextResponse.json({ users: [] })
  }

  const query = q.toLowerCase().trim()
  const trimmedL1 = l1Email.toLowerCase().trim()

  try {
    let srsQuery = supabase
      .from('srs_raw')
      .select('seller_email, seller_name, l2_email')
      .eq('l1_email', trimmedL1)

    if (query) {
      srsQuery = srsQuery.or(`seller_name.ilike.%${query}%,seller_email.ilike.%${query}%`)
    }

    const { data: srsData } = await srsQuery

    const users: any[] = []
    const seen = new Set()

    if (srsData) {
      srsData.forEach((s: any) => {
        const key = s.seller_email?.toLowerCase()
        if (key && !seen.has(key)) {
          seen.add(key)
          // Determine if TL or Seller
          const role = (s.l2_email?.toLowerCase().trim() === key) ? 'L2' : 'SELLER'
          users.push({ email: s.seller_email, name: s.seller_name, role })
        }
      })
    }

    return NextResponse.json({ users })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
