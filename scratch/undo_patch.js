const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx'
];

files.forEach(path => {
  let code = fs.readFileSync(path, 'utf8');

  // Remove the TeamBreakdownGraphs definition
  const startIdx = code.indexOf('function TeamBreakdownGraphs');
  if (startIdx !== -1) {
    const endIdx = code.indexOf('}\n', code.indexOf('return (\n', startIdx));
    if (endIdx !== -1) {
      code = code.substring(0, startIdx) + code.substring(endIdx + 2);
    }
  }

  // Remove the component usage
  // {/* NEW: Team Breakdown Graphs */}
  // <TeamBreakdownGraphs members={allMembers} date={date} />
  code = code.replace(/\{\/\* NEW: Team Breakdown Graphs \*\/\}[\s\S]*?<TeamBreakdownGraphs.*?\/>\n\n\s*/g, '');

  // Restore the hidden tables
  // <div className={styles.sectionHeaderCollapsible} style={{display: "none"}} onClick={() => null}>
  code = code.replace(/<div className=\{styles\.sectionHeaderCollapsible\} style=\{\{display: "none"\}\} onClick=\{.*?s3.*?\}>/g, '<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === \'s3\' ? null : \'s3\')}>');
  code = code.replace(/<div className=\{styles\.sectionHeaderCollapsible\} style=\{\{display: "none"\}\} onClick=\{.*?s4.*?\}>/g, '<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === \'s4\' ? null : \'s4\')}>');
  code = code.replace(/<div className=\{styles\.sectionHeaderCollapsible\} style=\{\{display: "none"\}\} onClick=\{.*?s5.*?\}>/g, '<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === \'s5\' ? null : \'s5\')}>');

  fs.writeFileSync(path, code);
  console.log('Restored', path);
});
