const fs = require('fs');
const path = require('path');

const base = 'src/app/api/seller';
const effPath = path.join(base, 'efficiency', 'route.ts');
const l1Path = path.join(base, 'l1-efficiency', 'route.ts');
const l2Path = path.join(base, 'l2-efficiency', 'route.ts');

const effContent = fs.readFileSync(effPath, 'utf8').replace(/export async function GET\(req: Request\)/, 'export async function handleSeller(req: Request)');
const l1Content = fs.readFileSync(l1Path, 'utf8').replace(/export async function GET\(req: Request\)/, 'export async function handleTl(req: Request)');
const l2Content = fs.readFileSync(l2Path, 'utf8').replace(/export async function GET\(req: Request\)/, 'export async function handleCm(req: Request)');

const getImportsAndBody = (content) => {
  const lines = content.split('\n');
  const imports = [];
  const body = [];
  let inImports = true;
  for (const line of lines) {
    if (inImports && line.startsWith('import ')) {
      imports.push(line);
    } else if (inImports && line.startsWith('const supabase')) {
      inImports = false; 
    } else if (!inImports) {
      body.push(line);
    }
  }
  return { imports, body: body.join('\n') };
}

const effData = getImportsAndBody(effContent);
const l1Data = getImportsAndBody(l1Content);
const l2Data = getImportsAndBody(l2Content);

const allImports = Array.from(new Set([...effData.imports, ...l1Data.imports, ...l2Data.imports]));

const routerContent = `${allImports.join('\n')}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

${effData.body.replace(/const supabase = createClient[\s\S]*?\)/, '')}
${l1Data.body.replace(/const supabase = createClient[\s\S]*?\)/, '')}
${l2Data.body.replace(/const supabase = createClient[\s\S]*?\)/, '')}

export async function GET(req: Request, { params }: { params: { persona: string } }) {
  const p = (await params).persona.toLowerCase();
  if (p === 'seller') return handleSeller(req);
  if (p === 'tl') return handleTl(req);
  if (p === 'cm') return handleCm(req);
  return NextResponse.json({ error: 'Invalid persona' }, { status: 400 });
}
`;

fs.mkdirSync(path.join(base, '[persona]', 'efficiency'), { recursive: true });
fs.writeFileSync(path.join(base, '[persona]', 'efficiency', 'route.ts'), routerContent, 'utf8');

// Update frontend fetch calls
const featuresPath = 'src/features';
function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) replaceInDir(full);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let c = fs.readFileSync(full, 'utf8');
      c = c.replace(/\/api\/seller\/efficiency/g, '/api/seller/seller/efficiency');
      c = c.replace(/\/api\/seller\/l1-efficiency/g, '/api/seller/tl/efficiency');
      c = c.replace(/\/api\/seller\/l2-efficiency/g, '/api/seller/cm/efficiency');
      fs.writeFileSync(full, c, 'utf8');
    }
  }
}
replaceInDir(featuresPath);

fs.rmSync(path.join(base, 'efficiency'), { recursive: true, force: true });
fs.rmSync(path.join(base, 'l1-efficiency'), { recursive: true, force: true });
fs.rmSync(path.join(base, 'l2-efficiency'), { recursive: true, force: true });

console.log('Efficiency API consolidated!');
