# Supabase 404 Error Troubleshooting

## Common Causes of 404 Errors

### 1. **Tables Not Created**
The most common cause is that the database tables haven't been created yet.

**Solution**: Run the SQL schema in Supabase SQL Editor

### 2. **Wrong Table Name**
Supabase uses lowercase table names, but your schema might have uppercase.

**Solution**: Check table names match exactly

### 3. **RLS (Row Level Security) Blocking**
RLS policies might be preventing access.

**Solution**: Temporarily disable RLS to test, or fix policies

## Step-by-Step Fix

### Step 1: Verify Tables Exist

1. Go to Supabase Dashboard → **Table Editor**
2. Check if you see these tables:
   - `vehicles`
   - `jobs`
   - `credits`
   - `expenses`

If tables are missing → Go to Step 2

### Step 2: Create Tables

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire `supabase-schema.sql` file
4. Click **Run**
5. Verify tables appear in Table Editor

### Step 3: Check RLS Policies

The schema includes RLS policies. If you're testing without authentication:

**Option A: Disable RLS Temporarily** (for testing)

```sql
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
```

**Option B: Fix RLS Policies** (production-ready)

The current policies check for `auth.role() = 'authenticated'`. For a public app without authentication, update the policies:

```sql
-- Allow public access (for development)
DROP POLICY IF EXISTS "Authenticated users can insert vehicles." ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can update their vehicles." ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete their vehicles." ON vehicles;

CREATE POLICY "Public can insert vehicles." ON vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update vehicles." ON vehicles FOR UPDATE USING (true);
CREATE POLICY "Public can delete vehicles." ON vehicles FOR DELETE USING (true);

-- Repeat for jobs, credits, expenses...
```

### Step 4: Verify API Endpoint

Test with a simple query:

```bash
curl 'https://npxzxuzaouzoiwfftypc.supabase.co/rest/v1/vehicles?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Step 5: Check Table Names

Supabase REST API uses lowercase table names. Verify your query uses:
- ✅ `vehicles` (lowercase)
- ❌ `Vehicles` (uppercase - will fail)

## Quick Test Query

Run this in SQL Editor to test:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vehicles', 'jobs', 'credits', 'expenses');

-- Insert a test vehicle
INSERT INTO vehicles (id, "vehicleNumber", "modelType") 
VALUES ('test-123', 'TEST001', 'Sedan');

-- Query it back
SELECT * FROM vehicles WHERE id = 'test-123';
```

## Environment Variables

Make sure your `.env` file has:

```env
VITE_SUPABASE_URL=https://npxzxuzaouzoiwfftypc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHp4dXphb3V6b2l3ZmZ0eXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjYzNjMsImV4cCI6MjA3NzQwMjM2M30.oxEoD5tEVvKjI7ygQzjRoABBNGygk0q3sAxNcpUsH0o
```

## Common 404 Patterns

| Error | Cause | Solution |
|-------|-------|----------|
| `404 Not Found` | Table doesn't exist | Run schema SQL |
| `404 relation does not exist` | Table name wrong | Check case sensitivity |
| `401 Unauthorized` | RLS blocking | Update/disable RLS policies |
| `404 missing FROM-clause` | SQL syntax error | Check query syntax |

## Next Steps

1. ✅ Verify tables exist in Table Editor
2. ✅ Run `supabase-schema.sql` if missing
3. ✅ Update RLS policies for public access (if needed)
4. ✅ Test with curl or Supabase dashboard
5. ✅ Restart dev server after updating `.env`

