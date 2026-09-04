import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/index.js';

export class StorageService {
  private tempDir: string;

  constructor() {
    this.tempDir = CONFIG.TEMP_DIR;
    this.ensureTempDir();
    this.startCleanupJob();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Periodically deletes temporary download files older than TTL.
   */
  private startCleanupJob(): void {
    setInterval(() => {
      this.cleanupExpiredFiles();
    }, 60000); // Check every 60 seconds
  }

  public cleanupExpiredFiles(): void {
    if (!fs.existsSync(this.tempDir)) return;

    fs.readdir(this.tempDir, (err, files) => {
      if (err) return;

      const now = Date.now();
      const ttlMs = CONFIG.TEMP_FILE_TTL_SEC * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        fs.stat(filePath, (statErr, stats) => {
          if (statErr) return;
          if (now - stats.mtimeMs > ttlMs) {
            fs.unlink(filePath, () => {});
          }
        });
      }
    });
  }

  public getTempFilePath(filename: string): string {
    return path.join(this.tempDir, path.basename(filename));
  }
}

export const storageService = new StorageService();
