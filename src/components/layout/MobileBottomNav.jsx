import { Link, useLocation, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { haptic } from "@/lib/haptics";
import { SvIcon } from "@/components/icons/SvIcon";

export default function MobileBottomNav() {
  const tr = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useCurrentUser();

  const tabs = [
    { icon: "home", label: tr.home, path: "/" },
    { icon: "popular", label: tr.trending, path: "/trending" },
    null, // center FAB
    { icon: "calendar", label: tr.myEvents, path: "/my-events" },
    { icon: "profile", label: tr.profile, path: "/profile" },
  ];

  const isProfileActive = location.pathname === "/profile";

  const renderProfileIcon = (active) => {
    const color = active ? 'var(--sv-ink)' : 'var(--sv-meta)';
    if (profile?.avatar_url) {
      return <img src={profile.avatar_url} alt="avatar" className="w-6 h-6 rounded-full object-cover" />;
    }
    if (user) {
      return (
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#F0EAFC' }}>
          <User className="w-3.5 h-3.5" style={{ color: 'var(--sv-brand-purple)' }} />
        </div>
      );
    }
    return <User className="w-5 h-5" style={{ color }} />;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 xl:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", background: 'var(--sv-bg)', borderTop: '1px solid var(--sv-hairline)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab, i) => {
          if (!tab) {
            return (
              <button
                key="create"
                onClick={() => {
                  haptic("medium");
                  navigate(user ? "/create" : "/login");
                }}
                className="flex flex-col items-center justify-center -mt-6 px-3 py-2"
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform active:scale-95" style={{ background: 'var(--sv-action-bg)' }}>
                  <SvIcon name="plus" size={22} style={{ color: 'var(--sv-action-ink)' }} />
                </div>
              </button>
            );
          }

          const { icon, label, path } = tab;
          const active = path === "/profile" ? isProfileActive : location.pathname === path;
          const isProfileTab = path === "/profile";
          const handleClick = () => haptic("light");

          return (
            <Link
              key={path}
              to={user || !isProfileTab ? path : "/login"}
              title={label}
              onClick={handleClick}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 relative"
              style={{ minWidth: 56, minHeight: 56 }}
            >
              <span className="relative">
                {isProfileTab ? renderProfileIcon(active) : <SvIcon name={icon} size={20} style={{ color: active ? 'var(--sv-ink)' : 'var(--sv-meta)' }} />}
              </span>
              <span style={{ font: `${active ? 500 : 400} 9.5px 'Outfit', sans-serif`, color: active ? 'var(--sv-ink)' : 'var(--sv-meta)' }}>{label}</span>
              {active && <span className="absolute" style={{ bottom: 2, width: 4, height: 4, borderRadius: '50%', background: 'var(--sv-empty-dot)' }} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
