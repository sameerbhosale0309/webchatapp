import { cn } from '@/lib/utils';
import { Disc } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  url?: string | null;
  initials?: string;
  gradient?: [string, string];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  presence?: 'online' | 'offline' | 'away' | null;
  alt?: string;
  className?: string;
  uploadProgress?: number | null;
  isUploading?: boolean;
}

const sizeMap = { xs: 26, sm: 32, md: 40, lg: 52, xl: 80, '2xl': 104 };
const dotSizeMap = { xs: 7, sm: 9, md: 11, lg: 13, xl: 16, '2xl': 20 };

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
  const progressVal = Math.min(100, Math.max(0, Math.round(uploadProgress ?? 0)));
  const ringSize = Math.max(22, Math.min(px - 12, Math.round(px * 0.72)));

  return (
    <div
      className={cn("relative inline-block shrink-0 select-none", className)}
      style={{ width: px, height: px }}
    >
      <div 
        className="w-full h-full rounded-sm overflow-hidden border border-dark-oxide/50 bevel-recessed bg-dark-oxide relative flex items-center justify-center"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt || initials}
            className="w-full h-full object-cover block"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-mono font-bold text-paper-display uppercase bg-dark-oxide select-none"
            style={{
              fontSize: px * 0.38,
              letterSpacing: '1px',
            }}
          >
            {initials.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Centered High-Precision Telemetry Upload Overlay */}
        {showProgress && (
          <div
            className="!absolute inset-0 bg-dark-oxide/85 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 font-mono pointer-events-none p-1"
          >
            {/* Spinning Reel / Circular Gauge Ring */}
            <div className="relative flex items-center justify-center shrink-0" style={{ width: ringSize, height: ringSize }}>
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/20"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-150 ease-out"
                  strokeDasharray={`${progressVal}, 100`}
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(45, 224, 160, 0.75))' }}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              {/* Inside the Ring: Centered Percentage */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                {px >= 40 ? (
                  <span
                    className="font-extrabold text-white font-mono leading-none tracking-tight"
                    style={{
                      fontSize: Math.max(9, Math.round(ringSize * 0.28)),
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}
                  >
                    {progressVal}%
                  </span>
                ) : (
                  <Disc className="w-3 h-3 text-emerald-400 animate-tape-spool" />
                )}
              </div>
            </div>

            {/* Small status indicator when avatar size is large enough */}
            {px >= 64 && (
              <span className="text-[8px] font-bold text-emerald-400 font-mono tracking-widest uppercase mt-1 flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full led-bulb-green animate-pulse" />
                SYNCING
              </span>
            )}
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