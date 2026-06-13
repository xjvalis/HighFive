import { useState, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Star, Calendar, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { CATEGORIES, getCategoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useT } from "@/lib/i18n";
import { LanguageContext } from "@/lib/language";

const VISIBLE_COUNT = 5;

export default function LeftSidebar() {
  const { profile } = useCurrentUser();
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeCategory = params.get("category");
  const [expanded, setExpanded] = useState(false);

  const navItems = [
    { icon: Home, label: tr.home, path: "/" },
    { icon: TrendingUp, label: tr.trending, path: "/trending" },
    { icon: Star, label: tr.favorites, path: "/favorites" },
    { icon: Calendar, label: tr.myEvents, path: "/my-events" },
  ];

  const visibleCategories = expanded ? CATEGORIES : CATEGORIES.slice(0, VISIBLE_COUNT);

  return (
    <div className="space-y-5">
      {/* Navigation */}
      <div className="bg-card rounded-2xl p-3 shadow-sm border border-border/60">
        <div className="space-y-0.5">
          {navItems.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                location.pathname === path && !activeCategory
                  ? "bg-lavender text-violet-700"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-card rounded-2xl p-3 shadow-sm border border-border/60">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">{tr.categories}</p>
        <div className="space-y-0.5">
          {visibleCategories.map(({ name, emoji }) => (
            <Link
              key={name}
              to={`/?category=${encodeURIComponent(name)}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all",
                activeCategory === name
                  ? "bg-lavender text-violet-700 font-medium"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <span className="text-base">{emoji}</span>
              {getCategoryLabel(name, lang)}
            </Link>
          ))}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 w-full mt-1 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary transition-all"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? tr.showLess : tr.moreCategories(CATEGORIES.length - VISIBLE_COUNT)}
        </button>
      </div>

      {/* Admin/Moderator link */}
      {(profile?.is_admin || profile?.is_moderator) && (
        <Link
          to="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary transition-all"
        >
          <Shield className="w-3 h-3" />
          {tr.moderation}
        </Link>
      )}
    </div>
  );
}
