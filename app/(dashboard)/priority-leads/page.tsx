'use client';

import { useState, useEffect } from 'react';

export default function PriorityLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    called: 0,
    notCalled: 0,
    avgDuration: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    stage: '',
    startDate: '',
    endDate: '',
  });
  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    stages: [],
  });

  // Get the logged-in user's email
  useEffect(() => {
    const getEmail = async () => {
      try {
        // OPTION 1: Try to get from your session API
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data?.user?.email) {
          setUserEmail(data.user.email);
          return;
        }
      } catch (e) {
        console.log('Session API not found, trying other methods...');
      }

      // OPTION 2: Try localStorage
      const emailFromStorage = localStorage.getItem('email') || 
                              localStorage.getItem('userEmail') || 
                              localStorage.getItem('user') || 
                              sessionStorage.getItem('email');
      if (emailFromStorage) {
        setUserEmail(emailFromStorage);
        return;
      }

      // OPTION 3: Try cookies
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === 'email' || key === 'userEmail' || key === 'user') {
          setUserEmail(decodeURIComponent(value));
          return;
        }
      }

      // OPTION 4: Hardcode for testing (REMOVE THIS IN PRODUCTION)
      console.log('No email found, using hardcoded email');
      setUserEmail('dinesh@thrillophilia.com');
    };

    getEmail();
  }, []);

  const fetchLeads = async () => {
    if (!userEmail) {
      console.log('No email set, skipping fetch');
      return;
    }
    
    console.log('Fetching leads for:', userEmail);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('email', userEmail);
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/priority-leads?${params}`);
      const data = await response.json();
      
      console.log('Data received:', data);
      setLeads(data.data || []);
      setMetrics(data.metrics || { totalLeads: 0, called: 0, notCalled: 0, avgDuration: 0 });
      setFilterOptions({
        statuses: data.filters?.statuses || [],
        stages: data.filters?.stages || [],
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchLeads();
    }
  }, [userEmail, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      search: '',
      status: '',
      stage: '',
      startDate: '',
      endDate: '',
    });
  };

  if (loading || !userEmail) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Priority Leads</h1>
        <p className="mt-4">Loading user data...</p>
        <p className="text-sm text-gray-400 mt-2">If this takes too long, check console for errors.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Priority Leads</h1>
        <p className="text-sm text-gray-500">Track and manage your priority leads</p>
        <p className="text-xs text-gray-400 mt-1">Showing data for: {userEmail}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search leads..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {filterOptions.statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={filters.stage}
              onChange={(e) => handleFilterChange('stage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Stages</option>
              {filterOptions.stages.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Leads</p>
          <p className="text-2xl font-bold">{metrics.totalLeads}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Called</p>
          <p className="text-2xl font-bold">{metrics.called}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Not Called</p>
          <p className="text-2xl font-bold">{metrics.notCalled}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Avg Duration (sec)</p>
          <p className="text-2xl font-bold">{metrics.avgDuration.toFixed(1)}</p>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No priority leads found for {userEmail}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dials</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead: any) => (
                  <tr key={lead.lead_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{lead.lead_id}</td>
                    <td className="px-6 py-4 text-sm">{lead.stage || '-'}</td>
                    <td className="px-6 py-4 text-sm">{lead.lead_status || '-'}</td>
                    <td className="px-6 py-4 text-sm">{lead.planned_region || '-'}</td>
                    <td className="px-6 py-4 text-sm">{lead.final_status || '-'}</td>
                    <td className="px-6 py-4 text-sm">{lead.dials_today || 0}</td>
                    <td className="px-6 py-4 text-sm">{lead.answered_seconds_today || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}