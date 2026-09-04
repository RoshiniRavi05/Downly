export type AppState = 
  | 'idle'
  | 'analyzing'
  | 'ready'
  | 'preparing'
  | 'downloading'
  | 'completed'
  | 'error';

export type PlatformType = 'youtube' | 'instagram';
export type MediaType = 'video' | 'short' | 'reel' | 'post';

export interface VideoFormat {
  id: string;
  type: 'video';
  container: string;
  quality: string;
  resolution: string;
  size: number | null;
  formattedSize: string | null;
  available: boolean;
  recommended?: boolean;
}

export interface AudioFormat {
  id: string;
  type: 'audio';
  container: string;
  bitrate: string;
  size: number | null;
  formattedSize: string | null;
  available: boolean;
}

export interface MediaMetadata {
  id: string;
  platform: PlatformType;
  type: MediaType;
  title: string;
  creator: string;
  thumbnail: string;
  duration: number | null;
  formattedDuration: string | null;
  originalUrl: string;
  formats: VideoFormat[];
  audioFormats: AudioFormat[];
}

export interface AppError {
  code: string;
  message: string;
}
