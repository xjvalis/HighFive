import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useUnreadMessageCount(user) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.email) { setCount(0); return; }

    const refresh = () => {
      supabase.from('direct_messages').select('id', { count: 'exact', head: true })
        .eq('to_email', user.email).eq('is_read', false)
        .then(({ count: c }) => setCount(c || 0));
    };
    refresh();

    const ch = supabase.channel('unread-dm-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        p => { if (p.new.to_email === user.email) setCount(c => c + 1); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        () => refresh())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.email]);

  return count;
}
