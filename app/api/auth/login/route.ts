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

  // First check roles table (for Admin/Moderator/SuperAdmin)
  const { data: roleData } = await supabase
    .from('roles')
    .select('email, role, password, added_by')
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (roleData?.password) {
    // Verify password from roles table
    if (roleData.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Get name from seller_credentials or srs_raw
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

    return NextResponse.json({ email: trimmedEmail, name, role: roleData.role })
  }

  // Check seller_credentials for password (regular sellers)
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

  // Check if they have a role in roles table (without password - legacy)
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
      .limit(1)

    if (srsCheck && srsCheck.length > 0) {
      if (srsCheck[0].l2_email === trimmedEmail) role = 'L2'
      else if (srsCheck[0].l1_email === trimmedEmail) role = 'L1'
    }
  }

  return NextResponse.json({ email: trimmedEmail, name: sellerData.name, role })
}