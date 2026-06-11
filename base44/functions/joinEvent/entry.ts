import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // Read body BEFORE SDK init — SDK clones the request internally but body must be read first
    const body = await req.json().catch(() => ({}));
    const { event_id, action } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!event_id || !action) {
      return Response.json({ error: 'Missing event_id or action' }, { status: 400 });
    }

    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    const event = events[0];
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    let updatedEvent;

    if (action === 'leave') {
      const participants = (event.participants || []).filter(e => e !== user.email);
      updatedEvent = await base44.asServiceRole.entities.Event.update(event.id, { participants });

      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email });
      if (profiles[0]) {
        const joined = (profiles[0].joined_events || []).filter(id => id !== event_id);
        await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, { joined_events: joined });
      }
    } else if (action === 'leave_waitlist') {
      const waitlist = (event.waitlist || []).filter(e => e !== user.email);
      updatedEvent = await base44.asServiceRole.entities.Event.update(event.id, { waitlist });
    } else if (action === 'join_waitlist') {
      if ((event.waitlist || []).includes(user.email)) {
        return Response.json({ error: 'Already on waitlist' }, { status: 400 });
      }
      const waitlist = [...(event.waitlist || []), user.email];
      updatedEvent = await base44.asServiceRole.entities.Event.update(event.id, { waitlist });
    } else if (action === 'join') {
      if ((event.participants || []).includes(user.email)) {
        return Response.json({ error: 'Already joined' }, { status: 400 });
      }
      const isFull = event.max_capacity && (event.participants || []).length >= event.max_capacity;
      if (isFull) return Response.json({ error: 'Event is full' }, { status: 400 });

      const participants = [...(event.participants || []), user.email];
      updatedEvent = await base44.asServiceRole.entities.Event.update(event.id, { participants });

      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: user.email });
      if (profiles[0]) {
        const joined = [...(profiles[0].joined_events || [])];
        if (!joined.includes(event_id)) {
          joined.push(event_id);
          await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, { joined_events: joined });
        }
      }

      // Notify organizer (best-effort)
      if (event.created_by_id) {
        base44.asServiceRole.entities.Notification.create({
          user_email: event.created_by || '',
          type: 'new_participant',
          title: `🙌 ${user.full_name || user.email} se přidal/a na: ${event.title}`,
          body: 'Nový účastník na tvé akci.',
          event_id: event.id,
          is_read: false,
        }).catch(() => {});
      }
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Sync participant_emails on all EventChat messages for this event
    // so RLS always reflects the current participant list
    // Run as fire-and-forget to avoid blocking the response
    if (updatedEvent) {
      const currentParticipants = Array.from(new Set([
        ...(updatedEvent.participants || []),
        updatedEvent.created_by || '',
      ].filter(Boolean)));

      // Fire-and-forget: don't await, don't block response
      base44.asServiceRole.entities.EventChat.filter({ event_id: event_id })
        .then((chats) => {
          if (chats && chats.length > 0) {
            Promise.all(
              chats.map(chat =>
                base44.asServiceRole.entities.EventChat.update(chat.id, { participant_emails: currentParticipants })
              )
            ).catch((err) => console.error('EventChat sync update error:', err));
          }
        })
        .catch((err) => console.error('EventChat sync filter error:', err));
    }

    return Response.json({ event: updatedEvent });
  } catch (error) {
    console.error('joinEvent error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});