import { CardEntry } from '../types';

export interface TavernSyncConfig {
  directoryHandle?: FileSystemDirectoryHandle;
  lastSyncedAt?: number;
}

export async function connectTavernDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) {
    alert('当前浏览器不支持文件系统 API (请使用 Chrome/Edge 并在新标签页打开)');
    return null;
  }
  
  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'read',
    });
    return dirHandle;
  } catch (err) {
    console.error('User cancelled directory picker or error:', err);
    return null;
  }
}

export async function scanTavernDirectory(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
  const files: File[] = [];
  
  // 遍历 characters 文件夹
  try {
    const charsDir = await dirHandle.getDirectoryHandle('characters', { create: false });
    for await (const entry of (charsDir as any).values()) {
      if (entry.kind === 'file' && (entry.name.endsWith('.png') || entry.name.endsWith('.webp') || entry.name.endsWith('.json'))) {
        const file = await entry.getFile();
        files.push(file);
      }
    }
  } catch (err) {
    console.warn('No characters folder found or accessible', err);
  }

  // 遍历 worlds 文件夹
  try {
    const worldsDir = await dirHandle.getDirectoryHandle('worlds', { create: false });
    for await (const entry of (worldsDir as any).values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        const file = await entry.getFile();
        files.push(file);
      }
    }
  } catch (err) {
    console.warn('No worlds folder found', err);
  }

  return files;
}
