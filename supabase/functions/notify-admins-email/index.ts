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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { subject, message } = await req.json();
    if (!subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing subject or message' }), { status: 400, headers: corsHeaders });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      // Email sending isn't configured yet — don't fail the caller's flow over it.
      return new Response(JSON.stringify({ skipped: 'no_resend_key' }), { headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const { data: mods } = await serviceClient
      .from('user_profiles')
      .select('user_email')
      .or('is_admin.eq.true,is_moderator.eq.true');

    const recipients = [...new Set((mods || []).map(m => m.user_email).filter(Boolean))];
    if (!recipients.length) {
      return new Response(JSON.stringify({ skipped: 'no_recipients' }), { headers: corsHeaders });
    }

    const fromAddress = Deno.env.get('NOTIFY_FROM_EMAIL') || 'Spoluvíc <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddress, to: recipients, subject, text: message }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Resend API error: ${res.status} ${errBody}`);
    }

    return new Response(JSON.stringify({ sent: true, recipients: recipients.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('notify-admins-email error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
