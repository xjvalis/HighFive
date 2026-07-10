// Shared Mapbox geocoding helpers — replaces the old direct Nominatim/OSM
// calls (rate-limited, weak POI coverage for CZ). Needs VITE_MAPBOX_TOKEN;
// without it, search silently returns no results instead of crashing.

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const BASE = 'https://api.mapbox.com/search/geocode/v6';

const POI_EMOJI = {
  cafe: '🍽️', restaurant: '🍽️', bar: '🍺', pub: '🍺', park: '🌳', garden: '🌳',
  sports_club: '🏋️', gym: '🏋️', library: '📚', theatre: '🎭', cinema: '🎭',
  hospital: '🏥', clinic: '🏥', museum: '🏛️', hotel: '🏨', shop: '🛍️',
};

function emojiFor(feature) {
  const categories = feature.properties?.poi_category || [];
  for (const cat of categories) {
    if (POI_EMOJI[cat]) return POI_EMOJI[cat];
  }
  const type = feature.properties?.feature_type;
  if (type === 'poi') return '📍';
  if (type === 'address' || type === 'street') return '📍';
  return '🏙️';
}

function toResult(feature) {
  const p = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [];
  const label = p.name_preferred || p.name || p.full_address || p.place_formatted;
  return {
    id: p.mapbox_id,
    label,
    sublabel: p.place_formatted || '',
    country: p.context?.country?.name || '',
    lat, lng,
    emoji: emojiFor(feature),
  };
}

export async function searchPlaces(query, { lang = 'cs', limit = 8 } = {}) {
  if (!MAPBOX_TOKEN || !query?.trim()) return [];
  const params = new URLSearchParams({
    q: query, access_token: MAPBOX_TOKEN, language: lang, limit: String(limit),
    types: 'poi,address,street,place,locality,neighborhood',
  });
  try {
    const res = await fetch(`${BASE}/forward?${params}`);
    const data = await res.json();
    return (data.features || []).map(toResult).filter(r => r.lat && r.lng);
  } catch {
    return [];
  }
}

export async function reverseGeocodeCity(lat, lng, lang = 'cs') {
  if (!MAPBOX_TOKEN) return null;
  const params = new URLSearchParams({
    longitude: String(lng), latitude: String(lat), access_token: MAPBOX_TOKEN,
    language: lang, types: 'place',
  });
  try {
    const res = await fetch(`${BASE}/reverse?${params}`);
    const data = await res.json();
    return data.features?.[0]?.properties?.name || null;
  } catch {
    return null;
  }
}
