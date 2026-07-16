const fs = require('fs');
const path = require('path');

const CACHE_HEADER_OBJ = `, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=59'
    }
  })`;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('route.ts')) {
      results.push(file);
    }
  });
  return results;
}

const exclude = ['track-action', 'track-session', 'login', 'dashboard-all', 'cron', 'cm-search'];

walk('src/app/api').forEach(route => {
  if (exclude.some(ex => route.includes(ex))) return;
  let content = fs.readFileSync(route, 'utf8');
  if (!content.includes('export async function GET')) return;
  if (content.includes('Cache-Control')) return;

  // Replace return NextResponse.json(ANYTHING_NOT_CONTAINING_COMMA)
  const regex = /return NextResponse\.json\(([^,]+?)\)/;
  const match = content.match(regex);
  
  if (match) {
    const varContent = match[1];
    const newStr = `return NextResponse.json(${varContent}${CACHE_HEADER_OBJ}`;
    content = content.replace(match[0], newStr);
    fs.writeFileSync(route, content, 'utf8');
    console.log('Added cache to ' + route);
  }
});
