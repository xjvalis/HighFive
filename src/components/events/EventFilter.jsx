import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";

export default function EventFilter({ filters, onChange }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeCount = [filters.date, filters.location, filters.maxPeople, filters.paid !== ""].filter(Boolean).length;
  const update = (key, value) => onChange({ ...filters, [key]: value });
  const clear = () => onChange({ date: "", location: "", maxPeople: "", paid: "" });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-xl border text-[11px] font-medium transition-all",
          open || activeCount > 0
            ? "bg-lavender border-violet-200 text-violet-700"
            : "bg-card border-border text-muted-foreground hover:bg-secondary"
        )}
      >
        <SlidersHorizontal className="w-3 h-3" />
        {tr.filterButton}
        {activeCount > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-card border border-border rounded-2xl shadow-lg z-30 p-4 w-64 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground">{tr.filterTitle}</span>
            <button onClick={clear} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{tr.clearAll}</button>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{tr.filterDate}</label>
            <div className="flex gap-1.5 mb-1.5">
              <button
                onClick={() => update("date", new Date().toISOString().split("T")[0])}
                className={cn("flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all",
                  filters.date === new Date().toISOString().split("T")[0] ? "bg-lavender border-violet-200 text-violet-700" : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
                )}>{tr.filterToday}</button>
              <button
                onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); update("date", d.toISOString().split("T")[0]); }}
                className={cn("flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all",
                  filters.date === (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; })() ? "bg-lavender border-violet-200 text-violet-700" : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
                )}>{tr.filterTomorrow}</button>
            </div>
            <Input type="date" value={filters.date} onChange={e => update("date", e.target.value)} className="h-7 text-xs rounded-xl"/>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{tr.filterLocation}</label>
            <Input placeholder={tr.filterLocationPlaceholder} value={filters.location} onChange={e => update("location", e.target.value)} className="h-7 text-xs rounded-xl"/>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{tr.filterMaxPeople}</label>
            <Input type="number" min={1} placeholder={tr.filterMaxPeoplePlaceholder} value={filters.maxPeople} onChange={e => update("maxPeople", e.target.value)} className="h-7 text-xs rounded-xl"/>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{tr.filterCost}</label>
            <div className="flex gap-1">
              {[{ val: "", label: tr.filterAll }, { val: "free", label: tr.filterFree }, { val: "paid", label: tr.filterPaid }].map(opt => (
                <button key={opt.val} onClick={() => update("paid", opt.val)}
                  className={cn("flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all",
                    filters.paid === opt.val ? "bg-lavender border-violet-200 text-violet-700" : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
                  )}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
