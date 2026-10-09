export interface RemoteFileInfo {
  name: string;
  path: string;
  size: number;
  lastModified?: string;
  etag?: string;
}

export interface IStorageAdapter {
  testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }>;
  ensureDirectory(dirPath: string): Promise<void>;
  uploadFile(remotePath: string, content: string | ArrayBuffer | Uint8Array, mimeType?: string): Promise<void>;
  downloadFile(remotePath: string): Promise<ArrayBuffer>;
  deleteFile(remotePath: string): Promise<void>;
  listFiles(dirPath: string): Promise<RemoteFileInfo[]>;
}
