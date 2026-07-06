const fs = require('fs');
const file = 'components/pages/L2SellerViewPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const toggleUI = (stateVar) => `
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}} onClick={e => e.stopPropagation()}>
          <button onClick={() => set${stateVar}('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='cards'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => set${stateVar}('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='table'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
`;

code = code.replace(
  `<h2 className={styles.sectionTitle}>Break / Unavailability</h2>\n        </div>\n      </div>`,
  `<h2 className={styles.sectionTitle}>Break / Unavailability</h2>\n        </div>\n${toggleUI('S3View')}\n      </div>`
);

const s3ContentOriginal = code.match(/<div className={sellerStyles.sectionContent}>\s*<div className={styles.tableWrap}>\s*<table className={styles.table}>[\s\S]*?<\/div>\s*<\/div>/g)[1]; // Get the S3 block, wait, I can just replace the specific block

