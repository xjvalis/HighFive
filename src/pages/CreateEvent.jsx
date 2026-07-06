import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ImagePlus, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import PremiumModal from '@/components/premium/PremiumModal';
import LocationAutocomplete from '@/components/events/LocationAutocomplete';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { toast } from 'sonner';

// Required field label — single asterisk, no double
function Req({ children }) {
  return <span className="flex items-center gap-1">{children}<span className="text-red-500 text-sm leading-none">*</span></span>;
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
  const toLocalISO = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

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
    <div className="max-w-lg mx-auto text-center py-16">
      <p className="text-5xl mb-4">🔒</p>
      <h2 className="font-grotesk font-bold text-xl mb-2">{tr.createWeeklyLimitTitle}</h2>
      <p className="text-muted-foreground mb-6">{tr.createWeeklyLimitDesc}</p>
      <Button onClick={() => setShowPremium(true)} className="rounded-xl gap-2"><Crown className="w-4 h-4"/>{tr.createViewPlans}</Button>
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} profile={profile} onUpgrade={u => updateProfile(u)}/>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4"/>{tr.createBack}
      </button>
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <h1 className="font-grotesk font-bold text-2xl mb-1">{tr.createTitle}</h1>
        <p className="text-sm text-muted-foreground mb-1">{tr.createSubtitle}</p>
        <p className="text-xs text-muted-foreground mb-4">{lang === 'cs' ? 'Pole označená * jsou povinná' : 'Fields marked * are required'}</p>
        <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} profile={profile} onUpgrade={u => updateProfile(u)}/>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <Label className="text-sm font-medium mb-1.5 block"><Req>{tr.createFieldTitle}</Req></Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={tr.createFieldTitlePlaceholder} required className="rounded-xl"/>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block"><Req>{tr.createFieldCategory}</Req></Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.name} type="button" onClick={() => setForm(f => ({ ...f, category: cat.name }))}
                  className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all border', form.category === cat.name ? cat.color + ' border-transparent shadow-sm' : 'border-border text-muted-foreground hover:bg-secondary')}>
                  {cat.emoji} {getCategoryLabel(cat.name, lang)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block"><Req>{tr.createFieldDescription}</Req></Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={tr.createFieldDescriptionPlaceholder} required className="rounded-xl resize-none min-h-[100px]"/>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block"><Req>{tr.createFieldLocation}</Req></Label>
            <LocationAutocomplete value={form.location} onChange={({ location, latitude, longitude }) => setForm(f => ({ ...f, location, latitude, longitude }))} placeholder={tr.createFieldLocationPlaceholder}/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block"><Req>{tr.createFieldDate}</Req></Label>
              <DateTimePicker value={form.date} onChange={handleDateChange} placeholder={lang === 'cs' ? 'Datum a čas' : 'Date & time'} minDate={new Date().toISOString()}/>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                {tr.createFieldEndTime || (lang === 'cs' ? 'Konec akce' : 'End time')}
                <span className="text-muted-foreground font-normal text-xs ml-1">(max 24h)</span>
              </Label>
              <DateTimePicker value={form.end_time} onChange={handleEndTimeChange} placeholder={lang === 'cs' ? 'Konec' : 'End time'} minDate={form.date || new Date().toISOString()}/>
              {endTimeError && <p className="text-xs text-red-500 mt-1">{endTimeError}</p>}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block"><Req>{tr.createFieldCapacity}</Req></Label>
            <div className="flex gap-2">
              <Input type="number" value={form.max_capacity === 'unlimited' ? '' : form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} placeholder={lang === 'cs' ? 'Počet lidí' : 'Number of people'} min="2" disabled={form.max_capacity === 'unlimited'} required={form.max_capacity !== 'unlimited'} className="rounded-xl flex-1"/>
              <button type="button" onClick={() => setForm(f => ({ ...f, max_capacity: f.max_capacity === 'unlimited' ? '' : 'unlimited' }))} className={cn('px-3 rounded-xl text-sm font-medium border transition-all flex-shrink-0', form.max_capacity === 'unlimited' ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:bg-secondary')}>
                ∞ {lang === 'cs' ? 'Neomezeno' : 'Unlimited'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">{lang === 'cs' ? 'Min. věk' : 'Min. age'}</Label>
              <Input type="number" min="13" max="100" value={form.age_min || ''} onChange={e => setForm(f => ({ ...f, age_min: e.target.value }))} placeholder="13" className="rounded-xl"/>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">{lang === 'cs' ? 'Max. věk' : 'Max. age'}</Label>
              <Input type="number" min="13" max="120" value={form.age_max || ''} onChange={e => setForm(f => ({ ...f, age_max: e.target.value }))} placeholder="99" className="rounded-xl"/>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">{lang === 'cs' ? 'Pro koho' : 'For whom'}</Label>
              <select value={form.gender_recommendation || 'Everyone'} onChange={e => setForm(f => ({ ...f, gender_recommendation: e.target.value }))} className="w-full h-9 rounded-xl border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="Everyone">{lang === 'cs' ? 'Všichni' : 'Everyone'}</option>
                <option value="Male">{lang === 'cs' ? 'Muži' : 'Men'}</option>
                <option value="Female">{lang === 'cs' ? 'Ženy' : 'Women'}</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">{tr.createCoverImage}</Label>
            {form.image_url ? (
              <div className="relative rounded-xl overflow-hidden h-40">
                <img src={form.image_url} alt="Cover" className="w-full h-full object-cover"/>
                <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">{tr.createRemoveImage}</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors">
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/> : <><ImagePlus className="w-5 h-5 text-muted-foreground mb-1"/><span className="text-xs text-muted-foreground">{tr.createUploadClick}</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
              </label>
            )}
          </div>

          <Button type="submit" disabled={loading || !form.title || !form.category || !form.location || !form.date || !form.description || !!endTimeError} className="w-full rounded-xl py-3 font-semibold text-base gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : '🙌'} {loading ? tr.createPosting : tr.createPostBtn}
          </Button>
        </form>
      </div>
    </div>
  );
}
