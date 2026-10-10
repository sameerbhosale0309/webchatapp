'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Disc, Radio, Terminal } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, initialized, initAuth } = useAuthStore();
  const [bootStep, setBootStep] = useState(1);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setBootStep(2), 400);
    const t2 = setTimeout(() => setBootStep(3), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (initialized) {
      if (user) {
        router.replace('/chat');
      } else {
        router.replace('/login');
      }
    }
  }, [user, initialized, router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-canvas p-4 overflow-hidden crt-overlay font-mono">
      {/* Chassis Corner Screws */}
      <div className="absolute top-4 left-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute top-4 right-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>
      <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full border border-dark-oxide bg-cassette-housing flex items-center justify-center text-[9px] text-dark-oxide font-bold">+</div>

      {/* <div className="w-full max-w-sm bg-dark-oxide text-paper-display p-6 border-4 border-chassis-sand rounded-sm shadow-2xl bevel-raised space-y-5">
        <div className="flex items-center justify-between border-b border-paper-display/20 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-magnetic-oxide animate-pulse" />
            <span className="font-bold tracking-widest text-sm uppercase">[DECK-84 OS v2.4]</span>
          </div>
          <span className="mechanical-counter">00:01</span>
        </div>

        <div className="flex items-center justify-center py-4">
          <Disc className="w-12 h-12 text-magnetic-oxide animate-tape-spool shadow-glow" />
        </div>

        {/* <div className="space-y-1.5 text-xs text-oxide-brown">
          <p className="flex items-center justify-between">
            <span>AZIMUTH CALIBRATION:</span>
            <span className="text-emerald-400 font-bold">LOCKED [120µs]</span>
          </p>
          <p className="flex items-center justify-between">
            <span>MAGNETIC BUFFER:</span>
            <span className="text-paper-display">{bootStep >= 2 ? 'SYNCHRONIZED' : 'INITIALIZING...'}</span>
          </p>
          <p className="flex items-center justify-between">
            <span>FREQUENCY BAND:</span>
            <span className="text-warning">{bootStep >= 3 ? '142.80 MHz OK' : 'SCANNING...'}</span>
          </p>
        </div> */}

      {/* <div className="pt-2 border-t border-paper-display/20 flex items-center justify-between text-[11px]">
          <span className="text-oxide-brown flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-magnetic-oxide" />
            BOOT SEQUENCE...
          </span>
          <span className="terminal-cursor" />
        </div>
      </div> */}
    </main>
  );
}