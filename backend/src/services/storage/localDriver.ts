import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { StorageDriver, StorageUploadOptions, StorageUploadResult } from './types';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const extForMime = (mimeType: string): string => {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
};

export const createLocalDriver = (): StorageDriver => ({
  async upload(file: Buffer, opts: StorageUploadOptions): Promise<StorageUploadResult> {
    const dir = path.join(UPLOAD_DIR, opts.folder);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}${extForMime(opts.mimeType)}`;
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, file);
    const storageKey = `${opts.folder}/${filename}`;
    return {
      url: `/uploads/${storageKey}`,
      storageKey,
    };
  },

  async remove(storageKey: string): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, storageKey);
    try {
      await fs.unlink(fullPath);
    } catch {
      // ignore missing files
    }
  },
});
