'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Disc } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;

    if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
      dialogRef.current.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-dark-oxide/80 backdrop-blur-xs crt-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className={cn(
              'relative z-10 w-full max-w-md bg-chassis-sand border-2 border-dark-oxide rounded-sm p-5 shadow-2xl bevel-raised',
              className
            )}
          >
            {/* Corner metallic chassis screws */}
            <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-dark-oxide/60 bg-cassette-housing flex items-center justify-center text-[8px] text-dark-oxide font-bold">+</div>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full border border-dark-oxide/60 bg-cassette-housing flex items-center justify-center text-[8px] text-dark-oxide font-bold">+</div>
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-dark-oxide/60 bg-cassette-housing flex items-center justify-center text-[8px] text-dark-oxide font-bold">+</div>
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-dark-oxide/60 bg-cassette-housing flex items-center justify-center text-[8px] text-dark-oxide font-bold">+</div>

            {title && (
              <div className="mb-4 pb-2 border-b border-dark-oxide/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Disc className="w-4 h-4 text-magnetic-oxide animate-tape-spool" />
                  <h2 className="font-display text-sm font-bold tracking-wider text-dark-oxide uppercase">
                    [ {title}]
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="p-1 rounded-sm bg-cassette-housing border border-dark-oxide/40 text-dark-oxide hover:bg-magnetic-oxide hover:text-paper-display bevel-raised transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}