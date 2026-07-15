const fs = require('fs');
const path = require('path');

// 1. Create src directory
if (!fs.existsSync('src')) fs.mkdirSync('src');

// 2. Move app, components, lib to src
['app', 'components', 'lib'].forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      fs.renameSync(dir, `src/${dir}`);
      console.log(`Moved ${dir} to src/${dir}`);
    } catch (e) {
      console.error(`Failed to move ${dir}: ${e.message}`);
    }
  }
});

// 3. Update tsconfig.json
const tsconfigPath = 'tsconfig.json';
if (fs.existsSync(tsconfigPath)) {
  let tsconfig = fs.readFileSync(tsconfigPath, 'utf8');
  if (tsconfig.includes('"@/*": ["./*"]')) {
    tsconfig = tsconfig.replace('"@/*": ["./*"]', '"@/*": ["./src/*"]');
    fs.writeFileSync(tsconfigPath, tsconfig, 'utf8');
    console.log('Updated tsconfig.json alias');
  }
}

// 4. Create features and hooks directories
if (!fs.existsSync('src/features')) fs.mkdirSync('src/features');
if (!fs.existsSync('src/hooks')) fs.mkdirSync('src/hooks');

// 5. Move domains to features
const moveMap = {
  'src/components/pages/admin': 'src/features/admin',
  'src/components/pages/seller': 'src/features/seller',
  'src/components/pages/tl': 'src/features/tl',
  'src/components/pages/cm': 'src/features/cm',
  'src/components/pages/shared': 'src/features/shared',
  'src/components/kpi': 'src/features/kpi',
  'src/components/auth': 'src/features/auth',
  'src/components/hooks': 'src/hooks'
};

Object.entries(moveMap).forEach(([oldPath, newPath]) => {
  if (fs.existsSync(oldPath)) {
    try {
      fs.renameSync(oldPath, newPath);
      console.log(`Moved ${oldPath} to ${newPath}`);
    } catch (e) {
      console.error(`Failed to move ${oldPath}: ${e.message}`);
    }
  }
});

// 6. Delete empty components/pages
if (fs.existsSync('src/components/pages')) {
  try {
    fs.rmdirSync('src/components/pages');
    console.log('Removed empty src/components/pages');
  } catch(e) {
    console.error('Could not remove empty src/components/pages', e.message);
  }
}

// 7. Global import rewrite
const importReplacements = [
  ['@/components/pages/admin', '@/features/admin'],
  ['@/components/pages/seller', '@/features/seller'],
  ['@/components/pages/tl', '@/features/tl'],
  ['@/components/pages/cm', '@/features/cm'],
  ['@/components/pages/shared', '@/features/shared'],
  ['@/components/kpi', '@/features/kpi'],
  ['@/components/auth', '@/features/auth'],
  ['@/components/hooks', '@/hooks']
];

function updateImports(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      updateImports(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      importReplacements.forEach(([oldStr, newStr]) => {
        if (content.includes(oldStr)) {
          content = content.split(oldStr).join(newStr);
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

updateImports('src');
console.log('Global restructuring complete!');
