'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Disc, Radio } from 'lucide-react';
import { soundEffects } from '@/lib/soundEffects';

interface AudioPlayerProps {
  src: string;
  name?: string;
  isMe?: boolean;
}

export function AudioPlayer({ src, name = 'MAGNETIC_TAPE.DAT', isMe = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    soundEffects.playClick();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        console.error('Failed to play audio:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainSecs = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
  };

  return (
    <div className={`p-2.5 rounded-sm flex items-center gap-3 max-w-xs sm:max-w-sm border-2 border-dark-oxide bevel-raised shadow-md font-mono text-xs ${
      isMe ? 'bg-magnetic-oxide text-paper-display' : 'bg-chassis-sand text-dark-oxide'
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Spooling Cassette Reel Visualizer */}
      <div className="relative shrink-0 flex items-center justify-center">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-sm flex items-center justify-center border border-dark-oxide bevel-raised transition-transform active:scale-95 shadow-sm ${
            isPlaying
              ? 'bg-dark-oxide text-paper-display'
              : 'bg-cassette-housing text-dark-oxide hover:bg-paper-display'
          }`}
          title={isPlaying ? 'Pause Reel' : 'Play Tape'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
      </div>

      {/* Player Track Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold tracking-tight">
          <span className="flex items-center gap-1 truncate uppercase">
            <Disc className={`w-3.5 h-3.5 text-magnetic-oxide shrink-0 ${isPlaying ? 'animate-tape-spool' : ''}`} />
            <span className="truncate text-[10px]">{name}</span>
          </span>
          <span className="text-[10px] mechanical-counter shrink-0 ml-1">
            {formatTime(currentTime)}
          </span>
        </div>

        {/* Recessed Magnetic Track Scrubber */}
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-dark-oxide rounded-xs appearance-none cursor-pointer accent-paper-display bevel-recessed focus:outline-none"
          />
        </div>
      </div>

      {/* Soundwave VU Level indicator */}
      {isPlaying && (
        <div className="flex items-end gap-0.5 h-4 shrink-0">
          <span className="w-1 bg-paper-display rounded-xs animate-vu-meter-1" />
          <span className="w-1 bg-paper-display rounded-xs animate-vu-meter-2" />
          <span className="w-1 bg-paper-display rounded-xs animate-vu-meter-3" />
        </div>
      )}
    </div>
  );
}
