import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext' // ✅ Agregar

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider> {/* ✅ Agregar */}
        <App />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)