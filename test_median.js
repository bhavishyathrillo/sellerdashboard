const data = [
  {
    activity_date: '2026-06-01',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 9
  },
  {
    activity_date: '2026-06-02',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 13
  },
  {
    activity_date: '2026-06-03',
    available_today: true,
    mishandled_count: 1,
    open_leads_count: 13
  },
  {
    activity_date: '2026-06-04',
    available_today: true,
    mishandled_count: 2,
    open_leads_count: 12
  },
  {
    activity_date: '2026-06-05',
    available_today: true,
    mishandled_count: 4,
    open_leads_count: 26
  },
  {
    activity_date: '2026-06-06',
    available_today: true,
    mishandled_count: 1,
    open_leads_count: 15
  },
  {
    activity_date: '2026-06-08',
    available_today: true,
    mishandled_count: 2,
    open_leads_count: 11
  },
  {
    activity_date: '2026-06-09',
    available_today: true,
    mishandled_count: 1,
    open_leads_count: 10
  },
  {
    activity_date: '2026-06-10',
    available_today: true,
    mishandled_count: 1,
    open_leads_count: 9
  },
  {
    activity_date: '2026-06-11',
    available_today: true,
    mishandled_count: 2,
    open_leads_count: 10
  },
  {
    activity_date: '2026-06-12',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 8
  },
  {
    activity_date: '2026-06-13',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 11
  },
  {
    activity_date: '2026-06-15',
    available_today: true,
    mishandled_count: 1,
    open_leads_count: 15
  },
  {
    activity_date: '2026-06-16',
    available_today: true,
    mishandled_count: 2,
    open_leads_count: 18
  },
  {
    activity_date: '2026-06-17',
    available_today: true,
    mishandled_count: 3,
    open_leads_count: 22
  },
  {
    activity_date: '2026-06-18',
    available_today: true,
    mishandled_count: 3,
    open_leads_count: 22
  },
  {
    activity_date: '2026-06-19',
    available_today: true,
    mishandled_count: 5,
    open_leads_count: 22
  },
  {
    activity_date: '2026-06-20',
    available_today: true,
    mishandled_count: 4,
    open_leads_count: 19
  },
  {
    activity_date: '2026-06-22',
    available_today: true,
    mishandled_count: 1,
    open_leads_count: 16
  },
  {
    activity_date: '2026-06-23',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 11
  },
  {
    activity_date: '2026-06-24',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 13
  },
  {
    activity_date: '2026-06-25',
    available_today: true,
    mishandled_count: 3,
    open_leads_count: 14
  },
  {
    activity_date: '2026-06-26',
    available_today: true,
    mishandled_count: 4,
    open_leads_count: 15
  },
  {
    activity_date: '2026-06-27',
    available_today: true,
    mishandled_count: 4,
    open_leads_count: 17
  },
  {
    activity_date: '2026-06-29',
    available_today: true,
    mishandled_count: 7,
    open_leads_count: 15
  },
  {
    activity_date: '2026-06-30',
    available_today: true,
    mishandled_count: 2,
    open_leads_count: 13
  },
  {
    activity_date: '2026-07-01',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 10
  },
  {
    activity_date: '2026-07-02',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 9
  },
  {
    activity_date: '2026-07-03',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 8
  },
  {
    activity_date: '2026-07-04',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 10
  },
  {
    activity_date: '2026-07-05',
    available_today: false,
    mishandled_count: 0,
    open_leads_count: 10
  },
  {
    activity_date: '2026-07-06',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 9
  },
  {
    activity_date: '2026-07-07',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 7
  },
  {
    activity_date: '2026-07-08',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 7
  },
  {
    activity_date: '2026-07-09',
    available_today: true,
    mishandled_count: 0,
    open_leads_count: 13
  }
];

const dm = {};
data.filter(r => r.available_today && new Date(r.activity_date).getDay() !== 0).forEach(r => {
    const iso = r.activity_date;
    if (!dm[iso]) dm[iso] = {mish:0, open:0};
    dm[iso].mish += +r.mishandled_count;
    dm[iso].open += +r.open_leads_count;
});
const days = Object.values(dm).map(d => d.open > 0 ? (d.mish / d.open)*100 : null).filter(v => v !== null);

function medArr(a) { if(!a.length) return null; const s=[...a].sort((x,y)=>x-y), m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }

console.log("Median:", medArr(days));
