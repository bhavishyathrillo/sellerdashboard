require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
CREATE OR REPLACE FUNCTION update_session_time(
  p_email TEXT,
  p_date DATE,
  p_tabs JSONB
) RETURNS void AS $$
DECLARE
  existing_tabs JSONB;
  k TEXT;
  v INTEGER;
BEGIN
  -- 1. DELETE ANY LOGS FROM PREVIOUS MONTHS (Keep only current month)
  DELETE FROM user_session_logs 
  WHERE date_trunc('month', date) < date_trunc('month', CURRENT_DATE);

  DELETE FROM user_action_logs 
  WHERE date_trunc('month', created_at) < date_trunc('month', CURRENT_DATE);

  -- 2. Insert an empty row if it doesn't exist
  INSERT INTO user_session_logs (user_email, date, tabs_time)
  VALUES (p_email, p_date, '{}'::jsonb)
  ON CONFLICT (user_email, date) DO NOTHING;

  -- 3. Get the current JSON
  SELECT tabs_time INTO existing_tabs
  FROM user_session_logs
  WHERE user_email = p_email AND date = p_date
  FOR UPDATE;

  -- 4. Add the new time to the existing time for each tab
  FOR k, v IN SELECT * FROM jsonb_each_text(p_tabs)
  LOOP
    existing_tabs := jsonb_set(
      existing_tabs, 
      ARRAY[k], 
      to_jsonb(COALESCE((existing_tabs->>k)::int, 0) + v)
    );
  END LOOP;

  -- 5. Save the merged JSON
  UPDATE user_session_logs
  SET tabs_time = existing_tabs
  WHERE user_email = p_email AND date = p_date;
END;
$$ LANGUAGE plpgsql;
`;

async function run() {
  // We don't have a direct raw query method in supabase-js v2 unless we use RPC
  // Wait, I can just create a generic postgres connection or use psql.
  // Actually, I can't easily run arbitrary SQL via supabase-js without an RPC that executes SQL.
  // Let me just add the cleanup logic directly in the next.js API routes!
  console.log("Need to do it via API");
}
run();
