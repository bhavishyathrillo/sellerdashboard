
// ═══════════════ API HELPER ═══════════════
function api(action,params,method){
  method=method||'GET';var url='/api/kpi?action='+action;
  if(params){Object.keys(params).forEach(function(k){if(params[k]!==null&&params[k]!==undefined)url+='&'+k+'='+encodeURIComponent(params[k]);});}
  return fetch(url,{method:method,headers:{'Content-Type':'application/json'}}).then(function(r){return r.json();}).catch(function(e){console.warn('API error:',action,e.message);return null;});
}

// ═══════════════ STATE ═══════════════
var currentUser=null,dashData=null,allUsers=[],sortState={col:null,dir:'desc'},activeBoxFilter=null,_boxSellers=[],globalFilters={from:'',to:'',l1:'all',l2:'all',reg:'all',goal:'all',haul:'all'},rawCache={},mhlCache={},_rawCacheLatest=null,_adminSellerEmail=null,_selectedCycle=null,_adoptionData=null,_mhlData=null,_editEmail=null;
var FLAG_COLORS={'1 White':{bg:'rgba(232,232,232,0.15)',color:'#E0E0E0'},'2 Red':{bg:'rgba(255,71,87,0.2)',color:'#FF6B7A'},'3 Yellow':{bg:'rgba(255,183,3,0.2)',color:'#FFB703'},'4 Orange':{bg:'rgba(255,87,34,0.2)',color:'#FF7043'},'5 Green':{bg:'rgba(0,200,151,0.2)',color:'#00C897'},'6 Star':{bg:'rgba(255,215,0,0.2)',color:'#FFD700'}};

var _activePageId=null,RC_LEVEL='l1',RC_CYCLE=null,rcFilters={l1:'all',l2:'all',goal:'all',haul:'all'};
function loadState(){try{var s=sessionStorage.getItem('kpiState');if(s){var p=JSON.parse(s);if(p.f)Object.assign(globalFilters,p.f);if(p.c)_selectedCycle=p.c;if(p.r)RC_LEVEL=p.r;if(p.p)_activePageId=p.p;if(p.rf)Object.assign(rcFilters,p.rf);if(p.rc)RC_CYCLE=p.rc;}}catch(e){}}
function saveState(){try{sessionStorage.setItem('kpiState',JSON.stringify({f:globalFilters,c:_selectedCycle,r:RC_LEVEL,p:_activePageId,rf:rcFilters,rc:RC_CYCLE}));}catch(e){}}

// ═══════════════ INIT ═══════════════
window.onload=function(){
  var ds=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  document.querySelectorAll('[id^="date-badge-"]').forEach(function(el){el.textContent=ds;});
  try{var raw=window.parent.document.querySelector('[data-kpi-user]');if(raw&&raw.dataset.email){currentUser={email:raw.dataset.email,name:raw.dataset.name||raw.dataset.email.split('@')[0],role:raw.dataset.role||'Seller'};document.getElementById('loading-screen').style.display='none';showApp();return;}}catch(e){}
  currentUser={email:'admin@thrillophilia.com',name:'Admin',role:'Admin'};document.getElementById('loading-screen').style.display='none';showApp();
};
function showApp(){
  loadState();
  document.getElementById('app').classList.add('visible');
  document.getElementById('sidebar-name').textContent=currentUser.name;
  document.getElementById('sidebar-role').textContent=currentUser.role;
  document.getElementById('sidebar-avatar').textContent=currentUser.name.charAt(0).toUpperCase();
  // ── Role-based scoping: lock filters to user's own team ──
  if(currentUser.role==='L1 Manager'){
    globalFilters.l1=currentUser.name;
  } else if(currentUser.role==='L2 Manager'||currentUser.role==='Category Manager'){
    globalFilters.l2=currentUser.name;
  }
  buildSidebar();
  loadDashboard();
}

// ═══════════════ SIDEBAR ═══════════════
function buildSidebar(){var role=currentUser.role,nav=document.getElementById('sidebar-nav');var pages=[];if(role==='Seller')pages.push({id:'seller',icon:'📊',label:'My Dashboard'});if(role==='L1 Manager'){pages.push({id:'report',icon:'📋',label:'Report Card'});pages.push({id:'l1',icon:'👥',label:'L1 View'});}if(role==='L2 Manager'){pages.push({id:'report',icon:'📋',label:'Report Card'});pages.push({id:'l2',icon:'🏢',label:'Division View'});pages.push({id:'l1',icon:'👥',label:'L1 View'});}if(role==='Admin'||role==='Management'){pages.push({id:'overview',icon:'🌐',label:'Overview'});pages.push({id:'report',icon:'📋',label:'Report Card'});pages.push({id:'l2',icon:'🏢',label:'L2 View'});pages.push({id:'l1',icon:'👥',label:'L1 View'});pages.push({id:'seller',icon:'📊',label:'Seller View'});}nav.innerHTML='';pages.forEach(function(p){var d=document.createElement('div');d.className='nav-item';d.dataset.id=p.id;d.innerHTML='<span class="nav-icon">'+p.icon+'</span><span>'+p.label+'</span>';d.onclick=function(){switchPage(p.id);};nav.appendChild(d);});if(pages.length>0){var def=_activePageId||pages[0].id;var valid=pages.find(function(x){return x.id===def;});switchPage(valid?def:pages[0].id);}}
function switchPage(id){_activePageId=id;saveState();document.querySelectorAll('.nav-item').forEach(function(e){e.classList.remove('active');});document.querySelectorAll('.page').forEach(function(e){e.classList.remove('active');});var ni=document.querySelector('.nav-item[data-id="'+id+'"]');if(ni)ni.classList.add('active');var pg=document.getElementById('page-'+id);if(pg)pg.classList.add('active');if(id==='report')rcLoadReportCard();}

