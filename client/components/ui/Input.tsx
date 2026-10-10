'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  playSound?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, playSound = false, onChange, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (playSound) {
        import('@/lib/soundEffects').then(({ soundEffects }) => soundEffects.playTyping()).catch(() => {});
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-dark-oxide font-display flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-magnetic-oxide rounded-full inline-block" />
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            id={inputId}
            ref={ref}
            onChange={handleChange}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              'h-9 rounded-sm border border-dark-oxide/40 bg-paper-display px-3 text-xs font-mono text-dark-oxide bevel-recessed',
              'placeholder:text-oxide-brown/70 transition-all duration-100',
              'focus:border-magnetic-oxide focus:outline-none focus:ring-1 focus:ring-magnetic-oxide',
              error && 'border-danger focus:border-danger focus:ring-danger/30',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-[11px] font-mono text-danger font-semibold">
            [ERR: {error}]
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';