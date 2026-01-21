import { AudioTrack } from '../types';

/**
 * Decodes an audio file into an AudioBuffer.
 */
const decodeAudio = async (file: File, context: AudioContext): Promise<AudioBuffer> => {
  const arrayBuffer = await file.arrayBuffer();
  return await context.decodeAudioData(arrayBuffer);
};

/**
 * Calculates the RMS (Root Mean Square) amplitude of a buffer.
 * Used for perceptual loudness.
 */
const calculateRMS = (buffer: AudioBuffer): number => {
  let sum = 0;
  // Sample only the first channel for speed approximation or average all channels
  const data = buffer.getChannelData(0);
  // Optimization: Sample every 4th sample to save processing time on large files
  const step = 4; 
  for (let i = 0; i < data.length; i += step) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / (data.length / step));
};

/**
 * Encodes AudioBuffer to WAV format.
 */
const bufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this example)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true); // write 16-bit sample
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};

interface CreateDemoOptions {
  tracks: AudioTrack[];
  normalize?: boolean;
  onProgress?: (percent: number) => void;
  segmentDuration?: number;
  fadeDuration?: number;
  silenceGap?: number;
  tagFile?: File | null;
  tagInterval?: number; // in seconds
}

/**
 * Main function to stitch audio tracks.
 */
export const createDemoMix = async ({
  tracks,
  normalize = false,
  onProgress,
  segmentDuration = 25,
  fadeDuration = 0.5,
  silenceGap = 0.3,
  tagFile = null,
  tagInterval = 30
}: CreateDemoOptions): Promise<{ wav: Blob; mp3: Blob }> => {
  if (tracks.length === 0) {
    throw new Error('No tracks provided');
  }

  onProgress?.(5); // Started

  // 1. Setup Context
  const sampleRate = 44100;
  const tempContext = new AudioContext({ sampleRate });

  // 2. Decode all music files
  const decodedBuffers: AudioBuffer[] = [];
  const totalTracks = tracks.length;
  
  for (let i = 0; i < totalTracks; i++) {
    const track = tracks[i];
    try {
      onProgress?.(10 + Math.floor((i / totalTracks) * 30)); // Progress 10% -> 40%
      const buffer = await decodeAudio(track.file, tempContext);
      decodedBuffers.push(buffer);
    } catch (e) {
      console.error(`Failed to decode ${track.name}`, e);
      throw new Error(`Could not decode audio file: ${track.name}`);
    }
  }

  // 2.5 Decode Tag File if exists
  let tagBuffer: AudioBuffer | null = null;
  if (tagFile) {
    try {
        tagBuffer = await decodeAudio(tagFile, tempContext);
    } catch (e) {
        console.warn("Failed to decode tag file, proceeding without tags.");
    }
  }

  tempContext.close();
  
  onProgress?.(45); // Decoding done

  // 3. Pre-process for Normalization (RMS Leveling)
  // If normalizing, we calculate gain adjustments to make them perceptually similar
  const gainAdjustments: number[] = new Array(decodedBuffers.length).fill(1);
  
  if (normalize) {
    // Target RMS around -12dB to -14dB typically, 
    // but here we just want to match the "average loud" track or a fixed constant.
    // Let's assume a target RMS of 0.15 (approx -16dBFS) for headroom before compression
    const TARGET_RMS = 0.15;
    
    decodedBuffers.forEach((buffer, idx) => {
        const rms = calculateRMS(buffer);
        if (rms > 0) {
            // Calculate ratio to reach target, but clamp it so we don't boost silence too much
            let ratio = TARGET_RMS / rms;
            ratio = Math.min(Math.max(ratio, 0.5), 3.0); // Limit gain changes between 0.5x and 3x
            gainAdjustments[idx] = ratio;
        }
    });
  }

  // 4. Calculate effective timeline
  let totalOutputDuration = 0;
  const trackDurations: number[] = [];

  decodedBuffers.forEach((buffer, index) => {
    // If track is shorter than limit (25s), use its full length. Otherwise clamp to 25s.
    const playDuration = Math.min(buffer.duration, segmentDuration);
    trackDurations.push(playDuration);
    
    totalOutputDuration += playDuration;
    
    // Add silence after every track except the last one
    if (index < decodedBuffers.length - 1) {
        totalOutputDuration += silenceGap;
    }
  });

  // 5. Create Offline Context for Rendering
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalOutputDuration), sampleRate);

  // 5a. Create Master Chain (Dynamics Compressor for "HD" Glue)
  // This prevents clipping and glues the tracks together
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -20; // Start compressing at -20dB
  compressor.knee.value = 10; // Soft knee
  compressor.ratio.value = 4; // 4:1 compression ratio (standard for mastering)
  compressor.attack.value = 0.003; // Fast attack
  compressor.release.value = 0.25; // 250ms release
  
  // Limiter stage (simple gain clamp prevention) handled by compressor somewhat, 
  // but we connect compressor to destination.
  compressor.connect(offlineCtx.destination);

  // 6. Schedule Tracks
  let cursor = 0;

  decodedBuffers.forEach((buffer, index) => {
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const gainNode = offlineCtx.createGain();
    
    // Apply RMS Normalization Gain
    if (normalize) {
        gainNode.gain.value = gainAdjustments[index];
    }

    source.connect(gainNode);
    gainNode.connect(compressor); // Connect to Master Compressor

    const playDuration = trackDurations[index];
    const startTime = cursor;
    const endTime = startTime + playDuration;

    // Start playback
    source.start(startTime);
    source.stop(endTime);

    // Apply Fade Out
    const fadeStartTime = Math.max(startTime, endTime - fadeDuration);
    
    // We need to use setValueAtTime because of the gain adjustment
    const initialGain = normalize ? gainAdjustments[index] : 1.0;
    
    gainNode.gain.setValueAtTime(initialGain, fadeStartTime);
    gainNode.gain.linearRampToValueAtTime(0, endTime);

    // Move cursor: Duration of this clip + Silence Gap
    cursor += playDuration + silenceGap;
  });

  // 7. Schedule Tags / Watermarks
  if (tagBuffer && tagInterval > 0) {
    const tagDuration = tagBuffer.duration;
    // Start slightly after the beginning
    let tagCursor = 2; // First tag at 2 seconds? Or at tagInterval? Let's stick to interval.
    
    // Actually, usually you want one near start.
    tagCursor = Math.min(5, totalOutputDuration / 2); 

    while (tagCursor < totalOutputDuration) {
        const tagSource = offlineCtx.createBufferSource();
        tagSource.buffer = tagBuffer;
        
        const tagGain = offlineCtx.createGain();
        tagGain.gain.value = 0.4; // Tags shouldn't destroy the ears, keep it background-ish
        
        tagSource.connect(tagGain);
        tagGain.connect(compressor); // Run tags through compressor too so they sit IN the mix
        
        tagSource.start(tagCursor);
        
        tagCursor += tagInterval;
    }
  }

  onProgress?.(60); // Scheduling done, starting render

  // 8. Render
  const renderedBuffer = await offlineCtx.startRendering();

  onProgress?.(80); // Rendering done
  // Note: normalization happened Pre-render via Gain nodes and Post-render via Compressor

  onProgress?.(90);

  // 9. Convert to Blobs
  const wavBlob = bufferToWav(renderedBuffer);
  
  onProgress?.(100); // Done

  return { wav: wavBlob, mp3: wavBlob };
};