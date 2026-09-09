import { describe, it, expect } from 'vitest';
import { renderNotification } from './notifTemplates';

describe('renderNotification', () => {
  it('labels an organizer broadcast distinctly from a regular DM', () => {
    const broadcast = renderNotification({
      type: 'new_message',
      data: { isBroadcast: true, eventTitle: 'Fotbálek', preview: 'Sraz v 18:00' },
    }, 'cs');
    expect(broadcast.title).toContain('Zpráva organizátora');
    expect(broadcast.title).toContain('Fotbálek');

    const personal = renderNotification({
      type: 'new_message',
      data: { isBroadcast: false, senderName: 'Petr', preview: 'Ahoj!' },
    }, 'cs');
    expect(personal.title).toContain('Petr');
    expect(personal.title).not.toContain('organizátora');
  });

  it('renders a discussion notification with the event title and sender', () => {
    const notif = renderNotification({
      type: 'new_chat_message',
      data: { eventTitle: 'Deskovky', senderName: 'Anna', preview: 'Kdy začínáme?', collapsed: false },
    }, 'cs');
    expect(notif.title).toContain('Diskuze');
    expect(notif.title).toContain('Deskovky');
    expect(notif.body).toContain('Anna');
  });

  it('falls back to a generic bell icon for an unknown notification type', () => {
    const notif = renderNotification({ type: 'totally_unknown_type', data: {} }, 'cs');
    expect(notif.icon).toBe('🔔');
  });
});
