import { Toaster } from "@/components/ui/sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AppLayout from '@/components/layout/AppLayout';
import LanguageProvider from '@/lib/LanguageProvider';
import { CurrentUserProvider, useCurrentUser } from '@/contexts/CurrentUserContext';
import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import { LanguageContext } from '@/lib/language';
import { isNative, handleNativeAuthCallback } from '@/lib/nativeAuth';
import SetNewPasswordScreen from '@/components/auth/SetNewPasswordScreen';

// Route-level code splitting — only the page the user actually lands on
// (plus AppLayout/Home for the common case) ships on first load.
const Login = lazy(() => import('@/pages/Login'));
const Home = lazy(() => import('@/pages/Home'));
const EventDetail = lazy(() => import('@/pages/EventDetail'));
const CreateEvent = lazy(() => import('@/pages/CreateEvent'));
const Profile = lazy(() => import('@/pages/Profile'));
const Favorites = lazy(() => import('@/pages/Favorites'));
const Trending = lazy(() => import('@/pages/Trending'));
const MyEvents = lazy(() => import('@/pages/MyEvents'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Messages = lazy(() => import('@/pages/Messages'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));

function NativeAppListeners() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative()) return;
    let capApp;
    const listeners = [];

    (async () => {
      const { App: CapacitorApp } = await import('@capacitor/app');
      capApp = CapacitorApp;

      // OAuth (and any other) deep-link callback, e.g. highfive://auth-callback
      listeners.push(await capApp.addListener('appUrlOpen', ({ url }) => {
        handleNativeAuthCallback(url).then(handled => { if (handled) navigate('/'); });
      }));

      // Android hardware back button: step back through app history instead
      // of the OS default (which would otherwise just close the app).
      listeners.push(await capApp.addListener('backButton', () => {
        if (window.history.state && window.history.state.idx > 0) navigate(-1);
        else capApp.exitApp();
      }));
    })();

    return () => { listeners.forEach(l => l.remove()); };
  }, [navigate]);

  return null;
}

function RouteLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-lavender border-t-violet-500 rounded-full animate-spin"/>
    </div>
  );
}

function SplashScreen() {
  const { lang } = useContext(LanguageContext);
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <img
        src="/hands.png"
        alt="HighFive"
        style={{ width: '96px', height: '96px', objectFit: 'contain', marginBottom: '16px' }}
      />
      <h1 style={{ fontWeight: '700', fontSize: '24px', margin: '0 0 8px 0', color: '#1a1a1a' }}>
        HighFive
      </h1>
      <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', maxWidth: '240px', margin: 0, lineHeight: '1.5' }}>
        {lang === 'cs' ? 'Platforma pro hledání událostí a přátel na základě zájmů.' : 'Find events and friends based on shared interests.'}
      </p>
    </div>
  );
}

const MIN_SPLASH_MS = 800;  // branding floor, only on the first open of a session
const MAX_SPLASH_MS = 8000; // safety net so a hung auth/profile call can't strand users on the splash forever
const SPLASH_SEEN_KEY = 'hf_splash_seen';

// sessionStorage throws in some private-browsing modes, and this runs above the
// router — a throw here would take down the whole app.
const splashAlreadySeen = () => {
  try { return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1'; } catch { return false; }
};
const rememberSplashSeen = () => {
  try { sessionStorage.setItem(SPLASH_SEEN_KEY, '1'); } catch { /* ignore */ }
};

function AppContent() {
  const { loading, isPasswordRecovery } = useCurrentUser();
  const [seen] = useState(splashAlreadySeen);
  // On repeat opens skip the branding delay, but still hold while auth resolves:
  // that gate is what stops the app rendering a signed-out shell (and a blank
  // avatar) before the profile arrives.
  const [minTimeElapsed, setMinTimeElapsed] = useState(seen);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timers = [setTimeout(() => setTimedOut(true), MAX_SPLASH_MS)];
    if (!seen) timers.push(setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS));
    return () => timers.forEach(clearTimeout);
  }, [seen]);

  const showSplash = !timedOut && (!minTimeElapsed || loading);

  useEffect(() => { if (!showSplash) rememberSplashSeen(); }, [showSplash]);

  if (showSplash) return <SplashScreen />;
  if (isPasswordRecovery) return <SetNewPasswordScreen />;

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <NativeAppListeners />
        <Suspense fallback={<RouteLoader/>}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/trending" element={<Trending />} />
              <Route path="/event/:id" element={<EventDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/my-events" element={<MyEvents />} />
              <Route path="/create" element={<CreateEvent />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/terms" element={<div className="min-h-screen bg-background px-4 pt-8"><Terms /></div>} />
            <Route path="/privacy" element={<div className="min-h-screen bg-background px-4 pt-8"><Privacy /></div>} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <CurrentUserProvider>
        <AppContent />
      </CurrentUserProvider>
    </LanguageProvider>
  );
}
