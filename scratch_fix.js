const fs = require('fs');
let c = fs.readFileSync('src/features/cm/CMOverviewPage.tsx', 'utf-8');
c = c.replace(/useAdminOverview/g, 'useCMOverview');
c = c.replace(/AdminOverviewPage/g, 'CMOverviewPage');
c = c.replace(/useCMOverview\(\)/g, 'useCMOverview(session?.email || "")');
c = c.replace(/Company Overview/g, 'Category Overview');
c = c.replace(/Company Total/g, 'Team Total');
c = c.replace(/totalL1/g, 'totalSellers'); // CMs only care about their total sellers, L1 in this context is the CM themselves
fs.writeFileSync('src/features/cm/CMOverviewPage.tsx', c);
