import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { useT } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ImagePlus, Loader2, Crown } from 'lucide-react';
import { PixelCircle } from '@/components/ui/EmptyState';
import PremiumModal from '@/components/premium/PremiumModal';
import LocationAutocomplete from '@/components/events/LocationAutocomplete';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { toast } from 'sonner';

const fieldStyle = {
  width: '100%', background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)',
  borderRadius: 10, boxShadow: 'none', font: "300 13px 'Outfit', sans-serif", color: 'var(--sv-ink)',
};
const labelStyle = { display: 'block', marginBottom: 6, font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' };
const metaStyle = { font: "300 11px 'Outfit', sans-serif", color: 'var(--sv-meta)' };

// Required field marker — meta gray, not a new accent color (palette is closed)
function Req({ children }) {
  return <span className="flex items-center gap-1">{children}<span style={{ color: 'var(--sv-meta)' }}>*</span></span>;
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const tr = useT();
  const { user, profile, updateProfile, loading: userLoading } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [endTimeError, setEndTimeError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', category: '', location: '',
    latitude: null, longitude: null, date: '', end_time: '',
    max_capacity: '', image_url: '', age_min: '', age_max: '',
    gender_recommendation: 'Everyone'
  });

  useEffect(() => {
    if (!user && !userLoading) navigate('/login');
  }, [user, userLoading]);

  const canCreate = () => {
    if (!profile) return true;
    if (profile.is_premium || ['plus','creator'].includes(profile.subscription_plan)) return true;
    const now = new Date(); const reset = profile.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
    const isNew = !reset || now.getFullYear() > reset.getFullYear() || now.getMonth() > reset.getMonth();
    return (isNew ? 0 : profile.monthly_create_count || 0) < 1;
  };

  const pad = n => String(n).padStart(2, '0');
  const toLocalISO = (date) => {
    const off = -date.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const h = pad(Math.floor(Math.abs(off) / 60));
    const m = pad(Math.abs(off) % 60);
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${h}:${m}`;
  };

  const handleDateChange = (val) => {
    if (!val) { setForm(f => ({ ...f, date: '', end_time: '' })); return; }
    const start = new Date(val);
    setForm(f => {
      // Keep existing end_time if still valid (after new start, within 24h)
      const currentEnd = f.end_time ? new Date(f.end_time) : null;
      const autoEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      let newEnd = autoEnd;
      if (currentEnd && currentEnd > start) {
        const diff = (currentEnd - start) / (1000 * 60 * 60);
        if (diff <= 24) newEnd = currentEnd;
      }
      setEndTimeError('');
      return { ...f, date: val, end_time: toLocalISO(newEnd) };
    });
  };

  const handleEndTimeChange = (val) => {
    setEndTimeError('');
    if (!val) { setForm(f => ({ ...f, end_time: '' })); return; }
    if (form.date) {
      const start = new Date(form.date);
      const end = new Date(val);
      const diffH = (end - start) / (1000 * 60 * 60);
      if (diffH > 24) {
        setEndTimeError(lang === 'cs' ? 'Maximální délka akce je 24 hodin' : 'Maximum event duration is 24 hours');
        return;
      }
      if (diffH < 0) {
        setEndTimeError(lang === 'cs' ? 'Konec musí být po začátku' : 'End time must be after start');
        return;
      }
    }
    setForm(f => ({ ...f, end_time: val }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadingImage(true);
    const ext = file.name.split('.').pop();
    const name = `event-images/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('event-images').upload(name, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(name);
      setForm(f => ({ ...f, image_url: publicUrl }));
    } else {
      toast.error(lang === 'cs' ? 'Nahrání obrázku selhalo.' : 'Image upload failed.');
    }
    setUploadingImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); if (!user || endTimeError) return;
    setLoading(true);
    try {
      const eventData = {
        ...form,
        max_capacity: form.max_capacity === 'unlimited' ? null : (form.max_capacity ? parseInt(form.max_capacity) : null),
        age_min: form.age_min ? parseInt(form.age_min) : null,
        age_max: form.age_max ? parseInt(form.age_max) : null,
        end_time: form.end_time || null,
      };
      const { data, error } = await supabase.functions.invoke('create-event', { body: { eventData } });
      if (data?.error === 'monthly_limit_reached') { setShowPremium(true); return; }
      if (error) { toast.error(lang === 'cs' ? 'Vytvoření události se nezdařilo.' : 'Failed to create event.'); return; }
      if (data?.event) navigate(`/event/${data.event.id}`);
    } catch {
      toast.error(lang === 'cs' ? 'Vytvoření události se nezdařilo.' : 'Failed to create event.');
    } finally { setLoading(false); }
  };

  if (!user && !userLoading) return null;

  if (!canCreate()) return (
    <div className="max-w-lg mx-auto text-center" style={{ padding: '48px 0 12px' }}>
      <div className="flex justify-center mb-3"><PixelCircle size={40} color="var(--sv-empty-dot)" /></div>
      <h2 style={{ font: "500 15px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', marginBottom: 6 }}>{tr.createWeeklyLimitTitle}</h2>
      <p style={{ ...metaStyle, marginBottom: 20 }}>{tr.createWeeklyLimitDesc}</p>
      <button
        onClick={() => setShowPremium(true)}
        className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
        style={{ background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', font: "500 12px 'Outfit', sans-serif", padding: '8px 16px', borderRadius: 'var(--sv-r-pill)' }}
      >
        <Crown className="w-3.5 h-3.5"/>{tr.createViewPlans}
      </button>
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} profile={profile} onUpgrade={u => updateProfile(u)}/>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 transition-colors" style={{ ...metaStyle, fontWeight: 400 }}>
        <ArrowLeft className="w-3.5 h-3.5"/>{tr.createBack}
      </button>
      <div style={{ background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)', borderRadius: 'var(--sv-r-card)', padding: 22 }}>
        <h1 style={{ font: "500 19px 'Outfit', sans-serif", letterSpacing: '-0.03em', color: 'var(--sv-ink)', marginBottom: 4 }}>{tr.createTitle}</h1>
        <p style={{ ...metaStyle, marginBottom: 2 }}>{tr.createSubtitle}</p>
        <p style={{ ...metaStyle, marginBottom: 18 }}>{lang === 'cs' ? 'Pole označená * jsou povinná' : 'Fields marked * are required'}</p>
        <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} profile={profile} onUpgrade={u => updateProfile(u)}/>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label style={labelStyle}><Req>{tr.createFieldTitle}</Req></label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={tr.createFieldTitlePlaceholder} required style={fieldStyle}/>
          </div>

          <div>
            <label style={{ ...labelStyle, marginBottom: 9 }}><Req>{tr.createFieldCategory}</Req></label>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {CATEGORIES.map(cat => {
                const active = form.category === cat.name;
                return (
                  <button
                    key={cat.name} type="button" onClick={() => setForm(f => ({ ...f, category: cat.name }))}
                    className="flex items-center transition-all"
                    style={{
                      gap: 5, padding: '6px 12px', borderRadius: 'var(--sv-r-pill)',
                      font: `${active ? 500 : 400} 12px 'Outfit', sans-serif`,
                      background: active ? cat.bg : 'var(--sv-surface-muted)',
                      color: active ? cat.ink : 'var(--sv-meta)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 12 }}>{cat.emoji}</span>
                    {getCategoryLabel(cat.name, lang)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}><Req>{tr.createFieldDescription}</Req></label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={tr.createFieldDescriptionPlaceholder} required className="resize-none min-h-[100px]" style={fieldStyle}/>
          </div>

          <div>
            <label style={labelStyle}><Req>{tr.createFieldLocation}</Req></label>
            <LocationAutocomplete value={form.location} onChange={({ location, latitude, longitude }) => setForm(f => ({ ...f, location, latitude, longitude }))} placeholder={tr.createFieldLocationPlaceholder}/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}><Req>{tr.createFieldDate}</Req></label>
              <DateTimePicker value={form.date} onChange={handleDateChange} placeholder={lang === 'cs' ? 'Datum a čas' : 'Date & time'} minDate={new Date().toISOString()}/>
            </div>
            <div>
              <label style={labelStyle}>
                {tr.createFieldEndTime || (lang === 'cs' ? 'Konec akce' : 'End time')}
                <span style={{ color: 'var(--sv-meta)', fontWeight: 400, marginLeft: 4 }}>(max 24h)</span>
              </label>
              <DateTimePicker value={form.end_time} onChange={handleEndTimeChange} placeholder={lang === 'cs' ? 'Konec' : 'End time'} minDate={form.date || new Date().toISOString()}/>
              {endTimeError && <p style={{ font: "300 11px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', marginTop: 4 }}>{endTimeError}</p>}
            </div>
          </div>

          <div>
            <label style={labelStyle}><Req>{tr.createFieldCapacity}</Req></label>
            <div className="flex gap-2">
              <Input type="number" value={form.max_capacity === 'unlimited' ? '' : form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} placeholder={lang === 'cs' ? 'Počet lidí' : 'Number of people'} min="2" disabled={form.max_capacity === 'unlimited'} required={form.max_capacity !== 'unlimited'} className="flex-1" style={fieldStyle}/>
              <button
                type="button" onClick={() => setForm(f => ({ ...f, max_capacity: f.max_capacity === 'unlimited' ? '' : 'unlimited' }))}
                className="flex-shrink-0 transition-all"
                style={{
                  padding: '0 14px', borderRadius: 10, font: "500 12px 'Outfit', sans-serif",
                  background: form.max_capacity === 'unlimited' ? 'var(--sv-action-bg)' : 'var(--sv-surface-muted)',
                  color: form.max_capacity === 'unlimited' ? 'var(--sv-action-ink)' : 'var(--sv-meta)',
                }}
              >
                ∞ {lang === 'cs' ? 'Neomezeno' : 'Unlimited'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>{lang === 'cs' ? 'Min. věk' : 'Min. age'}</label>
              <Input type="number" min="13" max="100" value={form.age_min || ''} onChange={e => setForm(f => ({ ...f, age_min: e.target.value }))} placeholder="13" style={fieldStyle}/>
            </div>
            <div>
              <label style={labelStyle}>{lang === 'cs' ? 'Max. věk' : 'Max. age'}</label>
              <Input type="number" min="13" max="120" value={form.age_max || ''} onChange={e => setForm(f => ({ ...f, age_max: e.target.value }))} placeholder="99" style={fieldStyle}/>
            </div>
            <div>
              <label style={labelStyle}>{lang === 'cs' ? 'Pro koho' : 'For whom'}</label>
              <select value={form.gender_recommendation || 'Everyone'} onChange={e => setForm(f => ({ ...f, gender_recommendation: e.target.value }))} className="w-full h-9 px-3" style={{ ...fieldStyle, height: 36 }}>
                <option value="Everyone">{lang === 'cs' ? 'Všichni' : 'Everyone'}</option>
                <option value="Male">{lang === 'cs' ? 'Muži' : 'Men'}</option>
                <option value="Female">{lang === 'cs' ? 'Ženy' : 'Women'}</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{tr.createCoverImage}</label>
            {form.image_url ? (
              <div className="relative overflow-hidden h-40" style={{ borderRadius: 10 }}>
                <img src={form.image_url} alt="Cover" className="w-full h-full object-cover"/>
                <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="absolute top-2 right-2" style={{ background: 'rgba(58,52,63,0.6)', color: '#fff', font: "400 11px 'Outfit', sans-serif", padding: '4px 10px', borderRadius: 'var(--sv-r-pill)' }}>{tr.createRemoveImage}</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 cursor-pointer transition-colors" style={{ border: '1px dashed var(--sv-hairline)', borderRadius: 10, background: 'var(--sv-surface-muted)' }}>
                {uploadingImage
                  ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--sv-meta)' }}/>
                  : <><ImagePlus className="w-4 h-4 mb-1" style={{ color: 'var(--sv-meta)' }}/><span style={metaStyle}>{tr.createUploadClick}</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
              </label>
            )}
          </div>

          <button
            type="submit" disabled={loading || !form.title || !form.category || !form.location || !form.date || !form.description || !!endTimeError}
            className="w-full flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', borderRadius: 'var(--sv-r-pill)', padding: '11px 0', font: "500 13px 'Outfit', sans-serif" }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
            {loading ? tr.createPosting : tr.createPostBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
