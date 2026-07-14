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

    // Call the database function
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
