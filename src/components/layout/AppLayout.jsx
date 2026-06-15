import { Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import TopNav from "./TopNav";
import MobileBottomNav from "./MobileBottomNav";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useNotificationEngine } from "@/hooks/useNotificationEngine";

function NotificationEngineRunner() {
  const { user, profile } = useCurrentUser();
  useNotificationEngine(user, profile);
  return null;
}

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <NotificationEngineRunner />
      <TopNav />
      {/* pt-14 = TopNav height, py-2 = tight vertical padding on mobile */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-14 pb-safe xl:pb-4">
        <div className="flex gap-5 py-2 sm:py-4">
          <aside className="hidden xl:block w-56 flex-shrink-0">
            <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar">
              <LeftSidebar />
            </div>
          </aside>
          <main className="flex-1 min-w-0 overflow-x-hidden">
            <Outlet />
          </main>
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar">
              <RightSidebar />
            </div>
          </aside>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
