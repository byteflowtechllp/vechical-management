import { useState, FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './PasscodeScreen.styl'

interface PasscodeScreenProps {
  onAuthenticate: () => void
}

const PasscodeScreen = ({ onAuthenticate }: PasscodeScreenProps) => {
  const [username, setUsername] = useState<string>('')
  const [passcode, setPasscode] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { authenticate } = useAuth()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    
    if (!username.trim()) {
      setError('Username is required.')
      return
    }
    
    setIsLoading(true)

    try {
      const result = await authenticate(username, passcode)
      if (result.success) {
        onAuthenticate()
        setUsername('')
        setPasscode('')
      } else {
        setError(result.error || 'Incorrect username or passcode. Please try again.')
        setPasscode('')
      }
    } catch (error) {
      setError('Authentication failed. Please try again.')
      setPasscode('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="passcode-screen">
      <div className="passcode-container">
        <h1>Vehicle Management</h1>
        <p className="subtitle">Enter username and passcode to continue</p>
        <form onSubmit={handleSubmit} className="passcode-form">
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setError('')
            }}
            placeholder="Enter username"
            className="passcode-input"
            autoFocus
            maxLength={50}
          />
          <input
            type="password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value)
              setError('')
            }}
            placeholder="Enter passcode"
            className="passcode-input"
            maxLength={50}
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PasscodeScreen

