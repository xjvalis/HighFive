import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "@/lib/language";
import { supabase } from "@/lib/supabaseClient";
import { CATEGORIES } from "@/lib/categories";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import LocationAutocomplete from "@/components/events/LocationAutocomplete";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from 'sonner';

export default function EditEventModal({ event, open, onClose, onSaved }) {
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const [form, setForm] = useState({
    title: event.title || "",
    description: event.description || "",
    category: event.category || "",
    location: event.location || "",
    latitude: event.latitude || null,
    longitude: event.longitude || null,
    date: event.date ? new Date(event.date).toISOString().slice(0, 16) : "",
    max_capacity: event.max_capacity || "",
    age_min: event.age_min || "",
    age_max: event.age_max || "",
    gender_recommendation: event.gender_recommendation || "Everyone",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
      age_min: form.age_min ? parseInt(form.age_min) : null,
      age_max: form.age_max ? parseInt(form.age_max) : null,
    };
    try {
      const { error } = await supabase.from('events').update(data).eq('id', event.id);
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se uložit změny.' : 'Failed to save changes.'); return; }
      onSaved({ ...event, ...data });
      onClose();
    } catch {
      toast.error(lang === 'cs' ? 'Nepodařilo se uložit změny.' : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirm(false);
    setDeleting(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se smazat událost.' : 'Failed to delete the event.'); return; }
      onClose();
      navigate("/");
    } catch {
      toast.error(lang === 'cs' ? 'Nepodařilo se smazat událost.' : 'Failed to delete the event.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-grotesk">{lang === 'cs' ? 'Upravit událost' : 'Edit event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1 block">{lang === 'cs' ? 'Název *' : 'Title *'}</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="rounded-xl" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">{lang === 'cs' ? 'Kategorie *' : 'Category *'}</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button key={cat.name} type="button" onClick={() => setForm(f => ({ ...f, category: cat.name }))}
                    style={form.category === cat.name ? { background: cat.bg, color: cat.ink } : undefined}
                    className={cn("px-2.5 py-1 rounded-xl text-xs font-medium transition-all border",
                      form.category === cat.name ? "border-transparent shadow-sm" : "border-border text-muted-foreground hover:bg-secondary"
                    )}>
                    {cat.emoji} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">{lang === 'cs' ? 'Popis' : 'Description'}</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl resize-none min-h-[80px]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1 block">📍 {lang === 'cs' ? 'Místo *' : 'Location *'}</Label>
                <LocationAutocomplete
                  value={form.location}
                  onChange={({ location, latitude, longitude }) => setForm(f => ({ ...f, location, latitude, longitude }))}
                  placeholder={lang === 'cs' ? 'Kde?' : 'Where?'}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">🕐 {lang === 'cs' ? 'Datum *' : 'Date *'}</Label>
                <Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="rounded-xl" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">👥 {lang === 'cs' ? 'Max osob' : 'Max people'}</Label>
              <Input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} placeholder={lang === 'cs' ? 'Neomezeno' : 'Unlimited'} min="2" className="rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1 block">{lang === 'cs' ? 'Min věk' : 'Min age'}</Label>
                <Input type="number" value={form.age_min} onChange={e => setForm(f => ({ ...f, age_min: e.target.value }))} className="rounded-xl h-8 text-xs" min="1" max="99" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">{lang === 'cs' ? 'Max věk' : 'Max age'}</Label>
                <Input type="number" value={form.age_max} onChange={e => setForm(f => ({ ...f, age_max: e.target.value }))} className="rounded-xl h-8 text-xs" min="1" max="99" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">{lang === 'cs' ? 'Doporučení pohlaví' : 'Gender recommendation'}</Label>
              <div className="flex gap-2">
                {[
                  { val: "Everyone", label: lang === 'cs' ? 'Všichni' : 'Everyone' },
                  { val: "M", label: lang === 'cs' ? '♂ Muži' : '♂ Men' },
                  { val: "F", label: lang === 'cs' ? '♀ Ženy' : '♀ Women' },
                  { val: "M+F", label: '♂♀ Mix' },
                ].map(opt => (
                  <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, gender_recommendation: opt.val }))}
                    className={cn("flex-1 py-1.5 rounded-xl text-[11px] font-medium border transition-all",
                      form.gender_recommendation === opt.val ? "bg-lavender border-violet-200 text-violet-700" : "border-border text-muted-foreground hover:bg-secondary"
                    )}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">{lang === 'cs' ? 'Zrušit' : 'Cancel'}</Button>
              <Button type="submit" disabled={saving || !form.title || !form.category || !form.location || !form.date} className="flex-1 rounded-xl gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? (lang === 'cs' ? 'Ukládám...' : 'Saving...') : (lang === 'cs' ? 'Uložit změny' : 'Save changes')}
              </Button>
            </div>

            <div className="pt-1 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl gap-2"
                onClick={() => setDeleteConfirm(true)}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? (lang === 'cs' ? 'Mažu...' : 'Deleting...') : (lang === 'cs' ? 'Smazat událost' : 'Delete event')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
        title={lang === 'cs' ? 'Smazat událost?' : 'Delete event?'}
        description={lang === 'cs'
          ? `Opravdu chceš trvale smazat akci „${event.title}"? Tato akce je nevratná.`
          : `Are you sure you want to permanently delete "${event.title}"? This action cannot be undone.`}
        confirmLabel={lang === 'cs' ? 'Smazat' : 'Delete'}
        destructive
      />
    </>
  );
}