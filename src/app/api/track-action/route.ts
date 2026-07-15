import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { email, actionType, metadata } = await req.json();

    if (!email || !actionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Cleanup old data (keep only current month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    await supabase
      .from('user_action_logs')
      .delete()
      .lt('created_at', startOfMonth);

    // 2. Insert new action
    const { error } = await supabase.from('user_action_logs').insert({
      user_email: email,
      action_type: actionType,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error tracking action:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Action track API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
