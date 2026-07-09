import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Client-side groundwork only: requests permission, registers the device,
// and logs the token. Actually delivering a push still needs, outside this
// codebase: a Firebase project + google-services.json (Android), an APNs
// key/cert + GoogleService-Info.plist (iOS), and a server-side sender that
// posts to FCM using a stored push_token (see supabase/fix_notifications_and_push_token.sql
// for the column that will hold it).
export function usePushNotifications(user) {
  useEffect(() => {
    if (!user?.id || !Capacitor.isNativePlatform()) return;

    const listeners = [];

    const setup = async () => {
      const current = await PushNotifications.checkPermissions();
      let granted = current.receive === 'granted';
      if (!granted && current.receive !== 'denied') {
        const requested = await PushNotifications.requestPermissions();
        granted = requested.receive === 'granted';
      }
      if (!granted) return;

      listeners.push(await PushNotifications.addListener('registration', (token) => {
        console.log('[push] device registered, token:', token.value);
      }));
      listeners.push(await PushNotifications.addListener('registrationError', (err) => {
        console.error('[push] registration failed:', err);
      }));
      listeners.push(await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[push] received in foreground:', notification);
      }));
      listeners.push(await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[push] notification tapped:', action);
      }));

      await PushNotifications.register();
    };

    setup();

    return () => { listeners.forEach(l => l.remove()); };
  }, [user?.id]);
}
