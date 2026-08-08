export interface StorageUploadOptions {
  folder: string;
  mimeType: string;
  originalName?: string;
}

export interface StorageUploadResult {
  url: string;
  storageKey: string;
}

export interface StorageDriver {
  upload(file: Buffer, opts: StorageUploadOptions): Promise<StorageUploadResult>;
  remove(storageKey: string): Promise<void>;
}
