export type PlatformType = 'youtube' | 'instagram';
export type MediaType = 'video' | 'short' | 'reel' | 'post';

export interface VideoFormat {
  id: string;
  type: 'video';
  container: string; // e.g., 'mp4', 'webm'
  quality: string;   // e.g., '4K (2160p)', '1080p', '720p', '480p', '360p'
  resolution: string; // e.g. '3840x2160', '1920x1080'
  size: number | null; // bytes or null if unknown
  formattedSize: string | null; // e.g., '18.4 MB'
  available: boolean;
  recommended?: boolean;
}

export interface AudioFormat {
  id: string;
  type: 'audio';
  container: string; // e.g., 'mp3', 'm4a', 'aac'
  bitrate: string;   // e.g., '320 kbps', '192 kbps', 'Original'
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
  duration: number | null; // in seconds, null if image/post
  formattedDuration: string | null;
  originalUrl: string;
  formats: VideoFormat[];
  audioFormats: AudioFormat[];
}

export interface AnalyzeRequest {
  url: string;
}

export interface AnalyzeResponse {
  success: true;
  media: MediaMetadata;
}

export interface DownloadTokenRequest {
  mediaId: string;
  formatId: string;
}

export interface DownloadTokenResponse {
  success: true;
  token: string;
  expiresIn: number; // seconds
  streamUrl: string;
}

export interface DownloadTokenPayload {
  mediaId: string;
  formatId: string;
  platform: PlatformType;
  originalUrl: string;
  exp: number; // timestamp
}

export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
}
