import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  if (!q) {
    return NextResponse.json({ users: [] })
  }

  const query = q.toLowerCase().trim()

  try {
    // Get ALL roles for quick lookup
    const { data: allRoles } = await supabase
      .from('roles')
      .select('email, role')

    const roleMap: Record<string, string> = {}
    if (allRoles) {
      allRoles.forEach((r: any) => {
        roleMap[r.email?.toLowerCase()] = r.role
      })
    }

    // Get ALL srs_raw data to determine L1/L2 based on who has them as l1_email or l2_email
    const { data: allSrs } = await supabase
      .from('srs_raw')
      .select('seller_email, l1_email, l2_email')

    // Build sets of emails that appear as l1_email or l2_email in ANY row
    const l1Emails = new Set<string>()
    const l2Emails = new Set<string>()
    if (allSrs) {
      allSrs.forEach((row: any) => {
        if (row.l1_email) l1Emails.add(row.l1_email.toLowerCase().trim())
        if (row.l2_email) l2Emails.add(row.l2_email.toLowerCase().trim())
      })
    }

    // Function to determine role
    function determineRole(email: string): string {
      const key = email.toLowerCase().trim()
      // 1. Check roles table first
      if (roleMap[key]) return roleMap[key]
      // 2. Check if this email appears as l1_email in ANY row (means they're an L1 manager)
      if (l1Emails.has(key)) return 'L1'
      // 3. Check if this email appears as l2_email in ANY row (means they're an L2 manager)
      if (l2Emails.has(key)) return 'L2'
      // 4. Default to SELLER
      return 'SELLER'
    }

    // Search in seller_credentials
    const { data: sellers } = await supabase
      .from('seller_credentials')
      .select('email, name')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20)

    // Search in srs_raw
    const { data: srsData } = await supabase
      .from('srs_raw')
      .select('seller_email, seller_name')
      .or(`seller_name.ilike.%${query}%,seller_email.ilike.%${query}%`)
      .limit(20)

    const users: any[] = []
    const seen = new Set()

    // Add from seller_credentials
    if (sellers) {
      sellers.forEach((s: any) => {
        const key = s.email?.toLowerCase()
        if (key && !seen.has(key)) {
          seen.add(key)
          users.push({ email: s.email, name: s.name, role: determineRole(s.email) })
        }
      })
    }

    // Add from srs_raw
    if (srsData) {
      srsData.forEach((s: any) => {
        const key = s.seller_email?.toLowerCase()
        if (key && !seen.has(key)) {
          seen.add(key)
          users.push({ email: s.seller_email, name: s.seller_name, role: determineRole(s.seller_email) })
        }
      })
    }

    return NextResponse.json({ users: users.slice(0, 20) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}