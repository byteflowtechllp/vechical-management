-- Supabase Database Schema for Vehicle Management App
-- Run this SQL in your Supabase SQL Editor to create the tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  "vehicleNumber" TEXT NOT NULL,
  "modelType" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
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

-- Credits table
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  "jobId" TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('online', 'cash')),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_vehicleId ON jobs("vehicleId");
CREATE INDEX IF NOT EXISTS idx_credits_jobId ON credits("jobId");
CREATE INDEX IF NOT EXISTS idx_expenses_vehicleId ON expenses("vehicleId");
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicleNumber ON vehicles("vehicleNumber");

-- Enable Row Level Security (RLS)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can customize these later)
-- For now, allowing anonymous access since we're using passcode auth
CREATE POLICY "Allow all operations on vehicles" ON vehicles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on jobs" ON jobs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on credits" ON credits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updatedAt
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

