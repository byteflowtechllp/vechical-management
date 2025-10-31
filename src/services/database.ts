import { supabase } from '../lib/supabase'
import { indexedDBService } from '../lib/indexedDB'
import { syncService } from './sync'
import { syncCache } from './syncCache'
import { Vehicle, Job, Expense, Credit } from '../types'

// Initialize IndexedDB and migrate from localStorage on first load
let dbInitialized = false
let migrationComplete = false
const initPromise = indexedDBService.init().then(async () => {
  if (!dbInitialized) {
    await indexedDBService.migrateFromLocalStorage()
    dbInitialized = true
    migrationComplete = true
    
    // Auto-sync after migration (if Supabase is configured) - only once
    if (import.meta.env.VITE_SUPABASE_URL && syncCache.shouldPullSync()) {
      // Wait a bit for migration to settle, then sync
      setTimeout(() => {
        syncService.syncAll().catch(console.error)
        syncCache.markPullSyncComplete()
      }, 2000)
    }
  }
}).catch(console.error)

// Helper to sync to Supabase in background (non-blocking, optimized)
const syncToSupabase = async (operation: () => Promise<void>, entityType?: string, entityId?: string) => {
  try {
    if (import.meta.env.VITE_SUPABASE_URL) {
      await operation()
      // Mark as synced if entity info provided
      if (entityType && entityId) {
        syncCache.markSynced(entityType, entityId)
      }
    }
  } catch (error) {
    console.warn('Background sync to Supabase failed:', error)
    // Mark as pending so we retry later
    if (entityType && entityId) {
      syncCache.markPending(entityType, entityId)
    }
  }
}

// Helper to trigger optimized full sync after write operations
const triggerSync = (entityType?: string, entityId?: string) => {
  if (import.meta.env.VITE_SUPABASE_URL && migrationComplete) {
    // Mark as pending
    if (entityType && entityId) {
      syncCache.markPending(entityType, entityId)
    }
    
    // Only trigger full sync if we have pending changes and enough time has passed
    if (syncCache.shouldFullSync()) {
      clearTimeout((window as any).syncTimeout)
      ;(window as any).syncTimeout = setTimeout(() => {
        if (syncCache.getPendingCount() > 0) {
          syncService.syncAll().catch(console.error)
          syncCache.markAllSynced()
        }
      }, 500) // Small delay to batch multiple rapid changes
    }
  }
}

// Vehicle operations
export const vehicleService = {
  async getAll(): Promise<Vehicle[]> {
    await initPromise
    
    try {
      // Primary: Get from IndexedDB
      let vehicles = await indexedDBService.getAllVehicles()
      
      // Background: Sync from Supabase and merge (only if enough time passed)
      if (import.meta.env.VITE_SUPABASE_URL && syncCache.shouldPullSync()) {
        syncToSupabase(async () => {
          const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('vehicleNumber', { ascending: true })

          if (!error && data) {
            // Merge remote data into IndexedDB (remote takes precedence)
            for (const vehicle of data) {
              await indexedDBService.saveVehicle(vehicle)
            }
            // Re-fetch to get merged data
            vehicles = await indexedDBService.getAllVehicles()
          }
          syncCache.markPullSyncComplete()
        })
      }
      
      return vehicles
    } catch (error) {
      console.error('Error loading vehicles:', error)
      // Fallback to localStorage
      return getLocalStorageVehicles()
    }
  },

  async create(vehicle: Vehicle): Promise<Vehicle> {
    await initPromise
    
    try {
      // Primary: Save to IndexedDB
      await indexedDBService.saveVehicle(vehicle)
      
      // Background: Sync to Supabase (optimized - only if needed)
      syncToSupabase(async () => {
        await supabase.from('vehicles').insert(vehicle)
      }, 'vehicle', vehicle.id)
      
      // Trigger optimized sync
      triggerSync('vehicle', vehicle.id)
      
      return vehicle
    } catch (error) {
      console.error('Error creating vehicle:', error)
      // Fallback to localStorage
      saveLocalStorageVehicle(vehicle)
      return vehicle
    }
  },

  async update(vehicle: Vehicle): Promise<Vehicle> {
    await initPromise
    
    try {
      // Primary: Update in IndexedDB
      await indexedDBService.saveVehicle(vehicle)
      
      // Background: Sync to Supabase (optimized)
      syncToSupabase(async () => {
        await supabase
          .from('vehicles')
          .update({
            vehicleNumber: vehicle.vehicleNumber,
            modelType: vehicle.modelType
          })
          .eq('id', vehicle.id)
      }, 'vehicle', vehicle.id)
      
      // Trigger optimized sync
      triggerSync('vehicle', vehicle.id)
      
      return vehicle
    } catch (error) {
      console.error('Error updating vehicle:', error)
      // Fallback to localStorage
      updateLocalStorageVehicle(vehicle)
      return vehicle
    }
  },

  async delete(id: string): Promise<void> {
    await initPromise
    
    try {
      // Delete related data first
      const jobs = await indexedDBService.getJobsByVehicleId(id)
      for (const job of jobs) {
        await indexedDBService.deleteJob(job.id)
      }
      
      const expenses = await indexedDBService.getExpensesByVehicleId(id)
      for (const expense of expenses) {
        await indexedDBService.deleteExpense(expense.id)
      }
      
      // Delete vehicle
      await indexedDBService.deleteVehicle(id)
      
      // Background: Sync to Supabase (optimized - batch delete)
      syncToSupabase(async () => {
        // Delete jobs and expenses from Supabase
        for (const job of jobs) {
          await creditService.deleteByJobId(job.id)
        }
        await supabase.from('jobs').delete().eq('vehicleId', id)
        await supabase.from('expenses').delete().eq('vehicleId', id)
        await supabase.from('vehicles').delete().eq('id', id)
      }, 'vehicle', id)
      
      // Trigger optimized sync
      triggerSync('vehicle', id)
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      // Fallback to localStorage
      deleteLocalStorageVehicle(id)
    }
  }
}

