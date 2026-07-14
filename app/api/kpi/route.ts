import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function fetchAll(q: any) {
  const all: any[] = [];
  let f = 0; const s = 1000;
  while(true) {
    const { data, error } = await q.range(f, f + s - 1);
    if(error) throw error;
    if(!data || data.length === 0) break;
    all.push(...data);
    if(data.length < s) break;
    f += s;
  }
  return { data: all };
}

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// ROUTER
// ============================================================
export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const action = u.searchParams.get('action') || 'dashboard';
  switch (action) {
    case 'dashboard': return handleDashboard(req);
    case 'raw': return handleRawMetrics(req);
    case 'mhl': return handleMHLMetrics(req);
    case 'seller-raw': return handleSellerRaw(req);
    case 'sessions': return handleGetSessions();
    case 'report-card': return handleReportCard(req);
    case 'compare-report': return handleCompareReport(req);
    case 'conviq': return handleConvIQ();
    case 'cycles': return handleCycles();
    default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
export async function POST(req: NextRequest) {
  const u = new URL(req.url);
  const a = u.searchParams.get('action') || '';
  if (a === 'session') return handleCreateSession(req);
  if (a === 'user') return handleCreateUser(req);
  if (a === 'raw') return handleRawMetrics(req);
  if (a === 'mhl') return handleMHLMetrics(req);
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
export async function PATCH(req: NextRequest) {
  const a = new URL(req.url).searchParams.get('action') || '';
  if (a === 'ping') return handlePingSession(req);
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
export async function DELETE(req: NextRequest) {
  const a = new URL(req.url).searchParams.get('action') || '';
  if (a === 'user') return handleDeleteUser(req);
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// ============================================================
// HELPERS
// ============================================================
function medArr(a: number[]) { if(!a.length) return null; const s=[...a].sort((x,y)=>x-y), m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }

async function enrichWithMedians(rows: any[], sc: string, customFrom?: string | null, customTo?: string | null) {
  if (!rows || !rows.length || !sc) return;
  const { data: cd } = await supabase.schema('seller_day_to_day').from('cycles').select('start_date, end_date').eq('cycle', sc).limit(1);
  if (!cd || cd.length === 0) return;
  const from = customFrom || cd[0].start_date;
  const to = customTo || cd[0].end_date;
  const emails = [...new Set(rows.map(r => r.email).filter(Boolean))];
  if (!emails.length) return;

  const { data: mhlData } = await fetchAll(supabase.schema('seller_day_to_day').from('mhl_daily')
    .select('seller_email, activity_date, mishandled_count, open_leads_count, available_today')
    .in('seller_email', emails).gte('activity_date', from).lte('activity_date', to));
  
  const mheMap: Record<string, number> = {};
  if (mhlData) {
    const sdm: Record<string,Record<string,any>> = {};
    const validMhl = mhlData.filter((r:any) => r.available_today !== false && r.available_today !== 'false' && new Date(r.activity_date).getDay() !== 0);
    validMhl.forEach((r:any) => {
      const e = (r.seller_email || '').toLowerCase();
      const iso = r.activity_date;
      if (!sdm[e]) sdm[e] = {};
      if (!sdm[e][iso]) sdm[e][iso] = { mish: 0, open: 0 };
      sdm[e][iso].mish += +r.mishandled_count;
      sdm[e][iso].open += +r.open_leads_count;
    });
    Object.keys(sdm).forEach(e => {
      const days = Object.values(sdm[e]).map((d:any) => d.open > 0 ? (d.mish / d.open) : null).filter(v => v !== null) as number[];
      const smv = medArr(days);
      if (smv !== null) mheMap[e] = smv; // fraction
    });
    
    // Attach raw daily data for team median calculations in rcAggregate
    rows.forEach(r => {
      const e = (r.email || '').toLowerCase();
      r._mhl_daily = validMhl.filter((m:any) => (m.seller_email||'').toLowerCase() === e);
    });
  }

  const { data: leadsData } = await fetchAll(supabase.schema('seller_day_to_day').from('leads')
    .select('sales_email_id, call_bucket')
    .in('sales_email_id', emails).gte('lead_assignment_time', from + 'T00:00:00+05:30').lte('lead_assignment_time', to + 'T23:59:59+05:30'));

  const w15Map: Record<string, number> = {};
  if (leadsData) {
    const sd: Record<string,{wIn:number;wTot:number}> = {};
    leadsData.forEach((r:any) => {
      const e = (r.sales_email_id || '').toLowerCase();
      if (!sd[e]) sd[e] = { wIn: 0, wTot: 0 };
      const b = (r.call_bucket || '').toLowerCase();
      if (b.includes('within')) { sd[e].wIn++; sd[e].wTot++; }
      else if (b.includes('beyond') || b.includes('15')) { sd[e].wTot++; }
    });
    Object.keys(sd).forEach(e => {
      if (sd[e].wTot > 0) w15Map[e] = (sd[e].wIn / sd[e].wTot) * 100;
    });
  }

  rows.forEach(r => {
    const e = (r.email || '').toLowerCase();
    if (mheMap[e] !== undefined) r.mhe_actual = mheMap[e];
    if (w15Map[e] !== undefined) r.sla_actual = w15Map[e];
  });
}

async function getRosterDataWithDeltas(from: string | null, to: string | null, sc: string, l1?: string, l2?: string): Promise<any[]> {
  if (!from || !to || from === 'null' || to === 'null') {
    let q = supabase.from('roster').select('*');
    if (sc) q = q.eq('cycle', sc);
    if (l1 && l1 !== 'all') q = q.eq('l1_manager_name', l1);
    if (l2 && l2 !== 'all') q = q.eq('l2_manager_name', l2);
    const { data } = await fetchAll(q);
    const rows = data || [];
    await enrichWithMedians(rows, sc, from, to);
    return rows;
  }

  const fromDateObj = new Date(from);
  fromDateObj.setDate(fromDateObj.getDate() - 1);
  const baselineDate = fromDateObj.toISOString().split('T')[0];

  let dq = supabase.from('roster_daily_logs').select('*')
    .gte('log_date', baselineDate)
    .lte('log_date', to);
  const { data: dRows } = await fetchAll(dq);
  
  const sellerLatest: Record<string, any> = {};
  const sellerBaseline: Record<string, any> = {};
  (dRows||[]).forEach((r: any) => {
    const key = (r.email || '').toLowerCase();
    if (!sellerLatest[key] || r.log_date > sellerLatest[key].log_date) sellerLatest[key] = r;
    if (r.log_date <= baselineDate) {
      if (!sellerBaseline[key] || r.log_date > sellerBaseline[key].log_date) sellerBaseline[key] = r;
    }
  });
  
  let deltaRows = Object.values(sellerLatest).map((latest: any) => {
    const base = sellerBaseline[(latest.email || '').toLowerCase()];
    if (!base) return latest;
    const delta = { ...latest };
    const fieldsToSubtract = [
      'bottomline_shb', 'bottomline_actual',
      'topline_shb', 'topline_actual',
      'conversion_shb', 'conversion_actual',
      'unique_leads', 'unique_leads_quoted',
      'unique_feasibility_sent', 'total_feasibility_sent',
      'feasibility_passed', 'reworks',
      'mishandled_count', 'total_lead_instances',
      'called_within_15_count', 'total_leads',
      'priority_leads_count', 'leads_shb', 'converted_count'
    ];
    fieldsToSubtract.forEach(f => {
      if (typeof latest[f] === 'number' && typeof base[f] === 'number') {
        delta[f] = Math.max(0, latest[f] - base[f]);
      }
    });
    const baseTalkN = (base.talk_actual || 0) * (base.talk_call_count || 0);
    const latestTalkN = (latest.talk_actual || 0) * (latest.talk_call_count || 0);
    const deltaTalkCallCount = Math.max(0, (latest.talk_call_count || 0) - (base.talk_call_count || 0));
    if (deltaTalkCallCount > 0) {
       delta.talk_actual = Math.max(0, (latestTalkN - baseTalkN) / deltaTalkCallCount);
       delta.talk_call_count = deltaTalkCallCount;
    } else {
       delta.talk_actual = null;
       delta.talk_call_count = 0;
    }
    return delta;
  });

  if (sc) deltaRows = deltaRows.filter((r: any) => r.cycle === sc);
  if (l1 && l1 !== 'all') deltaRows = deltaRows.filter((r: any) => r.l1_manager_name === l1);
  if (l2 && l2 !== 'all') deltaRows = deltaRows.filter((r: any) => r.l2_manager_name === l2);
  await enrichWithMedians(deltaRows, sc, from, to);
  return deltaRows;
}

// ============================================================
// DASHBOARD — roster only, no srs_raw
// ============================================================
async function handleDashboard(req?: NextRequest) {
  try {
    let from: string | null = null;
    let to: string | null = null;
    if (req) {
      const u = new URL(req.url);
      const fromRaw = u.searchParams.get('from');
      const toRaw = u.searchParams.get('to');
      from = (fromRaw && fromRaw !== 'null') ? fromRaw : null;
      to = (toRaw && toRaw !== 'null') ? toRaw : null;
    }

    const { data: cd } = await supabase.schema('seller_day_to_day').from('cycles').select('*').order('start_date',{ascending:false});
    const cr: Record<string,{from:string;to:string}> = {}; (cd||[]).forEach((c:any)=>{ cr[c.cycle]={from:c.start_date,to:c.end_date}; });
    const cycles = (cd||[]).map((c:any)=>c.cycle); const lc = cycles[0]||'';

    const sellers = await getRosterDataWithDeltas(from, to, lc);

    const mapped = (sellers||[]).map((s:any)=>{
      return {
        cycle: s.cycle || '',
        email: s.email || '',
        name: s.name || '',
        l1Manager: s.l1_manager_name || '',
        l1Email: s.l1_manager_email || '',
        l2Manager: s.l2_manager_name || '',
        l2Email: s.l2_manager_email || '',
        region: s.region || '',
        goalType: s.goal_type || '',
        status: s.status || 'Active',
        mheSHB: s.mhe_shb,
        mheActual: s.mhe_actual,
        blSHB: s.bottomline_shb || 0,
        blActual: s.bottomline_actual || 0,
        slaSHB: s.sla_shb || 90,
        talkSHB: s.talk_shb || 8,
        talkActual: s.talk_actual || 0,
        haul: s.haul || '',
        flag: String(s.flag || ''),
        tlSHB: s.topline_shb || 0,
        tlActual: s.topline_actual || 0,
      };
    });
    const regs=[...new Set(mapped.map((s:any)=>s.region).filter(Boolean))] as string[];
    const l1s=[...new Set(mapped.map((s:any)=>s.l1Manager).filter(Boolean))] as string[];
    const l2s=[...new Set(mapped.map((s:any)=>s.l2Manager).filter(Boolean))] as string[];
    return NextResponse.json({ sellers:mapped, summary:{totalSellers:mapped.length,regions:regs,l1Managers:l1s,l2Managers:l2s}, cycles, cycleRanges:cr, latestCycle:lc });
  } catch(e:any) { return NextResponse.json({ sellers:[], summary:{totalSellers:0,regions:[],l1Managers:[],l2Managers:[]}, cycles:[], cycleRanges:{}, latestCycle:'', error:e.message }); }
}

// ============================================================
// RAW METRICS — seller_day_to_day.leads
// ============================================================
async function handleRawMetrics(req: NextRequest) {
  try {
    const u = new URL(req.url); let emString = u.searchParams.get('emails')||''; if(req.method==='POST'){ try { const b=await req.json(); emString=b.emails||''; }catch(e){} }; const em = emString.split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
    const f=u.searchParams.get('from')||null, t=u.searchParams.get('to')||null;
    let q = supabase.schema('seller_day_to_day').from('leads').select('sales_email_id,first_connected_call_duration,call_bucket');
    if(em.length) q=q.in('sales_email_id',em); if(f) q=q.gte('lead_assignment_time',f+'T00:00:00+05:30'); if(t) q=q.lte('lead_assignment_time',t+'T23:59:59+05:30');
    const { data: rows } = await fetchAll(q);
    const sd: Record<string,{dur:number[];wIn:number;wTot:number}> = {}; em.forEach(e=>{ sd[e]={dur:[],wIn:0,wTot:0}; });
    (rows||[]).forEach((r:any)=>{ const e=(r.sales_email_id||'').toLowerCase(); if(!sd[e]) sd[e]={dur:[],wIn:0,wTot:0}; if(r.first_connected_call_duration>0) sd[e].dur.push(+r.first_connected_call_duration); const b=(r.call_bucket||'').toLowerCase(); if(b.includes('within')){sd[e].wIn++;sd[e].wTot++;}else if(b.includes('beyond')||b.includes('15')){sd[e].wTot++;} });
    const sm: Record<string,any> = {}; Object.keys(sd).forEach(e=>{ const d=sd[e]; sm[e]={talkMedian:d.dur.length?parseFloat(medArr(d.dur)!.toFixed(1)):null, w15Pct:d.wTot>0?parseFloat((d.wIn/d.wTot*100).toFixed(1)):null, w15Within:d.wIn, w15Total:d.wTot}; });
    return NextResponse.json({success:true,sellerMetrics:sm,dateFiltered:!!(f||t)});
  } catch(e:any) { return NextResponse.json({success:false,error:e.message}); }
}

// ============================================================
// MHL METRICS — seller_day_to_day.mhl_daily
// ============================================================
async function handleMHLMetrics(req: NextRequest) {
  try {
    const u = new URL(req.url); let emString = u.searchParams.get('emails')||''; if(req.method==='POST'){ try { const b=await req.json(); emString=b.emails||''; }catch(e){} }; const em = emString.split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
    const f=u.searchParams.get('from')||null, t=u.searchParams.get('to')||null;
    let q = supabase.schema('seller_day_to_day').from('mhl_daily').select('*'); if(em.length) q=q.in('seller_email',em); if(f) q=q.gte('activity_date',f); if(t) q=q.lte('activity_date',t);
    const { data: rowsRaw } = await fetchAll(q);
    const rows = (rowsRaw||[]).filter((r:any)=>r.available_today!==false&&r.available_today!=='false' && new Date(r.activity_date).getDay()!==0);
    const dm: Record<string,any> = {}; const sdm: Record<string,Record<string,any>> = {};
    rows.forEach((r:any)=>{
      const iso=r.activity_date, disp=new Date(r.activity_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
      if(!dm[iso]) dm[iso]={mish:0,open:0,disp};
      dm[iso].mish+=+r.mishandled_count; dm[iso].open+=+r.open_leads_count;
      const e=(r.seller_email||'').toLowerCase(); if(!sdm[e]) sdm[e]={}; if(!sdm[e][iso]) sdm[e][iso]={mish:0,open:0,disp};
      sdm[e][iso].mish+=+r.mishandled_count; sdm[e][iso].open+=+r.open_leads_count;
    });
    const ds = Object.keys(dm).sort().reverse().map(iso=>{ const d=dm[iso]; return {date:d.disp,isoDate:iso,mishandled:d.mish,openLeads:d.open,mhePct:d.open>0?parseFloat((d.mish/d.open*100).toFixed(2)):null}; });
    const om = medArr(ds.map(d=>d.mhePct).filter(v=>v!=null) as number[]);
    const sem: Record<string,any> = {}; Object.keys(sdm).forEach(e=>{ const days=Object.keys(sdm[e]).sort().reverse().map(iso=>{ const d=sdm[e][iso]; return {date:d.disp,isoDate:iso,mishandled:d.mish,openLeads:d.open,mhePct:d.open>0?parseFloat((d.mish/d.open*100).toFixed(2)):null}; }); const smv=medArr(days.map(d=>d.mhePct).filter(v=>v!=null) as number[]); sem[e]={mheMedian:smv!=null?parseFloat(smv.toFixed(2)):null,dailyRows:days}; });
    return NextResponse.json({success:true,dailySummary:ds,sellerMetrics:sem,overallMedian:om!=null?parseFloat(om.toFixed(2)):null});
  } catch(e:any) { return NextResponse.json({success:false,error:e.message}); }
}

// ============================================================
// SELLER RAW
// ============================================================
async function handleSellerRaw(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const email = u.searchParams.get('email')||'';
    const f = u.searchParams.get('from')||null;
    const t = u.searchParams.get('to')||null;
    let qM = supabase.schema('seller_day_to_day').from('mhl_daily').select('*').ilike('seller_email',email);
    if(f) qM=qM.gte('activity_date',f);
    if(t) qM=qM.lte('activity_date',t);
    const { data: mRaw } = await qM.order('activity_date',{ascending:false}).limit(100000);
    const m = (mRaw||[]).filter((r:any)=>r.available_today!==false&&r.available_today!=='false' && new Date(r.activity_date).getDay()!==0);
    
    let qC = supabase.schema('seller_day_to_day').from('leads').select('SALES_EMAIL_ID:sales_email_id, LEAD_CREATION_TIME:created_at, LEAD_ASSIGNMENT_TIME:lead_assignment_time, REGION:region, FIRST_CONNECTED_CALL_DURATION:first_connected_call_duration, LEAD_LINK:enquiry_code, FIRST_CONNECTED_CALL_RECORDING:first_connected_call_recording, CALL_BUCKET:call_bucket').ilike('sales_email_id',email);
    if(f) qC=qC.gte('lead_assignment_time',f+'T00:00:00+05:30');
    if(t) qC=qC.lte('lead_assignment_time',t+'T23:59:59+05:30');
    const { data: c } = await qC.order('lead_assignment_time',{ascending:false}).limit(100000);
    
    let qMho = supabase.from('mhl_mho').select('SALES_EMAIL_ID:owner_email, CURRENT_LEAD_STAGE:stage, LAST_CALL:last_call, IF_MISHANDLED:mhl_mho, ENQUIRY_LINK:lead_id').ilike('owner_email',email).ilike('mhl_mho','%mishandled%');
    const { data: mhoRaw } = await qMho.order('last_call', {ascending:false}).limit(1000);
    
    m.forEach((row: any) => {
        if (!row.activity_date) return;
        const matches = (mhoRaw || []).filter((l: any) => l.LAST_CALL && l.LAST_CALL.startsWith(row.activity_date));
        row.mishandled_enquiry_ids = matches.length ? matches.map((l:any) => l.ENQUIRY_LINK).join(', ') : '';
    });
      
    return NextResponse.json({success:true,email,mhl:{headers:m?.length?Object.keys(m[0]):[],rows:m||[],count:(m||[]).length,sheetFound:true,leads:mhoRaw||[]},call:{headers:c?.length?Object.keys(c[0]):[],rows:c||[],count:(c||[]).length,sheetFound:true}});
  } catch { return NextResponse.json({success:true,email:'',mhl:{headers:[],rows:[],count:0,sheetFound:false},call:{headers:[],rows:[],count:0,sheetFound:false}}); }
}

// ============================================================
// SESSIONS
// ============================================================
async function handleGetSessions() {
  try {
    const now=Date.now(); const { data: s } = await supabase.from('sessions').select('*').order('login_at',{ascending:false}).limit(500);
    const m = (s||[]).map((x:any)=>{ const d=x.login_at?new Date(x.login_at):new Date(); const lp=x.last_ping_at?new Date(x.last_ping_at).getTime():null; return {sessionId:x.session_token||'',email:x.email||'',name:x.name||'',role:x.role||'',loginDate:d.toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'}),loginTime:d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false}),lastPingMs:lp,durationMins:x.duration_mins||0,pagesVisited:Array.isArray(x.pages_visited)?x.pages_visited.join(','):'',online:lp!=null&&(now-lp)<=600000}; });
    return NextResponse.json({success:true,sessions:m,serverTime:now});
  } catch(e:any) { return NextResponse.json({success:false,error:e.message}); }
}
async function handleCreateSession(req: NextRequest) {
  try {
    const b = await req.json(); const tok = b.token || Buffer.from((b.email||'')+'_'+Date.now()).toString('base64').replace(/[^a-zA-Z0-9]/g,'').substring(0,16);
    await supabase.from('sessions').insert({session_token:tok,email:b.email||'',name:b.name||'',role:b.role||'',login_at:new Date().toISOString(),duration_mins:0,pages_visited:[]});
    return NextResponse.json({success:true,sessionId:tok,rowNum:1});
  } catch(e:any) { return NextResponse.json({success:false,error:e.message}); }
}
async function handlePingSession(req: NextRequest) {
  try {
    const b = await req.json(); const tok = new URL(req.url).searchParams.get('token')||'';
    await supabase.from('sessions').update({last_ping_at:new Date().toISOString(),duration_mins:b.durationMins||0,pages_visited:b.pagesVisited?b.pagesVisited.split(',').map((s:string)=>s.trim()):[]}).eq('session_token',tok);
    return NextResponse.json({success:true});
  } catch { return NextResponse.json({success:false}); }
}

// ============================================================
// REPORT CARD — roster only, no srs_raw
// ============================================================
const BENCH = { mishandled:0.15, called15:0.90, talk:8, flag:0.12, quoted:0.50, quoteFeas:0.30, pass:0.90, quoteConv:0.80, rework:2, priority:0.20 };
const CHW = { input:{mishandled:.30,called15:.30,talk:.15,priority:.25}, quotations:{quoted:.25,quoteFeas:.15,pass:.25,rework:.15,quoteConv:.20}, output:{bottomline:.30,topline:.15,conversionPct:.25,margin:.15,flag:.15} };
const SW = { output:.70, input:.30, quotations:0 };
const FL = ['','White','Red','Yellow','Orange','Green','Star'];

function n0(v:any){ if(v===null||v===undefined)return 0; if(typeof v==='number')return v; const s=String(v).trim(); if(s===''||s.toUpperCase()==='NA'||s==='-')return 0; return parseFloat(s.replace(/[%,]/g,''))||0; }
function nN(v:any){ if(v===null||v===undefined)return null; if(typeof v==='number')return v; const s=String(v).trim(); if(s===''||s.toUpperCase()==='NA'||s==='-')return null; return parseFloat(s.replace(/[%,]/g,''))||null; }
function scHi(a:number|null,b:number){ if(a===null||b===0)return null; return Math.min(a/b,1)*100; }
function scLo(a:number|null,b:number){ if(a===null)return null; if(a<=0)return 100; return Math.min(b/a,1)*100; }
function wAvg(pairs:[number|null,number][]):number|null{ let w=0,m=0; for(const[p,wt]of pairs){if(p===null||p===undefined)continue;w+=wt;m+=p*wt;} return w>0?m/w:null; }
function grd(s:number|null){ if(s===null)return'NR'; if(s>=90)return'A+';if(s>=80)return'A';if(s>=70)return'B';if(s>=60)return'C';if(s>=50)return'D';return'E'; }
function r1(x:number|null){ return x===null||x===undefined?null:Math.round(x*10)/10; }
function pF(x:number|null){ return x===null?'-':Math.round(x*100)+'%'; }
function iF(x:number){ return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function mF(x:number|null){ if(x===null||x===undefined)return'-'; const a=Math.abs(x); if(a>=1e7)return'Rs '+(x/1e7).toFixed(2)+' Cr'; if(a>=1e5)return'Rs '+(x/1e5).toFixed(2)+' L'; if(a>=1e3)return'Rs '+(x/1e3).toFixed(1)+'K'; return'Rs '+Math.round(x); }

function rcAggregate(rows:any[], includeFlag:boolean){
  let mish=0,mishD=0,c15=0,c15D=0,talkN=0,talkD=0,rw=0,sellers=0,prio=0,aa=0,z=0,ac=0,ae=0,ad=0,ag=0,conv2=0,botA=0,botT=0,topA=0,topT=0,convA=0,convT=0,leadsSHB=0;
  function median(arr:number[]):number|null{
    if(!arr.length)return null;
    const s=[...arr].sort((a,b)=>a-b);
    const mid=Math.floor(s.length/2);
    return s.length%2!==0 ? s[mid] : (s[mid-1]+s[mid])/2;
  }
  
  const allDaily: any[] = [];
  rows.forEach((r:any)=>{
    if (r._mhl_daily) allDaily.push(...r._mhl_daily);
    mish+=n0(r.mishandled_count); mishD+=n0(r.total_lead_instances);
    c15+=n0(r.called_within_15_count); c15D+=n0(r.total_leads);
    prio+=n0(r.priority_leads_count);
    const q=nN(r.talk_actual), al=n0(r.talk_call_count); if(q!==null&&al>0){talkN+=q*al;talkD+=al;}
    sellers++; const f=nN(r.flag); if(f===1||f===2)rw++;
    aa+=n0(r.unique_leads_quoted); z+=n0(r.unique_leads);
    ac+=n0(r.unique_feasibility_sent); ae+=n0(r.feasibility_passed); ad+=n0(r.total_feasibility_sent); ag+=n0(r.reworks);
    conv2+=n0(r.converted_count);
    botA+=n0(r.bottomline_actual); botT+=n0(r.bottomline_shb);
    topA+=n0(r.topline_actual); topT+=n0(r.topline_shb);
    convA+=n0(r.conversion_actual); convT+=n0(r.conversion_shb);
    leadsSHB+=n0(r.leads_shb);
  });

  let mishAct = mishD>0?mish/mishD:null;
  if (allDaily.length > 0) {
    const dm: Record<string,any> = {};
    allDaily.forEach((r:any) => {
       const iso = r.activity_date;
       if (!dm[iso]) dm[iso] = {mish:0, open:0};
       dm[iso].mish += +r.mishandled_count;
       dm[iso].open += +r.open_leads_count;
    });
    const days = Object.values(dm).map((d:any) => d.open > 0 ? (d.mish / d.open) : null).filter(v => v !== null) as number[];
    if (days.length > 0) mishAct = median(days);
  }

  const c15Act = (c15D>0?c15/c15D:null);
  const prioA=c15D>0?prio/c15D:null;
  const talkAct=talkD>0?talkN/talkD:null, flagAct=includeFlag&&sellers>0?rw/sellers:null;
  const quotedA=z>0?aa/z:null, qFeasA=aa>0?ac/aa:null, passA=ad>0?ae/ad:null, quoteConvA=ae>0?conv2/ae:null, reworkA=ad>0?ag/ad:null;
  const botAch=botT>0?botA/botT:null, topAch=topT>0?topA/topT:null;
  const convPT=leadsSHB>0?convT/leadsSHB:null, convPA=c15D>0?convA/c15D:null, convPAch=(convPA!==null&&convPT&&convPT>0)?convPA/convPT:null;
  const mAct=topA>0?botA/topA:null, mTgt=topT>0?botT/topT:null, marginAch=(mAct!==null&&mTgt&&mTgt>0)?mAct/mTgt:null;
  const sc:Record<string,number|null>={
    mishandled:scLo(mishAct,BENCH.mishandled), called15:scHi(c15Act,BENCH.called15), priority:scHi(prioA,BENCH.priority), talk:scHi(talkAct,BENCH.talk),
    flag:includeFlag?scLo(flagAct,BENCH.flag):null, quoted:scHi(quotedA,BENCH.quoted), quoteFeas:scHi(qFeasA,BENCH.quoteFeas),
    pass:scHi(passA,BENCH.pass), quoteConv:scHi(quoteConvA,BENCH.quoteConv), rework:scLo(reworkA,BENCH.rework),
    bottomline:scHi(botAch,1), topline:scHi(topAch,1), conversionPct:scHi(convPAch,1), margin:scHi(marginAch,1)
  };
  const ch:any[]=[];
  function push(subj:string,key:string,label:string,formula:string,detail:string,target:string,weight:number,mark:number|null){
    ch.push({subject:subj,key,label,formula,detail,target,weight:Math.round(weight*100),mark:r1(mark),grade:grd(mark)});
  }
  push('Input metrics','mishandled','Mishandled leads','mishandled / total leads',mishAct===null?'No data':pF(mishAct)+' mishandled','below 15%',CHW.input.mishandled,sc.mishandled);
  push('Input metrics','called15','Call within 15 min','called in 15 min / total leads',c15Act===null?'No data':pF(c15Act)+' of leads called within 15 min','90%',CHW.input.called15,sc.called15);
  push('Input metrics','priority','Priority leads created','priority leads / total leads',prioA===null?'No data':pF(prioA)+' of leads are priority','20%',CHW.input.priority,sc.priority);
  push('Input metrics','talk','First call talk time','call-weighted median / 8 min',talkAct===null?'No data':talkAct.toFixed(1)+' min median','8 min or more',CHW.input.talk,sc.talk);
  push('Quotations','quoted','Unique leads quoted','unique quoted / unique leads',quotedA===null?'No data':pF(quotedA)+' of leads quoted','50%',CHW.quotations.quoted,sc.quoted);
  push('Quotations','quoteFeas','Quote to feasibility','sent to feasibility / quoted leads',qFeasA===null?'No data':pF(qFeasA)+' of quoted leads sent to feasibility','30%',CHW.quotations.quoteFeas,sc.quoteFeas);
  push('Quotations','pass','Feasibility pass','passed / total sent to feasibility',passA===null?'No data':pF(passA)+' passed','90%',CHW.quotations.pass,sc.pass);
  push('Quotations','quoteConv','Quote to conversion','converted / quotations passed',quoteConvA===null?'No data':pF(quoteConvA)+' of passed quotes converted','80%',CHW.quotations.quoteConv,sc.quoteConv);
  push('Quotations','rework','Rework rate','total reworks / total sent to feasibility',reworkA===null?'No data':reworkA.toFixed(1)+' reworks per feasibility','2 or fewer',CHW.quotations.rework,sc.rework);
  push('Output metrics','bottomline','Bottomline (profit)','actual profit / target profit',botT>0?mF(botA)+' of '+mF(botT)+' target ('+pF(botAch)+')':'No data','100% of goal',CHW.output.bottomline,sc.bottomline);
  push('Output metrics','topline','Topline (booking value)','actual booking / target booking',topT>0?mF(topA)+' of '+mF(topT)+' target ('+pF(topAch)+')':'No data','100% of goal',CHW.output.topline,sc.topline);
  push('Output metrics','conversionPct','Conversion %','',(convPA!==null&&convPT!==null)?pF(convPA)+' actual vs '+pF(convPT)+' target  -  '+iF(convA)+' of '+iF(convT)+' conversions':'No data','100% of goal',CHW.output.conversionPct,sc.conversionPct);
  push('Output metrics','margin','Margin %','actual margin vs target margin',(mAct!==null&&mTgt!==null)?pF(mAct)+' actual vs '+pF(mTgt)+' target':'No data','meet guardrail',CHW.output.margin,sc.margin);
  if(includeFlag) push('Output metrics','flag','Seller flags','(red + white sellers) / total sellers',flagAct===null?'No data':pF(flagAct)+' red + white sellers ('+rw+' of '+sellers+')','below 12%',CHW.output.flag,sc.flag);
  const input=wAvg([[sc.mishandled,CHW.input.mishandled],[sc.called15,CHW.input.called15],[sc.talk,CHW.input.talk],[sc.priority,CHW.input.priority]]);
  const quotations=wAvg([[sc.quoted,CHW.quotations.quoted],[sc.quoteFeas,CHW.quotations.quoteFeas],[sc.pass,CHW.quotations.pass],[sc.rework,CHW.quotations.rework],[sc.quoteConv,CHW.quotations.quoteConv]]);
  const outputPairs: [number|null, number][] = [
    [sc.bottomline, CHW.output.bottomline],
    [sc.topline, CHW.output.topline],
    [sc.conversionPct, CHW.output.conversionPct],
    [sc.margin, CHW.output.margin]
  ];
  if(includeFlag) outputPairs.push([sc.flag!, CHW.output.flag]);
  const output=wAvg(outputPairs);
  const agg=wAvg([[output,SW.output],[input,SW.input],[quotations,SW.quotations]]);
  return {subjects:{input:r1(input),quotations:r1(quotations),output:r1(output)},aggregate:r1(agg),grade:grd(agg),chapters:ch};
}

async function handleReportCard(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const cycle = u.searchParams.get('cycle')||'';
    const { data: cd } = await supabase.schema('seller_day_to_day').from('cycles').select('cycle').order('start_date',{ascending:false});
    const cycles = (cd||[]).map((c:any)=>c.cycle); 
    const sc = cycle||cycles[0]||'';

    const fromRaw = u.searchParams.get('from');
    const toRaw = u.searchParams.get('to');
    const from = (fromRaw && fromRaw !== 'null') ? fromRaw : null;
    const to = (toRaw && toRaw !== 'null') ? toRaw : null;

    const l1 = u.searchParams.get('l1');
    const l2 = u.searchParams.get('l2');
    const reg = u.searchParams.get('reg');
    const goal = u.searchParams.get('goal');
    const haul = u.searchParams.get('haul');

    let rows = await getRosterDataWithDeltas(from as any, to as any, sc as any, l1 as any, l2 as any);
    if (reg && reg !== 'all') rows = rows.filter((r: any) => r.region === reg);
    if (goal && goal !== 'all') rows = rows.filter((r: any) => r.goal_type === goal);
    if (haul && haul !== 'all') rows = rows.filter((r: any) => r.haul === haul);

    
    const l1M: Record<string,any> = {}, l2M: Record<string,any> = {}; const regs=new Set<string>();
    (rows||[]).forEach((r:any)=>{
      const reg=r.region||'';
      if(reg) regs.add(reg);
      const l1n=r.l1_manager_name||'', l1e=r.l1_manager_email||'', l2n=r.l2_manager_name||'', l2e=r.l2_manager_email||'';
      const l1k=(l1n||l1e).toLowerCase().trim(); if(l1k){ if(!l1M[l1k]) l1M[l1k]={key:l1k,name:l1n||l1e,l2:l2n,regions:new Set(),rows:[]}; l1M[l1k].regions.add(reg); l1M[l1k].rows.push(r); }
      const l2k=(l2n||l2e).toLowerCase().trim(); if(l2k){ if(!l2M[l2k]) l2M[l2k]={key:l2k,name:l2n||l2e,regions:new Set(),rows:[]}; l2M[l2k].regions.add(reg); l2M[l2k].rows.push(r); }
    });
    function sellerDetail(r:any){ const d=rcAggregate([r],false); const f=nN(r.flag); return {name:r.name||r.email||'',email:r.email||'',region:r.region||'',l1:r.l1_manager_name||'',flag:f,flagLabel:f?FL[f]||String(f):'',subjects:d.subjects,aggregate:d.aggregate,grade:d.grade,chapters:d.chapters}; }
    function build(g:any,isL1:boolean){ const agg=rcAggregate(g.rows,true); return {key:g.key,name:g.name,l2:isL1?g.l2:'',regions:[...g.regions].filter(Boolean) as string[],sellers:g.rows.length,subjects:agg.subjects,aggregate:agg.aggregate,grade:agg.grade,chapters:agg.chapters,sellerList:g.rows.map(sellerDetail).sort((a:any,b:any)=>(b.aggregate||0)-(a.aggregate||0))}; }
    const l1Cards = Object.values(l1M).map((g:any)=>build(g,true)).sort((a:any,b:any)=>(b.aggregate||0)-(a.aggregate||0));
    const l2Cards = Object.values(l2M).map((g:any)=>build(g,false)).sort((a:any,b:any)=>(b.aggregate||0)-(a.aggregate||0));
    return NextResponse.json({generated:new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),subjectWeights:SW,hasConviq:false,regions:[...regs].sort(),cycles,selectedCycle:sc,views:{'':{l1:l1Cards,l2:l2Cards}}});
  } catch(e:any) { return NextResponse.json({generated:'',subjectWeights:SW,hasConviq:false,regions:[],cycles:[],selectedCycle:'',views:{'':{l1:[],l2:[]}},error:e.message}); }
}

// ============================================================
// COMPARE REPORT — queries roster_daily_logs by date range
// Uses the LATEST snapshot row per seller within the range.
// Each daily log row is a cumulative snapshot, so the most recent
// date (e.g. 12 Jul) already has all accumulated actuals + SHBs.
// ============================================================
async function handleCompareReport(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const level = (u.searchParams.get('level') || 'l1') as string;
    const slotsRaw = u.searchParams.get('slots');
    
    // Fallbacks for cmpPopulateNames
    const from = u.searchParams.get('from') || '2026-07-09';
    const to = u.searchParams.get('to') || new Date().toISOString().split('T')[0];
    
    const l1f = u.searchParams.get('l1') || '';
    const l2f = u.searchParams.get('l2') || '';
    const goal = u.searchParams.get('goal') || '';
    const haul = u.searchParams.get('haul') || '';
    const reg = u.searchParams.get('reg') || '';

    let slots: {name:string, from:string, to:string}[] = [];
    if (slotsRaw) {
      try { slots = JSON.parse(slotsRaw); } catch(e) {}
    }

    if (slots.length === 0) {
      let rows = await getRosterDataWithDeltas(from, to, '', l1f, l2f);
      if (goal && goal !== 'all') rows = rows.filter((r: any) => r.goal_type === goal);
      if (haul && haul !== 'all') rows = rows.filter((r: any) => r.haul === haul);
      if (reg && reg !== 'all') rows = rows.filter((r: any) => r.region === reg);
      const managerKey = level === 'l1' ? 'l1_manager_name' : 'l2_manager_name';
      const allManagerNames: string[] = [...new Set((rows||[]).map((r: any) => r[managerKey]).filter(Boolean))].sort() as string[];
      return NextResponse.json({ success: true, results: [], meta: { allManagerNames } });
    }

    const results: any[] = [];
    await Promise.all(slots.map(async (slot) => {
      let rows = await getRosterDataWithDeltas(slot.from, slot.to, '', l1f, l2f);
      if (goal && goal !== 'all') rows = rows.filter((r: any) => r.goal_type === goal);
      if (haul && haul !== 'all') rows = rows.filter((r: any) => r.haul === haul);
      if (reg && reg !== 'all') rows = rows.filter((r: any) => r.region === reg);

      const managerKey = level === 'l1' ? 'l1_manager_name' : 'l2_manager_name';
      const sellers = (rows||[]).filter((r: any) => (r[managerKey] || '').toLowerCase() === slot.name.toLowerCase());
      if (!sellers.length) return;

      const regions = [...new Set(sellers.map((s: any) => s.region).filter(Boolean))];
      const latestDate = sellers.reduce((best: string, s: any) => s.log_date > best ? s.log_date : best, slot.from);
      const agg = rcAggregate(sellers, level === 'l1');
      results.push({
        name: slot.name, level, sellers: sellers.length, regions,
        dateRange: { from: slot.from, to: slot.to, snapshotDate: latestDate },
        subjects: agg.subjects, aggregate: agg.aggregate, grade: agg.grade, chapters: agg.chapters
      });
    }));

    results.sort((a, b) => (b.aggregate || 0) - (a.aggregate || 0));
    return NextResponse.json({ success: true, results, meta: {} });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, results: [], meta: {} });
  }
}


// ============================================================
// CONVIQ
// ============================================================
async function handleConvIQ() {
  try { return NextResponse.json({success:true,updatedAt:'',regions:{},sellers:{}}); } catch { return NextResponse.json({success:false,error:''}); }
}

// ============================================================
// CYCLES
// ============================================================
async function handleCycles() {
  try { const { data } = await supabase.schema('seller_day_to_day').from('cycles').select('*').order('start_date',{ascending:false}); const m: Record<string,{from:string;to:string}> = {}; (data||[]).forEach((c:any)=>{ m[c.cycle]={from:c.start_date,to:c.end_date}; }); return NextResponse.json(m); } catch { return NextResponse.json({}); }
}

// ============================================================
// USERS CRUD
// ============================================================
async function handleGetUsers() {
  try { const { data } = await supabase.from('app_users').select('email,name,role').order('created_at',{ascending:false}); return NextResponse.json(data||[]); } catch { return NextResponse.json([]); }
}
async function handleCreateUser(req: NextRequest) {
  try { const b=await req.json(); const { error } = await supabase.from('app_users').insert({email:b.email,name:b.name,role:b.role}); if(error){ if(error.code==='23505') return NextResponse.json({success:false,message:'User already exists'}); throw error; } return NextResponse.json({success:true}); } catch(e:any) { return NextResponse.json({success:false,message:e.message}); }
}
async function handleUpdateUser(req: NextRequest) {
  try { const b=await req.json(); const email=new URL(req.url).searchParams.get('email')||''; const up:Record<string,any>={}; if(b.name!==undefined) up.name=b.name; if(b.role!==undefined) up.role=b.role; await supabase.from('app_users').update(up).ilike('email',email); return NextResponse.json({success:true}); } catch(e:any) { return NextResponse.json({success:false,message:e.message}); }
}
async function handleDeleteUser(req: NextRequest) {
  try { const email=new URL(req.url).searchParams.get('email')||''; await supabase.from('app_users').delete().ilike('email',email); return NextResponse.json({success:true}); } catch(e:any) { return NextResponse.json({success:false,message:e.message}); }
}
