import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const date = searchParams.get('date')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const trimmedEmail = email.toLowerCase().trim()
  const queryDate = date || new Date().toISOString().split('T')[0]

  // Step 1: Get all sellers under this TL (could be mapped in l1 or l2 depending on org structure)
  const { data: allSellers, error: sellersError } = await supabase
    .from('srs_raw')
    .select('*')
    .or(`l1_email.eq.${trimmedEmail},l2_email.eq.${trimmedEmail}`)

  if (sellersError) {
    return NextResponse.json({ error: sellersError.message }, { status: 500 })
  }

  if (!allSellers || allSellers.length === 0) {
    return NextResponse.json({ members: [] })
  }

  // Filter: TL and CM must be different. If they are the same, he is a CM.
  // The user says: "take only those as tl whose cm is differnt if cm and tl is same the he is a cm we will build his view later"
  // So we only keep members where l1_email != l2_email.
  let validTeam = allSellers.filter(s => {
    const l1 = (s.l1_email || '').toLowerCase().trim()
    const l2 = (s.l2_email || '').toLowerCase().trim()
    return l1 !== l2
  })

  // Ensure the TL is always included in his own team list!
  const tlSelf = allSellers.find(s => (s.seller_email || '').toLowerCase().trim() === trimmedEmail)
  if (tlSelf && !validTeam.some(s => s.seller_email === tlSelf.seller_email)) {
    validTeam.push(tlSelf)
  }

  if (validTeam.length === 0) {
    return NextResponse.json({ members: [] })
  }

  const emails = validTeam.map(s => s.seller_email)

  // Step 2: Fetch daily data for these sellers
  const [attendanceRes, ctiRes, allotmentRes] = await Promise.all([
    supabase.from('attendance').select('*').eq('log_date', queryDate).in('seller_email', emails),
    supabase.from('cti').select('*').eq('log_date', queryDate).in('seller_email', emails),
    supabase.from('allotment').select('*').eq('log_date', queryDate).in('seller_email', emails)
  ])

  // Step 3: Combine
  const members = validTeam.map(seller => {
    return {
      ...seller,
      attendance: attendanceRes.data?.find(a => a.seller_email === seller.seller_email) || null,
      cti: ctiRes.data?.find(c => c.seller_email === seller.seller_email) || null,
      allotment: allotmentRes.data?.find(al => al.seller_email === seller.seller_email) || null,
    }
  })

  return NextResponse.json({ members })
}
