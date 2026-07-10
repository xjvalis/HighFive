import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { LogOut, Check, BadgeCheck, Bell, Camera, Loader2, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EventCard from '@/components/events/EventCard';
import PremiumModal from '@/components/premium/PremiumModal';
import BadgesSection from '@/components/profile/BadgesSection';

function ReliabilityBadge({ score, noshowCount, lang }) {
  if (score === null || score === undefined || noshowCount === 0) {
    return <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">{lang === 'cs' ? 'Nováček' : 'New'}</span>;
  }
  if (score >= 80) return <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ {lang === 'cs' ? 'Spolehlivý' : 'Reliable'}</span>;
  if (score >= 40) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">~ {lang === 'cs' ? 'Občas chybí' : 'Sometimes absent'}</span>;
  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">✕ {lang === 'cs' ? 'Často chybí' : 'Often absent'}</span>;
}

export default function Profile() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user, profile, setProfile, updateProfile, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('created');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from('events').select('*').eq('organizer_email', user.email).order('date', { ascending: false }).limit(20)
      .then(({ data }) => setMyEvents(data || []));
  }, [user?.id]);

  if (userLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-lavender border-t-violet-500 rounded-full animate-spin"/></div>;
  if (!user) { navigate('/login'); return null; }

  const handleSave = async () => {
    setSaving(true);
    await updateProfile(form);
    setSaving(false);
    setEditing(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const name = `avatars/${user.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(name, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(name);
      await updateProfile({ avatar_url: publicUrl });
      setForm(f => ({ ...f, avatar_url: publicUrl }));
    }
    setUploadingAvatar(false);
  };

  const toggleCategory = (name) => {
    const cur = form.favorite_categories || [];
    setForm(f => ({ ...f, favorite_categories: cur.includes(name) ? cur.filter(c => c !== name) : [...cur, name] }));
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await supabase.from('user_profiles').delete().eq('user_id', user.id);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const joinedEvents = myEvents.filter(e => e.participants?.includes(user?.email) && e.organizer_email !== user?.email);

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Main profile card */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer group w-14 h-14 flex-shrink-0">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-14 h-14 rounded-2xl object-cover"/>
                : <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lavender to-sky flex items-center justify-center text-violet-700 text-2xl font-bold">{user.email?.[0]?.toUpperCase() || '?'}</div>}
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin"/> : <Camera className="w-5 h-5 text-white"/>}
              </div>
            </label>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-grotesk font-bold text-xl">{profile?.display_name || user.email}</h1>
                {profile?.is_verified && <BadgeCheck className="w-5 h-5 text-blue-500"/>}
                {profile?.is_premium && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">Premium</span>}
                {/* Reliability badge - always visible */}
                <ReliabilityBadge score={profile?.reliability_score} noshowCount={profile?.noshow_count || 0} lang={lang}/>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">{profile?.joined_events?.length || 0} {tr.eventsAttended} · {myEvents.length} {tr.eventsCreated}</p>
              {!profile?.is_premium && (
                <div className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2 mt-2">
                  Plán: <strong>{profile?.subscription_plan || 'free'}</strong> · Přihlášení: <strong>{profile?.monthly_join_count || 0}/3</strong> · Vytvořené: <strong>{profile?.monthly_create_count || 0}/1</strong>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {editing
              ? <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-xl gap-1.5">{saving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}{tr.save}</Button>
              : <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="rounded-xl">{tr.edit}</Button>}
            <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()} className="rounded-xl" title={tr.logout}><LogOut className="w-4 h-4"/></Button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div><Label className="text-xs font-medium mb-1 block">{tr.displayName}</Label><Input value={form.display_name || ''} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} className="rounded-xl"/></div>
            <div><Label className="text-xs font-medium mb-1 block">{tr.bio}</Label><Textarea value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="rounded-xl resize-none" placeholder="Napiš něco o sobě..."/></div>
            <div><Label className="text-xs font-medium mb-1 block">{tr.location}</Label><Input value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="rounded-xl" placeholder="Praha, Letná..."/></div>
            <div className="flex gap-3">
              <div className="flex-1"><Label className="text-xs font-medium mb-1 block">{tr.age}</Label><Input type="number" min="13" max="120" value={form.age || ''} onChange={e => setForm(f => ({ ...f, age: e.target.value ? Number(e.target.value) : '' }))} className="rounded-xl" placeholder="28"/></div>
              <div className="flex-1"><Label className="text-xs font-medium mb-1 block">{tr.gender}</Label>
                <select value={form.gender || ''} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full h-9 rounded-xl border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">{tr.genderPlaceholder}</option>
                  <option value="Muž">{tr.genderMale}</option>
                  <option value="Žena">{tr.genderFemale}</option>
                  <option value="Jiné">{tr.genderOther}</option>
                </select>
              </div>
            </div>
            <div><Label className="text-xs font-medium mb-1 block">{tr.favoriteCategories}</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.name} type="button" onClick={() => toggleCategory(cat.name)}
                    className={cn('px-2.5 py-1 rounded-lg text-xs font-medium transition-all border', (form.favorite_categories || []).includes(cat.name) ? cat.color + ' border-transparent' : 'border-border text-muted-foreground hover:bg-secondary')}>
                    {cat.emoji} {getCategoryLabel(cat.name, lang)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {profile?.bio && <p className="text-sm text-foreground/80 mb-3">{profile.bio}</p>}
            <div className="flex flex-wrap gap-3 mb-3">
              {profile?.location && <p className="text-xs text-muted-foreground">📍 {profile.location}</p>}
              {profile?.age && <p className="text-xs text-muted-foreground">🎂 {profile.age} {tr.yearsOld}</p>}
            </div>
            {profile?.favorite_categories?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.favorite_categories.map(c => {
                  const cat = CATEGORIES.find(cat => cat.name === c);
                  return cat ? <span key={c} className={cn('px-2 py-0.5 rounded-lg text-xs font-medium', cat.color)}>{cat.emoji} {getCategoryLabel(c, lang)}</span> : null;
                })}
              </div>
            )}
          </div>
        )}

        {/* Premium section */}
        {profile?.is_premium ? (
          <div className="mt-5 rounded-2xl border border-violet-200/60 bg-violet-50/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-grotesk font-semibold">HighFive Premium</span>
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">{profile?.subscription_plan === 'creator' ? 'Creator' : 'Plus'}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl w-full" onClick={async () => {
              const { data } = await supabase.functions.invoke('stripe-billing-portal', { body: { return_url: window.location.origin + '/profile' } });
              if (data?.url) window.location.href = data.url;
            }}>Spravovat předplatné</Button>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl overflow-hidden border border-violet-200/60 bg-violet-50/50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowPremium(true)}>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2"><span className="font-grotesk font-semibold">HighFive Premium</span><span className="text-xs text-muted-foreground">Plus od 100 Kč/měs</span></div>
              <p className="text-sm text-muted-foreground mb-4">Neomezené eventy, bez limitů.</p>
              <Button onClick={e => { e.stopPropagation(); setShowPremium(true); }} className="w-full rounded-xl">{tr.viewPlans}</Button>
            </div>
          </div>
        )}

        <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} profile={profile} onUpgrade={u => updateProfile(u)}/>
      </div>

      {/* Badges */}
      <BadgesSection profile={profile} eventsCreated={myEvents.length} eventsJoined={profile?.joined_events?.length || 0}/>

      {/* Email notifications */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4"><Bell className="w-4 h-4 text-primary"/><h2 className="font-grotesk font-semibold text-base">{tr.emailNotifications}</h2></div>
        <div className="space-y-3">
          {[
            { key: 'notify_email_reminders', label: tr.notifyEmailReminders, desc: tr.notifyEmailReminders24h },
            { key: 'notify_email_event_updates', label: tr.notifyEmailUpdates, desc: tr.notifyEmailUpdatesDesc },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
              <button onClick={() => updateProfile({ [key]: !profile?.[key] })} className={cn('relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', profile?.[key] ? 'bg-primary' : 'bg-secondary')}>
                <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition', profile?.[key] ? 'translate-x-4' : 'translate-x-0')}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Created / Joined events */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm">
        <div className="flex border-b border-border/60">
          {['created', 'joined'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn('flex-1 py-3 text-sm font-medium transition-colors', tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>
              {t === 'created' ? `${tr.created} (${myEvents.length})` : `${tr.joined} (${joinedEvents.length})`}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          {(tab === 'created' ? myEvents : joinedEvents).map(e => <EventCard key={e.id} event={e}/>)}
          {(tab === 'created' ? myEvents : joinedEvents).length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{tr.nothing}</p>}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-card rounded-2xl border border-red-100 shadow-sm p-5">
        <h3 className="font-grotesk font-semibold text-sm text-red-600 mb-1">
          {lang === 'cs' ? 'Nebezpečná zóna' : 'Danger zone'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {lang === 'cs' ? 'Smazání účtu je nevratné. Všechna tvoje data budou odstraněna.' : 'Account deletion is irreversible. All your data will be removed.'}
        </p>

        {/* Reliability reset - Premium only, only if has noshows */}
        {(profile?.is_premium || ['plus','creator'].includes(profile?.subscription_plan)) && (profile?.noshow_count || 0) > 0 && (
          <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs font-medium text-amber-800 mb-1">
              {lang === 'cs' ? `Skóre spolehlivosti: ${profile?.reliability_score ?? 100}/100` : `Reliability score: ${profile?.reliability_score ?? 100}/100`}
            </p>
            <p className="text-xs text-amber-700 mb-2">
              {lang === 'cs' ? 'Jako Premium uživatel můžeš požádat o reset.' : 'As a Premium user you can request a reset.'}
            </p>
            <button
              onClick={async () => {
                try {
                  const { data: mods, error: modsError } = await supabase.from('user_profiles').select('user_id,user_email').or('is_admin.eq.true,is_moderator.eq.true');
                  if (modsError) throw modsError;
                  if (!mods?.length) { toast.error(lang === 'cs' ? 'Nepodařilo se najít moderátora.' : 'Could not find a moderator.'); return; }
                  const requestBody = `${profile?.display_name || user.email} (${user.email}) ${lang === 'cs' ? 'žádá o reset.' : 'requests a reset.'}`;
                  const title = `🔄 ${lang === 'cs' ? 'Žádost o reset spolehlivosti' : 'Reliability reset request'}`;
                  await Promise.all(mods.map(m => supabase.from('notifications').insert({
                    user_id: m.user_id, user_email: m.user_email,
                    type: 'reliability_reset_request',
                    title, body: requestBody, is_read: false,
                  })));
                  supabase.functions.invoke('notify-admins-email', { body: { subject: title, message: requestBody } }).catch(() => {});
                  toast.success(lang === 'cs' ? 'Žádost odeslána moderátorovi' : 'Request sent to moderator');
                } catch {
                  toast.error(lang === 'cs' ? 'Žádost se nepodařilo odeslat.' : 'Failed to send request.');
                }
              }}
              className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-amber-600 transition-colors"
            >
              {lang === 'cs' ? 'Požádat o reset' : 'Request reset'}
            </button>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-2">
          <Trash2 className="w-3.5 h-3.5"/>
          {lang === 'cs' ? 'Smazat účet' : 'Delete account'}
        </Button>
        <ConfirmDialog
          open={showDeleteConfirm}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
          title={lang === 'cs' ? 'Smazat účet?' : 'Delete account?'}
          description={lang === 'cs' ? 'Tato akce je nevratná. Všechna tvá data, eventy a zprávy budou trvale odstraněny.' : 'This action is irreversible. All your data, events and messages will be permanently deleted.'}
          confirmLabel={deleting ? '...' : (lang === 'cs' ? 'Smazat účet' : 'Delete account')}
          destructive
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-6">
        <Link to="/terms" className="hover:underline">{lang === 'cs' ? 'Podmínky používání' : 'Terms of use'}</Link>
        {' · '}
        <Link to="/privacy" className="hover:underline">{lang === 'cs' ? 'Ochrana osobních údajů' : 'Privacy policy'}</Link>
      </p>
    </div>
  );
}
