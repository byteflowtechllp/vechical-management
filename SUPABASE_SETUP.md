# Supabase Integration Setup Guide

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project

## Step 2: Create Database Tables

1. In your Supabase project dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase-schema.sql`
3. Click **Run** to execute the SQL
4. Verify tables are created in **Table Editor**

## Step 3: Get API Keys

1. Go to **Project Settings** → **API**
2. Copy your:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 4: Configure Environment Variables

1. Create a `.env` file in the project root (copy from `.env.example`)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

3. **Important**: Never commit `.env` to git (it's already in `.gitignore`)

## Step 5: Test the Connection

1. Start the dev server: `npm run dev`
2. The app will automatically use Supabase if credentials are configured
3. If Supabase fails, it will fallback to localStorage automatically

## Migration from localStorage to Supabase

The app includes automatic fallback to localStorage, so:
- If Supabase is configured: Uses Supabase
- If Supabase fails or not configured: Uses localStorage
- Your existing data in localStorage will continue to work

## Troubleshooting

### "Supabase environment variables are not set"
- Check your `.env` file exists and has correct values
- Restart your dev server after creating/updating `.env`

### Connection errors
- Verify your Supabase project is active
- Check your API keys are correct
- Ensure RLS policies allow operations (see `supabase-schema.sql`)

### Data not syncing
- Check browser console for errors
- Verify database tables exist
- Check RLS policies are correct

## Security Notes

The current setup uses permissive RLS policies (allows all operations). For production:
1. Implement proper authentication
2. Add user-specific RLS policies
3. Use Supabase Auth instead of passcode

## Next Steps

- ✅ Database schema created
- ✅ Service layer implemented
- ✅ Components updated to use Supabase
- 🔄 Test the integration
- 🔄 Migrate existing localStorage data (optional)

