import { cn } from '@/lib/utils';
import { Disc } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  url?: string | null;
  initials?: string;
  gradient?: [string, string];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  presence?: 'online' | 'offline' | 'away' | null;
  alt?: string;
  className?: string;
  uploadProgress?: number | null;
  isUploading?: boolean;
}

const sizeMap = { xs: 26, sm: 32, md: 40, lg: 52, xl: 80 };
const dotSizeMap = { xs: 7, sm: 9, md: 11, lg: 13, xl: 16 };

export function Avatar({
  src,
  url,
  initials = '?',
  gradient,
  size = 'md',
  presence,
  alt = '',
  className,
  uploadProgress,
  isUploading,
}: AvatarProps) {
  const px = sizeMap[size];
  const dotPx = dotSizeMap[size];
  const imageUrl = src || url;

  const showProgress = isUploading || (uploadProgress !== undefined && uploadProgress !== null);
  const progressVal = Math.min(100, Math.max(0, uploadProgress ?? 0));

  return (
    <div className={cn("relative inline-block shrink-0", className)} style={{ width: px, height: px }}>
      <div 
        className="w-full h-full rounded-sm overflow-hidden border border-dark-oxide/50 bevel-recessed bg-dark-oxide flex items-center justify-center relative"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt || initials}
            style={{ width: px, height: px }}
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-mono font-bold text-paper-display uppercase bg-dark-oxide"
            style={{
              fontSize: px * 0.4,
              letterSpacing: '1px',
            }}
          >
            {initials.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Cyber-HiFi 0-100% Telemetry Upload Overlay */}
        {showProgress && (
          <div className="absolute inset-0 bg-dark-oxide/90 backdrop-blur-xs flex flex-col items-center justify-center p-1 z-20 font-mono crt-overlay">
            {/* Spinning Reel / Radar SVG Indicator */}
            <div className="relative flex items-center justify-center">
              <svg className="transform -rotate-90" style={{ width: Math.max(16, px * 0.65), height: Math.max(16, px * 0.65) }} viewBox="0 0 36 36">
                <path
                  className="text-oxide-brown/40"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-200 ease-out"
                  strokeDasharray={`${progressVal}, 100`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Disc className="w-3 h-3 text-magnetic-oxide animate-tape-spool absolute opacity-80" />
            </div>

            {/* Percentage Display Ticker */}
            <span
              className="font-extrabold text-paper-display tracking-tighter mt-0.5 mechanical-counter"
              style={{ fontSize: Math.max(8, px * 0.16) }}
            >
              {progressVal}%
            </span>
          </div>
        )}
      </div>

      {presence && !showProgress && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full p-0.5 bg-dark-oxide border border-paper-display/30"
          style={{ width: dotPx, height: dotPx }}
        >
          <span
            className={cn(
              'relative inline-flex h-full w-full rounded-full',
              presence === 'online' && 'led-bulb-green animate-pulse',
              presence === 'away' && 'led-bulb-amber',
              presence === 'offline' && 'bg-oxide-brown/60'
            )}
          />
        </span>
      )}
    </div>
  );
}