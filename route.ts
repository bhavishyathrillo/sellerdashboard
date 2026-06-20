import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerEmail = searchParams.get('sellerEmail');
    const search = searchParams.get('search') || '';

    if (!sellerEmail) {
      return NextResponse.json(
        { error: 'sellerEmail is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('priority_leads')
      .select('*')
      .eq('seller_email', sellerEmail);

    // Apply search filter if provided
    if (search) {
      query = query.or(
        `lead_id.ilike.%${search}%,` +
        `stage.ilike.%${search}%,` +
        `lead_status.ilike.%${search}%,` +
        `planned_region.ilike.%${search}%`
      );
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate KPI metrics
    const totalLeads = data?.length || 0;
    const calledLeads = data?.filter(lead => (lead.dials_today || 0) > 0).length || 0;
    const uncalledLeads = totalLeads - calledLeads;
    
    // Calculate average call duration (in seconds)
    const leadsWithCalls = data?.filter(lead => (lead.answered_seconds_today || 0) > 0) || [];
    const totalCallDuration = leadsWithCalls.reduce(
      (sum, lead) => sum + (lead.answered_seconds_today || 0),
      0
    );
    const averageCallDuration = leadsWithCalls.length > 0 
      ? Math.round(totalCallDuration / leadsWithCalls.length) 
      : 0;

    // Format average duration for display
    const formatDuration = (seconds: number) => {
      if (seconds === 0) return '0s';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    return NextResponse.json({
      success: true,
      data: data || [],
      metrics: {
        totalLeads,
        calledLeads,
        uncalledLeads,
        averageCallDuration: averageCallDuration,
        averageCallDurationFormatted: formatDuration(averageCallDuration),
        totalCallDuration,
        leadsWithCalls: leadsWithCalls.length,
      }
    });

  } catch (error) {
    console.error('Error fetching priority leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch priority leads' },
      { status: 500 }
    );
  }
}