import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiEdit2, FiTrash2, FiLogOut, FiInfo } from 'react-icons/fi'
import { Vehicle } from '../types'
import VehicleModal from './VehicleModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import VehicleSummaryModal from './VehicleSummaryModal'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../services/database'
import './HomeScreen.styl'

interface HomeScreenProps {
  onLogout: () => void
}

const HomeScreen = ({ onLogout }: HomeScreenProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; vehicleId: string | null }>({ isOpen: false, vehicleId: null })
  const [summaryModal, setSummaryModal] = useState<{ isOpen: boolean; vehicle: Vehicle | null }>({ isOpen: false, vehicle: null })
  const navigate = useNavigate()
  const { canEdit, role } = useAuth()

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async (): Promise<void> => {
    try {
      const data = await vehicleService.getAll()
      setVehicles(data)
    } catch (error) {
      console.error('Failed to load vehicles:', error)
      // Fallback to localStorage
      const stored = localStorage.getItem('vehicles')
      if (stored) {
        setVehicles(JSON.parse(stored))
      }
    }
  }

  const handleAddVehicle = (): void => {
    setEditingVehicle(null)
    setIsModalOpen(true)
  }

  const handleEditVehicle = (vehicle: Vehicle): void => {
    setEditingVehicle(vehicle)
    setIsModalOpen(true)
  }

  const handleDeleteVehicle = (id: string): void => {
    setDeleteConfirmModal({ isOpen: true, vehicleId: id })
  }

  const confirmDeleteVehicle = async (): Promise<void> => {
    const id = deleteConfirmModal.vehicleId
    if (!id) return

    try {
      await vehicleService.delete(id)
      const updatedVehicles = vehicles.filter(v => v.id !== id)
      setVehicles(updatedVehicles)
    } catch (error) {
      console.error('Failed to delete vehicle:', error)
      // Fallback: remove from state
      const updatedVehicles = vehicles.filter(v => v.id !== id)
      setVehicles(updatedVehicles)
      localStorage.removeItem(`vehicle_${id}_jobs`)
      localStorage.removeItem(`vehicle_${id}_expenses`)
    }
    setDeleteConfirmModal({ isOpen: false, vehicleId: null })
  }

  const handleSaveVehicle = async (vehicle: Vehicle): Promise<void> => {
    try {
      if (editingVehicle) {
        await vehicleService.update(vehicle)
        const updatedVehicles = vehicles.map(v => v.id === editingVehicle.id ? vehicle : v)
        setVehicles(updatedVehicles)
      } else {
        await vehicleService.create(vehicle)
        setVehicles([...vehicles, vehicle])
      }
      setIsModalOpen(false)
      setEditingVehicle(null)
    } catch (error) {
      console.error('Failed to save vehicle:', error)
      // Fallback to localStorage
      let updatedVehicles: Vehicle[]
      if (editingVehicle) {
        updatedVehicles = vehicles.map(v => v.id === editingVehicle.id ? vehicle : v)
      } else {
        updatedVehicles = [...vehicles, vehicle]
      }
      setVehicles(updatedVehicles)
      localStorage.setItem('vehicles', JSON.stringify(updatedVehicles))
      setIsModalOpen(false)
      setEditingVehicle(null)
    }
  }

  const handleVehicleClick = (vehicleId: string): void => {
    navigate(`/vehicle/${vehicleId}`)
  }

  const handleShowSummary = (vehicle: Vehicle, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSummaryModal({ isOpen: true, vehicle })
  }

  return (
      <div className="home-screen">
        <header className="header">
          <h1>Vehicles</h1>
          <div className="header-actions">
            <ThemeToggle />
            <button className="logout-button" onClick={onLogout}>
              <FiLogOut /> Logout
            </button>
          </div>
        </header>

      <div className="content">
        {canEdit() && (
          <button className="add-button" onClick={handleAddVehicle}>
            <FiPlus /> Add Vehicle
          </button>
        )}
        {role === 'view' && (
          <div className="view-only-notice">
            <p>View-only mode: You can view data but cannot make changes.</p>
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="empty-state">
            <p>No vehicles added yet. Click "Add Vehicle" to get started.</p>
          </div>
        ) : (
          <ul className="vehicle-list">
            {vehicles.map(vehicle => (
              <li key={vehicle.id} className="vehicle-item">
                <div className="vehicle-info" onClick={() => handleVehicleClick(vehicle.id)}>
                  <span className="vehicle-number">{vehicle.vehicleNumber}</span>
                  <span className="vehicle-model">{vehicle.modelType}</span>
                </div>
                <div className="vehicle-actions">
                  <button 
                    className="info-button" 
                    onClick={(e) => handleShowSummary(vehicle, e)}
                    title="View Summary"
                  >
                    <FiInfo />
                  </button>
                  {canEdit() && (
                    <>
                      <button 
                        className="edit-button" 
                        onClick={() => handleEditVehicle(vehicle)}
                        title="Edit Vehicle"
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="delete-button" 
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        title="Delete Vehicle"
                      >
                        <FiTrash2 />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <VehicleModal
          vehicle={editingVehicle}
          onSave={handleSaveVehicle}
          onClose={() => {
            setIsModalOpen(false)
            setEditingVehicle(null)
          }}
        />
      )}

      {deleteConfirmModal.isOpen && deleteConfirmModal.vehicleId && (
        <DeleteConfirmModal
          message="Are you sure you want to delete this vehicle?"
          onConfirm={confirmDeleteVehicle}
          onCancel={() => setDeleteConfirmModal({ isOpen: false, vehicleId: null })}
        />
      )}

      {summaryModal.isOpen && summaryModal.vehicle && (
        <VehicleSummaryModal
          vehicle={summaryModal.vehicle}
          onClose={() => setSummaryModal({ isOpen: false, vehicle: null })}
        />
      )}
    </div>
  )
}

export default HomeScreen

