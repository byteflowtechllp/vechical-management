// Sync cache to track when last sync happened and what needs syncing
// This prevents unnecessary API calls

interface SyncCache {
  lastFullSync: number | null
  lastPullSync: number | null
  pendingChanges: Set<string> // Track entity IDs that need syncing
}

const SYNC_CACHE_KEY = 'sync_cache'
const PULL_SYNC_INTERVAL = 5 * 60 * 1000 // Only pull every 5 minutes
const FULL_SYNC_INTERVAL = 30 * 1000 // Debounce full sync to 30 seconds

class SyncCacheService {
  private cache: SyncCache = {
    lastFullSync: null,
    lastPullSync: null,
    pendingChanges: new Set()
  }

  constructor() {
    this.loadCache()
  }

  private loadCache(): void {
    try {
      const stored = localStorage.getItem(SYNC_CACHE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.cache = {
          ...parsed,
          pendingChanges: new Set(parsed.pendingChanges || [])
        }
      }
    } catch (error) {
      console.warn('Failed to load sync cache:', error)
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem(SYNC_CACHE_KEY, JSON.stringify({
        ...this.cache,
        pendingChanges: Array.from(this.cache.pendingChanges)
      }))
    } catch (error) {
      console.warn('Failed to save sync cache:', error)
    }
  }

  // Check if we should pull from Supabase (only if enough time has passed)
  shouldPullSync(): boolean {
    if (!this.cache.lastPullSync) return true
    const timeSinceLastPull = Date.now() - this.cache.lastPullSync
    return timeSinceLastPull >= PULL_SYNC_INTERVAL
  }

  // Check if we should do a full sync (debounce + check if there are pending changes)
  shouldFullSync(): boolean {
    if (this.cache.pendingChanges.size === 0) return false
    
    if (!this.cache.lastFullSync) return true
    
    const timeSinceLastFullSync = Date.now() - this.cache.lastFullSync
    return timeSinceLastFullSync >= FULL_SYNC_INTERVAL
  }

  // Mark an entity as needing sync
  markPending(entityType: string, entityId: string): void {
    this.cache.pendingChanges.add(`${entityType}:${entityId}`)
    this.saveCache()
  }

  // Mark entity as synced
  markSynced(entityType: string, entityId: string): void {
    this.cache.pendingChanges.delete(`${entityType}:${entityId}`)
    this.saveCache()
  }

  // Mark all as synced (after full sync)
  markAllSynced(): void {
    this.cache.lastFullSync = Date.now()
    this.cache.pendingChanges.clear()
    this.saveCache()
  }

  // Mark pull sync completed
  markPullSyncComplete(): void {
    this.cache.lastPullSync = Date.now()
    this.saveCache()
  }

  // Get pending changes count
  getPendingCount(): number {
    return this.cache.pendingChanges.size
  }

  // Clear all cache (for debugging)
  clearCache(): void {
    this.cache = {
      lastFullSync: null,
      lastPullSync: null,
      pendingChanges: new Set()
    }
    localStorage.removeItem(SYNC_CACHE_KEY)
  }
}

export const syncCache = new SyncCacheService()

