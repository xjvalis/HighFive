import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Shield, CheckCircle, Flag, Trash2, Pencil, PauseCircle, UserX, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { useT } from '@/lib/i18n';
import { getCategoryLabel } from '@/lib/categories';
import { LanguageContext } from '@/lib/language';
import { toast } from 'sonner';
import EditEventModal from '@/components/events/EditEventModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { renderNotification } from '@/lib/notifTemplates';
import EmptyState from '@/components/ui/EmptyState';
import { svPageTitle, svCard, svField, svMeta } from '@/lib/svStyles';

export default function AdminDashboard() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user, profile } = useCurrentUser();
  const [tab, setTab] = useState('pending');
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [reliabilityRequests, setReliabilityRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEvent, setEditEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [suspendDialog, setSuspendDialog] = useState(null); // { event }
  const [suspendReason, setSuspendReason] = useState('');
  const [banConfirm, setBanConfirm] = useState(null);

  const isAdmin = profile?.is_admin;
  const isModerator = profile?.is_moderator;
  const hasAccess = isAdmin || isModerator;

  useEffect(() => {
    if (!hasAccess || !user) return;
    Promise.all([
      supabase.from('events').select('*').eq('is_approved', false).order('created_at', { ascending: false }).limit(50),
      supabase.from('reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
      supabase.from('notifications').select('*').eq('user_id', user.id).eq('type', 'reliability_reset_request').eq('is_read', false).order('created_at', { ascending: false }).limit(50),
    ]).then(([{ data: evts }, { data: rpts }, { data: relReqs }]) => {
      setEvents(evts || []);
      setReports(rpts || []);
      setReliabilityRequests(relReqs || []);
      setLoading(false);
    });
  }, [hasAccess, user]);

  const approveEvent = async (event) => {
    await supabase.from('events').update({ is_approved: true, is_suspended: false }).eq('id', event.id);
    setEvents(prev => prev.filter(e => e.id !== event.id));
    toast.success(lang === 'cs' ? 'Událost schválena ✓' : 'Event approved ✓');
  };

  const deleteEvent = async () => {
    if (!deleteConfirm) return;
    await supabase.from('events').delete().eq('id', deleteConfirm.id);
    setEvents(prev => prev.filter(e => e.id !== deleteConfirm.id));
    setReports(prev => prev.filter(r => r.target_id !== deleteConfirm.id));

    // Notify organizer
    try {
      const { data: orgProfile } = await supabase.from('user_profiles').select('user_id').eq('user_email', deleteConfirm.organizer_email).maybeSingle();
      if (orgProfile) {
        await supabase.from('notifications').insert({
          user_id: orgProfile.user_id, user_email: deleteConfirm.organizer_email,
          type: 'event_updated',
          data: { eventTitle: deleteConfirm.title, reason: 'deleted_by_moderator' },
          is_read: false,
        });
      }
    } catch (_) {}

    setDeleteConfirm(null);
    toast.success(lang === 'cs' ? 'Událost smazána' : 'Event deleted');
  };

  const suspendEvent = async () => {
    if (!suspendDialog) return;
    const reason = suspendReason.trim() || (lang === 'cs' ? 'Porušení pravidel platformy.' : 'Platform rules violation.');
    await supabase.from('events').update({ is_approved: false, is_suspended: true, suspension_reason: reason }).eq('id', suspendDialog.id);

    // Notify organizer with reason
    try {
      const { data: orgProfile } = await supabase.from('user_profiles').select('user_id').eq('user_email', suspendDialog.organizer_email).maybeSingle();
      if (orgProfile) {
        await supabase.from('notifications').insert({
          user_id: orgProfile.user_id, user_email: suspendDialog.organizer_email,
          type: 'event_suspended',
          data: { eventTitle: suspendDialog.title, reason }, // reason is moderator-typed — verbatim
          event_id: suspendDialog.id,
          is_read: false,
        });
      }
    } catch (_) {}

    setEvents(prev => prev.filter(e => e.id !== suspendDialog.id));
    setSuspendDialog(null);
    setSuspendReason('');
    toast.success(lang === 'cs' ? 'Událost pozastavena, organizátor upozorněn' : 'Event suspended, organizer notified');
  };

  const dismissReport = async (report) => {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', report.id);
    setReports(prev => prev.filter(r => r.id !== report.id));
    toast.success(lang === 'cs' ? 'Report zamítnut' : 'Report dismissed');
  };

  const banUser = async () => {
    if (!banConfirm) return;
    await supabase.from('user_profiles').update({ is_banned: true }).eq('user_email', banConfirm.reporter_email);
    setBanConfirm(null);
    toast.success(lang === 'cs' ? 'Uživatel zablokován' : 'User banned');
  };

  const resetReliability = async (notif) => {
    // New rows carry the email in data; legacy rows only have it embedded in body text.
    const email = notif.data?.requesterEmail || notif.body?.match(/\(([^)]+@[^)]+)\)/)?.[1];
    if (!email) return;
    await supabase.from('user_profiles').update({ reliability_score: 100, noshow_count: 0 }).eq('user_email', email);
    await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    // Notify user
    const { data: userProfile } = await supabase.from('user_profiles').select('user_id').eq('user_email', email).maybeSingle();
    if (userProfile) {
      await supabase.from('notifications').insert({
        user_id: userProfile.user_id, user_email: email,
        type: 'reliability_reset_done',
        data: {},
        is_read: false,
      });
    }
    setReliabilityRequests(prev => prev.filter(r => r.id !== notif.id));
    toast.success(lang === 'cs' ? 'Skóre resetováno' : 'Score reset');
  };

  const dismissReliabilityRequest = async (notif) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    setReliabilityRequests(prev => prev.filter(r => r.id !== notif.id));
  };

  const resolveReport = async (report) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
    setReports(prev => prev.filter(r => r.id !== report.id));
  };

  if (!hasAccess) return (
    <div className="flex flex-col items-center justify-center py-20 text-center" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <Shield className="w-10 h-10 mb-3" style={{ color: 'var(--sv-meta)' }}/>
      <h2 style={{ ...svPageTitle, fontSize: 16, marginBottom: 4 }}>{lang === 'cs' ? 'Přístup odepřen' : 'Access denied'}</h2>
      <p style={svMeta}>{lang === 'cs' ? 'Tato sekce je jen pro moderátory.' : 'This section is for moderators only.'}</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div className="flex items-center gap-2.5 mb-5">
        <Shield className="w-5 h-5" style={{ color: 'var(--sv-brand-purple)' }}/>
        <h1 style={svPageTitle}>{lang === 'cs' ? 'Moderace' : 'Moderation'}</h1>
        {isAdmin && <span style={{ font: "500 10px 'Outfit', sans-serif", background: '#F0EAFC', color: 'var(--sv-brand-purple)', padding: '3px 9px', borderRadius: 'var(--sv-r-pill)' }}>Admin</span>}
        {!isAdmin && isModerator && <span style={{ font: "500 10px 'Outfit', sans-serif", background: 'var(--sv-surface-muted)', color: 'var(--sv-meta)', padding: '3px 9px', borderRadius: 'var(--sv-r-pill)' }}>{lang === 'cs' ? 'Moderátor' : 'Moderator'}</span>}
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div style={{ ...svCard, padding: 14, textAlign: 'center' }}>
          <p style={{ font: "500 19px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{events.length}</p>
          <p style={{ ...svMeta, marginTop: 2 }}>{lang === 'cs' ? 'Čeká na schválení' : 'Pending approval'}</p>
        </div>
        <div style={{ ...svCard, padding: 14, textAlign: 'center' }}>
          <p style={{ font: "500 19px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{reports.length}</p>
          <p style={{ ...svMeta, marginTop: 2 }}>{lang === 'cs' ? 'Otevřené reporty' : 'Open reports'}</p>
        </div>
        <div style={{ ...svCard, padding: 14, textAlign: 'center' }}>
          <p style={{ font: "500 19px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{reliabilityRequests.length}</p>
          <p style={{ ...svMeta, marginTop: 2 }}>{lang === 'cs' ? 'Žádosti o reset' : 'Reset requests'}</p>
        </div>
      </div>

      <div className="flex flex-wrap" style={{ gap: 2, background: 'var(--sv-surface-muted)', borderRadius: 10, padding: 3, marginBottom: 18, width: 'fit-content' }}>
        {[
          { key: 'pending', label: `${lang === 'cs' ? 'Ke schválení' : 'Pending'} (${events.length})` },
          { key: 'reports', label: `${lang === 'cs' ? 'Reporty' : 'Reports'} (${reports.length})` },
          { key: 'reliability', label: `${lang === 'cs' ? 'Reset skóre' : 'Score resets'} (${reliabilityRequests.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="transition-all"
            style={{ padding: '8px 16px', borderRadius: 8, font: `${tab === t.key ? 500 : 400} 12px 'Outfit', sans-serif`, background: tab === t.key ? 'var(--sv-surface)' : 'transparent', color: tab === t.key ? 'var(--sv-ink)' : 'var(--sv-meta)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sv-hairline)', borderTopColor: 'var(--sv-brand-purple)' }}/></div>
      ) : tab === 'pending' ? (
        <div className="space-y-2">
          {events.map(e => (
            <div key={e.id} style={{ ...svCard, padding: 14 }}>
              <div className="mb-2.5">
                <p style={{ font: "500 13px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{e.title}</p>
                <p style={{ ...svMeta, marginTop: 2 }}>{getCategoryLabel(e.category, lang)} · {e.location}</p>
                <p style={svMeta}>{e.organizer_email} · {format(new Date(e.created_at), 'MMM d HH:mm')}</p>
              </div>
              {e.description && <p className="line-clamp-2" style={{ ...svMeta, background: 'var(--sv-surface-muted)', borderRadius: 8, padding: 8, marginBottom: 10 }}>{e.description}</p>}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => approveEvent(e)} className="rounded-xl gap-1 h-8 bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                  <CheckCircle className="w-3 h-3"/>{lang === 'cs' ? 'Schválit' : 'Approve'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditEvent(e)} className="rounded-xl gap-1 h-8">
                  <Pencil className="w-3 h-3"/>{lang === 'cs' ? 'Upravit' : 'Edit'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setSuspendDialog(e); setSuspendReason(''); }} className="rounded-xl gap-1 h-8 border-orange-200 text-orange-600 hover:bg-orange-50">
                  <PauseCircle className="w-3 h-3"/>{lang === 'cs' ? 'Pozastavit' : 'Suspend'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(e)} className="rounded-xl gap-1 h-8">
                  <Trash2 className="w-3 h-3"/>{lang === 'cs' ? 'Smazat' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
          {events.length === 0 && <EmptyState title={lang === 'cs' ? 'Vše zkontrolováno' : 'All reviewed'} />}
        </div>
      ) : tab === 'reports' ? (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} style={{ ...svCard, padding: 14 }}>
              <div className="flex items-start gap-2 mb-2.5">
                <Flag className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#A9564C' }}/>
                <div>
                  <p style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{r.reason}</p>
                  {r.description && <p style={{ ...svMeta, marginTop: 2 }}>{r.description}</p>}
                  <p style={{ ...svMeta, marginTop: 4 }}>od {r.reporter_email} · {format(new Date(r.created_at), 'MMM d HH:mm')}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {r.target_type === 'event' && r.target_id && (<>
                  <Button size="sm" variant="outline" onClick={async () => {
                    const { data: ev } = await supabase.from('events').select('*').eq('id', r.target_id).single();
                    if (ev) { setEditEvent(ev); await resolveReport(r); }
                  }} className="rounded-xl gap-1 h-8">
                    <Pencil className="w-3 h-3"/>{lang === 'cs' ? 'Upravit' : 'Edit'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setSuspendDialog({ id: r.target_id, title: r.reason, organizer_email: r.target_email }); resolveReport(r); }} className="rounded-xl gap-1 h-8 border-orange-200 text-orange-600 hover:bg-orange-50">
                    <PauseCircle className="w-3 h-3"/>{lang === 'cs' ? 'Pozastavit' : 'Suspend'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setDeleteConfirm({ id: r.target_id, title: r.reason, organizer_email: r.target_email }); resolveReport(r); }} className="rounded-xl gap-1 h-8">
                    <Trash2 className="w-3 h-3"/>
                  </Button>
                </>)}
                {r.target_type === 'user' && (
                  <Button size="sm" variant="destructive" onClick={() => setBanConfirm(r)} className="rounded-xl gap-1 h-8">
                    <UserX className="w-3 h-3"/>{lang === 'cs' ? 'Zablokovat' : 'Ban'}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => dismissReport(r)} className="rounded-xl gap-1 h-8">
                  <X className="w-3 h-3"/>{lang === 'cs' ? 'Zamítnout' : 'Dismiss'}
                </Button>
              </div>
            </div>
          ))}
          {reports.length === 0 && <EmptyState title={lang === 'cs' ? 'Žádné otevřené reporty' : 'No open reports'} />}
        </div>
      ) : (
        <div className="space-y-2">
          {reliabilityRequests.map(notif => (
            <div key={notif.id} style={{ ...svCard, padding: 14 }}>
              <div className="flex items-start gap-2 mb-2.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--sv-brand-orange)' }}/>
                <div>
                  <p style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{renderNotification(notif, lang).body}</p>
                  <p style={{ ...svMeta, marginTop: 4 }}>{format(new Date(notif.created_at), 'MMM d HH:mm')}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => resetReliability(notif)} className="rounded-xl gap-1 h-8 bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                  <CheckCircle className="w-3 h-3"/>{lang === 'cs' ? 'Resetovat skóre' : 'Reset score'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => dismissReliabilityRequest(notif)} className="rounded-xl gap-1 h-8">
                  <X className="w-3 h-3"/>{lang === 'cs' ? 'Zamítnout' : 'Dismiss'}
                </Button>
              </div>
            </div>
          ))}
          {reliabilityRequests.length === 0 && <EmptyState title={lang === 'cs' ? 'Žádné žádosti o reset' : 'No reset requests'} />}
        </div>
      )}

      {/* Suspend dialog with reason */}
      {suspendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
          <div className="absolute inset-0" style={{ background: 'rgba(58,52,63,0.4)' }} onClick={() => setSuspendDialog(null)}/>
          <div className="relative w-full max-w-md" style={{ ...svCard, padding: 22 }}>
            <div className="flex items-center gap-2 mb-3.5">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--sv-brand-orange)' }}/>
              <h3 style={{ font: "500 15px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{lang === 'cs' ? 'Pozastavit událost' : 'Suspend event'}</h3>
            </div>
            <p style={{ ...svMeta, marginBottom: 10 }}>
              {lang === 'cs'
                ? 'Napiš organizátorovi proč je událost pozastavena a co musí opravit.'
                : 'Tell the organizer why the event is suspended and what needs to be fixed.'}
            </p>
            <Textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder={lang === 'cs' ? 'Důvod pozastavení...' : 'Reason for suspension...'}
              className="resize-none mb-4"
              style={svField}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSuspendDialog(null)} className="rounded-xl">{lang === 'cs' ? 'Zrušit' : 'Cancel'}</Button>
              <Button onClick={suspendEvent} className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white border-0">
                <PauseCircle className="w-4 h-4 mr-1.5"/>
                {lang === 'cs' ? 'Pozastavit a upozornit' : 'Suspend & notify'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editEvent && <EditEventModal event={editEvent} open={!!editEvent} onClose={() => setEditEvent(null)} onSaved={() => { setEditEvent(null); toast.success(lang === 'cs' ? 'Událost upravena' : 'Event updated'); }}/>}
      <ConfirmDialog open={!!deleteConfirm} onConfirm={deleteEvent} onCancel={() => setDeleteConfirm(null)} title={lang === 'cs' ? 'Smazat událost?' : 'Delete event?'} description={lang === 'cs' ? 'Tato akce je nevratná. Organizátor bude upozorněn.' : 'This cannot be undone. The organizer will be notified.'} confirmLabel={lang === 'cs' ? 'Smazat' : 'Delete'} destructive/>
      <ConfirmDialog open={!!banConfirm} onConfirm={banUser} onCancel={() => setBanConfirm(null)} title={lang === 'cs' ? 'Zablokovat uživatele?' : 'Ban user?'} description={`${banConfirm?.reporter_email}`} confirmLabel={lang === 'cs' ? 'Zablokovat' : 'Ban'} destructive/>
    </div>
  );
}
