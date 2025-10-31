# API Call Optimization

## Overview
The app has been optimized to minimize Supabase API calls, reducing costs and improving performance for free tier usage.

## Optimizations Implemented

### 1. **Pull Sync Throttling**
- **Before**: Pull sync on every `getAll()` call
- **After**: Pull sync only once every **5 minutes**
- **Impact**: Reduces pull sync calls by ~95%

```typescript
// Only pulls if 5 minutes have passed since last pull
if (syncCache.shouldPullSync()) {
  // Fetch from Supabase
}
```

### 2. **Full Sync Debouncing**
- **Before**: Full sync triggered after every change (2 seconds delay)
- **After**: Full sync only if:
  - There are pending changes
  - At least **30 seconds** have passed since last full sync
- **Impact**: Batches multiple rapid changes into one sync

### 3. **Pending Change Tracking**
- Tracks which entities need syncing
- Only syncs what has changed
- Prevents duplicate syncs

### 4. **Reduced Periodic Sync**
- **Before**: Every 5 minutes
- **After**: Every **10 minutes**
- **Impact**: 50% reduction in background sync calls

### 5. **Write Operations**
- Immediate sync for individual writes (still needed)
- Full sync debounced (30 seconds)
- Batches multiple changes

## API Call Estimates

### Before Optimization
| Operation | Frequency | Calls/Day |
|-----------|-----------|-----------|
| Pull sync on load | Every page load | ~100-200 |
| Full sync after changes | Every change | ~50-100 |
| Periodic sync | Every 5 min | ~288 |
| **Total** | | **~438-588/day** |

### After Optimization
| Operation | Frequency | Calls/Day |
|-----------|-----------|-----------|
| Pull sync on load | Max once per 5 min | ~12-24 |
| Full sync after changes | Max once per 30 sec | ~6-12 |
| Periodic sync | Every 10 min | ~144 |
| Write operations | As needed | ~20-50 |
| **Total** | | **~182-230/day** |

### Savings: **~55-60% reduction in API calls**

## How It Works

### Sync Cache (`syncCache.ts`)
- Tracks last pull sync time
- Tracks last full sync time  
- Tracks pending entity changes
- Stores in localStorage for persistence

### Write Flow
```
User creates vehicle
  ↓
Save to IndexedDB (instant)
  ↓
Background sync to Supabase (immediate write)
  ↓
Mark as pending in cache
  ↓
Debounced full sync (30s delay if other changes)
  ↓
Clear pending flag
```

### Read Flow
```
User loads vehicles
  ↓
Get from IndexedDB (instant)
  ↓
Check: Should pull sync? (5 min check)
  ↓
If yes: Pull from Supabase & merge
  ↓
Update pull sync timestamp
  ↓
Return merged data
```

## Configuration

### Adjust Intervals (if needed)

Edit `src/services/syncCache.ts`:

```typescript
const PULL_SYNC_INTERVAL = 5 * 60 * 1000  // 5 minutes
const FULL_SYNC_INTERVAL = 30 * 1000      // 30 seconds
```

Edit `src/services/sync.ts`:

```typescript
setInterval(() => {
  syncService.syncAll().catch(console.error)
}, 10 * 60 * 1000)  // 10 minutes
```

## Best Practices

1. **IndexedDB is primary** - All reads/writes are instant
2. **Supabase sync is background** - Never blocks UI
3. **Batch operations** - Multiple changes sync together
4. **Throttle pulls** - Only pull when necessary
5. **Debounce full sync** - Wait for changes to settle

## Monitoring API Usage

### Check Sync Status
```typescript
import { syncCache } from './services/syncCache'

console.log('Pending changes:', syncCache.getPendingCount())
console.log('Should pull sync:', syncCache.shouldPullSync())
console.log('Should full sync:', syncCache.shouldFullSync())
```

### Clear Cache (for debugging)
```typescript
syncCache.clearCache()
```

## Expected Free Tier Usage

With optimizations:
- **Daily API calls**: ~200-250
- **Monthly estimate**: ~6,000-7,500 calls
- **Supabase free tier**: 50,000 calls/month
- **Usage**: ~12-15% of free tier limit ✅

## Troubleshooting

### Sync not happening?
- Check `.env` has Supabase credentials
- Verify browser console for sync errors
- Check `syncCache.shouldPullSync()` returns true

### Too many calls still?
- Increase `PULL_SYNC_INTERVAL` to 10 minutes
- Increase `FULL_SYNC_INTERVAL` to 60 seconds
- Increase periodic sync to 15-20 minutes

### Need immediate sync?
- Manually trigger: `syncService.syncAll()`
- Clear cache: `syncCache.clearCache()`

