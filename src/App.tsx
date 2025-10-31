import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import PasscodeScreen from './components/PasscodeScreen'
import HomeScreen from './components/HomeScreen'
import VehicleDetailScreen from './components/VehicleDetailScreen'
import JobCreditsScreen from './components/JobCreditsScreen'
import './App.styl'

function AppRoutes() {
  const { isAuthenticated, logout } = useAuth()

  const handleAuthentication = (): void => {
    // Authentication is handled by AuthContext, this just navigates
    // The AuthContext already updates isAuthenticated state
  }

  return (
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
              <HomeScreen onLogout={logout} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/vehicle/:vehicleId" 
          element={
            isAuthenticated ? (
              <VehicleDetailScreen onLogout={logout} />
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
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

