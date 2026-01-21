import React, { useState, useEffect, useRef } from 'react';
import { AudioTrack } from '../types';
import { Trash2, ArrowUp, ArrowDown, Play, Pause, Music2 } from 'lucide-react';

interface TrackListProps {
  tracks: AudioTrack[];
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const TrackList: React.FC<TrackListProps> = ({ tracks, onRemove, onMoveUp, onMoveDown }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio on unmount or when playingId changes to null
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayToggle = (track: AudioTrack) => {
    if (playingId === track.id) {
      // Stop
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      // Play new
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(track.url);
      audio.onended = () => setPlayingId(null);
      audio.play().catch(e => console.error("Preview play failed", e));
      audioRef.current = audio;
      setPlayingId(track.id);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-12 border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50">
        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Music2 className="w-8 h-8 text-gray-300 dark:text-slate-600" />
        </div>
        <p className="text-center font-medium text-gray-500 dark:text-slate-400">
          Your track list is empty.
        </p>
        <p className="text-sm text-gray-400 dark:text-slate-600 mt-1">
          Upload audio files to start arranging.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 h-full overflow-y-auto pr-2 custom-scrollbar">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #334155;
        }
      `}</style>
      {tracks.map((track, index) => (
        <div
          key={track.id}
          className={`
            relative group flex items-center justify-between p-3 rounded-xl border
            transition-all duration-200
            ${playingId === track.id 
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 shadow-sm' 
                : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-md hover:shadow-gray-100 dark:hover:shadow-none'}
          `}
        >
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <span className={`
                flex-shrink-0 font-mono text-xs w-6 text-center
                ${playingId === track.id ? 'text-primary-600 dark:text-primary-300 font-bold' : 'text-gray-400 dark:text-slate-500'}
            `}>
              {(index + 1).toString().padStart(2, '0')}
            </span>
            
            <button
              onClick={() => handlePlayToggle(track)}
              className={`
                flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
                ${playingId === track.id 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105' 
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-primary-500 hover:text-white dark:hover:bg-primary-600 dark:hover:text-white'}
              `}
              aria-label={playingId === track.id ? "Stop preview" : "Play preview"}
            >
              {playingId === track.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate transition-colors ${playingId === track.id ? 'text-primary-900 dark:text-primary-100' : 'text-gray-700 dark:text-slate-200'}`} title={track.name}>
                {track.name}
              </p>
              <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded">
                     WAV
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                    {(track.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-4 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity">
             <div className="flex flex-col gap-[2px]">
                <button
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-700 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                    title="Move Up"
                >
                    <ArrowUp size={14} strokeWidth={2.5} />
                </button>
                <button
                    onClick={() => onMoveDown(index)}
                    disabled={index === tracks.length - 1}
                    className="p-1 text-gray-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-700 rounded disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                    title="Move Down"
                >
                    <ArrowDown size={14} strokeWidth={2.5} />
                </button>
             </div>
            
            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2"></div>

            <button
              onClick={() => onRemove(track.id)}
              className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Remove track"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrackList;