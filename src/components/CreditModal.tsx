import { useState } from 'react'
import { FiX, FiSave, FiXCircle } from 'react-icons/fi'
import { CreditType } from '../types'
import { useBackButton } from '../hooks/useBackButton'
import './CreditModal.styl'

interface CreditModalProps {
  onSave: (credit: { amount: number; date: string; type: CreditType }) => void
  onClose: () => void
}

const CreditModal = ({ onSave, onClose }: CreditModalProps) => {
  // Handle Android back button
  useBackButton({ enabled: true, onBack: onClose })

  const [amount, setAmount] = useState<string>('')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [type, setType] = useState<CreditType>('cash')

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!amount.trim() || !date.trim()) {
      alert('Please fill in all fields')
      return
    }

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue < 0) {
      alert('Please enter a valid amount')
      return
    }

    onSave({
      amount: amountValue,
      date: new Date(date).toISOString(),
      type: type
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Credit</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="credit-form">
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
            <label htmlFor="type">Payment Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as CreditType)}
              required
            >
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              <FiXCircle /> Cancel
            </button>
            <button type="submit" className="save-button">
              <FiSave /> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreditModal

