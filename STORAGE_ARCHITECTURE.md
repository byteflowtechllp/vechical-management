# Storage Architecture: IndexedDB + Supabase Sync

This document explains how data storage and synchronization works in the Vehicle Management app.

## Overview

The app uses a **hybrid storage architecture**:
1. **IndexedDB** (primary) - Local browser database for fast access and offline support
2. **Supabase** (sync) - Cloud database for data synchronization across devices
3. **localStorage** (fallback) - Only used if IndexedDB fails

## Data Flow

```
User Action
    ↓
IndexedDB (Primary Storage) ──┐
    ↓                          │
Background Sync ──────────────┤
    ↓                          │
Supabase (Cloud Sync)          │
    ↓                          │
IndexedDB ←─ Merge Remote Data ┘
```

## How It Works

### 1. **Primary Operations (IndexedDB)**

All read/write operations happen **immediately** in IndexedDB:

```typescript
// Create vehicle
await indexedDBService.saveVehicle(vehicle)  // ✅ Instant, local
syncToSupabase(() => supabase.insert(vehicle)) // ⏱️ Background sync
```

### 2. **Background Synchronization**

After local save, data syncs to Supabase in the background:

- ✅ **Non-blocking** - User doesn't wait for cloud sync
- ✅ **Error-tolerant** - If Supabase fails, local data is preserved
- ✅ **Automatic** - Happens automatically when Supabase is configured

### 3. **Data Pull (Sync from Cloud)**

When loading data:

```typescript
// 1. Get from IndexedDB (instant)
const vehicles = await indexedDBService.getAllVehicles()

// 2. Background: Fetch from Supabase and merge
syncToSupabase(async () => {
  const remote = await supabase.from('vehicles').select('*')
  // Merge remote data into IndexedDB
  for (const vehicle of remote) {
    await indexedDBService.saveVehicle(vehicle)
  }
})
```

### 4. **Conflict Resolution**

- **On Write**: Local data takes precedence (last write wins)
- **On Read**: Remote data merged into local (latest timestamp wins)
- **Strategy**: Merge remote changes into IndexedDB when pulling

## Storage Hierarchy

```
┌─────────────────────────────────────┐
│  User Action                        │
└─────────────┬───────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │  IndexedDB (Primary)│  ← Instant, offline-capable
    └──────────┬──────────┘
               │
               ├─► Background Sync
               │
               ▼
    ┌─────────────────────┐
    │  Supabase (Cloud)    │  ← Sync when available
    └─────────────────────┘
               │
               └─► Error? Fallback to localStorage
```

## Benefits

### ✅ **Offline-First**
- Works completely offline
- Data stored locally in IndexedDB
- No internet required for basic operations

### ✅ **Fast Performance**
- All reads from IndexedDB (milliseconds)
- No waiting for network requests
- Instant UI updates

### ✅ **Automatic Sync**
- Background sync to Supabase
- Data available across devices
- No manual sync needed

### ✅ **Resilient**
- Multiple fallback layers
- IndexedDB → Supabase → localStorage
- Data never lost

## Migration from localStorage

On first app load:
1. IndexedDB initializes
2. Checks for existing localStorage data
3. **Automatically migrates** all data to IndexedDB
4. Preserves localStorage as fallback

## Supabase Setup (Optional)

If `.env` is configured:
- ✅ Background sync enabled
- ✅ Cross-device synchronization
- ✅ Cloud backup

If `.env` is **not** configured:
- ✅ App works fully offline
- ✅ All data in IndexedDB
- ⚠️ No cloud sync (expected behavior)

## Code Structure

```
src/
├── lib/
│   ├── indexedDB.ts      # IndexedDB operations
│   └── supabase.ts       # Supabase client
├── services/
│   ├── database.ts       # Main service (uses IndexedDB + sync)
│   └── sync.ts          # Advanced sync logic (optional)
```

## Example: Creating a Vehicle

```typescript
const vehicle = { id: '1', vehicleNumber: 'ABC123', modelType: 'Sedan' }

// Step 1: Save to IndexedDB (instant)
await indexedDBService.saveVehicle(vehicle)

// Step 2: Background sync to Supabase (non-blocking)
syncToSupabase(async () => {
  await supabase.from('vehicles').insert(vehicle)
})

// Result: Vehicle available locally AND synced to cloud
```

## Example: Loading Vehicles

```typescript
// Step 1: Get from IndexedDB (instant response)
const vehicles = await indexedDBService.getAllVehicles()

// Step 2: Background sync from Supabase (merge latest)
syncToSupabase(async () => {
  const remote = await supabase.from('vehicles').select('*')
  // Merge remote into local
  for (const v of remote) {
    await indexedDBService.saveVehicle(v)
  }
  // Return merged data
  return await indexedDBService.getAllVehicles()
})

// User sees data immediately, sync happens in background
```

## Storage Limits

| Storage Type | Limit | Usage |
|-------------|-------|-------|
| IndexedDB | ~50% of disk space | Primary storage |
| localStorage | ~5-10 MB | Fallback only |
| Supabase | 500 MB (free tier) | Cloud sync |

## Troubleshooting

### Data not syncing?
1. Check `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify Supabase connection in browser console
3. Check browser DevTools → Application → IndexedDB for local data

### Data not persisting?
1. Check browser supports IndexedDB
2. Check browser storage permissions
3. Data should be in IndexedDB (DevTools → Application)

### Sync errors?
- Background sync errors don't affect app functionality
- Check browser console for sync warnings
- Local data always preserved

## Future Enhancements

- [ ] Manual sync button for user control
- [ ] Sync status indicator
- [ ] Conflict resolution UI
- [ ] Offline queue with retry logic
- [ ] Incremental sync (only changed data)

