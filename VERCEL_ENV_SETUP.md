# Vercel Environment Variables Setup Guide

This guide explains how to configure environment variables for your Vehicle Management app deployed on Vercel.

## Why Environment Variables?

Your app uses Supabase for cloud storage (optional). If you don't configure Supabase, the app will work offline using IndexedDB.

## Step 1: Get Your Supabase Credentials

If you want to use Supabase (optional):

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select or create a project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

## Step 2: Add Environment Variables in Vercel

1. **Go to your Vercel project**: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. **Select your project**: `vechical-management` (or your project name)
3. **Go to Settings**: Click "Settings" tab
4. **Click "Environment Variables"**: In the left sidebar
5. **Add the variables**:

### Variable 1: `VITE_SUPABASE_URL`
- **Key**: `VITE_SUPABASE_URL`
- **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- **Environment**: Select all (Production, Preview, Development)

### Variable 2: `VITE_SUPABASE_ANON_KEY`
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: Your Supabase anon public key (starts with `eyJ...`)
- **Environment**: Select all (Production, Preview, Development)

6. **Click "Save"** after adding each variable

## Step 3: Redeploy

After adding environment variables:

1. **Go to "Deployments"** tab
2. **Find the latest deployment**
3. **Click the "..." menu** (three dots)
4. **Select "Redeploy"**
5. **Check "Use existing Build Cache"** (optional)
6. **Click "Redeploy"**

Or push a new commit to trigger automatic redeploy.

## Step 4: Verify

After redeployment:

1. **Open your app** in a browser
2. **Open browser console** (F12 or Right-click → Inspect → Console)
3. **Check for errors**:
   - ✅ **No Supabase warnings** = Environment variables configured correctly
   - ⚠️ **"Supabase environment variables are not set"** = Variables not configured (app still works offline)

## Optional: Skip Supabase

If you don't want to use Supabase:

- **Just don't add the environment variables**
- The app will work perfectly offline using IndexedDB
- All data is stored locally in the browser
- **No configuration needed!**

## Troubleshooting

### "Supabase environment variables are not set" warning
- **This is OK!** The app will use IndexedDB (offline storage)
- To remove the warning, add environment variables as described above

### "supabaseUrl is required" error
- This means Supabase client was initialized without credentials
- **Fixed in latest code** - app now handles this gracefully
- Make sure you're on the latest deployment

### Environment variables not working
- Ensure variable names start with `VITE_` (required by Vite)
- Check you selected all environments (Production, Preview, Development)
- Redeploy after adding variables
- Variables are only available in client code if prefixed with `VITE_`

## Security Notes

✅ **Safe to expose**:
- `VITE_SUPABASE_URL` - Public URL, safe for client-side
- `VITE_SUPABASE_ANON_KEY` - Public key, designed for client-side use

❌ **Never expose**:
- Service role keys (server-side only)
- Database passwords
- Private keys

## Need Help?

- Check Vercel docs: [Environment Variables](https://vercel.com/docs/environment-variables)
- Check Supabase docs: [Getting Started](https://supabase.com/docs/guides/getting-started)

