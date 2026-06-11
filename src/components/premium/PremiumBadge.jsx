import { Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small inline badge for Premium/Pro indication
 * size: "sm" | "md"
 */
export default function PremiumBadge({ isPro = false, size = "sm" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-medium rounded-full",
      size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
      isPro ? "bg-lemon text-yellow-700" : "bg-lavender text-violet-700"
    )}>
      {isPro ? <Crown className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
      {isPro ? "Pro" : "Creator"}
    </span>
  );
}