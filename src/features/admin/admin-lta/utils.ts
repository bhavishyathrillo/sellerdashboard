export interface BreakWindow { startH: number; startM: number; endH: number; endM: number; rawLabel: string }

export function formatTime(raw: string | null): string {
  if (!raw) return '—'
  const match = String(raw).match(/(\d{1,2}):(\d{2})/)
  if (!match) return '—'
  let h = parseInt(match[1])
  const m = match[2]
  const ampm = h >= 12 ? 'pm' : 'am'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${String(h12).padStart(2, '0')}:${m} ${ampm}`
}

export function fmtMins(mins: number): string {
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins}m`
}

export function pctOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function extractTimeParts(raw: string | null): { h: number; m: number } | null {
  if (!raw) return null
  const s = String(raw).trim()
  const match = s.match(/(?:^|T|\s)(\d{1,2}):(\d{2})/)
  if (match) return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) }
  return null
}

export function parseBreaks(raw: string | null): { count: number; totalMinutes: number; longestMinutes: number; windows: BreakWindow[] } {
  if (!raw?.trim()) return { count: 0, totalMinutes: 0, longestMinutes: 0, windows: [] }
  try {
    let count = 0, total = 0, longest = 0
    const windows: BreakWindow[] = []
    raw.split(',').map(s => s.trim()).filter(Boolean).forEach(entry => {
      const parts = entry.split(/\s*-\s*/)
      if (parts.length >= 2) {
        const pa = extractTimeParts(parts[0])
        const pb = extractTimeParts(parts[1])
        if (pa && pb) {
          const start = pa.h * 60 + pa.m
          let end = pb.h * 60 + pb.m
          if (end < start) end += 24 * 60
          const m = end - start
          count++
          total += m
          longest = Math.max(longest, m)
          windows.push({ startH: pa.h, startM: pa.m, endH: pb.h, endM: pb.m, rawLabel: entry })
        }
      }
    })
    return { count, totalMinutes: total, longestMinutes: longest, windows }
  } catch { return { count: 0, totalMinutes: 0, longestMinutes: 0, windows: [] } }
}

export function computeLtaFunnel(seller: any) {
  const dl = seller?.daily_lta || {}
  const leadGoal = dl.lead_goal || 0
  const wd = dl.wd || 0
  const planned = wd > 0 ? Math.floor(leadGoal / wd) : 0
  const dynLta = dl.real_dynamic_lta || 0
  const hygLta = dl.hygiene_lta || 0
  const rev1Lta = dl.goal_completion_logic_lta || 0
  const actual = Math.floor(dl.final_lta || 0)
  const dynLost = planned - dynLta
  const hygLost = dynLta - hygLta
  const rev1Lost = hygLta - rev1Lta
  const rev2Lost = rev1Lta - actual
  return { planned, dynLta, hygLta, rev1Lta, actual, dynLost, hygLost, rev1Lost, rev2Lost }
}

export function parseLogin(m: any) {
  if (m.isAbsent || !m.loginTime) return null;
  const match = String(m.loginTime).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  if (String(m.loginTime).toLowerCase().includes('pm') && h < 12) h += 12;
  if (String(m.loginTime).toLowerCase().includes('am') && h === 12) h = 0;
  return h * 60 + min;
}

export function getAvgLoginStr(sellers: any[]) {
  const total = sellers.reduce((sum, s) => {
    const min = parseLogin(s);
    return sum + (min || 0);
  }, 0);
  const valid = sellers.filter(s => parseLogin(s) !== null).length;
  if (valid === 0) return '—';
  const avg = Math.round(total / valid);
  const h = Math.floor(avg / 60);
  const m = avg % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function aggregateLtaFunnel(sellers: any[]) {
  const funnels = sellers.map(computeLtaFunnel)
  const sum = (key: string) => funnels.reduce((s, f: any) => s + (f[key] || 0), 0)
  return {
    planned: sum('planned'), dynLta: sum('dynLta'), hygLta: sum('hygLta'),
    rev1Lta: sum('rev1Lta'), actual: sum('actual'),
    dynLost: sum('dynLost'), hygLost: sum('hygLost'), rev1Lost: sum('rev1Lost'), rev2Lost: sum('rev2Lost'),
  }
}

