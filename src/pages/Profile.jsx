import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useT } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { LogOut, Check, BadgeCheck, Bell, Camera, Loader2, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EventCard from '@/components/events/EventCard';
import EmptyState from '@/components/ui/EmptyState';
import PremiumModal from '@/components/premium/PremiumModal';
import BadgesSection from '@/components/profile/BadgesSection';
import { SvIcon } from '@/components/icons/SvIcon';
import { svPageTitle, svCard, svField, svLabel, svMeta, svSectionLabel } from '@/lib/svStyles';

const chip = { display: 'inline-flex', alignItems: 'center', gap: 4, font: "500 10.5px 'Outfit', sans-serif", padding: '3px 9px', borderRadius: 'var(--sv-r-pill)', background: 'var(--sv-surface-muted)', color: 'var(--sv-ink-soft)' };
const ghostBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--sv-surface-muted)', color: 'var(--sv-ink-soft)', borderRadius: 'var(--sv-r-pill)', padding: '7px 14px', font: "500 12px 'Outfit', sans-serif" };
const actionBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', borderRadius: 'var(--sv-r-pill)', padding: '7px 14px', font: "500 12px 'Outfit', sans-serif" };

function ReliabilityBadge({ score, noshowCount, lang }) {
  if (score === null || score === undefined || noshowCount === 0) {
    return <span style={chip}>{lang === 'cs' ? 'Nováček' : 'New'}</span>;
  }
  if (score >= 80) return <span style={chip}><SvIcon name="star" size={9}/>{lang === 'cs' ? 'Spolehlivý' : 'Reliable'}</span>;
  if (score >= 40) return <span style={chip}>{lang === 'cs' ? 'Občas chybí' : 'Sometimes absent'}</span>;
  return <span style={{ ...chip, background: 'transparent', color: '#A9564C' }}>{lang === 'cs' ? 'Často chybí' : 'Often absent'}</span>;
}

