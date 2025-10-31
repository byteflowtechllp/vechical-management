import { FiX, FiAlertTriangle } from 'react-icons/fi'
import './DeleteConfirmModal.styl'

interface DeleteConfirmModalProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmModal = ({ message, onConfirm, onCancel }: DeleteConfirmModalProps) => {
  const handleConfirm = (): void => {
    onConfirm()
    onCancel()
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-content-small delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirm Delete</h2>
          <button className="close-button" onClick={onCancel}>
            <FiX />
          </button>
        </div>
        <div className="delete-confirm-content">
          <div className="delete-confirm-icon">
            <FiAlertTriangle />
          </div>
          <p className="delete-confirm-message">{message}</p>
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="delete-button" onClick={handleConfirm}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmModal

