import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Job, Credit } from '../types'
import CreditModal from './CreditModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService, jobService, creditService } from '../services/database'
import './JobCreditsScreen.styl'

const JobCreditsScreen = () => {
  const { vehicleId, jobId } = useParams<{ vehicleId: string; jobId: string }>()
  const navigate = useNavigate()
  const { canEdit } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [vehicleNumber, setVehicleNumber] = useState<string>('')
  const [isCreditModalOpen, setIsCreditModalOpen] = useState<boolean>(false)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; creditId: string | null }>({ isOpen: false, creditId: null })

  useEffect(() => {
    if (vehicleId && jobId) {
      loadJobData()
    }
  }, [vehicleId, jobId])

  const loadJobData = async (): Promise<void> => {
    if (!vehicleId || !jobId) return

    try {
      // Load vehicle info
      const vehicles = await vehicleService.getAll()
      const vehicle = vehicles.find(v => v.id === vehicleId)
      if (vehicle) {
        setVehicleNumber(vehicle.vehicleNumber)
      }

      // Load job data
      const jobData = await jobService.getById(jobId)
      // Verify job belongs to vehicle (vehicleId is in database but not in TypeScript type)
      const jobsForVehicle = await jobService.getByVehicleId(vehicleId)
      const foundJob = jobsForVehicle.find(j => j.id === jobId)
      if (!foundJob) {
        navigate(`/vehicle/${vehicleId}`)
        return
      }
      setJob(jobData)
    } catch (error) {
      console.error('Failed to load job data:', error)
      // Fallback to localStorage
      const storedVehicles = localStorage.getItem('vehicles')
      if (storedVehicles) {
        const vehicles = JSON.parse(storedVehicles)
        const vehicle = vehicles.find((v: any) => v.id === vehicleId)
        if (vehicle) {
          setVehicleNumber(vehicle.vehicleNumber)
        }
      }

      const storedJobs = localStorage.getItem(`vehicle_${vehicleId}_jobs`)
      if (storedJobs) {
        const jobs: Job[] = JSON.parse(storedJobs)
        const foundJob = jobs.find(j => j.id === jobId)
        if (foundJob) {
          setJob(foundJob)
        } else {
          navigate(`/vehicle/${vehicleId}`)
        }
      }
    }
  }

  const handleAddCredit = (): void => {
    setIsCreditModalOpen(true)
  }

  const handleSaveCredit = async (credit: { amount: number; date: string; type: 'online' | 'cash' }): Promise<void> => {
    if (!job || !jobId) return

    try {
      const newCredit: Credit = {
        id: Date.now().toString(),
        ...credit
      }
      await creditService.create(newCredit, jobId)
      const updatedJob = {
        ...job,
        credits: [...job.credits, newCredit]
      }
      setJob(updatedJob)
      setIsCreditModalOpen(false)
    } catch (error) {
      console.error('Failed to save credit:', error)
      // Fallback to localStorage
      const newCredit: Credit = {
        id: Date.now().toString(),
        ...credit
      }
      const updatedJob = {
        ...job,
        credits: [...job.credits, newCredit]
      }
      if (vehicleId && jobId) {
        const storedJobs = localStorage.getItem(`vehicle_${vehicleId}_jobs`)
        if (storedJobs) {
          const jobs: Job[] = JSON.parse(storedJobs)
          const updatedJobs = jobs.map(j => j.id === jobId ? updatedJob : j)
          localStorage.setItem(`vehicle_${vehicleId}_jobs`, JSON.stringify(updatedJobs))
        }
      }
      setJob(updatedJob)
      setIsCreditModalOpen(false)
    }
  }

  const handleDeleteCredit = (creditId: string): void => {
    if (!job) return
    setDeleteConfirmModal({ isOpen: true, creditId })
  }

  const confirmDeleteCredit = async (): Promise<void> => {
    const creditId = deleteConfirmModal.creditId
    if (!job || !creditId) return

    try {
      await creditService.delete(creditId)
      const updatedJob = {
        ...job,
        credits: job.credits.filter(c => c.id !== creditId)
      }
      setJob(updatedJob)
    } catch (error) {
      console.error('Failed to delete credit:', error)
      // Fallback to localStorage
      const updatedJob = {
        ...job,
        credits: job.credits.filter(c => c.id !== creditId)
      }
      if (vehicleId && jobId) {
        const storedJobs = localStorage.getItem(`vehicle_${vehicleId}_jobs`)
        if (storedJobs) {
          const jobs: Job[] = JSON.parse(storedJobs)
          const updatedJobs = jobs.map(j => j.id === jobId ? updatedJob : j)
          localStorage.setItem(`vehicle_${vehicleId}_jobs`, JSON.stringify(updatedJobs))
        }
      }
      setJob(updatedJob)
    }
    setDeleteConfirmModal({ isOpen: false, creditId: null })
  }

  if (!job) {
    return <div>Loading...</div>
  }

  const totalCredits = job.credits.reduce((sum, credit) => sum + credit.amount, 0)

  return (
    <div className="job-credits-screen">
          <header className="header">
            <button className="back-button" onClick={() => navigate(`/vehicle/${vehicleId}`)}>
              <FiArrowLeft /> Back
            </button>
            <div className="header-title-section">
              <h1>{job.title}</h1>
              <span className="header-vehicle-number">{vehicleNumber}</span>
            </div>
            <div className="header-actions">
              <ThemeToggle />
              {canEdit() && (
                <button className="add-button header-add-button" onClick={handleAddCredit}>
                  <FiPlus /> Add Credit
                </button>
              )}
            </div>
          </header>

      <div className="summary-bar">
        <div className="summary-item highlight">
          <span className="summary-label">Total Credits</span>
          <span className="summary-value">₹{totalCredits.toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Budget</span>
          <span className="summary-value">₹{job.budget.toLocaleString()}</span>
        </div>
      </div>

      <div className="content">
        <div className="credits-section-header">
          <h2>Credits List</h2>
        </div>

        {job.credits.length === 0 ? (
          <div className="empty-state">
            <p>No credits added yet. Click "Add Credit" to get started.</p>
          </div>
        ) : (
              <div className="credits-list">
                {job.credits.map(credit => (
                  <div key={credit.id} className="credit-item">
                    <div className="credit-info">
                      <span className="credit-amount">₹{credit.amount.toLocaleString()}</span>
                      <div className="credit-meta">
                        <span className="credit-date">{new Date(credit.date).toLocaleDateString()}</span>
                        <span className={`credit-type credit-type-${credit.type || 'cash'}`}>
                          {(credit.type || 'cash') === 'online' ? 'Online' : 'Cash'}
                        </span>
                      </div>
                    </div>
                    {canEdit() && (
                      <button
                        className="delete-credit-button"
                        onClick={() => handleDeleteCredit(credit.id)}
                        title="Delete Credit"
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                ))}
              </div>
        )}
      </div>

      {isCreditModalOpen && (
        <CreditModal
          onSave={handleSaveCredit}
          onClose={() => setIsCreditModalOpen(false)}
        />
      )}

      {deleteConfirmModal.isOpen && deleteConfirmModal.creditId && (
        <DeleteConfirmModal
          message="Are you sure you want to delete this credit?"
          onConfirm={confirmDeleteCredit}
          onCancel={() => setDeleteConfirmModal({ isOpen: false, creditId: null })}
        />
      )}
    </div>
  )
}

export default JobCreditsScreen

