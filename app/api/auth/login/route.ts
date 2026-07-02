import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const trimmedEmail = email.toLowerCase().trim()

  // Check roles table first (Admin/SuperAdmin/L1/L2)
  const { data: roleData } = await supabase
    .from('roles')
    .select('email, role, password, added_by')
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (roleData?.password) {
    if (roleData.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    let name = trimmedEmail.split('@')[0]
    const { data: sellerData } = await supabase
      .from('seller_credentials')
      .select('name')
      .eq('email', trimmedEmail)
      .maybeSingle()
    
    if (sellerData?.name) name = sellerData.name
    else {
      const { data: srsData } = await supabase
        .from('srs_raw')
        .select('seller_name')
        .eq('seller_email', trimmedEmail)
        .maybeSingle()
      if (srsData?.seller_name) name = srsData.seller_name
    }

    // Return the role as-is from roles table (ADMIN, SUPERADMIN, L1, L2, etc.)
    return NextResponse.json({ email: trimmedEmail, name, role: roleData.role })
  }

  // Check seller_credentials for regular sellers
  const { data: sellerData, error: sellerError } = await supabase
    .from('seller_credentials')
    .select('email, password, name, status')
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (sellerError || !sellerData) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (sellerData.password !== password) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (sellerData.status !== 'Active') {
    return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
  }

  let role = 'SELLER'

  // Check roles table (without password - legacy)
  const { data: roleEntry } = await supabase
    .from('roles')
    .select('role')
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (roleEntry?.role) {
    role = roleEntry.role
  } else {
    // Check srs_raw for L1/L2
    const { data: srsCheck } = await supabase
      .from('srs_raw')
      .select('l1_email, l2_email')
      .or(`l1_email.eq.${trimmedEmail},l2_email.eq.${trimmedEmail}`)

    if (srsCheck && srsCheck.length > 0) {
      // Is he an L1 (CM) anywhere?
      const isL1 = srsCheck.some((s: any) => s.l1_email === trimmedEmail)
      const isL2Only = srsCheck.some((s: any) => s.l2_email === trimmedEmail && s.l1_email !== trimmedEmail)
      
      if (isL1) {
        role = 'L1' // CM takes precedence
      } else if (isL2Only) {
        role = 'L2'
      } else {
        role = 'L2' // fallback
      }
    }
  }

  return NextResponse.json({ email: trimmedEmail, name: sellerData.name, role })
}