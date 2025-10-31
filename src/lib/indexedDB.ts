import { Vehicle, Job, Expense, Credit } from '../types'

const DB_NAME = 'VehicleManagementDB'
const DB_VERSION = 2 // Increment to trigger upgrade for username indexes

// Helper to get current username
const getCurrentUsername = (): string | null => {
  try {
    const authData = localStorage.getItem('auth')
    if (authData) {
      const { username } = JSON.parse(authData)
      return username || null
    }
  } catch (error) {
    console.error('Failed to get username:', error)
  }
  return null
}

interface Database {
  vehicles: Vehicle[]
  jobs: Record<string, Job[]> // vehicleId -> jobs[]
  expenses: Record<string, Expense[]> // vehicleId -> expenses[]
}

class IndexedDBService {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains('vehicles')) {
          const vehiclesStore = db.createObjectStore('vehicles', { keyPath: 'id' })
          vehiclesStore.createIndex('username', 'username', { unique: false })
        } else {
          const vehiclesStore = (event.target as IDBOpenDBRequest).transaction?.objectStore('vehicles')
          if (vehiclesStore && !vehiclesStore.indexNames.contains('username')) {
            vehiclesStore.createIndex('username', 'username', { unique: false })
          }
        }
        
        if (!db.objectStoreNames.contains('jobs')) {
          const jobsStore = db.createObjectStore('jobs', { keyPath: 'id' })
          jobsStore.createIndex('vehicleId', 'vehicleId', { unique: false })
          jobsStore.createIndex('username', 'username', { unique: false })
        } else {
          const jobsStore = (event.target as IDBOpenDBRequest).transaction?.objectStore('jobs')
          if (jobsStore && !jobsStore.indexNames.contains('username')) {
            jobsStore.createIndex('username', 'username', { unique: false })
          }
        }
        
        if (!db.objectStoreNames.contains('expenses')) {
          const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' })
          expensesStore.createIndex('vehicleId', 'vehicleId', { unique: false })
          expensesStore.createIndex('username', 'username', { unique: false })
        } else {
          const expensesStore = (event.target as IDBOpenDBRequest).transaction?.objectStore('expenses')
          if (expensesStore && !expensesStore.indexNames.contains('username')) {
            expensesStore.createIndex('username', 'username', { unique: false })
          }
        }
        
        if (!db.objectStoreNames.contains('credits')) {
          const creditsStore = db.createObjectStore('credits', { keyPath: 'id' })
          creditsStore.createIndex('jobId', 'jobId', { unique: false })
          creditsStore.createIndex('username', 'username', { unique: false })
        } else {
          const creditsStore = (event.target as IDBOpenDBRequest).transaction?.objectStore('credits')
          if (creditsStore && !creditsStore.indexNames.contains('username')) {
            creditsStore.createIndex('username', 'username', { unique: false })
          }
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
        }
      }
    })
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB')
    }
    return this.db
  }

  // Vehicle operations
  async getAllVehicles(): Promise<Vehicle[]> {
    const db = await this.getDB()
    const username = getCurrentUsername()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['vehicles'], 'readonly')
      const store = transaction.objectStore('vehicles')
      
      let request: IDBRequest
      if (username && store.indexNames.contains('username')) {
        // Filter by username if index exists
        const index = store.index('username')
        request = index.getAll(username)
      } else {
        // Fallback: get all and filter manually
        request = store.getAll()
      }

      request.onsuccess = () => {
        let vehicles = request.result || []
        // Filter by username if we got all vehicles
        if (username && (!store.indexNames.contains('username') || request === store.getAll())) {
          vehicles = vehicles.filter((v: Vehicle & { username?: string }) => v.username === username)
        } else if (username) {
          // Double check - filter out any that don't match
          vehicles = vehicles.filter((v: Vehicle & { username?: string }) => v.username === username)
        }
        resolve(vehicles)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveVehicle(vehicle: Vehicle): Promise<void> {
    const db = await this.getDB()
    const username = getCurrentUsername()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['vehicles'], 'readwrite')
      const store = transaction.objectStore('vehicles')
      // Include username when saving
      const vehicleWithUsername = username ? { ...vehicle, username } : vehicle
      const request = store.put(vehicleWithUsername)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteVehicle(id: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['vehicles'], 'readwrite')
      const store = transaction.objectStore('vehicles')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Job operations
  async getJobsByVehicleId(vehicleId: string): Promise<Job[]> {
    const db = await this.getDB()
    const username = getCurrentUsername()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['jobs', 'credits'], 'readonly')
      const jobsStore = transaction.objectStore('jobs')
      const creditsStore = transaction.objectStore('credits')
      const index = jobsStore.index('vehicleId')
      const request = index.getAll(vehicleId)

      request.onsuccess = () => {
        let jobs = request.result || []
        // Filter by username
        if (username) {
          jobs = jobs.filter((job: Job & { username?: string; vehicleId?: string }) => job.username === username)
        }
        
        // Load credits for each job from credits table
        const creditsPromises = jobs.map((job: Job & { vehicleId: string }) => {
          return new Promise<Credit[]>((res) => {
            const creditsRequest = creditsStore.index('jobId').getAll(job.id)
            creditsRequest.onsuccess = () => {
              res(creditsRequest.result || [])
            }
            creditsRequest.onerror = () => res([])
          })
        })
        
        Promise.all(creditsPromises).then(creditsArrays => {
          // Merge credits from credits table with job.credits
          const jobsWithCredits = jobs.map((job: Job & { vehicleId: string }, index: number) => {
            const creditsFromTable = creditsArrays[index] || []
            const jobCredits = job.credits || []
            
            // Merge credits, avoiding duplicates (prioritize job.credits)
            const creditMap = new Map<string, Credit>()
            // First add credits from job (these are the source of truth from Supabase)
            jobCredits.forEach(credit => creditMap.set(credit.id, credit))
            // Then add credits from table that aren't already present
            creditsFromTable.forEach((credit: Credit) => {
              if (!creditMap.has(credit.id)) {
                creditMap.set(credit.id, credit)
              }
            })
            
            return {
              ...job,
              credits: Array.from(creditMap.values())
            }
          })
          
          resolve(jobsWithCredits)
        }).catch(reject)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveJob(job: Job, vehicleId: string): Promise<void> {
    const db = await this.getDB()
    const username = getCurrentUsername()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['jobs', 'credits'], 'readwrite')
      const jobsStore = transaction.objectStore('jobs')
      const creditsStore = transaction.objectStore('credits')

      // Save job with vehicleId and username
      const jobWithVehicleId = username ? { ...job, vehicleId, username } : { ...job, vehicleId }
      const jobRequest = jobsStore.put(jobWithVehicleId)

      jobRequest.onsuccess = () => {
        // Delete existing credits for this job
        const deleteCreditsRequest = creditsStore.index('jobId').openKeyCursor(IDBKeyRange.only(job.id))
        let creditsProcessed = 0
        
        deleteCreditsRequest.onsuccess = (e: Event) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
          if (cursor) {
            creditsStore.delete(cursor.primaryKey)
            cursor.continue()
          } else {
            // Save new credits after deleting old ones
            if (job.credits && job.credits.length > 0) {
              let creditsSaved = 0
              job.credits.forEach(credit => {
                const creditWithJobId = username 
                  ? { ...credit, jobId: job.id, type: credit.type || 'cash', username }
                  : { ...credit, jobId: job.id, type: credit.type || 'cash' }
                const creditRequest = creditsStore.put(creditWithJobId)
                creditRequest.onsuccess = () => {
                  creditsSaved++
                  if (creditsSaved === job.credits.length) {
                    resolve()
                  }
                }
                creditRequest.onerror = () => {
                  creditsSaved++
                  if (creditsSaved === job.credits.length) {
                    resolve() // Resolve even if some credits fail
                  }
                }
              })
            } else {
              resolve()
            }
          }
        }
        
        deleteCreditsRequest.onerror = () => {
          // If deleting old credits fails, still save new ones
          if (job.credits && job.credits.length > 0) {
            let creditsSaved = 0
            job.credits.forEach(credit => {
              const creditWithJobId = username
                ? { ...credit, jobId: job.id, type: credit.type || 'cash', username }
                : { ...credit, jobId: job.id, type: credit.type || 'cash' }
              const creditRequest = creditsStore.put(creditWithJobId)
              creditRequest.onsuccess = () => {
                creditsSaved++
                if (creditsSaved === job.credits.length) resolve()
              }
              creditRequest.onerror = () => {
                creditsSaved++
                if (creditsSaved === job.credits.length) resolve()
              }
            })
          } else {
            resolve()
          }
        }
      }

      jobRequest.onerror = () => reject(jobRequest.error)
    })
  }

  async deleteJob(id: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['jobs', 'credits'], 'readwrite')
      const jobsStore = transaction.objectStore('jobs')
      const creditsStore = transaction.objectStore('credits')

      // Delete credits first
      const deleteCreditsRequest = creditsStore.index('jobId').openKeyCursor(IDBKeyRange.only(id))
      let creditsDeleted = false
      
      deleteCreditsRequest.onsuccess = (e: Event) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          creditsStore.delete(cursor.primaryKey)
          creditsDeleted = true
          cursor.continue()
        } else {
          // Delete job after credits are deleted
          const deleteJobRequest = jobsStore.delete(id)
          deleteJobRequest.onsuccess = () => resolve()
          deleteJobRequest.onerror = () => {
            if (creditsDeleted) {
              // If credits were deleted but job delete failed, still resolve
              resolve()
            } else {
              reject(deleteJobRequest.error)
            }
          }
        }
      }
      
      deleteCreditsRequest.onerror = () => {
        // If no credits found, just delete job
        const deleteJobRequest = jobsStore.delete(id)
        deleteJobRequest.onsuccess = () => resolve()
        deleteJobRequest.onerror = () => reject(deleteJobRequest.error)
      }
    })
  }

  // Expense operations
  async getExpensesByVehicleId(vehicleId: string): Promise<Expense[]> {
    const db = await this.getDB()
    const username = getCurrentUsername()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['expenses'], 'readonly')
      const store = transaction.objectStore('expenses')
      const index = store.index('vehicleId')
      const request = index.getAll(vehicleId)

      request.onsuccess = () => {
        let expenses = request.result || []
        // Filter by username
        if (username) {
          expenses = expenses.filter((expense: Expense & { username?: string }) => expense.username === username)
        }
        resolve(expenses)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveExpense(expense: Expense, vehicleId: string): Promise<void> {
    const db = await this.getDB()
    const username = getCurrentUsername()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['expenses'], 'readwrite')
      const store = transaction.objectStore('expenses')
      const expenseWithVehicleId = username ? { ...expense, vehicleId, username } : { ...expense, vehicleId }
      const request = store.put(expenseWithVehicleId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteExpense(id: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['expenses'], 'readwrite')
      const store = transaction.objectStore('expenses')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Credit operations
  async saveCredit(credit: Credit, jobId: string): Promise<void> {
    const db = await this.getDB()
    const username = getCurrentUsername()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['credits', 'jobs'], 'readwrite')
      const creditsStore = transaction.objectStore('credits')
      const jobsStore = transaction.objectStore('jobs')

      // Save credit with username
      const creditWithJobId = username ? { ...credit, jobId, username } : { ...credit, jobId }
      const creditRequest = creditsStore.put(creditWithJobId)

      creditRequest.onsuccess = () => {
        // Update job's credits array
        const jobRequest = jobsStore.get(jobId)
        jobRequest.onsuccess = () => {
          const job = jobRequest.result as Job & { vehicleId: string }
          if (job) {
            const existingCreditIndex = job.credits?.findIndex(c => c.id === credit.id) ?? -1
            const updatedCredits = job.credits || []
            if (existingCreditIndex >= 0) {
              updatedCredits[existingCreditIndex] = credit
            } else {
              updatedCredits.push(credit)
            }
            job.credits = updatedCredits
            jobsStore.put(job).onsuccess = () => resolve()
          } else {
            resolve()
          }
        }
        jobRequest.onerror = () => resolve() // Continue even if job update fails
      }

      creditRequest.onerror = () => reject(creditRequest.error)
    })
  }

  async deleteCredit(id: string, jobId: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['credits', 'jobs'], 'readwrite')
      const creditsStore = transaction.objectStore('credits')
      const jobsStore = transaction.objectStore('jobs')

      // Delete credit
      const deleteRequest = creditsStore.delete(id)

      deleteRequest.onsuccess = () => {
        // Update job's credits array
        const jobRequest = jobsStore.get(jobId)
        jobRequest.onsuccess = () => {
          const job = jobRequest.result as Job & { vehicleId: string }
          if (job && job.credits) {
            job.credits = job.credits.filter(c => c.id !== id)
            jobsStore.put(job).onsuccess = () => resolve()
          } else {
            resolve()
          }
        }
        jobRequest.onerror = () => resolve()
      }

      deleteRequest.onerror = () => reject(deleteRequest.error)
    })
  }

  async getCreditsByJobId(jobId: string): Promise<Credit[]> {
    const db = await this.getDB()
    const username = getCurrentUsername()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['credits'], 'readonly')
      const creditsStore = transaction.objectStore('credits')
      
      // Try to get the index
      let index: IDBIndex
      try {
        index = creditsStore.index('jobId')
      } catch (error) {
        console.error('Index "jobId" not found, trying alternative method:', error)
        // Fallback: get all and filter
        const getAllRequest = creditsStore.getAll()
        getAllRequest.onsuccess = () => {
          let allCredits = getAllRequest.result || []
          let filtered = allCredits.filter((credit: Credit & { jobId?: string; username?: string }) => {
            return String(credit.jobId) === String(jobId)
          })
          // Filter by username
          if (username) {
            filtered = filtered.filter((credit: Credit & { username?: string }) => credit.username === username)
          }
          const cleanedCredits = filtered.map((credit: Credit & { jobId?: string; username?: string }) => {
            const { jobId, username, ...creditWithoutMeta } = credit
            return creditWithoutMeta
          })
          resolve(cleanedCredits)
        }
        getAllRequest.onerror = () => reject(getAllRequest.error)
        return
      }
      
      // Convert jobId to string to ensure type match
      const jobIdStr = String(jobId)
      const request = index.getAll(jobIdStr)

      request.onsuccess = () => {
        let credits = request.result || []
        // Filter by username
        if (username) {
          credits = credits.filter((credit: Credit & { username?: string }) => credit.username === username)
        }
        console.log(`getCreditsByJobId(${jobIdStr}): Found ${credits.length} credits via index query`)
        // Remove jobId and username from credit objects before returning (they're metadata)
        const cleanedCredits = credits.map((credit: Credit & { jobId?: string; username?: string }) => {
          const { jobId, username, ...creditWithoutMeta } = credit
          return creditWithoutMeta
        })
        resolve(cleanedCredits)
      }
      request.onerror = () => {
        console.error(`Error querying index for jobId "${jobIdStr}":`, request.error)
        // Fallback: get all and filter
        const getAllRequest = creditsStore.getAll()
        getAllRequest.onsuccess = () => {
          let allCredits = getAllRequest.result || []
          let filtered = allCredits.filter((credit: Credit & { jobId?: string; username?: string }) => {
            return String(credit.jobId) === jobIdStr
          })
          // Filter by username
          if (username) {
            filtered = filtered.filter((credit: Credit & { username?: string }) => credit.username === username)
          }
          const cleanedCredits = filtered.map((credit: Credit & { jobId?: string; username?: string }) => {
            const { jobId, username, ...creditWithoutMeta } = credit
            return creditWithoutMeta
          })
          console.log(`Fallback: Found ${cleanedCredits.length} credits by filtering all credits`)
          resolve(cleanedCredits)
        }
        getAllRequest.onerror = () => reject(getAllRequest.error)
      }
    })
  }

  async getAllCredits(): Promise<Array<Credit & { jobId: string }>> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['credits'], 'readonly')
      const creditsStore = transaction.objectStore('credits')
      const request = creditsStore.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // Migration from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    // Migrate vehicles
    const vehiclesStr = localStorage.getItem('vehicles')
    if (vehiclesStr) {
      const vehicles: Vehicle[] = JSON.parse(vehiclesStr)
      for (const vehicle of vehicles) {
        await this.saveVehicle(vehicle)
      }
    }

    // Migrate jobs and expenses
    const vehicles = await this.getAllVehicles()
    for (const vehicle of vehicles) {
      const jobsStr = localStorage.getItem(`vehicle_${vehicle.id}_jobs`)
      if (jobsStr) {
        const jobs: Job[] = JSON.parse(jobsStr)
        for (const job of jobs) {
          await this.saveJob(job, vehicle.id)
        }
      }

      const expensesStr = localStorage.getItem(`vehicle_${vehicle.id}_expenses`)
      if (expensesStr) {
        const expenses: Expense[] = JSON.parse(expensesStr)
        for (const expense of expenses) {
          await this.saveExpense(expense, vehicle.id)
        }
      }
    }
  }
}

export const indexedDBService = new IndexedDBService()

