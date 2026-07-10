import { Sentry } from '@/lib/sentry' // must be the first import — inits before any other module runs

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

function ErrorFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>😵</div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#1a1a1a' }}>Něco se pokazilo</h1>
      <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px', maxWidth: '320px' }}>
        Omlouváme se, nastala neočekávaná chyba. Zkus stránku obnovit.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
      >
        Obnovit stránku
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>
)
