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

    const { eventData } = await req.json();

    // Načti profil a zkontroluj free limit
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
      const used = isNewMonth ? 0 : (profile.monthly_create_count || 0);
      if (used >= 1) {
        return new Response(JSON.stringify({ error: 'monthly_limit_reached' }), { status: 403, headers: corsHeaders });
      }
    }

    // Vytvoř event
    const { data: created, error: createError } = await serviceClient
      .from('events')
      .insert({
        ...eventData,
        organizer_id: user.id,
        organizer_email: user.email,
        organizer_name: profile?.display_name || user.email,
        organizer_avatar: profile?.avatar_url || null,
        participants: [user.email],
        is_approved: true,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Aktualizuj počítadlo pro free uživatele
    if (!isPremium && profile) {
      const now = new Date();
      const resetDate = profile.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
      const isNewMonth = !resetDate || now.getFullYear() > resetDate.getFullYear() || now.getMonth() > resetDate.getMonth();
      const newCount = isNewMonth ? 1 : (profile.monthly_create_count || 0) + 1;
      const monthlyResetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      await serviceClient.from('user_profiles').update({
        monthly_create_count: newCount,
        monthly_reset_date: monthlyResetDate,
      }).eq('user_id', user.id);
    }

    return new Response(JSON.stringify({ event: created }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('create-event error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
