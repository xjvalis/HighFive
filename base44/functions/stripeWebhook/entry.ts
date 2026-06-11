import { createClient } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14';

const PLAN_BY_PRICE = {
  'price_1Th4A3DkS1RZcxlOqa97rjr3': 'plus',
  'price_1Th4A3DkS1RZcxlOUHJlOeuP': 'creator',
};

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

    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userEmail = session.metadata?.user_email;
      const plan = session.metadata?.plan;

      if (userEmail && plan) {
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_email: userEmail });
      if (profiles[0]) {
        await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
          is_premium: true,
          subscription_plan: plan,
          is_verified: plan === 'creator',
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer,
        });
          console.log(`Upgraded ${userEmail} to ${plan}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      // Find user by stripe customer — search by subscription ID stored on profile
      const subId = subscription.id;
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ stripe_subscription_id: subId }).catch(() => []);
      if (profiles[0]) {
        await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
          is_premium: false,
          subscription_plan: 'free',
          is_verified: false,
          stripe_subscription_id: null,
        });
        console.log(`Downgraded ${profiles[0].user_email} to free`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});