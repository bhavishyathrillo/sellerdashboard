const fs = require('fs');
const path = require('path');

const moves = {
  // ADMIN
  'AdminHygienePage': 'admin',
  'AdminLTAPage': 'admin',
  'AdminMHLPage': 'admin',
  'AdminOverviewPage': 'admin',
  'AdminPerformancePage': 'admin',
  'AdminPipelinePage': 'admin',

  // CM
  'L2SellerViewPage': 'cm',
  'CMSelectPersonaPage': 'cm',

  // TL
  'L1HomePage': 'tl',
  'L1SellerViewPage': 'tl',

  // SELLER
  'SellerViewPage': 'seller',
  'SellerTimelineModal': 'seller',

  // SHARED
  'AdoptionPage': 'shared',
  'CalendarPage': 'shared',
  'HomePage': 'shared',
  'HygienePage': 'shared',
  'LeaderboardPage': 'shared',
  'MHLPage': 'shared',
  'PerformancePage': 'shared',
  'PipelinePage': 'shared',
  'PriorityPage': 'shared',
  'ProfilePage': 'shared',
  'QBStatsPage': 'shared',
  'RewardsPage': 'shared',
  'RoadmapPage': 'shared',
  'SelectPersonaPage': 'shared',
  'TeamPage': 'shared',
  'TTKPage': 'shared'
};

function fixRelativeImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixRelativeImports(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      Object.entries(moves).forEach(([baseName, targetFolder]) => {
        // e.g. import Something from './SellerTimelineModal'
        const regex = new RegExp(`from\\s+['"]\\.\\/${baseName}['"]`, 'g');
        const newImport = `from '@/components/pages/${targetFolder}/${baseName}'`;
        
        if (regex.test(content)) {
          content = content.replace(regex, newImport);
          changed = true;
        }
      });

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed relative imports in ${fullPath}`);
      }
    }
  }
}

fixRelativeImports('components/pages');
