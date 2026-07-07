const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx',
  'components/pages/AdminLTAPage.tsx',
  'components/pages/SellerViewPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Instead of complex AST or regex matching the entire block, we can just 
  // replace specific substrings globally if we are confident they only appear in the funnel.

  // 1. Find all `const isNotUsed = ...` and wrap the map
  // We can't just string replace the start because `steps.map((step, idx) => {` is generic.
  // Let's use regex with a callback to replace the `return steps.map(...)` block

  let newContent = content;

  // Let's replace the properties first, so we don't have dangling variables.
  newContent = newContent.replace(/opacity: isNotUsed \? 0\.6 : 1(,?)/g, "");
  newContent = newContent.replace(/isNotUsed \? '#333' : `\$\{step\.color\}40`/g, "`\${step.color}40`");
  newContent = newContent.replace(/isNotUsed \? '#555' : step\.color/g, "step.color");
  newContent = newContent.replace(/isNotUsed \? '#555' : '#F0EDE8'/g, "'#F0EDE8'");
  
  // Remove `{isNotUsed && <span ... NOT USED</span>}`
  newContent = newContent.replace(/\{isNotUsed && <span[^>]+>NOT USED<\/span>\}/g, "");
  newContent = newContent.replace(/\{isNotUsed && \([\s\S]*?<span[^>]+>NOT USED<\/span>\[\s\S]*?\)\}/g, "");
  // Actually, there's a multi-line one in some files:
  newContent = newContent.replace(/\{isNotUsed && \(\s*<span[^>]+>NOT USED<\/span>\s*\)\}/g, "");

  // Now replace `idx < steps.length - 1` with `idx < actualSteps.length - 1`
  // But ONLY in the funnels. We'll do it by replacing the start of the map block.

  const mapRegex = /return steps\.map\(\(step, idx\) => \{\s*(?:(?:\/\/ Collaborator logic:.*?\s*)?(?:const isNotUsed = step\.id !== 'planned' && step\.id !== 'final' &&\s*(.+?);))/g;
  
  newContent = newContent.replace(mapRegex, (match, condition) => {
    return `const usedSteps = steps.filter((step) => {
              const isNotUsed = step.id !== 'planned' && step.id !== 'final' &&
                ${condition};
              return !isNotUsed;
            });

            const actualSteps = usedSteps.map((step, idx, arr) => {
              if (idx === arr.length - 1) return step;
              const nextStep = arr[idx + 1];
              const dropValue = step.value - nextStep.value;
              let dropLabel = null;
              if (dropValue > 0) {
                if (nextStep.id === 'dynamic') dropLabel = 'Late login / inactive';
                else if (nextStep.id === 'hygiene') dropLabel = 'Hygiene penalty';
                else if (nextStep.id === 'goalComplete') dropLabel = 'Goal correction';
                else if (nextStep.id === 'final') dropLabel = 'Final adjustment';
              } else if (dropValue < 0) {
                dropLabel = 'Bonus added';
              }
              return { ...step, drop: dropValue, dropLabel };
            });

            return actualSteps.map((step, idx) => {`;
  });

  // Now replace `steps.length - 1` with `actualSteps.length - 1` BUT only after the replaced blocks.
  // It's safe to just replace `idx < steps.length - 1` with `idx < actualSteps.length - 1` everywhere because it's always used for actualSteps in this context.
  newContent = newContent.replace(/idx < steps\.length - 1/g, "idx < actualSteps.length - 1");

  fs.writeFileSync(file, newContent);
  console.log("Fixed", file);
});
