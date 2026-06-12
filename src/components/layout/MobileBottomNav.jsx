import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, TrendingUp, MessageCircle, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUnreadDMs } from "@/hooks/useUnreadDMs";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { haptic } from "@/lib/haptics";

export default function MobileBottomNav() {
  const tr = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const unreadDMs = useUnreadDMs();
  const { user, profile } = useCurrentUser();

  const tabs = [
    { icon: Home, label: tr.home, path: "/" },
    { icon: TrendingUp, label: tr.trending, path: "/trending" },
    null, // center FAB
    { icon: MessageCircle, label: tr.messages, path: "/messages" },
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
          const active = location.pathname === path || (path === "/profile" && location.pathname === "/profile");
          const isProfile = path === "/profile" || path === "/login";

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
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className={cn("w-6 h-6 rounded-full object-cover", active && "ring-2 ring-primary")}
                  />
                ) : isProfile && profile?.display_name ? (
                  <div className={cn("w-6 h-6 rounded-full bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold", active && "ring-2 ring-primary")}>
                    {profile.display_name[0].toUpperCase()}
                  </div>
                ) : (
                  <Icon className={cn("w-6 h-6 transition-transform", active && "scale-110")} />
                )}
                {path === "/messages" && unreadDMs > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadDMs > 9 ? "9+" : unreadDMs}
                  </span>
                )}
              </span>
              {active && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
