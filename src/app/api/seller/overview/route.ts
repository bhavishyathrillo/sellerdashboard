import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('srs_raw')
    .select('*')
    .eq('seller_email', email.toLowerCase().trim())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
  }

  const { data: julyData } = await supabase
    .from('srs_july')
    .select('*')
    .eq('seller_email', email.toLowerCase().trim())
    .maybeSingle()

  const mappedJulyData = julyData ? {
    bl_goal: Number(julyData.bottomline_goal) || 0,
    bl_ach: Number(julyData.bl_actual_splits) || 0,
    bl_shb: Number(julyData.bottomline_should_have_been) || 0,
    tl_goal: Number(julyData.topline_goal_this_month) || 0,
    tl_ach: Number(julyData.tl_actual_splits) || 0,
    tl_shb: Number(julyData.topline_should_have_been) || 0,
    cancellation_impact: Number(julyData.cancellation_impacts) || 0,
    escalation_impacts: Number(julyData.escalation_impacts) || 0,
    old_bookings_earnings: Number(julyData.old_bookings_earnings) || 0,
  } : {}

  return NextResponse.json({ ...data, july_data: mappedJulyData }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=59'
    }
  })
}