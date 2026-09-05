import os from 'os';
import path from 'path';
import fs from 'fs';
import { execFile, execSync, spawn } from 'child_process';
import { Readable } from 'stream';
import { StreamResult } from '../providers/MediaProvider';
import { fetchRemoteStream } from './streamHelper';

const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const BASE_BIN_DIR = isVercel
  ? path.join(os.tmpdir(), 'downly-bin')
  : path.join(process.cwd(), 'server', 'bin');

const BIN_PATH_WIN = path.join(BASE_BIN_DIR, 'yt-dlp.exe');
const BIN_PATH_NIX = path.join(BASE_BIN_DIR, 'yt-dlp');

export interface YtDlpFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  height?: number;
  width?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  format_note?: string;
  url?: string;
}

export interface YtDlpInfo {
  id: string;
  title: string;
  uploader?: string;
  channel?: string;
  uploader_id?: string;
  thumbnail?: string;
  duration?: number;
  webpage_url?: string;
  formats?: YtDlpFormat[];
  extractor?: string;
}

class YtDlpService {
  private ensureBinary(): void {
    const isWin = process.platform === 'win32';
    const targetFile = isWin ? BIN_PATH_WIN : BIN_PATH_NIX;

    if (!fs.existsSync(targetFile)) {
      try {
        if (!fs.existsSync(BASE_BIN_DIR)) {
          fs.mkdirSync(BASE_BIN_DIR, { recursive: true });
        }
        const downloadUrl = isWin
          ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
          : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

        console.log(`[YtDlpService] Downloading binary to ${targetFile}...`);
        const cmd = isWin
          ? `powershell -Command "Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${targetFile}'"`
          : `curl -L "${downloadUrl}" -o "${targetFile}" && chmod +x "${targetFile}"`;
        execSync(cmd);
      } catch (err) {
        console.error('[YtDlpService] Failed to auto-download binary:', err);
      }
    }
  }

  private get binaryPath(): string {
    this.ensureBinary();
    const isWin = process.platform === 'win32';
    if (isWin && fs.existsSync(BIN_PATH_WIN)) {
      return BIN_PATH_WIN;
    }
    if (!isWin && fs.existsSync(BIN_PATH_NIX)) {
      try {
        fs.chmodSync(BIN_PATH_NIX, 0o755);
      } catch {
        // Ignore permission error
      }
      return BIN_PATH_NIX;
    }
    return isWin ? 'yt-dlp.exe' : 'yt-dlp';
  }

  /**
   * Retrieves full video/audio JSON metadata using yt-dlp.
   */
  async getVideoInfo(url: string): Promise<YtDlpInfo> {
    return new Promise((resolve, reject) => {
      execFile(
        this.binaryPath,
        ['-j', '--no-warnings', '--no-playlist', url],
        { maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            console.error('[YtDlpService] Error extracting info:', stderr || error.message);
            return reject(new Error('Failed to extract media details from URL.'));
          }

          try {
            const data = JSON.parse(stdout.trim());
            resolve(data as YtDlpInfo);
          } catch (e) {
            reject(new Error('Failed to parse media metadata.'));
          }
        }
      );
    });
  }

  /**
   * Gets a direct stream result for the specified URL and format string.
   */
  async getMediaStream(
    url: string,
    formatId: string,
    fallbackTitle = 'media'
  ): Promise<StreamResult> {
    const isAudio = formatId.includes('audio');
    const isMp3 = formatId.includes('mp3');
    const extension = isMp3 ? 'mp3' : isAudio ? 'm4a' : 'mp4';
    const mimeType = isMp3 ? 'audio/mpeg' : isAudio ? 'audio/mp4' : 'video/mp4';

    let ytDlpFormatSelector = 'b[ext=mp4]/b/best';
    if (isMp3 || isAudio) {
      ytDlpFormatSelector = 'bestaudio/best';
    } else if (formatId.includes('1080p')) {
      ytDlpFormatSelector = 'b[height<=1080][ext=mp4]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/b/best';
    } else if (formatId.includes('720p')) {
      ytDlpFormatSelector = 'b[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio/best[height<=720]/b/best';
    } else if (formatId.includes('480p')) {
      ytDlpFormatSelector = 'b[height<=480][ext=mp4]/bestvideo[height<=480]+bestaudio/best[height<=480]/b/best';
    } else if (formatId.includes('360p')) {
      ytDlpFormatSelector = 'b[height<=360][ext=mp4]/bestvideo[height<=360]+bestaudio/best[height<=360]/b/best';
    }

    const sanitizedTitle = fallbackTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const filename = `Downly_${sanitizedTitle}_${formatId}.${extension}`;

    // Try fetching direct HTTP stream URL first (fastest)
    try {
      const streamUrls = await this.getDirectUrl(url, ytDlpFormatSelector);
      if (streamUrls && streamUrls.length > 0) {
        const directUrl = streamUrls[0];
        const remote = await fetchRemoteStream(directUrl);
        return {
          stream: remote.stream,
          filename,
          mimeType: remote.contentType || mimeType,
          contentLength: remote.contentLength,
        };
      }
    } catch (err) {
      console.warn('[YtDlpService] Direct URL fetch failed, falling back to stdout process piping:', err);
    }

    // Fallback: Spawn yt-dlp streaming to stdout
    const child = spawn(this.binaryPath, [
      '-o',
      '-',
      '-f',
      ytDlpFormatSelector,
      '--no-playlist',
      '--no-warnings',
      url,
    ]);

    return {
      stream: child.stdout as unknown as Readable,
      filename,
      mimeType,
    };
  }

  private getDirectUrl(url: string, formatSelector: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      execFile(
        this.binaryPath,
        ['-g', '-f', formatSelector, '--no-playlist', '--no-warnings', url],
        (error, stdout) => {
          if (error) return reject(error);
          const urls = stdout.trim().split('\n').filter(Boolean);
          resolve(urls);
        }
      );
    });
  }
}

export const ytDlpService = new YtDlpService();
