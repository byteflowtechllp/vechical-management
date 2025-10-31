import { useState, useEffect } from 'react'
import { FiX, FiSave, FiXCircle } from 'react-icons/fi'
import { Vehicle } from '../types'
import { useBackButton } from '../hooks/useBackButton'
import './VehicleModal.styl'

interface VehicleModalProps {
  vehicle: Vehicle | null
  onSave: (vehicle: Vehicle) => void
  onClose: () => void
}

const VehicleModal = ({ vehicle, onSave, onClose }: VehicleModalProps) => {
  const [vehicleNumber, setVehicleNumber] = useState<string>('')
  const [modelType, setModelType] = useState<string>('')

  useEffect(() => {
    if (vehicle) {
      setVehicleNumber(vehicle.vehicleNumber)
      setModelType(vehicle.modelType)
    }
  }, [vehicle])

  // Handle Android back button
  useBackButton({ enabled: true, onBack: onClose })

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!vehicleNumber.trim() || !modelType.trim()) {
      alert('Please fill in all fields')
      return
    }

    const vehicleData: Vehicle = {
      id: vehicle?.id || Date.now().toString(),
      vehicleNumber: vehicleNumber.trim(),
      modelType: modelType.trim()
    }

    onSave(vehicleData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="vehicle-form">
          <div className="form-group">
            <label htmlFor="vehicleNumber">Vehicle Number</label>
            <input
              id="vehicleNumber"
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="Enter vehicle number"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="modelType">Model Type</label>
            <input
              id="modelType"
              type="text"
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              placeholder="Enter model type"
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              <FiXCircle /> Cancel
            </button>
            <button type="submit" className="save-button">
              <FiSave /> {vehicle ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default VehicleModal

