import { useEffect } from 'react'

interface UseBackButtonOptions {
  enabled: boolean
  onBack: () => void
}

/**
 * Custom hook to handle Android device back button
 * Closes modals or performs action when back button is pressed
 */
export const useBackButton = ({ enabled, onBack }: UseBackButtonOptions): void => {
  useEffect(() => {
    if (!enabled) return

    // Check if we're in a browser environment
    if (typeof window === 'undefined') return

    // Handle Android back button
    const handleBackButton = (event: PopStateEvent | Event): void => {
      event.preventDefault()
      onBack()
    }

    // Push a state to prevent default back navigation
    const state = { modal: true, timestamp: Date.now() }
    window.history.pushState(state, '')

    // Listen for back button (popstate for browser back and Android physical back button)
    window.addEventListener('popstate', handleBackButton)

    // Additional handling for Android WebView/Cordova physical back button
    // This is for native apps embedding WebView, not needed for regular browsers
    if (typeof (window as any).BackButton !== 'undefined') {
      document.addEventListener('backbutton', handleBackButton as EventListener, true)
    }

    return () => {
      window.removeEventListener('popstate', handleBackButton)
      if (typeof (window as any).BackButton !== 'undefined') {
        document.removeEventListener('backbutton', handleBackButton as EventListener, true)
      }
      
      // Clean up history state if modal was closed normally
      if (window.history.state?.modal && window.history.state?.timestamp === state.timestamp) {
        try {
          window.history.back()
        } catch (e) {
          // Ignore errors if history doesn't exist
        }
      }
    }
  }, [enabled, onBack])
}

