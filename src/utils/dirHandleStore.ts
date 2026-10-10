import { createSafeJsonBlob } from '../utils';
// IndexedDB storage for FileSystemDirectoryHandle to enable direct one-click sync without reopening folder dialogs

const DB_NAME = 'TavernVaultDirectoryStore';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'pinned_st_directory_handle';
const PATH_KEY = 'pinned_st_directory_path';
const BACKUP_HANDLE_KEY = 'pinned_backup_directory_handle';
const BACKUP_PATH_KEY = 'pinned_backup_directory_path';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePinnedDirectoryHandle(handle: FileSystemDirectoryHandle, customPath?: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, HANDLE_KEY);
    if (customPath || handle.name) {
      store.put(customPath || handle.name, PATH_KEY);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save directory handle to IndexedDB:', err);
  }
}

export async function getPinnedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(HANDLE_KEY);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to get directory handle from IndexedDB:', err);
    return null;
  }
}

export async function clearPinnedDirectoryHandle(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(HANDLE_KEY);
    store.delete(PATH_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to clear directory handle from IndexedDB:', err);
  }
}

export async function saveExtraFolderHandle(id: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, `extra_folder_${id}`);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save extra folder handle:', err);
  }
}

export async function getExtraFolderHandle(id: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`extra_folder_${id}`);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to get extra folder handle:', err);
    return null;
  }
}

export async function deleteExtraFolderHandle(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(`extra_folder_${id}`);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to delete extra folder handle:', err);
  }
}

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext === true &&
    window.location.protocol !== 'file:' &&
    'showDirectoryPicker' in window
  );
}

export async function saveBackupDirectoryHandle(handle: FileSystemDirectoryHandle, customPath?: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, BACKUP_HANDLE_KEY);
    if (customPath || handle.name) {
      store.put(customPath || handle.name, BACKUP_PATH_KEY);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save backup directory handle to IndexedDB:', err);
  }
}

export async function getBackupDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(BACKUP_HANDLE_KEY);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to get backup directory handle from IndexedDB:', err);
    return null;
  }
}

export async function getBackupDirectoryPath(): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(BACKUP_PATH_KEY);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to get backup directory path from IndexedDB:', err);
    return null;
  }
}

export async function clearBackupDirectoryHandle(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(BACKUP_HANDLE_KEY);
    store.delete(BACKUP_PATH_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to clear backup directory handle from IndexedDB:', err);
  }
}

export async function writeBackupToDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  appData: any
): Promise<{ success: boolean; filesCount: number; path: string; error?: string }> {
  try {
    // 1. Create or overwrite main backup JSON file
    const fileName = 'tavern_vault_full_backup.json';
    // @ts-ignore
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    // @ts-ignore
    const writable = await fileHandle.createWritable();
    const dataStr = await createSafeJsonBlob(appData as any);
    await writable.write(dataStr);
    await writable.close();

    // 2. Also write timestamped snapshot
    const dateStr = new Date().toISOString().slice(0, 10);
    const snapFileName = `TavernVault_Backup_${dateStr}.json`;
    // @ts-ignore
    const snapFileHandle = await handle.getFileHandle(snapFileName, { create: true });
    // @ts-ignore
    const snapWritable = await snapFileHandle.createWritable();
    await snapWritable.write(dataStr);
    await snapWritable.close();

    // 3. Write summary readme info
    // @ts-ignore
    const summaryHandle = await handle.getFileHandle('backup_info.txt', { create: true });
    // @ts-ignore
    const summaryWritable = await summaryHandle.createWritable();
    const summaryText = `酒馆保险库 (Tavern Vault) 本地备份数据\n备份时间: ${new Date().toLocaleString()}\n角色卡总数: ${appData.cards?.length || 0}\n世界书总数: ${appData.stWorldBooks?.length || 0}\n正则脚本总数: ${appData.stRegexScripts?.length || 0}\n聊天记录总数: ${appData.chatLogs?.length || 0}\n主备份文件: ${fileName}\n时间戳备份: ${snapFileName}\n`;
    await summaryWritable.write(summaryText);
    await summaryWritable.close();

    return {
      success: true,
      filesCount: (appData.cards?.length || 0) + (appData.stWorldBooks?.length || 0) + 3,
      path: handle.name
    };
  } catch (err: any) {
    console.error('Failed to write backup to directory handle:', err);
    return {
      success: false,
      filesCount: 0,
      path: handle.name,
      error: err.message || String(err)
    };
  }
}


