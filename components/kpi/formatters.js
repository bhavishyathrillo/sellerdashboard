// ─── FORMATTERS (exact replicas from original Code.gs) ───
export function fmtGoal(v) {
  if (v == null) return 'Rs.0';
  if (v >= 10000000) return 'Rs.' + (v / 10000000).toFixed(2) + 'Cr';
  if (v >= 100000) return 'Rs.' + (v / 100000).toFixed(1) + 'L';
  if (v > 0) return 'Rs.' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return 'Rs.0';
}

export function fmtTime(v) {
  if (v == null || v <= 0) return '0 min';
  if (v < 60) return Math.round(v) + ' min';
  return Math.floor(v / 60) + 'h ' + (Math.round(v % 60) > 0 ? Math.round(v % 60) + 'm' : '');
}

export function fmtPct1(v) {
  if (v == null) return '0.0%';
  return (v * 100).toFixed(1) + '%';
}

export function fmtPct2(v) {
  if (v == null) return '0.00%';
  return v.toFixed(2) + '%';
}

export function fmtW15(v) {
  if (v == null) return '0.0%';
  return v.toFixed(1) + '%';
}

export function pBar(actual, target, lowerBetter = false) {
  if (actual == null || target == null || target === 0) return { pct: 0, cls: 'amber' };
  let pct;
  if (lowerBetter) {
    pct = actual <= target ? 100 : Math.min(Math.round(target / actual * 100), 100);
  } else {
    pct = Math.min(Math.round(actual / target * 100), 100);
  }
  const cls = pct >= 90 ? 'green' : pct >= 70 ? 'amber' : 'red';
  return { pct, cls };
}

export function median(arr) {
  const a = arr.filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function sum(arr) {
  return arr.filter(v => v != null && !isNaN(v) && v > 0).reduce((a, b) => a + b, 0);
}

export function gradeFor(score) {
  if (score === null || score === undefined) return 'NR';
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

export const FLAG_COLORS = {
  1: { bg: 'rgba(232,232,232,0.15)', color: '#E0E0E0', label: 'White' },
  2: { bg: 'rgba(255,71,87,0.2)', color: '#FF6B7A', label: 'Red' },
  3: { bg: 'rgba(255,183,3,0.2)', color: '#FFB703', label: 'Yellow' },
  4: { bg: 'rgba(255,87,34,0.2)', color: '#FF7043', label: 'Orange' },
  5: { bg: 'rgba(0,200,151,0.2)', color: '#00C897', label: 'Green' },
  6: { bg: 'rgba(255,215,0,0.2)', color: '#FFD700', label: 'Star' },
};

export function isRedWhiteFlag(s) {
  const f = String((s && s.flag) || '').toLowerCase();
  return f.indexOf('red') >= 0 || f.indexOf('white') >= 0;
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}