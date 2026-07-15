import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(request: Request) {
  try {
    // Basic security: optional cron token check
    const authHeader = request.headers.get('authorization');
    // If you want to secure this route, you can set a CRON_SECRET in your env
    // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    console.log('Running daily sync for won_without_feasibility...');

    // Get today's date in IST format (YYYY-MM-DD)
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Step 1: Delete any existing records for today to ensure we OVERWRITE instead of adding duplicates
    const { error: deleteError } = await supabase.schema('seller_day_to_day')
      .from('won_without_feasibility_daily')
      .delete()
      .eq('log_date', todayIST);

    if (deleteError) {
      console.error('Error deleting previous stats for today:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    // Step 2: Call the database function to insert the fresh data for today
    const { error } = await supabase.rpc('sync_won_without_feasibility');

    if (error) {
      console.error('Error syncing won without feasibility:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Successfully synced won without feasibility stats.' });
  } catch (err: any) {
    console.error('Unhandled exception in sync-feasibility:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
