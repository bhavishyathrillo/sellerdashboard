const fs = require('fs');
const path = require('path');

const filePath = 'src/features/tl/L1SellerViewPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

function extractModal(condition, componentName) {
  const startStr = condition + ' (';
  let idx = content.indexOf(startStr);
  if (idx === -1) idx = content.indexOf(condition + '(');
  if (idx === -1) return null;
  
  const parenStart = content.indexOf('(', idx);
  let parenCount = 0;
  let started = false;
  let endIdx = parenStart;
  
  for (let i = parenStart; i < content.length; i++) {
    if (content[i] === '(') { parenCount++; started = true; }
    if (content[i] === ')') { parenCount--; }
    if (started && parenCount === 0) {
      endIdx = i;
      break;
    }
  }
  
  const rawJsx = content.slice(parenStart + 1, endIdx).trim(); // Inside the parenthesis
  const fullBlock = content.slice(idx, endIdx + 1);
  
  return { rawJsx, fullBlock, componentName };
}

const modals = [
  extractModal('{showNoLeadsModal &&', 'NoLeadsModal'),
  extractModal('{showMheTrendModal &&', 'MheTrendModal'),
  extractModal('{showGoalShbTrendModal &&', 'GoalShbTrendModal'),
  extractModal('{showHourlyView &&', 'HourlyViewModal')
].filter(Boolean);

if (modals.length === 0) {
  console.log('No modals found');
  process.exit(0);
}

fs.mkdirSync('src/features/tl/components', { recursive: true });

modals.forEach(m => {
  // Create component file using "any" props to bypass TS during initial extraction, 
  // but we'll import everything we MIGHT need.
  const compContent = `import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ${m.componentName}(props: any) {
  const {
    showNoLeadsModal, setShowNoLeadsModal, 
    showMheTrendModal, setShowMheTrendModal,
    showGoalShbTrendModal, setShowGoalShbTrendModal,
    showHourlyView, setShowHourlyView,
    teamData, sellersNoLeads, getInitials,
    goalShbDrillSeller, setGoalShbDrillSeller,
    hourlySeller, setHourlySeller
  } = props;

  return (
    ${m.rawJsx}
  );
}
`;
  fs.writeFileSync(`src/features/tl/components/${m.componentName}.tsx`, compContent, 'utf8');
  
  // Replace in main file
  content = content.replace(m.fullBlock, `<${m.componentName} {...{ 
    showNoLeadsModal, setShowNoLeadsModal, 
    showMheTrendModal, setShowMheTrendModal,
    showGoalShbTrendModal, setShowGoalShbTrendModal,
    showHourlyView, setShowHourlyView,
    teamData, sellersNoLeads, getInitials,
    goalShbDrillSeller, setGoalShbDrillSeller,
    hourlySeller, setHourlySeller
  }} />`);
});

// Import the components at the top of L1SellerViewPage.tsx
const imports = `import NoLeadsModal from './components/NoLeadsModal';
import MheTrendModal from './components/MheTrendModal';
import GoalShbTrendModal from './components/GoalShbTrendModal';
import HourlyViewModal from './components/HourlyViewModal';\n`;

content = content.replace("import Loader from '@/components/ui/Loader'", "import Loader from '@/components/ui/Loader'\n" + imports);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Extracted modals successfully!');
