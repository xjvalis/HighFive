import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const { eventData } = await req.json();

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Check monthly create limit for free users
  const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
  const profile = profiles[0];

  const isPremium = profile && (
    profile.is_premium ||
    profile.subscription_plan === 'plus' ||
    profile.subscription_plan === 'creator'
  );

  if (!isPremium) {
    const now = new Date();
    const resetDate = profile?.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
    const isNewMonth = !resetDate ||
      now.getFullYear() > resetDate.getFullYear() ||
      now.getMonth() > resetDate.getMonth();
    const used = isNewMonth ? 0 : (profile?.monthly_create_count || 0);

    if (used >= 1) {
      return Response.json({ error: 'monthly_limit_reached' }, { status: 403 });
    }
  }

  // Create the event
  const created = await base44.entities.Event.create({
    ...eventData,
    created_by: user.email,
    organizer_name: user.full_name || user.email,
    participants: [user.email],
    is_approved: true,
  });

  // Update monthly create count for free users
  if (!isPremium && profile) {
    const now = new Date();
    const resetDate = profile.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
    const isNewMonth = !resetDate ||
      now.getFullYear() > resetDate.getFullYear() ||
      now.getMonth() > resetDate.getMonth();
    const newCount = isNewMonth ? 1 : (profile.monthly_create_count || 0) + 1;
    const monthlyResetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    await base44.entities.UserProfile.update(profile.id, {
      monthly_create_count: newCount,
      monthly_reset_date: monthlyResetDate,
    });
  }

  return Response.json({ event: created });
});