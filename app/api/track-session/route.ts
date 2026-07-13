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

    // tabs is an object like { 'lta': 45, 'pipeline': 30 }
    // We will call the RPC function for each tab to increment the time
    for (const [tabName, seconds] of Object.entries(tabs)) {
      if (typeof seconds !== 'number' || seconds <= 0) continue;

      const { error } = await supabase.rpc('increment_session_time', {
        p_email: email,
        p_date: date,
        p_tab: tabName,
        p_seconds: Math.floor(seconds)
      });

      if (error) {
        console.error('Error tracking session for tab:', tabName, error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Session track API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
