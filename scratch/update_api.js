const fs = require('fs');
let api = fs.readFileSync('app/api/seller/cm-team-day/route.ts', 'utf8');

// Add monthlyLtaRes to Promise.all
if (!api.includes('monthly_lta_rows')) {
    api = api.replace(
        /const \[attendanceRes, ctiRes, allotmentRes, ltaRes, hourlyRes, dotRes, monthlyAllotmentRes\] = await Promise.all\(\[/,
        'const [attendanceRes, ctiRes, allotmentRes, ltaRes, hourlyRes, dotRes, monthlyAllotmentRes, monthlyLtaRes] = await Promise.all(['
    );
    api = api.replace(
        /supabase\.schema\('seller_day_to_day'\)\.from\('daily_allotment_summary'\)\.select\('\*'\)\.gte\('allotment_date', monthStart\)\.lte\('allotment_date', monthEnd\)\.in\('seller_email', emails\),/,
        `supabase.schema('seller_day_to_day').from('daily_allotment_summary').select('*').gte('allotment_date', monthStart).lte('allotment_date', monthEnd).in('seller_email', emails),
    supabase.from('daily_lta_log').select('*').gte('log_date', monthStart).lte('log_date', monthEnd).in('seller_email', emails),`
    );
    api = api.replace(
        /monthly_rows: \(monthlyAllotmentRes\.data \|\| \[\]\)\.filter\(\(r: any\) => r\.seller_email === seller\.seller_email\),/,
        `monthly_rows: (monthlyAllotmentRes.data || []).filter((r: any) => r.seller_email === seller.seller_email),
        monthly_lta_rows: (monthlyLtaRes.data || []).filter((r: any) => r.seller_email === seller.seller_email),`
    );
    fs.writeFileSync('app/api/seller/cm-team-day/route.ts', api);
    console.log('Updated API');
} else {
    console.log('API already updated');
}
