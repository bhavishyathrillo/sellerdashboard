"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fmtGoal, fmtTime, fmtPct1, fmtPct2, fmtW15, pBar, median, sum,
  gradeFor, FLAG_COLORS, isRedWhiteFlag, formatDate
} from './formatters';
import {
  checkAccess, getDashboardData, getRawMetrics, getMHLRawMetrics,
  getSellerRawData, logSession, pingSession, getSessionData,
  getReportData, getConvIQData, getAllUsers, addUser, updateUser, deleteUser
} from './apiService';

export default function KPITab({ user }) {
  const [currentUser, setCurrentUser] = useState(user || null);
  const [dashData, setDashData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [activePage, setActivePage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [dateFilters, setDateFilters] = useState({
    seller: { from: '', to: '' }, l1: { from: '', to: '' },
    l2: { from: '', to: '' }, overview: { from: '', to: '' },
  });
  const [sortState, setSortState] = useState({ col: null, dir: 'desc' });
  const [activeBoxFilter, setActiveBoxFilter] = useState(null);
  const [boxSellers, setBoxSellers] = useState([]);
  const [rawCache, setRawCache] = useState({});
  const [mhlCache, setMhlCache] = useState({});
  const [rawCacheLatest, setRawCacheLatest] = useState(null);
  const [mhlData, setMhlData] = useState(null);
  const [adminSellerEmail, setAdminSellerEmail] = useState(null);
  const [sessionRowNum, setSessionRowNum] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);
  const [sessionPages, setSessionPages] = useState([]);
  const [showRawModal, setShowRawModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [rawData, setRawData] = useState(null);
  const [rawTab, setRawTab] = useState('mhl');
  const [rawEmail, setRawEmail] = useState('');
  const [flagModalContent, setFlagModalContent] = useState({ title: '', sub: '', body: '' });
  const [rcData, setRcData] = useState(null);
  const [rcLevel, setRcLevel] = useState('l1');
  const [rcRegion, setRcRegion] = useState('');
  const [rcSort, setRcSort] = useState('overall');
  const [conviqData, setConviqData] = useState(null);
  const [adoptionData, setAdoptionData] = useState(null);
  const pingRef = useRef(null);
  const lastActivityRef = useRef(Date.now());  useEffect(() => {
    initDashboard();
    return () => { if (pingRef.current) clearInterval(pingRef.current); };
  }, []);

  const initDashboard = async () => {
    setLoading(true);
    let u = currentUser;
    if (!u) {
      const res = await checkAccess();
      if (res?.ok && res.user) {
        u = res.user;
        setCurrentUser(u);
      } else {
        u = { email: 'user@thrillophilia.com', name: 'User', role: 'Seller' };
        setCurrentUser(u);
      }
    }
    startSession(u);
    loadDashboardData();
  };

  const startSession = (u) => {
    setSessionStart(Date.now());
    setSessionPages([]);
    logSession(u.email, u.name, u.role).then(r => {
      if (r?.success) setSessionRowNum(r.sessionId || r.rowNum);
    });
    ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, () => { lastActivityRef.current = Date.now(); }, { passive: true });
    });
    pingRef.current = setInterval(() => {
      if (!sessionRowNum) return;
      if (Date.now() - lastActivityRef.current > 10 * 60 * 1000) return;
      const activeMins = Math.round((Date.now() - sessionStart) / 60000);
      pingSession(sessionRowNum, activeMins, [...new Set(sessionPages)].join(','));
    }, 5 * 60 * 1000);
  };

  const loadDashboardData = async () => {
    const data = await getDashboardData();
    setDashData(data);
    if (data?.cycles?.length) {
      const latest = data.latestCycle || data.cycles[0];
      setSelectedCycle(latest);
      const range = data.cycleRanges?.[latest];
      if (range) {
        const df = { from: range.from, to: range.to };
        setDateFilters({ seller: df, l1: df, l2: df, overview: df });
      }
    }
    setLoading(false);
    const role = currentUser?.role || 'Seller';
    if (role === 'Seller') setActivePage('seller');
    else if (role === 'L1 Manager') setActivePage('l1');
    else if (role === 'L2 Manager') setActivePage('l2');
    else setActivePage('overview');
  };

  const trackPage = (p) => {
    setSessionPages(prev => prev.includes(p) ? prev : [...prev, p]);
  };  const cycleSellers = useCallback(() => {
    const all = dashData?.sellers || [];
    if (!selectedCycle) return all;
    return all.filter(s => String(s.cycle || '') === selectedCycle);
  }, [dashData, selectedCycle]);

  const cycleRange = useCallback((cy) => {
    return dashData?.cycleRanges?.[cy] || null;
  }, [dashData]);

  const onCycleChange = (cy) => {
    setSelectedCycle(cy);
    const r = cycleRange(cy);
    const df = { from: r?.from || '', to: r?.to || '' };
    setDateFilters({ seller: df, l1: df, l2: df, overview: df });
    setRawCache({});
    setMhlCache({});
    setActiveBoxFilter(null);
  };

  const onDateChange = (view, field, value) => {
    setDateFilters(prev => {
      const updated = { ...prev[view], [field]: value };
      return { ...prev, [view]: updated };
    });
    setRawCache({});
    setMhlCache({});
  };

  const clearDate = (view) => {
    const r = cycleRange(selectedCycle);
    const df = { from: r?.from || '', to: r?.to || '' };
    setDateFilters(prev => ({ ...prev, [view]: df }));
    setRawCache({});
    setMhlCache({});
  };

  const fetchRaw = useCallback(async (sellers, view, cb) => {
    const emails = sellers.map(s => typeof s === 'string' ? s : s.email);
    const df = dateFilters[view] || {};
    const key = emails.slice().sort().join('|') + '||' + (df.from || '') + '|' + (df.to || '');
    if (rawCache[key]) { cb(rawCache[key]); return; }
    const res = await getRawMetrics(emails, df.from || null, df.to || null);
    if (res?.success) {
      setRawCache(prev => ({ ...prev, [key]: res }));
      setRawCacheLatest(res);
    }
    cb(res || {});
  }, [dateFilters, rawCache]);

  const fetchMHL = useCallback(async (sellers, view, cb) => {
    const emails = sellers.map(s => typeof s === 'string' ? s : s.email);
    const df = dateFilters[view] || {};
    const key = 'mhl|' + emails.slice().sort().join('|') + '||' + (df.from || '') + '|' + (df.to || '');
    if (mhlCache[key]) { cb(mhlCache[key]); return; }
    const res = await getMHLRawMetrics(emails, df.from || null, df.to || null);
    if (res?.success) setMhlCache(prev => ({ ...prev, [key]: res }));
    cb(res || {});
  }, [dateFilters, mhlCache]);

  const sidebarPages = () => {
    const role = currentUser?.role || 'Seller';
    const pages = [];
    if (role === 'Seller') pages.push({ id: 'seller', icon: '📊', label: 'My Dashboard' });
    if (role === 'L1 Manager') { pages.push({ id: 'report', icon: '📋', label: 'Report Card' }); pages.push({ id: 'l1', icon: '👥', label: 'L1 View' }); }
    if (role === 'L2 Manager') { pages.push({ id: 'report', icon: '📋', label: 'Report Card' }); pages.push({ id: 'l2', icon: '🏢', label: 'Division View' }); pages.push({ id: 'l1', icon: '👥', label: 'L1 View' }); pages.push({ id: 'adoption', icon: '📈', label: 'Adoption' }); }
    if (role === 'Admin' || role === 'Management') {
      pages.push({ id: 'overview', icon: '🌐', label: 'Overview' });
      pages.push({ id: 'report', icon: '📋', label: 'Report Card' });
      pages.push({ id: 'l2', icon: '🏢', label: 'L2 View' });
      pages.push({ id: 'l1', icon: '👥', label: 'L1 View' });
      pages.push({ id: 'seller', icon: '📊', label: 'Seller View' });
      pages.push({ id: 'settings', icon: '⚙', label: 'Settings' });
      pages.push({ id: 'adoption', icon: '📈', label: 'Adoption' });
    }
    return pages;
  };  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FF5200', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: '#9A968F' }}>Loading KPI Command Center...</p>
        </div>
      </div>
    );
  }

  const pages = sidebarPages();

  return (
    <div className="kpi-tab-container">
      <nav className="kpi-sidebar">
        <div className="kpi-sidebar-logo">
          <span style={{ fontWeight: 700, fontSize: 16, color: '#FF5200' }}>KPI Command Center</span>
        </div>
        <div className="kpi-sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {pages.map(p => (
            <div key={p.id} className={`nav-item ${activePage === p.id ? 'active' : ''}`} onClick={() => { setActivePage(p.id); trackPage(p.id); }}>
              <span className="nav-icon">{p.icon}</span>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
        <div className="sidebar-user">
          <div className="user-card">
            <div className="user-avatar">{currentUser?.name?.charAt(0)?.toUpperCase() || '?'}</div>
            <div>
              <div className="user-name">{currentUser?.name || 'User'}</div>
              <div className="user-role">{currentUser?.role || 'Seller'}</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="kpi-main-content">
        <div className="kpi-topbar">
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#000' }}>
              {activePage === 'seller' && 'My Dashboard'}
              {activePage === 'l1' && 'L1 Team View'}
              {activePage === 'l2' && 'L2 Division View'}
              {activePage === 'overview' && 'Organization Overview'}
              {activePage === 'report' && 'Manager Report Card'}
              {activePage === 'adoption' && 'Adoption & Sessions'}
              {activePage === 'settings' && 'Settings'}
            </h2>
          </div>
          <div className="date-badge">{formatDate(new Date())}</div>
        </div>

        {/* Placeholder pages — all show zero state */}
        {activePage === 'seller' && (
          <div className="empty-state" style={{ color: '#8E8E93', padding: 60 }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>My Dashboard</p>
            <p>Connect your backend API to populate KPI data.</p>
            <p style={{ marginTop: 4, fontSize: 12 }}>All values currently show 0 until data is added to Supabase.</p>
          </div>
        )}
        {activePage === 'l1' && (
          <div className="empty-state" style={{ color: '#8E8E93', padding: 60 }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>L1 Team View</p>
            <p>Connect your backend API to populate KPI data.</p>
            <p style={{ marginTop: 4, fontSize: 12 }}>All values currently show 0 until data is added to Supabase.</p>
          </div>
        )}
        {activePage === 'l2' && (
          <div className="empty-state" style={{ color: '#8E8E93', padding: 60 }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>L2 Division View</p>
            <p>Connect your backend API to populate KPI data.</p>
            <p style={{ marginTop: 4, fontSize: 12 }}>All values currently show 0 until data is added to Supabase.</p>
          </div>
        )}
        {activePage === 'overview' && (
          <div className="empty-state" style={{ color: '#8E8E93', padding: 60 }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Organization Overview</p>
            <p>Connect your backend API to populate KPI data.</p>
            <p style={{ marginTop: 4, fontSize: 12 }}>All values currently show 0 until data is added to Supabase.</p>
          </div>
        )}
        {activePage === 'report' && (
          <div className="empty-state" style={{ color: '#8E8E93', padding: 60 }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Manager Report Card</p>
            <p>Connect your backend API to populate KPI data.</p>
            <p style={{ marginTop: 4, fontSize: 12 }}>All values currently show 0 until data is added to Supabase.</p>
          </div>
        )}
        {activePage === 'adoption' && (
          <div className="empty-state" style={{ color: '#8E8E93', padding: 60 }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Adoption & Sessions</p>
            <p>Connect your backend API to populate KPI data.</p>
            <p style={{ marginTop: 4, fontSize: 12 }}>All values currently show 0 until data is added to Supabase.</p>
          </div>
        )}
        {activePage === 'settings' && (
          <div className="empty-state" style={{ color: '#8E8E93', padding: 60 }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Settings</p>
            <p>Connect your backend API to populate KPI data.</p>
            <p style={{ marginTop: 4, fontSize: 12 }}>All values currently show 0 until data is added to Supabase.</p>
          </div>
        )}
      </div>
    </div>
  );
}