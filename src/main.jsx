import { Sentry } from '@/lib/sentry' // must be the first import — inits before any other module runs

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { PixelCircle } from '@/components/ui/EmptyState'

function ErrorFallback() {
  // Runs above LanguageProvider (it wraps App itself), so no context is
  // available — read the same localStorage key LanguageProvider uses/defaults to.
  const lang = (() => { try { return localStorage.getItem('hf_lang') || 'cs'; } catch { return 'cs'; } })();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: "'Outfit', system-ui, sans-serif", background: '#FDFCFA' }}>
      <div style={{ marginBottom: '12px' }}><PixelCircle size={40} color="#FFB84D" /></div>
      <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '8px', color: '#3A343F' }}>
        {lang === 'cs' ? 'Něco se pokazilo' : 'Something went wrong'}
      </h1>
      <p style={{ fontSize: '14px', color: '#8C8790', marginBottom: '20px', maxWidth: '320px', fontWeight: 300 }}>
        {lang === 'cs' ? 'Omlouváme se, nastala neočekávaná chyba. Zkus stránku obnovit.' : 'Sorry, an unexpected error occurred. Try reloading the page.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ background: '#FFE7C2', color: '#5C4A1E', border: 'none', borderRadius: '999px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
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
