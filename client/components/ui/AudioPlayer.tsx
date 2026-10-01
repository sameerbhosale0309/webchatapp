'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  name?: string;
  isMe?: boolean;
}

export function AudioPlayer({ src, name = 'Voice Note', isMe = false }: AudioPlayerProps) {
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
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainSecs = Math.floor(secs % 60);
    return `${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
  };

  return (
    <div className={`p-3 rounded-2xl flex items-center gap-3 max-w-xs sm:max-w-sm border backdrop-blur-md transition-all ${
      isMe ? 'bg-[#3A2C29] border-white/10 text-white' : 'bg-[#29201E] border-white/10 text-white'
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md ${
          isPlaying
            ? 'bg-[#EE673A] text-white shadow-[#EE673A]/40'
            : 'bg-white/10 text-white hover:bg-[#EE673A] hover:text-white'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Player Track Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/90">
          <span className="flex items-center gap-1 truncate">
            <Mic className="w-3.5 h-3.5 text-[#EE673A] inline shrink-0" />
            <span className="truncate">{name}</span>
          </span>
          <span className="text-[10px] text-text-tertiary flex-shrink-0 ml-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Waveform Scrubber */}
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#EE673A] focus:outline-none"
          />
        </div>
      </div>

      {/* Soundwave animation indicator */}
      {isPlaying && (
        <div className="flex items-center gap-0.5 h-4 flex-shrink-0">
          <span className="w-0.5 h-full bg-[#EE673A] animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
          <span className="w-0.5 h-3/4 bg-[#EE673A] animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
          <span className="w-0.5 h-full bg-[#EE673A] animate-bounce rounded-full" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
}
