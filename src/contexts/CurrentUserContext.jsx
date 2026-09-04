import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const Ctx = createContext(null);

export function CurrentUserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // A password-recovery link signs the user in like a normal session, so
  // without this flag they'd silently land on their feed with a live
  // session and no prompt to actually set a new password — the reset link
  // would look like it did nothing.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); fetchProfile(session.user); }
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (session?.user) { setUser(session.user); fetchProfile(session.user); }
      else { setUser(null); setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const clearPasswordRecovery = () => setIsPasswordRecovery(false);

  async function fetchProfile(authUser) {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', authUser.id).single();
    if (error?.code === 'PGRST116') {
      const name = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
      const { data: np } = await supabase.from('user_profiles').insert({
        user_id: authUser.id, user_email: authUser.email, display_name: name,
        favorited_events: [], joined_events: [], subscription_plan: 'free',
      }).select().single();
      setProfile(np);
    } else {
      setProfile(data);
    }
    setLoading(false);
  }

  const updateProfile = async (updates) => {
    if (!user) return;
    setProfile(p => ({ ...p, ...updates }));
    await supabase.from('user_profiles').update(updates).eq('user_id', user.id);
  };

  return (
    <Ctx.Provider value={{ user, profile, setProfile, updateProfile, loading, isPasswordRecovery, clearPasswordRecovery }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCurrentUser = () => useContext(Ctx);
