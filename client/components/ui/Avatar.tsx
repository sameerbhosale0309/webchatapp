import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  url?: string | null;
  initials?: string;
  gradient?: [string, string];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  presence?: 'online' | 'offline' | 'away' | null;
  alt?: string;
  className?: string;
}

const sizeMap = { sm: 32, md: 40, lg: 56, xl: 88 };
const dotSizeMap = { sm: 8, md: 10, lg: 14, xl: 18 };

export function Avatar({ src, url, initials = '?', gradient, size = 'md', presence, alt = '', className }: AvatarProps) {
  const px = sizeMap[size];
  const dotPx = dotSizeMap[size];
  const imageUrl = src || url;

  return (
    <div className={cn("relative inline-block shrink-0", className)} style={{ width: px, height: px }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt || initials}
          style={{ width: px, height: px }}
          className="rounded-full object-cover shadow-sm"
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full font-display font-semibold text-white shadow-sm"
          style={{
            width: px,
            height: px,
            fontSize: px * 0.38,
            background: gradient
              ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
              : 'linear-gradient(135deg, #7C5CFC, #FF5CAA)',
          }}
        >
          {initials.slice(0, 2).toUpperCase()}
        </div>
      )}

      {presence && (
        <span
          className="absolute bottom-0 right-0 flex items-center justify-center rounded-full ring-2 ring-surface"
          style={{ width: dotPx, height: dotPx }}
        >
          <span
            className={cn(
              'relative inline-flex h-full w-full rounded-full',
              presence === 'online' && 'bg-emerald-500',
              presence === 'away' && 'bg-amber-500',
              presence === 'offline' && 'bg-gray-500'
            )}
          />
        </span>
      )}
    </div>
  );
}