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

    let updatedEvent;

    if (action === 'leave') {
      const participants = (event.participants || []).filter(e => e !== user.email);
      const { data } = await serviceClient
        .from('events')
        .update({ participants })
        .eq('id', event_id)
        .select()
        .single();
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
      const waitlist = (event.waitlist || []).filter(e => e !== user.email);
      const { data } = await serviceClient.from('events').update({ waitlist }).eq('id', event_id).select().single();
      updatedEvent = data;

    } else if (action === 'join_waitlist') {
      if ((event.waitlist || []).includes(user.email)) {
        return new Response(JSON.stringify({ error: 'Already on waitlist' }), { status: 400, headers: corsHeaders });
      }
      const waitlist = [...(event.waitlist || []), user.email];
      const { data } = await serviceClient.from('events').update({ waitlist }).eq('id', event_id).select().single();
      updatedEvent = data;

    } else if (action === 'join') {
      if ((event.participants || []).includes(user.email)) {
        return new Response(JSON.stringify({ error: 'Already joined' }), { status: 400, headers: corsHeaders });
      }
      const isFull = event.max_capacity && (event.participants || []).length >= event.max_capacity;
      if (isFull) {
        return new Response(JSON.stringify({ error: 'Event is full' }), { status: 400, headers: corsHeaders });
      }

      const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const isPremium = profile?.is_premium || profile?.subscription_plan === 'plus' || profile?.subscription_plan === 'creator';

      if (!isPremium && profile) {
        const now = new Date();
        const resetDate = profile.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
        const isNewMonth = !resetDate || now.getFullYear() > resetDate.getFullYear() || now.getMonth() > resetDate.getMonth();
        const used = isNewMonth ? 0 : (profile.monthly_join_count || 0);
        if (used >= 3) {
          return new Response(JSON.stringify({ error: 'monthly_limit_reached' }), { status: 403, headers: corsHeaders });
        }
      }

      const participants = [...(event.participants || []), user.email];
      const { data } = await serviceClient.from('events').update({ participants }).eq('id', event_id).select().single();
      updatedEvent = data;

      if (profile) {
        const joined = [...(profile.joined_events || [])];
        if (!joined.includes(event_id)) joined.push(event_id);
        const now = new Date();
        const resetDate = profile.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
        const isNewMonth = !resetDate || now.getFullYear() > resetDate.getFullYear() || now.getMonth() > resetDate.getMonth();
        const newCount = isNewMonth ? 1 : (profile.monthly_join_count || 0) + 1;
        const monthlyResetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        await serviceClient.from('user_profiles').update({
          joined_events: joined,
          monthly_join_count: newCount,
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
