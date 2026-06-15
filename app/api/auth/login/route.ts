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

  const { data, error } = await supabase
    .from('seller_credentials')
    .select('email, password, name, role, status')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error) {
    return NextResponse.json({ error: 'DB error: ' + error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'User not found in DB' }, { status: 401 })
  }

  if (data.password !== password) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (data.status !== 'Active') {
    return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
  }

  let role = data.role

  // If role is SELLER, check if they're actually L1/L2 in srs_raw
  if (role === 'SELLER') {
    const { data: srsCheck } = await supabase
      .from('srs_raw')
      .select('l1_email, l2_email')
      .or(`l1_email.eq.${email.toLowerCase().trim()},l2_email.eq.${email.toLowerCase().trim()}`)
      .limit(1)

    if (srsCheck && srsCheck.length > 0) {
      if (srsCheck[0].l2_email === email.toLowerCase().trim()) {
        role = 'L2'
      } else if (srsCheck[0].l1_email === email.toLowerCase().trim()) {
        role = 'L1'
      }
    }
  }

  return NextResponse.json({ email: data.email, name: data.name, role })
}