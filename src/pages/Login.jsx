import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error('Špatný email nebo heslo.');
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Zadej své jméno.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() } } });
    if (error) toast.error(error.message);
    else toast.success('Účet vytvořen! Zkontroluj email.');
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/profile` });
    if (error) toast.error(error.message); else setResetSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🙏</div>
          <h1 className="font-grotesk font-bold text-2xl">HighFive</h1>
          <p className="text-sm text-muted-foreground mt-1">Najdi lidi pro společné aktivity</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
          {mode !== 'reset' && (
            <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6">
              {['login','register'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode===m ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>
                  {m === 'login' ? 'Přihlásit se' : 'Registrovat'}
                </button>
              ))}
            </div>
          )}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <Input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required className="rounded-xl"/>
              <Input type="password" placeholder="Heslo" value={password} onChange={e=>setPassword(e.target.value)} required className="rounded-xl"/>
              <Button type="submit" disabled={loading} className="w-full rounded-xl">{loading ? 'Přihlašuji...' : 'Přihlásit se'}</Button>
              <button type="button" onClick={() => setMode('reset')} className="w-full text-xs text-muted-foreground text-center">Zapomenuté heslo?</button>
            </form>
          )}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <Input placeholder="Jméno a příjmení" value={name} onChange={e=>setName(e.target.value)} required className="rounded-xl"/>
              <Input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required className="rounded-xl"/>
              <Input type="password" placeholder="Heslo (min. 6 znaků)" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} className="rounded-xl"/>
              <Button type="submit" disabled={loading} className="w-full rounded-xl">{loading ? 'Vytvářím...' : 'Vytvořit účet'}</Button>
            </form>
          )}
          {mode === 'reset' && (
            <div>
              <h2 className="font-semibold mb-4">Resetovat heslo</h2>
              {resetSent ? <p className="text-sm text-muted-foreground">Email odeslán!</p> : (
                <form onSubmit={handleReset} className="space-y-3">
                  <Input type="email" placeholder="Tvůj email" value={email} onChange={e=>setEmail(e.target.value)} required className="rounded-xl"/>
                  <Button type="submit" disabled={loading} className="w-full rounded-xl">{loading ? 'Odesílám...' : 'Odeslat reset link'}</Button>
                </form>
              )}
              <button onClick={() => setMode('login')} className="mt-4 text-xs text-muted-foreground">← Zpět</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
