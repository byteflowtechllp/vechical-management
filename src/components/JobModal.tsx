import { useState, useEffect } from 'react'
import { FiX, FiSave, FiXCircle } from 'react-icons/fi'
import { Job, BillingCycle } from '../types'
import { useBackButton } from '../hooks/useBackButton'
import './JobModal.styl'

interface JobModalProps {
  job: Job | null
  onSave: (job: Job) => void
  onClose: () => void
}

const JobModal = ({ job, onSave, onClose }: JobModalProps) => {
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [budget, setBudget] = useState<string>('')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('one-time')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [durationMonths, setDurationMonths] = useState<string>('')

  // Handle Android back button
  useBackButton({ enabled: true, onBack: onClose })

  useEffect(() => {
    if (job) {
      setTitle(job.title)
      setDescription(job.description)
      setBudget(job.budget.toString())
      setBillingCycle(job.billingCycle)
      setStartDate(job.startDate ? job.startDate.split('T')[0] : '')
      setEndDate(job.endDate ? job.endDate.split('T')[0] : '')
      setDurationMonths(job.durationMonths ? job.durationMonths.toString() : '')
    } else {
      // Set default start date to today
      setStartDate(new Date().toISOString().split('T')[0])
    }
  }, [job])

  const calculateEndDate = (start: string, months: string): void => {
    if (start && months && !isNaN(parseInt(months))) {
      const startDateObj = new Date(start)
      const monthsNum = parseInt(months)
      const endDateObj = new Date(startDateObj)
      endDateObj.setMonth(endDateObj.getMonth() + monthsNum)
      setEndDate(endDateObj.toISOString().split('T')[0])
    }
  }

  const handleDurationChange = (value: string): void => {
    setDurationMonths(value)
    if (startDate && value) {
      calculateEndDate(startDate, value)
    }
  }

  const handleStartDateChange = (value: string): void => {
    setStartDate(value)
    if (value && durationMonths) {
      calculateEndDate(value, durationMonths)
    }
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!title.trim() || !budget.trim()) {
      alert('Please fill in all required fields')
      return
    }

    const budgetValue = parseFloat(budget)
    if (isNaN(budgetValue) || budgetValue < 0) {
      alert('Please enter a valid budget amount')
      return
    }

    if (!startDate.trim()) {
      alert('Please select a start date')
      return
    }

    let endDateValue = endDate
    if (!endDateValue.trim() && durationMonths) {
      // Auto-calculate end date if not provided
      const startDateObj = new Date(startDate)
      const monthsNum = parseInt(durationMonths)
      if (!isNaN(monthsNum)) {
        const endDateObj = new Date(startDateObj)
        endDateObj.setMonth(endDateObj.getMonth() + monthsNum)
        endDateValue = endDateObj.toISOString()
      }
    } else if (!endDateValue.trim()) {
      alert('Please provide either end date or duration in months')
      return
    }

    const jobData: Job = {
      id: job?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim() || '',
      budget: budgetValue,
      billingCycle,
      startDate: new Date(startDate).toISOString(),
      endDate: endDateValue ? new Date(endDateValue).toISOString() : new Date(startDate).toISOString(),
      durationMonths: durationMonths ? parseInt(durationMonths) : undefined,
      credits: job?.credits || []
    }

    onSave(jobData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{job ? 'Edit Job' : 'Add Job'}</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="job-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter job title"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Short Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter short description"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="budget">Budget</label>
            <input
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Enter budget"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="billingCycle">Billing Cycle</label>
            <select
              id="billingCycle"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              required
            >
              <option value="one-time">One Time</option>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="durationMonths">Duration (Months) - Optional</label>
            <input
              id="durationMonths"
              type="number"
              value={durationMonths}
              onChange={(e) => handleDurationChange(e.target.value)}
              placeholder="Enter duration in months"
              min="1"
              onBlur={() => {
                if (startDate && durationMonths) {
                  calculateEndDate(startDate, durationMonths)
                }
              }}
            />
            <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              If provided, end date will be auto-calculated
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required={!durationMonths}
            />
            <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              {durationMonths ? 'Optional - Auto-calculated from duration' : 'Required if duration not provided'}
            </small>
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              <FiXCircle /> Cancel
            </button>
            <button type="submit" className="save-button">
              <FiSave /> {job ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default JobModal

