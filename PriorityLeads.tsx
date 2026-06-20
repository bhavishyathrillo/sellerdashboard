'use client';

import { useEffect, useState } from 'react';
import styles from './PriorityLeads.module.css';

// Helper function to format duration
function formatDuration(seconds: number) {
  if (seconds === 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// Helper function to format date
function formatDate(dateString: string) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: string; 
  color: string; 
}) {
  return (
    <div className={styles.kpiCard} style={{ borderLeft: `4px solid ${color}` }}>
      <div className={styles.kpiHeader}>
        <span className={styles.kpiIcon}>{icon}</span>
        <span className={styles.kpiTitle}>{title}</span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      {subtitle && <div className={styles.kpiSubtitle}>{subtitle}</div>}
    </div>
  );
}

export default function PriorityLeads({ sellerEmail }: { sellerEmail: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    calledLeads: 0,
    uncalledLeads: 0,
    averageCallDurationFormatted: '0s',
    averageCallDuration: 0,
  });

  // Fetch priority leads
  const fetchLeads = async (searchTerm: string = '') => {
    if (!sellerEmail) {
      setError('No seller email provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        sellerEmail,
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/priority-leads?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch leads');
      }

      setLeads(result.data || []);
      setMetrics(result.metrics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLeads();
  }, [sellerEmail]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sellerEmail) {
        fetchLeads(search);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, sellerEmail]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('convert') || statusLower.includes('won')) return '#22C55E';
    if (statusLower.includes('contact') || statusLower.includes('call')) return '#F4631E';
    if (statusLower.includes('lost') || statusLower.includes('reject')) return '#EF4444';
    if (statusLower.includes('new')) return '#8B5CF6';
    if (statusLower.includes('follow')) return '#F59E0B';
    return '#8A8278';
  };

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <p>Loading priority leads...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <p>⚠️ {error}</p>
        <button onClick={() => fetchLeads(search)}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>📊 Priority Leads Dashboard</h2>
        <p className={styles.subtitle}>
          {metrics.totalLeads} leads · {metrics.calledLeads} called · {metrics.uncalledLeads} pending
        </p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KPICard
          title="Total Leads"
          value={metrics.totalLeads}
          icon="📋"
          color="#8B5CF6"
        />
        <KPICard
          title="Called Leads"
          value={metrics.calledLeads}
          subtitle={`${metrics.totalLeads > 0 ? Math.round((metrics.calledLeads / metrics.totalLeads) * 100) : 0}% conversion`}
          icon="📞"
          color="#22C55E"
        />
        <KPICard
          title="Uncalled Leads"
          value={metrics.uncalledLeads}
          subtitle={`${metrics.totalLeads > 0 ? Math.round((metrics.uncalledLeads / metrics.totalLeads) * 100) : 0}% pending`}
          icon="⏳"
          color="#F4631E"
        />
        <KPICard
          title="Average Call Duration"
          value={metrics.averageCallDurationFormatted}
          icon="⏱️"
          color="#F59E0B"
        />
      </div>

      {/* Search Bar */}
      <div className={styles.searchWrap}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by Lead ID, Status, Region, or Stage..."
          className={styles.searchInput}
        />
        <span className={styles.searchCount}>
          {leads.length} leads found
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lead ID</th>
              <th>Stage</th>
              <th>Lead Status</th>
              <th>Region</th>
              <th>Final Status</th>
              <th>Dials Today</th>
              <th>Call Duration</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No priority leads found
                  {search && ' matching your search'}
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.lead_id}>
                  <td className={styles.leadId}>{lead.lead_id}</td>
                  <td>
                    <span className={styles.badge} style={{ 
                      backgroundColor: getStatusColor(lead.stage),
                      opacity: 0.9 
                    }}>
                      {lead.stage || '-'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.badge} style={{ 
                      backgroundColor: getStatusColor(lead.lead_status) 
                    }}>
                      {lead.lead_status || '-'}
                    </span>
                  </td>
                  <td>{lead.planned_region || '-'}</td>
                  <td>
                    <span className={styles.badge} style={{ 
                      backgroundColor: getStatusColor(lead.final_status) 
                    }}>
                      {lead.final_status || '-'}
                    </span>
                  </td>
                  <td className={styles.dials}>
                    {lead.dials_today || 0}
                    {lead.dials_today > 0 && (
                      <span className={styles.callIndicator}>📞</span>
                    )}
                  </td>
                  <td className={styles.duration}>
                    {lead.answered_seconds_today > 0 
                      ? formatDuration(lead.answered_seconds_today) 
                      : '-'}
                  </td>
                  <td className={styles.updated}>
                    {formatDate(lead.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}