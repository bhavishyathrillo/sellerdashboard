const fs = require('fs');

function applyToPriority() {
  const file = 'src/features/shared/PriorityPage.tsx';
  let content = fs.readFileSync(file, 'utf8');
  
  // 1. Re-apply the useEffect fix since git checkout undid it
  const match = content.match(/if\s*\(fetchedData\)\s*\{([\s\S]*?)\}\s*else if\s*\(!isFetching\)\s*\{\s*setLoading\(false\)\s*\}/);
  if (match) {
    const inner = match[1];
    const newBlock = 'if (isFetching) {\n      setLoading(true)\n    } else if (fetchedData) {' + inner + '} else {\n      setLoading(false)\n    }';
    content = content.replace(match[0], newBlock);
  }

  // 2. Add Loader import
  if (!content.includes('import Loader')) {
    content = content.replace(
      'import { useCachedFetch } from \'@/hooks/useCachedFetch\'',
      'import { useCachedFetch } from \'@/hooks/useCachedFetch\'\nimport Loader from \'@/components/ui/Loader\''
    );
  }

  // 3. Replace Loader body
  const oldLoaderRegex = /  if \(loading\) \{\n    return \(\n      <div style=\{\{ display: 'flex'[\s\S]*?<\/div>\n    \)\n  \}/;
  content = content.replace(oldLoaderRegex, '  if (loading) return <Loader text="Loading priority leads..." />');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Priority fixed');
}

function applyToAdminMHL() {
  const file = 'src/features/admin/AdminMHLPage.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // 1. Re-apply useEffect fix
  const match = content.match(/if\s*\(fetchedData\)\s*\{([\s\S]*?)\}\s*else if\s*\(!isFetching\)\s*\{\s*setLoading\(false\)\s*\}/);
  if (match) {
    const inner = match[1];
    const newBlock = 'if (isFetching) {\n      setLoading(true)\n    } else if (fetchedData) {' + inner + '} else {\n      setLoading(false)\n    }';
    content = content.replace(match[0], newBlock);
  }

  // 2. Add Loader import
  if (!content.includes('import Loader')) {
    content = content.replace(
      'import { useAdminMHL } from \'@/lib/services/apiHooks\'',
      'import { useAdminMHL } from \'@/lib/services/apiHooks\'\nimport Loader from \'@/components/ui/Loader\''
    );
  }

  // 3. Replace loader inline div
  content = content.replace(
    '<div className="ov-loading"><div className="ov-spinner"/><p>Fetching Hierarchy...</p></div>',
    '<Loader text="Fetching Hierarchy..." />'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('AdminMHL fixed');
}

applyToPriority();
applyToAdminMHL();
