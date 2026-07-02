const https = require('https');
require('dotenv').config({ path: '.env.local' });

const options = {
  hostname: 'yswnyfxmdvrzsezlumop.supabase.co',
  path: '/rest/v1/daily_allotment?select=*&limit=1',
  method: 'GET',
  headers: {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Response:", res.statusCode, data);
  });
});
req.on('error', (e) => console.error(e));
req.end();
