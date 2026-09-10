import { useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { LanguageContext } from '@/lib/language';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SpoluvicMark } from '@/components/brand/SpoluvicLogo';
import { svField, svCard, svMeta, svActionPill } from '@/lib/svStyles';

const submitBtn = { ...svActionPill, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 0', font: "500 13px 'Outfit', sans-serif" };

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
    <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4" style={{ background: 'var(--sv-bg)', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><SpoluvicMark variant="orange" height={40}/></div>
          <h1 style={{ font: "500 19px 'Outfit', sans-serif", letterSpacing: '-0.03em', color: 'var(--sv-ink)' }}>{lang === 'cs' ? 'Nastav nové heslo' : 'Set a new password'}</h1>
          <p style={{ ...svMeta, marginTop: 4 }}>
            {lang === 'cs' ? 'Dokonči reset hesla zadáním nového.' : 'Finish the reset by choosing a new password.'}
          </p>
        </div>
        <div style={{ ...svCard, padding: 22 }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input type="password" placeholder={lang === 'cs' ? 'Nové heslo (min. 8 znaků)' : 'New password (min. 8 chars)'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={svField} autoFocus />
            <Input type="password" placeholder={lang === 'cs' ? 'Potvrď nové heslo' : 'Confirm new password'} value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} style={svField} />
            <button type="submit" disabled={loading} style={{ ...submitBtn, opacity: loading ? 0.6 : 1 }}>
              {loading ? (lang === 'cs' ? 'Ukládám...' : 'Saving...') : (lang === 'cs' ? 'Nastavit heslo' : 'Set password')}
            </button>
            <button type="button" onClick={handleCancel} className="w-full text-center" style={svMeta}>
              {lang === 'cs' ? 'Zrušit a odhlásit se' : 'Cancel and sign out'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
