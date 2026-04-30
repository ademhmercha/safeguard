-- Migration 002: Enhanced monitoring — app sessions, browser history, search terms

-- Per-session app tracking (open → close with duration)
CREATE TABLE app_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  package_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_secs INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_app_sessions_child_date ON app_sessions(child_profile_id, started_at DESC);

-- Browser URL visit history
CREATE TABLE browser_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  domain TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL,
  browser_app TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_browser_history_child_date ON browser_history(child_profile_id, visited_at DESC);
CREATE INDEX idx_browser_history_domain ON browser_history(child_profile_id, domain);

-- Search terms (Google, YouTube, etc.)
CREATE TABLE keylog_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  source_app TEXT NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_keylog_child_date ON keylog_entries(child_profile_id, searched_at DESC);

-- RLS
ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE keylog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents view child app sessions" ON app_sessions FOR SELECT
  USING (child_profile_id IN (
    SELECT cp.id FROM child_profiles cp JOIN users u ON u.id = cp.parent_id WHERE u.supabase_id = auth.uid()
  ));

CREATE POLICY "Parents view child browser history" ON browser_history FOR SELECT
  USING (child_profile_id IN (
    SELECT cp.id FROM child_profiles cp JOIN users u ON u.id = cp.parent_id WHERE u.supabase_id = auth.uid()
  ));

CREATE POLICY "Parents view child searches" ON keylog_entries FOR SELECT
  USING (child_profile_id IN (
    SELECT cp.id FROM child_profiles cp JOIN users u ON u.id = cp.parent_id WHERE u.supabase_id = auth.uid()
  ));

-- Add BLOCKED_SITE_ATTEMPT to alerts check constraint
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN ('SCREEN_TIME_EXCEEDED','BEDTIME_VIOLATION','BLOCKED_APP_ATTEMPT','DEVICE_OFFLINE','UNUSUAL_ACTIVITY','BLOCKED_SITE_ATTEMPT'));
