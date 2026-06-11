import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

// Webhook nepotřebuje CORS — volá ho Stripe přímo
Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return new Response('Invalid signature', { status: 400 });
    }

    // Service role klient — webhook nemá user auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const userEmail = session.metadata?.user_email;
      const plan = session.metadata?.plan;

      if (userId && plan) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            is_premium: true,
            subscription_plan: plan,
            is_verified: plan === 'creator',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
          })
          .eq('user_id', userId);

        if (error) console.error('Webhook update error:', error);
        else console.log(`Upgraded ${userEmail} to ${plan}`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, user_email')
        .eq('stripe_subscription_id', subscription.id);

      if (profiles?.[0]) {
        await supabase
          .from('user_profiles')
          .update({
            is_premium: false,
            subscription_plan: 'free',
            is_verified: false,
            stripe_subscription_id: null,
          })
          .eq('user_id', profiles[0].user_id);

        console.log(`Downgraded ${profiles[0].user_email} to free`);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      // Např. upgrade Plus → Creator
      if (subscription.status === 'active') {
        const priceId = subscription.items.data[0]?.price?.id;
        const planMap = {
          [Deno.env.get('STRIPE_PRICE_PLUS')]: 'plus',
          [Deno.env.get('STRIPE_PRICE_CREATOR')]: 'creator',
        };
        const newPlan = planMap[priceId];
        if (newPlan) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_plan: newPlan,
              is_verified: newPlan === 'creator',
            })
            .eq('stripe_subscription_id', subscription.id);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
