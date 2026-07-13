-- Run this in your Supabase SQL Editor

-- 1. Create the table
CREATE TABLE user_session_logs (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    date DATE NOT NULL,
    tab_name TEXT NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_email, date, tab_name)
);

-- 2. Create the optimized RPC function
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
