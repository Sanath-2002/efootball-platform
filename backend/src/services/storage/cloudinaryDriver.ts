import { v2 as cloudinary } from 'cloudinary';
import type { StorageDriver, StorageUploadOptions, StorageUploadResult } from './types';

export const createCloudinaryDriver = (): StorageDriver => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return {
    async upload(file: Buffer, opts: StorageUploadOptions): Promise<StorageUploadResult> {
      const result = await new Promise<{ secure_url: string; public_id: string }>(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: `efootball/${opts.folder}`,
              resource_type: 'image',
            },
            (err, res) => {
              if (err || !res) reject(err ?? new Error('Cloudinary upload failed'));
              else resolve(res as { secure_url: string; public_id: string });
            }
          );
          stream.end(file);
        }
      );

      return {
        url: result.secure_url,
        storageKey: result.public_id,
      };
    },

    async remove(storageKey: string): Promise<void> {
      await cloudinary.uploader.destroy(storageKey);
    },
  };
};
