import type { StorageDriver } from './types';
import { createLocalDriver } from './localDriver';
import { createCloudinaryDriver } from './cloudinaryDriver';

let driver: StorageDriver | null = null;

export const getStorageDriver = (): StorageDriver => {
  if (driver) return driver;

  const storageDriver = process.env.STORAGE_DRIVER || 'local';
  if (storageDriver === 'cloudinary') {
    driver = createCloudinaryDriver();
  } else {
    driver = createLocalDriver();
  }
  return driver;
};
