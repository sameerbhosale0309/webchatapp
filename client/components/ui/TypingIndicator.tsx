'use client';

import React from 'react';
import { Avatar } from './Avatar';

interface TypingIndicatorProps {
  typingUsers: string[];
  avatar?: string;
}

export function TypingDots({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dotClass = size === 'sm' ? 'typing-dot-sm' : 'typing-dot';
  return (
    <span className="inline-flex items-center gap-1 px-0.5 py-0.5" title="Typing...">
      <span className={dotClass} />
      <span className={dotClass} />
      <span className={dotClass} />
    </span>
  );
}

export function TypingIndicator({ typingUsers, avatar }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const displayName =
    typingUsers.length === 1
      ? typingUsers[0]
      : typingUsers.length === 2
      ? `${typingUsers[0]} and ${typingUsers[1]}`
      : `${typingUsers[0]} and ${typingUsers.length - 1} others`;

  return (
    <div className="flex flex-col items-start group relative my-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="flex items-end gap-2">
        <Avatar
          initials={displayName.slice(0, 2)}
          src={avatar}
          size="xs"
          className="mb-0.5 border border-[#EE673A]/60 rounded-md shadow-sm shrink-0"
        />
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] ml-0.5 flex items-center gap-1">
            <span className="font-semibold text-[#EE673A]">{displayName}</span>
            <span className="text-text-tertiary font-normal">is typing...</span>
          </div>

          {/* Compact Mini Pill Bubble matching reference design */}
          <div className="relative rounded-[14px] rounded-bl-[2px] px-2.5 py-1 bg-surface border border-subtle shadow-md flex items-center justify-center min-w-[50px] h-[26px]">
            {/* Top-left curved theme highlight border */}
            <div className="absolute inset-0 rounded-[14px] rounded-bl-[2px] border-t-[1.5px] border-l-[1.5px] border-[#EE673A] pointer-events-none opacity-90" />
            <TypingDots size="md" />
          </div>
        </div>
      </div>
    </div>
  );
}