export default function Profile() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user, profile, updateProfile, loading: userLoading } = useCurrentUser();
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

  if (userLoading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sv-hairline)', borderTopColor: 'var(--sv-brand-purple)' }}/></div>;
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
    <div className="max-w-2xl mx-auto space-y-4 pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Main profile card */}
      <div style={{ ...svCard, padding: 22 }}>
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <label className="relative cursor-pointer group w-14 h-14 flex-shrink-0">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-14 h-14 object-cover" style={{ borderRadius: 14 }}/>
                : <div className="w-14 h-14 flex items-center justify-center" style={{ borderRadius: 14, background: '#F0EAFC', color: 'var(--sv-brand-purple)', font: "500 22px 'Outfit', sans-serif" }}>{user.email?.[0]?.toUpperCase() || '?'}</div>}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderRadius: 14, background: 'rgba(58,52,63,0.5)' }}>
                {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin"/> : <Camera className="w-5 h-5 text-white"/>}
              </div>
            </label>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 style={{ ...svPageTitle, fontSize: 16 }}>{profile?.display_name || user.email}</h1>
                {profile?.is_verified && <BadgeCheck className="w-4 h-4" style={{ color: 'var(--sv-brand-purple)' }}/>}
                {profile?.is_premium && <span style={chip}>Premium</span>}
                <ReliabilityBadge score={profile?.reliability_score} noshowCount={profile?.noshow_count || 0} lang={lang}/>
              </div>
              <p style={{ ...svMeta, marginTop: 2 }}>{user.email}</p>
              <p style={{ ...svMeta, marginTop: 4 }}>{profile?.joined_events?.length || 0} {tr.eventsAttended} · {myEvents.length} {tr.eventsCreated}</p>
              {!profile?.is_premium && (
                <div style={{ ...svMeta, background: 'var(--sv-surface-muted)', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>
                  {lang === 'cs' ? 'Plán' : 'Plan'}: <strong style={{ color: 'var(--sv-ink-soft)' }}>{profile?.subscription_plan || 'free'}</strong> · {lang === 'cs' ? 'Přihlášení' : 'Joins'}: <strong style={{ color: 'var(--sv-ink-soft)' }}>{profile?.monthly_join_count || 0}/3</strong> · {lang === 'cs' ? 'Vytvořené' : 'Created'}: <strong style={{ color: 'var(--sv-ink-soft)' }}>{profile?.monthly_create_count || 0}/1</strong>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {editing
              ? <button onClick={handleSave} disabled={saving} style={{ ...actionBtn, opacity: saving ? 0.6 : 1 }}>{saving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}{tr.save}</button>
              : <button onClick={() => setEditing(true)} style={ghostBtn}>{tr.edit}</button>}
            <button onClick={() => supabase.auth.signOut()} style={{ ...ghostBtn, padding: '7px 9px' }} title={tr.logout}><LogOut className="w-3.5 h-3.5"/></button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div><label style={svLabel}>{tr.displayName}</label><Input value={form.display_name || ''} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} style={svField}/></div>
            <div><label style={svLabel}>{tr.bio}</label><Textarea value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="resize-none" style={svField} placeholder={lang === 'cs' ? 'Napiš něco o sobě...' : 'Write something about yourself...'}/></div>
            <div><label style={svLabel}>{tr.location}</label><Input value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={svField} placeholder={lang === 'cs' ? 'Praha, Letná...' : 'Prague, Old Town...'}/></div>
            <div className="flex gap-3">
              <div className="flex-1"><label style={svLabel}>{tr.age}</label><Input type="number" min="13" max="120" value={form.age || ''} onChange={e => setForm(f => ({ ...f, age: e.target.value ? Number(e.target.value) : '' }))} style={svField} placeholder="28"/></div>
              <div className="flex-1"><label style={svLabel}>{tr.gender}</label>
                <select value={form.gender || ''} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3" style={{ ...svField, height: 36 }}>
                  <option value="">{tr.genderPlaceholder}</option>
                  <option value="Muž">{tr.genderMale}</option>
                  <option value="Žena">{tr.genderFemale}</option>
                  <option value="Jiné">{tr.genderOther}</option>
                </select>
              </div>
            </div>
            <div><label style={svLabel}>{tr.favoriteCategories}</label>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {CATEGORIES.map(cat => {
                  const active = (form.favorite_categories || []).includes(cat.name);
                  return (
                    <button key={cat.name} type="button" onClick={() => toggleCategory(cat.name)} className="flex items-center transition-all"
                      style={{ gap: 5, padding: '6px 12px', borderRadius: 'var(--sv-r-pill)', font: `${active ? 500 : 400} 12px 'Outfit', sans-serif`, background: active ? cat.bg : 'var(--sv-surface-muted)', color: active ? cat.ink : 'var(--sv-meta)' }}>
                      <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 12 }}>{cat.emoji}</span>
                      {getCategoryLabel(cat.name, lang)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {profile?.bio && <p style={{ font: "300 13px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', marginBottom: 10 }}>{profile.bio}</p>}
            <div className="flex flex-wrap gap-3 mb-2.5">
              {profile?.location && <p style={svMeta} className="flex items-center gap-1"><SvIcon name="pin" size={11} style={{ color: '#B4AEA6' }}/>{profile.location}</p>}
              {profile?.age && <p style={svMeta}>{profile.age} {tr.yearsOld}</p>}
            </div>
            {profile?.favorite_categories?.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: 5 }}>
                {profile.favorite_categories.map(c => {
                  const cat = CATEGORIES.find(cat => cat.name === c);
                  return cat ? (
                    <span key={c} className="flex items-center" style={{ gap: 4, background: cat.bg, color: cat.ink, borderRadius: 'var(--sv-r-pill)', padding: '3px 9px', font: "400 10.5px 'Outfit', sans-serif" }}>
                      <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 10 }}>{cat.emoji}</span>{getCategoryLabel(c, lang)}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}

        {/* Premium section */}
        {profile?.is_premium ? (
          <div style={{ marginTop: 18, borderRadius: 'var(--sv-r-card)', background: '#F0EAFC', padding: 16 }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ font: "500 13px 'Outfit', sans-serif", color: '#4A3A73' }}>Spoluvíc Premium</span>
              <span style={{ ...chip, background: 'rgba(255,255,255,0.6)', color: '#4A3A73' }}>{profile?.subscription_plan === 'creator' ? 'Creator' : 'Plus'}</span>
            </div>
            <button className="w-full" style={{ ...ghostBtn, background: 'var(--sv-surface)', width: '100%' }} onClick={async () => {
              const { data } = await supabase.functions.invoke('stripe-billing-portal', { body: { return_url: window.location.origin + '/profile' } });
              if (data?.url) window.location.href = data.url;
            }}>{lang === 'cs' ? 'Spravovat předplatné' : 'Manage subscription'}</button>
          </div>
        ) : (
          <div style={{ marginTop: 18, borderRadius: 'var(--sv-r-card)', background: '#F0EAFC', padding: 16, cursor: 'pointer' }} onClick={() => setShowPremium(true)}>
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ font: "500 13px 'Outfit', sans-serif", color: '#4A3A73' }}>Spoluvíc Premium</span>
              <span style={{ font: "300 11px 'Outfit', sans-serif", color: '#5A4A83' }}>{lang === 'cs' ? 'Plus od 100 Kč/měs' : 'Plus from 100 Kč/mo'}</span>
            </div>
            <p style={{ font: "300 11.5px 'Outfit', sans-serif", color: '#5A4A83', marginBottom: 12 }}>{lang === 'cs' ? 'Neomezené eventy, bez limitů.' : 'Unlimited events, no limits.'}</p>
            <button onClick={e => { e.stopPropagation(); setShowPremium(true); }} className="w-full" style={{ ...ghostBtn, background: 'var(--sv-surface)', width: '100%' }}>{tr.viewPlans}</button>
          </div>
        )}

        <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} profile={profile} onUpgrade={u => updateProfile(u)}/>
      </div>

      {/* Badges */}
      <BadgesSection profile={profile} eventsCreated={myEvents.length} eventsJoined={profile?.joined_events?.length || 0}/>

      {/* Email notifications */}
      <div style={{ ...svCard, padding: 18 }}>
        <div className="flex items-center gap-1.5" style={{ marginBottom: 14 }}>
          <Bell className="w-3.5 h-3.5" style={{ color: 'var(--sv-meta)' }}/>
          <span style={svSectionLabel}>{tr.emailNotifications}</span>
        </div>
        <div className="space-y-3.5">
          {[
            { key: 'notify_email_reminders', label: tr.notifyEmailReminders, desc: tr.notifyEmailReminders24h },
            { key: 'notify_email_event_updates', label: tr.notifyEmailUpdates, desc: tr.notifyEmailUpdatesDesc },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div><p style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' }}>{label}</p><p style={svMeta}>{desc}</p></div>
              <button onClick={() => updateProfile({ [key]: !profile?.[key] })} className="relative inline-flex flex-shrink-0 transition-colors" style={{ height: 20, width: 36, borderRadius: 999, background: profile?.[key] ? 'var(--sv-brand-purple)' : 'var(--sv-surface-muted)' }}>
                <span className="pointer-events-none inline-block transform rounded-full bg-white shadow transition" style={{ height: 16, width: 16, marginTop: 2, marginLeft: profile?.[key] ? 18 : 2 }}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Created / Joined events */}
      <div style={svCard}>
        <div className="flex" style={{ gap: 2, padding: 12 }}>
          {['created', 'joined'].map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 transition-all" style={{ padding: '8px 0', borderRadius: 8, font: `${tab === t ? 500 : 400} 12.5px 'Outfit', sans-serif`, background: tab === t ? 'var(--sv-surface-muted)' : 'transparent', color: tab === t ? 'var(--sv-ink)' : 'var(--sv-meta)' }}>
              {t === 'created' ? `${tr.created} (${myEvents.length})` : `${tr.joined} (${joinedEvents.length})`}
            </button>
          ))}
        </div>
        <div style={{ padding: '0 12px 12px' }} className="space-y-2">
          {(tab === 'created' ? myEvents : joinedEvents).map(e => <EventCard key={e.id} event={e}/>)}
          {(tab === 'created' ? myEvents : joinedEvents).length === 0 && <EmptyState title={tr.nothing} />}
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ ...svCard, padding: 18 }}>
        <h3 style={{ font: "500 13px 'Outfit', sans-serif", color: '#A9564C', marginBottom: 4 }}>
          {lang === 'cs' ? 'Nebezpečná zóna' : 'Danger zone'}
        </h3>
        <p style={{ ...svMeta, marginBottom: 12 }}>
          {lang === 'cs' ? 'Smazání účtu je nevratné. Všechna tvoje data budou odstraněna.' : 'Account deletion is irreversible. All your data will be removed.'}
        </p>

        {/* Reliability reset - Premium only, only if has noshows */}
        {(profile?.is_premium || ['plus','creator'].includes(profile?.subscription_plan)) && (profile?.noshow_count || 0) > 0 && (
          <div className="mb-4" style={{ padding: 12, background: 'var(--sv-surface-muted)', borderRadius: 10 }}>
            <p style={{ font: "500 11.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', marginBottom: 4 }}>
              {lang === 'cs' ? `Skóre spolehlivosti: ${profile?.reliability_score ?? 100}/100` : `Reliability score: ${profile?.reliability_score ?? 100}/100`}
            </p>
            <p style={{ ...svMeta, marginBottom: 8 }}>
              {lang === 'cs' ? 'Jako Premium uživatel můžeš požádat o reset.' : 'As a Premium user you can request a reset.'}
            </p>
            <button
              onClick={async () => {
                try {
                  const { data: mods, error: modsError } = await supabase.from('user_profiles').select('user_id,user_email').or('is_admin.eq.true,is_moderator.eq.true');
                  if (modsError) throw modsError;
                  if (!mods?.length) { toast.error(lang === 'cs' ? 'Nepodařilo se najít moderátora.' : 'Could not find a moderator.'); return; }
                  const requesterName = profile?.display_name || user.email;
                  const requestBody = `${requesterName} (${user.email}) ${lang === 'cs' ? 'žádá o reset.' : 'requests a reset.'}`;
                  const title = lang === 'cs' ? 'Žádost o reset spolehlivosti' : 'Reliability reset request';
                  await Promise.all(mods.map(m => supabase.from('notifications').insert({
                    user_id: m.user_id, user_email: m.user_email,
                    type: 'reliability_reset_request',
                    data: { requesterName, requesterEmail: user.email },
                    is_read: false,
                  })));
                  supabase.functions.invoke('notify-admins-email', { body: { subject: title, message: requestBody } }).catch(() => {});
                  toast.success(lang === 'cs' ? 'Žádost odeslána moderátorovi' : 'Request sent to moderator');
                } catch {
                  toast.error(lang === 'cs' ? 'Žádost se nepodařilo odeslat.' : 'Failed to send request.');
                }
              }}
              style={ghostBtn}
            >
              {lang === 'cs' ? 'Požádat o reset' : 'Request reset'}
            </button>
          </div>
        )}

        <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2" style={{ ...ghostBtn, color: '#A9564C' }}>
          <Trash2 className="w-3.5 h-3.5"/>
          {lang === 'cs' ? 'Smazat účet' : 'Delete account'}
        </button>
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

      <p className="text-center" style={{ font: "300 10.5px 'Outfit', sans-serif", color: 'var(--sv-meta)', marginTop: 8, marginBottom: 8 }}>
        <Link to="/terms">{lang === 'cs' ? 'Podmínky používání' : 'Terms of use'}</Link>
        {' · '}
        <Link to="/privacy">{lang === 'cs' ? 'Ochrana osobních údajů' : 'Privacy policy'}</Link>
      </p>
    </div>
  );
}
