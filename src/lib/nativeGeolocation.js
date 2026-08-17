import { Capacitor } from '@capacitor/core';

// Plain navigator.geolocation works fine on web, but on native it needs the
// @capacitor/geolocation plugin to actually trigger the OS permission prompt
// reliably (a bare webview geolocation call can silently return nothing on
// Android and can misbehave on iOS) — this picks the right path per platform
// and normalizes both to the same {lat, lng} shape callers already expect.
export function getCurrentPosition() {
  if (Capacitor.isNativePlatform()) {
    return (async () => {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted' && perm.location !== 'limited') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted' && requested.location !== 'limited') {
          throw new Error('Location permission denied');
        }
      }
      const pos = await Geolocation.getCurrentPosition();
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    })();
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
    );
  });
}
