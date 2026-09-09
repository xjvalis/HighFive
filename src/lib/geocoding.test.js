import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchPlaces, reverseGeocodeCity } from './geocoding';

// Real shape captured from api.mapy.cz/v1/suggest and /v1/rgeocode — used
// verbatim so these tests catch a schema change, not a guessed-at fixture.
const SUGGEST_RESPONSE = {
  items: [
    {
      name: 'Václavské náměstí', label: 'Zastávka tramvaje, autobusu',
      position: { lon: 14.42556, lat: 50.08187 },
      type: 'poi', location: 'Praha, Česko',
      regionalStructure: [{ name: 'Praha', type: 'regional.municipality' }],
    },
  ],
};

// Regression fixture for the bug found in this session: the rgeocode result
// item IS the street address — the city name lives one level down, inside
// regionalStructure, never as a sibling top-level item.
const RGEOCODE_RESPONSE = {
  items: [
    {
      name: 'náměstí Míru 820/9', label: 'Adresa',
      position: { lon: 14.43794, lat: 50.07563 },
      type: 'regional.address', location: 'Praha 2 - Vinohrady, Česko',
      regionalStructure: [
        { name: '820/9', type: 'regional.address' },
        { name: 'náměstí Míru', type: 'regional.street' },
        { name: 'Vinohrady', type: 'regional.municipality_part' },
        { name: 'Praha 2', type: 'regional.municipality_part' },
        { name: 'Praha', type: 'regional.municipality' },
        { name: 'okres Hlavní město Praha', type: 'regional.region' },
        { name: 'Česko', type: 'regional.country', isoCode: 'CZ' },
      ],
      zip: '120 00',
    },
  ],
};

function mockFetchOnce(json, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok, status: ok ? 200 : 500,
    json: async () => json,
  });
}

describe('geocoding', () => {
  const originalFetch = global.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  it('searchPlaces returns [] for an empty/blank query without calling the network', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;
    expect(await searchPlaces('')).toEqual([]);
    expect(await searchPlaces('   ')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('searchPlaces parses a Mapy.cz suggest response into {label, sublabel, lat, lng, emoji}', async () => {
    mockFetchOnce(SUGGEST_RESPONSE);
    const results = await searchPlaces('Václavské náměstí');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      label: 'Václavské náměstí', sublabel: 'Praha, Česko',
      lat: 50.08187, lng: 14.42556,
    });
    expect(results[0].emoji).toBeTruthy();
  });

  it('searchPlaces falls back to Nominatim when the primary provider request throws', async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation((url) => {
      call += 1;
      if (String(url).includes('nominatim')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ([]) });
      }
      return Promise.reject(new Error('network down'));
    });
    const results = await searchPlaces('anywhere');
    expect(results).toEqual([]);
    expect(call).toBeGreaterThanOrEqual(1);
  });

  it('reverseGeocodeCity pulls the municipality name out of regionalStructure, not the top-level (street-address) item', async () => {
    mockFetchOnce(RGEOCODE_RESPONSE);
    const city = await reverseGeocodeCity(50.0755, 14.4378);
    // Regression: a naive `items[0].name` read returns the street address
    // ("náměstí Míru 820/9"), not the city — this must be "Praha".
    expect(city).toBe('Praha');
  });

  it('reverseGeocodeCity returns null (not throw) when every provider fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    const city = await reverseGeocodeCity(50.0755, 14.4378);
    expect(city).toBeNull();
  });
});
