import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AppLayout from '@/components/layout/AppLayout';
import LanguageProvider from '@/lib/LanguageProvider';
import { CurrentUserProvider, useCurrentUser } from '@/contexts/CurrentUserContext';
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
import Messages from '@/pages/Messages';

function AuthenticatedApp() {
  const { user, loading } = useCurrentUser();
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-4xl mb-3">🙏</div>
        <div className="w-6 h-6 border-4 border-lavender border-t-violet-500 rounded-full animate-spin mx-auto"/>
      </div>
    </div>
  );
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/create" element={<CreateEvent />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <CurrentUserProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </CurrentUserProvider>
    </LanguageProvider>
  );
}
