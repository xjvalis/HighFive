import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';

export default function Login() {
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(lang === 'cs' ? 'Špatný email nebo heslo.' : 'Invalid email or password.'); setLoading(false); }
    else { navigate('/'); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error(lang === 'cs' ? 'Zadej své jméno.' : 'Please enter your name.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() } } });
    if (error) toast.error(error.message);
    else toast.success(lang === 'cs' ? 'Účet vytvořen! Zkontroluj email.' : 'Account created! Check your email.');
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/profile` });
    if (error) toast.error(error.message); else setResetSent(true);
    setLoading(false);
  };

  const handleGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🙏</div>
          <h1 className="font-grotesk font-bold text-2xl">HighFive</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'cs' ? 'Najdi lidi pro společné aktivity' : 'Find people for shared activities'}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
          {mode !== 'reset' && (
            <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6">
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
                  {m === 'login' ? (lang === 'cs' ? 'Přihlásit se' : 'Sign in') : (lang === 'cs' ? 'Registrovat' : 'Register')}
                </button>
              ))}
            </div>
          )}

          {/* Google button — shown for login and register */}
          {mode !== 'reset' && (
            <div className="mb-4">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl flex items-center justify-center gap-2"
                onClick={handleGoogle}
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                {lang === 'cs' ? 'Pokračovat přes Google' : 'Continue with Google'}
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground">
                  <span className="bg-card px-2">{lang === 'cs' ? 'nebo' : 'or'}</span>
                </div>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
              <Input type="password" placeholder={lang === 'cs' ? 'Heslo' : 'Password'} value={password} onChange={e => setPassword(e.target.value)} required className="rounded-xl" />
              <Button type="submit" disabled={loading} className="w-full rounded-xl">
                {loading ? (lang === 'cs' ? 'Přihlašuji...' : 'Signing in...') : (lang === 'cs' ? 'Přihlásit se' : 'Sign in')}
              </Button>
              <button type="button" onClick={() => setMode('reset')} className="w-full text-xs text-muted-foreground text-center">
                {lang === 'cs' ? 'Zapomenuté heslo?' : 'Forgot password?'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <Input placeholder={lang === 'cs' ? 'Jméno a příjmení' : 'Full name'} value={name} onChange={e => setName(e.target.value)} required className="rounded-xl" />
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
              <Input type="password" placeholder={lang === 'cs' ? 'Heslo (min. 6 znaků)' : 'Password (min. 6 chars)'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
              <Button type="submit" disabled={loading} className="w-full rounded-xl">
                {loading ? (lang === 'cs' ? 'Vytvářím...' : 'Creating...') : (lang === 'cs' ? 'Vytvořit účet' : 'Create account')}
              </Button>
            </form>
          )}

          {mode === 'reset' && (
            <div>
              <h2 className="font-semibold mb-4">{lang === 'cs' ? 'Resetovat heslo' : 'Reset password'}</h2>
              {resetSent
                ? <p className="text-sm text-muted-foreground">{lang === 'cs' ? 'Email odeslán!' : 'Email sent!'}</p>
                : <form onSubmit={handleReset} className="space-y-3">
                    <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
                    <Button type="submit" disabled={loading} className="w-full rounded-xl">
                      {loading ? '...' : (lang === 'cs' ? 'Odeslat reset link' : 'Send reset link')}
                    </Button>
                  </form>
              }
              <button onClick={() => setMode('login')} className="mt-4 text-xs text-muted-foreground">
                ← {lang === 'cs' ? 'Zpět' : 'Back'}
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          <button onClick={() => window.history.back()} className="hover:underline">
            ← {lang === 'cs' ? 'Zpět na hlavní stránku' : 'Back to homepage'}
          </button>
        </p>
      </div>
    </div>
  );
}

