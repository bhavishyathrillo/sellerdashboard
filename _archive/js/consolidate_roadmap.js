const fs = require('fs');
const path = require('path');

const base = 'src/app/api/seller';
const rPath = path.join(base, 'roadmap', 'route.ts');
const l1Path = path.join(base, 'l1-roadmap', 'route.ts');
const tPath = path.join(base, 'team-roadmap', 'route.ts');

const rContent = fs.readFileSync(rPath, 'utf8').replace(/export async function GET\(req: Request\)/, 'export async function handleSeller(req: Request)');
const l1Content = fs.readFileSync(l1Path, 'utf8').replace(/export async function GET\(req: Request\)/, 'export async function handleTl(req: Request)');
const tContent = fs.readFileSync(tPath, 'utf8').replace(/export async function GET\(req: Request\)/, 'export async function handleCm(req: Request)');

const getImportsAndBody = (content) => {
  const lines = content.split('\n');
  const imports = [];
  const body = [];
  let inImports = true;
  for (const line of lines) {
    if (inImports && line.startsWith('import ')) {
      imports.push(line);
    } else if (inImports && (line.startsWith('const supabase') || line.includes('export async function'))) {
      inImports = false; 
      if (line.includes('export async function')) body.push(line);
    } else if (!inImports) {
      body.push(line);
    }
  }
  return { imports, body: body.join('\n') };
}

const rData = getImportsAndBody(rContent);
const l1Data = getImportsAndBody(l1Content);
const tData = getImportsAndBody(tContent);

const allImports = Array.from(new Set([...rData.imports, ...l1Data.imports, ...tData.imports]));

const routerContent = `${allImports.join('\n')}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

${rData.body.replace(/const supabase = createClient[\s\S]*?\)/, '')}
${l1Data.body.replace(/const supabase = createClient[\s\S]*?\)/, '')}
${tData.body.replace(/const supabase = createClient[\s\S]*?\)/, '')}

export async function GET(req: Request, { params }: { params: { persona: string } }) {
  const p = (await params).persona.toLowerCase();
  if (p === 'seller') return handleSeller(req);
  if (p === 'tl') return handleTl(req);
  if (p === 'cm') return handleCm(req);
  return NextResponse.json({ error: 'Roadmap not available for this persona' }, { status: 400 });
}
`;

fs.mkdirSync(path.join(base, '[persona]', 'roadmap'), { recursive: true });
fs.writeFileSync(path.join(base, '[persona]', 'roadmap', 'route.ts'), routerContent, 'utf8');

const featuresPath = 'src/features';
function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) replaceInDir(full);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let c = fs.readFileSync(full, 'utf8');
      c = c.replace(/\/api\/seller\/roadmap/g, '/api/seller/seller/roadmap');
      c = c.replace(/\/api\/seller\/l1-roadmap/g, '/api/seller/tl/roadmap');
      c = c.replace(/\/api\/seller\/team-roadmap/g, '/api/seller/cm/roadmap');
      fs.writeFileSync(full, c, 'utf8');
    }
  }
}
replaceInDir(featuresPath);

fs.rmSync(path.join(base, 'roadmap'), { recursive: true, force: true });
fs.rmSync(path.join(base, 'l1-roadmap'), { recursive: true, force: true });
fs.rmSync(path.join(base, 'team-roadmap'), { recursive: true, force: true });

console.log('Roadmap API consolidated!');
