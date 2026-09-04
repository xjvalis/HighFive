import { useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { LanguageContext } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Shown as a full-screen takeover whenever the auth session was established
// via a password-recovery link (see the PASSWORD_RECOVERY listener in
// CurrentUserContext) — without this, a reset link just silently signs the
// user in with no way to actually set the new password they asked for.
export default function SetNewPasswordScreen() {
  const { lang } = useContext(LanguageContext);
  const { clearPasswordRecovery } = useCurrentUser();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { toast.error(lang === 'cs' ? 'Heslo musí mít alespoň 8 znaků.' : 'Password must be at least 8 characters.'); return; }
    if (password !== confirm) { toast.error(lang === 'cs' ? 'Hesla se neshodují.' : 'Passwords don\'t match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === 'cs' ? 'Heslo změněno!' : 'Password updated!');
    clearPasswordRecovery();
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    clearPasswordRecovery();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/hands.png" alt="HighFive" className="w-16 h-16 object-contain block mx-auto mb-3"/>
          <h1 className="font-grotesk font-bold text-2xl">{lang === 'cs' ? 'Nastav nové heslo' : 'Set a new password'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'cs' ? 'Dokonči reset hesla zadáním nového.' : 'Finish the reset by choosing a new password.'}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input type="password" placeholder={lang === 'cs' ? 'Nové heslo (min. 8 znaků)' : 'New password (min. 8 chars)'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="rounded-xl" autoFocus />
            <Input type="password" placeholder={lang === 'cs' ? 'Potvrď nové heslo' : 'Confirm new password'} value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} className="rounded-xl" />
            <Button type="submit" disabled={loading} className="w-full rounded-xl">
              {loading ? (lang === 'cs' ? 'Ukládám...' : 'Saving...') : (lang === 'cs' ? 'Nastavit heslo' : 'Set password')}
            </Button>
            <button type="button" onClick={handleCancel} className="w-full text-xs text-muted-foreground text-center">
              {lang === 'cs' ? 'Zrušit a odhlásit se' : 'Cancel and sign out'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
