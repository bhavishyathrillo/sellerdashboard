"use client";

export default function KPITab({ user }) {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 60px)' }}>
      <div
        data-kpi-user
        data-email={user?.email || ''}
        data-name={user?.name || ''}
        data-role={user?.role || 'Seller'}
        style={{ display: 'none' }}
      />
      <iframe
        src="/kpi-dashboard.html"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="KPI Command Center"
      />
    </div>
  );
}