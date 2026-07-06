const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx'
];

files.forEach(path => {
  let code = fs.readFileSync(path, 'utf8');

  // We inserted the hooks right after:
  // `const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)`
  // We need to extract them and place them further down.
  // The hooks block starts at `  // Canvas Refs for Monthly Breakdown` and ends at `  }, [teamPaxRows]);` or `  }, [cmPaxRows]);`
  
  const isL1 = path.includes('L1');
  const paxVar = isL1 ? 'cmPaxRows' : 'teamPaxRows';

  const startStr = '  // Canvas Refs for Monthly Breakdown';
  const endStr = `  }, [${paxVar}]);\n`;
  
  const startIdx = code.indexOf(startStr);
  const endIdx = code.indexOf(endStr, startIdx);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const hooksBlock = code.substring(startIdx, endIdx + endStr.length);
    // Remove it from current location
    code = code.substring(0, startIdx) + code.substring(endIdx + endStr.length);
    
    // Insert it before `return (`
    // However, there are multiple `return (`. We want the one for the main component.
    // The main component return is right before `<div className={styles.container}>`
    const insertTarget = '  return (\n    <div className={styles.container}>';
    if (code.includes(insertTarget)) {
      code = code.replace(insertTarget, hooksBlock + '\n' + insertTarget);
    } else {
      // Try just `return (` if it's the first one after the top level
      console.log('Target not found for', path);
    }
  }

  fs.writeFileSync(path, code);
  console.log('Moved hooks in', path);
});
