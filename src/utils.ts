import { resourceLeaves } from './utils/tavernFileTypes';
import { delMany } from 'idb-keyval';
import { readCollection, writeCollection } from './utils/recordPersistence';
import { hydrateCard, getCardCover, portableCard, hydrateCardAsset, referencedImportKeys, hydrateCardBoundAssets } from './utils/largeCardStore';
import { compareWorldBooks, compareScripts, compareRegexScripts } from './utils/diffEngine';
import { get, set } from 'idb-keyval';
import mammoth from 'mammoth';
import {
  AppData,
  CardEntry,
  NormalCardEntry,
  STWorldBookEntry,
  STWorldBookRule,
  STRegexEntry,
  STRegexRule,
  ChatLogEntry,
  PluginEntry,
  ScriptEntry,
  ThemeEntry,
  PresetEntry,
  FontEntry,
  ExtraStoryEntry,
  ChatMemeEntry,
  StickerPackEntry,
  ApiEntry,
  PhoneLink,
} from './types';

/**
 * =========================================================================
 * 统一数据存储与卡片处理核心库 (Unified Storage & Card Utilities)
 * 集中管理本地存储、SillyTavern 卡片解析与转换、PNG 格式读写、正则与世界书同步及数据导入导出
 * =========================================================================
 */


export const STORAGE_KEY = 'tavern_vault_data_v1';
export const THEME_KEY = 'tavern_vault_theme';
export const SIDEBAR_KEY = 'tavern_vault_sidebar';

const defaultAppData: AppData = {
  cards: [],
  groups: ['默认'],
  phoneLinks: [],
  themes: [],
  themeCategories: ['默认'],
  beautifications: [],
  beautificationCategories: ['默认'],
  presets: [],
  presetCategories: ['默认'],
  plugins: [],
  pluginCategories: ['默认'],
  scripts: [],
  scriptCategories: ['默认'],
  stWorldBooks: [],
  stWorldBookCategories: ['默认'],
  stRegexScripts: [],
  stRegexCategories: ['默认'],
  chatLogs: [],
  chatLogCategories: ['默认'],
  normalCards: [],
  normalCardCategories: ['默认'],
  apis: [],
  apiCategories: ['默认'],
  fonts: [],
  fontCategories: ['默认'],
  userPersonas: [],
  userPersonaCategories: ['默认'],
  backgroundImages: [],
  backgroundImageCategories: ['默认'],
  cardCovers: [],
  cardCoverCategories: ['默认'],
  extraStories: [],
  extraStoryCategories: ['默认'],
  stickerPacks: [],
  stickerCategories: ['默认'],
  worldBooks: [],
  worldBookCategories: ['默认'],
  chatMemes: [],
  chatMemeCategories: ['默认'],
  mobilePresets: [],
  mobilePresetCategories: ['默认'],
  htmlStorages: [],
  htmlStorageCategories: ['默认'],
};

// In-memory cache for fast synchronous access.
let cachedAppData: AppData | null = null;
let saveQueue: Promise<boolean> = Promise.resolve(true);

/**
 * Sanitize data before storing in IndexedDB.
 * Since IndexedDB natively uses asynchronous browser-level Structured Clone,
 * we bypass expensive synchronous JSON.parse(JSON.stringify) on the UI thread
 * and only sanitize if an error occurs.
 */
function sanitizeForStorage<T>(val: T): T {
  if (val === undefined || val === null) return val;
  return val;
}

// 大数据版本的关键优化：不再每次保存都把整个 AppData（可能包含大量图片/字体）
// 一次性 structured-clone 到 IndexedDB。每个顶层数据集合独立存储，只保存发生变化的集合。
const DATA_FIELDS: (keyof AppData)[] = [
  'importRecords', 'stagedDuplicateCards', 'cards', 'groups', 'phoneLinks', 'themes', 'themeCategories',
  'beautifications', 'beautificationCategories', 'presets', 'presetCategories',
  'plugins', 'pluginCategories', 'scripts', 'scriptCategories',
  'stWorldBooks', 'stWorldBookCategories', 'stRegexScripts', 'stRegexCategories',
  'chatLogs', 'chatLogCategories',
  'normalCards', 'normalCardCategories',
  'apis', 'apiCategories', 'fonts', 'fontCategories', 
  'userPersonas', 'userPersonaCategories',
  'backgroundImages', 'backgroundImageCategories',
  'cardCovers', 'cardCoverCategories',
  'extraStories', 'extraStoryCategories', 'stickerPacks', 'stickerCategories', 'worldBooks',
  'worldBookCategories', 'chatMemes', 'chatMemeCategories',
  'mobilePresets', 'mobilePresetCategories', 'mobilePresetTags',
  'htmlStorages', 'htmlStorageCategories', 'htmlStorageTags',
  'cardTags', 'themeTags', 'beautificationTags', 'presetTags',
  'pluginTags', 'scriptTags', 'stWorldBookTags', 'stRegexTags',
  'chatLogTags', 'normalCardTags', 'apiTags', 'fontTags',
  'extraStoryTags', 'stickerTags', 'worldBookTags', 'chatMemeTags'
];
const fieldKey = (field: keyof AppData) => `${STORAGE_KEY}::${String(field)}`;
const SPLIT_MARKER_KEY = `${STORAGE_KEY}::__split_v1`;

const mergeDefaults = (data: any): AppData => ({
  importRecords: Array.isArray(data?.importRecords) ? data.importRecords : [],
  stagedDuplicateCards: Array.isArray(data?.stagedDuplicateCards) ? data.stagedDuplicateCards : [],
  cards: Array.isArray(data?.cards) ? data.cards : [],
  groups: Array.isArray(data?.groups) && data.groups.length ? data.groups : ['默认'],
  phoneLinks: Array.isArray(data?.phoneLinks) ? data.phoneLinks : [],
  themes: Array.isArray(data?.themes) ? data.themes : [],
  themeCategories: Array.isArray(data?.themeCategories) ? data.themeCategories : ['默认'],
  beautifications: Array.isArray(data?.beautifications) ? data.beautifications : [],
  beautificationCategories: Array.isArray(data?.beautificationCategories) ? data.beautificationCategories : ['默认'],
  presets: Array.isArray(data?.presets) ? data.presets : [],
  presetCategories: Array.isArray(data?.presetCategories) ? data.presetCategories : ['默认'],
  plugins: Array.isArray(data?.plugins) ? data.plugins : [],
  pluginCategories: Array.isArray(data?.pluginCategories) ? data.pluginCategories : ['默认'],
  scripts: Array.isArray(data?.scripts) ? data.scripts : [],
  scriptCategories: Array.isArray(data?.scriptCategories) ? data.scriptCategories : ['默认'],
  stWorldBooks: Array.isArray(data?.stWorldBooks) ? data.stWorldBooks : [],
  stWorldBookCategories: Array.isArray(data?.stWorldBookCategories) ? data.stWorldBookCategories : ['默认'],
  stRegexScripts: Array.isArray(data?.stRegexScripts) ? data.stRegexScripts : [],
  stRegexCategories: Array.isArray(data?.stRegexCategories) ? data.stRegexCategories : ['默认'],
  chatLogs: Array.isArray(data?.chatLogs) ? data.chatLogs : [],
  chatLogCategories: Array.isArray(data?.chatLogCategories) ? data.chatLogCategories : ['默认'],
  normalCards: Array.isArray(data?.normalCards) ? data.normalCards : [],
  normalCardCategories: Array.isArray(data?.normalCardCategories) ? data.normalCardCategories : ['默认'],
  apis: Array.isArray(data?.apis) ? data.apis : [],
  apiCategories: Array.isArray(data?.apiCategories) ? data.apiCategories : ['默认'],
  fonts: Array.isArray(data?.fonts) ? data.fonts : [],
  fontCategories: Array.isArray(data?.fontCategories) ? data.fontCategories : ['默认'],
  userPersonas: Array.isArray(data?.userPersonas) ? data.userPersonas : [],
  userPersonaCategories: Array.isArray(data?.userPersonaCategories) ? data.userPersonaCategories : ['默认'],
  backgroundImages: Array.isArray(data?.backgroundImages) ? data.backgroundImages : [],
  backgroundImageCategories: Array.isArray(data?.backgroundImageCategories) ? data.backgroundImageCategories : ['默认'],
  cardCovers: Array.isArray(data?.cardCovers) ? data.cardCovers : [],
  cardCoverCategories: Array.isArray(data?.cardCoverCategories) ? data.cardCoverCategories : ['默认'],
  extraStories: Array.isArray(data?.extraStories) ? data.extraStories : [],
  extraStoryCategories: Array.isArray(data?.extraStoryCategories) ? data.extraStoryCategories : ['默认'],
  stickerPacks: Array.isArray(data?.stickerPacks) ? data.stickerPacks : [],
  stickerCategories: Array.isArray(data?.stickerCategories) ? data.stickerCategories : ['默认'],
  worldBooks: Array.isArray(data?.worldBooks) ? data.worldBooks : [],
  worldBookCategories: Array.isArray(data?.worldBookCategories) ? data.worldBookCategories : ['默认'],
  chatMemes: Array.isArray(data?.chatMemes) ? data.chatMemes : [],
  chatMemeCategories: Array.isArray(data?.chatMemeCategories) ? data.chatMemeCategories : ['默认'],
  mobilePresets: Array.isArray(data?.mobilePresets) ? data.mobilePresets : [],
  mobilePresetCategories: Array.isArray(data?.mobilePresetCategories) ? data.mobilePresetCategories : ['默认'],
  mobilePresetTags: Array.isArray(data?.mobilePresetTags) ? data.mobilePresetTags : [],
  htmlStorages: Array.isArray(data?.htmlStorages) ? data.htmlStorages : [],
  htmlStorageCategories: Array.isArray(data?.htmlStorageCategories) ? data.htmlStorageCategories : ['默认'],
  htmlStorageTags: Array.isArray(data?.htmlStorageTags) ? data.htmlStorageTags : [],
  cardTags: Array.isArray(data?.cardTags) ? data.cardTags : [],
  themeTags: Array.isArray(data?.themeTags) ? data.themeTags : [],
  beautificationTags: Array.isArray(data?.beautificationTags) ? data.beautificationTags : [],
  presetTags: Array.isArray(data?.presetTags) ? data.presetTags : [],
  pluginTags: Array.isArray(data?.pluginTags) ? data.pluginTags : [],
  scriptTags: Array.isArray(data?.scriptTags) ? data.scriptTags : [],
  stWorldBookTags: Array.isArray(data?.stWorldBookTags) ? data.stWorldBookTags : [],
  stRegexTags: Array.isArray(data?.stRegexTags) ? data.stRegexTags : [],
  chatLogTags: Array.isArray(data?.chatLogTags) ? data.chatLogTags : [],
  normalCardTags: Array.isArray(data?.normalCardTags) ? data.normalCardTags : [],
  apiTags: Array.isArray(data?.apiTags) ? data.apiTags : [],
  fontTags: Array.isArray(data?.fontTags) ? data.fontTags : [],
  extraStoryTags: Array.isArray(data?.extraStoryTags) ? data.extraStoryTags : [],
  stickerTags: Array.isArray(data?.stickerTags) ? data.stickerTags : [],
  worldBookTags: Array.isArray(data?.worldBookTags) ? data.worldBookTags : [],
  chatMemeTags: Array.isArray(data?.chatMemeTags) ? data.chatMemeTags : [],
});

/** Load legacy root data and overlay any new per-field stores. */
export async function loadAppDataAsync(): Promise<AppData> {
  try {
    const splitReady = await get<boolean>(SPLIT_MARKER_KEY);
    let merged: AppData;
    if (splitReady) {
      // 新版本启动时只读取分片数据，避免再次 clone 整个巨型 AppData。
      const values = await Promise.all(DATA_FIELDS.map((field) => get<any>(fieldKey(field))));
      const partial: any = {};
      DATA_FIELDS.forEach((field, index) => {
        if (values[index] !== undefined) partial[field] = values[index];
      });
      for (const field of DATA_FIELDS) {
        const value = partial[field];
        partial[field] = await readCollection(String(field), value);
        if (Array.isArray(value) && value.length && value.every(v => v && typeof v.id === 'string')) partial[field] = await writeCollection(fieldKey(field), String(field), value);
      }
      merged = mergeDefaults(partial);
    } else {
      // 首次从旧版本迁移时读取一次旧根数据，随后立刻拆分保存；之后启动不再读取巨型根对象。
      const root = await get<AppData>(STORAGE_KEY);
      merged = mergeDefaults(root || loadAppDataFromLocalStorage());
      for (const field of DATA_FIELDS) {
        (merged as any)[field] = await writeCollection(fieldKey(field), String(field), sanitizeForStorage((merged as any)[field]));
        // 迁移大数据时主动让出主线程，避免移动端同时 clone 多个大数组。
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      await set(SPLIT_MARKER_KEY, true);
    }
    cachedAppData = merged;
    return merged;
  } catch (err) {
    console.error('存储读取失败，保留现有数据', err);
    throw new Error('存储读取失败：' + (err instanceof Error ? err.message : String(err)));
  }
}

export function loadAppData(): AppData {
  if (cachedAppData) return cachedAppData;
  return loadAppDataFromLocalStorage();
}

function loadAppDataFromLocalStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeDefaults({});
    return mergeDefaults(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load app data from localStorage', e);
    return mergeDefaults({});
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSaveData: AppData | null = null;
let pendingSaveResolvers: ((saved: boolean) => void)[] = [];

function queuePendingSave() {
  const snapshot = pendingSaveData;
  if (!snapshot) return saveQueue;
  const resolvers = pendingSaveResolvers.splice(0);
  pendingSaveData = null;
  const write = async () => {
    const previous = cachedAppData;
    const saved: AppData = { ...snapshot };
    try {
      for (const field of DATA_FIELDS) {
        if (previous && (previous as any)[field] === (snapshot as any)[field]) continue;
        (saved as any)[field] = await writeCollection(fieldKey(field), String(field), (snapshot as any)[field], (previous as any)?.[field]);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      await set(SPLIT_MARKER_KEY, true);
      cachedAppData = saved;
      if (previous) {
        const live = referencedImportKeys(saved), old = referencedImportKeys(previous);
        const unused = [...old].filter(key => !live.has(key));
        try { for (let i = 0; i < unused.length; i += 64) await delMany(unused.slice(i, i + 64)); } catch (error) { console.warn('旧导入正文清理失败，稍后重试', error); }
      }
      return true;
    } catch (error) {
      console.error('数据未保存，保留内存中的数据以供重试', error);
      return false;
    }
  };
  saveQueue = saveQueue.then(write, write).then(saved => { resolvers.forEach(resolve => resolve(saved)); return saved; });
  return saveQueue;
}

export function saveAppData(data: AppData, immediate = false): Promise<boolean> {
  pendingSaveData = data;
  const result = new Promise<boolean>(resolve => pendingSaveResolvers.push(resolve));
  if (saveTimer) clearTimeout(saveTimer);
  if (immediate) { saveTimer = null; queuePendingSave(); }
  else saveTimer = setTimeout(() => { saveTimer = null; queuePendingSave(); }, 350);
  return result;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingSaveData) {
      saveAppData(pendingSaveData, true);
    }
  });
}

/**
 * Image file quality compression to WebP Base64 to prevent storage bloating
 */
