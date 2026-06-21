import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { StatusBar } from '@capacitor/status-bar'

const initApp = async () => {
  try {
    await StatusBar.setOverlaysWebView({ overlay: true })
  } catch (e) {
    // Na webu StatusBar není k dispozici, ignorujeme
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
}

initApp()