// ═══════════════ FORMATTERS ═══════════════
function fmtGoal(v){if(v==null)return'--';if(v>=10000000)return'Rs.'+(v/10000000).toFixed(2)+'Cr';if(v>=100000)return'Rs.'+(v/100000).toFixed(1)+'L';if(v>0)return'Rs.'+Number(v).toLocaleString('en-IN',{maximumFractionDigits:0});return'Rs.0';}
function fmtTime(v){if(v==null||v<=0)return'--';if(v<60)return Math.round(v)+' min';return Math.floor(v/60)+'h '+(Math.round(v%60)>0?Math.round(v%60)+'m':'');}
function fmtW15(v){return v!=null?v.toFixed(1)+'%':'--';}
function median(arr){var a=arr.filter(function(v){return v!=null&&!isNaN(v);}).sort(function(a,b){return a-b;});if(!a.length)return null;var m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function sum(arr){return arr.filter(function(v){return v!=null&&!isNaN(v)&&v>0;}).reduce(function(a,b){return a+b;},0);}
function pBar(actual,shb,lowerBetter){if(actual==null||shb==null||shb===0)return{pct:0,cls:'amber'};var pct=lowerBetter?(actual<=shb?100:Math.min(Math.round(shb/actual*100),100)):Math.min(Math.round(actual/shb*100),100);return{pct:pct,cls:pct>=90?'green':pct>=70?'amber':'red'};}
function isRedWhiteFlag(s){var f=String((s&&s.flag)||'').toLowerCase();return f.indexOf('red')>=0||f.indexOf('white')>=0;}

// ═══════════════ DASHBOARD ═══════════════
function loadDashboard(){api('dashboard').then(function(data){if(!data||data.error)return;dashData=data;_initCycle();renderAllViews();}).catch(function(err){console.error(err);});}
function renderAllViews(){if(!dashData)return;_initCycle();renderSellerView();renderL1View();renderL2View();renderOverviewView();}

// ═══════════════ CYCLE ═══════════════
function _initCycle(){var cycles=(dashData&&dashData.cycles)||[];if(!cycles.length){_selectedCycle=null;return;}if(!_selectedCycle||cycles.indexOf(_selectedCycle)<0){_selectedCycle=(dashData.latestCycle&&cycles.indexOf(dashData.latestCycle)>=0)?dashData.latestCycle:cycles[0];_applyCycleDates();}}
function _cycleRange(cy){var cr=(dashData&&dashData.cycleRanges)||{};return cr[cy]||null;}
function _applyCycleDates(){var r=_cycleRange(_selectedCycle);globalFilters.from=r?r.from:'';globalFilters.to=r?r.to:'';rawCache={};mhlCache={};}
function cycleSellers(){var all=(dashData&&dashData.sellers)||[];if(!_selectedCycle)return all;return all.filter(function(s){return String(s.cycle||'')===_selectedCycle;});}
function onCycleChange(cy){_selectedCycle=cy;saveState();_applyCycleDates();activeBoxFilter=null;RC_DATA=null;renderAllViews();}
function buildCycleUI(){var cycles=(dashData&&dashData.cycles)||[];if(!cycles.length)return'';return'<select class="filter-select" style="font-weight:600;color:#FF5200" onchange="onCycleChange(this.value)">'+cycles.map(function(c){return'<option value="'+c+'"'+(c===_selectedCycle?' selected':'')+'>'+c+'</option>';}).join('')+'</select>';}

// ═══════════════ DATE FILTER ═══════════════
function buildDateUI(view){var df=globalFilters;var r=_cycleRange(_selectedCycle);var mm=r?(' min="'+r.from+'" max="'+r.to+'"'):'';var fv=df.from||(view==='rc'?'2026-07-09':'');var tv=df.to||(view==='rc'?new Date().toISOString().split('T')[0]:'');return'<div class="date-range-wrap"><span class="date-range-label">From</span><input type="date" class="date-input" id="'+view+'-from" value="'+fv+'"'+mm+' onchange="onDateChange(\''+view+'\')"><span class="date-sep">→</span><span class="date-range-label">To</span><input type="date" class="date-input" id="'+view+'-to" value="'+tv+'"'+mm+' onchange="onDateChange(\''+view+'\')"><button class="date-clear" onclick="clearDate(\''+view+'\')">✕</button></div>'+((df.from||df.to)?'<span class="date-active-badge">📅 filtered</span>':'');}
function onDateChange(view){var f=document.getElementById(view+'-from'),t=document.getElementById(view+'-to');if(!f||!t)return;globalFilters.from=f.value;globalFilters.to=t.value;saveState();rawCache={};mhlCache={};RC_DATA=null;renderAllViews();if(view==='rc'||document.getElementById('page-report').style.display==='block'){RC_DATA=null;rcLoadReportCard();}}
function clearDate(view){var r=_cycleRange(_selectedCycle);globalFilters.from=r?r.from:'';globalFilters.to=r?r.to:'';saveState();rawCache={};mhlCache={};RC_DATA=null;renderAllViews();if(view==='rc'||document.getElementById('page-report').style.display==='block'){RC_DATA=null;rcLoadReportCard();}}

// ═══════════════ RAW & MHL FETCH ═══════════════
function fetchRaw(sellers,view,cb){var emails=sellers.map(function(s){return s.email;});var df=globalFilters;var key=emails.slice().sort().join('|')+'||'+(df.from||'')+'|'+(df.to||'');if(rawCache[key]){cb(rawCache[key]);return;}api('raw',{emails:emails.join(','),from:df.from||null,to:df.to||null},'POST').then(function(res){if(res&&res.success)rawCache[key]=res;cb(res||{});}).catch(function(){cb({});});}
function fetchMHL(sellers,view,cb){var emails=sellers.map(function(s){return s.email;});var df=globalFilters;var key='mhl|'+emails.slice().sort().join('|')+'||'+(df.from||'')+'|'+(df.to||'');if(mhlCache[key]){cb(mhlCache[key]);return;}api('mhl',{emails:emails.join(','),from:df.from||null,to:df.to||null},'POST').then(function(res){if(res&&res.success)mhlCache[key]=res;cb(res||{});}).catch(function(){cb({});});}

// ═══════════════ MHL POPUP ═══════════════
function showMHLPopup(){if(!_mhlData||!_mhlData.dailySummary||!_mhlData.dailySummary.length){document.getElementById('flag-modal-title').textContent='📋 MHE Logs';document.getElementById('flag-modal-sub').textContent='No data';document.getElementById('flag-modal-body').innerHTML='<div class="empty-state">No MHE records.</div>';document.getElementById('flag-modal').classList.add('open');return;}var rows=_mhlData.dailySummary.map(function(r){var pct=r.mhePct;var color=(pct!=null&&pct<15)?'#34C759':'#FF3B30';return'<tr><td style="font-weight:600">'+r.date+'</td><td style="text-align:right">'+r.mishandled+'</td><td style="text-align:right">'+r.openLeads+'</td><td style="text-align:right;color:'+color+';font-weight:700">'+(pct!=null?pct.toFixed(2)+'%':'--')+'</td></tr>';}).join('');var med=_mhlData.overallMedian;document.getElementById('flag-modal-title').textContent='📋 MHE — Date-wise Summary';document.getElementById('flag-modal-sub').textContent=_mhlData.dailySummary.length+' dates · Median: '+(med!=null?med.toFixed(2)+'%':'--');document.getElementById('flag-modal-body').innerHTML='<div class="table-scroll"><table style="min-width:400px"><thead><tr><th>Date</th><th style="text-align:right">Mishandled</th><th style="text-align:right">Open Leads</th><th style="text-align:right">MHE %</th></tr></thead><tbody>'+rows+'</tbody></table></div>';document.getElementById('flag-modal').classList.add('open');}
function showSellerMHEPopup(email,name){if(!_mhlData||!_mhlData.sellerMetrics){showMHLPopup();return;}var sm=_mhlData.sellerMetrics[email.toLowerCase()];if(!sm||!sm.dailyRows||!sm.dailyRows.length){document.getElementById('flag-modal-title').textContent='MHE — '+name;document.getElementById('flag-modal-sub').textContent='No records';document.getElementById('flag-modal-body').innerHTML='<div class="empty-state">No records for '+name+'.</div>';document.getElementById('flag-modal').classList.add('open');return;}var rows=sm.dailyRows.map(function(r){var pct=r.mhePct;var color=(pct!=null&&pct<15)?'#34C759':'#FF3B30';return'<tr><td style="font-weight:600">'+r.date+'</td><td style="text-align:right">'+r.mishandled+'</td><td style="text-align:right">'+r.openLeads+'</td><td style="text-align:right;color:'+color+';font-weight:700">'+(pct!=null?pct.toFixed(2)+'%':'--')+'</td></tr>';}).join('');document.getElementById('flag-modal-title').textContent='📋 MHE — '+name;document.getElementById('flag-modal-sub').textContent=sm.dailyRows.length+' dates · Median: '+(sm.mheMedian!=null?sm.mheMedian.toFixed(2)+'%':'--');document.getElementById('flag-modal-body').innerHTML='<div class="table-scroll"><table style="min-width:400px"><thead><tr><th>Date</th><th style="text-align:right">Mishandled</th><th style="text-align:right">Open Leads</th><th style="text-align:right">MHE %</th></tr></thead><tbody>'+rows+'</tbody></table></div>';document.getElementById('flag-modal').classList.add('open');}

// ═══════════════ RAW POPUP ═══════════════
var _rawData=null,_rawTab='mhl',_rawEmail='';
function openRawPopup(email,name){_rawTab='mhl';_rawEmail=email;document.getElementById('raw-modal').classList.add('open');document.getElementById('raw-modal-title').textContent=name||email;document.getElementById('raw-modal-email').textContent=email;document.getElementById('raw-loading').style.display='block';document.getElementById('raw-mhl-content').style.display='none';document.getElementById('raw-call-content').style.display='none';document.getElementById('raw-tab-mhl').classList.add('active');document.getElementById('raw-tab-call').classList.remove('active');var df=globalFilters;api('seller-raw',{email:email,from:df.from||null,to:df.to||null}).then(function(res){_rawData=res;document.getElementById('raw-loading').style.display='none';if(!res||!res.success){document.getElementById('raw-mhl-content').innerHTML='<div class="empty-state">Error</div>';document.getElementById('raw-mhl-content').style.display='block';return;}renderRawTab('mhl');}).catch(function(){document.getElementById('raw-loading').style.display='none';});}
function closeRawModal(){document.getElementById('raw-modal').classList.remove('open');}
function switchRawTab(tab){_rawTab=tab;document.getElementById('raw-tab-mhl').classList.toggle('active',tab==='mhl');document.getElementById('raw-tab-call').classList.toggle('active',tab==='call');if(_rawData)renderRawTab(tab);}
function renderRawTab(tab){var el=document.getElementById('raw-'+tab+'-content');document.getElementById('raw-'+(tab==='mhl'?'call':'mhl')+'-content').style.display='none';el.style.display='block';var html='';if(tab==='mhl'){var data=_rawData.mhl;if(!data||!data.rows||!data.rows.length){html+='<div class="empty-state">No MHE daily records.</div>';}else{var hdrs=data.headers.filter(function(h){return h&&h.trim();});var body=data.rows.map(function(row){return'<tr>'+hdrs.map(function(h){return'<td>'+(row[h]!=null&&row[h]!==''?row[h]:'--')+'</td>';}).join('')+'</tr>';}).join('');html+='<div style="font-weight:600;font-size:14px;margin-bottom:8px;color:#F0EDE8">MHE Daily Records</div><table class="raw-table" style="margin-top:0"><thead><tr>'+hdrs.map(function(h){return'<th>'+h.toUpperCase().replace(/_/g,' ')+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table>';}var leads=(data&&data.leads)?data.leads:[];html+='<div style="font-weight:600;font-size:14px;margin-top:24px;margin-bottom:8px;color:#F0EDE8">Mishandled Leads</div>';if(!leads.length){html+='<div class="empty-state" style="margin-top:0">No leads records.</div>';}else{var lHdrs=Object.keys(leads[0]);var lBody=leads.map(function(row){return'<tr>'+lHdrs.map(function(h){var v=row[h];if(v!=null&&v!==''){if(h==='ENQUIRY_LINK'){v='<a href="https://admin.thrillophilia.com/admin/1/enquiries?code='+v+'" target="_blank" style="color:#007AFF;text-decoration:none;font-weight:500">🔗 Lead</a>';}}return'<td>'+(v!=null&&v!==''?v:'--')+'</td>';}).join('')+'</tr>';}).join('');html+='<table class="raw-table" style="margin-top:0"><thead><tr>'+lHdrs.map(function(h){return'<th>'+h.toUpperCase().replace(/_/g,' ')+'</th>';}).join('')+'</tr></thead><tbody>'+lBody+'</tbody></table>';}}else{var data=_rawData.call;if(!data||!data.rows||!data.rows.length){el.innerHTML='<div class="empty-state">No records.</div>';return;}var hdrs=data.headers.filter(function(h){return h&&h.trim();});var body=data.rows.map(function(row){return'<tr>'+hdrs.map(function(h){var v=row[h];if(v!=null&&v!==''){if(h==='LEAD_LINK'){v='<a href="https://admin.thrillophilia.com/admin/1/enquiries?code='+v+'" target="_blank" style="color:#007AFF;text-decoration:none;font-weight:500">🔗 '+v+'</a>';}else if(h==='FIRST_CONNECTED_CALL_RECORDING'&&v.indexOf('http')===0){v='<a href="'+v+'" target="_blank" style="color:#007AFF;text-decoration:none;font-weight:500">▶ Play</a>';}else if((h.indexOf('TIME')>=0||h.indexOf('DATE')>=0)&&typeof v==='string'&&v.length>15){try{var d=new Date(v);if(!isNaN(d.getTime())){var dd=String(d.getDate()).padStart(2,'0');var mm=String(d.getMonth()+1).padStart(2,'0');var yy=d.getFullYear();var hh=String(d.getHours()).padStart(2,'0');var min=String(d.getMinutes()).padStart(2,'0');v=dd+'/'+mm+'/'+yy+' '+hh+':'+min;}}catch(e){}}}return'<td>'+(v!=null&&v!==''?v:'--')+'</td>';}).join('')+'</tr>';}).join('');html='<table class="raw-table"><thead><tr>'+hdrs.map(function(h){return'<th>'+h.replace(/_/g,' ')+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table>';}el.innerHTML=html;}

// ═══════════════ SUMMARY BOXES ═══════════════
function buildSummaryBoxes(sellers,view,tableId,raw,mhlRaw){if(!sellers||!sellers.length)return'';var MHL_SHB=15;var medMHEact=null;var mhlLoading=!mhlRaw;if(mhlRaw&&mhlRaw.success&&mhlRaw.overallMedian!=null)medMHEact=mhlRaw.overallMedian;var sumBLshb=sum(sellers.map(function(s){return s.blSHB;}));var sumBLact=sum(sellers.map(function(s){return s.blActual;}));var sumTLshb=sum(sellers.map(function(s){return s.tlSHB;}));var sumTLact=sum(sellers.map(function(s){return s.tlActual;}));var medTalkSHB=median(sellers.map(function(s){return s.talkSHB;}).filter(function(v){return v>0;}));var medSLAshb=median(sellers.map(function(s){return s.slaSHB;}).filter(function(v){return v>0;}));var flagSellers=sellers.filter(isRedWhiteFlag);var flagActual=sellers.length?Math.round(flagSellers.length/sellers.length*100):0;var flagBar=pBar(flagActual,12,true);var medTalkAct=null,medW15Act=null,loading=!raw;if(raw&&raw.sellerMetrics){var tv=[],wIn=0,wTot=0;sellers.forEach(function(s){var sm=raw.sellerMetrics[s.email.toLowerCase()];if(sm){if(sm.talkMedian!=null)tv.push(sm.talkMedian);if(sm.w15Within!=null)wIn+=sm.w15Within;if(sm.w15Total!=null)wTot+=sm.w15Total;}});medTalkAct=median(tv);medW15Act=wTot>0?parseFloat((wIn/wTot*100).toFixed(1)):null;}var df=globalFilters,dn=(df.from||df.to)?'📅':'';function spin(){return'<span class="spinner-sm"></span>';}function box(key,icon,title,shbV,actV,shbR,actR,lb,note,load){var pb=load?{pct:0,cls:'amber'}:pBar(actR,shbR,lb);var sc=pb.cls==='green'?'#34C759':pb.cls==='red'?'#FF3B30':'#FF9500';return'<div class="summary-box" id="msb-'+key+'" onclick="toggleBoxFilter(\''+key+'\',\''+(tableId||'')+'\')"><div class="sb-header"><span class="sb-icon">'+icon+'</span><span class="sb-title">'+title+(note?'<span style="font-size:9px;color:#007AFF;margin-left:3px">'+note+'</span>':'')+'</span>'+(!load?'<span class="sb-pct" style="color:'+sc+'">'+pb.pct+'%</span>':'')+'</div><div class="sb-values"><div class="sb-val"><div class="sb-val-label">SHB</div><div class="sb-val-num" style="color:#CC7700">'+shbV+'</div></div><div class="sb-divider"></div><div class="sb-val"><div class="sb-val-label">Actual</div><div class="sb-val-num">'+(load?spin():actV)+'</div></div></div><div class="sb-bar-wrap"><div class="sb-bar '+pb.cls+'" style="width:'+pb.pct+'%"></div></div><div class="sb-footer"><span style="color:'+sc+'">'+(load?'Loading...':(pb.pct>=90?'✓ On Track':pb.pct>=70?'⚠ At Risk':'✗ Behind'))+'</span>'+(!load?'<span style="font-size:9px;color:#8E8E93">Click to filter ▼</span>':'')+'</div></div>';}var mheBox=(view==='l1'||view==='l2'||view==='overview')?'<div class="summary-box" id="msb-mhe" onclick="toggleBoxFilter(\'mhe\',\''+(tableId||'')+'\')"><div class="sb-header"><span class="sb-icon">📋</span><span class="sb-title">MHE %<span style="font-size:9px;color:#007AFF;margin-left:3px">'+dn+'</span></span>'+(!mhlLoading&&medMHEact!=null?'<span class="sb-pct" style="color:'+(medMHEact<15?'#34C759':'#FF3B30')+'">'+Math.round(medMHEact/15*100)+'%</span>':'')+'</div><div class="sb-values"><div class="sb-val"><div class="sb-val-label">SHB</div><div class="sb-val-num" style="color:#CC7700">'+MHL_SHB+'%</div></div><div class="sb-divider"></div><div class="sb-val"><div class="sb-val-label">Actual</div><div class="sb-val-num">'+(mhlLoading?spin():medMHEact!=null?medMHEact.toFixed(2)+'%':'--')+'</div></div></div><div class="sb-bar-wrap"><div class="sb-bar '+(medMHEact!=null&&medMHEact<15?'green':'red')+'" style="width:'+(medMHEact!=null?Math.min(medMHEact/15*100,100):0)+'%"></div></div><div class="sb-footer"><span style="color:'+(medMHEact!=null&&medMHEact<15?'#34C759':'#FF3B30')+'">'+(mhlLoading?'Loading...':medMHEact!=null&&medMHEact<15?'✓ On Track':'✗ Behind')+'</span>'+(!mhlLoading?'<span style="font-size:9px;color:#007AFF;cursor:pointer" onclick="event.stopPropagation();showMHLPopup()">View logs →</span>':'')+'</div></div>':'';var blBox=box('bl','🎯','Bottomline Goal',fmtGoal(sumBLshb),fmtGoal(sumBLact),sumBLshb,sumBLact,false);var tlBox=box('tl','📈','Topline Goal',fmtGoal(sumTLshb),fmtGoal(sumTLact),sumTLshb,sumTLact,false);var talkBox=box('talk','📞','Talk Time',fmtTime(medTalkSHB),medTalkAct!=null?fmtTime(medTalkAct):'--',medTalkSHB,medTalkAct,false,dn,loading);var slaBox=(view==='l1'||view==='overview')?box('sla','⏱','Call Within 15 Min',(medSLAshb!=null?medSLAshb+'%':'--'),medW15Act!=null?fmtW15(medW15Act):'--',medSLAshb,medW15Act,false,dn,loading):'';var flagBox=(view==='l2'||view==='overview')?'<div class="summary-box" id="msb-flag"><div class="sb-header"><span class="sb-icon">🚩</span><span class="sb-title">Seller Flag</span><span class="sb-pct" style="color:'+(flagBar.cls==='green'?'#34C759':flagBar.cls==='red'?'#FF3B30':'#FF9500')+'">'+flagBar.pct+'%</span></div><div class="sb-values"><div class="sb-val"><div class="sb-val-label">SHB</div><div class="sb-val-num" style="color:#CC7700">12%</div></div><div class="sb-divider"></div><div class="sb-val" onclick="showFlagPopup()" style="cursor:pointer"><div class="sb-val-label">Actual</div><div class="sb-val-num">'+flagActual+'% ('+flagSellers.length+')</div></div></div><div class="sb-bar-wrap"><div class="sb-bar '+flagBar.cls+'" style="width:'+flagBar.pct+'%"></div></div><div class="sb-footer"><span>'+flagSellers.length+' flagged</span><span style="font-size:9px;color:#8E8E93">Click Actual</span></div></div>':'';_boxSellers=sellers;if(view==='overview')return'<div class="summary-grid" style="grid-template-columns:repeat(3,1fr)">'+blBox+tlBox+flagBox+'</div><div class="summary-grid" style="grid-template-columns:repeat(3,1fr);margin-top:0">'+mheBox+talkBox+slaBox+'</div>';return'<div class="summary-grid" style="grid-template-columns:repeat('+(view==='l2'?6:5)+', 1fr)">'+mheBox+blBox+tlBox+talkBox+slaBox+flagBox+'</div>';}
function showFlagPopup(){var base=_boxSellers||[],sellers=base.filter(isRedWhiteFlag);var rows=sellers.map(function(s){var fl=String((s&&s.flag)||'');var isRed=fl.toLowerCase().indexOf('red')>=0;var isWhite=fl.toLowerCase().indexOf('white')>=0;var flabel=isRed?'Red':isWhite?'White':'--';var fbg=isRed?'rgba(180,35,24,0.15)':isWhite?'rgba(91,91,91,0.2)':'rgba(255,255,255,0.07)';var fclr=isRed?'#FF453A':isWhite?'#B0B0B0':'#8E8E93';var fbadge='<span style="display:inline-block;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700;background:'+fbg+';color:'+fclr+'">'+flabel+'</span>';return'<tr><td><strong>'+(s.name||'--')+'</strong></td><td>'+fbadge+'</td><td>'+(s.region||'--')+'</td><td>'+(s.l2Manager||'--')+'</td><td>'+fmtGoal(s.tlSHB)+'</td><td>'+fmtGoal(s.tlActual)+'</td><td>'+fmtGoal(s.blSHB)+'</td><td>'+fmtGoal(s.blActual)+'</td></tr>';}).join('');document.getElementById('flag-modal-title').textContent='Flag Details';document.getElementById('flag-modal-sub').textContent=sellers.length+' red/white flag sellers';document.getElementById('flag-modal-body').innerHTML=sellers.length?'<div class="table-scroll"><table><thead><tr><th>Name</th><th>Flag</th><th>Region</th><th>Manager</th><th>TL SHB</th><th>TL Actual</th><th>BL SHB</th><th>BL Actual</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="empty-state">No flagged sellers.</div>';document.getElementById('flag-modal').classList.add('open');}
function toggleBoxFilter(key,tableId) {
    document.querySelectorAll('.summary-box').forEach(function(b){
        b.style.border = '';
        b.style.boxShadow = '';
    });
    
    
      var bannerDiv = document.getElementById(tableId.replace('-table', '-filter-banner'));
      if(activeBoxFilter===key) {
          activeBoxFilter=null;
          if (bannerDiv) bannerDiv.innerHTML = '';
          reRenderTable(tableId,_boxSellers);
          return;
      }

    
    activeBoxFilter=key;
    var bx = document.getElementById('msb-'+key);
    if(bx) {
        bx.style.border = '1px solid #FF5200';
        bx.style.boxShadow = '0 0 10px rgba(255, 82, 0, 0.2)';
    }
    
    var filtered=_boxSellers;
    if(key==='bl') {
        filtered=_boxSellers.filter(function(s){return s.blActual!=null&&s.blActual<s.blSHB;});
    } else if(key==='tl') {
        filtered=_boxSellers.filter(function(s){return s.tlActual!=null&&s.tlActual<s.tlSHB;});
    } else if(key==='talk') {
        var r1=_rawCacheLatest;
        filtered=_boxSellers.filter(function(s){
            var sm=r1&&r1.sellerMetrics?r1.sellerMetrics[s.email.toLowerCase()]:null;
            var ta=sm?sm.talkMedian:null;
            return ta!=null&&ta<s.talkSHB;
        });
    } else if(key==='sla') {
        var r2=_rawCacheLatest;
        filtered=_boxSellers.filter(function(s){
            var sm=r2&&r2.sellerMetrics?r2.sellerMetrics[s.email.toLowerCase()]:null;
            var wa=sm?sm.w15Pct:null;
            var shb=s.slaSHB!=null?s.slaSHB:90;
            return wa!=null&&wa<shb;
        });
    } else if(key==='mhe') {
        var r3=_mhlData;
        filtered=_boxSellers.filter(function(s){
            var sm=r3&&r3.sellerMetrics?r3.sellerMetrics[s.email.toLowerCase()]:null;
            var mhe=sm?sm.mheMedian:null;
            return mhe!=null&&mhe>15;
        });
    }
    
    
      var bannerDiv = document.getElementById(tableId.replace('-table', '-filter-banner'));
      var metrics = { 'bl': 'Bottomline', 'tl': 'Topline', 'talk': 'Talk Time', 'sla': 'Call Within 15 Min', 'mhe': 'MHE' };
      var metricName = metrics[key] || key;
      if (bannerDiv) {
         bannerDiv.innerHTML = '<div style="background:#FFF0EB;border:1px solid rgba(255,82,0,0.2);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;"><div style="display:flex;align-items:center;gap:10px;"><div style="width:8px;height:8px;border-radius:50%;background:#FF5200;"></div><span style="font-size:13px;color:#F0EDE8;">Showing <strong>'+filtered.length+'</strong> sellers behind on <strong>'+metricName+'</strong></span></div><button onclick="toggleBoxFilter(\''+key+'\', \''+tableId+'\')" style="background:rgba(255,82,0,0.1);color:#FF5200;border:1px solid rgba(255,82,0,0.2);padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">✕ Clear</button></div>';
      }
      reRenderTable(tableId,filtered);

}
function reRenderTable(tid,sellers){var e=document.getElementById(tid);if(e)e.innerHTML=buildTable(sellers,null,_rawCacheLatest||null);}

// ═══════════════ KPI TABLE ═══════════════
function buildTable(sellers,view,raw){if(!sellers||!sellers.length)return'<div class="empty-state">No sellers match filters.</div>';var vw=view||'ov',df=globalFilters,loading=!raw;var dtag=(df.from||df.to)?'<span class="date-active-badge" style="margin-left:8px">📅 filtered</span>':'';var spin='<span class="spinner-sm"></span>';var rows=sellers.map(function(s){var blc=(s.blActual!=null&&s.blSHB!=null)?(s.blActual>=s.blSHB?'#34C759':'#FF3B30'):'#3C3C43';var tlc=(s.tlActual!=null&&s.tlSHB!=null)?(s.tlActual>=s.tlSHB?'#34C759':'#FF3B30'):'#3C3C43';var sm=raw&&raw.sellerMetrics?raw.sellerMetrics[s.email.toLowerCase()]:null;var ta=sm?sm.talkMedian:null,wa=sm?sm.w15Pct:null;var mheSm=(_mhlData&&_mhlData.sellerMetrics)?_mhlData.sellerMetrics[s.email.toLowerCase()]:null;var mheAct=mheSm?mheSm.mheMedian:null;var fc=FLAG_COLORS[s.flag]||null;var fcell=fc?'<span style="background:'+fc.bg+';color:'+fc.color+';padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700">'+s.flag+'</span>':'<span style="color:#8E8E93">--</span>';return'<tr><td><strong style="color:#F0EDE8">'+s.name+'</strong><br><span style="font-size:10px;color:#999">'+s.email+'</span></td><td style="font-size:11px;color:#8E8E93">'+(s.region||'--')+'</td><td style="font-size:11px;color:#8E8E93">'+(s.haul||'--')+'</td><td><span class="badge badge-'+(s.status==='Active'?'green':'red')+'">'+(s.status||'Active')+'</span></td><td>'+(s.goalType?'<span class="badge badge-'+(s.goalType==='Topline'?'blue':'gold')+'">'+s.goalType+'</span>':'--')+'</td><td style="color:#CC7700;font-weight:600">15%</td><td style="color:'+(mheAct!=null?(mheAct<15?'#34C759':'#FF3B30'):'#3C3C43')+';font-weight:600;cursor:pointer" onclick="showSellerMHEPopup(\''+s.email+'\',\''+s.name+'\')">'+(loading?spin:(mheAct!=null?mheAct.toFixed(2)+'%':'--'))+'</td><td style="color:#CC7700;font-weight:600">'+fmtGoal(s.blSHB)+'</td><td style="color:'+blc+';font-weight:600">'+fmtGoal(s.blActual)+'</td><td style="color:#CC7700;font-weight:600">'+fmtGoal(s.tlSHB)+'</td><td style="color:'+tlc+';font-weight:600">'+fmtGoal(s.tlActual)+'</td><td style="color:#CC7700;font-weight:600">'+fmtTime(s.talkSHB)+'</td><td style="font-weight:600">'+(loading?spin:(ta!=null?fmtTime(ta):'--'))+'</td><td style="color:#CC7700;font-weight:600">'+(s.slaSHB!=null?s.slaSHB+'%':'--')+'</td><td style="font-weight:600">'+(loading?spin:(wa!=null?fmtW15(wa):'--'))+'</td><td>'+fcell+'</td><td><button class="raw-btn" onclick="openRawPopup(\''+s.email+'\',\''+s.name+'\')">Raw</button></td></tr>';}).join('');return'<div class="data-table-wrap"><div class="table-header"><div><div class="table-title">Team KPI Details'+dtag+'</div><div class="table-sub">★ SHB=Target ✓ On Track ✗ Behind'+(loading?' <span class="spinner-sm"></span> Fetching...':'')+'</div></div><input class="search-input" placeholder="Search sellers..." oninput="filterTable(this,\'kpi-tbl-'+vw+'\')"></div><div class="table-scroll"><table id="kpi-tbl-'+vw+'"><thead><tr><th rowspan="2">Seller</th><th rowspan="2">Region</th><th rowspan="2">Haul</th><th rowspan="2">Status</th><th rowspan="2">Goal</th><th colspan="2" style="text-align:center;border-bottom:2px solid #FF5200;color:#FF5200">MHE</th><th colspan="2" style="text-align:center;border-bottom:2px solid #00A651;color:#00A651">Bottomline</th><th colspan="2" style="text-align:center;border-bottom:2px solid #0099CC;color:#0099CC">Topline</th><th colspan="2" style="text-align:center;border-bottom:2px solid #FF5200;color:#FF5200">Talk Time</th><th colspan="2" style="text-align:center;border-bottom:2px solid #0099CC;color:#0099CC">W15 Min</th><th rowspan="2">Flag</th><th rowspan="2">Raw</th></tr><tr><th style="color:#CC7700">SHB</th><th class="sort-th" onclick="sortTable(this)" data-col="mheActual">Actual ⇅</th><th style="color:#CC7700">SHB</th><th class="sort-th" onclick="sortTable(this)" data-col="blActual">Actual ⇅</th><th style="color:#CC7700">SHB</th><th class="sort-th" onclick="sortTable(this)" data-col="tlActual">Actual ⇅</th><th style="color:#CC7700">SHB</th><th>Actual</th><th style="color:#CC7700">SHB</th><th>Actual</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';}
function sortTable(th){var col=th.dataset.col;if(sortState.col===col){sortState.dir=sortState.dir==='desc'?'asc':'desc';}else{sortState.col=col;sortState.dir='desc';}}
function filterTable(input,tid){var q=input.value.toLowerCase(),t=document.getElementById(tid);if(!t)return;t.querySelectorAll('tbody tr').forEach(function(r){r.style.display=r.textContent.toLowerCase().includes(q)?'':'none';});}

// ═══════════════ VIEW RENDERS ═══════════════
function switchAdminSeller(email){_adminSellerEmail=email;rawCache={};mhlCache={};renderSellerView();}
function renderSellerView(){var el=document.getElementById('seller-content'),sellers=cycleSellers();var isAdmin=(currentUser.role==='Admin'||currentUser.role==='Management');var selectedEmail=_adminSellerEmail||currentUser.email;var me=sellers.find(function(s){return s.email.toLowerCase()===selectedEmail.toLowerCase();});if(!me&&isAdmin&&sellers.length>0){me=sellers[0];_adminSellerEmail=me.email;}if(!me){el.innerHTML='<div class="empty-state">Account not mapped. Contact Admin.</div>';return;}var gSHB=me.goalType==='Topline'?me.tlSHB:me.blSHB,gAct=me.goalType==='Topline'?me.tlActual:me.blActual;var pb=pBar(gAct,gSHB,false),sc=pb.cls==='green'?'#34C759':pb.cls==='red'?'#FF3B30':'#FF9500';var adminSel=isAdmin?'<div style="background:#FFF0EB;border:1px solid rgba(255,82,0,0.2);border-radius:12px;padding:10px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px"><span style="font-size:12px;font-weight:600;color:#FF5200">👁 Viewing as:</span><select class="filter-select" style="max-width:220px;background:#fff" onchange="switchAdminSeller(this.value)">'+sellers.map(function(s){return'<option value="'+s.email+'"'+(s.email.toLowerCase()===me.email.toLowerCase()?' selected':'')+'>'+s.name+' ('+s.email+')</option>';}).join('')+'</select></div>':'';el.innerHTML='<div class="seller-header"><div class="seller-avatar-lg">'+(me.name||'?').charAt(0).toUpperCase()+'</div><div style="flex:1"><div style="font-size:18px;font-weight:700">'+me.name+'</div><div style="font-size:12px;color:#8E8E93;margin-top:3px">'+me.email+' · <span class="badge badge-blue">'+(me.region||'N/A')+'</span> · <span class="badge badge-'+(me.status==='Active'?'green':'red')+'">'+(me.status||'Active')+'</span></div><div style="margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:12px"><span>L1: <strong>'+(me.l1Manager||'N/A')+'</strong></span><span>L2: <strong>'+(me.l2Manager||'N/A')+'</strong></span><span>Goal: <strong style="color:#FF5200">'+(me.goalType||'N/A')+'</strong></span><button class="raw-btn" onclick="openRawPopup(\''+me.email+'\',\''+me.name+'\')" style="margin-left:auto">View Lead Records</button></div></div></div>'+adminSel+'<div class="notice-banner" style="margin-bottom:16px"><div class="notice-dot"></div>'+(_selectedCycle?'<span class="badge badge-orange" style="margin-right:8px">'+_selectedCycle+'</span>':'')+'Filter by date:<div class="filter-wrap">'+buildCycleUI()+buildDateUI('seller')+'</div></div><div class="summary-grid"><div class="summary-box"><div class="sb-header"><span class="sb-icon">'+(me.goalType==='Topline'?'📈':'🎯')+'</span><span class="sb-title">'+(me.goalType||'Goal')+'</span><span class="sb-pct" style="color:'+sc+'">'+pb.pct+'%</span></div><div class="sb-values"><div class="sb-val"><div class="sb-val-label">SHB</div><div class="sb-val-num" style="color:#CC7700">'+fmtGoal(gSHB)+'</div></div><div class="sb-divider"></div><div class="sb-val"><div class="sb-val-label">Actual</div><div class="sb-val-num">'+fmtGoal(gAct)+'</div></div></div><div class="sb-bar-wrap"><div class="sb-bar '+pb.cls+'" style="width:'+pb.pct+'%"></div></div><div class="sb-footer"><span style="color:'+sc+'">'+(pb.pct>=90?'✓ On Track':pb.pct>=70?'⚠ At Risk':'✗ Behind')+'</span></div></div><div class="summary-box" id="seller-mhe-box"><div class="sb-header"><span class="sb-icon">📋</span><span class="sb-title">MHE % 📅</span><span id="seller-mhe-pct" class="sb-pct"></span></div><div class="sb-values"><div class="sb-val"><div class="sb-val-label">SHB</div><div class="sb-val-num" style="color:#CC7700">15%</div></div><div class="sb-divider"></div><div class="sb-val"><div class="sb-val-label">Actual</div><div class="sb-val-num" id="seller-mhe-actual"><span class="spinner-sm"></span></div></div></div><div class="sb-bar-wrap"><div class="sb-bar amber" id="seller-mhe-bar" style="width:0%"></div></div><div class="sb-footer" id="seller-mhe-footer"><span class="spinner-sm"></span> Loading...</div></div><div class="summary-box" id="seller-talk-box"><div class="sb-header"><span class="sb-icon">📞</span><span class="sb-title">Talk Time 📅</span><span id="seller-talk-pct" class="sb-pct"></span></div><div class="sb-values"><div class="sb-val"><div class="sb-val-label">SHB</div><div class="sb-val-num" style="color:#CC7700">'+fmtTime(me.talkSHB)+'</div></div><div class="sb-divider"></div><div class="sb-val"><div class="sb-val-label">Actual</div><div class="sb-val-num" id="seller-talk-actual"><span class="spinner-sm"></span></div></div></div><div class="sb-bar-wrap"><div class="sb-bar amber" id="seller-talk-bar" style="width:0%"></div></div><div class="sb-footer" id="seller-talk-footer"><span class="spinner-sm"></span> Loading...</div></div><div class="summary-box" id="seller-w15-box"><div class="sb-header"><span class="sb-icon">⏱</span><span class="sb-title">Call Within 15 Min 📅</span><span id="seller-w15-pct" class="sb-pct"></span></div><div class="sb-values"><div class="sb-val"><div class="sb-val-label">SHB</div><div class="sb-val-num" style="color:#CC7700">'+(me.slaSHB!=null?me.slaSHB+'%':'90%')+'</div></div><div class="sb-divider"></div><div class="sb-val"><div class="sb-val-label">Actual</div><div class="sb-val-num" id="seller-w15-actual"><span class="spinner-sm"></span></div></div></div><div class="sb-bar-wrap"><div class="sb-bar amber" id="seller-w15-bar" style="width:0%"></div></div><div class="sb-footer" id="seller-w15-footer"><span class="spinner-sm"></span> Loading...</div></div></div>';_loadSellerAllMetrics(me);}
function _loadSellerAllMetrics(me){fetchRaw([me.email],'seller',function(raw){var sm=raw&&raw.sellerMetrics?raw.sellerMetrics[me.email.toLowerCase()]:null;var ta=sm?sm.talkMedian:null;var tae=document.getElementById('seller-talk-actual'),tbe=document.getElementById('seller-talk-bar'),tfe=document.getElementById('seller-talk-footer'),tpe=document.getElementById('seller-talk-pct');if(tae){if(ta==null){tae.textContent='--';if(tfe)tfe.innerHTML='<span style="color:#8E8E93">No data</span>';}else{var pb2=pBar(ta,me.talkSHB,false);var sc2=pb2.cls==='green'?'#34C759':pb2.cls==='red'?'#FF3B30':'#FF9500';tae.textContent=fmtTime(ta);tae.style.color=sc2;if(tbe){tbe.style.width=pb2.pct+'%';tbe.className='sb-bar '+pb2.cls;}if(tfe)tfe.innerHTML='<span style="color:'+sc2+'">'+(pb2.pct>=90?'✓ On Track':pb2.pct>=70?'⚠ At Risk':'✗ Behind')+'</span>';if(tpe){tpe.textContent=pb2.pct+'%';tpe.style.color=sc2;}}}var wa=sm?sm.w15Pct:null;var wae=document.getElementById('seller-w15-actual'),wbe=document.getElementById('seller-w15-bar'),wfe=document.getElementById('seller-w15-footer'),wpe=document.getElementById('seller-w15-pct');var w15SHB=me.slaSHB!=null?me.slaSHB:90;if(wae){if(wa==null){wae.textContent='--';if(wfe)wfe.innerHTML='<span style="color:#8E8E93">No data</span>';}else{var pb3=pBar(wa,w15SHB,false);var sc3=pb3.cls==='green'?'#34C759':pb3.cls==='red'?'#FF3B30':'#FF9500';wae.textContent=wa.toFixed(1)+'%';wae.style.color=sc3;if(wbe){wbe.style.width=pb3.pct+'%';wbe.className='sb-bar '+pb3.cls;}if(wfe)wfe.innerHTML='<span style="color:'+sc3+'">'+(pb3.pct>=90?'✓ On Track':pb3.pct>=70?'⚠ At Risk':'✗ Behind')+'</span>';if(wpe){wpe.textContent=pb3.pct+'%';wpe.style.color=sc3;}}}});fetchMHL([me.email],'seller',function(mhlRaw){var sm=mhlRaw&&mhlRaw.sellerMetrics?mhlRaw.sellerMetrics[me.email.toLowerCase()]:null;var mheAct=sm?sm.mheMedian:null;var mae=document.getElementById('seller-mhe-actual'),mbe=document.getElementById('seller-mhe-bar'),mfe=document.getElementById('seller-mhe-footer'),mpe=document.getElementById('seller-mhe-pct');if(mae){if(mheAct==null){mae.textContent='--';if(mfe)mfe.innerHTML='<span style="color:#8E8E93">No data</span>';}else{var pb4=pBar(mheAct,15,true);var sc4=pb4.cls==='green'?'#34C759':pb4.cls==='red'?'#FF3B30':'#FF9500';mae.textContent=mheAct.toFixed(2)+'%';mae.style.color=sc4;if(mbe){mbe.style.width=pb4.pct+'%';mbe.className='sb-bar '+pb4.cls;}if(mfe){mfe.innerHTML='<span style="color:'+sc4+'">'+(pb4.pct>=90?'✓ On Track':pb4.pct>=70?'⚠ At Risk':'✗ Behind')+'</span>';var mfeLink=document.createElement('span');mfeLink.style.cssText='font-size:9px;color:#007AFF;cursor:pointer;margin-left:6px';mfeLink.textContent='View logs →';mfeLink.onclick=function(){showSellerMHEPopup(me.email,me.name);};mfe.appendChild(mfeLink);}if(mpe){mpe.textContent=pb4.pct+'%';mpe.style.color=sc4;}}}});}

function _buildViewHTML(allSellers,view){
  var sellers=getFilteredSellers();
  var scoped=allSellers;
  if(currentUser.role==='L1 Manager') scoped=scoped.filter(function(s){return s.l1Manager===currentUser.name;});
  else if(currentUser.role==='L2 Manager'||currentUser.role==='Category Manager') scoped=scoped.filter(function(s){return s.l2Manager===currentUser.name;});

  var l1s=[...new Set(scoped.map(function(s){return s.l1Manager;}).filter(Boolean))].sort();
  var l2s=[...new Set(scoped.map(function(s){return s.l2Manager;}).filter(Boolean))].sort();
  var regs=[...new Set(scoped.map(function(s){return s.region;}).filter(Boolean))].sort();
  var hauls=[...new Set(scoped.map(function(s){return s.haul;}).filter(Boolean))].sort();
  var goals=[...new Set(scoped.map(function(s){return s.goalType;}).filter(Boolean))].sort();

  function sel(id,label,list,globalKey){
    var val=globalFilters[globalKey]||'all';
    if(currentUser.role==='L1 Manager' && globalKey==='l1') return '<div class="badge badge-blue" style="margin-right:8px;padding:6px 12px;font-size:12px">'+currentUser.name+'</div>';
    if((currentUser.role==='L2 Manager'||currentUser.role==='Category Manager') && (globalKey==='l2'||globalKey==='l1')) {
      if(globalKey==='l2') return '<div class="badge badge-blue" style="margin-right:8px;padding:6px 12px;font-size:12px">'+currentUser.name+'</div>';
    }
    return'<select class="filter-select" id="'+id+'" onchange="onGlobalSelectChange(\''+globalKey+'\',this.value)"><option value="all">'+label+'</option>'+list.map(function(v){return'<option value="'+v+'"'+(v===val?' selected':'')+'>'+v+'</option>';}).join('')+'</select>';
  }

  var iBtn=(view==='l1'||view==='l2')?'<button onclick="document.getElementById(\'incentive-modal\').classList.add(\'open\')" style="padding:6px 12px;border-radius:7px;font-size:11px;font-weight:600;border:1px solid #C9A84C;background:rgba(255,183,3,.1);color:#C9A84C;cursor:pointer;white-space:nowrap">💰 Incentive Structure <span style="background:#FF3B30;color:#fff;font-size:9px;padding:1px 5px;border-radius:99px;margin-left:4px">NEW</span></button>':'';
  var filters='<div class="filter-wrap">'+buildCycleUI()+buildDateUI(view)+(view==='l2'||view==='overview'?sel(view+'-l2f','All L2',l2s,'l2'):'')+sel(view+'-l1f','All L1',l1s,'l1')+sel(view+'-regf','All Regions',regs,'reg')+sel(view+'-goalf','All Goal Types',goals,'goal')+sel(view+'-haulf','All Haul',hauls,'haul')+iBtn+'</div>';
  var notice='<div class="notice-banner"><div class="notice-dot"></div>'+(_selectedCycle?'<span class="badge badge-orange" style="margin-right:8px">'+_selectedCycle+'</span>':'')+'<strong>'+sellers.length+'</strong> sellers · <strong>'+l1s.length+'</strong> L1'+filters+'</div>';
  return notice+'<div id="'+view+'-boxes">'+buildSummaryBoxes(sellers,view,view+'-table',null)+'</div><div id="'+view+'-filter-banner"></div><div id="'+view+'-table">'+buildTable(sellers,view,null)+'</div>';
}
function onGlobalSelectChange(key,val){globalFilters[key]=val;saveState();renderAllViews();}
function renderL1View(){var cs=cycleSellers();var f=getFilteredSellers();document.getElementById('l1-content').innerHTML=_buildViewHTML(cs,'l1');_loadRaw(f,'l1');}
function renderL2View(){var cs=cycleSellers();var f=getFilteredSellers();document.getElementById('l2-content').innerHTML=_buildViewHTML(cs,'l2');_loadRaw(f,'l2');}
function renderOverviewView(){var cs=cycleSellers();var f=getFilteredSellers();document.getElementById('overview-content').innerHTML=_buildViewHTML(cs,'overview');_loadRaw(f,'overview');}
function _loadRaw(sellers,view){var _raw=null,_mhlR=null;function _tryRender(){if(_raw===null||_mhlR===null)return;_mhlData=_mhlR.success?_mhlR:null;var be=document.getElementById(view+'-boxes'),te=document.getElementById(view+'-table'),fb=document.getElementById(view+'-filter-banner');if(fb)fb.innerHTML='';if(be)be.innerHTML=buildSummaryBoxes(sellers,view,view+'-table',_raw.success?_raw:{},_mhlR.success?_mhlR:{});if(te)te.innerHTML=buildTable(sellers,view,_raw.success?_raw:{});}fetchRaw(sellers,view,function(raw){_raw=raw||{};if(raw&&raw.success)_rawCacheLatest=raw;_tryRender();});fetchMHL(sellers,view,function(mhlRaw){_mhlR=mhlRaw||{};_tryRender();});}
function getFilteredSellers(){
  var f=cycleSellers();
  // Role-based hard scope — cannot be overridden by filters
  if(currentUser.role==='L1 Manager') { f=f.filter(function(s){return s.l1Manager===currentUser.name;}); }
  else if(currentUser.role==='L2 Manager') { f=f.filter(function(s){return s.l2Manager===currentUser.name;}); }
  else {
    if(globalFilters.l2!=='all') f=f.filter(function(s){return s.l2Manager===globalFilters.l2;});
    if(globalFilters.l1!=='all') f=f.filter(function(s){return s.l1Manager===globalFilters.l1;});
  }
  if(globalFilters.reg!=='all') f=f.filter(function(s){return s.region===globalFilters.reg;});
  if(globalFilters.goal!=='all') f=f.filter(function(s){return s.goalType===globalFilters.goal;});
  if(globalFilters.haul!=='all') f=f.filter(function(s){return s.haul===globalFilters.haul;});
  return f;
}

// ═══════════════ REPORT CARD ═══════════════
var RC_DATA=null,RC_LEVEL='l1',RC_CUR=null,RC_RENDERED=[],RC_CYCLE=null;
var rcFilters={l1:'all',l2:'all',goal:'all',haul:'all'};
function rcSetLevel(l){RC_LEVEL=l;document.getElementById('rc-tabL1').classList.toggle('on',l==='l1');document.getElementById('rc-tabL2').classList.toggle('on',l==='l2');rcApplyFilters();}
function rcOnCycle(cy){RC_CYCLE=cy;RC_DATA=null;rcLoadReportCard();}
function rcOnRegion(){rcApplyFilters();}
function rcOnFilterChange(key,val){rcFilters[key]=val;RC_DATA=null;rcLoadReportCard();}
function rcPopulateFilters(data){
  var cs=cycleSellers();
  function opts(sel,items,cur){var el=document.getElementById(sel);if(!el)return;el.innerHTML='<option value="all">'+el.options[0].text+'</option>'+items.map(function(v){return'<option value="'+v+'"'+(v===cur?' selected':'')+'>'+v+'</option>';}).join('');}
  var l1s=[...new Set(cs.map(function(s){return s.l1Manager;}).filter(Boolean))].sort();
  var l2s=[...new Set(cs.map(function(s){return s.l2Manager;}).filter(Boolean))].sort();
  var goals=[...new Set(cs.map(function(s){return s.goalType;}).filter(Boolean))].sort();
  var hauls=[...new Set(cs.map(function(s){return s.haul;}).filter(Boolean))].sort();
  opts('rc-fL1',l1s,rcFilters.l1);
  opts('rc-fL2',l2s,rcFilters.l2);
  opts('rc-fGoal',goals,rcFilters.goal);
  opts('rc-fHaul',hauls,rcFilters.haul);
}

function rcApplyFilters(){
  if(!RC_DATA)return;
  var view=RC_DATA.views['']||{l1:[],l2:[]};
  var list=RC_LEVEL==='l1'?view.l1:view.l2;
  var selReg = document.getElementById('rc-fRegion').value;
  if(selReg) {
    list = list.filter(function(m){ return m.regions && m.regions.indexOf(selReg) > -1; });
  }
  var sortKey=document.getElementById('rc-fSort') ? document.getElementById('rc-fSort').value : 'overall';
  var sortedList = list.slice().sort(function(a,b){
    var va=sortKey==='overall'?a.aggregate:a.subjects[sortKey];
    var vb=sortKey==='overall'?b.aggregate:b.subjects[sortKey];
    return(vb||0)-(va||0);
  });
  RC_RENDERED=sortedList;
  var g=document.getElementById('rc-grid');
  var countEl=document.getElementById('rc-count');
  if(countEl) countEl.textContent=sortedList.length+' '+(RC_LEVEL==='l1'?'managers':'seniors');
  if(!sortedList.length){g.innerHTML='<div class="rc-state">No results.</div>';return;}
  g.innerHTML=sortedList.map(function(m,idx){
    var agg=m.aggregate||0;
    var ringColor=agg>=90?'#4ADE80':agg>=70?'#FB923C':'#F87171';
    var barColors={'output':'rgba(244,99,30,0.55)','input':'rgba(91,156,246,0.55)','quotations':'rgba(184,151,62,0.55)'};
    var labColors={'output':'#F4631E','input':'#5B9CF6','quotations':'#B8973E'};
    var labIcons={'output':'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>','input':'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>','quotations':'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'};
    return'<div class="rc-card" onclick="rcOpenDetail('+idx+')">'+
      '<div class="rc-head">'+
        '<div class="rc-score-ring" style="--rc-ring-color:'+ringColor+';--rc-pct:'+(Math.round(agg)*3.6)+'deg;background:rgba(255,255,255,0.04);color:var(--text-primary)">'+
          (m.aggregate!=null?Math.round(m.aggregate):'NR')+
        '</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:15px;font-weight:600;letter-spacing:-0.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary)">'+m.name+'</div>'+
          '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">'+(m.regions||[]).join(', ')+' &middot; '+m.sellers+' sellers</div>'+
          '<span class="rc-pill" style="background:rgba(255,255,255,0.06);color:var(--text-secondary);border:1px solid rgba(255,255,255,0.09)">'+m.grade+'</span>'+
        '</div>'+
      '</div>'+
      '<div class="rc-body">'+
        ['output','input','quotations'].map(function(k){
          var score=m.subjects[k]||0;
          return '<div class="rc-subrow">'+
            '<span class="rc-lab" style="display:flex;align-items:center;gap:5px;color:'+labColors[k]+';opacity:0.7">'+(labIcons[k]||'')+k+'</span>'+
            '<div class="rc-bar"><i style="width:'+score+'%;background:'+barColors[k]+'"></i></div>'+
            '<span class="rc-score-num" style="color:var(--text-primary)">'+(m.subjects[k]!=null?Math.round(m.subjects[k]):'–')+'</span>'+
          '</div>';
        }).join('')+
      '</div>'+
    '</div>';
  }).join('');
}




function rcOpenDetail(idx){
  var m=RC_RENDERED[idx];if(!m)return;RC_CUR=m;
  document.getElementById('rc-t1').textContent=m.name;
  document.getElementById('rc-s1').textContent=m.sellers+' sellers \u00b7 '+(m.regions||[]).join(', ');
  var subjectIcons={
    'Output metrics':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
    'Input metrics':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'Quotations':'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  };
  var subjectColors={'Output metrics':'#F4631E','Input metrics':'#5B9CF6','Quotations':'#B8973E'};
  var chaptersHtml='';
  ['Output metrics','Input metrics','Quotations'].forEach(function(sn){
    var key=sn==='Output metrics'?'output':sn==='Input metrics'?'input':'quotations';
    var score=m.subjects[key];
    var sc=subjectColors[sn];
    /* Status dot color — only used on tiny indicators */
    var dotColor=(score||0)>=90?'#4ADE80':(score||0)>=70?'#FB923C':'#F87171';
    chaptersHtml+=
      '<div class="rc-subj">'+
        '<div class="rc-sh">'+
          '<div style="display:flex;align-items:center;gap:10px">'+
            '<div style="width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;color:'+sc+';opacity:0.9">'+subjectIcons[sn]+'</div>'+
            '<div style="font-size:15px;font-weight:600;color:var(--text-primary)">'+sn+'</div>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:8px">'+
            '<div style="width:7px;height:7px;border-radius:50%;background:'+dotColor+'"></div>'+
            '<div style="font-size:20px;font-weight:700;color:var(--text-primary);letter-spacing:-0.5px">'+(score!=null?Math.round(score):'NR')+'</div>'+
          '</div>'+
        '</div>'+
        (m.chapters||[]).filter(function(c){return c.subject===sn;}).map(function(c){
          var mc=c.mark||0;
          /* Dot only — bar uses single muted color */
          var statusDot=mc>=90?'#4ADE80':mc>=70?'#FB923C':'#F87171';
          var barColor=mc>=90?'rgba(74,222,128,0.5)':mc>=70?'rgba(251,146,60,0.5)':'rgba(248,113,113,0.5)';
          var statusLabel=mc>=90?'On track':mc>=70?'At risk':'Behind';
          return '<div class="rc-chap">'+
            '<div style="flex:1;padding-right:20px">'+
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+
                '<div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">'+c.label+'</div>'+
                '<span style="font-size:10px;font-weight:500;color:var(--text-muted);background:rgba(255,255,255,0.04);padding:2px 7px;border-radius:5px;border:1px solid rgba(255,255,255,0.07)">'+c.weight+'%</span>'+
              '</div>'+
              '<div style="font-size:11.5px;color:var(--text-muted);line-height:1.55;margin-bottom:8px">'+c.detail+'<span style="margin:0 8px;opacity:0.2">·</span>Target: '+c.target+'</div>'+
              '<div style="height:3px;background:rgba(255,255,255,0.05);border-radius:99px;overflow:hidden">'+
                '<div style="width:'+mc+'%;height:100%;background:'+barColor+';border-radius:99px;transition:width 0.9s cubic-bezier(0.4,0,0.2,1)"></div>'+
              '</div>'+
            '</div>'+
            '<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:52px">'+
              '<div style="font-size:21px;font-weight:700;color:var(--text-primary);letter-spacing:-0.5px">'+(c.mark!=null?Math.round(c.mark):'NR')+'</div>'+
              '<div style="display:flex;align-items:center;gap:4px">'+
                '<div style="width:5px;height:5px;border-radius:50%;background:'+statusDot+'"></div>'+
                '<div style="font-size:10px;color:var(--text-muted)">'+statusLabel+'</div>'+
              '</div>'+
            '</div>'+
          '</div>';
        }).join('')+
      '</div>';
  });
  var agg=m.aggregate||0;
  var aggColor=agg>=90?'#4ADE80':agg>=70?'#FB923C':'#F87171';
  document.getElementById('rc-b1').innerHTML=
    '<div class="rc-hero" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:22px 24px;display:flex;align-items:center;gap:22px;margin-bottom:18px">'+
      '<div style="position:relative;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
        '<svg viewBox="0 0 36 36" style="position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)">'+
          '<circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5"></circle>'+
          '<circle cx="18" cy="18" r="15" fill="none" stroke="'+aggColor+'" stroke-width="2.5" stroke-dasharray="94.2" stroke-dashoffset="'+(94.2-(agg/100*94.2))+'" stroke-linecap="round" style="transition:stroke-dashoffset 1s ease-out"></circle>'+
        '</svg>'+
        '<div style="font-size:22px;font-weight:700;color:var(--text-primary);z-index:1">'+(m.aggregate!=null?Math.round(m.aggregate):'NR')+'</div>'+
      '</div>'+
      '<div style="flex:1">'+
        '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:5px;font-weight:600">Overall Performance</div>'+
        '<div style="font-size:28px;font-weight:700;color:var(--text-primary);letter-spacing:-0.5px">Grade <span style="color:'+aggColor+'">'+m.grade+'</span></div>'+
        '<div style="font-size:11.5px;color:var(--text-muted);margin-top:4px">'+(m.regions||[]).join(', ')+' &middot; '+m.sellers+' sellers</div>'+
      '</div>'+
    '</div>'+
    chaptersHtml+
    '<div class="rc-how" style="margin-top:4px">'+
      '<h4 style="display:flex;align-items:center;gap:7px">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'+
        'How scores are calculated'+
      '</h4>'+
      '<p><strong>Chapter score</strong> = Proximity to target (capped at 100).</p>'+
      '<p style="margin:0"><strong>Overall</strong> = Output &times; 70% + Input &times; 15% + Quotations &times; 15%.</p>'+
    '</div>'+
    '<button class="rc-sellersBtn" onclick="rcOpenSellers()">'+
      'View seller breakdown ('+m.sellers+') &rarr;'+
    '</button>';
  document.getElementById('rc-ov1').classList.add('rc-show');
  document.getElementById('rc-ov1').style.display='flex';
}

function rcOpenSellers(){var m=RC_CUR;if(!m)return;var rows=m.sellerList.map(function(s){var fs=s.flag?['#B8860B','#1F7A3D','#B5560E','#8A6D00','#B42318','#5b5b5b'][s.flag-1]||'#AEAEB2':'#AEAEB2';var fl=s.flag?['Star','Green','Orange','Yellow','Red','White'][s.flag-1]||'-':'-';return'<tr><td>'+s.name+'</td><td>'+s.region+'</td><td><span style="display:inline-flex;align-items:center;gap:6px;background:'+fs+'20;color:'+fs+';padding:3px 8px;border-radius:7px;font-size:12px"><span style="width:8px;height:8px;border-radius:50%;background:'+fs+';display:inline-block"></span>'+fl+'</span></td><td style="text-align:right">'+(s.subjects.output!=null?Math.round(s.subjects.output):'NR')+'</td><td style="text-align:right">'+(s.subjects.input!=null?Math.round(s.subjects.input):'NR')+'</td><td style="text-align:right">'+(s.subjects.quotations!=null?Math.round(s.subjects.quotations):'NR')+'</td><td style="text-align:right;font-weight:700">'+(s.aggregate!=null?Math.round(s.aggregate):'NR')+'</td><td>'+s.grade+'</td></tr>';}).join('');document.getElementById('rc-t2').textContent=m.name+' · sellers';document.getElementById('rc-b2').innerHTML='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th>Seller</th><th>Region</th><th>Flag</th><th style="text-align:right">Output</th><th style="text-align:right">Input</th><th style="text-align:right">Quot.</th><th style="text-align:right">Overall</th><th>Grade</th></tr></thead><tbody>'+rows+'</tbody></table>';document.getElementById('rc-ov2').classList.add('rc-show');document.getElementById('rc-ov2').style.display='flex';}
function rcClose1(){document.getElementById('rc-ov1').classList.remove('rc-show');document.getElementById('rc-ov1').style.display='none';}
function rcClose2(){document.getElementById('rc-ov2').classList.remove('rc-show');document.getElementById('rc-ov2').style.display='none';}
function rcLoadReportCard(){
  // Show compare button for admin only
  var cmpBtn=document.getElementById('rc-cmp-btn');
  if(cmpBtn){var role=currentUser&&currentUser.role;cmpBtn.style.display=(role&&role.toLowerCase()==='admin')?'':'none';}
  
  var dw = document.getElementById('rc-date-filter-wrap');
  if(dw) {
      dw.innerHTML = buildDateUI('rc');
  }

  if(RC_DATA){rcSyncCycleDropdown();rcApplyFilters();return;}
  document.getElementById('rc-state').style.display='block';
  var qs='report-card';
  var payload = {
    cycle: RC_CYCLE||'',
    l1: rcFilters.l1||'all',
    l2: rcFilters.l2||'all',
    reg: '',
    goal: rcFilters.goal||'all',
    haul: rcFilters.haul||'all',
    from: globalFilters.from || null,
    to: globalFilters.to || null
  };
  api(qs, payload).then(function(d){
    RC_DATA=d;RC_CYCLE=d.selectedCycle||RC_CYCLE;rcSyncCycleDropdown();
    rcPopulateFilters(d);
    var rsel=document.getElementById('rc-fRegion');
    rsel.innerHTML='<option value="">All regions</option>'+(d.regions||[]).map(function(r){return'<option>'+r+'</option>';}).join('');
    document.getElementById('rc-state').style.display='none';
    rcApplyFilters();
  }).catch(function(e){
    document.getElementById('rc-state').innerHTML='<span style="color:#b42318">Error: '+e.message+'</span>';
  });
}

function rcSyncCycleDropdown(){var sel=document.getElementById('rc-fCycle');if(!sel||!RC_DATA)return;var cycles=RC_DATA.cycles||[];if(!cycles.length){sel.style.display='none';return;}sel.style.display='';sel.innerHTML=cycles.map(function(c){return'<option value="'+c+'"'+(c===RC_DATA.selectedCycle?' selected':'')+'>'+c+'</option>';}).join('');}

// ═══════════════ COMPARE ═══════════════
var CMP_MODE=false, CMP_LEVEL='l1', CMP_SLOTS=[], CMP_NAMES=[], CMP_META=null;

function cmpToggle(){
  CMP_MODE=!CMP_MODE;
  var btn=document.getElementById('rc-cmp-btn');
  var rcWrap=document.querySelector('.rc-wrap');
  var cmpWrap=document.getElementById('cmp-wrap');
  if(CMP_MODE){
    btn.classList.add('active'); btn.textContent='✕ Exit Compare';
    if(rcWrap) rcWrap.style.display='none';
    cmpWrap.classList.add('show');
    // Set default "to" date to today
    var todayStr=new Date().toISOString().split('T')[0];
    document.getElementById('cmp-to').value=todayStr;
    document.getElementById('cmp-to').max=todayStr;
    cmpPopulateFilterDropdowns();
    if(CMP_SLOTS.length===0){cmpAddSlot();cmpAddSlot();}
    cmpPopulateNames();
  } else {
    btn.classList.remove('active'); btn.textContent='⚡ Compare';
    if(rcWrap) rcWrap.style.display='';
    cmpWrap.classList.remove('show');
  }
}

function cmpSetLevel(l){
  CMP_LEVEL=l;
  document.getElementById('cmp-tabL1').classList.toggle('on',l==='l1');
  document.getElementById('cmp-tabL2').classList.toggle('on',l==='l2');
  cmpPopulateNames();
}

function cmpOnFilterChange(){ cmpPopulateNames(); }

function cmpPopulateFilterDropdowns(){
  // Populate from RC_DATA if available, else skip
  if(!RC_DATA) return;
  var cs=cycleSellers();
  var l1s=[...new Set(cs.map(function(s){return s.l1Manager;}).filter(Boolean))].sort();
  var l2s=[...new Set(cs.map(function(s){return s.l2Manager;}).filter(Boolean))].sort();
  var goals=[...new Set(cs.map(function(s){return s.goalType;}).filter(Boolean))].sort();
  var hauls=[...new Set(cs.map(function(s){return s.haul;}).filter(Boolean))].sort();
  function fill(id,arr){var el=document.getElementById(id);if(!el)return;var first=el.options[0].text;el.innerHTML='<option value="all">'+first+'</option>'+arr.map(function(v){return'<option value="'+v+'">'+v+'</option>';}).join('');}
  fill('cmp-fL1',l1s); fill('cmp-fL2',l2s); fill('cmp-fGoal',goals); fill('cmp-fHaul',hauls);
  var regs=(RC_DATA.views['']?[...new Set((RC_DATA.views[''].l1||[]).concat(RC_DATA.views[''].l2||[]).reduce(function(a,m){return a.concat(m.regions||[]);},[])).sort()]:[] );
  var rsel=document.getElementById('cmp-fRegion');
  if(rsel) rsel.innerHTML='<option value="all">All Regions</option>'+regs.map(function(r){return'<option value="'+r+'">'+r+'</option>';}).join('');
  // Cycles
  var cycles=RC_DATA.cycles||[];
  var csel=document.getElementById('cmp-fCycle');
  if(csel) csel.innerHTML='<option value="">All Cycles</option>'+cycles.map(function(c){return'<option value="'+c+'"'+(c===RC_DATA.selectedCycle?' selected':'')+'>'+c+'</option>';}).join('');
}

// Fetch available manager names for autocomplete based on date range + filters
function cmpPopulateNames(){
  var from=document.getElementById('cmp-from').value||'2026-07-09';
  var to=document.getElementById('cmp-to').value||new Date().toISOString().split('T')[0];
  var params={from:from, to:to, level:CMP_LEVEL, names:'',
    l1:document.getElementById('cmp-fL1').value||'all',
    l2:document.getElementById('cmp-fL2').value||'all',
    goal:document.getElementById('cmp-fGoal').value||'all',
    haul:document.getElementById('cmp-fHaul').value||'all',
    reg:document.getElementById('cmp-fRegion').value||'all'};
  api('compare-report', params).then(function(d){
    if(d && d.meta) CMP_NAMES=(d.meta.allManagerNames||[]);
    cmpRenderSlots();
  });
}


// ── Name Slots ──
var CMP_SLOT_COUNT=0;
function cmpAddSlot(){
  CMP_SLOT_COUNT++;
  CMP_SLOTS.push({id:'cmp-slot-'+CMP_SLOT_COUNT, value:'', acOpen:false});
  cmpRenderSlots();
}
function cmpRemoveSlot(idx){
  CMP_SLOTS.splice(idx,1);
  cmpRenderSlots();
}
function cmpRenderSlots(){
  var row=document.getElementById('cmp-names-row');
  if(!row)return;
  row.innerHTML=CMP_SLOTS.map(function(s,i){
    return '<div class="cmp-name-wrap" id="'+s.id+'">'+
      '<input class="cmp-name-input" type="text" placeholder="Type manager name…" value="'+s.value+'" '+
        'oninput="cmpSlotInput('+i+',this.value)" '+
        'onfocus="cmpSlotFocus('+i+')" '+
        'onblur="setTimeout(function(){cmpSlotBlur('+i+');},180)"'+
        ' autocomplete="off">'+
      (CMP_SLOTS.length>2?'<button class="cmp-name-remove" onclick="cmpRemoveSlot('+i+')">×</button>':'')+
      '<div class="cmp-autocomplete" id="cmp-ac-'+i+'" style="display:none"></div>'+
    '</div>';
  }).join('');
}
function cmpSlotInput(idx,val){
  CMP_SLOTS[idx].value=val;
  var ac=document.getElementById('cmp-ac-'+idx);
  if(!ac)return;
  if(!val){ac.style.display='none';return;}
  var filtered=CMP_NAMES.filter(function(n){return n.toLowerCase().includes(val.toLowerCase());}).slice(0,8);
  if(!filtered.length){ac.style.display='none';return;}
  ac.style.display='block';
  ac.innerHTML=filtered.map(function(n){
    return '<div onclick="cmpSlotSelect('+idx+',\''+n.replace(/'/g,"\\'")+'\')">'+(n)+'</div>';
  }).join('');
}
function cmpSlotFocus(idx){var ac=document.getElementById('cmp-ac-'+idx);if(ac&&CMP_SLOTS[idx].value)ac.style.display='block';}
function cmpSlotBlur(idx){var ac=document.getElementById('cmp-ac-'+idx);if(ac)ac.style.display='none';}
function cmpSlotSelect(idx,name){CMP_SLOTS[idx].value=name;cmpRenderSlots();}

// ── Run Compare ──
function cmpRun(){
  var names=CMP_SLOTS.map(function(s){return s.value.trim();}).filter(Boolean);
  if(!names.length){alert('Please enter at least one manager name to compare.');return;}
  var from=document.getElementById('cmp-from').value||'2026-07-09';
  var to=document.getElementById('cmp-to').value||new Date().toISOString().split('T')[0];
  var params={
    from:from, to:to, level:CMP_LEVEL, names:names.join(','),
    l1:document.getElementById('cmp-fL1').value||'all',
    l2:document.getElementById('cmp-fL2').value||'all',
    goal:document.getElementById('cmp-fGoal').value||'all',
    haul:document.getElementById('cmp-fHaul').value||'all',
    reg:document.getElementById('cmp-fRegion').value||'all'
  };
  document.getElementById('cmp-state').style.display='flex';
  document.getElementById('cmp-grid').innerHTML='';
  document.getElementById('cmp-snap-bar').style.display='none';
  document.getElementById('cmp-run-btn').disabled=true;
  api('compare-report', params).then(function(d){
    document.getElementById('cmp-state').style.display='none';
    document.getElementById('cmp-run-btn').disabled=false;
    if(!d||!d.success){document.getElementById('cmp-grid').innerHTML='<div class="cmp-state" style="display:flex;color:var(--red)">Error fetching comparison data.</div>';return;}
    var res=d.results||[];
    if(!res.length){document.getElementById('cmp-grid').innerHTML='<div class="cmp-state" style="display:flex">No data found for the selected names and date range.</div>';return;}
    // Show snapshot info
    var snapDates=[...new Set(res.map(function(r){return(r.dateRange&&r.dateRange.snapshotDate)||to;}))].join(', ');
    document.getElementById('cmp-snap-text').textContent='Showing cumulative data as of '+snapDates+' (snapshot of the latest available day per person in '+from+' → '+to+')';
    document.getElementById('cmp-snap-bar').style.display='flex';
    cmpRenderPanels(res);
  }).catch(function(e){
    document.getElementById('cmp-state').style.display='none';
    document.getElementById('cmp-run-btn').disabled=false;
    document.getElementById('cmp-grid').innerHTML='<div class="cmp-state" style="display:flex;color:var(--red)">'+e.message+'</div>';
  });
}

// ── Render Panels ──
function cmpRenderPanels(results){
  var n=results.length;
  var grid=document.getElementById('cmp-grid');
  // Responsive cols
  var cols=n===1?'1fr':n===2?'1fr 1fr':n===3?'1fr 1fr 1fr':'repeat('+n+',minmax(280px,1fr))';
  grid.style.gridTemplateColumns=cols;

  // Build subject+chapter score lookup by key for cross-panel winner detection
  var SECTIONS=['Output metrics','Input metrics','Quotations'];
  var chapterKeys={}; // key → [scores across panels]
  results.forEach(function(r){ (r.chapters||[]).forEach(function(c){ if(!chapterKeys[c.key]) chapterKeys[c.key]=[]; chapterKeys[c.key].push(c.mark||0); }); });
  // subject scores across panels
  var subjKeys={output:[],input:[],quotations:[]};
  results.forEach(function(r){ subjKeys.output.push(r.subjects&&r.subjects.output!=null?r.subjects.output:0); subjKeys.input.push(r.subjects&&r.subjects.input!=null?r.subjects.input:0); subjKeys.quotations.push(r.subjects&&r.subjects.quotations!=null?r.subjects.quotations:0); });
  var aggScores=results.map(function(r){return r.aggregate||0;});

  var subjectColors={output:'#F4631E',input:'#5B9CF6',quotations:'#B8973E'};
  var sectionIcons={'Output metrics':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>','Input metrics':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>','Quotations':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'};

  grid.innerHTML=results.map(function(r, pi){
    var agg=r.aggregate||0;
    var aggColor=agg>=90?'#4ADE80':agg>=70?'#FB923C':'#F87171';
    var isTopAgg=agg===Math.max.apply(null,aggScores);
    var gradeBg=agg>=90?'rgba(74,222,128,0.15)':agg>=70?'rgba(251,146,60,0.15)':'rgba(248,113,113,0.15)';
    var gradeCol=agg>=90?'#4ADE80':agg>=70?'#FB923C':'#F87171';
    var snap=(r.dateRange&&r.dateRange.snapshotDate)||'';

    // ── Head
    var head='<div class="cmp-panel-head">'+
      '<div class="cmp-ring-wrap">'+
        '<svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5"></circle>'+
        '<circle cx="18" cy="18" r="15" fill="none" stroke="'+aggColor+'" stroke-width="2.5" stroke-dasharray="94.2" stroke-dashoffset="'+(94.2-(agg/100*94.2)).toFixed(1)+'" stroke-linecap="round" style="transition:stroke-dashoffset 1s ease-out"></circle></svg>'+
        '<div class="cmp-ring-inner">'+(r.aggregate!=null?Math.round(r.aggregate):'NR')+'</div>'+
      '</div>'+
      '<div class="cmp-panel-info">'+
        '<div class="cmp-panel-name">'+r.name+(isTopAgg?' <span style="color:#FFD700;font-size:14px" title="Top performer">★</span>':'')+'</div>'+
        '<div class="cmp-panel-sub">'+r.sellers+' sellers · '+(r.regions||[]).join(', ')+'</div>'+
        '<div class="cmp-grade-pill" style="background:'+gradeBg+';color:'+gradeCol+'">Grade '+r.grade+'</div>'+
        (snap?'<div class="cmp-snap-badge">📅 as of '+snap+'</div>':'')+
      '</div>'+
    '</div>';

    // ── Subject bars
    var subKeys=['output','input','quotations'];
    var subLabels=['Output','Input','Quotations'];
    var subBars=subKeys.map(function(k,ki){
      var score=r.subjects&&r.subjects[k]!=null?r.subjects[k]:0;
      var isWinner=score===Math.max.apply(null,subjKeys[k]);
      var barCol=score>=90?'rgba(74,222,128,0.7)':score>=70?'rgba(251,146,60,0.65)':'rgba(248,113,113,0.6)';
      return '<div class="cmp-subj-row">'+
        '<span class="cmp-subj-lab" style="color:'+subjectColors[k]+'">'+subLabels[ki]+'</span>'+
        '<div class="cmp-subj-bar-wrap"><div class="cmp-subj-bar" style="width:'+score+'%;background:'+barCol+'"></div></div>'+
        '<span class="cmp-subj-score" style="color:'+(isWinner?'#4ADE80':'var(--text-primary)')+'">'+
          (r.subjects&&r.subjects[k]!=null?Math.round(r.subjects[k]):'–')+(isWinner?'▲':'')+
        '</span>'+
      '</div>';
    }).join('');

    // ── Chapters grouped by section
    var chapHtml='';
    SECTIONS.forEach(function(sn){
      var key=sn==='Output metrics'?'output':sn==='Input metrics'?'input':'quotations';
      var subjScore=r.subjects&&r.subjects[key]!=null?r.subjects[key]:null;
      var subjColor=subjectColors[key];
      var sectionChaps=(r.chapters||[]).filter(function(c){return c.subject===sn;});
      if(!sectionChaps.length)return;
      chapHtml+='<div class="cmp-section-hdr">'+
        '<span class="cmp-section-icon" style="color:'+subjColor+'">'+sectionIcons[sn]+'</span>'+
        '<span class="cmp-section-title">'+sn+'</span>'+
        '<span class="cmp-section-score" style="color:'+subjColor+'">'+(subjScore!=null?Math.round(subjScore):'–')+'</span>'+
      '</div>';
      sectionChaps.forEach(function(c){
        var mark=c.mark||0;
        var allMarks=chapterKeys[c.key]||[mark];
        var maxMark=Math.max.apply(null,allMarks.filter(function(v){return v!=null;}));
        var isWinner=allMarks.length>1&&mark===maxMark&&mark>0;
        var isLoser=allMarks.length>1&&mark<maxMark;
        var barCol=mark>=90?'rgba(74,222,128,0.65)':mark>=70?'rgba(251,146,60,0.6)':'rgba(248,113,113,0.55)';
        var scoreCol=mark>=90?'#4ADE80':mark>=70?'#FB923C':'#F87171';
        var statusLabel=mark>=90?'On track':mark>=70?'At risk':'Behind';
        chapHtml+='<div class="cmp-metric'+(isWinner?' winner':'')+(isLoser?' loser':'')+'">'+
          '<div class="cmp-metric-info">'+
            '<div class="cmp-metric-label">'+c.label+(isWinner?' <span class="cmp-winner-crown">👑</span>':'')+'</div>'+
            '<div class="cmp-metric-detail" title="'+c.detail+'">'+c.detail+'</div>'+
          '</div>'+
          '<div class="cmp-metric-bar-wrap"><div class="cmp-metric-bar" style="width:'+mark+'%;background:'+barCol+'"></div></div>'+
          '<div>'+
            '<div class="cmp-metric-score" style="color:'+scoreCol+'">'+(c.mark!=null?Math.round(c.mark):'NR')+'</div>'+
            '<div class="cmp-metric-grade" style="color:var(--text-muted)">'+statusLabel+'</div>'+
          '</div>'+
        '</div>';
      });
    });

    return '<div class="cmp-panel">'+head+
      '<div class="cmp-subjects">'+subBars+'</div>'+
      chapHtml+
    '</div>';
  }).join('');
}


