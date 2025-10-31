# Supabase Setup Guide

## Quick Start

### Step 1: Get Your Supabase Credentials

1. **Go to Supabase Dashboard**: [https://app.supabase.com](https://app.supabase.com)
2. **Select or Create Project**
3. **Go to Settings → API**
4. **Copy these values:**
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### Step 2: Create .env File

1. In your project root, create a file named `.env`
2. Add your credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace with your actual values!**

### Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql`
3. Paste and click **Run**
4. Verify tables are created in **Table Editor**

### Step 4: Restart Dev Server

```bash
npm run dev
```

## Visual Guide: Finding API Keys

### Option 1: Settings Menu
```
Supabase Dashboard
  └─ Your Project
      └─ ⚙️ Settings (left sidebar)
          └─ 🔑 API
              ├─ Project URL: https://xxxxx.supabase.co
              └─ API Keys
                  └─ anon public: eyJ...
```

### Option 2: Quick Access
1. Click your project name (top left)
2. Click "Settings" icon
3. Click "API" in the sidebar
4. Copy the values

## What You'll See

```
Project URL
https://abcdefghijklmnop.supabase.co

API Keys
anon public    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxx
```

## Security Notes

✅ **Use anon public key** - Safe for frontend use  
❌ **Never use service_role key** - Only for backend/server-side  
✅ **.env is gitignored** - Your keys won't be committed  

## Verification

After setup, check browser console:
- ✅ No warnings = Supabase connected
- ⚠️ "Supabase environment variables are not set" = Check .env file

## Troubleshooting

**Problem**: "Supabase environment variables are not set"
- ✅ Check `.env` file exists in project root
- ✅ Verify variable names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- ✅ Restart dev server after creating/updating `.env`

**Problem**: Connection errors
- ✅ Verify Project URL is correct (no trailing slash)
- ✅ Check anon key is complete (very long string)
- ✅ Ensure project is active in Supabase dashboard

**Problem**: Database errors
- ✅ Run `supabase-schema.sql` in SQL Editor
- ✅ Check tables exist in Table Editor
- ✅ Verify RLS policies are enabled

