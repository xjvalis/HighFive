import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useNotificationEngine(user) {
  const channelsRef = useRef([]);

  useEffect(() => {
    if (!user?.id || !user?.email) return;
    channelsRef.current.forEach(c => supabase.removeChannel(c));
    channelsRef.current = [];

    // New DM notification
    const dmCh = supabase.channel('notif-dm')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        async (p) => {
          if (p.new.to_email !== user.email) return;
          await supabase.from('notifications').insert({
            user_id: user.id, user_email: user.email, type: 'new_message',
            title: `💬 Nová zpráva od ${p.new.from_name || p.new.from_email}`,
            body: p.new.content?.slice(0, 80), is_read: false,
          });
        })
      .subscribe();
    channelsRef.current.push(dmCh);

    // New chat message notification
    const chatCh = supabase.channel('notif-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_chat' },
        async (p) => {
          const msg = p.new;
          if (msg.author_email === user.email) return;
          const { data: ev } = await supabase.from('events').select('title,participants,organizer_email').eq('id', msg.event_id).single();
          if (!ev) return;
          if (!ev.participants?.includes(user.email) && ev.organizer_email !== user.email) return;
          await supabase.from('notifications').insert({
            user_id: user.id, user_email: user.email, type: 'new_chat_message',
            title: `💬 ${ev.title}`,
            body: `${msg.author_name || 'Někdo'}: ${msg.content?.slice(0, 60)}`,
            event_id: msg.event_id, is_read: false,
          });
        })
      .subscribe();
    channelsRef.current.push(chatCh);

    return () => { channelsRef.current.forEach(c => supabase.removeChannel(c)); channelsRef.current = []; };
  }, [user?.id, user?.email]);
}
