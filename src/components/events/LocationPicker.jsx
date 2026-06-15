import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Navigation, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=cs`);
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || null;
  } catch {
    return null;
  }
}

export default function LocationPicker({ userLocation, radius, onLocationChange, onRadiusChange }) {
  const tr = useT();
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [error, setError] = useState("");
  const [showRadius, setShowRadius] = useState(false);
  const [locationLabel, setLocationLabel] = useState(null);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = (query) => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=cs`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { setSuggestions([]); }
    }, 300);
  };

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
    fetchSuggestions(e.target.value);
  };

  const handleSelectSuggestion = (item) => {
    const city = item.address?.city || item.address?.town || item.address?.village || item.address?.county || item.display_name.split(",")[0];
    onLocationChange({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setLocationLabel(city);
    setAddress("");
    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError(tr.geolocationNotSupported);
      return;
    }
    setGeolocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onLocationChange({ lat, lng });
        const city = await reverseGeocode(lat, lng);
        setLocationLabel(city);
        setGeolocating(false);
      },
      () => {
        setError(tr.geolocationFailed);
        setGeolocating(false);
      }
    );
  };

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    setError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, { headers: { 'Accept-Language': 'cs,en' } });
      const data = await res.json();
      setGeocoding(false);
      if (data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        onLocationChange({ lat, lng });
        const city = await reverseGeocode(lat, lng);
        setLocationLabel(city || address.trim());
        setAddress("");
      } else {
        setError(tr.addressNotFound);
      }
    } catch {
      setGeocoding(false);
      setError(tr.addressNotFound);
    }
  };

  const RADIUS_OPTIONS = [5, 10, 20, 50, 100];

  return (
    <div className="bg-card border border-border rounded-xl p-2 space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium text-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>
            {userLocation
              ? (locationLabel || tr.currentLocation)
              : tr.locationNotSet}
          </span>
        </div>
        <button
          onClick={() => setShowRadius(v => !v)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
            showRadius ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"
          )}
        >
          <SlidersHorizontal className="w-3 h-3" />
          {radius} km
        </button>
      </div>

      {/* Radius selector */}
      {showRadius && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{tr.radius}:</span>
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => { onRadiusChange(r); setShowRadius(false); }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                radius === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {r} km
            </button>
          ))}
        </div>
      )}

      {/* Address input with autocomplete */}
      <div className="flex gap-1.5" ref={wrapperRef}>
        <div className="flex-1 relative">
          <Input
            value={address}
            onChange={handleAddressChange}
            onKeyDown={e => e.key === "Enter" && handleGeocode()}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={tr.addressPlaceholder}
            className="h-7 text-xs"
          />
          {showSuggestions && (
            <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((item) => (
                <li
                  key={item.place_id}
                  onMouseDown={() => handleSelectSuggestion(item)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary text-sm"
                >
                  <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="truncate text-xs text-foreground">{item.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGeocode}
          disabled={geocoding || !address.trim()}
          className="h-7 px-2.5 text-xs"
        >
          {geocoding ? <Loader2 className="w-3 h-3 animate-spin" /> : tr.find}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGeolocate}
          disabled={geolocating}
          title={tr.currentLocation}
          className="h-7 px-2"
        >
          {geolocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}