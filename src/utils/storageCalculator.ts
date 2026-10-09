import { AppData } from '../types';

export interface StorageStatItem {
  name: string;
  size: number;
  count: number;
  color: string;
}

/**
 * Safely calculates approximate byte size of a single object or primitive without creating giant memory buffers.
 */
export function estimateItemByteSize(item: any): number {
  if (item === null || item === undefined) return 0;
  if (typeof item === 'boolean') return 4;
  if (typeof item === 'number') return 8;
  if (typeof item === 'string') {
    // UTF-16 characters: 2 bytes each
    return item.length * 2;
  }

  // Attempt fast JSON stringify on single item
  try {
    const jsonStr = JSON.stringify(item);
    if (jsonStr) return jsonStr.length * 2;
  } catch {
    // Fallback if circular or stringify throws
  }

  let total = 0;
  if (Array.isArray(item)) {
    for (let i = 0; i < item.length; i++) {
      total += estimateItemByteSize(item[i]);
    }
  } else if (typeof item === 'object') {
    for (const [key, value] of Object.entries(item)) {
      total += key.length * 2;
      if (typeof value === 'string') {
        total += value.length * 2;
      } else if (typeof value === 'number') {
        total += 8;
      } else if (typeof value === 'boolean') {
        total += 4;
      } else if (typeof value === 'object' && value !== null) {
        try {
          const str = JSON.stringify(value);
          total += str.length * 2;
        } catch {
          total += 256;
        }
      }
    }
  }
  return total;
}

/**
 * Calculates collection size asynchronously with time slicing to keep the main UI thread 100% responsive.
 */
export async function calculateCollectionSizeAsync(
  items: any[] | undefined,
  maxSliceTimeMs = 12
): Promise<{ size: number; count: number }> {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { size: 0, count: 0 };
  }

  let totalBytes = 0;
  let lastYieldTime = Date.now();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      totalBytes += estimateItemByteSize(item);
    } catch {
      totalBytes += 1024;
    }

    if (Date.now() - lastYieldTime > maxSliceTimeMs) {
      await new Promise(resolve => setTimeout(resolve, 0));
      lastYieldTime = Date.now();
    }
  }

  return { size: totalBytes, count: items.length };
}

/**
 * Calculates storage statistics for all AppData categories safely and asynchronously.
 */
export async function calculateStorageStatsAsync(
  appData: AppData,
  onProgress?: (interimStats: StorageStatItem[]) => void
): Promise<StorageStatItem[]> {
  const categoriesConfig = [
    { name: 'ST 角色卡', key: 'cards', color: '#B45309' },
    { name: 'ST 世界书', key: 'stWorldBooks', color: '#2563EB' },
    { name: '正则脚本', key: 'stRegexScripts', color: '#9333EA' },
    { name: '聊天记录', key: 'chatLogs', color: '#16A34A' },
    { name: 'ST 预设', key: 'presets', color: '#E11D48' },
    { name: 'ST 主题', key: 'themes', color: '#0891B2' },
    { name: '快捷脚本', key: 'scripts', color: '#4F46E5' },
    { name: '普通角色卡', key: 'normalCards', color: '#D97706' },
    { name: '表情包', key: 'stickerPacks', color: '#0D9488' },
    { name: '字体', key: 'fonts', color: '#6366F1' },
    { name: 'API 管理', key: 'apis', color: '#EC4899' },
    { name: '表情差分', key: 'chatMemes', color: '#F59E0B' },
  ];

  const results: StorageStatItem[] = [];

  for (const cat of categoriesConfig) {
    const items = (appData as any)[cat.key];
    const { size, count } = await calculateCollectionSizeAsync(items);
    if (size > 0 || count > 0) {
      results.push({
        name: cat.name,
        size,
        count,
        color: cat.color,
      });
      if (onProgress) {
        onProgress([...results].sort((a, b) => b.size - a.size));
      }
    }
  }

  return results.sort((a, b) => b.size - a.size);
}
