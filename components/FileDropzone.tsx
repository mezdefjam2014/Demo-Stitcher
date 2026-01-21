import React, { useRef, useState } from 'react';
import { Upload, FileAudio } from 'lucide-react';

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesAdded, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(
        (file: File) => file.type.startsWith('audio/')
      );
      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter(
        (file: File) => file.type.startsWith('audio/')
      );
      onFilesAdded(validFiles);
    }
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer
        flex flex-col items-center justify-center
        h-52 rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
        ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800'
            : isDragging
            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 scale-[1.02] shadow-xl shadow-primary-500/10'
            : 'border-gray-300 bg-white hover:border-primary-400 hover:bg-gray-50/80 hover:shadow-lg dark:bg-slate-800 dark:border-slate-600 dark:hover:border-primary-500 dark:hover:bg-slate-750'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
      />
      
      <div className="z-10 flex flex-col items-center text-center p-6 space-y-4">
        <div className={`
            p-4 rounded-full transition-all duration-300
            ${isDragging 
                ? 'bg-primary-100 dark:bg-primary-900 rotate-12 scale-110' 
                : 'bg-gray-100 dark:bg-slate-700 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/50 group-hover:scale-110'}
        `}>
            {isDragging ? (
                <FileAudio className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            ) : (
                <Upload className="w-8 h-8 text-gray-500 dark:text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
            )}
        </div>
        <div className="space-y-1.5">
            <h3 className={`text-base font-semibold transition-colors ${isDragging ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                {isDragging ? 'Drop to Upload' : 'Click or Drag Audio Files'}
            </h3>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
                Supports MP3, WAV, AIFF
            </p>
        </div>
      </div>
    </div>
  );
};

export default FileDropzone;