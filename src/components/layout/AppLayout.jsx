import { Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import TopNav from "./TopNav";
import MobileBottomNav from "./MobileBottomNav";
import FeedbackModal from "./FeedbackModal";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useNotificationEngine } from "@/hooks/useNotificationEngine";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useState, useContext } from "react";
import { LanguageContext } from "@/lib/language";
import { MessageSquare } from "lucide-react";

function NotificationEngineRunner() {
  const { user } = useCurrentUser();
  const { lang } = useContext(LanguageContext);
  useNotificationEngine(user, lang);
  usePushNotifications(user);
  return null;
}

export default function AppLayout() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <NotificationEngineRunner />
      <TopNav />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 xl:pb-4" style={{ paddingTop: "calc(56px + env(safe-area-inset-top))" }}>
        <div className="flex gap-5">
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
      <button
        onClick={() => setFeedbackOpen(true)}
        className="hidden xl:flex fixed bottom-6 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg items-center justify-center transition-colors"
        style={{ width: "44px", height: "44px" }}
        title="Poslat feedback"
      >
        <MessageSquare size={20} />
      </button>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <MobileBottomNav />
    </div>
  );
}