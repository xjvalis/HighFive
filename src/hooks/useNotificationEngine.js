import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Collapses bursts of activity into a single unread notification instead of
// inserting one row per message: the first message gets a specific preview,
// any further message while that notification is still unread just bumps the
// data payload (marked `collapsed: true`) rather than spamming new rows.
// `kind` distinguishes event chat from discussion comments (both use type
// 'new_chat_message'); rendering is done at read time via notifTemplates.js.
async function notifyOrCollapse({ userId, userEmail, eventId, eventTitle, kind, senderName, preview }) {
  const { data: existing } = await supabase.from('notifications')
    .select('id, data')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('type', 'new_chat_message')
    .eq('is_read', false)
    .maybeSingle();

  if (existing && existing.data?.kind === kind) {
    await supabase.from('notifications').update({
      data: { eventTitle, kind, senderName, preview, collapsed: true },
      created_at: new Date().toISOString(),
    }).eq('id', existing.id);
  } else {
    await supabase.from('notifications').insert({
      user_id: userId, user_email: userEmail, type: 'new_chat_message',
      data: { eventTitle, kind, senderName, preview, collapsed: false },
      event_id: eventId, is_read: false,
    });
  }
}

export function useNotificationEngine(user) {
  const channelsRef = useRef([]);

  useEffect(() => {
    if (!user?.id || !user?.email) return;
    channelsRef.current.forEach(c => supabase.removeChannel(c));
    channelsRef.current = [];

    // New DM notification
    const dmCh = supabase.channel(`notif-dm-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        async (p) => {
          if (p.new.to_email !== user.email) return;
          await supabase.from('notifications').insert({
            user_id: user.id, user_email: user.email, type: 'new_message',
            data: { senderName: p.new.from_name || p.new.from_email, preview: p.new.content?.slice(0, 80) },
            is_read: false,
          });
        })
      .subscribe();
    channelsRef.current.push(dmCh);

    // New event chat message notification (collapses repeat messages)
    const chatCh = supabase.channel(`notif-chat-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_chat' },
        async (p) => {
          const msg = p.new;
          if (msg.author_email === user.email) return;
          const { data: ev } = await supabase.from('events').select('title,participants,organizer_email').eq('id', msg.event_id).single();
          if (!ev) return;
          if (!ev.participants?.includes(user.email) && ev.organizer_email !== user.email) return;
          await notifyOrCollapse({
            userId: user.id, userEmail: user.email, eventId: msg.event_id, eventTitle: ev.title,
            kind: 'chat', senderName: msg.author_name || null, preview: msg.content?.slice(0, 60),
          });
        })
      .subscribe();
    channelsRef.current.push(chatCh);

    // New discussion comment notification (collapses repeat comments)
    const commentCh = supabase.channel(`notif-comment-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' },
        async (p) => {
          const comment = p.new;
          if (comment.author_email === user.email) return;
          const { data: ev } = await supabase.from('events').select('title,participants,organizer_email').eq('id', comment.event_id).single();
          if (!ev) return;
          if (!ev.participants?.includes(user.email) && ev.organizer_email !== user.email) return;
          await notifyOrCollapse({
            userId: user.id, userEmail: user.email, eventId: comment.event_id, eventTitle: ev.title,
            kind: 'discussion', senderName: comment.author_name || null, preview: comment.content?.slice(0, 60),
          });
        })
      .subscribe();
    channelsRef.current.push(commentCh);

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
        await supabase.from('notifications').insert({ user_id: user.id, user_email: user.email, type: 'event_past', data: { eventTitle: event.title }, event_id: event.id, is_read: false });
      }
    }

    return () => { channelsRef.current.forEach(c => supabase.removeChannel(c)); channelsRef.current = []; clearInterval(pastInterval); };
  }, [user?.id, user?.email]);
}
