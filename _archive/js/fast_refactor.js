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

const dirsToCreate = ['admin', 'cm', 'tl', 'seller', 'shared'];
dirsToCreate.forEach(d => {
  const dirPath = `components/pages/${d}`;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

if (fs.existsSync('components/pages/admin-lta')) {
  fs.renameSync('components/pages/admin-lta', 'components/pages/admin/admin-lta');
}

Object.entries(moves).forEach(([baseName, targetFolder]) => {
  const tsxPath = `components/pages/${baseName}.tsx`;
  const tsxTarget = `components/pages/${targetFolder}/${baseName}.tsx`;
  if (fs.existsSync(tsxPath)) fs.renameSync(tsxPath, tsxTarget);

  const cssPath = `components/pages/${baseName}.module.css`;
  const cssTarget = `components/pages/${targetFolder}/${baseName}.module.css`;
  if (fs.existsSync(cssPath)) fs.renameSync(cssPath, cssTarget);
});

// Update imports recursively
function updateImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      updateImports(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      Object.entries(moves).forEach(([baseName, targetFolder]) => {
        const oldImport = `@/components/pages/${baseName}`;
        const newImport = `@/components/pages/${targetFolder}/${baseName}`;
        if (content.includes(oldImport)) {
          content = content.replaceAll(oldImport, newImport);
          changed = true;
        }
      });

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}

updateImports('app');
updateImports('components');
console.log('Refactor complete!');
