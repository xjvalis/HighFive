import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Reusable avatar component — shows photo or initial, optionally clickable to profile.
 * Props:
 *   profile: { avatar_url, display_name, user_email }
 *   email: fallback email for initial
 *   name: display name
 *   avatarUrl: direct avatar URL
 *   size: 'xs'(24px) | 'sm'(28px) | 'md'(32px) | 'lg'(40px) | 'xl'(56px)
 *   showName: show "Jan V." next to avatar
 *   clickable: navigate to /profile?email=... on click
 *   className: extra classes
 */
export default function UserAvatar({
  profile,
  email,
  name,
  avatarUrl,
  size = 'md',
  showName = false,
  clickable = false,
  className,
}) {
  const navigate = useNavigate();

  const resolvedUrl = avatarUrl || profile?.avatar_url;
  const resolvedName = name || profile?.display_name || email || profile?.user_email || '?';
  const resolvedEmail = email || profile?.user_email;
  const initial = resolvedName?.[0]?.toUpperCase() || '?';

  const sizes = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-xl',
  };

  const handleClick = () => {
    if (!clickable || !resolvedEmail) return;
    navigate(`/user/${encodeURIComponent(resolvedEmail)}`);
  };

  const avatar = (
    <div
      onClick={clickable ? handleClick : undefined}
      title={resolvedName}
      className={cn(
        'rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center bg-lavender text-violet-700 font-bold',
        sizes[size],
        clickable && resolvedEmail && 'cursor-pointer hover:ring-2 hover:ring-primary transition-all',
        className
      )}
    >
      {resolvedUrl
        ? <img src={resolvedUrl} alt={resolvedName} className="w-full h-full object-cover"/>
        : <span>{initial}</span>
      }
    </div>
  );

  if (!showName) return avatar;

  return (
    <div className="flex items-center gap-2">
      {avatar}
      <span className="text-xs font-medium text-foreground/80">{resolvedName}</span>
    </div>
  );
}
