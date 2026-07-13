import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const requesterEmail = url.searchParams.get('email')?.toLowerCase();
    const requesterRole = url.searchParams.get('role');
    
    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from/to dates' }, { status: 400 });
    }

    // 1. Get all users from seller_credentials, roles, and srs_raw
    const { data: sellersData, error: sellersError } = await supabase
      .from('seller_credentials')
      .select('email, name, status');
      
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('email, role');

    const { data: srsData, error: srsError } = await supabase
      .from('srs_raw')
      .select('l1_email, l2_email, seller_email, seller_name');
      
    if (sellersError || rolesError || srsError) {
      console.error('Error fetching users:', sellersError || rolesError || srsError);
      return NextResponse.json({ error: 'Failed to fetch user lists' }, { status: 500 });
    }

    // Merge them into a single user map
    const userMap: Record<string, { email: string, name: string, role: string }> = {};

    // Add sellers (default role SELLER)
    if (sellersData) {
      for (const s of sellersData) {
        if (s.status === 'Active' || s.status === 'active') {
          userMap[s.email.toLowerCase()] = {
            email: s.email,
            name: s.name || s.email.split('@')[0],
            role: 'SELLER'
          };
        }
      }
    }

    // Add/Update roles (overrides seller role if exists, adds admins)
    if (rolesData) {
      for (const r of rolesData) {
        const email = r.email.toLowerCase();
        if (userMap[email]) {
          userMap[email].role = r.role;
        } else {
          userMap[email] = {
            email: r.email,
            name: r.email.split('@')[0], // Fallback name
            role: r.role
          };
        }
      }
    }

    // Determine L1/L2 roles from srs_raw hierarchy
    if (srsData) {
      for (const row of srsData) {
        // If they exist in userMap as SELLER but are an L1/L2 manager, upgrade their role
        if (row.l1_email) {
          const l1 = row.l1_email.toLowerCase();
          if (userMap[l1] && (userMap[l1].role === 'SELLER' || userMap[l1].role === 'L2')) {
            userMap[l1].role = 'L1';
          }
        }
        if (row.l2_email) {
          const l2 = row.l2_email.toLowerCase();
          if (userMap[l2] && userMap[l2].role === 'SELLER') {
            userMap[l2].role = 'L2';
          }
        }
      }
    }
    
    let allUsers = Object.values(userMap);

    // If requester is a Category Manager (L1), restrict to their team
    if (requesterRole === 'L1' && requesterEmail) {
      const { data: srsData } = await supabase
        .from('srs_raw')
        .select('seller_email, l2_email')
        .eq('l1_email', requesterEmail);

      if (srsData) {
        const allowedEmails = new Set<string>();
        allowedEmails.add(requesterEmail); // Include the CM themselves
        srsData.forEach(row => {
          if (row.seller_email) allowedEmails.add(row.seller_email.toLowerCase());
          if (row.l2_email) allowedEmails.add(row.l2_email.toLowerCase());
        });

        allUsers = allUsers.filter(u => allowedEmails.has(u.email.toLowerCase()));
      }
    }

    // 2. Get session logs for the date range
    const { data: logsData, error: logsError } = await supabase
      .from('user_session_logs')
      .select('user_email, date, tabs_time')
      .gte('date', from)
      .lte('date', to);

    if (logsError) {
      console.error('Error fetching logs:', logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    // Aggregate time by user
    const aggregatedLogs: Record<string, { totalTime: number, tabs: Record<string, number>, daily: Record<string, { totalTime: number, tabs: Record<string, number> }> }> = {};

    logsData.forEach(log => {
      const email = log.user_email.toLowerCase();
      if (!aggregatedLogs[email]) {
        aggregatedLogs[email] = { totalTime: 0, tabs: {}, daily: {} };
      }
      
      const dateStr = log.date;
      if (!aggregatedLogs[email].daily[dateStr]) {
        aggregatedLogs[email].daily[dateStr] = { totalTime: 0, tabs: {} };
      }
      
      const tabsTime = typeof log.tabs_time === 'string' ? JSON.parse(log.tabs_time) : log.tabs_time;
      
      if (tabsTime) {
        for (const [tab, timeStr] of Object.entries(tabsTime)) {
          const time = Number(timeStr);
          if (!isNaN(time)) {
            // Add to overall totals
            aggregatedLogs[email].tabs[tab] = (aggregatedLogs[email].tabs[tab] || 0) + time;
            aggregatedLogs[email].totalTime += time;
            
            // Add to daily totals
            aggregatedLogs[email].daily[dateStr].tabs[tab] = (aggregatedLogs[email].daily[dateStr].tabs[tab] || 0) + time;
            aggregatedLogs[email].daily[dateStr].totalTime += time;
          }
        }
      }
    });

    // 3. Merge and classify users
    const activeUsers: any[] = [];
    const inactiveUsers: any[] = [];

    allUsers.forEach(user => {
      const email = user.email.toLowerCase();
      const logs = aggregatedLogs[email];
      
      const userInfo = {
        name: user.name,
        email: user.email,
        role: user.role,
      };

      if (!logs || logs.totalTime === 0) {
        inactiveUsers.push(userInfo);
      } else {
        activeUsers.push({
          ...userInfo,
          totalTime: logs.totalTime,
          tabs: logs.tabs,
          daily: logs.daily
        });
      }
    });

    // Sort active users by total time descending
    activeUsers.sort((a, b) => b.totalTime - a.totalTime);

    return NextResponse.json({
      success: true,
      data: {
        activeUsers,
        inactiveUsers
      }
    });

  } catch (err: any) {
    console.error('Adoption API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
