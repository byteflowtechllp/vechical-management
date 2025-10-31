import { useTheme } from '../contexts/ThemeContext'
import { FiSun, FiMoon } from 'react-icons/fi'
import './ThemeToggle.styl'

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <FiMoon /> : <FiSun />}
    </button>
  )
}

export default ThemeToggle

