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

  // Check against seller_credentials table
  const { data, error } = await supabase
    .from('seller_credentials')
    .select('email, password, name, role, status')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (data.password !== password) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  if (data.status !== 'Active') {
    return NextResponse.json({ error: 'Your account is inactive. Contact admin.' }, { status: 403 })
  }

  // Update last login
  await supabase
    .from('seller_credentials')
    .update({ last_login: new Date().toISOString() })
    .eq('email', email)

  return NextResponse.json({
    email: data.email,
    name: data.name,
    role: data.role
  })
}