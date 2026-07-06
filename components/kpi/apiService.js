// ─── API SERVICE ───
// Change BASE_URL to your actual backend URL
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

async function fetchJSON(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API call to ${url} failed, returning empty:`, err.message);
    return null;
  }
}

// ─── Auth ───
export async function checkAccess() {
  return await fetchJSON(`${BASE_URL}/auth/session`);
}

// ─── Dashboard ───
export async function getDashboardData() {
  const data = await fetchJSON(`${BASE_URL}/dashboard`);
  if (!data) {
    return {
      sellers: [],
      summary: { totalSellers: 0, regions: [], l1Managers: [], l2Managers: [] },
      cycles: [],
      cycleRanges: {},
      latestCycle: '',
    };
  }
  return data;
}

// ─── Raw Metrics (Talk Time & W15) ───
export async function getRawMetrics(emails, from, to) {
  const params = new URLSearchParams();
  if (emails?.length) params.set('emails', emails.join(','));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const data = await fetchJSON(`${BASE_URL}/metrics/raw?${params.toString()}`);
  return data || { success: true, sellerMetrics: {}, dateFiltered: false };
}

// ─── MHL Metrics (MHE %) ───
export async function getMHLRawMetrics(emails, from, to) {
  const params = new URLSearchParams();
  if (emails?.length) params.set('emails', emails.join(','));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const data = await fetchJSON(`${BASE_URL}/metrics/mhl?${params.toString()}`);
  return data || { success: true, dailySummary: [], sellerMetrics: {}, overallMedian: null };
}

// ─── Raw Data Popup ───
export async function getSellerRawData(email) {
  const data = await fetchJSON(`${BASE_URL}/sellers/${encodeURIComponent(email)}/raw`);
  return data || {
    success: true,
    email,
    mhl: { headers: [], rows: [], count: 0, sheetFound: false },
    call: { headers: [], rows: [], count: 0, sheetFound: false },
  };
}

// ─── Sessions ───
export async function logSession(email, name, role) {
  const data = await fetchJSON(`${BASE_URL}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ email, name, role }),
  });
  return data || { success: true, sessionId: 'local', rowNum: 0 };
}

export async function pingSession(sessionId, durationMins, pagesVisited) {
  await fetchJSON(`${BASE_URL}/sessions/${sessionId}/ping`, {
    method: 'PATCH',
    body: JSON.stringify({ durationMins, pagesVisited }),
  });
}

export async function getSessionData() {
  const data = await fetchJSON(`${BASE_URL}/sessions`);
  return data || { success: true, sessions: [], serverTime: Date.now() };
}

// ─── Report Card ───
export async function getReportData(cycle) {
  const params = cycle ? `?cycle=${encodeURIComponent(cycle)}` : '';
  const data = await fetchJSON(`${BASE_URL}/report-card${params}`);
  return data || {
    generated: formatDate(new Date()),
    subjectWeights: { output: 0.70, input: 0.15, quotations: 0.15 },
    hasConviq: false,
    regions: [],
    cycles: [],
    selectedCycle: '',
    views: { '': { l1: [], l2: [] } },
  };
}

// ─── ConvIQ ───
export async function getConvIQData() {
  const data = await fetchJSON(`${BASE_URL}/conviq`);
  return data || { success: true, updatedAt: '', regions: {}, sellers: {} };
}

// ─── Users ───
export async function getAllUsers() {
  const data = await fetchJSON(`${BASE_URL}/admin/users`);
  return data || [];
}

export async function addUser(userData) {
  return await fetchJSON(`${BASE_URL}/admin/users`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(email, updates) {
  return await fetchJSON(`${BASE_URL}/admin/users/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(email) {
  return await fetchJSON(`${BASE_URL}/admin/users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
}