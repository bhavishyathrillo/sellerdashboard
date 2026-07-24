import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
  try {
    // Cleanup old data (keep only current month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { error } = await supabase
      .from('user_action_logs')
      .delete()
      .lt('created_at', startOfMonth);

    if (error) {
      console.error('Error during cron cleanup:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Cleaned up logs before ${startOfMonth}` });
  } catch (err: any) {
    console.error('Cron cleanup error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