// Job operations
export const jobService = {
  async getByVehicleId(vehicleId: string): Promise<Job[]> {
    await initPromise
    
    try {
      // Primary: Get from IndexedDB
      let jobs = await indexedDBService.getJobsByVehicleId(vehicleId)
      
      // Background: Sync from Supabase and merge (only if needed)
      if (import.meta.env.VITE_SUPABASE_URL && syncCache.shouldPullSync()) {
        syncToSupabase(async () => {
          const { data, error } = await supabase
            .from('jobs')
            .select('*, credits(*)')
            .eq('vehicleId', vehicleId)
            .order('createdAt', { ascending: false })

          if (!error && data) {
            // Merge remote data into IndexedDB
            for (const job of data) {
              await indexedDBService.saveJob(job, vehicleId)
            }
            // Re-fetch to get merged data
            jobs = await indexedDBService.getJobsByVehicleId(vehicleId)
          }
        })
      }
      
      return jobs
    } catch (error) {
      console.error('Error fetching jobs:', error)
      return getLocalStorageJobs(vehicleId)
    }
  },

  async create(job: Job, vehicleId: string): Promise<Job> {
    await initPromise
    
    try {
      // Primary: Save to IndexedDB
      await indexedDBService.saveJob(job, vehicleId)
      
      // Background: Sync to Supabase (optimized)
      syncToSupabase(async () => {
        const { credits, ...jobData } = job
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            ...jobData,
            vehicleId
          })
          .select()
          .single()

        if (!error && data && credits && credits.length > 0) {
          await creditService.createBatch(credits, data.id)
        }
      }, 'job', job.id)
      
      // Trigger optimized sync
      triggerSync('job', job.id)
      
      return job
    } catch (error) {
      console.error('Error creating job:', error)
      saveLocalStorageJob(job, vehicleId)
      return job
    }
  },

  async update(job: Job, vehicleId: string): Promise<Job> {
    await initPromise
    
    try {
      // Primary: Update in IndexedDB
      await indexedDBService.saveJob(job, vehicleId)
      
      // Background: Sync to Supabase (optimized)
      syncToSupabase(async () => {
        const { credits, ...jobData } = job
        await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', job.id)

        // Update credits
        await creditService.deleteByJobId(job.id)
        if (credits && credits.length > 0) {
          await creditService.createBatch(credits, job.id)
        }
      }, 'job', job.id)
      
      // Trigger optimized sync
      triggerSync('job', job.id)
      
      return job
    } catch (error) {
      console.error('Error updating job:', error)
      updateLocalStorageJob(job, vehicleId)
      return job
    }
  },

  async delete(id: string): Promise<void> {
    await initPromise
    
    try {
      // Primary: Delete from IndexedDB
      await indexedDBService.deleteJob(id)
      
      // Background: Sync to Supabase (optimized)
      syncToSupabase(async () => {
        await creditService.deleteByJobId(id)
        await supabase.from('jobs').delete().eq('id', id)
      }, 'job', id)
      
      // Trigger optimized sync
      triggerSync('job', id)
    } catch (error) {
      console.error('Error deleting job:', error)
    }
  },

  async deleteByVehicleId(vehicleId: string): Promise<void> {
    await initPromise
    
    try {
      const jobs = await indexedDBService.getJobsByVehicleId(vehicleId)
      for (const job of jobs) {
        await indexedDBService.deleteJob(job.id)
      }
      
      // Background: Sync to Supabase (optimized - batch delete)
      syncToSupabase(async () => {
        for (const job of jobs) {
          await creditService.deleteByJobId(job.id)
        }
        await supabase.from('jobs').delete().eq('vehicleId', vehicleId)
      }, 'job', vehicleId)
      
      // Trigger optimized sync
      triggerSync('job', vehicleId)
    } catch (error) {
      console.error('Error deleting jobs:', error)
    }
  },

  async getById(id: string): Promise<Job> {
    await initPromise
    
    try {
      // First try IndexedDB
      const vehicles = await indexedDBService.getAllVehicles()
      for (const vehicle of vehicles) {
        const jobs = await indexedDBService.getJobsByVehicleId(vehicle.id)
        const job = jobs.find(j => j.id === id)
        if (job) {
          // Also sync from Supabase to get latest credits (if enough time passed)
          if (import.meta.env.VITE_SUPABASE_URL && syncCache.shouldPullSync()) {
            syncToSupabase(async () => {
              const { data, error } = await supabase
                .from('jobs')
                .select('*, credits(*)')
                .eq('id', id)
                .single()

              if (!error && data) {
                // Merge remote data (especially credits) into IndexedDB
                await indexedDBService.saveJob(data, vehicle.id)
              }
            })
            // Re-fetch after sync to get updated credits
            const updatedJobs = await indexedDBService.getJobsByVehicleId(vehicle.id)
            const updatedJob = updatedJobs.find(j => j.id === id)
            if (updatedJob) return updatedJob
          }
          return job
        }
      }
      
      // If not found in IndexedDB, try Supabase
      if (import.meta.env.VITE_SUPABASE_URL) {
        const { data, error } = await supabase
          .from('jobs')
          .select('*, credits(*)')
          .eq('id', id)
          .single()

        if (!error && data) {
          // Find which vehicle this job belongs to
          const allVehicles = await indexedDBService.getAllVehicles()
          for (const vehicle of allVehicles) {
            const vehicleJobs = await indexedDBService.getJobsByVehicleId(vehicle.id)
            if (vehicleJobs.some(j => j.id === id)) {
              await indexedDBService.saveJob(data, vehicle.id)
              return data
            }
          }
          // If we can't find the vehicle, still return the job
          return data
        }
      }
      
      throw new Error('Job not found')
    } catch (error) {
      console.error('Error fetching job:', error)
      throw error
    }
  }
}

