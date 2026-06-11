import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14';

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { return_url } = body;

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    const profile = profiles[0];

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: return_url || 'https://app.base44.com/profile',
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});