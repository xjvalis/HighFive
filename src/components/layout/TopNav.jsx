import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Menu, X, Bell, Shield, Home, TrendingUp, Star, Calendar, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useLanguage, LANGUAGES } from "@/lib/language";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import NotificationBell from "@/components/layout/NotificationBell";
import { supabase } from "@/lib/supabaseClient";
import { getCategoryStyle, getCategoryLabel } from "@/lib/categories";
import { format } from "date-fns";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";

function LangSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === 'cs' ? 'en' : 'cs')}
      className="px-2.5 py-1.5 rounded-xl hover:bg-secondary transition-colors text-xs font-semibold text-muted-foreground hover:text-foreground"
      title={lang === 'cs' ? 'Switch to English' : 'Přepnout na češtinu'}
    >
      {lang === 'cs' ? 'CZ' : 'EN'}
    </button>
  );
}

function SearchBar() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const { data } = await supabase.from('events')
      .select('id, title, category, location, date')
      .eq('is_approved', true)
      .gt('date', new Date().toISOString())
      .or(`title.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .order('date', { ascending: true })
      .limit(6);
    setResults(data || []);
    setOpen(true);
    setLoading(false);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    navigate(`/?search=${encodeURIComponent(query.trim())}`);
  };

  const handleSelect = (event) => {
    setOpen(false);
    setQuery('');
    navigate(`/event/${event.id}`);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"/>
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground"/>}
          {!loading && query && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5"/>
            </button>
          )}
          <Input
            value={query}
            onChange={handleInput}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={tr.searchPlaceholder}
            className="pl-9 pr-8 bg-secondary/50 border-0 h-9 text-sm rounded-full focus-visible:ring-1"
          />
        </div>
      </form>

      {open && results.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-full">
          {results.map(event => {
            const cat = getCategoryStyle(event.category);
            return (
              <button key={event.id} onClick={() => handleSelect(event)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-secondary transition-colors border-b border-border/40 last:border-0">
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", cat.color)}>
                  {cat.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{event.location} · {event.date ? format(new Date(event.date), 'EEE d MMM') : ''}</p>
                </div>
              </button>
            );
          })}
          <button onClick={() => { setOpen(false); navigate(`/?search=${encodeURIComponent(query)}`); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-primary font-medium hover:bg-secondary transition-colors">
            <Search className="w-3.5 h-3.5"/>
            {lang === 'cs' ? `Zobrazit všechny výsledky pro "${query}"` : `See all results for "${query}"`}
          </button>
        </div>
      )}
    </div>
  );
}

function MobileDrawer({ open, onClose, tr, lang, profile }) {
  const { user } = useCurrentUser();
  const nav = (path) => { window.location.href = path; onClose(); };

  const items = [
    { icon: Home, label: tr.home, path: '/' },
    { icon: TrendingUp, label: tr.trending, path: '/trending' },
    { icon: Star, label: tr.favorites, path: '/favorites' },
    { icon: Calendar, label: tr.myEvents, path: '/my-events' },
    ...(profile?.is_admin || profile?.is_moderator ? [{ icon: Shield, label: tr.moderation, path: '/admin' }] : []),
  ];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-grotesk font-bold text-lg">HighFive 🙏</span>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5"/></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map(item => (
            <button key={item.path} onClick={() => nav(item.path)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors text-left">
              <item.icon className="w-5 h-5 text-muted-foreground"/>
              {item.label}
            </button>
          ))}
        </nav>
        {user ? (
          <div className="p-3 border-t border-border">
            <button onClick={() => nav('/profile')} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              <User className="w-5 h-5 text-muted-foreground"/>{tr.profile}
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-border">
            <Button className="w-full rounded-xl" onClick={() => nav('/login')}>{tr.login}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TopNav() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const { user, profile } = useCurrentUser();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/60 h-14"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-full flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button onClick={() => setDrawerOpen(true)} className="xl:hidden p-2 -ml-1 rounded-xl hover:bg-secondary transition-colors">
            <Menu className="w-5 h-5"/>
          </button>

          {/* Logo */}
          <Link to="/" className="font-grotesk font-bold text-base flex-shrink-0 hidden sm:block">
            HighFive 🙏
          </Link>

          {/* Search */}
          <SearchBar/>

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <LangSwitcher/>
            <NotificationBell/>
            {user ? (
              <Button variant="ghost" size="icon" className="hidden xl:flex rounded-full w-9 h-9 p-0" onClick={() => navigate('/profile')}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover"/>
                  : <div className="w-8 h-8 rounded-full bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold">{user.email?.[0]?.toUpperCase()}</div>
                }
              </Button>
            ) : (
              <Button size="sm" className="hidden xl:flex rounded-xl px-4 h-8 text-xs" onClick={() => navigate('/login')}>
                {tr.login}
              </Button>
            )}
            <button onClick={() => navigate(user ? '/create' : '/login')} className="hidden xl:flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} tr={tr} lang={lang} profile={profile}/>
    </>
  );
}
