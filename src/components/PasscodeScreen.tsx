import { useState, FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './PasscodeScreen.styl'

interface PasscodeScreenProps {
  onAuthenticate: () => void
}

const PasscodeScreen = ({ onAuthenticate }: PasscodeScreenProps) => {
  const [passcode, setPasscode] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { authenticate } = useAuth()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await authenticate(passcode)
      if (result.success) {
        onAuthenticate()
        setPasscode('')
      } else {
        setError(result.error || 'Incorrect passcode. Please try again.')
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
        <p className="subtitle">Enter passcode to continue</p>
        <form onSubmit={handleSubmit} className="passcode-form">
          <input
            type="password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value)
              setError('')
            }}
            placeholder="Enter passcode"
            className="passcode-input"
            autoFocus
            maxLength={10}
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

