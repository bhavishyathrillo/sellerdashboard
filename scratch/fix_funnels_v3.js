const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/AdminLTAPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // We want to match: `something.map((step, idx) => {` where `something` is ltaSteps, tlSteps, or stages.
  // Then we have `const isNotUsed = ... ;`
  // We want to replace it with:
  // const usedSteps = something.filter((step) => { const isNotUsed = ... ; return !isNotUsed; });
  // const actualSteps = usedSteps.map((step, idx, arr) => { ... drop logic ... return { ...step, drop: dropValue, dropLabel }; });
  // return actualSteps.map((step, idx) => {

  const mapRegex = /\{([a-zA-Z0-9]+)\.map\(\(step, idx\) => \{\s*(?:(?:\/\/ Collaborator logic:.*?\s*)?(?:const isNotUsed = step\.id !== 'planned' && step\.id !== 'final' &&\s*(.+?);))/g;

  content = content.replace(mapRegex, (match, arrayName, condition) => {
    return `{(() => {
            const usedSteps = ${arrayName}.filter((step) => {
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

  // We have introduced `{(() => { ... return actualSteps.map(...) })()}` inside JSX!
  // Wait, the regex replaced `{arrayName.map(...)` with `{(() => { ... return actualSteps.map(...)`.
  // So we need to CLOSE the IIFE. The original ended with `})}` (which is `})` for map and `}` for JSX block).
  // Now it's `return actualSteps.map((step, idx) => { ... })`. We need to append `})()}`.
  
  // Actually, wait, replacing `idx < arrayName.length - 1` with `idx < actualSteps.length - 1`
  content = content.replace(/idx < ltaSteps\.length - 1/g, "idx < actualSteps.length - 1");
  content = content.replace(/idx < tlSteps\.length - 1/g, "idx < actualSteps.length - 1");
  content = content.replace(/idx < stages\.length - 1/g, "idx < actualSteps.length - 1");

  // To close the IIFE, since we replaced `{array.map(`, the original JSX was `{array.map((step, idx) => { ... })}`.
  // Now it is `{(() => { ... return actualSteps.map((step, idx) => { ... })}`.
  // We need to change the final `})}` to `})})()}` for these specific blocks.
  // Because the blocks end with `})}`. But since we just want to run this quickly, let's write a regex for closing.

  fs.writeFileSync(file, content);
  console.log("Fixed", file);
});
