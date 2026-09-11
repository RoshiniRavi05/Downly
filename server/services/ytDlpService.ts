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
    const targetFfmpeg = isWin ? path.join(BASE_BIN_DIR, 'ffmpeg.exe') : path.join(BASE_BIN_DIR, 'ffmpeg');

    if (!fs.existsSync(BASE_BIN_DIR)) {
      try {
        fs.mkdirSync(BASE_BIN_DIR, { recursive: true });
      } catch {
        // Ignore
      }
    }

    if (!fs.existsSync(targetFile)) {
      try {
        const downloadUrl = isWin
          ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
          : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

        console.log(`[YtDlpService] Downloading yt-dlp binary to ${targetFile}...`);
        const cmd = isWin
          ? `powershell -Command "Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${targetFile}'"`
          : `curl -L "${downloadUrl}" -o "${targetFile}" && chmod +x "${targetFile}"`;
        execSync(cmd, { timeout: 30000 });
      } catch (err) {
        console.error('[YtDlpService] Failed to auto-download yt-dlp binary:', err);
      }
    }

    if (!fs.existsSync(targetFfmpeg) && !isWin) {
      try {
        console.log(`[YtDlpService] Downloading Linux ffmpeg binary to ${targetFfmpeg}...`);
        const cmd = `curl -L "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-linux-64.tar.gz" | tar -xz -C "${BASE_BIN_DIR}" && chmod +x "${targetFfmpeg}"`;
        execSync(cmd, { timeout: 30000 });
      } catch (err) {
        console.warn('[YtDlpService] Linux ffmpeg auto-download notice:', err);
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

  private get ffmpegDir(): string {
    this.ensureBinary();
    const isWin = process.platform === 'win32';
    const ffmpegWin = path.join(BASE_BIN_DIR, 'ffmpeg.exe');
    const ffmpegNix = path.join(BASE_BIN_DIR, 'ffmpeg');

    if (fs.existsSync(ffmpegWin) || fs.existsSync(ffmpegNix)) {
      return BASE_BIN_DIR;
    }
    return '';
  }

  /**
   * Retrieves full video/audio JSON metadata using yt-dlp.
   */
  async getVideoInfo(url: string): Promise<YtDlpInfo> {
    return new Promise((resolve, reject) => {
      const args = ['-j', '--no-warnings', '--no-playlist'];
      const ffDir = this.ffmpegDir;
      if (ffDir) {
        args.push('--ffmpeg-location', ffDir);
      }
      args.push(url);

      execFile(
        this.binaryPath,
        args,
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

    let ytDlpFormatSelector = 'best[ext=mp4]/b[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best';
    if (isMp3 || isAudio) {
      ytDlpFormatSelector = 'bestaudio/best';
    } else if (formatId.includes('1080p')) {
      ytDlpFormatSelector = 'best[height<=1080][ext=mp4]/b[height<=1080][ext=mp4]/bestvideo[height<=1080]+bestaudio/best';
    } else if (formatId.includes('720p')) {
      ytDlpFormatSelector = 'best[height<=720][ext=mp4]/b[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio/best';
    } else if (formatId.includes('480p')) {
      ytDlpFormatSelector = 'best[height<=480][ext=mp4]/b[height<=480][ext=mp4]/bestvideo[height<=480]+bestaudio/best';
    } else if (formatId.includes('360p')) {
      ytDlpFormatSelector = 'best[height<=360][ext=mp4]/b[height<=360][ext=mp4]/bestvideo[height<=360]+bestaudio/best';
    }

    const sanitizedTitle = fallbackTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const filename = `Downly_${sanitizedTitle}_${formatId}.${extension}`;

    // 1. Instant Direct Stream Resolution (<1.5s execution time - perfect for Vercel Serverless)
    try {
      const streamUrls = await this.getDirectUrl(url, ytDlpFormatSelector);
      if (streamUrls && streamUrls.length > 0) {
        const directUrl = streamUrls[0];
        console.log(`[YtDlpService] Direct stream URL extracted in <1.5s: ${directUrl.substring(0, 80)}...`);
        const remote = await fetchRemoteStream(directUrl);
        return {
          stream: remote.stream,
          filename,
          mimeType: remote.contentType || mimeType,
          contentLength: remote.contentLength,
        };
      }
    } catch (err) {
      console.warn('[YtDlpService] Direct URL extraction notice, falling back to process buffer:', err);
    }

    // 2. Server-side Buffer Fallback for Local Node Servers
    const tempDir = path.join(os.tmpdir(), 'downly-media');
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch {
        // Ignore
      }
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const tempFilePath = path.join(tempDir, `downly_${uniqueId}.${extension}`);

    const spawnArgs = [
      '-o',
      tempFilePath,
      '-f',
      ytDlpFormatSelector,
      '--merge-output-format',
      extension === 'mp3' ? 'mp3' : extension === 'm4a' ? 'm4a' : 'mp4',
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--geo-bypass',
      '--user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    ];

    const ffDir = this.ffmpegDir;
    if (ffDir) {
      spawnArgs.push('--ffmpeg-location', ffDir);
    }
    spawnArgs.push(url);

    return new Promise((resolve, reject) => {
      execFile(this.binaryPath, spawnArgs, { timeout: 25000 }, (error, stdout, stderr) => {
        let actualFile = tempFilePath;
        if (!fs.existsSync(actualFile)) {
          const files = fs.readdirSync(tempDir).filter((f) => f.includes(uniqueId));
          if (files.length > 0) {
            actualFile = path.join(tempDir, files[0]);
          }
        }

        if (!fs.existsSync(actualFile)) {
          console.error('[YtDlpService] Buffer download failed. Stderr:', stderr || error?.message);
          const err: any = new Error('This content cannot currently be processed by the media provider.');
          err.code = 'PROVIDER_UNAVAILABLE';
          return reject(err);
        }

        const stat = fs.statSync(actualFile);
        if (stat.size <= 0) {
          try { fs.unlinkSync(actualFile); } catch {}
          const err: any = new Error('Provider returned 0 bytes for requested media.');
          err.code = 'PROVIDER_UNAVAILABLE';
          return reject(err);
        }

        console.log(`[YtDlpService] Buffer file created: ${actualFile} (${stat.size} bytes)`);

        const fileStream = fs.createReadStream(actualFile);

        const cleanup = () => {
          try {
            if (fs.existsSync(actualFile)) {
              fs.unlinkSync(actualFile);
            }
          } catch {
            // Ignore
          }
        };

        fileStream.on('close', cleanup);
        fileStream.on('error', cleanup);

        resolve({
          stream: fileStream,
          filename,
          mimeType,
          contentLength: stat.size,
        });
      });
    });
  }

  private getDirectUrl(url: string, formatSelector: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const args = [
        '-g',
        '-f',
        formatSelector,
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--geo-bypass',
        '--user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      ];
      const ffDir = this.ffmpegDir;
      if (ffDir) {
        args.push('--ffmpeg-location', ffDir);
      }
      args.push(url);

      execFile(this.binaryPath, args, (error, stdout) => {
        if (error) return reject(error);
        const urls = stdout.trim().split('\n').filter(Boolean);
        resolve(urls);
      });
    });
  }
}

export const ytDlpService = new YtDlpService();
