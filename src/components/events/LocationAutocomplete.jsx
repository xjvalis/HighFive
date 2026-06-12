import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";

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
        // Use Nominatim with higher detail level
        const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
          q: val,
          format: 'json',
          addressdetails: '1',
          limit: '8',
          'accept-language': lang === 'cs' ? 'cs,en' : 'en,cs',
          countrycodes: '', // no restriction - worldwide
        });
        const res = await fetch(url, { headers: { 'User-Agent': 'HighFive/1.0' } });
        const data = await res.json();
        setSuggestions(data || []);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const formatLabel = (item) => {
    const a = item.address || {};
    // Build a nice label: venue/park/street, city
    const parts = [];
    // Specific place name
    const specific = a.amenity || a.leisure || a.tourism || a.shop || a.building ||
                     a.park || a.natural || a.historic || a.sport;
    if (specific) parts.push(specific);
    // Street
    if (a.road) parts.push(a.road + (a.house_number ? ' ' + a.house_number : ''));
    // Neighborhood / suburb
    if (a.neighbourhood || a.suburb || a.quarter) parts.push(a.neighbourhood || a.suburb || a.quarter);
    // City
    if (a.city || a.town || a.village || a.municipality) {
      parts.push(a.city || a.town || a.village || a.municipality);
    }
    // Country (only if no city)
    if (!a.city && !a.town && !a.village && a.country) parts.push(a.country);

    return parts.length > 0 ? parts.join(', ') : item.display_name;
  };

  const handleSelect = (item) => {
    const label = formatLabel(item);
    setQuery(label);
    onChange({ location: label, latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
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
          {suggestions.map((item, i) => {
            const label = formatLabel(item);
            const type = item.type || item.class || '';
            const typeEmoji = getTypeEmoji(item);
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(item)}
                className="flex items-start gap-2.5 w-full px-4 py-2.5 text-left hover:bg-secondary transition-colors border-b border-border/40 last:border-0"
              >
                <span className="text-base flex-shrink-0 mt-0.5">{typeEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{label}</p>
                  {item.address?.country && (
                    <p className="text-xs text-muted-foreground truncate">{item.address.country}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTypeEmoji(item) {
  const a = item.address || {};
  const cls = item.class || '';
  const type = item.type || '';
  if (a.amenity || cls === 'amenity') {
    if (type === 'restaurant' || type === 'cafe' || type === 'bar') return '🍽️';
    if (type === 'pub') return '🍺';
    if (type === 'park') return '🌳';
    if (type === 'sports_centre' || type === 'gym') return '🏋️';
    if (type === 'library') return '📚';
    if (type === 'theatre' || type === 'cinema') return '🎭';
    if (type === 'hospital' || type === 'clinic') return '🏥';
    return '📍';
  }
  if (cls === 'leisure' || type === 'park' || type === 'garden') return '🌳';
  if (cls === 'natural') return '🏞️';
  if (cls === 'tourism') return '🏛️';
  if (cls === 'shop') return '🛍️';
  if (cls === 'highway' || cls === 'place') return '📍';
  if (a.city || a.town || a.village) return '🏙️';
  return '📍';
}
