import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AppLayout from '@/components/layout/AppLayout';
import LanguageProvider from '@/lib/LanguageProvider';
import { CurrentUserProvider } from '@/contexts/CurrentUserContext';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import EventDetail from '@/pages/EventDetail';
import CreateEvent from '@/pages/CreateEvent';
import Profile from '@/pages/Profile';
import Favorites from '@/pages/Favorites';
import Trending from '@/pages/Trending';
import MyEvents from '@/pages/MyEvents';
import AdminDashboard from '@/pages/AdminDashboard';
import Notifications from '@/pages/Notifications';
import { useState, useEffect } from 'react';

function SplashScreen() {
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
        Platforma pro hledání událostí a přátel na základě zájmů.
      </p>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <LanguageProvider>
      <CurrentUserProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
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
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </CurrentUserProvider>
    </LanguageProvider>
  );
}
