const fs = require('fs');

const pagePath = 'src/app/page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

const importsToReplace = [
  "import HomePage from '@/features/shared/HomePage'",
  "import L1HomePage from '@/features/tl/L1HomePage'",
  "import AdminOverviewPage from '@/features/admin/AdminOverviewPage'",
  "import AdminLTAPage from '@/features/admin/AdminLTAPage'",
  "import AdminPerformancePage from '@/features/admin/AdminPerformancePage'",
  "import AdminMHLPage from '@/features/admin/AdminMHLPage'",
  "import AdminPipelinePage from '@/features/admin/AdminPipelinePage'",
  "import AdminHygienePage from '@/features/admin/AdminHygienePage'",
  "import SelectPersonaPage from '@/features/shared/SelectPersonaPage'",
  "import CMSelectPersonaPage from '@/features/cm/CMSelectPersonaPage'",
  "import PipelinePage from '@/features/shared/PipelinePage'",
  "import MHLPage from '@/features/shared/MHLPage'",
  "import LeaderboardPage from '@/features/shared/LeaderboardPage'",
  "import RoadmapPage from '@/features/shared/RoadmapPage'",
  "import HygienePage from '@/features/shared/HygienePage'",
  "import RewardsPage from '@/features/shared/RewardsPage'",
  "import CalendarPage from '@/features/shared/CalendarPage'",
  "import PerformancePage from '@/features/shared/PerformancePage'",
  "import TTKPage from '@/features/shared/TTKPage'",
  "import PriorityPage from '@/features/shared/PriorityPage'",
  "import TeamPage from '@/features/shared/TeamPage'",
  "import SellerViewPage from '@/features/seller/SellerViewPage'",
  "import L2SellerViewPage from '@/features/cm/L2SellerViewPage'",
  "import L1SellerViewPage from '@/features/tl/L1SellerViewPage'",
  "import KPITab from '@/features/kpi/KPITab'",
  "import AdoptionPage from '@/features/shared/AdoptionPage'",
  "import ProfilePage from '@/features/shared/ProfilePage'"
];

// Ensure next/dynamic is imported
if (!content.includes("import dynamic from 'next/dynamic'")) {
  content = content.replace(
    "import { useState, useEffect } from 'react'",
    "import { useState, useEffect } from 'react'\nimport dynamic from 'next/dynamic'"
  );
}

importsToReplace.forEach(imp => {
  const match = imp.match(/import (\w+) from '(.+)'/);
  if (match) {
    const [_, componentName, importPath] = match;
    // Replace with dynamic import
    content = content.replace(imp, `const ${componentName} = dynamic(() => import('${importPath}'))`);
  }
});

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Successfully lazy loaded components in page.tsx');
