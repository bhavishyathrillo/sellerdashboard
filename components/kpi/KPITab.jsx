"use client";

export default function KPITab({ user }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        main[class*="DashboardLayout_main"] { overflow: hidden !important; }
      `}} />
      <div
        data-kpi-user
        data-email={user?.email || ''}
        data-name={user?.name || ''}
        data-role={user?.role || 'Seller'}
        style={{ display: 'none' }}
      />
      <iframe
        src="/kpi-dashboard.html"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="KPI Command Center"
      />
    </div>
  );
}