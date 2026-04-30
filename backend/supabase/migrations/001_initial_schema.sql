-- SafeGuard Initial Schema Migration
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (mirrors Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PARENT' CHECK (role IN ('PARENT', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Child profiles
CREATE TABLE child_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age BETWEEN 1 AND 17),
  avatar_url TEXT,
  daily_screen_limit INTEGER NOT NULL DEFAULT 120,
  bedtime_start TEXT,
  bedtime_end TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Devices
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_model TEXT,
  os_version TEXT,
  fcm_token TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  pairing_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App usage tracking
CREATE TABLE app_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  package_name TEXT NOT NULL,
  usage_minutes INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_profile_id, package_name, date)
);

-- Screen time records
CREATE TABLE screen_time_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_profile_id, date)
);

-- Restriction policies
CREATE TABLE restriction_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('APP_BLOCK', 'SCHEDULE', 'CONTENT_FILTER')),
  package_name TEXT,
  app_name TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT TRUE,
  schedule_start TEXT,
  schedule_end TEXT,
  days_of_week INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SCREEN_TIME_LIMIT','APP_BLOCKED','DEVICE_LOCKED','BEDTIME_ALERT','GENERAL')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Device commands
CREATE TABLE device_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  command TEXT NOT NULL CHECK (command IN ('LOCK_DEVICE','UNLOCK_DEVICE','BLOCK_APP','UNBLOCK_APP','UPDATE_LIMITS','SYNC_POLICIES')),
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DELIVERED','EXECUTED','FAILED')),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('SCREEN_TIME_EXCEEDED','BEDTIME_VIOLATION','BLOCKED_APP_ATTEMPT','DEVICE_OFFLINE','UNUSUAL_ACTIVITY')),
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_child_profiles_parent_id ON child_profiles(parent_id);
CREATE INDEX idx_devices_child_profile_id ON devices(child_profile_id);
CREATE INDEX idx_app_usage_child_date ON app_usage(child_profile_id, date);
CREATE INDEX idx_screen_time_child_date ON screen_time_records(child_profile_id, date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_device_commands_device_id ON device_commands(device_id, status);
CREATE INDEX idx_alerts_child_id ON alerts(child_profile_id, is_resolved);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE restriction_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (supabase_id = auth.uid());
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (supabase_id = auth.uid());

CREATE POLICY "Parents can manage their children" ON child_profiles
  FOR ALL USING (parent_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()));

CREATE POLICY "Parents can manage their devices" ON devices
  FOR ALL USING (child_profile_id IN (
    SELECT cp.id FROM child_profiles cp
    JOIN users u ON u.id = cp.parent_id
    WHERE u.supabase_id = auth.uid()
  ));

CREATE POLICY "Parents can view child app usage" ON app_usage
  FOR SELECT USING (child_profile_id IN (
    SELECT cp.id FROM child_profiles cp
    JOIN users u ON u.id = cp.parent_id
    WHERE u.supabase_id = auth.uid()
  ));

CREATE POLICY "Parents can view screen time" ON screen_time_records
  FOR SELECT USING (child_profile_id IN (
    SELECT cp.id FROM child_profiles cp
    JOIN users u ON u.id = cp.parent_id
    WHERE u.supabase_id = auth.uid()
  ));

CREATE POLICY "Parents manage restriction policies" ON restriction_policies
  FOR ALL USING (child_profile_id IN (
    SELECT cp.id FROM child_profiles cp
    JOIN users u ON u.id = cp.parent_id
    WHERE u.supabase_id = auth.uid()
  ));

CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_child_profiles_updated_at BEFORE UPDATE ON child_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restriction_policies_updated_at BEFORE UPDATE ON restriction_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