export async function processImageFile(file: File, maxWidth = 400, maxHeight = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale proportionally
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to webp with 0.8 quality
        const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
        resolve(compressedBase64);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getCardDisplayName(card: CardEntry): string {
  if (card.editHistory?.name) return card.editHistory.name;
  if (card.name) return card.name;
  const rd = card.rawData;
  if (rd?.data?.name) return rd.data.name;
  if (rd?.name) return rd.name;
  if (rd?.char_name) return rd.char_name;
  return '未命名角色';
}

export function getCardCreator(card: CardEntry): string {
  if (card.editHistory?.author) return card.editHistory.author;
  if (card.author) return card.author;
  const rd = card.rawData;
  if (rd?.data?.creator) return rd.data.creator;
  if (rd?.creator) return rd.creator;
  if (rd?.data?.extensions?.author) return rd.data.extensions.author;
  return '未知作者';
}

export function getCardDescription(card: CardEntry): string {
  if (card.editHistory?.description !== undefined) return card.editHistory.description;
  const rd = card.rawData;
  if (rd?.data?.description) return rd.data.description;
  if (rd?.description) return rd.description;
  return '';
}

export function getCardPersonality(card: CardEntry): string {
  if (card.editHistory?.personality !== undefined) return card.editHistory.personality;
  const rd = card.rawData;
  if (rd?.data?.personality) return rd.data.personality;
  if (rd?.personality) return rd.personality;
  return '';
}

export function getCardGreeting(card: CardEntry): string {
  if (card.editHistory?.first_mes !== undefined) return card.editHistory.first_mes;
  if (card.editHistory?.greeting !== undefined) return card.editHistory.greeting;
  const rd = card.rawData;
  if (rd?.data?.first_mes) return rd.data.first_mes;
  if (rd?.first_mes) return rd.first_mes;
  if (rd?.greeting) return rd.greeting;
  return '';
}

export function getCardAlternateGreetings(card: CardEntry): string[] {
  if (card.editHistory?.alternate_greetings && Array.isArray(card.editHistory.alternate_greetings)) {
    return card.editHistory.alternate_greetings;
  }
  const rd = card.rawData;
  if (rd?.data?.alternate_greetings) return rd.data.alternate_greetings;
  if (rd?.alternate_greetings) return rd.alternate_greetings;
  return [];
}

export function getCardWorldBook(card: CardEntry): any {
  if (card.editHistory?.character_book) return card.editHistory.character_book;
  const rd = card.rawData;
  if (rd?.data?.character_book) return rd.data.character_book;
  if (rd?.character_book) return rd.character_book;
  if (rd?.extensions?.character_book) return rd.extensions.character_book;
  if (rd?.data?.extensions?.character_book) return rd.data.extensions.character_book;
  return null;
}

export function getCardRegex(card: CardEntry | null): any[] {
  if (!card) return [];
  if (card.editHistory?.regex_scripts && Array.isArray(card.editHistory.regex_scripts)) {
    return card.editHistory.regex_scripts;
  }
  const rd = card.rawData;
  if (!rd) return [];
  if (Array.isArray(rd.data?.extensions?.regex_scripts)) return rd.data.extensions.regex_scripts;
  if (Array.isArray(rd.extensions?.regex_scripts)) return rd.extensions.regex_scripts;
  if (Array.isArray(rd.data?.extensions?.regex)) return rd.data.extensions.regex;
  if (Array.isArray(rd.extensions?.regex)) return rd.extensions.regex;
  if (Array.isArray(rd.data?.regex_scripts)) return rd.data.regex_scripts;
  if (Array.isArray(rd.regex_scripts)) return rd.regex_scripts;
  if (Array.isArray(rd.data?.regexes)) return rd.data.regexes;
  if (Array.isArray(rd.regexes)) return rd.regexes;
  if (Array.isArray(rd.data?.user_regexes)) return rd.data.user_regexes;
  if (Array.isArray(rd.user_regexes)) return rd.user_regexes;
  if (Array.isArray(rd.data?.character_book?.extensions?.regex_scripts)) return rd.data.character_book.extensions.regex_scripts;
  if (Array.isArray(rd.character_book?.extensions?.regex_scripts)) return rd.character_book.extensions.regex_scripts;
  if (rd.findRegex || rd.find_regex || rd.pattern || rd.data?.findRegex || rd.data?.find_regex) {
    return [rd.data || rd];
  }
  return [];
}

const cardTagsCache = new WeakMap<any, string[]>();
export function getCardTags(card: CardEntry): string[] {
  const cacheKey = card.rawData;
  if (cacheKey && cardTagsCache.has(cacheKey)) return cardTagsCache.get(cacheKey)!;

  const rd = card.rawData;
  let tags = rd?.data?.tags || rd?.tags || [];
  if (typeof tags === 'string') tags = [tags];
  let parsedTags: string[] = [];
  tags.forEach((t: string) => {
    if (typeof t === 'string') {
      parsedTags.push(...t.split(/[,，、]/).map(s => s.trim()).filter(Boolean));
    } else {
      parsedTags.push(t);
    }
  });
  const result = Array.from(new Set(parsedTags));
  if (cacheKey) cardTagsCache.set(cacheKey, result);
  return result;
}

// Memory-efficient WeakMap cache for card search indexing to avoid redundant string computations across thousands of cards
const cardSearchIndexCache = new WeakMap<CardEntry, string>();

export function getCardSearchIndexString(card: CardEntry): string {
  let cached = cardSearchIndexCache.get(card);
  if (cached !== undefined) return cached;

  const name = getCardDisplayName(card);
  const author = getCardCreator(card);
  const tags = getCardTags(card).join(' ');
  const customTags = (card.customTags || []).join(' ');
  const group = card.group || '';
  const fileName = card.fileName || '';
  const desc = getCardDescription(card);

  cached = `${name} ${author} ${tags} ${customTags} ${group} ${fileName} ${desc}`.toLowerCase();
  cardSearchIndexCache.set(card, cached);
  return cached;
}

/**
 * Returns merged card data by combining rawData and editHistory
 */
export function getCurrentCardData(card: CardEntry): any {
  const data = JSON.parse(JSON.stringify(card.rawData));
  if (!card.edited || !card.editHistory) return data;
  const eh = card.editHistory;

  if (eh.name !== undefined) {
    if (data.data) data.data.name = eh.name; else data.name = eh.name;
  }
  if (eh.description !== undefined) {
    if (data.data) data.data.description = eh.description; else data.description = eh.description;
  }
  if (eh.personality !== undefined) {
    if (data.data) data.data.personality = eh.personality; else data.personality = eh.personality;
  }
  if (eh.scenario !== undefined) {
    if (data.data) data.data.scenario = eh.scenario; else data.scenario = eh.scenario;
  }
  if (eh.system_prompt !== undefined) {
    if (data.data) data.data.system_prompt = eh.system_prompt; else data.system_prompt = eh.system_prompt;
  }
  if (eh.first_mes !== undefined) {
    if (data.data) data.data.first_mes = eh.first_mes; else data.first_mes = eh.first_mes;
  }
  if (eh.alternate_greetings !== undefined) {
    if (data.data) data.data.alternate_greetings = eh.alternate_greetings; else data.alternate_greetings = eh.alternate_greetings;
  }
  if (eh.character_book !== undefined) {
    if (data.data) data.data.character_book = eh.character_book; else data.character_book = eh.character_book;
  }
  if (eh.regex_scripts !== undefined) {
    const target = data.data || data;
    if (!target.extensions) target.extensions = {};
    target.extensions.regex_scripts = eh.regex_scripts;
  }
  if (eh.author !== undefined) {
    if (data.data) {
      if (!data.data.extensions) data.data.extensions = {};
      data.data.extensions.author = eh.author;
    } else {
      data.author = eh.author;
    }
  }
  if (eh.tags !== undefined) {
    if (data.data) data.data.tags = eh.tags; else data.tags = eh.tags;
  }

  return data;
}





/**
 * =========================================================================
 * 统一数据与卡片核心工具库 (Unified Card & Data Utilities)
 * 整合 PNG Chunk 读写、角色卡解析转换、SillyTavern 关联数据提取与大数据分卷导出
 * =========================================================================
 */

/**
 * PNG Chunk and Card Parsing Utilities for SillyTavern Cards
 */

export async function extractPngTextAsync(arrayBuffer: ArrayBuffer): Promise<Record<string, string>> {
  const dv = new DataView(arrayBuffer);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (dv.getUint8(i) !== sig[i]) throw new Error('不是有效的 PNG 文件');
  }

  const chunks: Record<string, string> = {};
  let offset = 8;
  while (offset < dv.byteLength) {
    if (offset + 8 > dv.byteLength) break;
    const length = dv.getUint32(offset);
    const type = String.fromCharCode(
      dv.getUint8(offset + 4),
      dv.getUint8(offset + 5),
      dv.getUint8(offset + 6),
      dv.getUint8(offset + 7)
    );
    const dataStart = offset + 8;
    if (dataStart + length > dv.byteLength) break;

    if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
      const data = new Uint8Array(arrayBuffer, dataStart, length);
      let keywordEnd = 0;
      while (keywordEnd < data.length && data[keywordEnd] !== 0) keywordEnd++;
      const keyword = new TextDecoder('utf-8').decode(data.subarray(0, keywordEnd));
      const valueBytes = data.subarray(keywordEnd + 1);
      let value = '';

      try {
        if (type === 'zTXt') {
          const compressed = valueBytes.subarray(1);
          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate');
            const stream = new Blob([compressed]).stream().pipeThrough(ds);
            const buf = await new Response(stream).arrayBuffer();
            value = new TextDecoder('utf-8').decode(new Uint8Array(buf));
          }
        } else if (type === 'iTXt') {
          const compressionFlag = valueBytes[0];
          let idx = 2;
          while (idx < valueBytes.length && valueBytes[idx] !== 0) idx++;
          idx++;
          while (idx < valueBytes.length && valueBytes[idx] !== 0) idx++;
          idx++;
          const textData = valueBytes.subarray(idx);
          if (compressionFlag === 1 && typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate');
            const stream = new Blob([textData]).stream().pipeThrough(ds);
            const buf = await new Response(stream).arrayBuffer();
            value = new TextDecoder('utf-8').decode(new Uint8Array(buf));
          } else {
            value = new TextDecoder('utf-8').decode(textData);
          }
        } else {
          value = new TextDecoder('utf-8').decode(valueBytes);
        }
      } catch (e) {
        console.warn('Decompress error for keyword', keyword, e);
        value = '';
      }
      chunks[keyword] = value;
    }
    offset = dataStart + length + 4; // + CRC
    if (type === 'IEND') break;
  }
  return chunks;
}

export function fileToDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Robustly converts any uploaded image file (from Photo Gallery or Files)
 * into a compressed, persistent Base64 Data URL so it never disappears.
 */


export function scaleImage(srcUrl: string, maxW = 400, maxH = 600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    // Do NOT set crossOrigin for data: or blob: URLs to prevent Safari CORS/canvas security error
    if (!srcUrl.startsWith('data:') && !srcUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(srcUrl);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const res = reader.result as string;
                resolve(res || srcUrl);
              };
              reader.onerror = () => resolve(srcUrl);
              reader.readAsDataURL(blob);
            },
            'image/jpeg',
            0.85
          );
        } else {
          resolve(srcUrl);
        }
      } catch (err) {
        console.warn('Canvas scaling error', err);
        resolve(srcUrl);
      }
    };
    img.onerror = (err) => {
      console.warn('scaleImage img error', err);
      resolve(srcUrl);
    };
    img.src = srcUrl;
  });
}

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function calcCrc(table: Uint32Array, bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function injectPngTextChunk(arrayBuffer: ArrayBuffer, keyword: string, value: string): ArrayBuffer {
  const dv = new DataView(arrayBuffer);
  let offset = 8;
  let iendOffset = -1;
  while (offset < dv.byteLength) {
    if (offset + 8 > dv.byteLength) break;
    const length = dv.getUint32(offset);
    const type = String.fromCharCode(
      dv.getUint8(offset + 4),
      dv.getUint8(offset + 5),
      dv.getUint8(offset + 6),
      dv.getUint8(offset + 7)
    );
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    offset = offset + 8 + length + 4;
  }
  if (iendOffset === -1) throw new Error('无效的 PNG 结构: 未找到 IEND');

  const encoder = new TextEncoder();
  const kwBytes = encoder.encode(keyword);
  const valBytes = encoder.encode(value);
  const chunkData = new Uint8Array(kwBytes.length + 1 + valBytes.length);
  chunkData.set(kwBytes, 0);
  chunkData[kwBytes.length] = 0; // null byte
  chunkData.set(valBytes, kwBytes.length + 1);

  const crcTable = makeCrcTable();
  const crc = calcCrc(crcTable, chunkData);

  const chunkLength = chunkData.length;
  const totalChunkLen = 4 + 4 + chunkData.length + 4;
  const newBuf = new Uint8Array(arrayBuffer.byteLength + totalChunkLen);

  newBuf.set(new Uint8Array(arrayBuffer, 0, iendOffset), 0);

  let pos = iendOffset;
  const ndv = new DataView(newBuf.buffer);
  ndv.setUint32(pos, chunkLength);
  pos += 4;

  const typeStr = 'tEXt';
  for (let i = 0; i < 4; i++) {
    newBuf[pos + i] = typeStr.charCodeAt(i);
  }
  pos += 4;

  newBuf.set(chunkData, pos);
  pos += chunkData.length;

  ndv.setUint32(pos, crc);
  pos += 4;

  newBuf.set(new Uint8Array(arrayBuffer, iendOffset), pos);

  return newBuf.buffer;
}

/**
 * Creates pure SillyTavern card data stripped of local app metadata
 */
export function getPureCardDataForExport(cardData: any): any {
  const clean = JSON.parse(JSON.stringify(cardData));
  
  // Remove local app metadata if present
  delete clean.screenshots;
  delete clean.group;
  delete clean.category;
  delete clean.authorManual;
  delete clean.extraCovers;
  delete clean.activeCoverIndex;
  delete clean.coverImage;
  delete clean.id;
  delete clean.createdAt;
  delete clean.updatedAt;
  
  return clean;
}



export { compareCards } from './utils/diffEngine';
export type { DiffResult } from './utils/diffEngine';
export { autoAssociateAllAssets } from './utils/associationEngine';

export async function saveAppDataAsync(data: AppData): Promise<boolean> {
  return saveAppData(data);
}

export async function exportCardAsPng(card: CardEntry, appData?: AppData): Promise<void> {
  const pngBlob = await generateCardPngBlob(card, appData);
  triggerFileDownload(pngBlob, `${getCardDisplayName(card)}.png`);
}

export function exportCardAsJson(card: CardEntry): void {
  const pureData = getPureCardDataForExport(getCurrentCardData(card));
  downloadJson(pureData, `${getCardDisplayName(card)}.json`);
}

export function exportFullBackup(appData: AppData): void {
  downloadJson(appData, `tavern_vault_full_backup_${formatDateForFileName()}.json`);
}

export async function importFullBackup(file: File): Promise<AppData> {
  const text = await file.text();
  const data = JSON.parse(text);
  return data as AppData;
}

/**
 * 智能自动检测文本编码并读取字符串
 * 优先检测 UTF-8 BOM / UTF-16 BOM，严格校验 UTF-8，若失败自动回退尝试 GB18030 (覆盖 GBK/GB2312) 和 Big5
 */
export async function readTextWithEncodingAutoDetect(file: File | Blob): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length === 0) return '';

    // 1. Check Unicode BOM
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      try {
        return new TextDecoder('utf-8').decode(bytes.subarray(3));
      } catch {}
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      try {
        return new TextDecoder('utf-16le').decode(bytes.subarray(2));
      } catch {}
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      try {
        return new TextDecoder('utf-16be').decode(bytes.subarray(2));
      } catch {}
    }

    // 2. Try UTF-8 with fatal: true
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      return utf8Decoder.decode(bytes);
    } catch {
      // 3. Try GB18030 (standard Chinese encoding encompassing GBK and GB2312)
      try {
        const gbkDecoder = new TextDecoder('gb18030', { fatal: true });
        return gbkDecoder.decode(bytes);
      } catch {
        // 4. Try Big5
        try {
          const big5Decoder = new TextDecoder('big5', { fatal: true });
          return big5Decoder.decode(bytes);
        } catch {
          // Fallback: decode without fatal using gb18030 then utf-8
          try {
            return new TextDecoder('gb18030').decode(bytes);
          } catch {
            return new TextDecoder('utf-8').decode(bytes);
          }
        }
      }
    }
  } catch (err) {
    console.warn('readTextWithEncodingAutoDetect failed:', err);
    try {
      return await file.text();
    } catch {
      return '';
    }
  }
}

/**
 * 获取全局配置的 API 设置
 */
export function getGlobalApiSettings(appData?: any): { url: string; key: string; model: string; source: string } {
  const localUrl = localStorage.getItem('tavern_vault_default_api_url') || '';
  const localKey = localStorage.getItem('tavern_vault_default_api_key') || '';
  const localModel = localStorage.getItem('tavern_vault_default_api_model') || 'gpt-4o';

  if (localUrl && localKey) {
    return { url: localUrl, key: localKey, model: localModel, source: '全局系统设置' };
  }

  // Check appData.apiKeys
  const apiEntries = appData?.apiKeys || [];
  for (const entry of apiEntries) {
    if (entry.url && entry.keys && entry.keys.length > 0) {
      const activeKey = entry.keys[0].key;
      if (activeKey) {
        return {
          url: entry.url,
          key: activeKey,
          model: localModel || 'gpt-4o',
          source: `接口管理: ${entry.name}`,
        };
      }
    }
  }

  return {
    url: localUrl || 'https://api.openai.com/v1',
    key: localKey || '',
    model: localModel || 'gpt-4o',
    source: '默认配置',
  };
}

export async function parseNormalCardFile(file: File): Promise<NormalCardEntry> {
  const ext = file.name.toLowerCase().split('.').pop() || 'txt';
  const id = 'nc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  
  if (ext === 'json') {
    const text = await readTextWithEncodingAutoDetect(file);
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }
    
    // Check if it's SillyTavern V2 or V1 character card JSON
    const data = json.data || json;
    const charName = data.name || json.charName || json.char_name || json.name || file.name.replace(/\.[^/.]+$/, '');
    const creator = data.creator || json.author || json.creator || data.extensions?.author || '';
    const description = data.description || json.description || '';
    const personality = data.personality || json.personality || '';
    const scenario = data.scenario || json.scenario || '';
    const firstMes = data.first_mes || json.firstMes || json.first_mes || '';
    const mesExample = data.mes_example || json.mes_example || json.mesExample || '';
    const systemPrompt = data.system_prompt || json.system_prompt || json.systemPrompt || '';
    const postHistoryInstructions = data.post_history_instructions || json.post_history_instructions || json.postHistoryInstructions || '';
    const creatorNotes = data.creator_notes || json.creator_notes || json.creatorNotes || '';
    const characterVersion = data.character_version || json.character_version || json.characterVersion || '1.0';
    const altGreetings = Array.isArray(data.alternate_greetings) 
      ? data.alternate_greetings 
      : (Array.isArray(json.alternate_greetings) ? json.alternate_greetings : (Array.isArray(json.alternateGreetings) ? json.alternateGreetings : []));
    const customTags = Array.isArray(data.tags) ? data.tags : (Array.isArray(json.tags) ? json.tags : (Array.isArray(json.customTags) ? json.customTags : []));

    return {
      id,
      name: charName,
      charName,
      fileName: file.name,
      creator,
      author: creator,
      description,
      firstMes,
      alternateGreetings: altGreetings,
      scenario,
      personality,
      mesExample,
      systemPrompt,
      postHistoryInstructions,
      creatorNotes,
      characterVersion,
      content: typeof json === 'object' ? JSON.stringify(json, null, 2) : text,
      cardType: 'tavern',
      importFormat: 'json',
      rawData: json,
      jsonData: json,
      category: json.category || '默认',
      customTags,
      tags: customTags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } else if (ext === 'png' || ext === 'webp') {
    let coverImage: string | null = null;
    try {
      coverImage = await fileToDataURL(file);
    } catch {}

    try {
      const card = await parseCardFile(file);
      const raw = card.rawData || {};
      const data = raw.data || raw;

      const charName = card.name || data.name || file.name.replace(/\.[^/.]+$/, '');
      const creator = card.author || data.creator || raw.creator || '';
      const description = getCardDescription(card) || data.description || '';
      const personality = getCardPersonality(card) || data.personality || '';
      const scenario = data.scenario || raw.scenario || '';
      const firstMes = getCardGreeting(card) || data.first_mes || '';
      const mesExample = data.mes_example || raw.mes_example || '';
      const systemPrompt = data.system_prompt || raw.system_prompt || '';
      const postHistoryInstructions = data.post_history_instructions || raw.post_history_instructions || '';
      const creatorNotes = data.creator_notes || raw.creator_notes || '';
      const characterVersion = data.character_version || raw.character_version || '1.0';
      const altGreetings = getCardAlternateGreetings(card) || (Array.isArray(data.alternate_greetings) ? data.alternate_greetings : []);
      const tags = getCardTags(card) || (Array.isArray(data.tags) ? data.tags : []);

      return {
        id,
        name: charName,
        charName,
        fileName: file.name,
        author: creator,
        creator,
        description,
        firstMes,
        alternateGreetings: altGreetings,
        scenario,
        personality,
        mesExample,
        systemPrompt,
        postHistoryInstructions,
        creatorNotes,
        characterVersion,
        coverImage: coverImage || card.coverImage,
        content: JSON.stringify(card.rawData || card, null, 2),
        cardType: 'tavern',
        importFormat: ext === 'webp' ? 'webp' : 'png',
        rawData: card.rawData || card,
        jsonData: card.rawData || card,
        category: card.category || '默认',
        customTags: tags,
        tags,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    } catch {
      // If PNG does not contain embedded character card metadata, treat as image card
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      return {
        id,
        name: baseName,
        charName: baseName,
        fileName: file.name,
        author: '',
        creator: '',
        description: '',
        firstMes: '',
        alternateGreetings: [],
        scenario: '',
        personality: '',
        coverImage,
        content: `[图片角色卡: ${file.name}]`,
        cardType: 'tavern',
        importFormat: ext === 'webp' ? 'webp' : 'png',
        category: '默认',
        customTags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
  } else if (ext === 'docx' || ext === 'doc') {
    let docText = '';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      docText = result.value || '';
    } catch {
      try {
        docText = await readTextWithEncodingAutoDetect(file);
      } catch {
        docText = '';
      }
    }

    if (!docText || !docText.trim()) {
      try {
        docText = await readTextWithEncodingAutoDetect(file);
      } catch {}
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    // 文档格式只显示文档全部内容，不做字段提取和解析
    return {
      id,
      name: baseName,
      charName: baseName,
      fileName: file.name,
      author: '',
      creator: '',
      description: '',
      firstMes: '',
      alternateGreetings: [],
      scenario: '',
      personality: '',
      content: docText,
      cardType: 'document',
      importFormat: ext === 'doc' ? 'doc' : 'docx',
      category: '默认',
      customTags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } else {
    // txt or md or fallback format
    // 自动检测编码，避免 GBK / Big5 乱码
    const text = await readTextWithEncodingAutoDetect(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return {
      id,
      name: baseName,
      charName: baseName,
      fileName: file.name,
      author: '',
      creator: '',
      description: '',
      firstMes: '',
      alternateGreetings: [],
      scenario: '',
      personality: '',
      content: text,
      cardType: 'document',
      importFormat: ext === 'md' ? 'md' : 'txt',
      category: '默认',
      customTags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}

export async function parseCardFile(file: File): Promise<CardEntry> {
  const ext = file.name.toLowerCase().split('.').pop();
  const id = 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  if (ext === 'png' || ext === 'webp') {
    const buf = await file.arrayBuffer();
    const textChunks = await extractPngTextAsync(buf);

    let cardData: any = null;
    let version = 'unknown';
    let author = '';

    if (textChunks['ccv3']) {
      try {
        // CCv3 PNG 规范要求 ccv3 tEXt 的值为“JSON -> UTF-8 -> Base64”。
        // 为兼容部分工具导出的原始 JSON / URL-safe Base64，这里按多种形式依次尝试。
        const rawCcv3 = String(textChunks['ccv3'] || '').trim();
        const candidates: string[] = [rawCcv3];
        const normalizedBase64 = rawCcv3.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        if (normalizedBase64) {
          const padded = normalizedBase64 + '='.repeat((4 - (normalizedBase64.length % 4)) % 4);
          try {
            const decoded = atob(padded);
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
            candidates.push(new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '').trim());
          } catch {
            // 不是 Base64，继续尝试原始 JSON。
          }
        }

        let parsed: any = null;
        for (const candidate of candidates) {
          if (!candidate) continue;
          try {
            const value = JSON.parse(candidate);
            if (value && typeof value === 'object') {
              parsed = value;
              break;
            }
          } catch {
            // continue
          }
        }

        if (!parsed || typeof parsed !== 'object') throw new Error('ccv3 JSON 解码失败');
        const spec = parsed.spec || parsed.data?.spec;
        const specVersion = parsed.spec_version || parsed.data?.spec_version;
        if (spec && spec !== 'chara_card_v3' && spec !== 'chara_card_v2') {
          console.warn('未知角色卡 spec，仍尝试导入:', spec, specVersion);
        }
        cardData = parsed.data || parsed;
        version = 'v3';
        author = parsed.data?.creator || parsed.data?.extensions?.author || parsed.creator || parsed.author || '';
      } catch (e) {
        console.warn('CCv3 parse failed', e);
      }
    }

    if (!cardData && textChunks['chara']) {
      try {
        const decoded = atob(textChunks['chara']);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
        const jsonStr = new TextDecoder('utf-8').decode(bytes);
        cardData = JSON.parse(jsonStr);
        version = 'v2';
        author = cardData.author || cardData.creator || '';
      } catch (e) {
        console.warn('Chara V2 parse failed', e);
      }
    }

    if (!cardData) {
      throw new Error('无法识别的 PNG 角色卡格式 (未包含 chara 或 ccv3 数据)');
    }

    // 角色卡封面保持上传文件的原始像素尺寸与比例，不做缩放、裁剪或拉伸。
    const originalCover = await fileToDataURL(file);

    const recognizedName = cardData?.name || cardData?.char_name || cardData?.data?.name || file.name.replace(/\.[^/.]+$/, '');

    const rawTags1 = [
      ...(Array.isArray(cardData?.data?.tags) ? cardData.data.tags : []),
      ...(Array.isArray(cardData?.tags) ? cardData.tags : []),
      ...(Array.isArray(cardData?.data?.customTags) ? cardData.data.customTags : []),
      ...(Array.isArray(cardData?.customTags) ? cardData.customTags : []),
      ...(Array.isArray(cardData?.data?.extensions?.customTags) ? cardData.data.extensions.customTags : []),
      ...(Array.isArray(cardData?.data?.extensions?.tags) ? cardData.data.extensions.tags : [])
    ];

    const embeddedTags: string[] = Array.from(new Set(
      rawTags1
        .flatMap(t => String(t).split(/[,，、|]+/))
        .map(t => t.trim())
        .filter(Boolean)
    ));

    return {
      id,
      name: recognizedName,
      fileName: file.name,
      fileType: ext,
      version,
      author: author || '',
      authorManual: false,
      group: '默认',
      rawData: cardData,
      coverImage: originalCover,
      extraCovers: [],
      activeCoverIndex: 0,
      screenshots: { authorsNote: [], favoriteScenes: [] },
      customTags: embeddedTags,
      edited: false,
      editHistory: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } else if (ext === 'json') {
    const text = await file.text();
    let cardData: any;
    try {
      cardData = JSON.parse(text);
    } catch (e) {
      throw new Error('无效的 JSON 文件格式');
    }

    let version = 'json';
    let name = cardData.name || file.name.replace(/\.json$/, '');
    let author = '';

    if (cardData.data) {
      version = 'v3';
      const d = cardData.data;
      name = d.name || name;
      author = d.extensions?.author || d.author || cardData.author || '';
    } else if (cardData.char_name || cardData.name) {
      version = cardData.spec === 'chara_card_v2' ? 'v2' : cardData.spec || 'v2';
      name = cardData.char_name || cardData.name || name;
      author = cardData.author || cardData.creator || '';
    }

    const rawTags2 = [
      ...(Array.isArray(cardData?.data?.tags) ? cardData.data.tags : []),
      ...(Array.isArray(cardData?.tags) ? cardData.tags : []),
      ...(Array.isArray(cardData?.data?.customTags) ? cardData.data.customTags : []),
      ...(Array.isArray(cardData?.customTags) ? cardData.customTags : []),
      ...(Array.isArray(cardData?.data?.extensions?.customTags) ? cardData.data.extensions.customTags : []),
      ...(Array.isArray(cardData?.data?.extensions?.tags) ? cardData.data.extensions.tags : [])
    ];

    const embeddedTags: string[] = Array.from(new Set(
      rawTags2
        .flatMap(t => String(t).split(/[,，、|]+/))
        .map(t => t.trim())
        .filter(Boolean)
    ));

    return {
      id,
      name,
      fileName: file.name,
      fileType: 'json',
      version,
      author: author || '',
      authorManual: false,
      group: '默认',
      rawData: cardData,
      coverImage: null,
      extraCovers: [],
      activeCoverIndex: 0,
      screenshots: { authorsNote: [], favoriteScenes: [] },
      customTags: embeddedTags,
      edited: false,
      editHistory: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  throw new Error('不支持的文件格式: ' + ext);
}



/**
 * Standardize worldbook entries from various SillyTavern formats
 */
export function normalizeStWorldBookEntries(wbData: any): STWorldBookRule[] {
  if (!wbData) return [];
  if (Array.isArray(wbData.entries)) {
    return wbData.entries.map((entry: any, index: number) => ({
      id: entry.id !== undefined ? entry.id : index,
      keys: Array.isArray(entry.keys) ? entry.keys : (typeof entry.keys === 'string' ? entry.keys.split(',').map((k: string) => k.trim()).filter(Boolean) : []),
      secondary_keys: Array.isArray(entry.secondary_keys) ? entry.secondary_keys : (typeof entry.secondary_keys === 'string' ? entry.secondary_keys.split(',').map((k: string) => k.trim()).filter(Boolean) : []),
      comment: entry.comment || entry.name || entry.title || `条目 #${index + 1}`,
      content: entry.content || '',
      constant: Boolean(entry.constant),
      selective: entry.selective !== undefined ? Boolean(entry.selective) : true,
      insertion_order: typeof entry.insertion_order === 'number' ? entry.insertion_order : 100,
      enabled: entry.enabled !== undefined ? Boolean(entry.enabled) : (entry.disable !== undefined ? !entry.disable : true),
      position: entry.position || 'before_char',
      extensions: entry.extensions || {},
      ...entry,
    }));
  }
  if (wbData.entries && typeof wbData.entries === 'object') {
    return Object.values(wbData.entries).map((entry: any, index: number) => ({
      id: entry.id !== undefined ? entry.id : index,
      keys: Array.isArray(entry.keys) ? entry.keys : (typeof entry.keys === 'string' ? entry.keys.split(',').map((k: string) => k.trim()).filter(Boolean) : []),
      secondary_keys: Array.isArray(entry.secondary_keys) ? entry.secondary_keys : (typeof entry.secondary_keys === 'string' ? entry.secondary_keys.split(',').map((k: string) => k.trim()).filter(Boolean) : []),
      comment: entry.comment || entry.name || entry.title || `条目 #${index + 1}`,
      content: entry.content || '',
      constant: Boolean(entry.constant),
      selective: entry.selective !== undefined ? Boolean(entry.selective) : true,
      insertion_order: typeof entry.insertion_order === 'number' ? entry.insertion_order : 100,
      enabled: entry.enabled !== undefined ? Boolean(entry.enabled) : (entry.disable !== undefined ? !entry.disable : true),
      position: entry.position || 'before_char',
      extensions: entry.extensions || {},
      ...entry,
    }));
  }
  return [];
}

/**
 * Standardize ST Regex rules
 */
export function normalizeStRegexRules(regexData: any): STRegexRule[] {
  if (!regexData) return [];
  const list = Array.isArray(regexData) ? regexData : (regexData.rules || [regexData]);
  return list.map((item: any, idx: number) => {
    const rawObj = typeof item === 'object' && item !== null && !Array.isArray(item) ? item : {};
    const findRegex = typeof rawObj.findRegex === 'string'
      ? rawObj.findRegex
      : typeof rawObj.find_regex === 'string'
      ? rawObj.find_regex
      : typeof rawObj.pattern === 'string'
      ? rawObj.pattern
      : typeof rawObj.find === 'string'
      ? rawObj.find
      : typeof rawObj.regex === 'string'
      ? rawObj.regex
      : '';
    const replaceString = typeof rawObj.replaceString === 'string'
      ? rawObj.replaceString
      : typeof rawObj.replace_string === 'string'
      ? rawObj.replace_string
      : typeof rawObj.replacement === 'string'
      ? rawObj.replacement
      : typeof rawObj.replace === 'string'
      ? rawObj.replace
      : '';

    return {
      ...rawObj,
      id: rawObj.id || `rule_${idx}`,
      scriptName: (typeof rawObj.scriptName === 'string' ? rawObj.scriptName : typeof rawObj.script_name === 'string' ? rawObj.script_name : typeof rawObj.name === 'string' ? rawObj.name : typeof rawObj.title === 'string' ? rawObj.title : `规则 #${idx + 1}`),
      trimStrings: Array.isArray(rawObj.trimStrings) ? rawObj.trimStrings : (Array.isArray(rawObj.trim_strings) ? rawObj.trim_strings : []),
      placement: Array.isArray(rawObj.placement) ? rawObj.placement : [1, 2],
      disabled: Boolean(rawObj.disabled || rawObj.disable),
      isRegex: rawObj.isRegex !== undefined ? Boolean(rawObj.isRegex) : true,
      promptOnly: Boolean(rawObj.promptOnly || rawObj.prompt_only),
      markdownOnly: Boolean(rawObj.markdownOnly || rawObj.markdown_only),
      substituteRegex: Boolean(rawObj.substituteRegex || rawObj.substitute_regex),
      findRegex,
      replaceString,
    };
  });
}

/**
 * Extract built-in worldbook from a character card
 */
export function extractCardWorldBook(card: CardEntry): STWorldBookEntry | null {
  const wb = getCardWorldBook(card);
  if (!wb) return null;
  const entries = normalizeStWorldBookEntries(wb);
  if (entries.length === 0 && !wb.name && !wb.description && !wb.content) {
    return null;
  }
  const cardName = getCardDisplayName(card);
  const cardAuthor = getCardCreator(card);

  return {
    id: `wb_card_${card.id}`,
    name: wb.name || wb.title || `${cardName} (内置世界书)`,
    author: wb.author || cardAuthor || '',
    description: wb.description || `从角色卡「${cardName}」内置数据联动`,
    category: card.group || '默认',
    entries,
    jsonData: wb,
    sourceCardId: card.id,
    sourceCardName: cardName,
    isBuiltIn: true,
    createdAt: card.createdAt || Date.now(),
    updatedAt: card.updatedAt || Date.now(),
  };
}

/**
 * Extract built-in regex from a character card
 */
export function extractCardRegex(card: CardEntry): STRegexEntry | null {
  const rxList = getCardRegex(card);
  if (!rxList || rxList.length === 0) return null;
  const rules = normalizeStRegexRules(rxList);
  if (rules.length === 0) return null;

  const cardName = getCardDisplayName(card);
  const cardAuthor = getCardCreator(card);

  const firstRule = rules[0] || {};

  return {
    id: `rx_card_${card.id}`,
    scriptName: `${cardName} (内置正则)`,
    author: cardAuthor || '',
    description: `从角色卡「${cardName}」内置数据联动，包含 ${rules.length} 条替换规则`,
    category: card.group || '默认',
    findRegex: firstRule.findRegex || '',
    replaceString: firstRule.replaceString || '',
    disabled: false,
    rules,
    jsonData: rxList,
    sourceCardId: card.id,
    sourceCardName: cardName,
    isBuiltIn: true,
    createdAt: card.createdAt || Date.now(),
    updatedAt: card.updatedAt || Date.now(),
  };
}

/**
 * Extract built-in scripts / extensions from a character card (e.g. Quick Reply, embedded scripts)
 */
export function extractCardScripts(card: CardEntry): ScriptEntry[] {
  const scripts: ScriptEntry[] = [];
  const cardName = getCardDisplayName(card);
  const cardAuthor = getCardCreator(card);

  // 1. QR Data (Quick Reply)
  if (card.qrData && (Array.isArray(card.qrData.qrList) && card.qrData.qrList.length > 0)) {
    scripts.push({
      id: `script_qr_${card.id}`,
      name: `${cardName} (内置快捷回复 QR)`,
      author: cardAuthor || '',
      category: card.group || '默认',
      description: `从角色卡「${cardName}」内置 QR 快捷回复数据联动（包含 ${card.qrData.qrList.length} 条回复指令）`,
      jsonData: card.qrData,
      rawContent: JSON.stringify(card.qrData, null, 2),
      sourceCardId: card.id,
      sourceCardName: cardName,
      isBuiltIn: true,
      createdAt: card.createdAt || Date.now(),
      updatedAt: card.updatedAt || Date.now(),
    });
  }

  // 2. Extensions / scripts if present in rawData
  const extensions = card.rawData?.data?.extensions || card.rawData?.extensions;
  if (extensions && typeof extensions === 'object') {
    Object.entries(extensions).forEach(([extKey, extVal]) => {
      if (['regex_scripts', 'character_book', 'world_info'].includes(extKey)) return;
      if (extVal && typeof extVal === 'object' && Object.keys(extVal).length > 0) {
        scripts.push({
          id: `script_ext_${card.id}_${extKey}`,
          name: `${cardName} (内置扩展: ${extKey})`,
          author: cardAuthor || '',
          category: card.group || '默认',
          description: `从角色卡「${cardName}」内置扩展 extensions.${extKey} 数据联动`,
          jsonData: extVal,
          rawContent: JSON.stringify(extVal, null, 2),
          sourceCardId: card.id,
          sourceCardName: cardName,
          isBuiltIn: true,
          createdAt: card.createdAt || Date.now(),
          updatedAt: card.updatedAt || Date.now(),
        });
      }
    });
  }

  return scripts;
}

/**
 * Synchronize all cards' embedded worldbooks, regex, and scripts into AppData
 */
export function syncAllCardsToStData(appData: AppData): AppData {
  // Disabled expensive sync on every boot; assets are extracted on import.
  return appData;
  return appData;

  const cards = appData.cards || [];
  let mergedStWorldBooks = [...(appData.stWorldBooks || [])];
  let mergedStRegex = [...(appData.stRegexScripts || [])];
  let mergedScripts = [...(appData.scripts || [])];

  cards.forEach((card: CardEntry) => {
    const extracted = extractBundledAssets(card, {
      ...appData,
      stWorldBooks: mergedStWorldBooks,
      stRegexScripts: mergedStRegex,
      scripts: mergedScripts,
    }, {
      forceNewVersion: false,
    });

    if (extracted.newWorldBooks.length > 0) {
      extracted.newWorldBooks.forEach(w => {
        const idx = mergedStWorldBooks.findIndex(x => x.id === w.id);
        if (idx > -1) mergedStWorldBooks[idx] = w;
        else mergedStWorldBooks.push(w);
      });
    }

    if (extracted.newScripts.length > 0) {
      extracted.newScripts.forEach(s => {
        const idx = mergedScripts.findIndex(x => x.id === s.id);
        if (idx > -1) mergedScripts[idx] = s;
        else mergedScripts.push(s);
      });
    }

    if (extracted.newRegexes.length > 0) {
      extracted.newRegexes.forEach(r => {
        const idx = mergedStRegex.findIndex(x => x.id === r.id);
        if (idx > -1) mergedStRegex[idx] = r;
        else mergedStRegex.push(r);
      });
    }

    // Ensure card has bound IDs
    if (extracted.boundWbIds.length > 0 && (!card.boundWorldBooks || card.boundWorldBooks.length === 0)) {
      card.boundWorldBooks = extracted.boundWbIds;
    }
    if (extracted.boundScriptIds.length > 0 && (!card.boundScripts || card.boundScripts.length === 0)) {
      card.boundScripts = extracted.boundScriptIds;
    }
    if (extracted.boundRegexIds.length > 0 && (!card.boundRegexes || card.boundRegexes.length === 0)) {
      card.boundRegexes = extracted.boundRegexIds;
    }
  });

  return {
    ...appData,
    stWorldBooks: mergedStWorldBooks,
    stRegexScripts: mergedStRegex,
    scripts: mergedScripts,
  };
}

/**
 * Sync a modified ST WorldBook back to its source Character Card
 */
export function syncStWorldBookBackToCards(wb: STWorldBookEntry, cards: CardEntry[]): CardEntry[] {
  if (!wb.sourceCardId) return cards;
  return cards.map((card: CardEntry) => {
    if (card.id !== wb.sourceCardId) return card;
    const eh = { ...(card.editHistory || {}) };
    const currentWb = getCardWorldBook(card) || {};
    
    // Construct updated worldbook payload
    const updatedWb = {
      ...currentWb,
      name: wb.name,
      description: wb.description,
      entries: wb.entries,
    };

    eh.character_book = updatedWb;
    return {
      ...card,
      edited: true,
      editHistory: eh,
      updatedAt: Date.now(),
    };
  });
}

/**
 * Sync modified ST Regex back to its source Character Card
 */
export function syncStRegexBackToCards(rx: STRegexEntry, cards: CardEntry[]): CardEntry[] {
  if (!rx.sourceCardId) return cards;
  return cards.map((card: CardEntry) => {
    if (card.id !== rx.sourceCardId) return card;
    const eh = { ...(card.editHistory || {}) };
    
    const regexList = (rx.rules && rx.rules.length > 0)
      ? rx.rules
      : [{
          scriptName: rx.scriptName,
          findRegex: rx.findRegex,
          replaceString: rx.replaceString,
          disabled: rx.disabled,
        }];

    eh.regex_scripts = regexList;
    return {
      ...card,
      edited: true,
      editHistory: eh,
      updatedAt: Date.now(),
    };
  });
}



export interface SectionExportInfo {
  id: string;
  name: string;
  count: number;
  estimatedBytes: number;
  dataKeys: string[];
}

export interface BatchPartitionOptions {
  scope: 'all' | 'current' | 'custom';
  currentSectionId?: string;
  selectedSectionIds?: string[];
  batchMode: 'by-count' | 'by-size' | 'single';
  itemsPerBatch: number; // e.g. 50
  maxSizePerBatchMB: number; // e.g. 30MB
  excludeFonts?: boolean;
}

export interface GeneratedBatchPart {
  partIndex: number;
  totalParts: number;
  fileName: string;
  blob: Blob;
  url?: string;
  sizeBytes: number;
  itemCount: number;
  summary: string;
}

export interface ImportMergeReport {
  fileCount: number;
  addedCards: number;
  updatedCards: number;
  addedWorldBooks: number;
  addedRegex: number;
  addedChatLogs: number;
  addedPlugins: number;
  addedScripts: number;
  addedNormalCards: number;
  addedThemes: number;
  addedPresets: number;
  addedOthers: number;
  notes: string[];
}

// 格式化日期作为文件名
export function formatDateForFileName(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}`;
}

// 格式化文件体积大小
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// 粗略估算对象内存/JSON序列化体积
export function estimateObjectBytes(obj: any): number {
  if (obj === null || obj === undefined) return 0;
  if (typeof obj === 'string') return obj.length * 2;
  if (typeof obj === 'number') return 8;
  if (typeof obj === 'boolean') return 4;
  if (Array.isArray(obj)) {
    let sum = 0;
    for (let i = 0; i < obj.length; i++) {
      sum += estimateObjectBytes(obj[i]);
    }
    return sum;
  }
  if (typeof obj === 'object') {
    let sum = 0;
    for (const key of Object.keys(obj)) {
      sum += key.length * 2 + estimateObjectBytes(obj[key]);
    }
    return sum;
  }
  return 0;
}

// 所有板块配置定义
export const ALL_SECTIONS_CONFIG: Record<string, { dataKeys: string[]; label: string }> = {
  'st-cards': { dataKeys: ['cards', 'groups'], label: 'ST 角色卡' },
  'st-plugins': { dataKeys: ['plugins', 'pluginCategories'], label: 'ST 插件' },
  'st-scripts': { dataKeys: ['scripts', 'scriptCategories'], label: 'ST 脚本 / QR' },
  'st-qr': { dataKeys: ['scripts'], label: 'ST QR' },
  'st-worldbooks': { dataKeys: ['stWorldBooks', 'stWorldBookCategories'], label: 'ST 世界书' },
  'st-regex': { dataKeys: ['stRegexScripts', 'stRegexCategories'], label: 'ST 正则' },
  'chat-logs': { dataKeys: ['chatLogs', 'chatLogCategories'], label: '聊天记录存储' },
  'normal-cards': { dataKeys: ['normalCards', 'normalCardCategories'], label: '普通角色卡' },
  'st-themes': { dataKeys: ['themes', 'themeCategories'], label: 'ST 主题' },
  'st-presets': { dataKeys: ['presets', 'presetCategories'], label: 'ST 预设' },
  'st-mobile': { dataKeys: ['phoneLinks'], label: '小手机链接' },
  'stickers': { dataKeys: ['stickerPacks', 'stickerCategories'], label: '表情包' },
  'worldbook': { dataKeys: ['worldBooks', 'worldBookCategories'], label: '小手机世界书' },
  'extras-app': { dataKeys: ['extraStories', 'extraStoryCategories'], label: '番外小剧场' },
  'st-extras': { dataKeys: ['extraStories', 'extraStoryCategories'], label: '番外小剧场' },
  'chat-memes': { dataKeys: ['chatMemes', 'chatMemeCategories'], label: '聊天梗' },
  'themes': { dataKeys: ['beautifications', 'beautificationCategories'], label: '小手机美化' },
  'mobile-presets': { dataKeys: ['mobilePresets', 'mobilePresetCategories'], label: '破限/预设' },
  'mobile-html': { dataKeys: ['htmlStorages', 'htmlStorageCategories'], label: 'HTML 管理' },
  'fonts': { dataKeys: ['fonts', 'fontCategories'], label: '字体' },
  'user-personas': { dataKeys: ['userPersonas', 'userPersonaCategories'], label: '用户人设' },
  'background-images': { dataKeys: ['backgroundImages', 'backgroundImageCategories'], label: '聊天背景图' },
  'card-covers': { dataKeys: ['cardCovers', 'cardCoverCategories'], label: '角色卡面素材' },
  'api-storage': { dataKeys: ['apis', 'apiCategories'], label: 'API 存储' },
};

// 获取整个应用的数据概览与体积诊断
export function getAppDataBreakdown(appData: AppData): {
  sections: SectionExportInfo[];
  totalItems: number;
  totalEstimatedBytes: number;
} {
  const sections: SectionExportInfo[] = [];
  let totalItems = 0;
  let totalEstimatedBytes = 0;

  for (const [sectionId, config] of Object.entries(ALL_SECTIONS_CONFIG)) {
    let count = 0;
    let bytes = 0;

    for (const key of config.dataKeys) {
      const val = (appData as any)[key];
      if (Array.isArray(val)) {
        if (!key.endsWith('Categories') && key !== 'groups') {
          count += val.length;
        }
        bytes += estimateObjectBytes(val);
      }
    }

    sections.push({
      id: sectionId,
      name: config.label,
      count,
      estimatedBytes: bytes,
      dataKeys: config.dataKeys,
    });

    totalItems += count;
    totalEstimatedBytes += bytes;
  }

  return {
    sections,
    totalItems,
    totalEstimatedBytes,
  };
}

/**
 * 内存安全的大数据流式 JSON Blob 生成器
 * 逐条或小片段进行 stringify，并让出微任务/主线程，避免单一巨型字符串导致 V8 Invalid String Length 或页面卡顿崩溃
 */
export async function createSafeJsonBlob(
  data: Record<string, any>,
  onProgress?: (percent: number, stepText: string) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const parts: BlobPart[] = ['{\n'];
  const keys = Object.keys(data);
  const totalKeys = keys.length;

  for (let kIdx = 0; kIdx < totalKeys; kIdx++) {
    if (signal?.aborted) {
      const err = new Error('导出已被用户中断');
      err.name = 'AbortError';
      throw err;
    }

    const key = keys[kIdx];
    const val = data[key];

    parts.push(`  ${JSON.stringify(key)}: `);

    if (Array.isArray(val)) {
      parts.push('[\n');
      const itemChunkSize = 5; // 每5个复杂条目切一次，极度安全
      for (let i = 0; i < val.length; i += itemChunkSize) {
        if (signal?.aborted) {
          const err = new Error('导出已被用户中断');
          err.name = 'AbortError';
          throw err;
        }

        const chunk = val.slice(i, i + itemChunkSize);
        const chunkStrs: string[] = [];
        for (let item of chunk) {
          if (item?.payloadKey) item = await portableCard(item);
          if (item?.assetStub) item = await hydrateCardAsset(item);
          if (item?.incomingCard) item = { ...item, incomingCard: await portableCard(item.incomingCard), matchedCard: await portableCard(item.matchedCard) };
          chunkStrs.push(JSON.stringify(item));
        }
        const joined = chunkStrs.join(',\n');
        if (i > 0) parts.push(',\n');
        parts.push(joined);

        if (onProgress) {
          const currentProgress = Math.min(
            99,
            Math.round(((kIdx + i / val.length) / totalKeys) * 100)
          );
          onProgress(currentProgress, `正在写入字段「${key}」(${i + chunk.length}/${val.length})...`);
        }

        // 让出主线程
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      parts.push('\n  ]');
    } else if (val && typeof val === 'object') {
      parts.push(await createSafeJsonBlob(val, undefined, signal));
    } else {
      parts.push(JSON.stringify(val) ?? 'null');
    }

    if (kIdx < totalKeys - 1) {
      parts.push(',\n');
    }

    if (onProgress) {
      const currentProgress = Math.min(99, Math.round(((kIdx + 1) / totalKeys) * 100));
      onProgress(currentProgress, `已完成字段「${key}」`);
    }
  }

  parts.push('\n}');
  if (onProgress) onProgress(100, '正在生成最终文件...');
  return new Blob(parts, { type: 'application/json;charset=utf-8' });
}

/**
 * 智能分批 / 分卷导出生成引擎
 */
export async function generateBatchedExport(
  appData: AppData,
  options: BatchPartitionOptions,
  onProgress?: (progress: {
    stage: string;
    partIndex: number;
    totalParts: number;
    percent: number;
    details: string;
  }) => void,
  signal?: AbortSignal
): Promise<GeneratedBatchPart[]> {
  const { scope, currentSectionId, selectedSectionIds, batchMode, itemsPerBatch, maxSizePerBatchMB, excludeFonts } = options;

  // 1. 确定要导出的板块列表
  let targetSections: { id: string; config: { dataKeys: string[]; label: string } }[] = [];
  if (scope === 'current' && currentSectionId && ALL_SECTIONS_CONFIG[currentSectionId]) {
    targetSections = [{ id: currentSectionId, config: ALL_SECTIONS_CONFIG[currentSectionId] }];
  } else if (scope === 'custom' && selectedSectionIds && selectedSectionIds.length > 0) {
    targetSections = selectedSectionIds
      .filter((id) => ALL_SECTIONS_CONFIG[id])
      .map((id) => ({ id, config: ALL_SECTIONS_CONFIG[id] }));
  } else {
    // all
    targetSections = Object.entries(ALL_SECTIONS_CONFIG)
      .filter(([id]) => id !== 'st-qr' && (excludeFonts ? id !== 'fonts' : true))
      .map(([id, config]) => ({ id, config }));
  }

  // 2. 收集各字段数据
  const sharedCategories: Record<string, string[]> = {};
  const primaryItemLists: { key: string; sectionId: string; sectionLabel: string; items: any[] }[] = [];

  for (const sec of targetSections) {
    if (signal?.aborted) {
      const err = new Error('导出已被用户中断');
      err.name = 'AbortError';
      throw err;
    }
    for (const key of sec.config.dataKeys) {
      const original = (appData as any)[key];
      const val = key === 'scripts' && scope === 'current' ? (original || []).filter((entry: any) => currentSectionId === 'st-qr' ? entry.type === 'qr' : entry.type !== 'qr') : original;
      if (Array.isArray(val)) {
        if (key.endsWith('Categories') || key === 'groups') {
          sharedCategories[key] = Array.from(new Set(val));
        } else {
          primaryItemLists.push({
            key,
            sectionId: sec.id,
            sectionLabel: sec.config.label,
            items: val,
          });
        }
      }
    }
  }

  const totalPrimaryItems = primaryItemLists.reduce((acc, cur) => acc + cur.items.length, 0);

  // 3. 如果是单文件模式或者数据量较小不需要分批
  const effectiveBatchMode = batchMode === 'single' ? 'single' : (totalPrimaryItems <= itemsPerBatch && batchMode === 'by-count' ? 'single' : batchMode);

  if (effectiveBatchMode === 'single') {
    onProgress?.({
      stage: 'single',
      partIndex: 1,
      totalParts: 1,
      percent: 10,
      details: '正在准备单文件完整导出...',
    });

    const exportData: Record<string, any> = { ...sharedCategories };
    for (const list of primaryItemLists) {
      exportData[list.key] = list.items;
    }

    const payload = {
      format: scope === 'current' ? 'toolbox-section-backup' : 'toolbox-full-backup',
      version: 2,
      scope,
      section: currentSectionId,
      sectionName: currentSectionId ? ALL_SECTIONS_CONFIG[currentSectionId]?.label : '全部数据',
      exportedAt: new Date().toISOString(),
      itemCount: totalPrimaryItems,
      data: exportData,
    };

    const blob = await createSafeJsonBlob(
      payload,
      (p, text) => {
        onProgress?.({
          stage: 'single',
          partIndex: 1,
          totalParts: 1,
          percent: p,
          details: text,
        });
      },
      signal
    );

    const dateStr = formatDateForFileName();
    const fileName =
      scope === 'current'
        ? `toolbox-${currentSectionId}-${dateStr}.json`
        : `toolbox-backup-full-${dateStr}.json`;

    return [
      {
        partIndex: 1,
        totalParts: 1,
        fileName,
        blob,
        sizeBytes: blob.size,
        itemCount: totalPrimaryItems,
        summary: `${scope === 'current' ? ALL_SECTIONS_CONFIG[currentSectionId || '']?.label : '全部板块'}（共 ${totalPrimaryItems} 条数据）`,
      },
    ];
  }

  // 4. 分批分卷处理（按条数或按体积）
  // 建立分卷单元
  interface ChunkUnit {
    key: string;
    sectionLabel: string;
    items: any[];
  }

  const chunks: ChunkUnit[][] = [];
  let currentChunk: ChunkUnit[] = [];
  let currentChunkItemCount = 0;
  let currentChunkEstimatedBytes = 0;
  const maxBytesPerBatch = Math.max(5, maxSizePerBatchMB) * 1024 * 1024;
  const maxCountPerBatch = Math.max(5, itemsPerBatch);

  for (const list of primaryItemLists) {
    let itemIdx = 0;
    while (itemIdx < list.items.length) {
      // 决定本次放入当前 chunk 的条数
      let itemsToTake = 0;
      if (batchMode === 'by-count') {
        const remainingCountInBatch = maxCountPerBatch - currentChunkItemCount;
        itemsToTake = Math.min(remainingCountInBatch > 0 ? remainingCountInBatch : maxCountPerBatch, list.items.length - itemIdx);
      } else {
        // by-size
        itemsToTake = 0;
        let batchAccumBytes = currentChunkEstimatedBytes;
        for (let i = itemIdx; i < list.items.length; i++) {
          const itemBytes = estimateObjectBytes(list.items[i]);
          if (itemsToTake > 0 && batchAccumBytes + itemBytes > maxBytesPerBatch) {
            break;
          }
          batchAccumBytes += itemBytes;
          itemsToTake++;
        }
        if (itemsToTake === 0) itemsToTake = 1; // 至少取1条
      }

      // 如果当前 chunk 已经满了，先推入 chunks
      if (
        (batchMode === 'by-count' && currentChunkItemCount >= maxCountPerBatch) ||
        (batchMode === 'by-size' && currentChunkEstimatedBytes >= maxBytesPerBatch)
      ) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentChunkItemCount = 0;
          currentChunkEstimatedBytes = 0;
        }
      }

      const sliceItems = list.items.slice(itemIdx, itemIdx + itemsToTake);
      const sliceBytes = estimateObjectBytes(sliceItems);

      currentChunk.push({
        key: list.key,
        sectionLabel: list.sectionLabel,
        items: sliceItems,
      });

      currentChunkItemCount += sliceItems.length;
      currentChunkEstimatedBytes += sliceBytes;
      itemIdx += itemsToTake;

      if (
        (batchMode === 'by-count' && currentChunkItemCount >= maxCountPerBatch) ||
        (batchMode === 'by-size' && currentChunkEstimatedBytes >= maxBytesPerBatch)
      ) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentChunkItemCount = 0;
        currentChunkEstimatedBytes = 0;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  const totalParts = Math.max(1, chunks.length);
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const dateStr = formatDateForFileName();
  const generatedParts: GeneratedBatchPart[] = [];

  for (let partIdx = 0; partIdx < totalParts; partIdx++) {
    if (signal?.aborted) {
      const err = new Error('导出已被用户中断');
      err.name = 'AbortError';
      throw err;
    }
    const chunkDataUnits = chunks[partIdx] || [];
    const partNumber = partIdx + 1;

    onProgress?.({
      stage: 'generating',
      partIndex: partNumber,
      totalParts,
      percent: Math.round(((partIdx) / totalParts) * 100),
      details: `正在生成第 ${partNumber} / ${totalParts} 批数据...`,
    });

    const exportData: Record<string, any> = { ...sharedCategories };
    let partItemCount = 0;
    const partSectionSummaries: string[] = [];

    // 合并同 key 的 items
    for (const unit of chunkDataUnits) {
      if (!exportData[unit.key]) {
        exportData[unit.key] = [];
      }
      exportData[unit.key] = exportData[unit.key].concat(unit.items);
      partItemCount += unit.items.length;
      partSectionSummaries.push(`${unit.sectionLabel} (${unit.items.length}条)`);
    }

    const payload = {
      format: 'toolbox-batch-backup',
      version: 2,
      batchId,
      partIndex: partNumber,
      totalParts,
      scope,
      section: currentSectionId,
      exportedAt: new Date().toISOString(),
      itemCount: partItemCount,
      totalItems: totalPrimaryItems,
      data: exportData,
    };

    const blob = await createSafeJsonBlob(
      payload,
      (p, text) => {
        const overallPercent = Math.round(((partIdx + p / 100) / totalParts) * 100);
        onProgress?.({
          stage: 'generating',
          partIndex: partNumber,
          totalParts,
          percent: overallPercent,
          details: `第 ${partNumber}/${totalParts} 卷: ${text}`,
        });
      },
      signal
    );

    const scopePrefix = scope === 'current' ? `toolbox-${currentSectionId}` : 'toolbox-backup';
    const fileName = `${scopePrefix}-${dateStr}-part${partNumber}-of-${totalParts}.json`;

    generatedParts.push({
      partIndex: partNumber,
      totalParts,
      fileName,
      blob,
      sizeBytes: blob.size,
      itemCount: partItemCount,
      summary: partSectionSummaries.join(', ') || `分卷 ${partNumber}`,
    });

    // 让出主线程
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  onProgress?.({
    stage: 'done',
    partIndex: totalParts,
    totalParts,
    percent: 100,
    details: `已成功生成全部 ${totalParts} 个分批文件！`,
  });

  return generatedParts;
}

/**
 * 触发单个文件下载（安全跨浏览器与 iframe 环境）
 */
export function triggerFileDownload(blobOrDataUrl: Blob | string, fileName: string): void {
  let url: string;
  let isBlobUrl = false;

  if (typeof blobOrDataUrl === 'string') {
    if (blobOrDataUrl.startsWith('data:')) {
      try {
        const parts = blobOrDataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        url = URL.createObjectURL(blob);
        isBlobUrl = true;
      } catch (e) {
        url = blobOrDataUrl;
      }
    } else {
      url = blobOrDataUrl;
    }
  } else {
    url = URL.createObjectURL(blobOrDataUrl);
    isBlobUrl = true;
  }

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
    } catch (e) {}
    if (isBlobUrl) {
      URL.revokeObjectURL(url);
    }
  }, 60000);
}

/**
 * 安全连续触发多文件下载（附带时间间隔，避免浏览器拦截）
 */
export async function downloadAllBatchPartsSequentially(
  parts: GeneratedBatchPart[],
  intervalMs = 600,
  onStep?: (index: number, total: number, fileName: string) => void
): Promise<void> {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    onStep?.(i + 1, parts.length, part.fileName);
    triggerFileDownload(part.blob, part.fileName);
    if (i < parts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

/**
 * 多文件 / 分卷备份合并导入解析引擎
 */
export async function mergeImportFiles(
  files: File[],
  currentAppData: AppData,
  onProgress?: (currentFile: string, index: number, total: number) => void
): Promise<{
  nextAppData: AppData;
  report: ImportMergeReport;
}> {
  const report: ImportMergeReport = {
    fileCount: files.length,
    addedCards: 0,
    updatedCards: 0,
    addedWorldBooks: 0,
    addedRegex: 0,
    addedChatLogs: 0,
    addedPlugins: 0,
    addedScripts: 0,
    addedNormalCards: 0,
    addedThemes: 0,
    addedPresets: 0,
    addedOthers: 0,
    notes: [],
  };

  const nextAppData: any = { ...currentAppData };

  // 辅助合并带 id 的数组，支持去重与更新
  const mergeArrayById = (
    existingArray: any[] | undefined,
    incomingArray: any[] | undefined,
    onAdd: () => void,
    onUpdate: () => void
  ): any[] => {
    if (!Array.isArray(incomingArray)) return existingArray || [];
    const list = [...(existingArray || [])];
    const map = new Map<string, number>();
    list.forEach((item, idx) => {
      if (item?.id) map.set(item.id, idx);
    });

    for (const item of incomingArray) {
      if (!item) continue;
      if (item.id && map.has(item.id)) {
        const idx = map.get(item.id)!;
        list[idx] = { ...list[idx], ...item };
        onUpdate();
      } else {
        list.push(item);
        if (item.id) map.set(item.id, list.length - 1);
        onAdd();
      }
    }
    return list;
  };

  // 辅助合并字符串分类数组
  const mergeStringCategories = (existing: string[] | undefined, incoming: string[] | undefined): string[] => {
    if (!Array.isArray(incoming)) return existing || [];
    return Array.from(new Set([...(existing || []), ...incoming]));
  };

  for (let fIdx = 0; fIdx < files.length; fIdx++) {
    const file = files[fIdx];
    onProgress?.(file.name, fIdx + 1, files.length);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      let payloadData: Record<string, any> = {};
      if (parsed && typeof parsed === 'object') {
        if (parsed.data && typeof parsed.data === 'object') {
          payloadData = parsed.data;
        } else if (Array.isArray(parsed.cards) || Array.isArray(parsed.groups)) {
          payloadData = parsed;
        } else {
          payloadData = parsed;
        }
      }

      // 1. 合并分类与分组
      for (const key of Object.keys(payloadData)) {
        if (key.endsWith('Categories') || key === 'groups') {
          nextAppData[key] = mergeStringCategories(nextAppData[key], payloadData[key]);
        }
      }

      // 2. 合并各核心数组
      if (Array.isArray(payloadData.cards)) {
        nextAppData.cards = mergeArrayById(
          nextAppData.cards,
          payloadData.cards,
          () => report.addedCards++,
          () => report.updatedCards++
        );
      }

      if (Array.isArray(payloadData.stWorldBooks)) {
        nextAppData.stWorldBooks = mergeArrayById(
          nextAppData.stWorldBooks,
          payloadData.stWorldBooks,
          () => report.addedWorldBooks++,
          () => {}
        );
      }

      if (Array.isArray(payloadData.stRegexScripts)) {
        nextAppData.stRegexScripts = mergeArrayById(
          nextAppData.stRegexScripts,
          payloadData.stRegexScripts,
          () => report.addedRegex++,
          () => {}
        );
      }

      if (Array.isArray(payloadData.chatLogs)) {
        nextAppData.chatLogs = mergeArrayById(
          nextAppData.chatLogs,
          payloadData.chatLogs,
          () => report.addedChatLogs++,
          () => {}
        );
      }

      if (Array.isArray(payloadData.plugins)) {
        nextAppData.plugins = mergeArrayById(
          nextAppData.plugins,
          payloadData.plugins,
          () => report.addedPlugins++,
          () => {}
        );
      }

      if (Array.isArray(payloadData.scripts)) {
        nextAppData.scripts = mergeArrayById(
          nextAppData.scripts,
          payloadData.scripts,
          () => report.addedScripts++,
          () => {}
        );
      }

      if (Array.isArray(payloadData.normalCards)) {
        nextAppData.normalCards = mergeArrayById(
          nextAppData.normalCards,
          payloadData.normalCards,
          () => report.addedNormalCards++,
          () => {}
        );
      }

      if (Array.isArray(payloadData.themes)) {
        nextAppData.themes = mergeArrayById(
          nextAppData.themes,
          payloadData.themes,
          () => report.addedThemes++,
          () => {}
        );
      }

      if (Array.isArray(payloadData.presets)) {
        nextAppData.presets = mergeArrayById(
          nextAppData.presets,
          payloadData.presets,
          () => report.addedPresets++,
          () => {}
        );
      }

      // 其他数组（stickers, worldBooks, extraStories, chatMemes, beautifications, apis, phoneLinks）
      const otherKeys = ['stickers', 'stickerPacks', 'worldBooks', 'extraStories', 'chatMemes', 'beautifications', 'apis', 'phoneLinks'];
      for (const ok of otherKeys) {
        if (Array.isArray(payloadData[ok])) {
          nextAppData[ok] = mergeArrayById(
            nextAppData[ok],
            payloadData[ok],
            () => report.addedOthers++,
            () => {}
          );
        }
      }

      report.notes.push(`成功读取 ${file.name} (体积: ${formatBytes(file.size)})`);
    } catch (err: any) {
      console.error(`Merge file failed: ${file.name}`, err);
      report.notes.push(`⚠️ 文件 ${file.name} 解析失败: ${err?.message || String(err)}`);
    }

    // 让出主线程
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return {
    nextAppData,
    report,
  };
}

export function injectBoundAssetsForExport(card: import('./types').CardEntry, appData?: import('./types').AppData): any {
  const raw = card.rawData || {};
  const rawData = raw.data || raw;

  // Extract all standard character card fields
  const name = (rawData.name || raw.name || card.name || '').trim();
  const description = rawData.description ?? raw.description ?? '';
  const personality = rawData.personality ?? raw.personality ?? '';
  const scenario = rawData.scenario ?? raw.scenario ?? '';
  const first_mes = rawData.first_mes ?? raw.first_mes ?? '';
  const mes_example = rawData.mes_example ?? raw.mes_example ?? '';
  const creator_notes = rawData.creator_notes ?? raw.creator_notes ?? raw.comment ?? rawData.comment ?? '';
  const system_prompt = rawData.system_prompt ?? raw.system_prompt ?? '';
  const post_history_instructions = rawData.post_history_instructions ?? raw.post_history_instructions ?? '';
  const alternate_greetings = Array.isArray(rawData.alternate_greetings) 
    ? [...rawData.alternate_greetings] 
    : (Array.isArray(raw.alternate_greetings) ? [...raw.alternate_greetings] : []);
  const creator = card.author || rawData.creator || raw.creator || rawData.author || raw.author || '';
  const character_version = card.version || rawData.character_version || raw.character_version || '1.0';

  // Merge tags: card.customTags + raw tags + extension tags
  const tagSet = new Set<string>();
  if (Array.isArray(card.customTags)) card.customTags.forEach(t => t && tagSet.add(t));
  if (Array.isArray(rawData.tags)) rawData.tags.forEach((t: string) => t && tagSet.add(t));
  if (Array.isArray(raw.tags)) raw.tags.forEach((t: string) => t && tagSet.add(t));
  if (Array.isArray(rawData.extensions?.tags)) rawData.extensions.tags.forEach((t: string) => t && tagSet.add(t));
  const tags = Array.from(tagSet);

  // Extensions
  const extensions: Record<string, any> = {
    ...(raw.extensions || {}),
    ...(rawData.extensions || {}),
  };
  if (tags.length > 0) {
    extensions.tags = tags;
  }

  // Character Book (World Book)
  let character_book = rawData.character_book || raw.character_book || undefined;
  if (appData && card.boundWorldBooks?.length) {
    const wbList = (appData.stWorldBooks || []).filter(wb => card.boundWorldBooks!.includes(wb.id));
    if (wbList.length > 0) {
      const targetWb = wbList[0];
      character_book = {
        ...(character_book || {}), ...(targetWb.jsonData || {}),
        name: targetWb.name || targetWb.fileName || `${name}_世界书`,
        description: targetWb.description || '',
        scan_depth: (targetWb as any).scan_depth ?? 100,
        token_budget: (targetWb as any).token_budget ?? 2048,
        recursive_scanning: (targetWb as any).recursive_scanning ?? false,
        extensions: (targetWb as any).extensions || {},
        entries: (Array.isArray(targetWb.entries) ? targetWb.entries : Object.values(targetWb.entries || {})).map((e: any, idx: number) => ({
          ...e,
          id: e.id ?? idx,
          keys: Array.isArray(e.keys) ? e.keys : (typeof e.keys === 'string' ? e.keys.split(',').map((k: string) => k.trim()) : (e.key ? [e.key] : [])),
          secondary_keys: e.secondary_keys || [],
          comment: e.comment || e.name || '',
          content: e.content || '',
          constant: Boolean(e.constant),
          selective: Boolean(e.selective ?? true),
          insertion_order: e.insertion_order ?? (e.order ?? 100),
          enabled: e.enabled !== false,
          position: e.position || 'before_char',
          use_regex: Boolean(e.use_regex),
          extensions: e.extensions || {}
        }))
      };
    }
  }

  // Quick Reply / Tavern Helper Scripts
  if (appData && card.boundScripts?.length) {
    const scriptList = (appData.scripts || []).filter(s => card.boundScripts!.includes(s.id));
    if (scriptList.length > 0) {
      const leaves = scriptList.flatMap(s => s.entries?.length ? s.entries : resourceLeaves(s.jsonData || { name: s.name, type: 'script', content: s.rawContent }, 'script'));
      const helper = extensions.tavern_helper;
      if (Array.isArray(helper)) {
        const scriptPair = helper.find(pair => Array.isArray(pair) && (pair[0] === 'scripts' || pair[0] === 'script'));
        if (scriptPair) scriptPair[1] = leaves;
        else helper.push(['scripts', leaves]);
      } else extensions.tavern_helper = { ...(helper || {}), scripts: leaves };
    }
  }

  // Regex Scripts
  if (appData && card.boundRegexes?.length) {
    const regexList = (appData.stRegexScripts || []).filter(r => card.boundRegexes!.includes(r.id));
    if (regexList.length > 0) {
      extensions.regex_scripts = regexList.flatMap(r => r.rules?.length ? r.rules : resourceLeaves(r.jsonData || {
        id: r.id,
        scriptName: r.scriptName,
        findRegex: r.findRegex,
        replaceString: r.replaceString,
        trimStrings: (r as any).trimStrings || [],
        placement: (r as any).placement || [1, 2],
        disabled: Boolean(r.disabled),
        isMarkdown: Boolean((r as any).isMarkdown),
        promptOnly: Boolean((r as any).promptOnly),
        runOnEdit: Boolean((r as any).runOnEdit),
        substituteRegex: Boolean((r as any).substituteRegex),
        minDepth: (r as any).minDepth ?? null,
        maxDepth: (r as any).maxDepth ?? null
      }, 'regex'));
    }
  }

  if (card.qrData) extensions.qrData = card.qrData;

  const dataPayload: Record<string, any> = {
    name,
    description,
    personality,
    scenario,
    first_mes,
    mes_example,
    creator_notes,
    system_prompt,
    post_history_instructions,
    alternate_greetings,
    tags,
    creator,
    character_version,
    extensions
  };

  if (character_book) {
    dataPayload.character_book = character_book;
  }

  // If card is explicitly CCv3
  if (card.version === 'v3' || raw.spec === 'chara_card_v3') {
    return {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: dataPayload
    };
  }

  // For CCv2 (Dual format: both top-level and data fields present for universal compatibility across SillyTavern versions)
  return {
    ...dataPayload,
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: dataPayload
  };
}

/**
 * Generates an authentic SillyTavern Character Card PNG Blob
 * with embedded CCv3 & CCv2 metadata text chunks.
 */
export async function generateCardPngBlob(card: import('./types').CardEntry, appData?: import('./types').AppData): Promise<Blob> {
  card = { ...await hydrateCard(card) };
  const storedCover = await getCardCover(card);
  if (storedCover instanceof Blob) card = { ...card, coverImage: await fileToDataURL(storedCover as File) };
  else if (storedCover) card = { ...card, coverImage: storedCover };
  const fullExportObj = injectBoundAssetsForExport(card, await hydrateCardBoundAssets(card, appData));
  const dataPayload = fullExportObj.data || fullExportObj;

  const v3Data = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: dataPayload
  };

  const v2Data = {
    ...dataPayload,
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: dataPayload
  };

  // Unicode safe Base64 encoder
  const toBase64 = (obj: any) => {
    const jsonStr = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    const chunkSz = 8192;
    for (let i = 0; i < bytes.length; i += chunkSz) {
      const chunk = bytes.subarray(i, i + chunkSz);
      binary += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binary);
  };

  const ccv3Chunk = toBase64(v3Data);
  const charaChunk = toBase64(v2Data);

  let baseImageUrl = card.coverImage || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQAQMAAAC6caOPAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAADpJREFUeN7twTEBAAAAwqD1T20ND6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8Gv3oAABR9Z9AAAAAABJRU5ErkJggg==';

  const img = new Image();
  if (!baseImageUrl.startsWith('data:') && !baseImageUrl.startsWith('blob:')) {
    img.crossOrigin = 'anonymous';
  }

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = baseImageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(100, img.width || 400);
  canvas.height = Math.max(100, img.height || 600);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context error');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pngBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!pngBlob) throw new Error('Failed to create PNG blob');

  const arrayBuf = await pngBlob.arrayBuffer();

  // Inject BOTH ccv3 and chara chunks for 100% interoperability with all SillyTavern versions
  let injectedBuf = injectPngTextChunk(arrayBuf, 'ccv3', ccv3Chunk);
  injectedBuf = injectPngTextChunk(injectedBuf, 'chara', charaChunk);

  return new Blob([injectedBuf], { type: 'image/png' });
}


export function normalizeResourceName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[【】\[\]\(\)（）\{\}《》〈〉_\-\s·:：]+/g, '')
    .replace(/(世界书|worldbook|lorebook|script|脚本|正则|regex)+$/i, '')
    .trim();
}

export function normalizeAssociationName(value: string) {
  let name = (value || '').trim().toLowerCase();
  // 允许“陆宴辞（dk）/dk版”“陆宴辞（社畜版）”与“陆宴辞”识别为同一主体；作者仍必须完全相同。
  name = name.split('/')[0].trim();
  name = name.replace(/[（(【\[].*?[）)】\]]/g, '').trim();
  name = name.replace(/\s+/g, '');
  name = name.replace(/(?:版|ver\.?|v\d+)$/i, '');
  return name;
}

export function extractBundledAssets(
  card: import('./types').CardEntry,
  currentAppData: import('./types').AppData,
  options?: {
    forceNewVersion?: boolean;
    versionSummary?: string;
    matchedCard?: import('./types').CardEntry | null;
    cardVersionLabel?: string;
  }
) {
  const result = {
    newWorldBooks: [] as import('./types').STWorldBookEntry[],
    newScripts: [] as import('./types').ScriptEntry[],
    newRegexes: [] as import('./types').STRegexEntry[],
    boundWbIds: [] as string[],
    boundScriptIds: [] as string[],
    boundRegexIds: [] as string[],
  };
  const raw = card.rawData?.data || card.rawData;
  if (!raw) return result;

  const matched = options?.matchedCard;
  const targetCardId = matched?.id || card.id;
  const targetCardName = (matched?.name || card.name || '').trim();
  const cardVerLabel = options?.cardVersionLabel || (matched ? `v${(matched.versions?.length || 0) + 2}` : ((card as any).activeVersionLabel || (card.versions?.length ? `v${card.versions.length + 1}` : 'v1')));
  const normCardName = normalizeResourceName(targetCardName || card.name);
  const forceNewVer = Boolean(options?.forceNewVersion);

  const targetBoundWbs = new Set<string>([...(matched?.boundWorldBooks || []), ...(card.boundWorldBooks || [])]);
  const targetBoundScrs = new Set<string>([...(matched?.boundScripts || []), ...(card.boundScripts || [])]);
  const targetBoundRxs = new Set<string>([...(matched?.boundRegexes || []), ...(card.boundRegexes || [])]);

  // 1. WorldBooks (世界书 - 严格 1 张角色卡对应 1 本专属绑定世界书)
  if (raw.character_book && Array.isArray(raw.character_book.entries)) {
    const rawWbName = (raw.character_book.name || '').trim();
    const wbName = rawWbName || `${targetCardName || card.name}_世界书`;

    // 严格从已绑定 ID、同角色源 ID、完全匹配同名中查找专属世界书，绝不错位匹配其他角色
    let existingWb = (currentAppData.stWorldBooks || []).find(wb => {
      if (targetBoundWbs.has(wb.id)) return true;
      if (wb.id === `wb_card_${targetCardId}` || wb.id === `wb_card_${card.id}`) return true;
      if (wb.sourceCardId && (wb.sourceCardId === targetCardId || wb.sourceCardId === card.id)) return true;
      if (!wb.sourceCardId && wb.name && wb.name.trim().toLowerCase() === wbName.toLowerCase()) return true;
      return false;
    });

    const normalizedEntries = normalizeStWorldBookEntries(raw.character_book);

    if (existingWb) {
      let isIdentical = false;
      const diff = compareWorldBooks(normalizedEntries, raw.character_book, existingWb);
      if (diff.status === 'identical') isIdentical = true;

      if (isIdentical && !options?.forceNewVersion) {
        // 内容完全一致且未强制生成新版本：复用原有世界书并关联，不压入无意义的重复历史快照
        const updatedWb = {
          ...existingWb,
          sourceCardId: targetCardId,
          sourceCardName: targetCardName,
          sourceCardVersion: cardVerLabel,
          updatedAt: Date.now()
        };
        result.newWorldBooks.push(updatedWb);
        result.boundWbIds.push(updatedWb.id);
      } else {
        const currentVersions = existingWb.versions || [];
        const verNum = currentVersions.length + 1;
        const prevSnapshot = {
          versionId: `ver_${existingWb.id}_${verNum}_${Date.now()}`,
          versionNumber: verNum,
          versionLabel: existingWb.activeVersionLabel || `v${verNum}`,
          updatedAt: existingWb.updatedAt || existingWb.createdAt || Date.now(),
          importedAt: existingWb.importedAt || existingWb.createdAt || Date.now(),
          changeSummary: existingWb.currentVersionSummary || `系统快照 (版本更迭前)`,
          data: {
            name: existingWb.name,
            description: existingWb.description,
            entries: JSON.parse(JSON.stringify(Array.isArray(existingWb.entries) ? existingWb.entries : Object.values(existingWb.entries || {}))),
            jsonData: existingWb.jsonData ? JSON.parse(JSON.stringify(existingWb.jsonData)) : undefined
          }
        };

        const updatedWb = {
          ...existingWb,
          name: raw.character_book.name || existingWb.name,
          description: raw.character_book.description || existingWb.description || '',
          entries: normalizedEntries,
          jsonData: raw.character_book,
          sourceCardId: targetCardId,
          sourceCardName: targetCardName,
          sourceCardVersion: cardVerLabel,
          updatedAt: Date.now(),
          importedAt: Date.now(),
          activeVersionNumber: verNum + 1,
          activeVersionLabel: cardVerLabel || `v${verNum + 1}`,
          currentVersionSummary: options?.versionSummary || diff.summary || `随角色卡 [${targetCardName || card.name}] 更新版本 (词条内容变更)`,
          versions: [...currentVersions, prevSnapshot]
        };

        result.newWorldBooks.push(updatedWb);
        result.boundWbIds.push(updatedWb.id);
      }
    } else {
      // 库中不存在关联的世界书，新建初版世界书文件
      const wbId = 'stwb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      result.newWorldBooks.push({
        id: wbId,
        name: wbName,
        description: raw.character_book.description || '',
        entries: normalizedEntries,
        jsonData: raw.character_book,
        sourceCardId: targetCardId,
        sourceCardName: targetCardName,
        sourceCardVersion: cardVerLabel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        importedAt: Date.now(),
        activeVersionNumber: 1,
        activeVersionLabel: 'v1',
        currentVersionSummary: `首次随角色卡 [${targetCardName || card.name}] 绑定导入`,
        customTags: [],
        versions: []
      });
      result.boundWbIds.push(wbId);
    }
  }

  // 2. Scripts (酒馆脚本 - 融合为单个角色卡脚本文件，包含所有子条目)
  const rawScriptsData = raw.extensions?.tavern_helper || raw.extensions?.scripts;
  const scriptList: any[] = resourceLeaves(rawScriptsData, 'script');

  if (scriptList.length > 0) {
    const sName = `[${targetCardName || card.name}] 酒馆脚本`;
    const normSName = normalizeResourceName(sName);

    const scriptEntries: import('./types').ScriptItemRule[] = scriptList.map((s: any, idx: number) => {
      const subName = (s.name || s.scriptName || s.title || `脚本条目 #${idx + 1}`).trim();
      const content = typeof s.content === 'string' ? s.content : (s.code || (typeof s === 'string' ? s : JSON.stringify(s, null, 2)));
      return {
        id: s.id || `sub_script_${idx}_${Date.now()}`,
        name: subName,
        type: s.type || 'script',
        content,
        description: s.description || s.desc || '',
        enabled: s.enabled !== false,
        ...s
      };
    });

    let existingS = (currentAppData.scripts || []).find(scr => {
      if (targetBoundScrs.has(scr.id)) return true;
      if (scr.id === `script_ext_${targetCardId}` || scr.id === `script_ext_${card.id}`) return true;
      if (scr.sourceCardId && (scr.sourceCardId === targetCardId || scr.sourceCardId === card.id)) return true;
      if (!scr.sourceCardId && !scr.sourcePresetId && scr.name && scr.name.trim().toLowerCase() === sName.toLowerCase()) return true;
      return false;
    });

    let isIdentical = false;
    if (existingS) {
      const currentContent = JSON.stringify(existingS.jsonData || existingS.entries || existingS.rawContent || '');
      const incomingContent = JSON.stringify(rawScriptsData);
      if (currentContent === incomingContent) isIdentical = true;
    }

    if (existingS) {
      if (isIdentical && !options?.forceNewVersion) {
        const updatedS = {
          ...existingS,
          sourceCardId: targetCardId,
          sourceCardName: targetCardName,
          sourceCardVersion: cardVerLabel,
          updatedAt: Date.now()
        };
        result.newScripts.push(updatedS);
        result.boundScriptIds.push(updatedS.id);
      } else {
        const currentVersions = existingS.versions || [];
        const verNum = currentVersions.length + 1;
        const prevSnapshot = {
          versionId: `ver_${existingS.id}_${verNum}_${Date.now()}`,
          versionNumber: verNum,
          versionLabel: existingS.activeVersionLabel || `v${verNum}`,
          updatedAt: existingS.updatedAt || existingS.createdAt || Date.now(),
          importedAt: existingS.importedAt || existingS.createdAt || Date.now(),
          changeSummary: existingS.currentVersionSummary || `系统快照 (版本更迭前)`,
          data: {
            name: existingS.name,
            entries: JSON.parse(JSON.stringify(Array.isArray(existingS.entries) ? existingS.entries : Object.values(existingS.entries || {}))),
            jsonData: existingS.jsonData ? JSON.parse(JSON.stringify(existingS.jsonData)) : undefined,
            rawContent: existingS.rawContent
          }
        };

        const updatedS = {
          ...existingS,
          entries: scriptEntries,
          rawContent: JSON.stringify(rawScriptsData, null, 2),
          jsonData: rawScriptsData,
          sourceCardId: targetCardId,
          sourceCardName: targetCardName,
          sourceCardVersion: cardVerLabel,
          updatedAt: Date.now(),
          importedAt: Date.now(),
          activeVersionNumber: verNum + 1,
          activeVersionLabel: cardVerLabel || `v${verNum + 1}`,
          currentVersionSummary: options?.versionSummary || `随角色卡 [${targetCardName || card.name}] 更新版本 (共 ${scriptEntries.length} 条条目)`,
          versions: [...currentVersions, prevSnapshot]
        };

        result.newScripts.push(updatedS);
        result.boundScriptIds.push(updatedS.id);
      }
    } else {
      const sId = 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      result.newScripts.push({
        id: sId,
        name: sName,
        type: 'card_scripts',
        entries: scriptEntries,
        rawContent: JSON.stringify(rawScriptsData, null, 2),
        jsonData: rawScriptsData,
        sourceCardId: targetCardId,
        sourceCardName: targetCardName,
        sourceCardVersion: cardVerLabel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        importedAt: Date.now(),
        activeVersionNumber: 1,
        activeVersionLabel: 'v1',
        currentVersionSummary: `首次随角色卡 [${targetCardName || card.name}] 绑定导入 (共 ${scriptEntries.length} 条条目)`,
        customTags: [],
        versions: []
      });
      result.boundScriptIds.push(sId);
    }
  }

  // 3. Regex Scripts (正则脚本 - 融合为单个角色卡正则文件，包含所有子条目)
  const rawRegexData = raw.extensions?.regex_scripts || raw.extensions?.regex;
  const regexList: any[] = Array.isArray(rawRegexData)
    ? rawRegexData
    : rawRegexData && typeof rawRegexData === 'object'
    ? [rawRegexData]
    : [];

  if (regexList.length > 0) {
    const rName = `[${targetCardName || card.name}] 正则脚本`;
    const normRName = normalizeResourceName(rName);

    const regexRules: import('./types').STRegexRule[] = regexList.map((r: any, idx: number) => {
      const rawObj = typeof r === 'object' && r !== null && !Array.isArray(r) ? r : {};
      const ruleName = (typeof rawObj.scriptName === 'string' ? rawObj.scriptName : typeof rawObj.script_name === 'string' ? rawObj.script_name : typeof rawObj.name === 'string' ? rawObj.name : typeof rawObj.title === 'string' ? rawObj.title : `正则规则 #${idx + 1}`).trim();
      const findRegex = typeof rawObj.findRegex === 'string'
        ? rawObj.findRegex
        : typeof rawObj.find_regex === 'string'
        ? rawObj.find_regex
        : typeof rawObj.pattern === 'string'
        ? rawObj.pattern
        : typeof rawObj.find === 'string'
        ? rawObj.find
        : typeof rawObj.regex === 'string'
        ? rawObj.regex
        : '';
      const replaceString = typeof rawObj.replaceString === 'string'
        ? rawObj.replaceString
        : typeof rawObj.replace_string === 'string'
        ? rawObj.replace_string
        : typeof rawObj.replacement === 'string'
        ? rawObj.replacement
        : typeof rawObj.replace === 'string'
        ? rawObj.replace
        : '';
      return {
        ...rawObj,
        id: rawObj.id || `sub_regex_${idx}_${Date.now()}`,
        scriptName: ruleName,
        trimStrings: Array.isArray(rawObj.trimStrings) ? rawObj.trimStrings : (Array.isArray(rawObj.trim_strings) ? rawObj.trim_strings : []),
        placement: Array.isArray(rawObj.placement) ? rawObj.placement : [1, 2],
        disabled: rawObj.disabled === true,
        isRegex: rawObj.isRegex !== false,
        promptOnly: Boolean(rawObj.promptOnly || rawObj.prompt_only),
        markdownOnly: Boolean(rawObj.markdownOnly || rawObj.markdown_only),
        substituteRegex: Boolean(rawObj.substituteRegex || rawObj.substitute_regex),
        findRegex,
        replaceString,
      };
    });

    let existingR = (currentAppData.stRegexScripts || []).find(rx => {
      if (targetBoundRxs.has(rx.id)) return true;
      if (rx.id === `rx_card_${targetCardId}` || rx.id === `rx_card_${card.id}`) return true;
      if (rx.sourceCardId && (rx.sourceCardId === targetCardId || rx.sourceCardId === card.id)) return true;
      if (!rx.sourceCardId && !rx.sourcePresetId && rx.scriptName && rx.scriptName.trim().toLowerCase() === rName.toLowerCase()) return true;
      return false;
    });

    let isIdentical = false;
    if (existingR) {
      const currentContent = JSON.stringify(existingR.jsonData || existingR.rules || '');
      const incomingContent = JSON.stringify(rawRegexData);
      if (currentContent === incomingContent) isIdentical = true;
    }

    const firstRule = regexRules[0] || { findRegex: '', replaceString: '' };

    if (existingR) {
      if (isIdentical && !options?.forceNewVersion) {
        const updatedR = {
          ...existingR,
          sourceCardId: targetCardId,
          sourceCardName: targetCardName,
          sourceCardVersion: cardVerLabel,
          updatedAt: Date.now()
        };
        result.newRegexes.push(updatedR);
        result.boundRegexIds.push(updatedR.id);
      } else {
        const currentVersions = existingR.versions || [];
        const verNum = currentVersions.length + 1;
        const prevSnapshot = {
          versionId: `ver_${existingR.id}_${verNum}_${Date.now()}`,
          versionNumber: verNum,
          versionLabel: existingR.activeVersionLabel || `v${verNum}`,
          updatedAt: existingR.updatedAt || existingR.createdAt || Date.now(),
          importedAt: existingR.importedAt || existingR.createdAt || Date.now(),
          changeSummary: existingR.currentVersionSummary || `系统快照 (版本更迭前)`,
          data: {
            scriptName: existingR.scriptName,
            findRegex: existingR.findRegex,
            replaceString: existingR.replaceString,
            rules: JSON.parse(JSON.stringify(existingR.rules || [])),
            jsonData: existingR.jsonData ? JSON.parse(JSON.stringify(existingR.jsonData)) : undefined
          }
        };

        const updatedR = {
          ...existingR,
          findRegex: firstRule.findRegex,
          replaceString: firstRule.replaceString,
          rules: regexRules,
          jsonData: rawRegexData,
          sourceCardId: targetCardId,
          sourceCardName: targetCardName,
          sourceCardVersion: cardVerLabel,
          updatedAt: Date.now(),
          importedAt: Date.now(),
          activeVersionNumber: verNum + 1,
          activeVersionLabel: cardVerLabel || `v${verNum + 1}`,
          currentVersionSummary: options?.versionSummary || `随角色卡 [${targetCardName || card.name}] 更新版本 (共 ${regexRules.length} 条规则)`,
          versions: [...currentVersions, prevSnapshot]
        };

        result.newRegexes.push(updatedR);
        result.boundRegexIds.push(updatedR.id);
      }
    } else {
      const rId = 'stregex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      result.newRegexes.push({
        id: rId,
        scriptName: rName,
        findRegex: firstRule.findRegex,
        replaceString: firstRule.replaceString,
        rules: regexRules,
        jsonData: rawRegexData,
        sourceCardId: targetCardId,
        sourceCardName: targetCardName,
        sourceCardVersion: cardVerLabel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        importedAt: Date.now(),
        activeVersionNumber: 1,
        activeVersionLabel: 'v1',
        currentVersionSummary: `首次随角色卡 [${targetCardName || card.name}] 绑定导入 (共 ${regexRules.length} 条规则)`,
        customTags: [],
        versions: []
      });
      result.boundRegexIds.push(rId);
    }
  }

  return result;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function downloadJson(data: any, fileName = 'export.json'): void {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const finalName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  triggerFileDownload(blob, finalName);
}

export async function createZip(files: Array<{ name: string; content: Blob | Uint8Array | string }>): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate');
  const zipData: { [key: string]: Uint8Array } = {};

  for (const f of files) {
    if (f.content instanceof Blob) {
      const buffer = await f.content.arrayBuffer();
      zipData[f.name] = new Uint8Array(buffer);
    } else if (typeof f.content === 'string') {
      zipData[f.name] = strToU8(f.content);
    } else {
      zipData[f.name] = f.content;
    }
  }

  const zipped = zipSync(zipData);
  return new Blob([zipped as any], { type: 'application/zip' });
}

export async function extractZip(file: File | Blob): Promise<{ [filename: string]: Uint8Array }> {
  const { unzipSync } = await import('fflate');
  const buffer = await file.arrayBuffer();
  return unzipSync(new Uint8Array(buffer));
}

export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  const str = String(text);
  if (!str.trim()) return 0;
  const cjkMatches = str.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || [];
  const cjkCount = cjkMatches.length;
  const nonCjkStr = str.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ');
  const wordMatches = nonCjkStr.match(/\w+|[^\w\s]/g) || [];
  const nonCjkTokenCount = wordMatches.length;
  return Math.ceil(cjkCount * 1.35 + nonCjkTokenCount);
}

export function sortItemList<T>(
  items: T[],
  sortOrder: 'default' | 'az' | 'za' | 'newest' | 'oldest',
  getName: (item: T) => string,
  getCreatedAt?: (item: T) => number
): T[] {
  if (sortOrder === 'default') return items;
  const list = [...items];

  // Optimize sorting by pre-computing names and creation times (Schwartzian transform)
  if (sortOrder === 'az' || sortOrder === 'za') {
    const nameMap = new Map<T, string>();
    for (let i = 0; i < list.length; i++) nameMap.set(list[i], getName(list[i]));
    
    if (sortOrder === 'az') {
      return list.sort((a, b) => nameMap.get(a)!.localeCompare(nameMap.get(b)!, 'zh-CN', { numeric: true, sensitivity: 'base' }));
    } else {
      return list.sort((a, b) => nameMap.get(b)!.localeCompare(nameMap.get(a)!, 'zh-CN', { numeric: true, sensitivity: 'base' }));
    }
  }
  
  if (sortOrder === 'newest' || sortOrder === 'oldest') {
    if (!getCreatedAt) return list;
    const timeMap = new Map<T, number>();
    for (let i = 0; i < list.length; i++) timeMap.set(list[i], getCreatedAt(list[i]) || 0);
    
    if (sortOrder === 'newest') {
      return list.sort((a, b) => timeMap.get(b)! - timeMap.get(a)!);
    } else {
      return list.sort((a, b) => timeMap.get(a)! - timeMap.get(b)!);
    }
  }

  return list;
}

/**
 * 删除角色卡时，级联清理其原本绑定的专属资源（世界书、脚本、正则）
 * 若某资源仍被其他存留的角色卡绑定，则安全保留，不会误删。
 */
export function deleteCardsAndCascadeAssets(
  cardIds: string[],
  currentAppData: import('./types').AppData
): {
  updatedAppData: import('./types').AppData;
  deletedCounts: {
    cards: number;
    worldbooks: number;
    scripts: number;
    regexes: number;
  };
} {
  const idsToDelete = new Set(cardIds);
  const cardsToDelete = (currentAppData.cards || []).filter((c) => idsToDelete.has(c.id));
  const remainingCards = (currentAppData.cards || []).filter((c) => !idsToDelete.has(c.id));

  const remainingBoundWbIds = new Set<string>();
  const remainingBoundScriptIds = new Set<string>();
  const remainingBoundRegexIds = new Set<string>();
  const remainingCardIds = new Set<string>(remainingCards.map((c) => c.id));
  const remainingCardNames = new Set<string>(remainingCards.map((c) => (c.name || '').trim().toLowerCase()));

  remainingCards.forEach((c) => {
    (c.boundWorldBooks || []).forEach((id) => remainingBoundWbIds.add(id));
    (c.boundScripts || []).forEach((id) => remainingBoundScriptIds.add(id));
    (c.boundRegexes || []).forEach((id) => remainingBoundRegexIds.add(id));
    if (c.boundAssetVersions) {
      Object.keys(c.boundAssetVersions).forEach((id) => {
        remainingBoundWbIds.add(id);
        remainingBoundScriptIds.add(id);
        remainingBoundRegexIds.add(id);
      });
    }
    (c.versions || []).forEach((v: any) => {
      (v.data?.boundWorldBooks || []).forEach((id: string) => remainingBoundWbIds.add(id));
      (v.data?.boundScripts || []).forEach((id: string) => remainingBoundScriptIds.add(id));
      (v.data?.boundRegexes || []).forEach((id: string) => remainingBoundRegexIds.add(id));
    });
  });

  // Determine which WBs were bound to the cards being deleted
  const deletedCardBoundWbIds = new Set<string>();
  const deletedCardBoundScriptIds = new Set<string>();
  const deletedCardBoundRegexIds = new Set<string>();
  const deletedCardNames = new Set<string>();

  cardsToDelete.forEach((c) => {
    if (c.name) deletedCardNames.add(c.name.trim().toLowerCase());
    (c.boundWorldBooks || []).forEach((id) => deletedCardBoundWbIds.add(id));
    (c.boundScripts || []).forEach((id) => deletedCardBoundScriptIds.add(id));
    (c.boundRegexes || []).forEach((id) => deletedCardBoundRegexIds.add(id));
    if (c.boundAssetVersions) {
      Object.keys(c.boundAssetVersions).forEach((id) => {
        deletedCardBoundWbIds.add(id);
        deletedCardBoundScriptIds.add(id);
        deletedCardBoundRegexIds.add(id);
      });
    }
    (c.versions || []).forEach((v: any) => {
      (v.data?.boundWorldBooks || []).forEach((id: string) => deletedCardBoundWbIds.add(id));
      (v.data?.boundScripts || []).forEach((id: string) => deletedCardBoundScriptIds.add(id));
      (v.data?.boundRegexes || []).forEach((id: string) => deletedCardBoundRegexIds.add(id));
    });
  });

  const updatedWorldBooks = (currentAppData.stWorldBooks || []).filter((wb) => {
    const isBoundToDeleted =
      deletedCardBoundWbIds.has(wb.id) ||
      (wb.sourceCardId && idsToDelete.has(wb.sourceCardId)) ||
      (wb.sourceCardName && deletedCardNames.has(wb.sourceCardName.trim().toLowerCase())) ||
      Array.from(idsToDelete).some((cid) => wb.id === `wb_card_${cid}`);

    if (isBoundToDeleted) {
      if (
        remainingBoundWbIds.has(wb.id) ||
        (wb.sourceCardId && remainingCardIds.has(wb.sourceCardId)) ||
        (wb.sourceCardName && remainingCardNames.has(wb.sourceCardName.trim().toLowerCase()))
      ) {
        return true; // Keep because another card uses it
      }
      return false; // Cascade delete
    }
    return true;
  });

  const updatedScripts = (currentAppData.scripts || []).filter((scr) => {
    const isBoundToDeleted =
      deletedCardBoundScriptIds.has(scr.id) ||
      (scr.sourceCardId && idsToDelete.has(scr.sourceCardId)) ||
      (scr.sourceCardName && deletedCardNames.has(scr.sourceCardName.trim().toLowerCase())) ||
      Array.from(idsToDelete).some((cid) => scr.id === `script_ext_${cid}`);

    if (isBoundToDeleted) {
      if (
        remainingBoundScriptIds.has(scr.id) ||
        (scr.sourceCardId && remainingCardIds.has(scr.sourceCardId)) ||
        (scr.sourceCardName && remainingCardNames.has(scr.sourceCardName.trim().toLowerCase()))
      ) {
        return true;
      }
      return false;
    }
    return true;
  });

  const updatedRegexes = (currentAppData.stRegexScripts || []).filter((rx) => {
    const isBoundToDeleted =
      deletedCardBoundRegexIds.has(rx.id) ||
      (rx.sourceCardId && idsToDelete.has(rx.sourceCardId)) ||
      (rx.sourceCardName && deletedCardNames.has(rx.sourceCardName.trim().toLowerCase())) ||
      Array.from(idsToDelete).some((cid) => rx.id === `rx_card_${cid}`);

    if (isBoundToDeleted) {
      if (
        remainingBoundRegexIds.has(rx.id) ||
        (rx.sourceCardId && remainingCardIds.has(rx.sourceCardId)) ||
        (rx.sourceCardName && remainingCardNames.has(rx.sourceCardName.trim().toLowerCase()))
      ) {
        return true;
      }
      return false;
    }
    return true;
  });

  const deletedCounts = {
    cards: cardsToDelete.length,
    worldbooks: (currentAppData.stWorldBooks || []).length - updatedWorldBooks.length,
    scripts: (currentAppData.scripts || []).length - updatedScripts.length,
    regexes: (currentAppData.stRegexScripts || []).length - updatedRegexes.length,
  };

  return {
    updatedAppData: {
      ...currentAppData,
      cards: remainingCards,
      stWorldBooks: updatedWorldBooks,
      scripts: updatedScripts,
      stRegexScripts: updatedRegexes,
    },
    deletedCounts,
  };
}

export function deleteCardSingleVersionAndCascadeAssets(
  cardId: string,
  versionId: string,
  deleteAssociatedAssets: boolean,
  currentAppData: import('./types').AppData
): {
  updatedAppData: import('./types').AppData;
  deletedAssetCounts: {
    worldbooks: number;
    scripts: number;
    regexes: number;
    worldbookSnapshots: number;
    scriptSnapshots: number;
    regexSnapshots: number;
  };
} {
  const targetCard = (currentAppData.cards || []).find((c) => c.id === cardId);
  if (!targetCard) {
    return {
      updatedAppData: currentAppData,
      deletedAssetCounts: { worldbooks: 0, scripts: 0, regexes: 0, worldbookSnapshots: 0, scriptSnapshots: 0, regexSnapshots: 0 },
    };
  }

  const verToDelete = (targetCard.versions || []).find((v: any) => v.versionId === versionId);
  const remainingVersions = (targetCard.versions || []).filter((v: any) => v.versionId !== versionId);

  const updatedCards = (currentAppData.cards || []).map((c) => {
    if (c.id !== cardId) return c;
    return {
      ...c,
      versions: remainingVersions,
    };
  });

  if (!deleteAssociatedAssets || !verToDelete) {
    return {
      updatedAppData: {
        ...currentAppData,
        cards: updatedCards,
      },
      deletedAssetCounts: { worldbooks: 0, scripts: 0, regexes: 0, worldbookSnapshots: 0, scriptSnapshots: 0, regexSnapshots: 0 },
    };
  }

  // Extract all asset IDs referenced by ALL other versions of this card and ALL other cards
  const allOtherCardBoundWbs = new Set<string>();
  const allOtherCardBoundScrs = new Set<string>();
  const allOtherCardBoundRxs = new Set<string>();

  updatedCards.forEach((c) => {
    (c.boundWorldBooks || []).forEach((id) => allOtherCardBoundWbs.add(id));
    (c.boundScripts || []).forEach((id) => allOtherCardBoundScrs.add(id));
    (c.boundRegexes || []).forEach((id) => allOtherCardBoundRxs.add(id));

    (c.versions || []).forEach((v: any) => {
      (v.data?.boundWorldBooks || []).forEach((id: string) => allOtherCardBoundWbs.add(id));
      (v.data?.boundScripts || []).forEach((id: string) => allOtherCardBoundScrs.add(id));
      (v.data?.boundRegexes || []).forEach((id: string) => allOtherCardBoundRxs.add(id));
    });
  });

  const verWbIds = new Set<string>(verToDelete.data?.boundWorldBooks || []);
  const verScrIds = new Set<string>(verToDelete.data?.boundScripts || []);
  const verRxIds = new Set<string>(verToDelete.data?.boundRegexes || []);
  const verLabel = verToDelete.versionLabel || `v${verToDelete.versionNumber || ''}`;

  let deletedWbCount = 0;
  let deletedWbSnapCount = 0;
  let deletedScrCount = 0;
  let deletedScrSnapCount = 0;
  let deletedRxCount = 0;
  let deletedRxSnapCount = 0;

  // 1. Process WorldBooks
  const updatedWorldBooks: import('./types').STWorldBookEntry[] = [];
  (currentAppData.stWorldBooks || []).forEach((wb) => {
    const isAssociatedWithDeletedVer =
      verWbIds.has(wb.id) ||
      (wb.sourceCardId === cardId && (wb.sourceCardVersion === verLabel || (wb.activeVersionLabel && wb.activeVersionLabel.includes(verLabel))));

    const isReferencedElsewhere = allOtherCardBoundWbs.has(wb.id);

    // Filter historical snapshots of this WB
    const originalSnapshotsCount = (wb.versions || []).length;
    const filteredSnapshots = (wb.versions || []).filter((sv: any) => {
      const matchDeletedVer =
        sv.sourceCardId === cardId && (sv.sourceCardVersion === verLabel || sv.versionLabel === verLabel || sv.versionLabel?.includes(verLabel));
      return !matchDeletedVer;
    });
    deletedWbSnapCount += originalSnapshotsCount - filteredSnapshots.length;

    if (!isReferencedElsewhere && isAssociatedWithDeletedVer && filteredSnapshots.length === 0 && (wb.sourceCardId === cardId || wb.id === `wb_card_${cardId}`)) {
      deletedWbCount++;
      return;
    }

    updatedWorldBooks.push({
      ...wb,
      versions: filteredSnapshots,
    });
  });

  // 2. Process Scripts
  const updatedScripts: import('./types').ScriptEntry[] = [];
  (currentAppData.scripts || []).forEach((scr) => {
    const isAssociatedWithDeletedVer =
      verScrIds.has(scr.id) ||
      (scr.sourceCardId === cardId && (scr.sourceCardVersion === verLabel || (scr.activeVersionLabel && scr.activeVersionLabel.includes(verLabel))));

    const isReferencedElsewhere = allOtherCardBoundScrs.has(scr.id);

    const originalSnapshotsCount = (scr.versions || []).length;
    const filteredSnapshots = (scr.versions || []).filter((sv: any) => {
      const matchDeletedVer =
        sv.sourceCardId === cardId && (sv.sourceCardVersion === verLabel || sv.versionLabel === verLabel || sv.versionLabel?.includes(verLabel));
      return !matchDeletedVer;
    });
    deletedScrSnapCount += originalSnapshotsCount - filteredSnapshots.length;

    if (!isReferencedElsewhere && isAssociatedWithDeletedVer && filteredSnapshots.length === 0 && (scr.sourceCardId === cardId || scr.id === `script_ext_${cardId}`)) {
      deletedScrCount++;
      return;
    }

    updatedScripts.push({
      ...scr,
      versions: filteredSnapshots,
    });
  });

  // 3. Process Regexes
  const updatedRegexes: import('./types').STRegexEntry[] = [];
  (currentAppData.stRegexScripts || []).forEach((rx) => {
    const isAssociatedWithDeletedVer =
      verRxIds.has(rx.id) ||
      (rx.sourceCardId === cardId && (rx.sourceCardVersion === verLabel || (rx.activeVersionLabel && rx.activeVersionLabel.includes(verLabel))));

    const isReferencedElsewhere = allOtherCardBoundRxs.has(rx.id);

    const originalSnapshotsCount = (rx.versions || []).length;
    const filteredSnapshots = (rx.versions || []).filter((sv: any) => {
      const matchDeletedVer =
        sv.sourceCardId === cardId && (sv.sourceCardVersion === verLabel || sv.versionLabel === verLabel || sv.versionLabel?.includes(verLabel));
      return !matchDeletedVer;
    });
    deletedRxSnapCount += originalSnapshotsCount - filteredSnapshots.length;

    if (!isReferencedElsewhere && isAssociatedWithDeletedVer && filteredSnapshots.length === 0 && (rx.sourceCardId === cardId || rx.id === `rx_card_${cardId}`)) {
      deletedRxCount++;
      return;
    }

    updatedRegexes.push({
      ...rx,
      versions: filteredSnapshots,
    });
  });

  return {
    updatedAppData: {
      ...currentAppData,
      cards: updatedCards,
      stWorldBooks: updatedWorldBooks,
      scripts: updatedScripts,
      stRegexScripts: updatedRegexes,
    },
    deletedAssetCounts: {
      worldbooks: deletedWbCount,
      scripts: deletedScrCount,
      regexes: deletedRxCount,
      worldbookSnapshots: deletedWbSnapCount,
      scriptSnapshots: deletedScrSnapCount,
      regexSnapshots: deletedRxSnapCount,
    },
  };
}

/**
 * Cleanly format version label to ensure ONLY the version number string (e.g. v1, v2, v3) is returned,
 * stripping out dates, parenthesized descriptors, and extraneous text.
 */
export function getPureVersionLabel(rawLabel?: string, fallbackVerNum: number = 1): string {
  if (!rawLabel || typeof rawLabel !== 'string') return `v${fallbackVerNum}`;
  let clean = rawLabel.replace(/\s*[\(\（].*?[\)\）]/g, '').trim();
  clean = clean.replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g, '').trim();
  clean = clean.replace(/[\u4e00-\u9fa5]+/g, '').trim();
  
  const match = clean.match(/^[vV]?\d+(?:\.\d+)*/);
  if (match) {
    const val = match[0];
    return val.startsWith('v') || val.startsWith('V') ? val.toLowerCase() : `v${val}`;
  }
  
  if (clean && !clean.includes(' ')) {
    return clean.toLowerCase().startsWith('v') ? clean.toLowerCase() : `v${clean}`;
  }
  return `v${fallbackVerNum}`;
}




