# Deployment Guide

This guide covers deploying your Vehicle Management PWA to various free hosting platforms.

## Prerequisites

1. Build the project:
   ```bash
   npm run build
   ```

2. Ensure your Supabase environment variables are set up (if using):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## 🚀 Option 1: Vercel (Recommended)

**Best for:** Automatic deployments, great performance, easy setup

### Steps:

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite settings
   - Add environment variables if needed:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Click "Deploy"

3. **Auto-deployment:** Every push to main branch will auto-deploy

**Free Tier Includes:**
- Unlimited deployments
- 100GB bandwidth/month
- Custom domains
- HTTPS automatically enabled
- Global CDN

---

## 🌐 Option 2: Netlify

**Best for:** Static sites, good free tier, easy drag-and-drop

### Steps:

1. **Build locally first:**
   ```bash
   npm run build
   ```

2. **Deploy on Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login
   - Drag and drop the `dist` folder, OR
   - Connect to GitHub for continuous deployment

3. **If using GitHub:**
   - Click "Add new site" → "Import an existing project"
   - Select your repository
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add environment variables if needed
   - Click "Deploy site"

**Free Tier Includes:**
- 100GB bandwidth/month
- 300 build minutes/month
- Custom domains
- HTTPS automatically
- Form handling

---

## ☁️ Option 3: Cloudflare Pages

**Best for:** Fast CDN, unlimited bandwidth, generous free tier

### Steps:

1. **Push code to GitHub** (same as Vercel step 1)

2. **Deploy on Cloudflare Pages:**
   - Go to [pages.cloudflare.com](https://pages.cloudflare.com)
   - Sign up/login
   - Click "Create a project"
   - Connect your GitHub repository
   - Build settings:
     - Framework preset: `Vite`
     - Build command: `npm run build`
     - Build output directory: `dist`
   - Add environment variables if needed
   - Click "Save and Deploy"

**Free Tier Includes:**
- Unlimited requests
- Unlimited bandwidth
- Unlimited sites
- Custom domains
- Global CDN

---

## 📦 Option 4: GitHub Pages

**Best for:** Simple static hosting, free with GitHub

### Steps:

1. **Install GitHub Pages plugin:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist",
       "build": "vite build",
       "build:base": "vite build --base=/your-repo-name/"
     }
   }
   ```

3. **Update vite.config.ts:**
   ```typescript
   export default defineConfig({
     base: '/your-repo-name/',
     // ... rest of config
   })
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: `gh-pages` branch
   - Save

**Free Tier Includes:**
- Free with GitHub account
- Custom domain support
- HTTPS enabled

---

## 🔥 Option 5: Firebase Hosting

**Best for:** Google ecosystem, easy integration

### Steps:

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login:**
   ```bash
   firebase login
   ```

3. **Initialize:**
   ```bash
   firebase init hosting
   ```
   - Select existing project or create new
   - Public directory: `dist`
   - Single-page app: Yes
   - Overwrite index.html: No

4. **Deploy:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

**Free Tier Includes:**
- 10GB storage
- 360MB/day bandwidth
- Custom domains
- HTTPS

---

## 📝 Environment Variables

For any deployment, make sure to set these if using Supabase:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

**Note:** These are client-side variables (VITE_ prefix), so they're safe to include in the build.

---

## 🎯 Recommendation

**For this project, I recommend:**

1. **Vercel** - Best overall experience, automatic deployments, excellent performance
2. **Cloudflare Pages** - If you need unlimited bandwidth
3. **Netlify** - Good alternative with similar features to Vercel

All three have excellent free tiers and are perfect for your Vite + React PWA!

---

## 🔧 Troubleshooting

### Service Worker Issues
- Ensure `sw.js` is accessible at root level
- Check that redirect rules include service worker routes

### Build Errors
- Run `npm run build` locally first to catch errors
- Check Node.js version matches deployment environment (usually Node 18+)

### Routing Issues
- Ensure all routes redirect to `index.html` (SPA routing)
- Check `netlify.toml` or `vercel.json` redirects are configured

