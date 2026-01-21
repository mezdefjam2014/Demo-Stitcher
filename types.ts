export interface AudioTrack {
  id: string;
  file: File;
  name: string;
  duration: number; // in seconds
  url: string; // Blob URL for preview
}

export interface ProcessingOptions {
  segmentDuration: number;
  fadeDuration: number;
}
