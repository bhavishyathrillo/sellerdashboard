import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

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

    // 1. Parallel fetch all required data
    const promises: any[] = [
      supabase.from('seller_credentials').select('email, name, status'),
      supabase.from('roles').select('email, role'),
      supabase.from('srs_raw').select('l1_email, l2_email, seller_email, seller_name'),
      supabase.rpc('get_aggregated_sessions', { start_date: from, end_date: to })
    ];

    if (requesterRole === 'L1' && requesterEmail) {
      promises.push(supabase.from('srs_raw').select('seller_email, l2_email').eq('l1_email', requesterEmail));
    }

    const results = await Promise.all(promises);

    const { data: sellersData, error: sellersError } = results[0];
    const { data: rolesData, error: rolesError } = results[1];
    const { data: srsData, error: srsError } = results[2];
    const { data: logsData, error: logsError } = results[3];
    const l1SrsData = results.length > 4 ? results[4].data : null;

    if (sellersError || rolesError || srsError || logsError) {
      console.error('Error fetching data:', sellersError || rolesError || srsError || logsError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
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
      if (l1SrsData) {
        const allowedEmails = new Set<string>();
        allowedEmails.add(requesterEmail); // Include the CM themselves
        l1SrsData.forEach((row: any) => {
          if (row.seller_email) allowedEmails.add(row.seller_email.toLowerCase());
          if (row.l2_email) allowedEmails.add(row.l2_email.toLowerCase());
        });

        allUsers = allUsers.filter(u => allowedEmails.has(u.email.toLowerCase()));
      }
    }

    // Aggregate time by user
    const aggregatedLogs: Record<string, { totalTime: number, tabs: Record<string, number>, daily: Record<string, { totalTime: number, tabs: Record<string, number> }> }> = {};

    logsData.forEach((log: any) => {
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
