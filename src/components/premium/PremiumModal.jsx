import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { X, Check, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";

export default function PremiumModal({ open, onClose, profile, highlightPlan, onUpgrade }) {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const [selected, setSelected] = useState(highlightPlan || "plus");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const PLANS = [
    {
      id: "plus",
      name: "Plus",
      price: 100,
      perks: lang === 'cs'
        ? ["Neomezené přihlašování na eventy", "Neomezené vytváření eventů"]
        : ["Unlimited event joins", "Unlimited event creation"],
    },
    {
      id: "creator",
      name: "Creator",
      price: 200,
      perks: lang === 'cs'
        ? ["Vše z Plus plánu", "Zlatý rámeček avatara v celé aplikaci"]
        : ["Everything in Plus", "Gold avatar frame across the app"],
    },
  ];

  const TABLE_ROWS = lang === 'cs'
    ? [
        { label: "Přihlášení na eventy", free: "3/měsíc", plus: "Neomezeně", creator: "Neomezeně" },
        { label: "Vytváření eventů", free: "1/měsíc", plus: "Neomezeně", creator: "Neomezeně" },
        { label: "Zlatý rámeček avatara", free: false, plus: false, creator: true },
      ]
    : [
        { label: "Event joins", free: "3/month", plus: "Unlimited", creator: "Unlimited" },
        { label: "Event creation", free: "1/month", plus: "Unlimited", creator: "Unlimited" },
        { label: "Gold avatar frame", free: false, plus: false, creator: true },
      ];

  const handleUpgrade = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          plan: selected,
          success_url: window.location.origin + '/profile?premium=success',
          cancel_url: window.location.href,
        }
      });
      if (error) {
        alert(lang === 'cs' ? "Nepodařilo se spustit platbu. Zkus to znovu." : "Could not start payment. Please try again.");
        return;
      }
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      alert(lang === 'cs' ? "Nepodařilo se spustit platbu. Zkus to znovu." : "Could not start payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = PLANS.find(p => p.id === selected);
  const freeNote = lang === 'cs'
    ? "Free plán zůstává plně funkční - 3 přihlášení a 1 vytvořená akce za měsíc. Premium je pro ty, kdo chtějí být aktivnější."
    : "Free plan stays fully functional - 3 joins and 1 event created per month. Premium is for those who want to do more.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div>
            <h2 className="font-grotesk font-semibold text-lg">HighFive Premium</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{lang === 'cs' ? 'Více prostoru pro komunitu' : 'More space for community'}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 pt-4">
          <div className="bg-secondary/50 rounded-xl p-3 text-sm text-muted-foreground">{freeNote}</div>
        </div>

        <div className="px-6 pt-4">
          <div className="rounded-xl border border-border overflow-hidden text-xs">
            <div className="grid grid-cols-4 bg-secondary/40 border-b border-border">
              <div className="p-2.5 col-span-1 text-muted-foreground font-medium">{lang === 'cs' ? 'Funkce' : 'Feature'}</div>
              <div className="p-2.5 text-center text-muted-foreground font-medium border-l border-border">Free</div>
              <div className="p-2.5 text-center text-foreground font-semibold border-l border-border">Plus</div>
              <div className="p-2.5 text-center text-foreground font-semibold border-l border-border">Creator</div>
            </div>
            {TABLE_ROWS.map((row, i) => (
              <div key={i} className={cn("grid grid-cols-4 border-t border-border", i % 2 === 1 && "bg-secondary/20")}>
                <div className="p-2.5 text-foreground/70 col-span-1">{row.label}</div>
                {[row.free, row.plus, row.creator].map((val, j) => (
                  <div key={j} className="p-2.5 border-l border-border flex items-center justify-center">
                    {val === true ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : val === false ? <Minus className="w-3.5 h-3.5 text-muted-foreground/30" /> : <span className="font-medium text-muted-foreground">{val}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pt-4 space-y-2">
          {PLANS.map(plan => (
            <button key={plan.id} onClick={() => setSelected(plan.id)}
              className={cn("w-full rounded-xl border-2 p-4 text-left transition-all", selected === plan.id ? "border-primary bg-lavender/20" : "border-border hover:border-border/80 hover:bg-secondary/30")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0", selected === plan.id ? "border-primary bg-primary" : "border-border")}>
                    {selected === plan.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.perks.join(" · ")}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-grotesk font-bold text-base">{plan.price} Kč</p>
                  <p className="text-xs text-muted-foreground">/{lang === 'cs' ? 'měsíc' : 'month'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          <Button onClick={handleUpgrade} disabled={loading} className="w-full rounded-xl py-6 font-semibold text-base gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 border-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading
              ? (lang === 'cs' ? 'Přesměrovávám...' : 'Redirecting...')
              : `${lang === 'cs' ? 'Přejít na' : 'Go'} ${selectedPlan?.name} - ${selectedPlan?.price} Kč/${lang === 'cs' ? 'měsíc' : 'month'}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">{lang === 'cs' ? 'Zrušení kdykoli · Žádné skryté poplatky' : 'Cancel anytime · No hidden fees'}</p>
        </div>
      </div>
    </div>
  );
}
