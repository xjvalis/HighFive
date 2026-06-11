import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, TrendingUp, MessageCircle, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUnreadDMs } from "@/hooks/useUnreadDMs";

export default function MobileBottomNav() {
  const tr = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const unreadDMs = useUnreadDMs();

  const tabs = [
    { icon: Home, label: tr.home, path: "/" },
    { icon: TrendingUp, label: tr.trending, path: "/trending" },
    null, // center FAB placeholder
    { icon: Calendar, label: tr.myEvents, path: "/my-events" },
    { icon: MessageCircle, label: tr.messages, path: "/messages" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border xl:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab, i) => {
          if (!tab) {
            // Center FAB
            return (
              <button
                key="create"
                onClick={() => navigate("/create")}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
              </button>
            );
          }

          const { icon: Icon, label, path } = tab;
          const active = location.pathname === path;

          return (
            <Link
              key={path}
              to={path}
              title={label}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all relative",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                {path === "/messages" && unreadDMs > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadDMs > 9 ? "9+" : unreadDMs}
                  </span>
                )}
              </span>
              {active && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}