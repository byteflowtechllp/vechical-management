import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { syncCache } from '../services/syncCache'

export type UserRole = 'view' | 'owner' | null

interface AuthContextType {
  isAuthenticated: boolean
  username: string | null
  role: UserRole
  authenticate: (username: string, passcode: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  canEdit: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>(null)

  useEffect(() => {
    // Check if user is already authenticated
    const authData = localStorage.getItem('auth')
    if (authData) {
      try {
        const { isAuth, username: savedUsername, role: userRole } = JSON.parse(authData)
        if (isAuth && savedUsername && userRole) {
          setIsAuthenticated(true)
          setUsername(savedUsername)
          setRole(userRole as UserRole)
        }
      } catch (error) {
        console.error('Failed to parse auth data:', error)
        localStorage.removeItem('auth')
      }
    }
  }, [])

  const authenticate = async (username: string, passcode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!username.trim()) {
        return { success: false, error: 'Username is required.' }
      }

      // If Supabase is not configured, fallback to default credentials
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback authentication (for development/testing)
        const lowerUsername = username.toLowerCase().trim()
        if (lowerUsername === 'admin' && passcode === '1234') {
          setIsAuthenticated(true)
          setUsername('admin')
          setRole('view')
          localStorage.setItem('auth', JSON.stringify({ isAuth: true, username: 'admin', role: 'view' }))
          return { success: true }
        } else if (lowerUsername === 'admin' && passcode === '5678') {
          setIsAuthenticated(true)
          setUsername('admin')
          setRole('owner')
          localStorage.setItem('auth', JSON.stringify({ isAuth: true, username: 'admin', role: 'owner' }))
          return { success: true }
        }
        return { success: false, error: 'Incorrect username or passcode. Please try again.' }
      }

      // Query Supabase for username + passcode combination
      const { data, error } = await supabase
        .from('passcodes')
        .select('role')
        .eq('username', username.trim().toLowerCase())
        .eq('passcode', passcode)
        .single()

      if (error || !data) {
        return { success: false, error: 'Incorrect username or passcode. Please try again.' }
      }

      // Set authentication state
      const userRole = data.role as UserRole
      const authenticatedUsername = username.trim().toLowerCase()
      setIsAuthenticated(true)
      setUsername(authenticatedUsername)
      setRole(userRole)
      localStorage.setItem('auth', JSON.stringify({ isAuth: true, username: authenticatedUsername, role: userRole }))
      
      return { success: true }
    } catch (error) {
      console.error('Authentication error:', error)
      return { success: false, error: 'Authentication failed. Please try again.' }
    }
  }

  const logout = (): void => {
    setIsAuthenticated(false)
    setUsername(null)
    setRole(null)
    localStorage.removeItem('auth')
    
    // Clear sync cache from localStorage
    syncCache.clearCache()
    
    // Clear all user-specific IndexedDB data on logout
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name?.includes('VehicleManagementDB') || db.name?.includes('vehicle-management')) {
            indexedDB.deleteDatabase(db.name)
          }
        })
      }).catch(console.error)
    }
  }

  const canEdit = (): boolean => {
    return role === 'owner'
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        role,
        authenticate,
        logout,
        canEdit
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

