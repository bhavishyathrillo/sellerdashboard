import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const role = searchParams.get('role')
  const month = searchParams.get('month') || 'current'
  const table = month === 'prev' ? 'srs_june' : 'srs_raw'

  if (!email || !role) return NextResponse.json({ error: 'Email and role required' }, { status: 400 })

  try {
    if (role === 'L2') {
      const { data: _me } = await supabase.from('srs_raw').select('l1_name').eq('l1_email', email.toLowerCase().trim()).limit(1).maybeSingle()
      const _myName = _me?.l1_name || ''
      let _q = supabase.from(table).select('*')
      if (_myName && table === 'srs_raw') {
        _q = _q.eq('l2_name', _myName)
      } else {
        _q = _q.eq(table === 'srs_june' ? '"L2 Email"' : 'l2_email', email.toLowerCase().trim())
      }
      _q = _q.order(table === 'srs_june' ? '"% of Goal Achieved"' : 'goal_achieved_percent', { ascending: false })
      const { data: sellers } = await _q

      // Map srs_june columns to standard srs_raw names
      const normalizedSellers = (sellers || []).map(s => {
        if (table === 'srs_raw') return s
        return {
          ...s,
          seller_email: s['Seller Email'],
          seller_name: s['Seller Name'],
          l1_email: s['L1 Email'],
          l1_name: s['L1 Name'],
          l2_email: s['L2 Email'],
          l2_name: s['L2 Name'],
          goal_achieved_percent: s['% of Goal Achieved'],
          actual_achieved_monthly: s['Actual Achieved (Monthly)'],
          bottomline_goal_monthly: s['Bottomline Goal (Monthly)']
        }
      })

      // Filter out manager's own data
      const teamSellers = normalizedSellers.filter(s => s.seller_email?.toLowerCase() !== email.toLowerCase())

      const l1Emails = [...new Set(teamSellers.map(s => s.l1_email).filter(Boolean))]
      const { data: rawL1Stats } = await supabase
        .from(table)
        .select(table === 'srs_june' ? '"Seller Email", "Seller Name", "% of Goal Achieved", "Actual Achieved (Monthly)", "Bottomline Goal (Monthly)"' : 'seller_email, seller_name, goal_achieved_percent, actual_achieved_monthly, bottomline_goal_monthly')
        .in(table === 'srs_june' ? '"Seller Email"' : 'seller_email', l1Emails)

      const l1Stats = (rawL1Stats || []).map((s: any) => {
        if (table === 'srs_raw') return s
        return {
          seller_email: s['Seller Email'],
          seller_name: s['Seller Name'],
          goal_achieved_percent: s['% of Goal Achieved'],
          actual_achieved_monthly: s['Actual Achieved (Monthly)'],
          bottomline_goal_monthly: s['Bottomline Goal (Monthly)']
        }
      })

      const l1Groups: any = {}
      teamSellers.forEach(s => {
        const l1 = s.l1_name || s.l1_email || 'Unknown'
        if (!l1Groups[l1]) {
          const l1Own = l1Stats?.find(ls => ls.seller_email === s.l1_email)
          l1Groups[l1] = {
            l1_name: l1, l1_email: s.l1_email,
            l1_performance: l1Own ? { pct: l1Own.goal_achieved_percent || 0, achieved: l1Own.actual_achieved_monthly || 0, goal: l1Own.bottomline_goal_monthly || 0 } : null,
            sellers: []
          }
        }
        l1Groups[l1].sellers.push(s)
      })

      return NextResponse.json({ type: 'L2', team: teamSellers, l1Groups: Object.values(l1Groups), totalSellers: teamSellers.length })
    }

    if (role === 'L1') {
      const { data: _me } = await supabase.from('srs_raw').select('l1_name').eq('l1_email', email.toLowerCase().trim()).limit(1).maybeSingle()
      const _myName = _me?.l1_name || ''
      let _q = supabase.from(table).select('*')
      if (_myName && table === 'srs_raw') {
        _q = _q.eq('l1_name', _myName)
      } else {
        _q = _q.eq(table === 'srs_june' ? '"L1 Email"' : 'l1_email', email.toLowerCase().trim())
      }
      _q = _q.order(table === 'srs_june' ? '"% of Goal Achieved"' : 'goal_achieved_percent', { ascending: false })
      const { data: sellers } = await _q

      const normalizedSellers = (sellers || []).map(s => {
        if (table === 'srs_raw') return s
        return {
          ...s,
          seller_email: s['Seller Email'],
          seller_name: s['Seller Name'],
          l1_email: s['L1 Email'],
          l1_name: s['L1 Name'],
          l2_email: s['L2 Email'],
          l2_name: s['L2 Name'],
          goal_achieved_percent: s['% of Goal Achieved'],
          actual_achieved_monthly: s['Actual Achieved (Monthly)'],
          bottomline_goal_monthly: s['Bottomline Goal (Monthly)']
        }
      })

      const teamSellers = normalizedSellers.filter(s => s.seller_email?.toLowerCase() !== email.toLowerCase())

      return NextResponse.json({ type: 'L1', team: teamSellers, totalSellers: teamSellers.length })
    }

    return NextResponse.json({ error: 'Only L1/L2 managers can view team' }, { status: 403 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}