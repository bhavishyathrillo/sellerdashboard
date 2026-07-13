-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pnr_pipeline_submissions (
    id SERIAL PRIMARY KEY,
    seller_email TEXT NOT NULL,
    date DATE NOT NULL,
    is_bottomline_focus BOOLEAN DEFAULT false,
    daily_required INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    pnrs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(seller_email, date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pnr_pipeline_email ON pnr_pipeline_submissions(seller_email);
CREATE INDEX IF NOT EXISTS idx_pnr_pipeline_date ON pnr_pipeline_submissions(date);
