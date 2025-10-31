-- Supabase Passcodes Table for Authentication
-- Run this SQL in your Supabase SQL Editor to create the passcodes table

-- Passcodes table for authentication (username + passcode)
CREATE TABLE IF NOT EXISTS passcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL,
  passcode TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('view', 'owner')),
  description TEXT DEFAULT '',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, passcode)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_passcodes_username_passcode ON passcodes(username, passcode);
CREATE INDEX IF NOT EXISTS idx_passcodes_username ON passcodes(username);

-- Enable Row Level Security
ALTER TABLE passcodes ENABLE ROW LEVEL SECURITY;


-- Create policy to allow reading passcodes (for authentication)
-- Note: In production, you might want to hash passcodes and use a more secure method
CREATE POLICY "Allow read access to passcodes" ON passcodes
  FOR SELECT USING (true);

-- Insert default users (you should change these!)
-- Default user: admin / 1234 (view) and admin / 5678 (owner)
-- You can create multiple users with different usernames
INSERT INTO passcodes (username, passcode, role, description) VALUES
  ('admin', '1234', 'view', 'Admin user - View-only access'),
  ('admin', '5678', 'owner', 'Admin user - Owner/Admin access'),
  ('user1', '1234', 'view', 'User1 - View-only access'),
  ('user1', '5678', 'owner', 'User1 - Owner access')
ON CONFLICT (username, passcode) DO NOTHING;

-- Function to update updatedAt timestamp
CREATE TRIGGER update_passcodes_updated_at BEFORE UPDATE ON passcodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

