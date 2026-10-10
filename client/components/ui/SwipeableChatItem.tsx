'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Pin, PinOff, Heart } from 'lucide-react';

interface SwipeableChatItemProps {
  isPinned: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  children: React.ReactNode;
}

export function SwipeableChatItem({
  isPinned,
  isFavorite,
  onSelect,
  onTogglePin,
  onToggleFavorite,
  children,
}: SwipeableChatItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.x;
    if (offset < -40) {
      // Swiped Left -> Reveal Pin action
      setSwipeOffset(-85);
    } else if (offset > 40) {
      // Swiped Right -> Reveal Favorite action
      setSwipeOffset(85);
    } else {
      setSwipeOffset(0);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl my-1.5 group select-none touch-pan-y">
      {/* LEFT ACTION LAYER (Revealed on Swipe Right -> Favorite) */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-rose-600 via-pink-500 to-[#EE673A] text-white flex items-center justify-start pl-4 rounded-2xl z-0 shadow-inner">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
            setSwipeOffset(0);
          }}
          className="flex flex-col items-center justify-center gap-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-white text-white' : 'text-white'}`} />
          <span className="text-[10px] font-bold tracking-tight">{isFavorite ? 'Unfav' : 'Favorite'}</span>
        </button>
      </div>

      {/* RIGHT ACTION LAYER (Revealed on Swipe Left -> Pin) */}
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#EE673A] via-[#F57C48] to-[#FF8A64] text-white flex items-center justify-end pr-4 rounded-2xl z-0 shadow-inner">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
            setSwipeOffset(0);
          }}
          className="flex flex-col items-center justify-center gap-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          title={isPinned ? 'Unpin Chat' : 'Pin Chat'}
        >
          {isPinned ? <PinOff className="w-5 h-5 text-white" /> : <Pin className="w-5 h-5 text-white" />}
          <span className="text-[10px] font-bold tracking-tight">{isPinned ? 'Unpin' : 'Pin Chat'}</span>
        </button>
      </div>

      {/* MAIN CHAT ITEM CARD */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -90, right: 90 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        onClick={() => {
          if (swipeOffset !== 0) {
            setSwipeOffset(0);
          } else {
            onSelect();
          }
        }}
        className="relative z-10 bg-surface w-full rounded-2xl cursor-pointer"
      >
        {children}
      </motion.div>
    </div>
  );
}
