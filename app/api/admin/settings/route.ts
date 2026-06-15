import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase.from('settings').select('*')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { key, value, updatedBy } = await req.json()
    if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 })

    const { data: existing } = await supabase.from('settings').select('id').eq('key', key).single()

    if (existing) {
      await supabase.from('settings').update({ value, updated_by: updatedBy, updated_at: new Date().toISOString() }).eq('key', key)
    } else {
      await supabase.from('settings').insert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}