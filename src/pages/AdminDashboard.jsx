import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Shield, CheckCircle, Flag, Trash2, Pencil, PauseCircle, UserX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { getCategoryLabel } from '@/lib/categories';
import { LanguageContext } from '@/lib/language';
import { toast } from 'sonner';
import EditEventModal from '@/components/events/EditEventModal';
import SendDMModal from '@/components/messages/SendDMModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function AdminDashboard() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user, profile } = useCurrentUser();
  const [tab, setTab] = useState('pending');
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEvent, setEditEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [suspendConfirm, setSuspendConfirm] = useState(null);
  const [banConfirm, setBanConfirm] = useState(null);
  const [sendDM, setSendDM] = useState(null); // { email, name, event }

  const isAdmin = profile?.is_admin;
  const isModerator = profile?.is_moderator;
  const hasAccess = isAdmin || isModerator;

  useEffect(() => {
    if (!hasAccess) return;
    Promise.all([
      supabase.from('events').select('*').eq('is_approved', false).order('created_at', { ascending: false }).limit(50),
      supabase.from('reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
    ]).then(([{ data: evts }, { data: rpts }]) => {
      setEvents(evts || []);
      setReports(rpts || []);
      setLoading(false);
    });
  }, [hasAccess]);

  const approveEvent = async (event) => {
    await supabase.from('events').update({ is_approved: true }).eq('id', event.id);
    setEvents(prev => prev.filter(e => e.id !== event.id));
    toast.success(lang === 'cs' ? 'Událost schválena' : 'Event approved');
  };

  const deleteEvent = async () => {
    if (!deleteConfirm) return;
    await supabase.from('events').delete().eq('id', deleteConfirm.id);
    setEvents(prev => prev.filter(e => e.id !== deleteConfirm.id));
    // Also remove from reports
    setReports(prev => prev.filter(r => r.target_id !== deleteConfirm.id));
    setDeleteConfirm(null);
    toast.success(lang === 'cs' ? 'Událost smazána' : 'Event deleted');
  };

  const suspendEvent = async () => {
    if (!suspendConfirm) return;
    await supabase.from('events').update({ is_approved: false, is_suspended: true }).eq('id', suspendConfirm.id);
    // Notify organizer
    const { data: orgProfile } = await supabase.from('user_profiles').select('user_id').eq('user_email', suspendConfirm.organizer_email).maybeSingle();
    if (orgProfile) {
      await supabase.from('notifications').insert({
        user_id: orgProfile.user_id, user_email: suspendConfirm.organizer_email,
        type: 'event_updated',
        title: `⚠️ ${lang === 'cs' ? 'Tvá událost byla pozastavena' : 'Your event was suspended'}: ${suspendConfirm.title}`,
        body: lang === 'cs' ? 'Moderátor pozastavil tvou událost. Uprav ji a odešli znovu ke schválení.' : 'A moderator suspended your event. Please edit it and resubmit for approval.',
        event_id: suspendConfirm.id, is_read: false,
      });
    }
    setEvents(prev => prev.filter(e => e.id !== suspendConfirm.id));
    setReports(prev => prev.map(r => r.target_id === suspendConfirm.id ? { ...r, status: 'suspended' } : r));
    setSuspendConfirm(null);
    toast.success(lang === 'cs' ? 'Událost pozastavena' : 'Event suspended');
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

  const resolveReport = async (report) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
    setReports(prev => prev.filter(r => r.id !== report.id));
  };

  if (!hasAccess) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Shield className="w-12 h-12 text-muted-foreground mb-3"/>
      <h2 className="font-grotesk font-bold text-xl mb-1">{tr.accessDenied}</h2>
      <p className="text-sm text-muted-foreground">{tr.accessDeniedHint}</p>
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

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card rounded-2xl border border-border/60 p-4 text-center"><p className="text-2xl font-bold">{events.length}</p><p className="text-xs text-muted-foreground mt-1">{lang === 'cs' ? 'Čeká na schválení' : 'Pending events'}</p></div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 text-center"><p className="text-2xl font-bold">{reports.length}</p><p className="text-xs text-muted-foreground mt-1">{lang === 'cs' ? 'Otevřené reporty' : 'Open reports'}</p></div>
      </div>

      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-5 w-fit">
        {[
          { key: 'pending', label: `${lang === 'cs' ? 'Čeká' : 'Pending'} (${events.length})` },
          { key: 'reports', label: `${lang === 'cs' ? 'Reporty' : 'Reports'} (${reports.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t.key ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
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
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-sm">{e.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{getCategoryLabel(e.category, lang)} · {e.location}</p>
                  <p className="text-xs text-muted-foreground">{e.organizer_email} · {format(new Date(e.created_at), 'MMM d HH:mm')}</p>
                </div>
              </div>
              {e.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{e.description}</p>}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => approveEvent(e)} className="rounded-xl gap-1 bg-mint text-emerald-700 hover:bg-emerald-100 border-0 h-8">
                  <CheckCircle className="w-3 h-3"/>{lang === 'cs' ? 'Schválit' : 'Approve'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditEvent(e)} className="rounded-xl gap-1 h-8">
                  <Pencil className="w-3 h-3"/>{lang === 'cs' ? 'Upravit' : 'Edit'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSuspendConfirm(e)} className="rounded-xl gap-1 h-8 border-orange-200 text-orange-600 hover:bg-orange-50">
                  <PauseCircle className="w-3 h-3"/>{lang === 'cs' ? 'Pozastavit' : 'Suspend'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSendDM({ email: e.organizer_email, name: e.organizer_name || e.organizer_email, event: e })} className="rounded-xl gap-1 h-8">
                  💬 {lang === 'cs' ? 'Napsat' : 'Message'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(e)} className="rounded-xl gap-1 h-8">
                  <Trash2 className="w-3 h-3"/>{lang === 'cs' ? 'Smazat' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-center py-10"><CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2"/><p className="text-sm text-muted-foreground">{lang === 'cs' ? 'Vše zkontrolováno' : 'All reviewed'}</p></div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-card rounded-2xl border border-border/60 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Flag className="w-3 h-3 text-red-500"/>
                    <span className="text-xs font-semibold text-red-600 capitalize">{r.target_type}</span>
                    <span className="text-xs text-muted-foreground">· {format(new Date(r.created_at), 'MMM d HH:mm')}</span>
                  </div>
                  <p className="text-sm font-medium">{r.reason}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">by {r.reporter_email}</p>
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
                  <Button size="sm" variant="outline" onClick={() => { setSuspendConfirm({ id: r.target_id, title: r.reason }); resolveReport(r); }} className="rounded-xl gap-1 h-8 border-orange-200 text-orange-600 hover:bg-orange-50">
                    <PauseCircle className="w-3 h-3"/>{lang === 'cs' ? 'Pozastavit' : 'Suspend'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setDeleteConfirm({ id: r.target_id, title: r.reason }); resolveReport(r); }} className="rounded-xl gap-1 h-8">
                    <Trash2 className="w-3 h-3"/>
                  </Button>
                </>)}
                {r.target_type === 'user' && (
                  <Button size="sm" variant="destructive" onClick={() => setBanConfirm(r)} className="rounded-xl gap-1 h-8">
                    <UserX className="w-3 h-3"/>{lang === 'cs' ? 'Zablokovat' : 'Ban user'}
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
      )}

      {sendDM && <SendDMModal open={!!sendDM} onClose={() => setSendDM(null)} toEmail={sendDM.email} toName={sendDM.name} fromUser={user} fromProfile={profile} event={sendDM.event}/>}
      {editEvent && <EditEventModal event={editEvent} open={!!editEvent} onClose={() => setEditEvent(null)} onSaved={updated => { setEditEvent(null); toast.success(lang === 'cs' ? 'Událost upravena' : 'Event updated'); }}/>}
      <ConfirmDialog open={!!deleteConfirm} onConfirm={deleteEvent} onCancel={() => setDeleteConfirm(null)} title={lang === 'cs' ? 'Smazat událost?' : 'Delete event?'} description={lang === 'cs' ? 'Tato akce je nevratná.' : 'This action cannot be undone.'} confirmLabel={lang === 'cs' ? 'Smazat' : 'Delete'} destructive/>
      <ConfirmDialog open={!!suspendConfirm} onConfirm={suspendEvent} onCancel={() => setSuspendConfirm(null)} title={lang === 'cs' ? 'Pozastavit událost?' : 'Suspend event?'} description={lang === 'cs' ? 'Událost bude skryta z feedu dokud autor neudělá změny.' : 'Event will be hidden until the organizer makes changes.'} confirmLabel={lang === 'cs' ? 'Pozastavit' : 'Suspend'}/>
      <ConfirmDialog open={!!banConfirm} onConfirm={banUser} onCancel={() => setBanConfirm(null)} title={lang === 'cs' ? 'Zablokovat uživatele?' : 'Ban user?'} description={lang === 'cs' ? `Uživatel ${banConfirm?.reporter_email} bude zablokován.` : `User ${banConfirm?.reporter_email} will be banned.`} confirmLabel={lang === 'cs' ? 'Zablokovat' : 'Ban'} destructive/>
    </div>
  );
}
