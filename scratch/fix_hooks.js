const fs = require('fs');
const file = '/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure refs are defined at the very top of MonthlyBreakdownSection
const sectionStart = `function MonthlyBreakdownSection({ hierarchy, onSellerClick }: { hierarchy: any[], onSellerClick: (seller: any) => void }) {`;
const insertRefs = `
  const dotChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const allotmentChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paxChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotChartInstance = useRef<any>(null);
  const allotmentChartInstance = useRef<any>(null);
  const paxChartInstance = useRef<any>(null);
`;

if (content.indexOf('const dotChartCanvasRef = useRef<HTMLCanvasElement | null>(null);') === -1) {
    content = content.replace(sectionStart, sectionStart + insertRefs);
}

fs.writeFileSync(file, content);
console.log("Refs fixed.");
