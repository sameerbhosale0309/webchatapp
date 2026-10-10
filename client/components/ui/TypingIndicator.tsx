'use client';

import React from 'react';
import { Avatar } from './Avatar';

interface TypingIndicatorProps {
  typingUsers: string[];
  avatar?: string;
}

export function TypingDots() {
  return (
    <span className="inline-flex items-end gap-1 h-3.5 px-1 py-0.5 bg-dark-oxide rounded-sm border border-black/50 bevel-recessed" title="Audio Frequency Modulation Activity">
      <span className="w-1 bg-magnetic-oxide rounded-xs animate-vu-meter-1 shadow-glow" />
      <span className="w-1 bg-magnetic-oxide rounded-xs animate-vu-meter-2 shadow-glow" />
      <span className="w-1 bg-magnetic-oxide rounded-xs animate-vu-meter-3 shadow-glow" />
    </span>
  );
}

export function TypingIndicator({ typingUsers, avatar }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const displayName =
    typingUsers.length === 1
      ? typingUsers[0]
      : typingUsers.length === 2
      ? `${typingUsers[0]} & ${typingUsers[1]}`
      : `${typingUsers[0]} + ${typingUsers.length - 1} OTRS`;

  return (
    <div className="flex flex-col items-start my-2 animate-whoosh">
      <div className="flex items-center gap-2 bg-chassis-sand px-2.5 py-1.5 rounded-sm border border-dark-oxide/40 bevel-raised shadow-sm font-mono text-xs">
        <Avatar
          initials={displayName.slice(0, 2)}
          src={avatar}
          size="xs"
          className="shrink-0"
        />
        <div className="flex items-center gap-2">
          <span className="font-bold text-dark-oxide uppercase tracking-wider text-[11px]">
            [{displayName.toUpperCase()}]
          </span>
          <span className="text-oxide-brown text-[10px] uppercase tracking-widest">TRANSMITTING...</span>
          <TypingDots />
        </div>
      </div>
    </div>
  );
}
