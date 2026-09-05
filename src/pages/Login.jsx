import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { isNative, signInWithGoogleNative, NATIVE_AUTH_REDIRECT } from '@/lib/nativeAuth';
import { SpoluvicLockup } from '@/components/brand/SpoluvicLogo';
import { svField, svCard } from '@/lib/svStyles';

const loginBtn = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', borderRadius: 'var(--sv-r-pill)', padding: '9px 0', font: "500 13px 'Outfit', sans-serif" };
const outlineBtn = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)', borderRadius: 'var(--sv-r-pill)', padding: '9px 0', font: "400 13px 'Outfit', sans-serif", color: 'var(--sv-ink)' };

// Explicit redirect target for signup-confirmation and password-reset
// emails — without this Supabase falls back to the dashboard's "Site URL",
// which is easy to leave pointed at a dev default and never notice until a
// real user's confirmation link dumps them on a broken address.
const authRedirect = () => (isNative() ? NATIVE_AUTH_REDIRECT : window.location.origin + '/');

export default function Login() {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    // On a native cold start the network stack can still be warming up when
    // the first request fires — that shows up as a retryable fetch error,
    // not a real "wrong password", so it's worth one silent retry before
    // making the user tap the button again.
    if (error && isAuthRetryableFetchError(error)) {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    }
    if (error) { toast.error(lang === 'cs' ? 'Špatný email nebo heslo.' : 'Invalid email or password.'); setLoading(false); }
    else { navigate('/'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error(lang === 'cs' ? 'Zadej své jméno.' : 'Please enter your name.'); return; }
    if (!agreedToTerms) { toast.error(lang === 'cs' ? 'Pro registraci musíš souhlasit s podmínkami.' : 'You must agree to the terms to register.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() }, emailRedirectTo: authRedirect() } });
    if (error) toast.error(error.message);
    else toast.success(lang === 'cs' ? 'Účet vytvořen! Zkontroluj email.' : 'Account created! Check your email.');
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirect() });
    if (error) toast.error(error.message); else setResetSent(true);
    setLoading(false);
  };

  const handleGoogle = async () => {
    try {
      if (isNative()) {
        await signInWithGoogleNative();
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/',
          queryParams: { access_type: 'offline', prompt: 'consent' },
        }
      });
      if (error) throw error;
    } catch {
      toast.error(lang === 'cs' ? 'Přihlášení přes Google se nezdařilo.' : 'Google sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--sv-bg)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <SpoluvicLockup variant="orange" height={24} color="var(--sv-ink)"/>
        </div>
        <div style={{ ...svCard, padding: 22 }}>
          {mode !== 'reset' && (
            <div className="flex" style={{ gap: 2, background: 'var(--sv-surface-muted)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => setMode(m)} className="flex-1 transition-all"
                  style={{ padding: '8px 0', borderRadius: 8, font: `500 12.5px 'Outfit', sans-serif`, background: mode === m ? 'var(--sv-surface)' : 'transparent', color: mode === m ? 'var(--sv-ink)' : 'var(--sv-meta)' }}>
                  {m === 'login' ? (lang === 'cs' ? 'Přihlásit se' : 'Sign in') : (lang === 'cs' ? 'Registrovat' : 'Register')}
                </button>
              ))}
            </div>
          )}

          {/* Google button — shown for login and register */}
          {mode !== 'reset' && (
            <div className="mb-4">
              <button type="button" onClick={handleGoogle} style={outlineBtn}>
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                {lang === 'cs' ? 'Pokračovat přes Google' : 'Continue with Google'}
              </button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: '1px solid var(--sv-hairline)' }} />
                </div>
                <div className="relative flex justify-center" style={{ font: "300 11px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
                  <span style={{ background: 'var(--sv-surface)', padding: '0 8px' }}>{lang === 'cs' ? 'nebo' : 'or'}</span>
                </div>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={svField} />
              <Input type="password" placeholder={lang === 'cs' ? 'Heslo' : 'Password'} value={password} onChange={e => setPassword(e.target.value)} required style={svField} />
              <button type="submit" disabled={loading} style={{ ...loginBtn, opacity: loading ? 0.6 : 1 }}>
                {loading ? (lang === 'cs' ? 'Přihlašuji...' : 'Signing in...') : (lang === 'cs' ? 'Přihlásit se' : 'Sign in')}
              </button>
              <button type="button" onClick={() => setMode('reset')} className="w-full text-center" style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
                {lang === 'cs' ? 'Zapomenuté heslo?' : 'Forgot password?'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <Input placeholder={lang === 'cs' ? 'Jméno a příjmení' : 'Full name'} value={name} onChange={e => setName(e.target.value)} required style={svField} />
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={svField} />
              <Input type="password" placeholder={lang === 'cs' ? 'Heslo (min. 8 znaků)' : 'Password (min. 8 chars)'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={svField} />
              <label className="flex items-start gap-2 cursor-pointer" style={{ font: "300 11px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5" />
                <span>
                  {lang === 'cs' ? 'Souhlasím s ' : 'I agree to the '}
                  <Link to="/terms" target="_blank" style={{ color: 'var(--sv-link)' }}>{lang === 'cs' ? 'podmínkami používání' : 'terms of use'}</Link>
                  {lang === 'cs' ? ' a ' : ' and '}
                  <Link to="/privacy" target="_blank" style={{ color: 'var(--sv-link)' }}>{lang === 'cs' ? 'zásadami ochrany osobních údajů' : 'privacy policy'}</Link>.
                </span>
              </label>
              <button type="submit" disabled={loading || !agreedToTerms} style={{ ...loginBtn, opacity: (loading || !agreedToTerms) ? 0.6 : 1 }}>
                {loading ? (lang === 'cs' ? 'Vytvářím...' : 'Creating...') : (lang === 'cs' ? 'Vytvořit účet' : 'Create account')}
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <div>
              <h2 style={{ font: "500 15px 'Outfit', sans-serif", color: 'var(--sv-ink)', marginBottom: 14 }}>{lang === 'cs' ? 'Resetovat heslo' : 'Reset password'}</h2>
              {resetSent
                ? <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>{lang === 'cs' ? 'Email odeslán!' : 'Email sent!'}</p>
                : <form onSubmit={handleReset} className="space-y-3">
                    <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={svField} />
                    <button type="submit" disabled={loading} style={{ ...loginBtn, opacity: loading ? 0.6 : 1 }}>
                      {loading ? '...' : (lang === 'cs' ? 'Odeslat reset link' : 'Send reset link')}
                    </button>
                  </form>
              }
              <button onClick={() => setMode('login')} className="mt-4 flex items-center gap-1" style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
                ← {lang === 'cs' ? 'Zpět' : 'Back'}
              </button>
            </div>
          )}
        </div>
        <p className="text-center mt-4" style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
          <button onClick={() => navigate('/')}>
            ← {lang === 'cs' ? 'Zpět na hlavní stránku' : 'Back to homepage'}
          </button>
        </p>
        <p className="text-center mt-3" style={{ font: "300 10.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
          <Link to="/terms">{lang === 'cs' ? 'Podmínky používání' : 'Terms of use'}</Link>
          {' · '}
          <Link to="/privacy">{lang === 'cs' ? 'Ochrana osobních údajů' : 'Privacy policy'}</Link>
        </p>
      </div>
    </div>
  );
}

