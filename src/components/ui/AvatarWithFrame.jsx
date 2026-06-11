import { cn } from "@/lib/utils";

/**
 * Renders a user avatar with optional gold frame for Creator plan users.
 * Usage: <AvatarWithFrame profile={profile} size="md" />
 * Sizes: sm (w-8 h-8), md (w-10 h-10), lg (w-14 h-14), xl (w-20 h-20)
 */
const SIZES = {
  sm: { outer: "w-8 h-8", text: "text-xs", ring: "2px solid #FFD700, 0 0 0 3px #FFA500" },
  md: { outer: "w-10 h-10", text: "text-sm", ring: "2px solid #FFD700, 0 0 0 4px #FFA500" },
  lg: { outer: "w-14 h-14", text: "text-xl", ring: "3px solid #FFD700, 0 0 0 5px #FFA500" },
  xl: { outer: "w-20 h-20", text: "text-3xl", ring: "3px solid #FFD700, 0 0 0 5px #FFA500" },
};

export default function AvatarWithFrame({ profile, size = "md", className, fallbackLetter }) {
  const s = SIZES[size] || SIZES.md;
  const isCreator = profile?.subscription_plan === "creator" || (profile?.is_premium && profile?.is_verified);
  const letter = fallbackLetter || profile?.display_name?.[0] || profile?.user_email?.[0] || "?";

  const ringStyle = isCreator
    ? { boxShadow: `0 0 0 ${s.ring}`, borderRadius: "50%" }
    : {};

  return (
    <div
      className={cn("rounded-full flex-shrink-0 overflow-hidden", s.outer, className)}
      style={ringStyle}
    >
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.display_name || "avatar"}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className={cn(
          "w-full h-full rounded-full bg-gradient-to-br from-lavender to-sky flex items-center justify-center text-violet-700 font-bold",
          s.text
        )}>
          {letter.toUpperCase()}
        </div>
      )}
    </div>
  );
}