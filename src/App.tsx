import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import PasscodeScreen from './components/PasscodeScreen'
import HomeScreen from './components/HomeScreen'
import VehicleDetailScreen from './components/VehicleDetailScreen'
import JobCreditsScreen from './components/JobCreditsScreen'
import './App.styl'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('isAuthenticated')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleAuthentication = (): void => {
    setIsAuthenticated(true)
    localStorage.setItem('isAuthenticated', 'true')
  }

  const handleLogout = (): void => {
    setIsAuthenticated(false)
    localStorage.removeItem('isAuthenticated')
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/home" replace />
            ) : (
              <PasscodeScreen onAuthenticate={handleAuthentication} />
            )
          } 
        />
        <Route 
          path="/home" 
          element={
            isAuthenticated ? (
              <HomeScreen onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/vehicle/:vehicleId" 
          element={
            isAuthenticated ? (
              <VehicleDetailScreen onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/vehicle/:vehicleId/job/:jobId/credits" 
          element={
            isAuthenticated ? (
              <JobCreditsScreen />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App

