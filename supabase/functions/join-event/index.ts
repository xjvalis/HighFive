import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: req.headers.get('Authorization') } } }
    );

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { event_id, action } = await req.json();
    if (!event_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing event_id or action' }), { status: 400, headers: corsHeaders });
    }

    const { data: event, error: eventError } = await serviceClient
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404, headers: corsHeaders });
    }

    // The actual participants/waitlist mutation goes through this Postgres
    // function, which locks the event row for the duration of the check+update
    // (see migration 20260913000001) — reading the arrays into JS and writing
    // the whole column back here would race: two different users joining the
    // same near-full event at nearly the same instant could both pass a
    // capacity check read from stale data, and whichever write lands last
    // would silently overwrite (not merge) the other's addition.
    async function applyAttendance(a) {
      const { data, error } = await serviceClient.rpc('update_event_attendance', {
        p_event_id: event_id, p_action: a, p_user_email: user.email,
      });
      return { data, error };
    }

    let updatedEvent;

    if (action === 'leave') {
      const { data, error } = await applyAttendance('leave');
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      updatedEvent = data;

      const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('joined_events')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const joined = (profile.joined_events || []).filter(id => id !== event_id);
        await serviceClient.from('user_profiles').update({ joined_events: joined }).eq('user_id', user.id);
      }

    } else if (action === 'leave_waitlist') {
      const { data, error } = await applyAttendance('leave_waitlist');
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      updatedEvent = data;

    } else if (action === 'join_waitlist') {
      const { data, error } = await applyAttendance('join_waitlist');
      if (error) {
        const status = error.message?.includes('not_found') ? 404 : 400;
        return new Response(JSON.stringify({ error: error.message?.includes('already') ? 'Already on waitlist' : error.message }), { status, headers: corsHeaders });
      }
      updatedEvent = data;

    } else if (action === 'join') {
      const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const isPremium = profile?.is_premium || profile?.subscription_plan === 'plus' || profile?.subscription_plan === 'creator';

      // monthly_join_count tracks DISTINCT events spent a slot on this month,
      // not raw join actions — leaving an event and rejoining it later the
      // same month re-uses the same slot instead of costing a new one. The
      // slot is only freed by the calendar rolling over to a new month.
      // (Per-user, so unlike participants/waitlist there's no cross-user
      // race on this profile row worth locking for.)
      const now = new Date();
      const resetDate = profile?.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
      const isNewMonth = !resetDate || now.getFullYear() > resetDate.getFullYear() || now.getMonth() > resetDate.getMonth();
      const usedEventIds = isNewMonth ? [] : (profile?.monthly_joined_event_ids || []);
      const alreadyUsedSlotThisMonth = usedEventIds.includes(event_id);

      if (!isPremium && profile && !alreadyUsedSlotThisMonth && usedEventIds.length >= 3) {
        return new Response(JSON.stringify({ error: 'monthly_limit_reached' }), { status: 403, headers: corsHeaders });
      }

      const { data, error } = await applyAttendance('join');
      if (error) {
        const msg = error.message || '';
        if (msg.includes('already_joined')) return new Response(JSON.stringify({ error: 'Already joined' }), { status: 400, headers: corsHeaders });
        if (msg.includes('event_full')) return new Response(JSON.stringify({ error: 'Event is full' }), { status: 400, headers: corsHeaders });
        if (msg.includes('event_not_found')) return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404, headers: corsHeaders });
        return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders });
      }
      updatedEvent = data;

      if (profile) {
        const joined = [...(profile.joined_events || [])];
        if (!joined.includes(event_id)) joined.push(event_id);
        const newEventIds = alreadyUsedSlotThisMonth ? usedEventIds : [...usedEventIds, event_id];
        const monthlyResetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        await serviceClient.from('user_profiles').update({
          joined_events: joined,
          monthly_join_count: newEventIds.length,
          monthly_joined_event_ids: newEventIds,
          monthly_reset_date: monthlyResetDate,
        }).eq('user_id', user.id);
      }

      // Notifikace organizátorovi — try/catch místo .catch()
      if (event.organizer_id) {
        try {
          const { data: orgProfile } = await serviceClient
            .from('user_profiles')
            .select('user_id')
            .eq('user_email', event.organizer_email)
            .single();

          if (orgProfile) {
            await serviceClient.from('notifications').insert({
              user_id: orgProfile.user_id,
              user_email: event.organizer_email,
              type: 'new_participant',
              data: { participantName: profile?.display_name || user.email, eventTitle: event.title },
              event_id: event_id,
              is_read: false,
            });
          }
        } catch (_) {
          // Notifikace není kritická, ignoruj chybu
        }
      }

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ event: updatedEvent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('join-event error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
