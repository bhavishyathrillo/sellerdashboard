const fs = require('fs');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [oldStr, newStr] of replacements) {
    content = content.replace(oldStr, newStr);
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// tl/L1SellerViewPage.tsx
replaceInFile('components/pages/tl/L1SellerViewPage.tsx', [
  ["import sellerStyles from './SellerViewPage.module.css'", "import sellerStyles from '../seller/SellerViewPage.module.css'"]
]);

// tl/L1HomePage.tsx
replaceInFile('components/pages/tl/L1HomePage.tsx', [
  ["import styles from './HomePage.module.css'", "import styles from '../shared/HomePage.module.css'"]
]);

// seller/SellerTimelineModal.tsx
replaceInFile('components/pages/seller/SellerTimelineModal.tsx', [
  ["import styles from './L1SellerViewPage.module.css'", "import styles from '../tl/L1SellerViewPage.module.css'"]
]);

// cm/L2SellerViewPage.tsx
replaceInFile('components/pages/cm/L2SellerViewPage.tsx', [
  ["import sellerStyles from './SellerViewPage.module.css'", "import sellerStyles from '../seller/SellerViewPage.module.css'"]
]);

// admin/AdminPerformancePage.tsx
replaceInFile('components/pages/admin/AdminPerformancePage.tsx', [
  ["import styles from './PerformancePage.module.css'", "import styles from '../shared/PerformancePage.module.css'"]
]);

// admin/AdminPipelinePage.tsx
replaceInFile('components/pages/admin/AdminPipelinePage.tsx', [
  ["import styles from './PipelinePage.module.css'", "import styles from '../shared/PipelinePage.module.css'"]
]);

// admin/AdminHygienePage.tsx
replaceInFile('components/pages/admin/AdminHygienePage.tsx', [
  ["import styles from './HygienePage.module.css'", "import styles from '../shared/HygienePage.module.css'"]
]);

console.log('Done fixing css imports');
