import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.styl'
import './services/pushCreditsToSupabase' // Expose pushCreditsToSupabase to window

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

