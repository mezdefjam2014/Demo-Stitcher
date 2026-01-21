import React, { useState, useCallback } from 'react';
import { Download, Music, Wand2, Archive, CheckCircle, AudioWaveform, Settings2, Moon, Sun, Volume2, UploadCloud, RotateCcw, Loader2, X } from 'lucide-react';
import FileDropzone from './components/FileDropzone';
import TrackList from './components/TrackList';
import DemoPreview from './components/DemoPreview';
import { AudioTrack } from './types';
import { createDemoMix } from './services/audioService';
import JSZip from 'jszip';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [normalize, setNormalize] = useState(true); // Default to true now for HD quality
  const [demoWav, setDemoWav] = useState<string | null>(null);
  const [demoMp3, setDemoMp3] = useState<string | null>(null);
  const [blobs, setBlobs] = useState<{ wav: Blob, mp3: Blob } | null>(null);
  const [toast, setToast] = useState<{message: string, visible: boolean}>({ message: '', visible: false });
  
  // Tagging State
  const [tagFile, setTagFile] = useState<File | null>(null);
  const [tagInterval, setTagInterval] = useState<number>(30); // Default 30s
  const [isDraggingTag, setIsDraggingTag] = useState(false);

  // Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleFilesAdded = useCallback((files: File[]) => {
    const newTracks: AudioTrack[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      duration: 0,
      url: URL.createObjectURL(file),
    }));

    setTracks((prev) => [...prev, ...newTracks]);
    setDemoWav(null);
    setDemoMp3(null);
    setBlobs(null);
  }, []);

  const handleTagFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setTagFile(e.target.files[0]);
    }
  };

  const handleTagDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTag(true);
  };

  const handleTagDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTag(false);
  };

  const handleTagDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingTag(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/')) {
        setTagFile(file);
        showToast("Tag audio updated");
      }
    }
  };

  const handleRemoveTrack = (id: string) => {
    setTracks((prev) => {
        const trackToRemove = prev.find(t => t.id === id);
        if (trackToRemove) URL.revokeObjectURL(trackToRemove.url);
        return prev.filter((t) => t.id !== id);
    });
    setDemoWav(null);
    setDemoMp3(null);
    setBlobs(null);
  };

  const handleClearSession = () => {
    if (tracks.length > 0 || tagFile || demoWav) {
        if (!window.confirm("Are you sure you want to clear the entire session? This will remove all tracks, tags, and settings.")) {
            return;
        }
    }
    
    // Cleanup URLs to avoid memory leaks
    tracks.forEach(t => URL.revokeObjectURL(t.url));
    if (demoWav) URL.revokeObjectURL(demoWav);
    if (demoMp3) URL.revokeObjectURL(demoMp3);

    setTracks([]);
    setDemoWav(null);
    setDemoMp3(null);
    setBlobs(null);
    setTagFile(null);
    setTagInterval(30);
    setProgress(0);
    setNormalize(true); // Reset to default
    showToast("Session Cleared");
  };

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === tracks.length - 1)
    ) {
      return;
    }
    const newTracks = [...tracks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newTracks[index], newTracks[targetIndex]] = [newTracks[targetIndex], newTracks[index]];
    setTracks(newTracks);
    setDemoWav(null);
    setDemoMp3(null);
    setBlobs(null);
  };

  const handleCreateDemo = async () => {
    if (tracks.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setDemoWav(null);
    setDemoMp3(null);
    setBlobs(null);

    try {
      setTimeout(async () => {
        try {
            const { wav, mp3 } = await createDemoMix({
                tracks, 
                normalize, 
                onProgress: (p) => setProgress(p),
                tagFile,
                tagInterval
            });
            setDemoWav(URL.createObjectURL(wav));
            setDemoMp3(URL.createObjectURL(mp3));
            setBlobs({ wav, mp3 });
            showToast("Demo Render Complete");
        } catch (error) {
            console.error(error);
            alert("Error creating demo.");
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
      }, 50);
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!blobs) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
        const zip = new JSZip();
        zip.file("demo-reel.wav", blobs.wav);
        zip.file("demo-reel.mp3", blobs.mp3);
        
        // Generate zip with progress tracking
        // Using STORE compression for speed as audio is already large/compressed
        const zipContent = await zip.generateAsync(
            { 
                type: "blob", 
                compression: "STORE" 
            },
            (metadata) => {
                setDownloadProgress(metadata.percent);
            }
        );

        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipContent);
        link.download = "demo-reel-bundle.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay to let user see 100%
        setTimeout(() => {
            setIsDownloading(false);
            setDownloadProgress(0);
        }, 500);

    } catch (e) {
        console.error("Zip generation failed", e);
        alert("Failed to create download bundle");
        setIsDownloading(false);
    }
  };

  return (
    <div className={`${theme} min-h-screen`}>
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 font-sans pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-primary-600 text-white p-1.5 rounded-lg">
                    <AudioWaveform size={20} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Demo<span className="text-primary-600 dark:text-primary-400">Stitcher</span>
                </h1>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={handleClearSession}
                    title="Clear Session"
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <RotateCcw size={16} />
                    <span className="hidden sm:inline">Reset</span>
                </button>
                <div className="h-6 w-px bg-gray-200 dark:bg-slate-700"></div>
                <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[750px]">
            
            {/* LEFT COLUMN: Input & Playback */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                {/* Upload */}
                <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-1 transition-colors">
                    <FileDropzone onFilesAdded={handleFilesAdded} disabled={isProcessing || isDownloading} />
                </section>

                {/* Player */}
                <section className="flex-1 min-h-[280px]">
                    <DemoPreview demoUrl={demoWav} isProcessing={isProcessing} />
                </section>

                {/* Downloads */}
                <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 space-y-4 transition-colors">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Export</h3>
                        {blobs && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">READY</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <a
                            href={demoWav || '#'}
                            download="demo-reel.wav"
                            className={`
                                group flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-sm font-medium transition-all border
                                ${demoWav 
                                    ? 'bg-gray-900 dark:bg-slate-950 border-gray-900 dark:border-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-800 hover:shadow-lg' 
                                    : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed'}
                            `}
                            onClick={(e) => (!demoWav || isDownloading) && e.preventDefault()}
                        >
                            <span className="text-[10px] font-mono opacity-60">HQ</span>
                            <div className="flex items-center gap-1">
                                <Download size={14} /> WAV
                            </div>
                        </a>
                        <a
                            href={demoMp3 || '#'}
                            download="demo-reel.mp3"
                            className={`
                                group flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-sm font-medium transition-all border
                                ${demoMp3 
                                    ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-primary-200 dark:hover:border-primary-700 hover:text-primary-700 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-700' 
                                    : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed'}
                            `}
                            onClick={(e) => (!demoMp3 || isDownloading) && e.preventDefault()}
                        >
                            <span className="text-[10px] font-mono opacity-60">CMP</span>
                            <div className="flex items-center gap-1">
                                <Download size={14} /> MP3
                            </div>
                        </a>
                    </div>
                    <button
                        onClick={handleDownloadAll}
                        disabled={!blobs || isDownloading}
                        className={`
                            w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all
                            ${blobs && !isDownloading
                                ? 'text-primary-700 dark:text-primary-200 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:shadow-inner' 
                                : 'text-gray-300 dark:text-slate-600 bg-gray-50 dark:bg-slate-800 cursor-not-allowed'}
                        `}
                    >
                        <Archive size={16} />
                        Download Bundle (.zip)
                    </button>
                </section>
            </div>

            {/* CENTER/RIGHT COLUMN: List & Actions */}
            <div className="lg:col-span-8 flex flex-col lg:flex-row gap-6 h-full">
                
                {/* Track List - Takes up most space */}
                <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex-1 flex flex-col overflow-hidden relative transition-colors">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Music size={20} className="text-primary-500" />
                                Sequence
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                Drag and order your source files.
                            </p>
                        </div>
                        <div className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-bold border border-primary-100 dark:border-primary-800">
                            {tracks.length} / 20
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative -mr-2">
                        <TrackList 
                            tracks={tracks} 
                            onRemove={handleRemoveTrack}
                            onMoveUp={(i) => moveTrack(i, 'up')}
                            onMoveDown={(i) => moveTrack(i, 'down')}
                        />
                        {tracks.length > 5 && (
                             <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none"></div>
                        )}
                    </div>
                </section>

                {/* Settings & Action - Vertical Strip on Desktop */}
                <div className="lg:w-80 flex flex-col gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-y-auto custom-scrollbar transition-colors">
                        <div className="flex items-center gap-2 mb-6 text-gray-900 dark:text-white font-bold">
                             <Settings2 size={18} />
                             <h3>Studio Config</h3>
                        </div>
                        
                        <div className="space-y-6 flex-1">
                             {/* Parameters */}
                             <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Parameters</label>
                                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700 space-y-2">
                                    <div className="flex justify-between text-sm dark:text-slate-300">
                                        <span className="text-gray-600 dark:text-slate-400">Slice Length</span>
                                        <span className="font-mono font-medium">25s</span>
                                    </div>
                                    <div className="flex justify-between text-sm dark:text-slate-300">
                                        <span className="text-gray-600 dark:text-slate-400">Fade Out</span>
                                        <span className="font-mono font-medium">0.5s</span>
                                    </div>
                                </div>
                             </div>

                             {/* Audio Processing */}
                             <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Mastering</label>
                                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 transition-colors group">
                                    <div className="relative flex items-center pt-0.5">
                                        <input 
                                            type="checkbox" 
                                            checked={normalize}
                                            onChange={(e) => setNormalize(e.target.checked)}
                                            className="peer h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 group-hover:text-primary-700 dark:group-hover:text-primary-400">HD Leveling</span>
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 leading-tight mt-0.5">RMS Normalize + Dynamics Compressor for clean, loud mix.</span>
                                    </div>
                                </label>
                             </div>

                             {/* Audio Tagging */}
                             <div className="space-y-3">
                                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Voice Tag / Watermark</label>
                                
                                <div 
                                    onDragOver={handleTagDragOver}
                                    onDragLeave={handleTagDragLeave}
                                    onDrop={handleTagDrop}
                                    className={`
                                        p-3 rounded-lg border transition-all duration-200
                                        ${isDraggingTag 
                                            ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 border-dashed scale-[1.02]' 
                                            : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 border-solid'}
                                    `}
                                >
                                    {!tagFile ? (
                                        <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 dark:border-slate-600 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-750 transition-colors">
                                            <UploadCloud size={16} className={`transition-colors ${isDraggingTag ? 'text-primary-600' : 'text-gray-400 dark:text-slate-400'}`} />
                                            <span className={`text-xs font-medium ${isDraggingTag ? 'text-primary-700' : 'text-gray-500 dark:text-slate-400'}`}>
                                                {isDraggingTag ? 'Drop Tag Here' : 'Upload Tag Audio'}
                                            </span>
                                            <input type="file" accept="audio/*" className="hidden" onChange={handleTagFileSelect} />
                                        </label>
                                    ) : (
                                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-slate-700">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Volume2 size={14} className="text-primary-500 flex-shrink-0" />
                                                <span className="text-xs font-medium truncate dark:text-slate-300" title={tagFile.name}>{tagFile.name}</span>
                                            </div>
                                            <button onClick={() => setTagFile(null)} className="text-xs text-red-400 hover:text-red-500 px-1">✕</button>
                                        </div>
                                    )}

                                    {tagFile && (
                                        <div className="mt-3 space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 dark:text-slate-400">Interval</span>
                                                <span className="font-mono text-primary-600 dark:text-primary-400 font-bold">{tagInterval}s</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="10" 
                                                max="60" 
                                                step="5"
                                                value={tagInterval}
                                                onChange={(e) => setTagInterval(Number(e.target.value))}
                                                className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                            />
                                            <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-600">
                                                <span>10s</span>
                                                <span>60s</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>

                        <div className="mt-8 relative">
                             <button 
                                onClick={handleCreateDemo}
                                disabled={tracks.length === 0 || isProcessing}
                                className={`
                                    w-full py-4 px-6 rounded-xl font-bold text-white shadow-xl
                                    flex items-center justify-center gap-2 transition-all transform z-10 relative overflow-hidden
                                    ${tracks.length > 0 && !isProcessing
                                        ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 hover:scale-[1.02] active:scale-[0.98] shadow-primary-500/30' 
                                        : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'}
                                `}
                            >
                                {isProcessing ? (
                                    <>
                                       <Wand2 className="animate-spin w-5 h-5" /> 
                                       <span className="font-mono">{progress}%</span>
                                    </>
                                ) : (
                                    <>
                                        RENDER DEMO
                                    </>
                                )}
                                
                                {isProcessing && (
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-200"
                                        style={{ width: `${progress}%` }}
                                    />
                                )}
                            </button>
                             {tracks.length === 0 && (
                                <p className="text-center text-[10px] text-gray-400 dark:text-slate-500 mt-3">
                                    Add at least 1 track to render
                                </p>
                             )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </main>

      {/* Downloading Overlay */}
      {isDownloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl max-w-sm w-full border border-gray-100 dark:border-slate-800 text-center space-y-4 mx-4">
                <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Archive className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Preparing Download...</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Compressing your audio bundle. <br/> Please wait a moment.
                </p>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                        className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${downloadProgress}%` }}
                    ></div>
                </div>
                <div className="text-xs font-mono text-gray-400 dark:text-slate-500">
                    {downloadProgress.toFixed(0)}% Complete
                </div>
            </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-8 right-8 z-50 animate-slide-up">
            <div className="bg-gray-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-gray-900 px-5 py-4 rounded-xl shadow-2xl flex items-center space-x-3 border border-white/10 dark:border-black/5">
                <CheckCircle className="text-green-400 dark:text-green-600 w-5 h-5" />
                <span className="font-medium text-sm tracking-wide">{toast.message}</span>
            </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default App;