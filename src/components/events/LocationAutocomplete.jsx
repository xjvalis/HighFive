import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";
import { searchPlaces } from "@/lib/geocoding";

export default function LocationAutocomplete({ value, onChange, placeholder, className }) {
  const { lang } = useContext(LanguageContext);
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (value !== query) setQuery(value || "");
  }, [value]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange({ location: val, latitude: null, longitude: null });

    clearTimeout(debounceRef.current);
    if (val.length < 2) { setSuggestions([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchPlaces(val, { lang: lang === 'cs' ? 'cs' : 'en', limit: 8 });
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (item) => {
    const label = item.sublabel ? `${item.label}, ${item.sublabel}` : item.label;
    setQuery(label);
    onChange({ location: label, latitude: item.lat, longitude: item.lng });
    setOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery('');
    onChange({ location: '', latitude: null, longitude: null });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder || (lang === 'cs' ? 'Hledej místo, park, ulici...' : 'Search place, park, street...')}
          className="pl-8 pr-8 rounded-xl"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {query && !loading && (
            <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-full max-h-64 overflow-y-auto">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="flex items-start gap-2.5 w-full px-4 py-2.5 text-left hover:bg-secondary transition-colors border-b border-border/40 last:border-0"
            >
              <span className="text-base flex-shrink-0 mt-0.5">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                {item.sublabel && <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
