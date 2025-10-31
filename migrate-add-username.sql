-- Migration script to add username column to existing tables
-- Run this in your Supabase SQL Editor to update existing tables

-- Step 1: Update passcodes table
-- First, drop the old unique constraint on passcode if it exists
ALTER TABLE passcodes DROP CONSTRAINT IF EXISTS passcodes_passcode_key;

-- Add username column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='passcodes' AND column_name='username') THEN
    ALTER TABLE passcodes ADD COLUMN username TEXT NOT NULL DEFAULT 'admin';
  END IF;
END $$;

-- Add unique constraint on (username, passcode)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'passcodes_username_passcode_key'
  ) THEN
    ALTER TABLE passcodes ADD CONSTRAINT passcodes_username_passcode_key 
      UNIQUE (username, passcode);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_passcodes_username_passcode ON passcodes(username, passcode);
CREATE INDEX IF NOT EXISTS idx_passcodes_username ON passcodes(username);

-- Step 2: Update vehicles table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='vehicles' AND column_name='username') THEN
    ALTER TABLE vehicles ADD COLUMN username TEXT NOT NULL DEFAULT 'admin';
    CREATE INDEX IF NOT EXISTS idx_vehicles_username ON vehicles(username);
  END IF;
END $$;

-- Step 3: Update jobs table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='jobs' AND column_name='username') THEN
    ALTER TABLE jobs ADD COLUMN username TEXT NOT NULL DEFAULT 'admin';
    CREATE INDEX IF NOT EXISTS idx_jobs_username ON jobs(username);
  END IF;
END $$;

-- Step 4: Update credits table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='credits' AND column_name='username') THEN
    ALTER TABLE credits ADD COLUMN username TEXT NOT NULL DEFAULT 'admin';
    CREATE INDEX IF NOT EXISTS idx_credits_username ON credits(username);
  END IF;
END $$;

-- Step 5: Update expenses table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='expenses' AND column_name='username') THEN
    ALTER TABLE expenses ADD COLUMN username TEXT NOT NULL DEFAULT 'admin';
    CREATE INDEX IF NOT EXISTS idx_expenses_username ON expenses(username);
  END IF;
END $$;

-- Step 6: Update existing passcodes data (if any)
-- If you have existing passcodes without username, set them to 'admin'
UPDATE passcodes SET username = 'admin' WHERE username IS NULL OR username = '';

-- Step 7: Insert default users (if they don't exist)
INSERT INTO passcodes (username, passcode, role, description) VALUES
  ('admin', '1234', 'view', 'Admin user - View-only access'),
  ('admin', '5678', 'owner', 'Admin user - Owner/Admin access'),
  ('user1', '1234', 'view', 'User1 - View-only access'),
  ('user1', '5678', 'owner', 'User1 - Owner access')
ON CONFLICT (username, passcode) DO NOTHING;

-- Step 8: Remove DEFAULT constraint after migration (optional, for new inserts)
-- Uncomment these if you want to require username for new rows
-- ALTER TABLE vehicles ALTER COLUMN username DROP DEFAULT;
-- ALTER TABLE jobs ALTER COLUMN username DROP DEFAULT;
-- ALTER TABLE credits ALTER COLUMN username DROP DEFAULT;
-- ALTER TABLE expenses ALTER COLUMN username DROP DEFAULT;

