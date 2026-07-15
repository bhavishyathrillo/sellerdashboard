-- Run this in your Supabase SQL Editor

-- 1. Create the TIME TRACKING table (Single Row per User per Day)
DROP TABLE IF EXISTS user_session_logs; -- Drops the old multi-row table
CREATE TABLE user_session_logs (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    date DATE NOT NULL,
    tabs_time JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_email, date)
);

-- 2. Create the ACTION TRACKING table
CREATE TABLE IF NOT EXISTS user_action_logs (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_user_action_logs_email ON user_action_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_user_action_logs_action ON user_action_logs(action_type);

-- 4. Create the optimized RPC function for bulk time tracking in a single row
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
  -- Insert an empty row if it doesn't exist
  INSERT INTO user_session_logs (user_email, date, tabs_time)
  VALUES (p_email, p_date, '{}'::jsonb)
  ON CONFLICT (user_email, date) DO NOTHING;

  -- Get the current JSON
  SELECT tabs_time INTO existing_tabs
  FROM user_session_logs
  WHERE user_email = p_email AND date = p_date
  FOR UPDATE;

  -- Add the new time to the existing time for each tab
  FOR k, v IN SELECT * FROM jsonb_each_text(p_tabs)
  LOOP
    existing_tabs := jsonb_set(
      existing_tabs, 
      ARRAY[k], 
      to_jsonb(COALESCE((existing_tabs->>k)::int, 0) + v)
    );
  END LOOP;

  -- Save the merged JSON
  UPDATE user_session_logs
  SET tabs_time = existing_tabs
  WHERE user_email = p_email AND date = p_date;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop the old audit_log table since we are completely replacing it
DROP TABLE IF EXISTS audit_log;
