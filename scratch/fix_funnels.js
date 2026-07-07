const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx',
  'components/pages/AdminLTAPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // We need to replace the `steps.map` with the filtered logic.
  // Because the exact `isNotUsed` line varies slightly (e.g. `(teamData as any)?.kalpit` vs `(adminData as any)?.kalpit` vs `(data as any)?.kalpit`), we will match dynamically.
  
  // We'll replace occurrences by slicing the string.

  let newContent = content;

  // We'll replace occurrences by slicing the string.
  let startIndex = 0;
  while (true) {
    const mapMatch = newContent.indexOf("return steps.map((step, idx) => {", startIndex);
    if (mapMatch === -1) break;

    const endMatch = newContent.indexOf("          })()}", mapMatch); // usually followed by this, but could be different
    if (endMatch === -1) break;

    // Actually, `isNotUsed` is a great anchor.
    const isNotUsedMatch = newContent.indexOf("const isNotUsed = step.id !== 'planned' && step.id !== 'final' &&", mapMatch);
    if (isNotUsedMatch === -1 || isNotUsedMatch > endMatch) {
      startIndex = mapMatch + 10;
      continue;
    }

    const endOfIsNotUsed = newContent.indexOf(";", isNotUsedMatch);
    const kalpitLogic = newContent.substring(isNotUsedMatch + "const isNotUsed = step.id !== 'planned' && step.id !== 'final' &&".length, endOfIsNotUsed).trim();

    // The return ( <div ... )
    const returnStart = newContent.indexOf("return (", endOfIsNotUsed);
    
    // We can just inject the actualSteps logic right before `return steps.map(`
    const beforeMap = newContent.substring(0, mapMatch);
    
    // Find the end of the map callback
    let closingBrace = -1;
    let openBraces = 0;
    for(let i = returnStart; i < newContent.length; i++) {
        if(newContent[i] === '{') openBraces++;
        if(newContent[i] === '}') {
            openBraces--;
            if(openBraces === 0) {
               // This is the closing brace of `return ( ... )`
               // The next `}` is the closing brace of the map function
               closingBrace = newContent.indexOf("}", i + 1);
               break;
            }
        }
    }

    const mapBody = newContent.substring(returnStart, closingBrace);

    const replacementLogic = `const usedSteps = steps.filter((step) => {
              const isNotUsed = step.id !== 'planned' && step.id !== 'final' &&
                ${kalpitLogic};
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

            return actualSteps.map((step, idx) => {
`;

    let cleanedMapBody = mapBody
       .replace(/opacity: isNotUsed \? 0\.6 : 1/g, "")
       .replace(/,  \}\}/g, " } }")
       .replace(/isNotUsed \? '[^']+' : /g, "")
       .replace(/isNotUsed \? [^:]+ : /g, "")
       .replace(/\{isNotUsed && <span[^>]+>NOT USED<\/span>\}/g, "")
       .replace(/\{isNotUsed && \(\s*<span[^>]+>NOT USED<\/span>\s*\)\}/g, "")
       .replace(/idx < steps\.length - 1/g, "idx < actualSteps.length - 1");

    newContent = beforeMap + replacementLogic + cleanedMapBody + newContent.substring(closingBrace);

    startIndex = beforeMap.length + replacementLogic.length + cleanedMapBody.length;
  }

  fs.writeFileSync(file, newContent);
  console.log("Fixed", file);
});
