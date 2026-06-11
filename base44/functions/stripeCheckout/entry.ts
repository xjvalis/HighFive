import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14';

const PRICE_IDS = {
  plus: Deno.env.get('STRIPE_PRICE_PLUS') || 'price_1Th4A3DkS1RZcxlOqa97rjr3',
  creator: Deno.env.get('STRIPE_PRICE_CREATOR') || 'price_1Th4A3DkS1RZcxlOUHJlOeuP',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan, success_url, cancel_url } = await req.json();

    const priceId = PRICE_IDS[plan];
    if (!priceId) return Response.json({ error: 'Invalid plan' }, { status: 400 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${req.headers.get('origin') || 'https://highfive.app'}/profile?premium=success`,
      cancel_url: cancel_url || `${req.headers.get('origin') || 'https://highfive.app'}/profile`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        plan,
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});