// Credit operations
export const creditService = {
  async createBatch(credits: Credit[], jobId: string): Promise<void> {
    if (credits.length === 0) return
    
    await initPromise
    
    try {
      // Primary: Save to IndexedDB
      for (const credit of credits) {
        await indexedDBService.saveCredit(credit, jobId)
      }
      
      // Sync to Supabase - await to ensure it happens
      if (import.meta.env.VITE_SUPABASE_URL) {
        try {
          const creditsToInsert = credits.map(credit => ({
            ...credit,
            type: credit.type || 'cash',
            jobId
          }))

          const { error } = await supabase.from('credits').insert(creditsToInsert)
          
          if (error) {
            console.error('Failed to sync credits batch to Supabase:', error)
            // Mark all as pending for retry
            credits.forEach(credit => syncCache.markPending('credit', credit.id))
          } else {
            // Mark all as synced
            credits.forEach(credit => syncCache.markSynced('credit', credit.id))
          }
        } catch (error) {
          console.error('Error syncing credits batch to Supabase:', error)
          // Mark all as pending for retry
          credits.forEach(credit => syncCache.markPending('credit', credit.id))
        }
      }
      
      // Trigger optimized sync
      triggerSync('credit', jobId)
    } catch (error) {
      console.error('Error creating credits:', error)
    }
  },

  async deleteByJobId(jobId: string): Promise<void> {
    await initPromise
    
    try {
      // Get job to access credits
      const job = await jobService.getById(jobId)
      if (job.credits) {
        for (const credit of job.credits) {
          await indexedDBService.deleteCredit(credit.id, jobId)
        }
      }
      
      // Background: Sync to Supabase (optimized)
      syncToSupabase(async () => {
        await supabase.from('credits').delete().eq('jobId', jobId)
      }, 'credit', jobId)
      
      // Trigger optimized sync
      triggerSync('credit', jobId)
    } catch (error) {
      console.error('Error deleting credits:', error)
    }
  },

  async delete(id: string): Promise<void> {
    await initPromise
    
    try {
      // Find credit's job
      const vehicles = await indexedDBService.getAllVehicles()
      for (const vehicle of vehicles) {
        const jobs = await indexedDBService.getJobsByVehicleId(vehicle.id)
        for (const job of jobs) {
          const credit = job.credits?.find(c => c.id === id)
          if (credit) {
            await indexedDBService.deleteCredit(id, job.id)
            
            // Background: Sync to Supabase (optimized)
            syncToSupabase(async () => {
              await supabase.from('credits').delete().eq('id', id)
            }, 'credit', id)
            
            // Trigger optimized sync
            triggerSync('credit', id)
            return
          }
        }
      }
    } catch (error) {
      console.error('Error deleting credit:', error)
    }
  },

  async create(credit: Credit, jobId: string): Promise<Credit> {
    await initPromise
    
    try {
      // Primary: Save to IndexedDB
      await indexedDBService.saveCredit(credit, jobId)
      
      // Sync to Supabase - await to ensure it happens (credits are important)
      if (import.meta.env.VITE_SUPABASE_URL) {
        try {
          const { error } = await supabase.from('credits').insert({
            ...credit,
            type: credit.type || 'cash',
            jobId
          })
          
          if (error) {
            console.error('Failed to sync credit to Supabase:', error)
            // Mark as pending for retry
            syncCache.markPending('credit', credit.id)
          } else {
            // Mark as synced
            syncCache.markSynced('credit', credit.id)
          }
        } catch (error) {
          console.error('Error syncing credit to Supabase:', error)
          // Mark as pending for retry
          syncCache.markPending('credit', credit.id)
        }
      }
      
      // Trigger optimized sync
      triggerSync('credit', credit.id)
      
      return credit
    } catch (error) {
      console.error('Error creating credit:', error)
      throw error
    }
  }
}

