import { useState, useEffect } from 'react'
import { FiX, FiSave, FiXCircle } from 'react-icons/fi'
import { Expense } from '../types'
import { useBackButton } from '../hooks/useBackButton'
import './ExpenseModal.styl'

interface ExpenseModalProps {
  expense: Expense | null
  onSave: (expense: Expense) => void
  onClose: () => void
}

const ExpenseModal = ({ expense, onSave, onClose }: ExpenseModalProps) => {
  const [title, setTitle] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  // Handle Android back button
  useBackButton({ enabled: true, onBack: onClose })

  useEffect(() => {
    if (expense) {
      setTitle(expense.title)
      setAmount(expense.amount.toString())
      setDate(expense.date.split('T')[0])
      setDescription(expense.description || '')
    } else {
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [expense])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!title.trim() || !amount.trim() || !date.trim()) {
      alert('Please fill in all required fields')
      return
    }

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue < 0) {
      alert('Please enter a valid amount')
      return
    }

    const expenseData: Expense = {
      id: expense?.id || Date.now().toString(),
      title: title.trim(),
      amount: amountValue,
      date: new Date(date).toISOString(),
      description: description.trim() || undefined
    }

    onSave(expenseData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter expense title"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              <FiXCircle /> Cancel
            </button>
            <button type="submit" className="save-button">
              <FiSave /> {expense ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpenseModal

