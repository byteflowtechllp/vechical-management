// Utility to push existing credits from IndexedDB to Supabase
// Use this to sync credits that are in IndexedDB but not in Supabase

import { indexedDBService } from '../lib/indexedDB'
import { supabase } from '../lib/supabase'
import { Credit } from '../types'

export async function pushAllCreditsToSupabase(): Promise<{ success: number; failed: number; errors: string[] }> {
  if (!import.meta.env.VITE_SUPABASE_URL || !supabase) {
    console.warn('Supabase not configured')
    return { success: 0, failed: 0, errors: ['Supabase not configured'] }
  }

  const errors: string[] = []
  let success = 0
  let failed = 0

  try {
    // First, let's check all credits in the credits table to see what we have
    console.log('Checking all credits in IndexedDB credits table...')
    let allCreditsFromTable: Array<Credit & { jobId: string }> = []
    try {
      allCreditsFromTable = await indexedDBService.getAllCredits()
      console.log(`Found ${allCreditsFromTable.length} total credits in credits table`)
      if (allCreditsFromTable.length > 0) {
        console.log('Sample credits:', allCreditsFromTable.slice(0, 3).map(c => ({ id: c.id, jobId: c.jobId, amount: c.amount })))
        const jobIdSet = new Set(allCreditsFromTable.map(c => c.jobId))
        console.log(`Credits are associated with ${jobIdSet.size} different jobIds:`, Array.from(jobIdSet))
      } else {
        // Try to manually query the database to see what's there
        console.log('getAllCredits returned 0, trying manual query...')
        try {
          const db = await (indexedDBService as any).getDB()
          const transaction = db.transaction(['credits'], 'readonly')
          const creditsStore = transaction.objectStore('credits')
          const request = creditsStore.getAll()
          
          await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => {
              const rawCredits = request.result || []
              console.log(`Manual getAll found ${rawCredits.length} credits`)
              if (rawCredits.length > 0) {
                console.log('Raw credit data:', rawCredits.slice(0, 3))
                console.log('First credit structure:', Object.keys(rawCredits[0] || {}))
              }
              resolve()
            }
            request.onerror = () => {
              console.error('Manual getAll error:', request.error)
              reject(request.error)
            }
          })
          
          // Also try to check the index
          try {
            const index = creditsStore.index('jobId')
            const indexRequest = index.getAll()
            await new Promise<void>((resolve, reject) => {
              indexRequest.onsuccess = () => {
                const indexCredits = indexRequest.result || []
                console.log(`Index getAll found ${indexCredits.length} credits`)
                if (indexCredits.length > 0) {
                  console.log('Index credit data:', indexCredits.slice(0, 3))
                }
                resolve()
              }
              indexRequest.onerror = () => {
                console.error('Index getAll error:', indexRequest.error)
                reject(indexRequest.error)
              }
            })
          } catch (indexError) {
            console.error('Could not access jobId index:', indexError)
          }
        } catch (manualError) {
          console.error('Error in manual query:', manualError)
        }
      }
    } catch (error) {
      console.error('Error checking all credits:', error)
    }

    // Get all vehicles
    const vehicles = await indexedDBService.getAllVehicles()
    console.log(`Found ${vehicles.length} vehicles in IndexedDB`)

    let totalCreditsFound = 0
    let totalCreditsAlreadySynced = 0

    // Create a map of all jobIds for quick lookup
    const allJobIds = new Set<string>()
    for (const vehicle of vehicles) {
      const jobs = await indexedDBService.getJobsByVehicleId(vehicle.id)
      jobs.forEach(job => allJobIds.add(job.id))
    }
    console.log(`All job IDs found: ${Array.from(allJobIds).join(', ')}`)

    // If we have credits in the table, check if their jobIds match our jobs
    if (allCreditsFromTable.length > 0) {
      const unmatchedCredits = allCreditsFromTable.filter(c => !allJobIds.has(c.jobId))
      if (unmatchedCredits.length > 0) {
        console.warn(`Found ${unmatchedCredits.length} credits with jobIds that don't match any job:`, 
          Array.from(new Set(unmatchedCredits.map(c => c.jobId))))
      }
    }

    for (const vehicle of vehicles) {
      // Get all jobs for this vehicle
      const jobs = await indexedDBService.getJobsByVehicleId(vehicle.id)
      console.log(`Vehicle ${vehicle.id} has ${jobs.length} jobs`)
      console.log(`Job IDs: ${jobs.map(j => j.id).join(', ')}`)

      for (const job of jobs) {
        // Get credits directly from the credits table by jobId
        let creditsFromTable: Credit[] = []
        try {
          creditsFromTable = await indexedDBService.getCreditsByJobId(job.id)
          console.log(`Job ${job.id}: Querying credits table with jobId="${job.id}", found ${creditsFromTable.length} credits`)
        } catch (error) {
          console.error(`Job ${job.id}: Error getting credits from table:`, error)
        }
        
        // Also try to find credits from allCreditsFromTable by matching jobId
        const creditsFromAll = allCreditsFromTable
          .filter(c => c.jobId === job.id)
          .map(c => {
            const { jobId, ...creditWithoutJobId } = c
            return creditWithoutJobId
          })
        if (creditsFromAll.length > 0 && creditsFromTable.length === 0) {
          console.log(`Job ${job.id}: Found ${creditsFromAll.length} credits via direct search`)
          creditsFromTable = creditsFromAll
        }
        
        // Also check job.credits (in case they're stored there too)
        const jobCredits = job.credits || []
        console.log(`Job ${job.id}: job.credits array has ${jobCredits.length} credits`)
        
        // Merge credits, avoiding duplicates (prioritize credits from table)
        const creditMap = new Map<string, Credit>()
        // First add credits from table (these are the source of truth)
        creditsFromTable.forEach(credit => creditMap.set(credit.id, credit))
        // Then add credits from job.credits that aren't already present
        jobCredits.forEach(credit => {
          if (!creditMap.has(credit.id)) {
            creditMap.set(credit.id, credit)
          }
        })
        
        const allCredits = Array.from(creditMap.values())

        if (allCredits.length > 0) {
          totalCreditsFound += allCredits.length
          console.log(`Job ${job.id} has ${allCredits.length} credits in IndexedDB (${creditsFromTable.length} from credits table, ${jobCredits.length} from job.credits)`)

          // Check which credits already exist in Supabase
          const { data: existingCredits, error: queryError } = await supabase
            .from('credits')
            .select('id')
            .eq('jobId', job.id)

          if (queryError) {
            console.error(`Error checking existing credits for job ${job.id}:`, queryError)
            errors.push(`Job ${job.id}: Query error - ${queryError.message}`)
            continue
          }

          const existingIds = new Set(existingCredits?.map(c => c.id) || [])
          console.log(`Job ${job.id}: Found ${existingIds.size} credits already in Supabase`)

          // Push only credits that don't exist in Supabase
          const creditsToPush = allCredits.filter(credit => !existingIds.has(credit.id))
          totalCreditsAlreadySynced += (allCredits.length - creditsToPush.length)

          if (creditsToPush.length > 0) {
            console.log(`Job ${job.id}: Pushing ${creditsToPush.length} new credits to Supabase`)
            try {
              const creditsToInsert = creditsToPush.map(credit => ({
                ...credit,
                type: credit.type || 'cash',
                jobId: job.id
              }))

              const { error } = await supabase.from('credits').insert(creditsToInsert)

              if (error) {
                console.error(`Failed to push credits for job ${job.id}:`, error)
                errors.push(`Job ${job.id}: ${error.message}`)
                failed += creditsToPush.length
              } else {
                console.log(`✓ Successfully pushed ${creditsToPush.length} credits to Supabase for job ${job.id}`)
                success += creditsToPush.length
              }
            } catch (error) {
              console.error(`Error pushing credits for job ${job.id}:`, error)
              errors.push(`Job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
              failed += creditsToPush.length
            }
          } else {
            console.log(`Job ${job.id}: All credits already synced`)
          }
        } else {
          console.log(`Job ${job.id} has no credits`)
        }
      }
    }

    console.log(`Credit sync summary:`)
    console.log(`  - Total credits found in IndexedDB: ${totalCreditsFound}`)
    console.log(`  - Credits already in Supabase: ${totalCreditsAlreadySynced}`)
    console.log(`  - Credits pushed: ${success}`)
    console.log(`  - Credits failed: ${failed}`)
    console.log(`Credit sync complete: ${success} pushed, ${failed} failed`)
    return { success, failed, errors }
  } catch (error) {
    console.error('Error pushing credits to Supabase:', error)
    errors.push(error instanceof Error ? error.message : 'Unknown error')
    return { success, failed, errors }
  }
}

// Call this from browser console: window.pushCreditsToSupabase()
if (typeof window !== 'undefined') {
  (window as any).pushCreditsToSupabase = pushAllCreditsToSupabase
}

