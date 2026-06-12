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

    // Past event notifications
    checkPastEvents();
    const pastInterval = setInterval(checkPastEvents, 60 * 60 * 1000);

    async function checkPastEvents() {
      if (!user?.email) return;
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: pastEvents } = await supabase.from('events').select('id, title, participants, organizer_email').lt('date', yesterday).gte('date', twoDaysAgo);
      if (!pastEvents?.length) return;
      for (const event of pastEvents) {
        const isP = event.participants?.includes(user.email);
        const isO = event.organizer_email === user.email;
        if (!isP && !isO) continue;
        const { data: existing } = await supabase.from('notifications').select('id').eq('user_id', user.id).eq('event_id', event.id).eq('type', 'event_past').maybeSingle();
        if (existing) continue;
        await supabase.from('notifications').insert({ user_id: user.id, user_email: user.email, type: 'event_past', title: `🗓️ ${event.title}`, body: 'Tato akce již proběhla. Najdeš ji v sekci Proběhlé v Mých akcích.', event_id: event.id, is_read: false });
      }
    }

    return () => { channelsRef.current.forEach(c => supabase.removeChannel(c)); channelsRef.current = []; clearInterval(pastInterval); };
  }, [user?.id, user?.email]);
}
