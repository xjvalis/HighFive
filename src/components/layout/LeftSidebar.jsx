import { useState, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { CATEGORIES, getCategoryLabel } from "@/lib/categories";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useT } from "@/lib/i18n";
import { LanguageContext } from "@/lib/language";
import { SvIcon } from "@/components/icons/SvIcon";

const VISIBLE_COUNT = 5;

export default function LeftSidebar() {
  const { user, profile } = useCurrentUser();
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeCategory = params.get("category");
  const [expanded, setExpanded] = useState(false);

  const navItems = [
    { icon: "home", label: tr.home, path: "/" },
    { icon: "popular", label: tr.trending, path: "/trending" },
    { icon: "star", label: tr.favorites, path: "/favorites" },
    { icon: "calendar", label: tr.myEvents, path: "/my-events" },
    ...(user ? [{ icon: "message", label: tr.messages, path: "/messages" }] : []),
  ];

  const visibleCategories = expanded ? CATEGORIES : CATEGORIES.slice(0, VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div className="flex flex-col" style={{ gap: 2 }}>
        {navItems.map(({ icon, label, path }) => {
          const active = location.pathname === path && !activeCategory;
          return (
            <Link
              key={path}
              to={path}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "7px 12px",
                fontSize: 12.5, fontWeight: active ? 500 : 400,
                color: active ? 'var(--sv-ink)' : 'var(--sv-muted)',
                background: active ? '#FFF3E6' : 'transparent',
                borderRadius: 'var(--sv-r-pill)',
              }}
            >
              <SvIcon name={icon} size={14} style={{ color: active ? '#9A7A50' : 'var(--sv-meta)' }}/>
              {label}
            </Link>
          );
        })}
      </div>

      <div>
        <div style={{ font: "500 8.5px 'IBM Plex Mono', monospace", letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--sv-meta)' }}>
          {tr.categories}
        </div>
        <div className="flex flex-col mt-2.5" style={{ gap: 8 }}>
          {visibleCategories.map((cat) => (
            <Link
              key={cat.name}
              to={`/?category=${encodeURIComponent(cat.name)}`}
              className="flex items-center"
              style={{ gap: 9, fontSize: 12.5, fontWeight: activeCategory === cat.name ? 500 : 400, color: 'var(--sv-ink-soft)' }}
            >
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 21, height: 21, borderRadius: 'var(--sv-r-tile)', background: cat.bg, fontSize: 11, fontFamily: "var(--sv-font-emoji)" }}
              >
                {cat.emoji}
              </span>
              {getCategoryLabel(cat.name, lang)}
            </Link>
          ))}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-1"
          style={{ paddingLeft: 30, fontSize: 11.5, fontWeight: 400, color: 'var(--sv-link)' }}
        >
          {expanded ? tr.showLess : tr.moreCategories(CATEGORIES.length - VISIBLE_COUNT)}
        </button>
      </div>

      {(profile?.is_admin || profile?.is_moderator) && (
        <Link
          to="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all hover:bg-[var(--sv-surface-muted)]"
          style={{ color: 'var(--sv-meta)' }}
        >
          <Shield className="w-3 h-3" />
          {tr.moderation}
        </Link>
      )}
    </div>
  );
}
