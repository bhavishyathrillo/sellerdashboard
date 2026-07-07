const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'components', 'pages');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already imported
  if (content.includes('import Loader from')) continue;

  const originalContent = content;

  // Regex to match "if (loading) return <...>" or similar single-line returns.
  // Note: some are multi-line like:
  // if (loading) return (
  //   <div ...>
  // )
  // We can just use a simple regex for the most common single line ones first.
  
  let modified = false;

  const replaceLoading = (match) => {
    modified = true;
    // extract some text if present like "Loading team data..."
    let text = 'Loading...';
    if (match.includes('Loading team data')) text = 'Loading team data...';
    else if (match.includes('TL dashboard')) text = 'Loading TL dashboard...';
    else if (match.includes('CM dashboard')) text = 'Loading CM dashboard...';
    else if (match.includes('hygiene')) text = 'Loading hygiene...';
    
    return `if (loading) return <Loader text="${text}" />`;
  };

  // Handle single line ones
  content = content.replace(/if\s*\(\s*loading\s*\)\s*return\s*<div[^>]*>.*?<\/div>/gi, replaceLoading);

  // Handle multi-line ones that start with `if (loading) return (` and end with `)`
  // This is a bit trickier, we can just look for them manually or use a more greedy regex cautiously.
  content = content.replace(/if\s*\(\s*loading\s*\)\s*return\s*\(\s*<div[\s\S]*?<\/div>\s*\)/gi, replaceLoading);

  if (modified) {
    // Add import statement after the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + `import Loader from '@/components/ui/Loader'\n` + content.slice(endOfLastImport + 1);
    } else {
      content = `import Loader from '@/components/ui/Loader'\n` + content;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
