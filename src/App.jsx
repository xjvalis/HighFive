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

// App is always accessible — login is only required for specific actions
export default function App() {
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
