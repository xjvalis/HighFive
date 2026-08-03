import { Sentry } from '@/lib/sentry' // must be the first import — inits before any other module runs

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

function ErrorFallback() {
  // Runs above LanguageProvider (it wraps App itself), so no context is
  // available — read the same localStorage key LanguageProvider uses/defaults to.
  const lang = (() => { try { return localStorage.getItem('hf_lang') || 'cs'; } catch { return 'cs'; } })();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>😵</div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#1a1a1a' }}>
        {lang === 'cs' ? 'Něco se pokazilo' : 'Something went wrong'}
      </h1>
      <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px', maxWidth: '320px' }}>
        {lang === 'cs' ? 'Omlouváme se, nastala neočekávaná chyba. Zkus stránku obnovit.' : 'Sorry, an unexpected error occurred. Try reloading the page.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
      >
        {lang === 'cs' ? 'Obnovit stránku' : 'Reload page'}
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>
)
