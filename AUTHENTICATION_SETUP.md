# Authentication Setup Guide

This app uses passcode-based authentication with role-based access control stored in Supabase.

## Features

- **Two Roles**:
  - `view` - Can view all data but cannot edit, add, or delete
  - `owner` - Full access, can perform all operations

- **Passcode Authentication**: Stored in Supabase database
- **Fallback Mode**: If Supabase is not configured, uses default passcodes

## Setup Instructions

### Step 1: Create Passcodes Table in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the SQL from `supabase-passcodes-schema.sql`:

```sql
-- This will create the passcodes table and insert default passcodes
```

Or manually run:

```sql
CREATE TABLE IF NOT EXISTS passcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passcode TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('view', 'owner')),
  description TEXT DEFAULT '',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passcodes_passcode ON passcodes(passcode);

ALTER TABLE passcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to passcodes" ON passcodes
  FOR SELECT USING (true);
```

### Step 2: Add Default Passcodes

The schema file includes default passcodes, but you can add custom ones:

**View-Only Passcode** (Default: `1234`)
```sql
INSERT INTO passcodes (passcode, role, description) VALUES
  ('1234', 'view', 'View-only access passcode')
ON CONFLICT (passcode) DO NOTHING;
```

**Owner Passcode** (Default: `5678`)
```sql
INSERT INTO passcodes (passcode, role, description) VALUES
  ('5678', 'owner', 'Owner/Admin passcode with full access')
ON CONFLICT (passcode) DO NOTHING;
```

### Step 3: Configure Environment Variables

Make sure your Vercel/deployment has Supabase environment variables set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See `VERCEL_ENV_SETUP.md` for details.

### Step 4: Test Authentication

1. **Test View Role**: Enter passcode `1234` (or your view passcode)
   - Should see view-only notice
   - Edit/delete buttons should be hidden
   - "Add" buttons should be hidden

2. **Test Owner Role**: Enter passcode `5678` (or your owner passcode)
   - Should see all edit buttons
   - Can add, edit, and delete

## Fallback Mode (No Supabase)

If Supabase is not configured, the app falls back to hardcoded passcodes:
- `1234` = view role
- `5678` = owner role

**Note**: For production, always use Supabase for better security and centralized passcode management.

## Managing Passcodes

### Add New Passcode

```sql
INSERT INTO passcodes (passcode, role, description) VALUES
  ('your-passcode', 'view', 'Description here');
```

### Change Existing Passcode

```sql
UPDATE passcodes 
SET passcode = 'new-passcode' 
WHERE passcode = 'old-passcode';
```

### Delete Passcode

```sql
DELETE FROM passcodes WHERE passcode = 'passcode-to-delete';
```

### List All Passcodes

```sql
SELECT passcode, role, description, "createdAt" 
FROM passcodes 
ORDER BY role, "createdAt";
```

## Security Recommendations

1. **Change Default Passcodes**: Immediately change the default passcodes in production
2. **Use Strong Passcodes**: Use alphanumeric passcodes of at least 6 characters
3. **Rotate Passcodes**: Regularly update passcodes for security
4. **Monitor Access**: Check Supabase logs to monitor authentication attempts
5. **Hash Passcodes**: Consider implementing password hashing for production (requires app changes)

## Role Permissions Summary

### View Role (`view`)
- ✅ View all vehicles, jobs, expenses, credits
- ✅ View vehicle summaries
- ✅ Navigate through all screens
- ❌ Cannot add, edit, or delete any data

### Owner Role (`owner`)
- ✅ All view permissions
- ✅ Add vehicles, jobs, expenses, credits
- ✅ Edit vehicles, jobs, expenses, credits
- ✅ Delete vehicles, jobs, expenses, credits
- ✅ Full administrative access

## Troubleshooting

### "Incorrect passcode" error
- Check if passcode exists in Supabase `passcodes` table
- Verify Supabase connection (check environment variables)
- Check browser console for errors

### Role not working correctly
- Clear browser localStorage: `localStorage.clear()`
- Logout and login again
- Verify role in `passcodes` table matches `'view'` or `'owner'`

### Passcode not found in Supabase
- Check if RLS policy allows SELECT operations
- Verify passcode exists: `SELECT * FROM passcodes WHERE passcode = 'your-passcode';`
- Check Supabase connection is working

## Implementation Details

- Authentication state is stored in `localStorage` with key `auth`
- AuthContext (`src/contexts/AuthContext.tsx`) manages authentication state
- All screens use `useAuth()` hook to check permissions
- `canEdit()` method determines if user can make changes

