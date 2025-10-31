import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiBriefcase, FiDollarSign, FiArrowRight } from 'react-icons/fi'
import { Vehicle, Job, Expense } from '../types'
import JobModal from './JobModal'
import ExpenseModal from './ExpenseModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import ThemeToggle from './ThemeToggle'
import { vehicleService, jobService, expenseService } from '../services/database'
import './VehicleDetailScreen.styl'

interface VehicleDetailScreenProps {
  onLogout?: () => void
}

const VehicleDetailScreen = ({}: VehicleDetailScreenProps) => {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [activeTab, setActiveTab] = useState<'job' | 'expense'>('job')
  const [isJobModalOpen, setIsJobModalOpen] = useState<boolean>(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; type: 'job' | 'expense' | null; id: string | null }>({ isOpen: false, type: null, id: null })

  useEffect(() => {
    if (vehicleId) {
      loadVehicleData()
    }
  }, [vehicleId])

  const loadVehicleData = async (): Promise<void> => {
    if (!vehicleId) return

    try {
      // Load vehicle
      const vehicles = await vehicleService.getAll()
      const found = vehicles.find(v => v.id === vehicleId)
      if (found) {
        setVehicle(found)
      } else {
        navigate('/home')
        return
      }

      // Load jobs and expenses
      const [jobsData, expensesData] = await Promise.all([
        jobService.getByVehicleId(vehicleId),
        expenseService.getByVehicleId(vehicleId)
      ])

      setJobs(jobsData)
      setExpenses(expensesData)
    } catch (error) {
      console.error('Failed to load vehicle data:', error)
      // Fallback to localStorage
      const storedVehicles = localStorage.getItem('vehicles')
      if (storedVehicles) {
        const vehicles: Vehicle[] = JSON.parse(storedVehicles)
        const found = vehicles.find(v => v.id === vehicleId)
        if (found) {
          setVehicle(found)
        } else {
          navigate('/home')
          return
        }
      }

      const storedJobs = localStorage.getItem(`vehicle_${vehicleId}_jobs`)
      if (storedJobs) {
        setJobs(JSON.parse(storedJobs))
      }

      const storedExpenses = localStorage.getItem(`vehicle_${vehicleId}_expenses`)
      if (storedExpenses) {
        setExpenses(JSON.parse(storedExpenses))
      }
    }
  }


  const handleAddJob = (): void => {
    setEditingJob(null)
    setIsJobModalOpen(true)
  }

  const handleEditJob = (job: Job): void => {
    setEditingJob(job)
    setIsJobModalOpen(true)
  }

  const handleDeleteJob = (id: string): void => {
    setDeleteConfirmModal({ isOpen: true, type: 'job', id })
  }

  const confirmDeleteJob = async (): Promise<void> => {
    const id = deleteConfirmModal.id
    if (!id) return

    try {
      await jobService.delete(id)
      const updatedJobs = jobs.filter(j => j.id !== id)
      setJobs(updatedJobs)
    } catch (error) {
      console.error('Failed to delete job:', error)
      const updatedJobs = jobs.filter(j => j.id !== id)
      setJobs(updatedJobs)
      if (vehicleId) {
        localStorage.setItem(`vehicle_${vehicleId}_jobs`, JSON.stringify(updatedJobs))
      }
    }
    setDeleteConfirmModal({ isOpen: false, type: null, id: null })
  }

  const handleSaveJob = async (job: Job): Promise<void> => {
    if (!vehicleId) return

    try {
      if (editingJob) {
        const updatedJob = await jobService.update(job, vehicleId)
        const updatedJobs = jobs.map(j => j.id === editingJob.id ? updatedJob : j)
        setJobs(updatedJobs)
      } else {
        const newJob = await jobService.create(job, vehicleId)
        setJobs([...jobs, newJob])
      }
      setIsJobModalOpen(false)
      setEditingJob(null)
    } catch (error) {
      console.error('Failed to save job:', error)
      // Fallback to localStorage
      let updatedJobs: Job[]
      if (editingJob) {
        updatedJobs = jobs.map(j => j.id === editingJob.id ? job : j)
      } else {
        updatedJobs = [...jobs, job]
      }
      setJobs(updatedJobs)
      if (vehicleId) {
        localStorage.setItem(`vehicle_${vehicleId}_jobs`, JSON.stringify(updatedJobs))
      }
      setIsJobModalOpen(false)
      setEditingJob(null)
    }
  }

  const handleAddExpense = (): void => {
    setEditingExpense(null)
    setIsExpenseModalOpen(true)
  }

  const handleEditExpense = (expense: Expense): void => {
    setEditingExpense(expense)
    setIsExpenseModalOpen(true)
  }

  const handleDeleteExpense = (id: string): void => {
    setDeleteConfirmModal({ isOpen: true, type: 'expense', id })
  }

  const confirmDeleteExpense = async (): Promise<void> => {
    const id = deleteConfirmModal.id
    if (!id) return

    try {
      await expenseService.delete(id)
      const updatedExpenses = expenses.filter(e => e.id !== id)
      setExpenses(updatedExpenses)
    } catch (error) {
      console.error('Failed to delete expense:', error)
      const updatedExpenses = expenses.filter(e => e.id !== id)
      setExpenses(updatedExpenses)
      if (vehicleId) {
        localStorage.setItem(`vehicle_${vehicleId}_expenses`, JSON.stringify(updatedExpenses))
      }
    }
    setDeleteConfirmModal({ isOpen: false, type: null, id: null })
  }

  const handleSaveExpense = async (expense: Expense): Promise<void> => {
    if (!vehicleId) return

    try {
      if (editingExpense) {
        const updatedExpense = await expenseService.update(expense, vehicleId)
        const updatedExpenses = expenses.map(e => e.id === editingExpense.id ? updatedExpense : e)
        setExpenses(updatedExpenses)
      } else {
        const newExpense = await expenseService.create(expense, vehicleId)
        setExpenses([...expenses, newExpense])
      }
      setIsExpenseModalOpen(false)
      setEditingExpense(null)
    } catch (error) {
      console.error('Failed to save expense:', error)
      // Fallback to localStorage
      let updatedExpenses: Expense[]
      if (editingExpense) {
        updatedExpenses = expenses.map(e => e.id === editingExpense.id ? expense : e)
      } else {
        updatedExpenses = [...expenses, expense]
      }
      setExpenses(updatedExpenses)
      if (vehicleId) {
        localStorage.setItem(`vehicle_${vehicleId}_expenses`, JSON.stringify(updatedExpenses))
      }
      setIsExpenseModalOpen(false)
      setEditingExpense(null)
    }
  }


  if (!vehicle) {
    return <div>Loading...</div>
  }

  const totalCredits = (job: Job): number => {
    return job.credits.reduce((sum, credit) => sum + credit.amount, 0)
  }

  return (
        <div className="vehicle-detail-screen">
          <header className="header">
            <button className="back-button" onClick={() => navigate('/home')}>
              <FiArrowLeft /> Back
            </button>
            <div className="header-title-section">
              <h1>{vehicle.vehicleNumber}</h1>
              <span className="header-model-type">{vehicle.modelType}</span>
            </div>
            <div className="header-actions">
              <ThemeToggle />
              {activeTab === 'job' ? (
                <button className="add-button header-add-button" onClick={handleAddJob}>
                  <FiPlus /> Add Job
                </button>
              ) : (
                <button className="add-button header-add-button" onClick={handleAddExpense}>
                  <FiPlus /> Add Expense
                </button>
              )}
            </div>
          </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'job' ? 'active' : ''}`}
          onClick={() => setActiveTab('job')}
        >
          <FiBriefcase /> Jobs
        </button>
        <button 
          className={`tab ${activeTab === 'expense' ? 'active' : ''}`}
          onClick={() => setActiveTab('expense')}
        >
          <FiDollarSign /> Expenses
        </button>
      </div>

      <div className="content">
        {activeTab === 'job' ? (
          <div className="job-section">
            {jobs.length === 0 ? (
              <div className="empty-state">
                <p>No jobs added yet. Click "Add Job" in the header to get started.</p>
              </div>
            ) : (
              <div className="job-list">
                {jobs.map(job => (
                  <div 
                    key={job.id} 
                    className="job-card"
                    onClick={() => navigate(`/vehicle/${vehicleId}/job/${job.id}/credits`)}
                  >
                    <div className="job-header">
                      <h3>{job.title}</h3>
                      <div className="job-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="edit-button" 
                          onClick={() => handleEditJob(job)}
                          title="Edit Job"
                        >
                          <FiEdit2 />
                        </button>
                        <button 
                          className="delete-button" 
                          onClick={() => handleDeleteJob(job.id)}
                          title="Delete Job"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    <div className="job-content">
                      <div className="job-key-metrics">
                        <div className="metric-item">
                          <span className="metric-label">Budget</span>
                          <span className="metric-value">₹{job.budget.toLocaleString()}</span>
                        </div>
                        <div className="metric-item highlight credits-metric">
                          <span className="metric-label">Credits</span>
                          <span className="metric-value">₹{totalCredits(job).toLocaleString()}</span>
                          <button 
                            className="credits-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/vehicle/${vehicleId}/job/${job.id}/credits`)
                            }}
                            title="View Credits"
                          >
                            <FiArrowRight />
                          </button>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">{job.billingCycle}</span>
                          <span className="metric-value">
                            {job.startDate && job.endDate 
                              ? `${new Date(job.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(job.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : '-'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="expense-section">
            {expenses.length === 0 ? (
              <div className="empty-state">
                <p>No expenses added yet. Click "Add Expense" in the header to get started.</p>
              </div>
            ) : (
              <div className="expense-list">
                {expenses.map(expense => (
                  <div key={expense.id} className="expense-card">
                    <div className="expense-header">
                      <h3>{expense.title}</h3>
                      <div className="expense-actions">
                        <button 
                          className="edit-button" 
                          onClick={() => handleEditExpense(expense)}
                          title="Edit Expense"
                        >
                          <FiEdit2 />
                        </button>
                        <button 
                          className="delete-button" 
                          onClick={() => handleDeleteExpense(expense.id)}
                          title="Delete Expense"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    <div className="expense-content">
                      <div className="expense-key-metrics">
                        <div className="metric-item highlight">
                          <span className="metric-label">Amount</span>
                          <span className="metric-value">₹{expense.amount.toLocaleString()}</span>
                        </div>
                        <div className="metric-item">
                          <span className="metric-label">Date</span>
                          <span className="metric-value">{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isJobModalOpen && (
        <JobModal
          job={editingJob}
          onSave={handleSaveJob}
          onClose={() => {
            setIsJobModalOpen(false)
            setEditingJob(null)
          }}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          expense={editingExpense}
          onSave={handleSaveExpense}
          onClose={() => {
            setIsExpenseModalOpen(false)
            setEditingExpense(null)
          }}
        />
      )}

      {deleteConfirmModal.isOpen && deleteConfirmModal.id && (
        <DeleteConfirmModal
          message={
            deleteConfirmModal.type === 'job'
              ? 'Are you sure you want to delete this job?'
              : 'Are you sure you want to delete this expense?'
          }
          onConfirm={deleteConfirmModal.type === 'job' ? confirmDeleteJob : confirmDeleteExpense}
          onCancel={() => setDeleteConfirmModal({ isOpen: false, type: null, id: null })}
        />
      )}
    </div>
  )
}

export default VehicleDetailScreen

