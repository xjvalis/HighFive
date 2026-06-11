import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

export function useUnreadDMs() {
  const { user } = useCurrentUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.email) return;
    
    supabase
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('to_email', user.email)
      .eq('is_read', false)
      .then(({ count: c }) => setCount(c || 0));

  }, [user?.email]);

  return count;
}