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
  
  // Find the closing brace for the boolean short-circuit block
  let blockEnd = endIdx;
  if (content[endIdx + 1] === '}') blockEnd = endIdx + 1;
  else if (content.slice(endIdx + 1, endIdx + 3) === ' }') blockEnd = endIdx + 2;
  else if (content[endIdx + 2] === '}') blockEnd = endIdx + 2;

  const fullBlock = content.slice(idx, blockEnd + 1);
  
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

const modalPropsMap = {
  'NoLeadsModal': 'setShowNoLeadsModal, processedGroups, globalNoLeads, session',
  'MheTrendModal': 'setShowMheTrendModal, date, todayStr, mheDrillSeller, setMheDrillSeller, allMembers, processedGroups, mheExpandedTl, setMheExpandedTl, MheTrendChart',
  'GoalShbTrendModal': 'setShowGoalShbTrendModal, date, todayStr, goalShbDrillSeller, setGoalShbDrillSeller, allMembers, processedGroups, goalShbExpandedTl, setGoalShbExpandedTl, GoalShbTrendChart',
  'HourlyViewModal': 'setShowHourlyView, styles, globalFinalLta, HOUR_SLOTS, hourlySeller, setHourlySeller'
};

modals.forEach(m => {
  let innerBody = m.rawJsx;
  
  // Clean IIFE wrapper
  let match = innerBody.match(/^(?:async\s*)?\(\)\s*=>\s*\{([\s\S]*)\}\s*\(\)$/);
  if (!match) {
    match = innerBody.match(/^(?:async\s*)?\(\)\s*=>\s*\{([\s\S]*)\}$/);
  }
  if (match) {
    innerBody = match[1].trim();
  } else {
    // If it starts with () => {, strip it manually
    if (innerBody.startsWith('() => {')) {
      innerBody = innerBody.slice(7);
      if (innerBody.endsWith('})()')) innerBody = innerBody.slice(0, -4);
      else if (innerBody.endsWith('}')) innerBody = innerBody.slice(0, -1);
    }
  }

  const propsStr = modalPropsMap[m.componentName] || '';

  const compContent = `import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
${m.componentName === 'HourlyViewModal' || m.componentName === 'NoLeadsModal' ? "import styles from '../L1SellerViewPage.module.css';\n" : ''}

export default function ${m.componentName}(props: any) {
  const { ${propsStr} } = props;

  // Render logic extracted from L1SellerViewPage
  ${innerBody.includes('return (') ? innerBody : 'return (' + innerBody + ');'}
}
`;
  fs.writeFileSync(`src/features/tl/components/${m.componentName}.tsx`, compContent, 'utf8');
  
  // Replace in main file
  content = content.replace(m.fullBlock, `<${m.componentName} {...{ ${propsStr} }} />`);
});

// Import the components at the top of L1SellerViewPage.tsx
const imports = `import NoLeadsModal from './components/NoLeadsModal';
import MheTrendModal from './components/MheTrendModal';
import GoalShbTrendModal from './components/GoalShbTrendModal';
import HourlyViewModal from './components/HourlyViewModal';\n`;

content = content.replace("import Loader from '@/components/ui/Loader'", "import Loader from '@/components/ui/Loader'\n" + imports);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Extracted modals successfully version 2!');
