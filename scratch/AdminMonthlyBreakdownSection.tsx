
function MonthlyBreakdownSection({ hierarchy, dotDistribution, date, setDrillSellerTimeline }: { hierarchy: any[], dotDistribution: any[], date: string, setDrillSellerTimeline: (val: any) => void }) {
  const [activeBreakdownCard, setActiveBreakdownCard] = useState<'dot' | 'allotment' | 'pax' | 'ca' | null>(null)
  const [breakdownExpandedTl, setBreakdownExpandedTl] = useState<string | null>(null)
  const [breakdownDrillSeller, setBreakdownDrillSeller] = useState<any>(null)

  let allMembers: any[] = []
  hierarchy.forEach(c => c.tls.forEach((tl: any) => {
    allMembers = allMembers.concat(tl.sellers)
  }))

  const cmMonthlySum = (key: string) => allMembers.reduce((sum: number, m: any) => {
    return sum + (m.monthly_rows || []).reduce((s: number, r: any) => s + (r[key] || 0), 0)
  }, 0)

  const cmMonthlyTotalLeads = cmMonthlySum('total_leads_allotted')
  const cmMonthlyAutoAllotted = cmMonthlySum('auto_allotted')
  const cmMonthlyManualAllotted = cmMonthlySum('manual_allotted')
  const cmMonthlyRtgLeads = cmMonthlySum('rtg_leads')
  const cmMonthlyNonRtgLeads = cmMonthlySum('non_rtg_leads')
  const cmMonthlyPax1 = cmMonthlySum('pax_1')
  const cmMonthlyPax2 = cmMonthlySum('pax_2')
  const cmMonthlyPax3 = cmMonthlySum('pax_3')
  const cmMonthlyPax4 = cmMonthlySum('pax_4')
  const cmMonthlyPax4Plus = cmMonthlySum('pax_4_plus')
  const cmMonthlyTotalPax = cmMonthlyPax1 + cmMonthlyPax2 + cmMonthlyPax3 + cmMonthlyPax4 + cmMonthlyPax4Plus

  const cmMonthlyAppetite = allMembers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + (r.final_lta || 0), 0), 0);
  const cmMonthlyFulfPct = cmMonthlyAppetite > 0 ? Math.round((cmMonthlyTotalLeads / cmMonthlyAppetite) * 100) : 0;
  
  const allCAMonthlyRows = allMembers.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null);
  const sumCta = allCAMonthlyRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0);
  const sumCtaLeads = allCAMonthlyRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0);
  const cmMonthlyAvgCA = sumCtaLeads > 0 ? Math.round(sumCta / sumCtaLeads) : null;
  
  const cmMonthlyCaRows = [
    { label: 'Leads Allotted', value: cmMonthlyTotalLeads, color: '#E5E7EB' },
    { label: 'Appetite (LTA)', value: cmMonthlyAppetite, color: '#F4631E' },
  ];

  const cmAllotmentRows = [
    { label: 'Auto Allotted', value: cmMonthlyAutoAllotted, color: '#E5E7EB' },
    { label: 'Manual Allotted', value: cmMonthlyManualAllotted, color: '#9CA3AF' },
    { label: 'RTG Leads', value: cmMonthlyRtgLeads, color: '#F4631E' },
    { label: 'Non-RTG', value: cmMonthlyNonRtgLeads, color: '#4B5563' },
  ]

  const cmPaxRows = [
    { label: '1-pax', value: cmMonthlyPax1, color: '#F3F4F6' },
    { label: '2-pax', value: cmMonthlyPax2, color: '#E5E7EB' },
    { label: '3-pax', value: cmMonthlyPax3, color: '#D1D5DB' },
    { label: '4-pax', value: cmMonthlyPax4, color: '#9CA3AF' },
    { label: '4+ pax', value: cmMonthlyPax4Plus, color: '#6B7280' },
  ]

  const dotMonthsConfig = [
    { label: 'July', key: '07' },
    { label: 'August', key: '08' },
    { label: 'Sept', key: '09' },
    { label: 'Oct', key: '10' },
    { label: 'Nov', key: '11' },
    { label: 'Dec', key: '12' }
  ];

  const cmDotChartData: { label: string; value: number; color: string }[] = []
  dotMonthsConfig.forEach(mo => {
    let val = 0;
    dotDistribution.forEach((d: any) => {
      if (d.month.endsWith('-' + mo.key)) val += d.count;
    });
    cmDotChartData.push({ label: mo.label, value: val, color: '#F4631E' })
  });

  let futureSum = 0
  dotDistribution.forEach((d: any) => {
    const isMainMonth = dotMonthsConfig.some(mo => d.month.endsWith('-' + mo.key));
    if (!isMainMonth) futureSum += d.count;
  });
  cmDotChartData.push({ label: '6+ Months', value: futureSum, color: '#5A5650' })

  const maxCmDotValue = Math.max(...cmDotChartData.map(d => d.value), 1)

  const currentMonthIndex = new Date().getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthStr = `${monthNames[currentMonthIndex]} ${new Date().getFullYear()}`

  const processedGroups = hierarchy.flatMap(c => c.tls.map((tl: any) => ({
    l2_name: tl.tl_name,
    l2_email: tl.tl_name,
    members: tl.sellers
  })))

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* S1: Login & Availability */}

      
    </div>
  )
}
