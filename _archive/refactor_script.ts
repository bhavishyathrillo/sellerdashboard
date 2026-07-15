import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});
console.log('Project loaded');

const pagesDir = project.getDirectory('components/pages');
console.log('Found pagesDir:', !!pagesDir);

// Mappings of file name (without extension) to new directory
const moves: Record<string, string> = {
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
    fs.mkdirSync(dirPath);
  }
  project.addDirectoryAtPath(dirPath);
});

// Move admin-lta via FS before doing TSX so they move together
if (fs.existsSync('components/pages/admin-lta')) {
  fs.renameSync('components/pages/admin-lta', 'components/pages/admin/admin-lta');
}

Object.entries(moves).forEach(([baseName, targetFolder]) => {
  // Move TSX
  const sf = project.getSourceFile(`components/pages/${baseName}.tsx`);
  if (sf) {
    const targetDir = project.getDirectory(`components/pages/${targetFolder}`);
    if (targetDir) {
      sf.moveToDirectory(targetDir);
    }
  }

  // Move CSS
  const cssPath = `components/pages/${baseName}.module.css`;
  const cssTarget = `components/pages/${targetFolder}/${baseName}.module.css`;
  if (fs.existsSync(cssPath)) {
    fs.renameSync(cssPath, cssTarget);
  }
});

project.saveSync();
console.log('Done organizing pages and updating imports!');
