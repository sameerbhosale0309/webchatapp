'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Radio } from 'lucide-react';
import { useToastStore, ToastVariant } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

const iconMap: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const badgeColorMap: Record<ToastVariant, string> = {
  success: 'bg-emerald-600 text-white border-emerald-400',
  error: 'bg-danger text-white border-red-400',
  info: 'bg-magnetic-oxide text-paper-display border-magnetic-oxide',
  warning: 'bg-warning text-dark-oxide border-amber-300',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[100] flex w-[calc(100%-1.5rem)] sm:w-full max-w-sm flex-col gap-2 pointer-events-none"
      aria-live="polite"
      role="region"
      aria-label="Telemetry Notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.variant];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="relative bg-dark-oxide text-paper-display rounded-sm p-3 border-2 border-dark-oxide shadow-2xl bevel-raised flex items-start gap-3 font-mono text-xs crt-overlay pointer-events-auto"
            >
              {/* LED Tally Glow Lamp */}
              <div className="mt-0.5 relative shrink-0">
                <span className={cn("w-2.5 h-2.5 rounded-full inline-block border shadow-md", badgeColorMap[toast.variant])} />
                <span className="absolute -inset-0.5 rounded-full bg-current opacity-40 blur-xs animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-oxide-brown">
                  <Radio className="w-3 h-3 text-magnetic-oxide animate-pulse" />
                  {/* <span>TELEMETRY PING // TALLY-{toast.id.slice(-4).toUpperCase()}</span> */}
                </div>
                <p className="font-bold text-paper-display mt-0.5 tracking-wide">{toast.title}</p>
                {toast.description && (
                  <p className="text-[11px] text-oxide-brown/90 mt-0.5 break-words">{toast.description}</p>
                )}
              </div>

              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="text-oxide-brown hover:text-paper-display p-0.5 rounded-sm bg-cassette-housing/20 border border-white/10 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}