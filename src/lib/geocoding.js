// Shared geocoding helpers.
//
// Uses Mapbox when VITE_MAPBOX_TOKEN is set (better POI coverage in CZ, proper
// rate limits) and otherwise falls back to Nominatim/OSM, which needs no key.
// The fallback matters: without it a missing token silently returns zero
// results, which looks exactly like "the location field is broken".
// Mapbox failures also fall through to Nominatim rather than returning nothing.

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_BASE = 'https://api.mapbox.com/search/geocode/v6';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export const usingMapbox = !!MAPBOX_TOKEN;

/* ---------------------------------- Mapbox --------------------------------- */

const POI_EMOJI = {
  cafe: '🍽️', restaurant: '🍽️', bar: '🍺', pub: '🍺', park: '🌳', garden: '🌳',
  sports_club: '🏋️', gym: '🏋️', library: '📚', theatre: '🎭', cinema: '🎭',
  hospital: '🏥', clinic: '🏥', museum: '🏛️', hotel: '🏨', shop: '🛍️',
};

function mapboxEmoji(feature) {
  for (const cat of feature.properties?.poi_category || []) {
    if (POI_EMOJI[cat]) return POI_EMOJI[cat];
  }
  const type = feature.properties?.feature_type;
  if (type === 'poi' || type === 'address' || type === 'street') return '📍';
  return '🏙️';
}

function fromMapbox(feature) {
  const p = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [];
  return {
    id: p.mapbox_id,
    label: p.name_preferred || p.name || p.full_address || p.place_formatted,
    sublabel: p.place_formatted || '',
    lat, lng,
    emoji: mapboxEmoji(feature),
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

  if (MAPBOX_TOKEN) {
    try {
      const params = new URLSearchParams({
        q: query, access_token: MAPBOX_TOKEN, language: lang, limit: String(limit),
        types: 'poi,address,street,place,locality,neighborhood',
      });
      const res = await fetch(`${MAPBOX_BASE}/forward?${params}`);
      if (!res.ok) throw new Error(`Mapbox ${res.status}`);
      const data = await res.json();
      const results = (data.features || []).map(fromMapbox).filter(r => r.lat && r.lng);
      if (results.length) return results;
    } catch (err) {
      console.warn('[geocoding] Mapbox failed, falling back to Nominatim:', err);
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
  if (MAPBOX_TOKEN) {
    try {
      const params = new URLSearchParams({
        longitude: String(lng), latitude: String(lat), access_token: MAPBOX_TOKEN,
        language: lang, types: 'place',
      });
      const res = await fetch(`${MAPBOX_BASE}/reverse?${params}`);
      if (!res.ok) throw new Error(`Mapbox ${res.status}`);
      const data = await res.json();
      const name = data.features?.[0]?.properties?.name;
      if (name) return name;
    } catch (err) {
      console.warn('[geocoding] Mapbox reverse failed, falling back:', err);
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
