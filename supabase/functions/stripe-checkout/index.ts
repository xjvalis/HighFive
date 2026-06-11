import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICE_IDS = {
  plus: Deno.env.get('STRIPE_PRICE_PLUS'),
  creator: Deno.env.get('STRIPE_PRICE_CREATOR'),
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

    const { plan, success_url, cancel_url } = await req.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Invalid plan or missing STRIPE_PRICE_${plan?.toUpperCase()} env var` }), { status: 400, headers: corsHeaders });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://highfive.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${origin}/profile?premium=success`,
      cancel_url: cancel_url || `${origin}/profile`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        plan,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('stripe-checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
