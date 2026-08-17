import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/lib/supabaseClient';

// Google actively refuses to let you sign in from inside an app's own WebView
// (the "disallowed_useragent" block), so on native we can't just redirect the
// in-app webview to Google like the web build does. Instead: open Google's
// login in the system browser (Browser.open — Chrome Custom Tabs / Safari
// View Controller, not an embedded webview Google can fingerprint), and have
// Supabase redirect back to this custom URL scheme instead of a web URL.
// AppLayout.jsx listens for that scheme via @capacitor/app's appUrlOpen and
// hands the returned URL to handleNativeAuthCallback below to finish the
// PKCE code exchange and close the browser.
export const NATIVE_AUTH_REDIRECT = 'highfive://auth-callback';

export async function signInWithGoogleNative() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NATIVE_AUTH_REDIRECT,
      skipBrowserRedirect: true,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error || !data?.url) throw error || new Error('No OAuth URL returned');
  await Browser.open({ url: data.url });
}

export async function handleNativeAuthCallback(url) {
  if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return false;
  try {
    await supabase.auth.exchangeCodeForSession(url);
  } finally {
    Browser.close().catch(() => {});
  }
  return true;
}

export const isNative = () => Capacitor.isNativePlatform();
