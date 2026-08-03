import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Shield, CheckCircle, Flag, Trash2, Pencil, PauseCircle, UserX, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { getCategoryLabel } from '@/lib/categories';
import { LanguageContext } from '@/lib/language';
import { toast } from 'sonner';
import EditEventModal from '@/components/events/EditEventModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { renderNotification } from '@/lib/notifTemplates';

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
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Shield className="w-12 h-12 text-muted-foreground mb-3"/>
      <h2 className="font-grotesk font-bold text-xl mb-1">{lang === 'cs' ? 'Přístup odepřen' : 'Access denied'}</h2>
      <p className="text-sm text-muted-foreground">{lang === 'cs' ? 'Tato sekce je jen pro moderátory.' : 'This section is for moderators only.'}</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary"/>
        <h1 className="font-grotesk font-bold text-2xl">{lang === 'cs' ? 'Moderace' : 'Moderation'}</h1>
        {isAdmin && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Admin</span>}
        {!isAdmin && isModerator && <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{lang === 'cs' ? 'Moderátor' : 'Moderator'}</span>}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card rounded-2xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold">{events.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{lang === 'cs' ? 'Čeká na schválení' : 'Pending approval'}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold">{reports.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{lang === 'cs' ? 'Otevřené reporty' : 'Open reports'}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold">{reliabilityRequests.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{lang === 'cs' ? 'Žádosti o reset' : 'Reset requests'}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-5 w-fit flex-wrap">
        {[
          { key: 'pending', label: `${lang === 'cs' ? 'Ke schválení' : 'Pending'} (${events.length})` },
          { key: 'reports', label: `${lang === 'cs' ? 'Reporty' : 'Reports'} (${reports.length})` },
          { key: 'reliability', label: `${lang === 'cs' ? 'Reset skóre' : 'Score resets'} (${reliabilityRequests.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t.key ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-lavender border-t-violet-500 rounded-full animate-spin"/></div>
      ) : tab === 'pending' ? (
        <div className="space-y-3">
          {events.map(e => (
            <div key={e.id} className="bg-card rounded-2xl border border-border/60 p-4">
              <div className="mb-3">
                <p className="font-semibold text-sm">{e.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{getCategoryLabel(e.category, lang)} · {e.location}</p>
                <p className="text-xs text-muted-foreground">{e.organizer_email} · {format(new Date(e.created_at), 'MMM d HH:mm')}</p>
              </div>
              {e.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2 bg-secondary/50 rounded-lg p-2">{e.description}</p>}
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
          {events.length === 0 && (
            <div className="text-center py-10"><CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2"/><p className="text-sm text-muted-foreground">{lang === 'cs' ? 'Vše zkontrolováno ✓' : 'All reviewed ✓'}</p></div>
          )}
        </div>
      ) : tab === 'reports' ? (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-card rounded-2xl border border-border/60 p-4">
              <div className="flex items-start gap-2 mb-3">
                <Flag className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-medium">{r.reason}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">od {r.reporter_email} · {format(new Date(r.created_at), 'MMM d HH:mm')}</p>
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
          {reports.length === 0 && (
            <div className="text-center py-10"><CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2"/><p className="text-sm text-muted-foreground">{lang === 'cs' ? 'Žádné otevřené reporty' : 'No open reports'}</p></div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reliabilityRequests.map(notif => (
            <div key={notif.id} className="bg-card rounded-2xl border border-border/60 p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-medium">{renderNotification(notif, lang).body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(notif.created_at), 'MMM d HH:mm')}</p>
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
          {reliabilityRequests.length === 0 && (
            <div className="text-center py-10"><CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2"/><p className="text-sm text-muted-foreground">{lang === 'cs' ? 'Žádné žádosti o reset' : 'No reset requests'}</p></div>
          )}
        </div>
      )}

      {/* Suspend dialog with reason */}
      {suspendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSuspendDialog(null)}/>
          <div className="relative bg-card rounded-2xl border border-border shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500"/>
              <h3 className="font-grotesk font-semibold">{lang === 'cs' ? 'Pozastavit událost' : 'Suspend event'}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {lang === 'cs'
                ? 'Napiš organizátorovi proč je událost pozastavena a co musí opravit.'
                : 'Tell the organizer why the event is suspended and what needs to be fixed.'}
            </p>
            <Textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder={lang === 'cs' ? 'Důvod pozastavení...' : 'Reason for suspension...'}
              className="rounded-xl resize-none mb-4"
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
