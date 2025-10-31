import { supabase } from '../lib/supabase'
import { indexedDBService } from '../lib/indexedDB'
import { Vehicle, Job, Expense, Credit } from '../types'

interface SyncStatus {
  isSyncing: boolean
  lastSyncTime: Date | null
  error: string | null
}

class SyncService {
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    error: null
  }

  async checkSupabaseConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('vehicles').select('id').limit(1)
      return !error
    } catch {
      return false
    }
  }

  async syncAll(): Promise<void> {
    if (this.syncStatus.isSyncing) {
      console.log('Sync already in progress')
      return
    }

    const isConnected = await this.checkSupabaseConnection()
    if (!isConnected) {
      console.log('Supabase not connected, skipping sync')
      return
    }

    this.syncStatus.isSyncing = true
    this.syncStatus.error = null

    try {
      // Sync vehicles
      await this.syncVehicles()

      // Get all vehicles for syncing jobs and expenses
      const vehicles = await indexedDBService.getAllVehicles()

      // Sync jobs and expenses for each vehicle
      for (const vehicle of vehicles) {
        await this.syncJobs(vehicle.id)
        await this.syncExpenses(vehicle.id)
      }

      this.syncStatus.lastSyncTime = new Date()
      console.log('Sync completed successfully')
    } catch (error) {
      this.syncStatus.error = error instanceof Error ? error.message : 'Sync failed'
      console.error('Sync error:', error)
    } finally {
      this.syncStatus.isSyncing = false
    }
  }

  private async syncVehicles(): Promise<void> {
    // Pull from Supabase
    const { data: remoteVehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('*')

    if (fetchError) {
      console.error('Error fetching vehicles from Supabase:', fetchError)
      return
    }

    // Get local vehicles
    const localVehicles = await indexedDBService.getAllVehicles()

    // Merge: remote takes precedence if exists, otherwise keep local
    const vehicleMap = new Map<string, Vehicle>()
    
    // Add local vehicles first
    localVehicles.forEach(v => vehicleMap.set(v.id, v))
    
    // Overwrite with remote if exists
    if (remoteVehicles) {
      remoteVehicles.forEach(v => vehicleMap.set(v.id, v))
    }

    // Save merged vehicles to IndexedDB
    for (const vehicle of vehicleMap.values()) {
      await indexedDBService.saveVehicle(vehicle)
    }

    // Push local changes to Supabase (only new/updated ones)
    for (const localVehicle of localVehicles) {
      const remoteExists = remoteVehicles?.some(rv => rv.id === localVehicle.id)
      if (!remoteExists) {
        // New vehicle, push to Supabase
        await supabase.from('vehicles').upsert(localVehicle)
      }
    }
  }

  private async syncJobs(vehicleId: string): Promise<void> {
    // Pull from Supabase
    const { data: remoteJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*, credits(*)')
      .eq('vehicleId', vehicleId)

    if (fetchError) {
      console.error('Error fetching jobs from Supabase:', fetchError)
      return
    }

    // Get local jobs
    const localJobs = await indexedDBService.getJobsByVehicleId(vehicleId)

    // Merge strategy: use latest updatedAt timestamp
    const jobMap = new Map<string, Job>()
    
    localJobs.forEach(j => jobMap.set(j.id, j))
    
    if (remoteJobs) {
      remoteJobs.forEach(remoteJob => {
        const localJob = jobMap.get(remoteJob.id)
        if (!localJob) {
          // New remote job
          jobMap.set(remoteJob.id, remoteJob)
        } else {
          // Merge: prefer remote if it has newer timestamp, otherwise keep local
          const remoteUpdated = remoteJob.updatedAt || remoteJob.createdAt
          const localUpdated = localJob.updatedAt || localJob.startDate
          if (remoteUpdated && (!localUpdated || new Date(remoteUpdated) > new Date(localUpdated))) {
            jobMap.set(remoteJob.id, remoteJob)
          }
        }
      })
    }

    // Save merged jobs to IndexedDB
    for (const job of jobMap.values()) {
      await indexedDBService.saveJob(job, vehicleId)
    }

    // Push local-only jobs to Supabase
    for (const localJob of localJobs) {
      const remoteExists = remoteJobs?.some(rj => rj.id === localJob.id)
      if (!remoteExists) {
        const { credits, ...jobData } = localJob
        await supabase.from('jobs').upsert({ ...jobData, vehicleId })
        // Sync credits separately
        if (credits && credits.length > 0) {
          await this.syncCredits(localJob.id)
        }
      }
    }
  }

  private async syncExpenses(vehicleId: string): Promise<void> {
    // Pull from Supabase
    const { data: remoteExpenses, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('vehicleId', vehicleId)

    if (fetchError) {
      console.error('Error fetching expenses from Supabase:', fetchError)
      return
    }

    // Get local expenses
    const localExpenses = await indexedDBService.getExpensesByVehicleId(vehicleId)

    // Merge: remote takes precedence if exists, otherwise keep local
    const expenseMap = new Map<string, Expense>()
    
    localExpenses.forEach(e => expenseMap.set(e.id, e))
    
    if (remoteExpenses) {
      remoteExpenses.forEach(re => {
        const localExpense = expenseMap.get(re.id)
        if (!localExpense) {
          expenseMap.set(re.id, re)
        } else {
          // Merge: prefer remote if newer
          const remoteUpdated = re.updatedAt || re.createdAt
          const localUpdated = localExpense.date
          if (remoteUpdated && (!localUpdated || new Date(remoteUpdated) > new Date(localUpdated))) {
            expenseMap.set(re.id, re)
          }
        }
      })
    }

    // Save merged expenses to IndexedDB
    for (const expense of expenseMap.values()) {
      await indexedDBService.saveExpense(expense, vehicleId)
    }

    // Push local-only expenses to Supabase
    for (const localExpense of localExpenses) {
      const remoteExists = remoteExpenses?.some(re => re.id === localExpense.id)
      if (!remoteExists) {
        await supabase.from('expenses').upsert({ ...localExpense, vehicleId })
      }
    }
  }

  private async syncCredits(jobId: string): Promise<void> {
    // Pull from Supabase
    const { data: remoteCredits, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('jobId', jobId)

    if (fetchError) {
      console.error('Error fetching credits from Supabase:', fetchError)
      return
    }

    // Get job to access local credits
    const jobs = await indexedDBService.getJobsByVehicleId(jobId.split('_')[0]) // Extract vehicleId if needed
    const job = jobs.find(j => j.id === jobId)
    const localCredits = job?.credits || []

    // Merge: remote takes precedence
    const creditMap = new Map<string, Credit>()
    
    localCredits.forEach(c => creditMap.set(c.id, c))
    
    if (remoteCredits) {
      remoteCredits.forEach(rc => {
        creditMap.set(rc.id, rc)
      })
    }

    // Push local-only credits to Supabase
    for (const localCredit of localCredits) {
      const remoteExists = remoteCredits?.some(rc => rc.id === localCredit.id)
      if (!remoteExists) {
        await supabase.from('credits').upsert({ ...localCredit, jobId })
      }
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  async manualSync(): Promise<void> {
    console.log('Manual sync triggered')
    await this.syncAll()
  }
}

export const syncService = new SyncService()

// Auto-sync when Supabase is available (optimized - less frequent)
if (import.meta.env.VITE_SUPABASE_URL) {
  // Sync every 10 minutes (reduced from 5 minutes to save API calls)
  setInterval(() => {
    syncService.syncAll().catch(console.error)
  }, 10 * 60 * 1000)
}

