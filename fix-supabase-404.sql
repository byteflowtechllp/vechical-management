-- Fix Supabase 404 Error: Create tables and set up RLS
-- Run this ENTIRE script in Supabase SQL Editor (New Query)

-- Step 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  "vehicleNumber" TEXT NOT NULL,
  "modelType" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  "vehicleId" TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  budget DECIMAL(12, 2) NOT NULL,
  "billingCycle" TEXT NOT NULL CHECK ("billingCycle" IN ('one-time', 'monthly', 'daily')),
  "startDate" TIMESTAMP WITH TIME ZONE,
  "endDate" TIMESTAMP WITH TIME ZONE,
  "durationMonths" INTEGER,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create Credits table
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  "jobId" TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('online', 'cash')),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  "vehicleId" TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT DEFAULT '',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_jobs_vehicleId ON jobs("vehicleId");
CREATE INDEX IF NOT EXISTS idx_credits_jobId ON credits("jobId");
CREATE INDEX IF NOT EXISTS idx_expenses_vehicleId ON expenses("vehicleId");
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicleNumber ON vehicles("vehicleNumber");

-- Step 7: Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow all operations on jobs" ON jobs;
DROP POLICY IF EXISTS "Allow all operations on credits" ON credits;
DROP POLICY IF EXISTS "Allow all operations on expenses" ON expenses;

-- Drop old policies that might conflict
DROP POLICY IF EXISTS "Public vehicles are viewable by everyone." ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles." ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can update their vehicles." ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete their vehicles." ON vehicles;

DROP POLICY IF EXISTS "Public jobs are viewable by everyone." ON jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs." ON jobs;
DROP POLICY IF EXISTS "Authenticated users can update their jobs." ON jobs;
DROP POLICY IF EXISTS "Authenticated users can delete their jobs." ON jobs;

DROP POLICY IF EXISTS "Public credits are viewable by everyone." ON credits;
DROP POLICY IF EXISTS "Authenticated users can insert credits." ON credits;
DROP POLICY IF EXISTS "Authenticated users can update their credits." ON credits;
DROP POLICY IF EXISTS "Authenticated users can delete their credits." ON credits;

DROP POLICY IF EXISTS "Public expenses are viewable by everyone." ON expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses." ON expenses;
DROP POLICY IF EXISTS "Authenticated users can update their expenses." ON expenses;
DROP POLICY IF EXISTS "Authenticated users can delete their expenses." ON expenses;

-- Step 9: Create new policies that allow all operations
CREATE POLICY "Allow all operations on vehicles" ON vehicles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on jobs" ON jobs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on credits" ON credits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

-- Step 10: Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 11: Create triggers
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 12: Verify tables exist
SELECT 
  'Tables created successfully!' as status,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM (
  SELECT unnest(ARRAY['vehicles', 'jobs', 'credits', 'expenses']) as table_name
) t;

