import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only: verify caller is admin (or it's a scheduled call with service role)
    // For scheduled automations this runs as service role, so we use asServiceRole directly.
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000); // 23.5h from now
    const windowEnd   = new Date(now.getTime() + 24.5 * 60 * 60 * 1000); // 24.5h from now

    // Fetch all upcoming events in the 24h window
    const events = await base44.asServiceRole.entities.Event.filter({ is_approved: true }, 'date', 500);

    const upcoming = events.filter(e => {
      const d = new Date(e.date);
      return d >= windowStart && d <= windowEnd;
    });

    if (upcoming.length === 0) {
      return Response.json({ sent: 0, message: 'No events in 24h window' });
    }

    let notifCount = 0;

    for (const event of upcoming) {
      const participants = event.participants || [];
      if (participants.length === 0) continue;

      const eventDate = new Date(event.date).toLocaleDateString('cs', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
      const eventTime = new Date(event.date).toLocaleTimeString('cs', {
        hour: '2-digit', minute: '2-digit'
      });
      const appUrl = `${req.headers.get('origin') || 'https://app.highfive.cz'}/event/${event.id}`;

      for (const email of participants) {
        // Check if we already sent a reminder for this event to this user
        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_email: email,
          event_id: event.id,
          type: 'event_reminder',
        });
        if (existing.length > 0) continue; // already sent

        // In-app notification
        await base44.asServiceRole.entities.Notification.create({
          user_email: email,
          type: 'event_reminder',
          title: `⏰ Zítra: ${event.title}`,
          body: `Nezapomeň! Akce se koná ${eventDate} v ${eventTime} na místě ${event.location}.`,
          event_id: event.id,
          is_read: false,
        });

        // Email reminder
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `⏰ Připomínka: ${event.title} je zítra!`,
          body: `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#6366f1);padding:32px 32px 24px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">⏰</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Je to zítra!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;font-weight:600;">${event.title}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0;">
            <table width="100%" style="background:#f5f3ff;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #ede9fe;">
                  <span style="font-size:13px;color:#7c3aed;">🕐</span>
                  <span style="font-size:13px;color:#4c1d95;margin-left:8px;font-weight:600;">${eventDate} · ${eventTime}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;">
                  <span style="font-size:13px;color:#7c3aed;">📍</span>
                  <span style="font-size:13px;color:#4c1d95;margin-left:8px;font-weight:600;">${event.location}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;text-align:center;">
            <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;">
              Zobrazit akci →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Těšíme se na tebe! 🙌 — tým <strong style="color:#7c3aed;">HighFive</strong></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });

        notifCount++;
      }
    }

    console.log(`Sent ${notifCount} reminders for ${upcoming.length} events`);
    return Response.json({ sent: notifCount, events: upcoming.length });
  } catch (error) {
    console.error('sendEventReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});