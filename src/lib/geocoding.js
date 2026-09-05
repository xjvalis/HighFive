// Shared geocoding helpers.
//
// Uses the Mapy.cz REST API (Seznam.cz) when VITE_MAPY_CZ_API_KEY is set —
// much better address/POI coverage for Czechia than global providers — and
// otherwise falls back to Nominatim/OSM, which needs no key. The fallback
// matters: without it a missing/invalid key silently returns zero results,
// which looks exactly like "the location field is broken". Mapy.cz failures
// also fall through to Nominatim rather than returning nothing.
//
// API reference: https://api.mapy.cz/openapi (suggest / geocode / rgeocode).

const MAPY_KEY = import.meta.env.VITE_MAPY_CZ_API_KEY;
const MAPY_BASE = 'https://api.mapy.cz/v1';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export const usingMapyCz = !!MAPY_KEY;

/* --------------------------------- Mapy.cz --------------------------------- */

function mapyEmoji(item) {
  const type = item.type || '';
  const text = `${item.name || ''} ${item.location || ''}`.toLowerCase();
  if (type.startsWith('poi')) {
    if (/restaurace|café|kavárna|cafe|bistro/.test(text)) return '🍽️';
    if (/bar|pivnice|hospoda|pub/.test(text)) return '🍺';
    if (/park|zahrada|garden/.test(text)) return '🌳';
    if (/fitness|posilovna|gym|sport/.test(text)) return '🏋️';
    if (/knihovna|library/.test(text)) return '📚';
    if (/divadlo|kino|theatre|cinema/.test(text)) return '🎭';
    if (/nemocnice|klinika|hospital|clinic/.test(text)) return '🏥';
    if (/muzeum|museum|galerie/.test(text)) return '🏛️';
    if (/hotel|hostel/.test(text)) return '🏨';
    if (/obchod|shop|store/.test(text)) return '🛍️';
    return '📍';
  }
  if (type === 'regional.address' || type === 'regional.street') return '📍';
  if (type.startsWith('regional')) return '🏙️';
  return '📍';
}

function fromMapy(item) {
  const pos = item.position || {};
  return {
    id: `mapy-${item.type}-${pos.lon}-${pos.lat}`,
    label: item.name,
    sublabel: item.location || '',
    lat: pos.lat, lng: pos.lon,
    emoji: mapyEmoji(item),
  };
}

/* -------------------------------- Nominatim -------------------------------- */

function nominatimEmoji(item) {
  const a = item.address || {};
  const cls = item.class || '';
  const type = item.type || '';
  if (['restaurant', 'cafe', 'bar'].includes(type)) return '🍽️';
  if (type === 'pub') return '🍺';
  if (cls === 'leisure' || type === 'park' || type === 'garden') return '🌳';
  if (type === 'sports_centre' || type === 'gym') return '🏋️';
  if (type === 'library') return '📚';
  if (['theatre', 'cinema'].includes(type)) return '🎭';
  if (cls === 'natural') return '🏞️';
  if (cls === 'tourism') return '🏛️';
  if (cls === 'shop') return '🛍️';
  if (a.city || a.town || a.village) return '🏙️';
  return '📍';
}

function fromNominatim(item) {
  const a = item.address || {};
  const specific = a.amenity || a.leisure || a.tourism || a.shop || a.building ||
                   a.historic || a.sport;
  const street = a.road ? a.road + (a.house_number ? ' ' + a.house_number : '') : null;
  const city = a.city || a.town || a.village || a.municipality;
  const area = a.neighbourhood || a.suburb || a.quarter;

  const label = specific || street || city || item.display_name.split(',')[0];
  const sublabel = [area, city !== label ? city : null, a.country]
    .filter(Boolean).filter(v => v !== label).join(', ');

  return {
    id: `osm-${item.place_id}`,
    label,
    sublabel,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    emoji: nominatimEmoji(item),
  };
}

async function nominatimSearch(query, lang, limit) {
  const params = new URLSearchParams({
    q: query, format: 'json', addressdetails: '1',
    limit: String(limit), 'accept-language': lang === 'cs' ? 'cs,en' : 'en,cs',
  });
  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return (data || []).map(fromNominatim).filter(r => r.lat && r.lng);
}

/* ---------------------------------- Public --------------------------------- */

export async function searchPlaces(query, { lang = 'cs', limit = 8 } = {}) {
  if (!query?.trim()) return [];

  if (MAPY_KEY) {
    try {
      const params = new URLSearchParams({
        query, apikey: MAPY_KEY, lang, limit: String(limit),
      });
      const res = await fetch(`${MAPY_BASE}/suggest?${params}`);
      if (!res.ok) throw new Error(`Mapy.cz ${res.status}`);
      const data = await res.json();
      const results = (data.items || []).map(fromMapy).filter(r => r.lat && r.lng);
      if (results.length) return results;
    } catch (err) {
      console.warn('[geocoding] Mapy.cz failed, falling back to Nominatim:', err);
    }
  }

  try {
    return await nominatimSearch(query, lang, limit);
  } catch (err) {
    console.warn('[geocoding] place search failed:', err);
    return [];
  }
}

export async function reverseGeocodeCity(lat, lng, lang = 'cs') {
  if (MAPY_KEY) {
    try {
      const params = new URLSearchParams({
        lon: String(lng), lat: String(lat), apikey: MAPY_KEY, lang,
      });
      const res = await fetch(`${MAPY_BASE}/rgeocode?${params}`);
      if (!res.ok) throw new Error(`Mapy.cz ${res.status}`);
      const data = await res.json();
      const item = data.items?.[0];
      // The result item itself is usually the address/street; the city name
      // lives inside regionalStructure, not as a sibling top-level item.
      const municipality = item?.regionalStructure?.find(r => r.type === 'regional.municipality');
      const name = municipality?.name || item?.name;
      if (name) return name;
    } catch (err) {
      console.warn('[geocoding] Mapy.cz reverse failed, falling back:', err);
    }
  }

  try {
    const params = new URLSearchParams({
      lat: String(lat), lon: String(lng), format: 'json',
      'accept-language': lang === 'cs' ? 'cs,en' : 'en,cs',
    });
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`);
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const a = (await res.json()).address || {};
    return a.city || a.town || a.village || a.county || null;
  } catch (err) {
    console.warn('[geocoding] reverse geocoding failed:', err);
    return null;
  }
}
