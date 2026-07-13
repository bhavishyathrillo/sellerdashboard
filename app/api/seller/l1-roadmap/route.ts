import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const trimmedEmail = email.toLowerCase().trim()

  // Get all sellers under this L1
  const { data: _me } = await supabase.from('srs_raw').select('l1_name').eq('l1_email', trimmedEmail).limit(1).maybeSingle()
  const _myName = _me?.l1_name || ''
  let _q = supabase.from('srs_raw').select('seller_email, seller_name, l2_email, l2_name')
  if (_myName) _q = _q.eq('l1_name', _myName)
  else _q = _q.eq('l1_email', trimmedEmail)
  
  const { data: allSellers, error } = await _q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!allSellers || allSellers.length === 0) {
    return NextResponse.json({ l2Groups: [] })
  }

  // Get unique L2 emails
  const l2Emails = [...new Set(allSellers.map((s: any) => s.l2_email).filter(Boolean))]
  
  // Get roadmap data for L2 managers
  const { data: l2Roadmaps } = await supabase
    .from('roadmap')
    .select('*')
    .in('seller_email', l2Emails)

  // Get roadmap for all sellers
  const sellerEmails = allSellers.map((s: any) => s.seller_email)
  const { data: sellerRoadmaps } = await supabase
    .from('roadmap')
    .select('*')
    .in('seller_email', sellerEmails)

  const l2Groups = l2Emails.map((l2Email: string) => {
    const sellersUnderL2 = allSellers.filter(
      (s: any) => s.l2_email?.toLowerCase() === l2Email.toLowerCase()
    )
    
    const l2Roadmap = (l2Roadmaps || []).find(
      (r: any) => r.seller_email?.toLowerCase() === l2Email.toLowerCase()
    )

    return {
      l2_name: sellersUnderL2[0]?.l2_name || l2Email.split('@')[0],
      l2_email: l2Email,
      l2_roadmap: l2Roadmap || null,
      sellers: sellersUnderL2.map((s: any) => {
        const sRoadmap = (sellerRoadmaps || []).find(
          (r: any) => r.seller_email?.toLowerCase() === s.seller_email.toLowerCase()
        )
        return {
          seller_name: s.seller_name,
          seller_email: s.seller_email,
          roadmap: sRoadmap || null
        }
      })
    }
  })

  return NextResponse.json({ l2Groups })
}