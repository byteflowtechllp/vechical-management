# PWA Troubleshooting Guide

## Check if PWA is Working

### 1. Check Service Worker Registration

Open browser DevTools (F12) → Application tab → Service Workers

**What to check:**
- ✅ Service Worker should show as "activated and running"
- ✅ Status should be "activated"
- ✅ No errors in the console

### 2. Check Manifest

Open browser DevTools (F12) → Application tab → Manifest

**What to check:**
- ✅ Manifest should load without errors
- ✅ Icons should be listed (192x192 and 512x512)
- ✅ All required fields should be present

### 3. Check Installability

**Chrome/Edge:**
- Look for install icon in address bar
- Or: Menu → Install "Vehicle Management"

**Safari (iOS):**
- Share button → Add to Home Screen

**Firefox:**
- Menu → Install

### 4. Common Issues

#### Issue: Service Worker Not Registering

**Possible causes:**
1. Not running on HTTPS (PWAs require HTTPS or localhost)
2. Service worker file not accessible
3. Scope mismatch

**Solutions:**
- Ensure you're on HTTPS (production) or localhost (development)
- Check browser console for errors
- Verify `/sw.js` is accessible
- Clear browser cache and reload

#### Issue: "Add to Home Screen" Not Appearing

**Possible causes:**
1. Manifest not found or invalid
2. Missing required icons
3. HTTPS requirement not met
4. Service worker not active

**Solutions:**
- Verify manifest.webmanifest is accessible
- Check all icons exist (192x192, 512x512)
- Ensure HTTPS is enabled
- Service worker must be activated

#### Issue: App Opens in Browser Instead of Standalone

**Possible causes:**
1. Manifest display mode not set correctly
2. Browser cache issue

**Solutions:**
- Clear app cache in browser settings
- Reinstall the PWA
- Check manifest has `"display": "standalone"`

#### Issue: Offline Mode Not Working

**Possible causes:**
1. Service worker not caching files
2. Network requests not cached

**Solutions:**
- Check Workbox precache in Service Workers tab
- Verify glob patterns in vite.config.ts include all necessary files
- Test offline mode: DevTools → Network → Check "Offline"

### 5. Testing Checklist

- [ ] Service worker registers successfully
- [ ] Manifest loads without errors
- [ ] App can be installed
- [ ] App opens in standalone mode (not browser)
- [ ] App works offline (after first load)
- [ ] Icons display correctly
- [ ] Theme color matches
- [ ] Start URL is correct (/)

### 6. Browser Console Checks

Open DevTools Console and check for:

**Good signs:**
```
Service Worker registered successfully
PWA manifest loaded
```

**Bad signs:**
```
Failed to register Service Worker
Manifest not found
HTTPS required
```

### 7. Network Tab Verification

In DevTools → Network tab:
- Check that `sw.js` loads with status 200
- Check that `manifest.webmanifest` loads with status 200
- Check that `registerSW.js` loads with status 200
- Check that icons load successfully

### 8. Production Deployment Checklist

- [ ] HTTPS is enabled
- [ ] Service worker files are accessible
- [ ] Manifest file is accessible
- [ ] Icons are accessible
- [ ] Vercel/Netlify headers are configured correctly
- [ ] Service-Worker-Allowed header is set

### 9. Reset PWA (If Issues Persist)

**Chrome/Edge:**
1. DevTools → Application → Storage → Clear site data
2. Uninstall PWA: Settings → Apps → Remove
3. Clear service workers: Application → Service Workers → Unregister
4. Reload page and reinstall

**Safari (iOS):**
1. Settings → Safari → Clear History and Website Data
2. Delete app icon from home screen
3. Reload and reinstall

### 10. Debug Commands

Open browser console and run:

```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs))

// Check manifest
fetch('/manifest.webmanifest').then(r => r.json()).then(console.log)

// Force update service worker
navigator.serviceWorker.getRegistration().then(reg => reg.update())
```

### 11. Vite PWA Dev Mode

In development, PWA features might be limited. For full testing:
- Build the app: `npm run build`
- Preview: `npm run preview`
- Or test on production deployment

### 12. Known Limitations

- **Local Development**: Some PWA features may not work on `file://` protocol
- **HTTPS Required**: PWAs only work on HTTPS (or localhost)
- **Browser Support**: Not all browsers support all PWA features
- **iOS Safari**: Has some PWA limitations compared to Chrome

### Need More Help?

1. Check browser console for specific errors
2. Verify all files are accessible via Network tab
3. Test on different browsers/devices
4. Check deployment platform (Vercel/Netlify) logs

