import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, Plus, User, Menu, X, Star, Calendar, TrendingUp, Home, Shield, Bell } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useLanguage, LANGUAGES } from "@/lib/language";
import { useT } from "@/lib/i18n";
import { getCategoryLabel } from "@/lib/categories";

function MobileDrawer({ open, onClose, tr, lang }) {
  const navigate = (path) => {window.location.href = path;onClose()};
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 xl:hidden" onClick={onClose} />}
      <div className={cn(
        "fixed top-0 left-0 bottom-0 w-72 bg-card z-50 shadow-xl transition-transform duration-300 xl:hidden overflow-y-auto",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <span className="text-xl">🙏</span>
            <span className="font-grotesk font-bold text-lg">HighFive</span>
          </Link>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 space-y-1">
          {[
          { icon: Home, label: tr.home, path: "/" },
          { icon: TrendingUp, label: tr.trending, path: "/trending" },
          { icon: Star, label: tr.favorites, path: "/favorites" },
          { icon: Calendar, label: tr.myEvents, path: "/my-events" },
          { icon: Bell, label: tr.notifications, path: "/notifications" },
          { icon: User, label: tr.profile, path: "/profile" },
          { icon: Shield, label: tr.moderation, path: "/admin" }].
          map(({ icon: Icon, label, path }) =>
          <Link key={path} to={path} onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              <Icon className="w-4 h-4 text-muted-foreground" />
              {label}
            </Link>
          )}
        </div>
        <div className="px-3 pt-2 pb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">{tr.categories}</p>
          {CATEGORIES.map(({ name, emoji }) =>
          <Link key={name} to={`/?category=${encodeURIComponent(name)}`} onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-secondary transition-colors">
              <span>{emoji}</span>{getCategoryLabel(name, lang)}
            </Link>
          )}
        </div>
      </div>
    </>);

}

function LangSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang);

  useEffect(() => {
    const handler = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center px-2 py-1.5 rounded-xl hover:bg-secondary transition-colors"
        title="Language">
        
        <span className="text-xl leading-none">{current.flag}</span>
      </button>
      {open &&
      <div className="absolute right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 min-w-[130px]">
          {LANGUAGES.map((l) =>
        <button
          key={l.code}
          onClick={() => {setLang(l.code);setOpen(false);}}
          className={cn(
            "flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-secondary transition-colors",
            lang === l.code && "bg-secondary font-medium"
          )}>
          
              <span className="text-base">{l.flag}</span>
              {l.label}
            </button>
        )}
        </div>
      }
    </div>);

}

export default function TopNav() {
  const tr = useT();
  const { lang } = useLanguage();
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(r => r.data.user).then(setUser).catch(() => {});
  }, []);

  return (
    <>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} tr={tr} lang={lang} />
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border h-14">
        <div className="h-full flex items-center px-4 gap-3 max-w-7xl mx-auto">

          {/* Mobile: hamburger */}
          <div className="xl:hidden flex items-center gap-2">
            <button onClick={() => setDrawerOpen((v) => !v)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Logo — centered on mobile, left on desktop */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 lg:static lg:translate-x-0 lg:left-auto">
            <span className="text-xl">🙏</span>
            <span className="font-grotesk font-bold text-base text-foreground">HighFive</span>
          </Link>

          {/* Desktop search */}
          <div className="hidden lg:flex flex-1 max-w-md relative ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={tr.searchPlaceholder}
              className="pl-9 bg-secondary/50 border-0 h-9 text-sm rounded-full focus-visible:ring-1" />
            
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">


            {/* Desktop create button */}
            <button
              onClick={() => navigate("/create")}
              className="hidden xl:flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
            </button>

            <NotificationBell />

            <LangSwitcher />

            {user &&
            <Button variant="ghost" size="icon" className="hidden xl:flex rounded-full w-9 h-9" onClick={() => navigate("/profile")}>
                <div className="w-7 h-7 rounded-full bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold">
                  {user.full_name?.[0] || user.email?.[0] || "?"}
                </div>
              </Button>
            }
          </div>
        </div>
      </nav>
    </>);

}