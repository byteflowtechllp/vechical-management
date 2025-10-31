import { useState, FormEvent } from 'react'
import './PasscodeScreen.styl'

interface PasscodeScreenProps {
  onAuthenticate: () => void
}

const PasscodeScreen = ({ onAuthenticate }: PasscodeScreenProps) => {
  const [passcode, setPasscode] = useState<string>('')
  const [error, setError] = useState<string>('')
  const correctPasscode = '1234' // Default passcode, can be changed

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (passcode === correctPasscode) {
      onAuthenticate()
      setError('')
    } else {
      setError('Incorrect passcode. Please try again.')
      setPasscode('')
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
          <button type="submit" className="submit-button">
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

export default PasscodeScreen

