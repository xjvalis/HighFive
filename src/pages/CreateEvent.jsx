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

export default function CreateEvent() {
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const tr = useT();
const { user, profile, updateProfile, loading: userLoading } = useCurrentUser();
if (!user && !userLoading) { navigate('/login'); return null; }
const [loading, setLoading] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({ title:'',description:'',category:'',location:'',latitude:null,longitude:null,date:'',max_capacity:'',image_url:'',age_min:'',age_max:'',gender_recommendation:'Everyone' });

  const canCreate = () => {
    if (!profile) return true;
    if (profile.is_premium||['plus','creator'].includes(profile.subscription_plan)) return true;
    const now=new Date(); const reset=profile.monthly_reset_date?new Date(profile.monthly_reset_date):null;
    const isNew=!reset||now.getFullYear()>reset.getFullYear()||now.getMonth()>reset.getMonth();
    return (isNew?0:profile.monthly_create_count||0) < 1;
  };

  const handleImageUpload = async (e) => {
    const file=e.target.files[0]; if (!file) return;
    setUploadingImage(true);
    const ext=file.name.split('.').pop(); const name=`event-images/${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from('event-images').upload(name,file,{upsert:true});
    if (!error) { const {data:{publicUrl}}=supabase.storage.from('event-images').getPublicUrl(name); setForm(f=>({...f,image_url:publicUrl})); }
    setUploadingImage(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); if (!user) return;
    setLoading(true);
    try {
      const eventData = { ...form, max_capacity:form.max_capacity?parseInt(form.max_capacity):null, age_min:form.age_min?parseInt(form.age_min):null, age_max:form.age_max?parseInt(form.age_max):null };
      const {data,error}=await supabase.functions.invoke('create-event',{body:{eventData}});
      if (error||data?.error==='monthly_limit_reached') { setShowPremium(true); return; }
      if (data?.event) navigate(`/event/${data.event.id}`);
    } finally { setLoading(false); }
  };

  if (!canCreate()) return (
    <div className="max-w-lg mx-auto text-center py-16">
      <p className="text-5xl mb-4">🔒</p>
      <h2 className="font-grotesk font-bold text-xl mb-2">{tr.createWeeklyLimitTitle}</h2>
      <p className="text-muted-foreground mb-6">{tr.createWeeklyLimitDesc}</p>
      <Button onClick={()=>setShowPremium(true)} className="rounded-xl gap-2"><Crown className="w-4 h-4"/>{tr.createViewPlans}</Button>
      <PremiumModal open={showPremium} onClose={()=>setShowPremium(false)} profile={profile} onUpgrade={u=>updateProfile(u)}/>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={()=>navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"><ArrowLeft className="w-4 h-4"/>{tr.createBack}</button>
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <h1 className="font-grotesk font-bold text-2xl mb-1">{tr.createTitle}</h1>
        <p className="text-sm text-muted-foreground mb-4">{tr.createSubtitle}</p>
        <PremiumModal open={showPremium} onClose={()=>setShowPremium(false)} profile={profile} onUpgrade={u=>updateProfile(u)}/>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><Label className="text-sm font-medium mb-1.5 block">{tr.createFieldTitle}</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder={tr.createFieldTitlePlaceholder} required className="rounded-xl"/></div>
          <div><Label className="text-sm font-medium mb-2 block">{tr.createFieldCategory}</Label>
            <div className="flex flex-wrap gap-2">{CATEGORIES.map(cat=><button key={cat.name} type="button" onClick={()=>setForm(f=>({...f,category:cat.name}))} className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',form.category===cat.name?cat.color+' border-transparent shadow-sm':'border-border text-muted-foreground hover:bg-secondary')}>{cat.emoji} {getCategoryLabel(cat.name,lang)}</button>)}
            </div>
          </div>
          <div><Label className="text-sm font-medium mb-1.5 block">{tr.createFieldDescription}</Label><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder={tr.createFieldDescriptionPlaceholder} className="rounded-xl resize-none min-h-[100px]"/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-sm font-medium mb-1.5 block">{tr.createFieldLocation}</Label><LocationAutocomplete value={form.location} onChange={({location,latitude,longitude})=>setForm(f=>({...f,location,latitude,longitude}))} placeholder={tr.createFieldLocationPlaceholder}/></div>
            <div><Label className="text-sm font-medium mb-1.5 block">{tr.createFieldDate}</Label><Input type="datetime-local" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required className="rounded-xl"/></div>
          </div>
          <div><Label className="text-sm font-medium mb-1.5 block">{tr.createFieldCapacity}</Label><Input type="number" value={form.max_capacity} onChange={e=>setForm(f=>({...f,max_capacity:e.target.value}))} placeholder={tr.createFieldCapacityPlaceholder} min="2" className="rounded-xl"/></div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{tr.createCoverImage}</Label>
            {form.image_url ? (
              <div className="relative rounded-xl overflow-hidden h-40"><img src={form.image_url} alt="Cover" className="w-full h-full object-cover"/><button type="button" onClick={()=>setForm(f=>({...f,image_url:''}))} className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">{tr.createRemoveImage}</button></div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors">
                {uploadingImage?<Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/>:<><ImagePlus className="w-5 h-5 text-muted-foreground mb-1"/><span className="text-xs text-muted-foreground">{tr.createUploadClick}</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
              </label>
            )}
          </div>
          <Button type="submit" disabled={loading||!form.title||!form.category||!form.location||!form.date} className="w-full rounded-xl py-3 font-semibold text-base gap-2">
            {loading?<Loader2 className="w-4 h-4 animate-spin"/>:'🙌'} {loading?tr.createPosting:tr.createPostBtn}
          </Button>
        </form>
      </div>
    </div>
  );
}
