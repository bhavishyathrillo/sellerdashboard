const https = require('https');
require('dotenv').config({ path: '.env.local' });

const options = {
  hostname: 'yswnyfxmdvrzsezlumop.supabase.co',
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
});
req.end();
