import { format } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';

// Renders a notification row into a localized {icon, title, body} using the
// READER's own language — never the language of whoever triggered it.
//
// New rows carry `type` + a structured `data` payload (numbers, raw enum
// values, names, and verbatim user-authored snippets like message previews
// or event titles) and get rendered into a sentence here at read time.
// Legacy rows (inserted before this existed) have no `data` and fall back to
// their frozen `title`/`body` as-is, same as an old email never retranslating.
//
// User-authored content (message/comment previews, event titles, moderator-
// typed suspension reasons) is only ever interpolated verbatim, never
// translated — only the app-generated wrapper text around it is localized.

export const TYPE_ICONS = {
  event_suspended: '⚠️', noshow_warning: '⚠️', event_reminder: '⏰', event_updated: '✏️',
  new_participant: '🙌', waitlist_promoted: '🎉', new_report: '🚩', new_message: '💬',
  new_chat_message: '💬', event_past: '🗓️', reliability_reset_request: '🔄', reliability_reset_done: '✅',
};

const REASON_LABELS = {
  cs: { inappropriate: '🚫 Nevhodný obsah', spam: '📢 Spam', fraud: '⚠️ Podvod', hate: '💢 Nenávistný obsah', other: '❓ Jiné' },
  en: { inappropriate: '🚫 Inappropriate content', spam: '📢 Spam', fraud: '⚠️ Fraud', hate: '💢 Hateful content', other: '❓ Other' },
};

export function renderNotification(n, lang) {
  const icon = TYPE_ICONS[n.type] || '🔔';
  const d = n.data;
  if (!d) return { icon, title: n.title, body: n.body };
  const cz = lang === 'cs';

  switch (n.type) {
    case 'new_participant':
      return {
        icon,
        title: cz ? `🙌 ${d.participantName} se přidal/a na: ${d.eventTitle}` : `🙌 ${d.participantName} joined: ${d.eventTitle}`,
        body: cz ? 'Nový účastník na tvé akci.' : 'A new participant joined your event.',
      };

    case 'waitlist_promoted':
      return {
        icon,
        title: cz ? `🎉 Dostal/a ses na akci: ${d.eventTitle}` : `🎉 You got into the event: ${d.eventTitle}`,
        body: cz ? 'Byl/a jsi přesunut/a z čekačky do účastníků.' : 'You were moved from the waitlist to participants.',
      };

    case 'event_updated':
      if (d.reason === 'waitlist_declined') return { icon, title: cz ? `😔 Nebyl/a jsi přijat/a na akci: ${d.eventTitle}` : `😔 You were not accepted to the event: ${d.eventTitle}` };
      if (d.reason === 'removed') return { icon, title: cz ? `😔 Byl/a jsi odebrán/a z akce: ${d.eventTitle}` : `😔 You were removed from the event: ${d.eventTitle}` };
      if (d.reason === 'deleted_by_moderator') return { icon: '🗑️', title: cz ? `🗑️ Tvá událost byla odstraněna: ${d.eventTitle}` : `🗑️ Your event was removed: ${d.eventTitle}`, body: cz ? 'Moderátor odstranil tvou událost z platformy.' : 'A moderator removed your event from the platform.' };
      return { icon, title: n.title, body: n.body };

    case 'event_suspended':
      return {
        icon,
        title: cz ? `⚠️ Tvá událost byla pozastavena: ${d.eventTitle}` : `⚠️ Your event was suspended: ${d.eventTitle}`,
        body: d.reason, // moderator-typed text — verbatim, not translated
      };

    case 'noshow_warning':
      return {
        icon,
        title: cz ? '⚠️ Nepřišel/a jsi na akci' : '⚠️ You missed an event',
        body: cz
          ? `Organizátor označil tvou neúčast na akci "${d.eventTitle}". Pokud se nemůžeš zúčastnit, odhlašuj se prosím předem ✌️`
          : `The organizer marked you as absent from "${d.eventTitle}". Please cancel in advance if you can't make it ✌️`,
      };

    case 'event_reminder': {
      const dateStr = d.eventDate ? format(new Date(d.eventDate), 'd. M. HH:mm', { locale: cz ? cs : enUS }) : '';
      return {
        icon,
        title: cz ? `⏰ Připomínka: ${d.eventTitle}` : `⏰ Reminder: ${d.eventTitle}`,
        body: cz ? `Událost se koná ${dateStr} na místě ${d.location}.` : `The event happens ${dateStr} at ${d.location}.`,
      };
    }

    case 'new_report': {
      const reasonLabel = REASON_LABELS[cz ? 'cs' : 'en'][d.reason] || d.reason;
      return {
        icon,
        title: cz ? `🚩 Nové nahlášení: ${d.eventTitle}` : `🚩 New report: ${d.eventTitle}`,
        body: `${cz ? 'Důvod' : 'Reason'}: ${reasonLabel}`,
      };
    }

    case 'new_message':
      return d.isBroadcast
        ? {
            icon: '📢',
            title: cz ? `📢 Zpráva organizátora: ${d.eventTitle}` : `📢 Organizer message: ${d.eventTitle}`,
            body: d.preview, // user-authored — verbatim
          }
        : {
            icon,
            title: cz ? `💬 Nová zpráva od ${d.senderName}` : `💬 New message from ${d.senderName}`,
            body: d.preview, // user-authored — verbatim
          };

    case 'new_chat_message': {
      const collapsedBody = cz ? 'V diskuzi jsou nové zprávy.' : 'There are new messages in the discussion.';
      const sender = d.senderName || (cz ? 'Někdo' : 'Someone');
      return {
        icon,
        title: `💬 ${cz ? 'Diskuze' : 'Discussion'}: ${d.eventTitle}`,
        body: d.collapsed ? collapsedBody : `${sender}: ${d.preview}`, // sender/preview — verbatim
      };
    }

    case 'event_past':
      return {
        icon,
        title: `🗓️ ${d.eventTitle}`,
        body: cz ? 'Tato akce již proběhla. Najdeš ji v sekci Proběhlé v Mých akcích.' : 'This event has already happened. Find it under Past in My Events.',
      };

    case 'reliability_reset_request':
      return {
        icon,
        title: cz ? '🔄 Žádost o reset spolehlivosti' : '🔄 Reliability reset request',
        body: `${d.requesterName} (${d.requesterEmail}) ${cz ? 'žádá o reset.' : 'requests a reset.'}`,
      };

    case 'reliability_reset_done':
      return {
        icon,
        title: cz ? '✅ Tvé skóre spolehlivosti bylo resetováno' : '✅ Your reliability score was reset',
        body: cz ? 'Moderátor ti resetoval skóre spolehlivosti. Čistý štít!' : 'A moderator reset your reliability score. Fresh start!',
      };

    default:
      return { icon, title: n.title, body: n.body };
  }
}
