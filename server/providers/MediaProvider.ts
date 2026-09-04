import { MediaMetadata, PlatformType } from '../types/index.js';

export interface StreamResult {
  stream: NodeJS.ReadableStream;
  filename: string;
  mimeType: string;
  contentLength?: number;
}

export interface MediaProvider {
  /**
   * Unique identifier for the provider (e.g., 'youtube', 'instagram').
   */
  readonly id: PlatformType;

  /**
   * Returns true if this provider supports analyzing the given normalized URL.
   */
  canHandle(url: string): boolean;

  /**
   * Analyzes the URL and returns verified media metadata, video formats, and audio formats.
   * Throws structured error if content is private, unavailable, or invalid.
   */
  analyzeUrl(url: string): Promise<MediaMetadata>;

  /**
   * Resolves and streams the requested format for the media.
   */
  getDownloadStream(mediaId: string, formatId: string, originalUrl: string): Promise<StreamResult>;
}
