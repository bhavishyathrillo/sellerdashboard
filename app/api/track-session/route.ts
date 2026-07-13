import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { email, date, tabs } = await req.json();

    if (!email || !date || !tabs || typeof tabs !== 'object') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // tabs is an object like { 'lta': 45.123, 'pipeline': 30 }
    // Round floats to integers for Postgres compatibility
    const roundedTabs: Record<string, number> = {};
    for (const [key, val] of Object.entries(tabs)) {
      if (typeof val === 'number') {
        roundedTabs[key] = Math.round(val);
      }
    }

    // 1. Cleanup old data (keep only current month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    await supabase
      .from('user_session_logs')
      .delete()
      .lt('date', startOfMonth);

    // 2. We will call the RPC function
    const { error } = await supabase.rpc('update_session_time', {
      p_email: email,
      p_date: date,
      p_tabs: roundedTabs
    });

    if (error) {
      console.error('Error updating session times:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Session track API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
