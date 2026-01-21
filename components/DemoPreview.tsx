import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Square, RefreshCw, AudioLines } from 'lucide-react';

interface DemoPreviewProps {
  demoUrl: string | null;
  isProcessing: boolean;
}

const DemoPreview: React.FC<DemoPreviewProps> = ({ demoUrl, isProcessing }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!demoUrl) {
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);
    }
  }, [demoUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !demoUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stopPlay = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      if (total) {
        setProgress((current / total) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!demoUrl || !audioRef.current || !progressBarRef.current || isProcessing) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setProgress(percentage * 100);
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-2xl border border-slate-700 h-full flex flex-col justify-between relative overflow-hidden group">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-32 bg-primary-900/20 blur-[80px] rounded-full pointer-events-none"></div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary-400 mb-1 flex items-center gap-2">
            <AudioLines size={14} /> Master Output
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">
            44.1kHz • 16-bit WAV
            </p>
        </div>
        {demoUrl && (
             <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400 font-bold uppercase tracking-wider">
                Ready
             </div>
        )}
      </div>

      <div className="flex flex-col space-y-5 my-4 relative z-10">
        {demoUrl && (
          <audio
            ref={audioRef}
            src={demoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            className="hidden"
          />
        )}

        {/* Interactive Progress Bar */}
        <div 
            ref={progressBarRef}
            onClick={handleSeek}
            className={`
                w-full h-20 bg-slate-950 rounded-lg flex items-center justify-center relative overflow-hidden border border-slate-800
                ${demoUrl && !isProcessing ? 'cursor-pointer hover:border-slate-600 transition-colors' : 'cursor-default'}
            `}
        >
            {!demoUrl && !isProcessing && (
                <div className="text-center">
                    <span className="text-xs font-mono text-slate-600">NO SIGNAL</span>
                </div>
            )}
            
            {isProcessing && (
                <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin text-primary-500 w-5 h-5" />
                    <span className="text-xs text-primary-400 font-mono tracking-wide">RENDERING...</span>
                </div>
            )}

            {demoUrl && (
                <>
                    {/* Fake waveform bars */}
                    <div className="absolute inset-0 flex items-end justify-between px-1 py-4 opacity-50 pointer-events-none gap-[2px]">
                        {Array.from({ length: 48 }).map((_, i) => (
                             <div 
                                key={i} 
                                className="w-full bg-slate-700 rounded-t-sm transition-all duration-300 ease-in-out" 
                                style={{ 
                                    height: isPlaying ? `${Math.random() * 60 + 20}%` : '20%',
                                    opacity: isPlaying ? 1 : 0.5
                                }}
                             ></div>
                        ))}
                    </div>
                     
                     {/* Progress Fill (Gradient) */}
                     <div 
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary-900/30 to-primary-600/30 backdrop-blur-[1px] pointer-events-none transition-all duration-75 linear border-r border-primary-400/50"
                        style={{ width: `${progress}%` }}
                     />
                </>
            )}
        </div>
        
        <div className="flex justify-between text-xs text-slate-400 font-mono tracking-tight">
            <span>{formatTime(duration * (progress/100) || 0)}</span>
            <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-8">
          <button
            onClick={stopPlay}
            disabled={!demoUrl}
            className="group/stop p-3 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-colors"
          >
            <Square size={18} fill="currentColor" className="group-hover/stop:text-red-400 transition-colors" />
          </button>
          
          <button
            onClick={togglePlay}
            disabled={!demoUrl}
            className={`
                p-5 rounded-full text-white shadow-xl shadow-primary-900/40 transition-all duration-300
                ${!demoUrl 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                    : 'bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 hover:scale-105 hover:shadow-glow active:scale-95'}
            `}
          >
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoPreview;