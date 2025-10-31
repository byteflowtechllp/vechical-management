import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type UserRole = 'view' | 'owner' | null

interface AuthContextType {
  isAuthenticated: boolean
  role: UserRole
  authenticate: (passcode: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  canEdit: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [role, setRole] = useState<UserRole>(null)

  useEffect(() => {
    // Check if user is already authenticated
    const authData = localStorage.getItem('auth')
    if (authData) {
      try {
        const { isAuth, userRole } = JSON.parse(authData)
        if (isAuth && userRole) {
          setIsAuthenticated(true)
          setRole(userRole as UserRole)
        }
      } catch (error) {
        console.error('Failed to parse auth data:', error)
        localStorage.removeItem('auth')
      }
    }
  }, [])

  const authenticate = async (passcode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // If Supabase is not configured, fallback to default passcode
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback authentication (for development/testing)
        if (passcode === '1234') {
          setIsAuthenticated(true)
          setRole('view')
          localStorage.setItem('auth', JSON.stringify({ isAuth: true, role: 'view' }))
          return { success: true }
        } else if (passcode === '5678') {
          setIsAuthenticated(true)
          setRole('owner')
          localStorage.setItem('auth', JSON.stringify({ isAuth: true, role: 'owner' }))
          return { success: true }
        }
        return { success: false, error: 'Incorrect passcode. Please try again.' }
      }

      // Query Supabase for passcode
      const { data, error } = await supabase
        .from('passcodes')
        .select('role')
        .eq('passcode', passcode)
        .single()

      if (error || !data) {
        return { success: false, error: 'Incorrect passcode. Please try again.' }
      }

      // Set authentication state
      const userRole = data.role as UserRole
      setIsAuthenticated(true)
      setRole(userRole)
      localStorage.setItem('auth', JSON.stringify({ isAuth: true, role: userRole }))
      
      return { success: true }
    } catch (error) {
      console.error('Authentication error:', error)
      return { success: false, error: 'Authentication failed. Please try again.' }
    }
  }

  const logout = (): void => {
    setIsAuthenticated(false)
    setRole(null)
    localStorage.removeItem('auth')
  }

  const canEdit = (): boolean => {
    return role === 'owner'
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
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

