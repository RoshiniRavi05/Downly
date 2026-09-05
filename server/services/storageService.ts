import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config/index';

export class StorageService {
  private tempDir: string;

  constructor() {
    this.tempDir = CONFIG.TEMP_DIR;
  }

  private ensureTempDir(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[StorageService] Could not create temp directory:', err);
    }
  }

  public cleanupExpiredFiles(): void {
    try {
      if (!fs.existsSync(this.tempDir)) return;

      fs.readdir(this.tempDir, (err, files) => {
        if (err || !files) return;

        const now = Date.now();
        const ttlMs = CONFIG.TEMP_FILE_TTL_SEC * 1000;

        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          fs.stat(filePath, (statErr, stats) => {
            if (statErr || !stats) return;
            if (now - stats.mtimeMs > ttlMs) {
              fs.unlink(filePath, () => {});
            }
          });
        }
      });
    } catch {
      // Ignore cleanup errors
    }
  }

  public getTempFilePath(filename: string): string {
    this.ensureTempDir();
    return path.join(this.tempDir, path.basename(filename));
  }
}

export const storageService = new StorageService();
