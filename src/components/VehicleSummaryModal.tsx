import { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { Vehicle, Job, Expense } from '../types'
import { jobService, expenseService } from '../services/database'
import './VehicleSummaryModal.styl'

interface VehicleSummaryModalProps {
  vehicle: Vehicle
  onClose: () => void
}

interface SummaryData {
  totalCredits: number
  totalOutstanding: number
  totalInvoiceRaised: number
  monthlyBreakdown: MonthlyBreakdown[]
  outstandingTillMonth: number
  jobOutstandingTillMonth: Map<string, number>
}

interface MonthlyBreakdown {
  jobId: string
  jobName: string
  month: string
  expectedAmount: number
  creditsReceived: number
  outstanding: number
  totalBudget: number
  durationMonths: number
}

const VehicleSummaryModal = ({ vehicle, onClose }: VehicleSummaryModalProps) => {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    loadSummaryData()
  }, [vehicle.id])

  const loadSummaryData = async (): Promise<void> => {
    setLoading(true)
    try {
      const [jobsData, expensesData] = await Promise.all([
        jobService.getByVehicleId(vehicle.id),
        expenseService.getByVehicleId(vehicle.id)
      ])

      setJobs(jobsData)
      setExpenses(expensesData)

      // Calculate summary
      const summaryData = calculateSummary(jobsData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to load summary data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSummary = (jobs: Job[]): SummaryData => {
    let totalCredits = 0
    let totalOutstanding = 0
    const monthlyBreakdown: MonthlyBreakdown[] = []
    let outstandingTillMonth = 0

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    // Store job outstanding till month for display
    const jobOutstandingTillMonth = new Map<string, number>()

    // Process each job
    jobs.forEach(job => {
      const jobCredits = job.credits.reduce((sum, credit) => sum + credit.amount, 0)
      
      totalCredits += jobCredits

      // Handle monthly jobs
      if (job.billingCycle === 'monthly' && job.startDate) {
        const startDate = new Date(job.startDate)
        const endDate = job.endDate ? new Date(job.endDate) : null
        
        // For monthly cycle, budget is the per-month amount
        const duration = job.durationMonths || 1
        const monthlyAmount = job.budget // Budget is already per month for monthly cycle
        
        let monthDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
        let monthIndex = 0
        let jobMonthlyOutstanding = 0 // Track outstanding for this monthly job
        let jobOutstandingTillCurrentMonth = 0 // Track outstanding till current month for this job
        
        while (!endDate || monthDate <= endDate) {
          const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
          
          // Calculate credits received in this month
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)
          
          const monthCredits = job.credits
            .filter(credit => {
              const creditDate = new Date(credit.date)
              return creditDate >= monthStart && creditDate <= monthEnd
            })
            .reduce((sum, credit) => sum + credit.amount, 0)

          // Calculate outstanding for this month - if payment not done, it's outstanding
          const monthOutstanding = Math.max(0, monthlyAmount - monthCredits)
          jobMonthlyOutstanding += monthOutstanding // Add to job's total outstanding

          // Add entry with job information
          monthlyBreakdown.push({
            jobId: job.id,
            jobName: job.title,
            month: monthKey,
            expectedAmount: monthlyAmount,
            creditsReceived: monthCredits,
            outstanding: monthOutstanding,
            totalBudget: job.budget,
            durationMonths: duration
          })

          // Calculate outstanding till current month for this job
          if (monthDate.getFullYear() === currentYear && monthDate.getMonth() === currentMonth) {
            outstandingTillMonth += monthOutstanding
            jobOutstandingTillCurrentMonth += monthOutstanding
          } else if (monthDate < new Date(currentYear, currentMonth, 1)) {
            outstandingTillMonth += monthOutstanding
            jobOutstandingTillCurrentMonth += monthOutstanding
          }

          monthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
          monthIndex++
          
          // Safety check to prevent infinite loop
          if (monthIndex > 120) break // Max 10 years
        }
        
        // Store outstanding till month for this job
        jobOutstandingTillMonth.set(job.id, jobOutstandingTillCurrentMonth)
        
        // For monthly jobs, use sum of monthly outstanding
        totalOutstanding += jobMonthlyOutstanding
      } else {
        // For non-monthly jobs (one-time, daily), calculate outstanding normally
        const jobOutstanding = Math.max(0, job.budget - jobCredits)
        totalOutstanding += jobOutstanding
        
        // For non-monthly jobs, outstanding till month is same as total outstanding if job is active
        // Store outstanding for display
        jobOutstandingTillMonth.set(job.id, jobOutstanding)
      }
    })

    // Sort monthly breakdown by job name, then by month
    monthlyBreakdown.sort((a, b) => {
      if (a.jobName !== b.jobName) {
        return a.jobName.localeCompare(b.jobName)
      }
      return a.month.localeCompare(b.month)
    })

    return {
      totalCredits,
      totalOutstanding,
      totalInvoiceRaised: totalCredits, // Invoice raised = credits received
      monthlyBreakdown,
      outstandingTillMonth,
      jobOutstandingTillMonth // Store for use in rendering
    }
  }

  const formatMonth = (monthKey: string): string => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content vehicle-summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Vehicle Summary - {vehicle.vehicleNumber}</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="summary-content">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : summary ? (
            <>
              <div className="summary-stats">
                <div className="stat-card">
                  <div className="stat-label">Total Credits</div>
                  <div className="stat-value">₹{summary.totalCredits.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Outstanding</div>
                  <div className="stat-value outstanding">₹{summary.totalOutstanding.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Invoice Raised</div>
                  <div className="stat-value">₹{summary.totalInvoiceRaised.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Outstanding Till Month</div>
                  <div className="stat-value outstanding">₹{summary.outstandingTillMonth.toLocaleString()}</div>
                </div>
              </div>

              <div className="summary-details">
                <div className="detail-section">
                  <h3>Jobs Overview</h3>
                  <div className="jobs-list">
                    {jobs.length === 0 ? (
                      <p className="no-data">No jobs found</p>
                    ) : (
                      jobs
                        .map(job => {
                          const jobCredits = job.credits.reduce((sum, credit) => sum + credit.amount, 0)
                          const jobOutstanding = Math.max(0, job.budget - jobCredits)
                          const outstandingTillMonth = summary.jobOutstandingTillMonth.get(job.id) || 0
                          return { job, jobCredits, jobOutstanding, outstandingTillMonth }
                        })
                        .sort((a, b) => {
                          // Sort by outstanding amount (highest first)
                          const outstandingA = a.outstandingTillMonth || a.jobOutstanding
                          const outstandingB = b.outstandingTillMonth || b.jobOutstanding
                          return outstandingB - outstandingA
                        })
                        .map(({ job, jobCredits, jobOutstanding, outstandingTillMonth }) => (
                          <div key={job.id} className="job-summary-item">
                            <div className="job-title">{job.title}</div>
                            <div className="job-metrics">
                              <span>Budget: ₹{job.budget.toLocaleString()}</span>
                              <span>Credits: ₹{jobCredits.toLocaleString()}</span>
                              {job.billingCycle === 'monthly' ? (
                                <>
                                  <span className={jobOutstanding > 0 ? 'outstanding' : ''}>
                                    Outstanding (Total): ₹{jobOutstanding.toLocaleString()}
                                  </span>
                                  <span className={`outstanding-till-month ${outstandingTillMonth > 0 ? 'outstanding' : ''}`}>
                                    Outstanding (Start to Current Month): ₹{outstandingTillMonth.toLocaleString()}
                                  </span>
                                </>
                              ) : (
                                <span className={jobOutstanding > 0 ? 'outstanding' : ''}>
                                  Outstanding: ₹{jobOutstanding.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {summary.monthlyBreakdown.length > 0 && (
                  <div className="detail-section">
                    <h3>Monthly Cycle Breakdown</h3>
                    <div className="monthly-table">
                      <div className="table-header">
                        <div>Month</div>
                        <div>Expected</div>
                        <div>Received</div>
                        <div>Outstanding</div>
                      </div>
                      {(() => {
                        // Group monthly breakdown by job
                        const groupedByJob = new Map<string, MonthlyBreakdown[]>()
                        summary.monthlyBreakdown.forEach(month => {
                          if (!groupedByJob.has(month.jobId)) {
                            groupedByJob.set(month.jobId, [])
                          }
                          groupedByJob.get(month.jobId)!.push(month)
                        })

                        const result: JSX.Element[] = []
                        groupedByJob.forEach((months, jobId) => {
                          const firstMonth = months[0]
                          // Job header
                          result.push(
                            <div key={`job-header-${jobId}`} className="job-group-header">
                              <div className="job-group-name">{firstMonth.jobName}</div>
                              <div className="job-group-info">
                                Monthly Budget: ₹{firstMonth.totalBudget.toLocaleString()} for {firstMonth.durationMonths} months
                              </div>
                            </div>
                          )
                          // Month rows for this job
                          months.forEach((month, monthIndex) => {
                            result.push(
                              <div key={`${jobId}-${month.month}-${monthIndex}`} className="table-row">
                                <div>{formatMonth(month.month)}</div>
                                <div>₹{month.expectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}</div>
                                <div>₹{month.creditsReceived.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}</div>
                                <div className={month.outstanding > 0 ? 'outstanding' : ''}>
                                  ₹{month.outstanding.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                                </div>
                              </div>
                            )
                          })
                        })
                        return result
                      })()}
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <h3>Expenses</h3>
                  <div className="expenses-list">
                    {expenses.length === 0 ? (
                      <p className="no-data">No expenses found</p>
                    ) : (
                      <div className="total-expenses">
                        Total Expenses: ₹{expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="error">Failed to load summary data</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VehicleSummaryModal

