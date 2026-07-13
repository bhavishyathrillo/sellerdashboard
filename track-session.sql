-- Run this in your Supabase SQL Editor

-- 1. Create the TIME TRACKING table
CREATE TABLE IF NOT EXISTS user_session_logs (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    date DATE NOT NULL,
    tab_name TEXT NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_email, date, tab_name)
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

-- 4. Create the optimized RPC function for time tracking
CREATE OR REPLACE FUNCTION increment_session_time(
  p_email TEXT,
  p_date DATE,
  p_tab TEXT,
  p_seconds INTEGER
) RETURNS void AS $$
BEGIN
  INSERT INTO user_session_logs (user_email, date, tab_name, time_spent_seconds)
  VALUES (p_email, p_date, p_tab, p_seconds)
  ON CONFLICT (user_email, date, tab_name)
  DO UPDATE SET time_spent_seconds = user_session_logs.time_spent_seconds + p_seconds;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop the old audit_log table since we are completely replacing it
DROP TABLE IF EXISTS audit_log;
