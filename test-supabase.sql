-- Quick test to verify tables exist and check RLS status
-- Run this in Supabase SQL Editor

-- 1. Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vehicles', 'jobs', 'credits', 'expenses')
ORDER BY table_name;

-- 2. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('vehicles', 'jobs', 'credits', 'expenses');

-- 3. Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('vehicles', 'jobs', 'credits', 'expenses');

-- 4. Test insert (if tables exist)
-- Uncomment to test:
-- INSERT INTO vehicles (id, "vehicleNumber", "modelType") 
-- VALUES ('test-' || NOW()::text, 'TEST001', 'Sedan')
-- ON CONFLICT (id) DO NOTHING;

-- 5. Test query
SELECT COUNT(*) as vehicle_count FROM vehicles;

