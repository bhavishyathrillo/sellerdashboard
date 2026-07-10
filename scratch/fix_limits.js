const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('app/api');
let updatedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // First, remove existing limits > 100 so they don't override our 1000000 limit
  content = content.replace(/\.limit\((\d+)\)/g, (match, p1) => {
    return parseInt(p1) > 100 ? '' : match;
  });

  // Now inject .limit(1000000) right after every .select(...)
  // We match .select( ANYTHING EXCEPT ')' )
  const newContent = content.replace(/\.select\(([^)]*)\)(?!\.limit\(1000000\))/g, '.select($1).limit(1000000)');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    updatedCount++;
  }
});
console.log('Updated files: ' + updatedCount);
