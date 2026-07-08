const BASE_URL = '/api/kpi';

async function fetchJSON(url, options = {}) {
  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API call failed: ${url}`, err.message);
    return null;
  }
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function getDashboardData() {
  return await fetchJSON(`${BASE_URL}?action=dashboard`) || {
    sellers: [], summary: { totalSellers: 0, regions: [], l1Managers: [], l2Managers: [] },
    cycles: [], cycleRanges: {}, latestCycle: '',
  };
}

export async function getRawMetrics(emails, from, to) {
  const p = new URLSearchParams({ action: 'raw' });
  if (emails?.length) p.set('emails', emails.join(','));
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  return await fetchJSON(`${BASE_URL}?${p.toString()}`) || { success: true, sellerMetrics: {}, dateFiltered: false };
}

export async function getMHLRawMetrics(emails, from, to) {
  const p = new URLSearchParams({ action: 'mhl' });
  if (emails?.length) p.set('emails', emails.join(','));
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  return await fetchJSON(`${BASE_URL}?${p.toString()}`) || { success: true, dailySummary: [], sellerMetrics: {}, overallMedian: null };
}

export async function getSellerRawData(email) {
  return await fetchJSON(`${BASE_URL}?action=seller-raw&email=${encodeURIComponent(email)}`) || {
    success: true, email, mhl: { headers: [], rows: [], count: 0, sheetFound: false }, call: { headers: [], rows: [], count: 0, sheetFound: false },
  };
}


export async function getReportData(cycle) {
  return await fetchJSON(`${BASE_URL}?action=report-card&cycle=${encodeURIComponent(cycle || '')}`) || {
    generated: formatDate(new Date()), subjectWeights: { output: 0.70, input: 0.15, quotations: 0.15 }, hasConviq: false,
    regions: [], cycles: [], selectedCycle: '', views: { '': { l1: [], l2: [] } },
  };
}

export async function getConvIQData() {
  return await fetchJSON(`${BASE_URL}?action=conviq`) || { success: true, updatedAt: '', regions: {}, sellers: {} };
}
