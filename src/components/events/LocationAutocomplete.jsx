import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LocationAutocomplete({ value, onChange, placeholder = "Where?", className }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange({ location: val, latitude: null, longitude: null });

    clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(val)}`,
        { headers: { "Accept-Language": "cs,en" } }
      );
      const data = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
      setLoading(false);
    }, 350);
  };

  const formatLocationLabel = (item) => {
    const a = item.address || {};
    // Build a short "City, Country" or "Neighbourhood, City" label
    const city = a.city || a.town || a.village || a.municipality || a.county || a.state || "";
    const country = a.country || "";
    const suburb = a.suburb || a.neighbourhood || a.district || "";
    if (suburb && city) return `${suburb}, ${city}`;
    if (city && country) return `${city}, ${country}`;
    return city || item.display_name;
  };

  const handleSelect = (item) => {
    const label = formatLocationLabel(item);
    setQuery(label);
    setSuggestions([]);
    setOpen(false);
    onChange({
      location: label,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required
          className={cn("rounded-xl pr-8", className)}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
        </div>
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden text-sm">
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onMouseDown={() => handleSelect(item)}
              className="px-3 py-2.5 cursor-pointer hover:bg-secondary truncate flex items-start gap-2"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{item.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}