-- Supabase Passcodes Table for Authentication
-- Run this SQL in your Supabase SQL Editor to create the passcodes table

-- Passcodes table for authentication
CREATE TABLE IF NOT EXISTS passcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passcode TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('view', 'owner')),
  description TEXT DEFAULT '',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_passcodes_passcode ON passcodes(passcode);

-- Enable Row Level Security
ALTER TABLE passcodes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading passcodes (for authentication)
-- Note: In production, you might want to hash passcodes and use a more secure method
CREATE POLICY "Allow read access to passcodes" ON passcodes
  FOR SELECT USING (true);

-- Insert default passcodes (you should change these!)
-- Default view passcode: 1234
-- Default owner passcode: 5678
INSERT INTO passcodes (passcode, role, description) VALUES
  ('1234', 'view', 'View-only access passcode'),
  ('5678', 'owner', 'Owner/Admin passcode with full access')
ON CONFLICT (passcode) DO NOTHING;

-- Function to update updatedAt timestamp
CREATE TRIGGER update_passcodes_updated_at BEFORE UPDATE ON passcodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

