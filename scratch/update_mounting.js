const fs = require('fs');
const path = require('path');

function updatePage(file) {
  const filePath = path.join(process.cwd(), 'components', 'pages', file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace viewMode === 'personal' logic
  // For L2:
  const search1L2 = `  if (viewMode === 'personal') {
    return (
      <div className={styles.page} style={{ paddingTop: '16px', paddingBottom: 0 }}>
        {members.length > 1 && (
          <div className={styles.toggleContainer} style={{ marginLeft: '16px', marginTop: '8px', width: 'fit-content' }}>
            <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'personal' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('personal')}>Personal</button>
            <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'team' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('team')}>My Team ({members.length})</button>
          </div>
        )}
        {/* We reuse the exact SellerViewPage completely isolated */}
        <div style={{ margin: '-24px' }}>
          <SellerViewPage session={session} />
        </div>
      </div>
    )
  }`;

  const replace1L2 = `  const toggleNode = members.length > 1 ? (
    <div className={styles.toggleContainer}>
      <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'personal' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('personal')}>Personal</button>
      <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'team' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('team')}>My Team ({members.length})</button>
    </div>
  ) : undefined;`;

  // For L1:
  const search1L1 = `  if (viewMode === 'personal') {
    const toggleNode = (
      <div className={styles.toggleContainer}>
        <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'personal' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('personal')}>Personal</button>
        <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'team' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('team')}>My Team</button>
      </div>
    );

    return <SellerViewPage session={session} headerCenterContent={toggleNode} />
  }`;

  const replace1L1 = `  const toggleNode = (
    <div className={styles.toggleContainer}>
      <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'personal' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('personal')}>Personal</button>
      <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'team' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('team')}>My Team</button>
    </div>
  );`;


  // 1. Do replace
  if (content.includes(search1L2)) {
    content = content.replace(search1L2, replace1L2);
  } else if (content.includes(search1L1)) {
    content = content.replace(search1L1, replace1L1);
  } else {
    console.log("Could not find part 1 in " + file);
    return;
  }

  // 2. Remove loading return completely
  const loadingStrL2 = `  if (loading) return <Loader text="Loading TL dashboard..." />`;
  const loadingStrL1 = `  if (loading) return <Loader text="Loading CM dashboard..." />`;
  
  if (content.includes(loadingStrL2)) {
    content = content.replace(loadingStrL2, "");
  } else if (content.includes(loadingStrL1)) {
    content = content.replace(loadingStrL1, "");
  } else {
    console.log("Could not find part 2 in " + file);
  }

  // 3. Wrap return (
  const search3 = `  return (
    <div className={styles.page}>`;
  const replace3 = `  return (
    <>
      <div style={{ display: viewMode === 'personal' ? 'block' : 'none' }}>
        <SellerViewPage session={session} headerCenterContent={toggleNode} />
      </div>
      <div style={{ display: viewMode === 'team' ? 'block' : 'none' }}>
        {loading ? (
          <Loader text="Loading dashboard..." />
        ) : (
          <div className={styles.page}>`;

  if (content.includes(search3)) {
    content = content.replace(search3, replace3);
  } else {
    console.log("Could not find part 3 in " + file);
  }

  // 4. Wrap end
  const search4 = `    </div>
  )
}`;
  const replace4 = `          </div>
        )}
      </div>
    </>
  )
}`;

  if (content.endsWith(search4 + '\n') || content.endsWith(search4)) {
    content = content.slice(0, content.lastIndexOf(search4)) + replace4 + '\n';
  } else {
    console.log("Could not find part 4 in " + file);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully updated " + file);
}

updatePage('L2SellerViewPage.tsx');
updatePage('L1SellerViewPage.tsx');
