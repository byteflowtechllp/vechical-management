# Migration Guide: Adding Username Support

This guide will help you migrate your existing Supabase database to support username-based authentication.

## Migration Steps

### Step 1: Run the Migration SQL

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `migrate-add-username.sql`
5. Click **Run** (or press `Ctrl/Cmd + Enter`)

This migration will:
- Add `username` column to `passcodes` table
- Add `username` column to `vehicles` table
- Add `username` column to `jobs` table
- Add `username` column to `credits` table
- Add `username` column to `expenses` table
- Create necessary indexes
- Set default username to 'admin' for existing data
- Insert default user credentials

### Step 2: Verify Migration

Run this query to verify all columns were added:

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('passcodes', 'vehicles', 'jobs', 'credits', 'expenses')
  AND column_name = 'username'
ORDER BY table_name;
```

You should see 5 rows, one for each table.

### Step 3: Update Existing Data (if needed)

If you have existing data and want to assign it to specific users, you can update it:

```sql
-- Update vehicles for a specific user
UPDATE vehicles SET username = 'yourusername' WHERE id = 'vehicle-id';

-- Update all data for a user
UPDATE vehicles SET username = 'yourusername';
UPDATE jobs SET username = 'yourusername';
UPDATE credits SET username = 'yourusername';
UPDATE expenses SET username = 'yourusername';
```

### Step 4: Test Authentication

1. Deploy your updated app
2. Try logging in with:
   - Username: `admin`, Passcode: `1234` (view access)
   - Username: `admin`, Passcode: `5678` (owner access)

### Step 5: Create New Users

To create new users, run:

```sql
INSERT INTO passcodes (username, passcode, role, description) VALUES
  ('newuser', 'password123', 'owner', 'New User - Owner access'),
  ('viewonly', 'password456', 'view', 'View-only user')
ON CONFLICT (username, passcode) DO NOTHING;
```

## Troubleshooting

### Error: "column username does not exist"
- Make sure you ran the migration SQL script
- Check that the migration completed successfully
- Verify using the verification query above

### Error: "duplicate key value violates unique constraint"
- This means a username+passcode combination already exists
- Either use a different username or passcode
- Or update the existing record instead of inserting

### Existing data shows as 'admin'
- This is expected - the migration sets default username to 'admin'
- Update the data manually if you want to assign it to different users
- Or delete old data and start fresh

### Need to remove DEFAULT constraint
- Uncomment the last section in `migrate-add-username.sql`
- This will require username for all new inserts
- Only do this after migrating existing data

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove username columns (WARNING: This will delete the username data!)
ALTER TABLE passcodes DROP COLUMN IF EXISTS username;
ALTER TABLE vehicles DROP COLUMN IF EXISTS username;
ALTER TABLE jobs DROP COLUMN IF EXISTS username;
ALTER TABLE credits DROP COLUMN IF EXISTS username;
ALTER TABLE expenses DROP COLUMN IF EXISTS username;

-- Re-add unique constraint on passcode only
ALTER TABLE passcodes ADD CONSTRAINT passcodes_passcode_key UNIQUE (passcode);
```

⚠️ **Warning**: Rollback will lose all username associations!