// Expense operations
export const expenseService = {
  async getByVehicleId(vehicleId: string): Promise<Expense[]> {
    await initPromise
    
    try {
      // Primary: Get from IndexedDB
      let expenses = await indexedDBService.getExpensesByVehicleId(vehicleId)
      
      // Background: Sync from Supabase and merge (only if needed)
      if (import.meta.env.VITE_SUPABASE_URL && syncCache.shouldPullSync()) {
        syncToSupabase(async () => {
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('vehicleId', vehicleId)
            .order('date', { ascending: false })

          if (!error && data) {
            // Merge remote data into IndexedDB
            for (const expense of data) {
              await indexedDBService.saveExpense(expense, vehicleId)
            }
            // Re-fetch to get merged data
            expenses = await indexedDBService.getExpensesByVehicleId(vehicleId)
          }
        })
      }
      
      return expenses
    } catch (error) {
      console.error('Error fetching expenses:', error)
      return getLocalStorageExpenses(vehicleId)
    }
  },

  async create(expense: Expense, vehicleId: string): Promise<Expense> {
    await initPromise
    
    try {
      // Primary: Save to IndexedDB
      await indexedDBService.saveExpense(expense, vehicleId)
      
      // Background: Sync to Supabase (optimized)
      syncToSupabase(async () => {
        await supabase.from('expenses').insert({
          ...expense,
          vehicleId
        })
      }, 'expense', expense.id)
      
      // Trigger optimized sync
      triggerSync('expense', expense.id)
      
      return expense
    } catch (error) {
      console.error('Error creating expense:', error)
      saveLocalStorageExpense(expense, vehicleId)
      return expense
    }
  },

  async update(expense: Expense, vehicleId: string): Promise<Expense> {
    await initPromise
    
    try {
      // Primary: Update in IndexedDB
      await indexedDBService.saveExpense(expense, vehicleId)
      
      // Background: Sync to Supabase (optimized)
      syncToSupabase(async () => {
        await supabase
          .from('expenses')
          .update({
            title: expense.title,
            amount: expense.amount,
            date: expense.date,
            description: expense.description
          })
          .eq('id', expense.id)
      }, 'expense', expense.id)
      
      // Trigger optimized sync
      triggerSync('expense', expense.id)
      
      return expense
    } catch (error) {
      console.error('Error updating expense:', error)
      updateLocalStorageExpense(expense, vehicleId)
      return expense
    }
  },

  async delete(id: string): Promise<void> {
    await initPromise
    
    try {
      // Primary: Delete from IndexedDB
      await indexedDBService.deleteExpense(id)
      
      // Background: Sync to Supabase (optimized)
      syncToSupabase(async () => {
        await supabase.from('expenses').delete().eq('id', id)
      }, 'expense', id)
      
      // Trigger optimized sync
      triggerSync('expense', id)
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  },

  async deleteByVehicleId(vehicleId: string): Promise<void> {
    await initPromise
    
    try {
      const expenses = await indexedDBService.getExpensesByVehicleId(vehicleId)
      for (const expense of expenses) {
        await indexedDBService.deleteExpense(expense.id)
      }
      
      // Background: Sync to Supabase (optimized - batch delete)
      syncToSupabase(async () => {
        await supabase.from('expenses').delete().eq('vehicleId', vehicleId)
      }, 'expense', vehicleId)
      
      // Trigger optimized sync
      triggerSync('expense', vehicleId)
    } catch (error) {
      console.error('Error deleting expenses:', error)
    }
  }
}

// LocalStorage fallback functions (for backward compatibility)
function getLocalStorageVehicles(): Vehicle[] {
  const stored = localStorage.getItem('vehicles')
  return stored ? JSON.parse(stored) : []
}

function saveLocalStorageVehicle(vehicle: Vehicle): void {
  const vehicles = getLocalStorageVehicles()
  vehicles.push(vehicle)
  localStorage.setItem('vehicles', JSON.stringify(vehicles))
}

function updateLocalStorageVehicle(vehicle: Vehicle): void {
  const vehicles = getLocalStorageVehicles()
  const updated = vehicles.map(v => v.id === vehicle.id ? vehicle : v)
  localStorage.setItem('vehicles', JSON.stringify(updated))
}

function deleteLocalStorageVehicle(id: string): void {
  const vehicles = getLocalStorageVehicles()
  const filtered = vehicles.filter(v => v.id !== id)
  localStorage.setItem('vehicles', JSON.stringify(filtered))
  localStorage.removeItem(`vehicle_${id}_jobs`)
  localStorage.removeItem(`vehicle_${id}_expenses`)
}

function getLocalStorageJobs(vehicleId: string): Job[] {
  const stored = localStorage.getItem(`vehicle_${vehicleId}_jobs`)
  return stored ? JSON.parse(stored) : []
}

function saveLocalStorageJob(job: Job, vehicleId: string): void {
  const jobs = getLocalStorageJobs(vehicleId)
  jobs.push(job)
  localStorage.setItem(`vehicle_${vehicleId}_jobs`, JSON.stringify(jobs))
}

function updateLocalStorageJob(job: Job, vehicleId: string): void {
  const jobs = getLocalStorageJobs(vehicleId)
  const updated = jobs.map(j => j.id === job.id ? job : j)
  localStorage.setItem(`vehicle_${vehicleId}_jobs`, JSON.stringify(updated))
}

function getLocalStorageExpenses(vehicleId: string): Expense[] {
  const stored = localStorage.getItem(`vehicle_${vehicleId}_expenses`)
  return stored ? JSON.parse(stored) : []
}

function saveLocalStorageExpense(expense: Expense, vehicleId: string): void {
  const expenses = getLocalStorageExpenses(vehicleId)
  expenses.push(expense)
  localStorage.setItem(`vehicle_${vehicleId}_expenses`, JSON.stringify(expenses))
}

function updateLocalStorageExpense(expense: Expense, vehicleId: string): void {
  const expenses = getLocalStorageExpenses(vehicleId)
  const updated = expenses.map(e => e.id === expense.id ? expense : e)
  localStorage.setItem(`vehicle_${vehicleId}_expenses`, JSON.stringify(updated))
}
