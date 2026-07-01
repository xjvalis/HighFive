import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, TrendingUp, Calendar, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { haptic } from "@/lib/haptics";

export default function MobileBottomNav() {
  const tr = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useCurrentUser();

  const tabs = [
    { icon: Home, label: tr.home, path: "/" },
    { icon: TrendingUp, label: tr.trending, path: "/trending" },
    null, // center FAB
    { icon: Calendar, label: tr.myEvents, path: "/my-events" },
    { icon: User, label: tr.profile, path: user ? "/profile" : "/login" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border xl:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab, i) => {
          if (!tab) {
            return (
              <button
                key="create"
                onClick={() => { haptic('medium'); navigate(user ? "/create" : "/login"); }}
                className="flex flex-col items-center justify-center -mt-6 px-3 py-2"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
              </button>
            );
          }

          const { icon: Icon, label, path } = tab;
          const isProfile = path === "/profile" || path === "/login";
          const active = isProfile
            ? location.pathname === "/profile"
            : location.pathname === path;

          return (
            <Link
              key={path}
              to={path}
              title={label}
              onClick={() => haptic('light')}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all relative",
                "min-w-[56px] min-h-[56px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                {isProfile && profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className={cn("w-6 h-6 rounded-full object-cover", active && "ring-2 ring-primary")}/>
                ) : isProfile && user ? (
  <div className={cn("w-6 h-6 rounded-full bg-lavender border border-violet-200 flex items-center justify-center", active && "ring-2 ring-primary")}>
    <User className="w-3.5 h-3.5 text-violet-600"/>
  </div>
                  : (
                  <Icon className={cn("w-6 h-6 transition-transform", active && "scale-110")}/>
                )}
              </span>
              {active && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary"/>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
