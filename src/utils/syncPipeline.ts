import {
  CloudStorageConfig,
  FileAssetMetadata,
  SnapshotManifest,
  SyncProgressUpdate,
  LocalSnapshotItem,
  CategoryProgressItem,
} from '../types/cloudSync';
import { IStorageAdapter } from './storageAdapters/baseAdapter';
import { WebDAVAdapter } from './storageAdapters/webdavAdapter';
import { S3Adapter } from './storageAdapters/s3Adapter';
import { BaiduAdapter } from './storageAdapters/baiduAdapter';
import {
  encryptPayload,
  decryptPayload,
  generateAuthVerificationTag,
  verifyPassword,
  getEffectiveEncryptionKey,
  EncryptedContainer,
} from './cryptoEngine';
import { syncLogger } from './cloudSyncLogger';

export function createStorageAdapter(config: CloudStorageConfig): IStorageAdapter {
  switch (config.provider) {
    case 'webdav':
      return new WebDAVAdapter(config.webdav);
    case 's3':
      return new S3Adapter(config.s3);
    case 'baidu':
      return new BaiduAdapter(config.baidu);
    default:
      throw new Error(`Unsupported storage provider: ${config.provider}`);
  }
}

/**
 * Format Date String YYYY-MM-DD HH:mm:ss
 */
export function formatNowString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

/**
 * Encrypt and hash the filename into an anonymous ciphertext representation.
 * The original filename is NEVER uploaded or exposed to third-party cloud disks.
 * The real metadata mapping is securely encrypted inside manifest.json (AES-GCM-256).
 */
export function safeEncryptedFileName(id: string, name?: string): string {
  let hash1 = 0x811c9dc5;
  const rawKey = `ST_VAULT_SALT_${id}:::${name || ''}`;
  for (let i = 0; i < rawKey.length; i++) {
    hash1 ^= rawKey.charCodeAt(i);
    hash1 = Math.imul(hash1, 0x01000193);
  }
  const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');

  let hash2 = 0x55555555;
  for (let i = rawKey.length - 1; i >= 0; i--) {
    hash2 ^= rawKey.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x1000193);
  }
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');

  return `enc_${hex1}${hex2}`;
}

// Backward-compatibility alias
export const safeFileName = safeEncryptedFileName;

interface UploadTaskItem {
  meta: FileAssetMetadata;
  rawPayload: any; // string, object, ArrayBuffer, Blob
  isBinary?: boolean;
}

/**
 * Scan all AppData and categorize into sidebar 1:1 hierarchy + settings center
 */
export function buildAssetTasks(appData: any): { tasks: UploadTaskItem[]; summary: SnapshotManifest['summary'] } {
  const tasks: UploadTaskItem[] = [];

  const summary: SnapshotManifest['summary'] = {
    totalFiles: 0,
    totalSize: 0,
    sillytavernCounts: {
      cards: 0,
      themes: 0,
      presets: 0,
      plugins: 0,
      scripts: 0,
      worldbooks: 0,
      regex: 0,
      chatHistory: 0,
      extraTheater: 0,
    },
    mobilePhoneCounts: {
      links: 0,
      cards: 0,
      worldbooks: 0,
      beautifications: 0,
      chatMemes: 0,
      stickers: 0,
      extraTheater: 0,
    },
    commonToolsCounts: {
      userPersonas: 0,
      chatBackgrounds: 0,
      cardFaceMaterials: 0,
      fonts: 0,
      apis: 0,
    },
    settingsCenterCounts: {
      fontConfigs: 0,
      apiConfigs: 0,
      taxonomies: 0,
      uiPreferences: 0,
    },
  };

  if (!appData) return { tasks, summary };

  // ==================== 1. Settings Center ====================
  // 1.1 Fonts & Font Configs
  if (appData.fontConfig || (Array.isArray(appData.fonts) && appData.fonts.length > 0)) {
    tasks.push({
      meta: {
        id: 'settings_font_configs',
        name: '字体及各模块字号配置',
        majorCategory: 'settings_center',
        subCategory: 'fonts',
        remotePath: `settings_center/fonts/${safeEncryptedFileName('settings_font_configs')}.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: Date.now(),
        versionSeq: 1,
      },
      rawPayload: { fontConfig: appData.fontConfig, fonts: appData.fonts || [] },
    });
    summary.settingsCenterCounts.fontConfigs++;
    if (Array.isArray(appData.fonts)) {
      summary.commonToolsCounts.fonts += appData.fonts.length;
    }
  }

  // 1.2 APIs & Endpoints
  const apisList = Array.isArray(appData.apis) ? appData.apis : (Array.isArray(appData.apiKeys) ? appData.apiKeys : []);
  if (apisList.length > 0 || appData.activeApi) {
    tasks.push({
      meta: {
        id: 'settings_api_configs',
        name: 'API 存储与端点凭据',
        majorCategory: 'settings_center',
        subCategory: 'apis',
        remotePath: `settings_center/apis/${safeEncryptedFileName('settings_api_configs')}.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: Date.now(),
        versionSeq: 1,
      },
      rawPayload: { apis: apisList, activeApi: appData.activeApi },
    });
    summary.settingsCenterCounts.apiConfigs++;
    summary.commonToolsCounts.apis += apisList.length;
  }

  // 1.3 Global Taxonomies (Categories, Custom Tags, Groups)
  tasks.push({
    meta: {
      id: 'settings_taxonomies',
      name: '全局分类分组与标签字典',
      majorCategory: 'settings_center',
      subCategory: 'taxonomies',
      remotePath: `settings_center/taxonomies/${safeEncryptedFileName('settings_taxonomies')}.enc`,
      mimeType: 'application/json',
      size: 0,
      sha256: '',
      updatedAt: Date.now(),
      versionSeq: 1,
    },
    rawPayload: {
      groups: appData.groups || ['默认'],
      stCategories: appData.stCategories,
      stRegexCategories: appData.stRegexCategories,
      stScriptCategories: appData.stScriptCategories,
      stWorldBookCategories: appData.stWorldBookCategories,
      stThemeCategories: appData.stThemeCategories,
      stPresetCategories: appData.stPresetCategories,
      normalCardCategories: appData.normalCardCategories,
      cardCategories: appData.cardCategories,
      themeCategories: appData.themeCategories,
      beautificationCategories: appData.beautificationCategories,
      presetCategories: appData.presetCategories,
      pluginCategories: appData.pluginCategories,
      scriptCategories: appData.scriptCategories,
      chatLogCategories: appData.chatLogCategories,
      apiCategories: appData.apiCategories,
      fontCategories: appData.fontCategories,
      userPersonaCategories: appData.userPersonaCategories,
      backgroundImageCategories: appData.backgroundImageCategories,
      cardCoverCategories: appData.cardCoverCategories,
      extraStoryCategories: appData.extraStoryCategories,
      stickerCategories: appData.stickerCategories,
      worldBookCategories: appData.worldBookCategories,
      chatMemeCategories: appData.chatMemeCategories,
      npcCardCategories: appData.npcCardCategories,
      customTags: appData.customTags,
      cardTags: appData.cardTags,
      cardsTags: appData.cardsTags,
      themeTags: appData.themeTags,
      beautificationTags: appData.beautificationTags,
      presetTags: appData.presetTags,
      pluginTags: appData.pluginTags,
      stPluginTags: appData.stPluginTags,
      scriptTags: appData.scriptTags,
      stWorldBookTags: appData.stWorldBookTags,
      stRegexTags: appData.stRegexTags,
      chatLogTags: appData.chatLogTags,
      normalCardTags: appData.normalCardTags,
      npcCardTags: appData.npcCardTags,
      apiTags: appData.apiTags,
      fontTags: appData.fontTags,
      extraStoryTags: appData.extraStoryTags,
      stickerTags: appData.stickerTags,
      worldBookTags: appData.worldBookTags,
      chatMemeTags: appData.chatMemeTags,
      userPersonaTags: appData.userPersonaTags,
      backgroundImageTags: appData.backgroundImageTags,
      cardCoverTags: appData.cardCoverTags,
    },
  });
  summary.settingsCenterCounts.taxonomies++;

  // 1.4 UI Preferences & App Settings
  tasks.push({
    meta: {
      id: 'settings_ui_preferences',
      name: '系统外观与排版偏好',
      majorCategory: 'settings_center',
      subCategory: 'ui_system',
      remotePath: `settings_center/ui_system/${safeEncryptedFileName('settings_ui_preferences')}.enc`,
      mimeType: 'application/json',
      size: 0,
      sha256: '',
      updatedAt: Date.now(),
      versionSeq: 1,
    },
    rawPayload: {
      theme: appData.theme,
      themeColor: appData.themeColor,
      glassEffect: appData.glassEffect,
      compactView: appData.compactView,
      bgImage: appData.bgImage,
      customOverrides: appData.customOverrides,
      aiRefineSettings: appData.aiRefineSettings,
      pinnedDirectory: appData.pinnedDirectory,
      extraScanFolders: appData.extraScanFolders,
      scannedDirectories: appData.scannedDirectories,
      lastScannedFolder: appData.lastScannedFolder,
      lastScanTime: appData.lastScanTime,
    },
  });
  summary.settingsCenterCounts.uiPreferences++;

  // ==================== 2. Common Tools ====================
  // 2.1 User Personas (Consolidated)
  const personasList = Array.isArray(appData.userPersonas) ? appData.userPersonas : [];
  if (personasList.length > 0) {
    tasks.push({
      meta: {
        id: 'common_user_personas',
        name: '用户人设合集',
        majorCategory: 'common_tools',
        subCategory: 'user_personas',
        remotePath: `common_tools/user_personas/${safeEncryptedFileName('common_user_personas')}.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: Date.now(),
        versionSeq: 1,
      },
      rawPayload: personasList,
    });
    summary.commonToolsCounts.userPersonas += personasList.length;
  }

  // 2.2 Chat Backgrounds & Materials
  const bgList = Array.isArray(appData.backgroundImages) ? appData.backgroundImages : (Array.isArray(appData.chatBackgrounds) ? appData.chatBackgrounds : []);
  bgList.forEach((bg: any, idx: number) => {
    tasks.push({
      meta: {
        id: bg.id || `chat_bg_${idx}`,
        name: bg.name || bg.title || `聊天背景_${idx + 1}`,
        majorCategory: 'common_tools',
        subCategory: 'chat_backgrounds',
        remotePath: `common_tools/chat_backgrounds/${safeFileName(bg.id || `bg_${idx}`, bg.name || bg.title)}.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: bg.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: bg,
    });
    summary.commonToolsCounts.chatBackgrounds++;
  });

  // 2.3 Card Covers / Face Materials
  const coverList = Array.isArray(appData.cardCovers) ? appData.cardCovers : [];
  coverList.forEach((cover: any, idx: number) => {
    tasks.push({
      meta: {
        id: cover.id || `cover_${idx}`,
        name: cover.name || cover.title || `卡面素材_${idx + 1}`,
        majorCategory: 'common_tools',
        subCategory: 'card_covers',
        remotePath: `common_tools/card_covers/${safeFileName(cover.id || `cover_${idx}`, cover.name || cover.title)}.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: cover.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: cover,
    });
    summary.commonToolsCounts.cardFaceMaterials++;
  });

  // ==================== 3. Mobile Phone Modules ====================
  // 3.1 Phone Links (Consolidated)
  const phoneLinksList = Array.isArray(appData.phoneLinks) ? appData.phoneLinks : [];
  if (phoneLinksList.length > 0) {
    tasks.push({
      meta: {
        id: 'mobile_phone_links',
        name: '小手机快捷链接与书签',
        majorCategory: 'mobile_phone',
        subCategory: 'phone_links',
        remotePath: `mobile_phone/phone_links/${safeEncryptedFileName('mobile_phone_links')}.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: Date.now(),
        versionSeq: 1,
      },
      rawPayload: phoneLinksList,
    });
    summary.mobilePhoneCounts.links += phoneLinksList.length;
  }

  // 3.2 Normal Cards (小手机普通角色卡)
  const normalCardsList = Array.isArray(appData.normalCards) ? appData.normalCards : [];
  normalCardsList.forEach((card: any) => {
    tasks.push({
      meta: {
        id: card.id,
        name: card.name || card.charName || card.realName || '普通角色卡',
        majorCategory: 'mobile_phone',
        subCategory: 'normal_cards',
        remotePath: `mobile_phone/normal_cards/${safeFileName(card.id, card.name || card.charName || card.realName)}.card.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: card.updatedAt || Date.now(),
        versionSeq: 1,
        hasEmbeddedResources: {
          characterBook: !!(card.character_book || card.jsonData?.character_book),
          alternateGreetings: Array.isArray(card.alternate_greetings || card.jsonData?.alternate_greetings),
        },
      },
      rawPayload: card,
    });
    summary.mobilePhoneCounts.cards++;
  });

  // 3.3 Phone Independent WorldBooks (worldBooks)
  const phoneWorldBooksList = Array.isArray(appData.worldBooks) ? appData.worldBooks : [];
  phoneWorldBooksList.forEach((wb: any) => {
    tasks.push({
      meta: {
        id: wb.id,
        name: wb.name || wb.title || '小手机世界书',
        majorCategory: 'mobile_phone',
        subCategory: 'phone_worldbooks',
        remotePath: `mobile_phone/phone_worldbooks/${safeFileName(wb.id, wb.name || wb.title)}.wb.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: wb.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: wb,
    });
    summary.mobilePhoneCounts.worldbooks++;
  });

  // 3.4 Phone Stickers & Chat Memes
  const stickersList = Array.isArray(appData.stickerPacks) ? appData.stickerPacks : [];
  stickersList.forEach((st: any) => {
    tasks.push({
      meta: {
        id: st.id,
        name: st.name || st.title || '表情包图集',
        majorCategory: 'mobile_phone',
        subCategory: 'phone_sticker_packs',
        remotePath: `mobile_phone/phone_sticker_packs/${safeFileName(st.id, st.name || st.title)}.sticker.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: st.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: st,
    });
    summary.mobilePhoneCounts.stickers++;
  });

  const memesList = Array.isArray(appData.chatMemes) ? appData.chatMemes : [];
  memesList.forEach((meme: any) => {
    tasks.push({
      meta: {
        id: meme.id,
        name: meme.name || meme.title || '聊天梗图',
        majorCategory: 'mobile_phone',
        subCategory: 'phone_chat_memes',
        remotePath: `mobile_phone/phone_chat_memes/${safeFileName(meme.id, meme.name || meme.title)}.meme.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: meme.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: meme,
    });
    summary.mobilePhoneCounts.chatMemes++;
  });

  // 3.5 Phone Beautifications
  const beautificationsList = Array.isArray(appData.beautifications) ? appData.beautifications : [];
  beautificationsList.forEach((b: any) => {
    tasks.push({
      meta: {
        id: b.id,
        name: b.name || '手机美化主题',
        majorCategory: 'mobile_phone',
        subCategory: 'phone_beautification',
        remotePath: `mobile_phone/phone_beautification/${safeFileName(b.id, b.name)}.beauty.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: b.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: b,
    });
    summary.mobilePhoneCounts.beautifications++;
  });

  // ==================== 4. SillyTavern Modules ====================
  // 4.1 ST External Independent WorldBooks (stWorldBooks)
  const stWorldBooksList = Array.isArray(appData.stWorldBooks) ? appData.stWorldBooks : [];
  stWorldBooksList.forEach((wb: any) => {
    tasks.push({
      meta: {
        id: wb.id,
        name: wb.name || 'ST 独立世界书',
        majorCategory: 'sillytavern',
        subCategory: 'st_worldbooks',
        remotePath: `sillytavern/st_worldbooks/${safeFileName(wb.id, wb.name)}.wb.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: wb.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: wb,
    });
    summary.sillytavernCounts.worldbooks++;
  });

  // 4.2 ST External Independent Regex (stRegexScripts)
  const stRegexList = Array.isArray(appData.stRegexScripts) ? appData.stRegexScripts : (Array.isArray(appData.stRegex) ? appData.stRegex : []);
  stRegexList.forEach((rx: any) => {
    tasks.push({
      meta: {
        id: rx.id,
        name: rx.scriptName || rx.name || 'ST 正则脚本',
        majorCategory: 'sillytavern',
        subCategory: 'st_regex',
        remotePath: `sillytavern/st_regex/${safeFileName(rx.id, rx.scriptName || rx.name)}.regex.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: rx.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: rx,
    });
    summary.sillytavernCounts.regex++;
  });

  // 4.3 ST External Independent Code Scripts (scripts / stScripts)
  const stScriptsList = Array.isArray(appData.scripts) ? appData.scripts : (Array.isArray(appData.stScripts) ? appData.stScripts : []);
  stScriptsList.forEach((sc: any) => {
    tasks.push({
      meta: {
        id: sc.id,
        name: sc.name || 'ST 扩展脚本',
        majorCategory: 'sillytavern',
        subCategory: 'st_scripts',
        remotePath: `sillytavern/st_scripts/${safeFileName(sc.id, sc.name)}.script.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: sc.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: sc,
    });
    summary.sillytavernCounts.scripts++;
  });

  // 4.4 ST Plugins
  const stPluginsList = Array.isArray(appData.plugins) ? appData.plugins : (Array.isArray(appData.stPlugins) ? appData.stPlugins : []);
  stPluginsList.forEach((pl: any) => {
    tasks.push({
      meta: {
        id: pl.id,
        name: pl.name || 'ST 插件',
        majorCategory: 'sillytavern',
        subCategory: 'st_plugins',
        remotePath: `sillytavern/st_plugins/${safeFileName(pl.id, pl.name)}.plugin.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: pl.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: pl,
    });
    summary.sillytavernCounts.plugins++;
  });

  // 4.5 ST Themes & Presets
  const stThemesList = Array.isArray(appData.themes) ? appData.themes : (Array.isArray(appData.stThemes) ? appData.stThemes : []);
  stThemesList.forEach((th: any) => {
    tasks.push({
      meta: {
        id: th.id,
        name: th.name || 'ST 主题',
        majorCategory: 'sillytavern',
        subCategory: 'st_themes',
        remotePath: `sillytavern/st_themes/${safeFileName(th.id, th.name)}.theme.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: th.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: th,
    });
    summary.sillytavernCounts.themes++;
  });

  const stPresetsList = Array.isArray(appData.presets) ? appData.presets : (Array.isArray(appData.stPresets) ? appData.stPresets : []);
  stPresetsList.forEach((pr: any) => {
    tasks.push({
      meta: {
        id: pr.id,
        name: pr.name || pr.title || 'ST 采样预设',
        majorCategory: 'sillytavern',
        subCategory: 'st_presets',
        remotePath: `sillytavern/st_presets/${safeFileName(pr.id, pr.name || pr.title)}.preset.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: pr.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: pr,
    });
    summary.sillytavernCounts.presets++;
  });

  // 4.6 ST Character Cards (supports both appData.cards and appData.stCards)
  // Retains embedded resources, extracts external pointers
  const stCardsList = Array.isArray(appData.cards) ? appData.cards : (Array.isArray(appData.stCards) ? appData.stCards : []);
  stCardsList.forEach((card: any) => {
    // Check embedded vs external
    const hasEmbeddedWorldBook = !!(card.data?.character_book || card.character_book || card.rawData?.character_book);
    const hasEmbeddedRegex = !!(card.data?.extensions?.regex_scripts || card.embeddedRegex || card.rawData?.data?.extensions?.regex_scripts);
    const hasAlternateGreetings = Array.isArray(card.data?.alternate_greetings || card.alternate_greetings || card.rawData?.data?.alternate_greetings);

    // External linked IDs
    const boundWorldBookIds = card.boundWorldBooks || card.boundWorldBookIds || card.linkedWorldBooks || [];
    const boundRegexIds = card.boundRegexes || card.boundRegexIds || card.linkedRegex || [];
    const boundScriptIds = card.boundScripts || card.boundScriptIds || card.linkedScripts || [];

    const cardDisplayName = card.name || card.charName || card.data?.name || card.rawData?.name || 'ST 角色卡';

    tasks.push({
      meta: {
        id: card.id,
        name: cardDisplayName,
        majorCategory: 'sillytavern',
        subCategory: 'st_cards',
        remotePath: `sillytavern/st_cards/${safeFileName(card.id, cardDisplayName)}.card.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: card.updatedAt || Date.now(),
        versionSeq: 1,
        pointers: {
          boundWorldBookIds,
          boundRegexIds,
          boundScriptIds,
        },
        hasEmbeddedResources: {
          characterBook: hasEmbeddedWorldBook,
          regexRules: hasEmbeddedRegex,
          alternateGreetings: hasAlternateGreetings,
        },
      },
      rawPayload: card,
    });
    summary.sillytavernCounts.cards++;
  });

  // 4.7 ST Chat Logs (chatLogs / chatHistory)
  const chatLogsList = Array.isArray(appData.chatLogs) ? appData.chatLogs : (Array.isArray(appData.chatHistory) ? appData.chatHistory : []);
  chatLogsList.forEach((chat: any) => {
    tasks.push({
      meta: {
        id: chat.id,
        name: chat.title || chat.characterName || 'ST 聊天记录',
        majorCategory: 'sillytavern',
        subCategory: 'st_chat_logs',
        remotePath: `sillytavern/st_chat_logs/${safeFileName(chat.id, chat.title || chat.characterName)}.chat.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: chat.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: chat,
    });
    summary.sillytavernCounts.chatHistory++;
  });

  // 4.8 Extra Stories / Chat History
  const extraStoriesList = Array.isArray(appData.extraStories) ? appData.extraStories : [];
  extraStoriesList.forEach((st: any) => {
    tasks.push({
      meta: {
        id: st.id,
        name: st.title || '番外小剧场',
        majorCategory: 'sillytavern',
        subCategory: 'st_extra_theater',
        remotePath: `sillytavern/st_extra_theater/${safeFileName(st.id, st.title)}.story.enc`,
        mimeType: 'application/json',
        size: 0,
        sha256: '',
        updatedAt: st.updatedAt || Date.now(),
        versionSeq: 1,
      },
      rawPayload: st,
    });
    summary.sillytavernCounts.extraTheater++;
  });

  summary.totalFiles = tasks.length;
  return { tasks, summary };
}

export interface UploadPipelineOptions {
  mode?: 'incremental' | 'force_overwrite';
}

export interface UploadPipelineResult extends SnapshotManifest {
  uploadedFiles: number;
  skippedFiles: number;
}

/**
 * Execute Full Sequential Encrypted Upload Pipeline
 * Supports 'incremental' (diff duplicate skip) and 'force_overwrite' modes
 */
export async function executeSequentialUpload(
  config: CloudStorageConfig,
  appData: any,
  onProgress?: (progress: SyncProgressUpdate) => void,
  options?: UploadPipelineOptions
): Promise<UploadPipelineResult> {
  const adapter = createStorageAdapter(config);
  // Get effective encryption key (either custom password or auto 256-bit device key)
  const password = getEffectiveEncryptionKey(config);

  const mode = options?.mode || 'incremental';

  onProgress?.({
    phase: 'scanning',
    currentStepText: '正在扫描全量业务数据与侧边栏各分类...',
    completedItems: 0,
    totalItems: 0,
    percent: 5,
  });

  const { tasks, summary } = buildAssetTasks(appData);
  const totalTasks = tasks.length;
  const snapshotDate = formatNowString();
  const snapshotId = `snap_${Date.now()}`;
  let totalUploadedBytes = 0;

  // Retrieve latest remote manifest for diff duplicate comparison (if incremental mode)
  const existingCloudAssets = new Map<string, string>(); // remotePath -> sha256
  if (mode === 'incremental') {
    onProgress?.({
      phase: 'scanning',
      currentStepText: '正在比对云端最新快照清单，检测重复文件...',
      completedItems: 0,
      totalItems: totalTasks,
      percent: 8,
    });

    try {
      const remoteFiles = await adapter.listFiles('metadata_manifests');
      const latestManifestFile = remoteFiles
        .filter((f) => f.name.startsWith('manifest_') && f.name.endsWith('.json'))
        .sort((a, b) => b.name.localeCompare(a.name))[0];

      if (latestManifestFile) {
        const rawBuf = await adapter.downloadFile(latestManifestFile.path);
        const container: EncryptedContainer = JSON.parse(new TextDecoder().decode(rawBuf));
        const { buffer: decBuf } = await decryptPayload(container, password);
        const latestManifest: SnapshotManifest = JSON.parse(new TextDecoder().decode(decBuf));
        if (Array.isArray(latestManifest.assets)) {
          for (const a of latestManifest.assets) {
            if (a.remotePath && a.sha256) {
              existingCloudAssets.set(a.remotePath, a.sha256);
            }
          }
        }
      }
    } catch (manifestErr) {
      console.warn('Could not read existing remote manifest for diff sync:', manifestErr);
    }
  }

  syncLogger.addLog({
    category: 'pipeline',
    level: 'info',
    title: `启动时序加密备份 [模式: ${mode === 'force_overwrite' ? '本地覆盖云端' : '增量对比同步'}]: ${snapshotDate}`,
    requestDetails: {
      totalFiles: totalTasks,
      provider: config.provider,
      mode,
      cloudKnownFiles: existingCloudAssets.size,
      encryptionMode: config.encryptionMode,
      summary,
    },
    diagnosis: mode === 'force_overwrite'
      ? '强制覆盖模式：忽略云端重复检测，全量重新加密推送。'
      : `增量同步模式：检测到云端历史特征 ${existingCloudAssets.size} 项，重复文件将自动跳过。`,
  });

  const uploadedAssetMetas: FileAssetMetadata[] = [];
  let skippedFiles = 0;
  let uploadedFiles = 0;

  // Sort tasks in strict topological sequence
  // Order: settings_center -> common_tools -> mobile_phone (independent) -> sillytavern (independent) -> cards
  const categoryOrder: Record<string, number> = {
    settings_center: 1,
    common_tools: 2,
    mobile_phone: 3,
    sillytavern: 4,
  };

  tasks.sort((a, b) => {
    const orderA = categoryOrder[a.meta.majorCategory] || 99;
    const orderB = categoryOrder[b.meta.majorCategory] || 99;
    if (orderA !== orderB) return orderA - orderB;
    // Put cards after independent worldbooks & regex
    if (a.meta.subCategory.includes('card') && !b.meta.subCategory.includes('card')) return 1;
    if (!a.meta.subCategory.includes('card') && b.meta.subCategory.includes('card')) return -1;
    return 0;
  });

  // Initialize Category Progress tracking
  const categoryProgress: Record<string, CategoryProgressItem> = {
    settings_center: { name: '设置中心与全局配置', total: 0, current: 0, status: 'pending' },
    common_tools: { name: '常用工具与物料资产', total: 0, current: 0, status: 'pending' },
    mobile_phone: { name: '小手机移动端生态', total: 0, current: 0, status: 'pending' },
    sillytavern: { name: 'SillyTavern 酒馆生态', total: 0, current: 0, status: 'pending' },
    manifest_signature: { name: '密文清单与防篡改签名', total: 1, current: 0, status: 'pending' },
  };

  tasks.forEach((t) => {
    const cat = t.meta.majorCategory || 'common_tools';
    if (categoryProgress[cat]) {
      categoryProgress[cat].total++;
    }
  });

  Object.keys(categoryProgress).forEach((k) => {
    if (k !== 'manifest_signature' && categoryProgress[k].total === 0) {
      categoryProgress[k].status = 'skipped';
    }
  });

  // Execute Direct Encrypted Upload
  for (let i = 0; i < totalTasks; i++) {
    const task = tasks[i];
    const itemNum = i + 1;
    const catKey = task.meta.majorCategory || 'common_tools';

    if (categoryProgress[catKey] && categoryProgress[catKey].status === 'pending') {
      categoryProgress[catKey].status = 'processing';
    }

    onProgress?.({
      phase: 'encrypting',
      currentStepText: `正在直接加密 [${itemNum}/${totalTasks}]: ${task.meta.name}`,
      completedItems: i,
      totalItems: totalTasks,
      currentFileName: task.meta.name,
      currentEncryptedFileName: task.meta.remotePath,
      majorCategory: task.meta.majorCategory,
      subCategory: task.meta.subCategory,
      categoryProgress: { ...categoryProgress },
      uploadedFiles,
      skippedFiles,
      percent: Math.round(10 + (i / totalTasks) * 75),
    });

    const payloadString = typeof task.rawPayload === 'string' ? task.rawPayload : JSON.stringify(task.rawPayload);
    const container: EncryptedContainer = await encryptPayload(payloadString, password, task.meta.mimeType);

    task.meta.size = container.originalSize;
    task.meta.sha256 = container.sha256;
    totalUploadedBytes += container.originalSize;

    // Check for duplicate in cloud
    const cloudSha256 = existingCloudAssets.get(task.meta.remotePath);
    const isDuplicate = cloudSha256 && cloudSha256 === container.sha256;

    if (isDuplicate && mode !== 'force_overwrite') {
      skippedFiles++;
      uploadedAssetMetas.push(task.meta);

      if (categoryProgress[catKey]) {
        categoryProgress[catKey].current++;
        if (categoryProgress[catKey].current >= categoryProgress[catKey].total) {
          categoryProgress[catKey].status = 'done';
        }
      }

      onProgress?.({
        phase: 'uploading',
        currentStepText: `[比对重复跳过] (${itemNum}/${totalTasks}): ${task.meta.name}`,
        completedItems: i + 1,
        totalItems: totalTasks,
        currentFileName: task.meta.name,
        currentEncryptedFileName: task.meta.remotePath,
        majorCategory: task.meta.majorCategory,
        subCategory: task.meta.subCategory,
        categoryProgress: { ...categoryProgress },
        uploadedFiles,
        skippedFiles,
        percent: Math.round(10 + ((i + 1) / totalTasks) * 75),
      });
      continue;
    }

    uploadedFiles++;
    onProgress?.({
      phase: 'uploading',
      currentStepText: `正在上传密文文件 [${itemNum}/${totalTasks}]: ${task.meta.name}`,
      completedItems: i,
      totalItems: totalTasks,
      currentFileName: task.meta.name,
      currentEncryptedFileName: task.meta.remotePath,
      majorCategory: task.meta.majorCategory,
      subCategory: task.meta.subCategory,
      categoryProgress: { ...categoryProgress },
      uploadedFiles,
      skippedFiles,
      percent: Math.round(10 + ((i + 0.5) / totalTasks) * 75),
    });

    const fileContent = JSON.stringify(container);
    await adapter.uploadFile(`raw_encrypted_assets/${task.meta.remotePath}`, fileContent, 'application/json');

    uploadedAssetMetas.push(task.meta);

    if (categoryProgress[catKey]) {
      categoryProgress[catKey].current++;
      if (categoryProgress[catKey].current >= categoryProgress[catKey].total) {
        categoryProgress[catKey].status = 'done';
      }
    }
  }

  summary.totalSize = totalUploadedBytes;

  // Generate Auth Verification Tag
  const authTag = await generateAuthVerificationTag(password);

  // Generate Manifest
  const manifest: SnapshotManifest = {
    snapshotId,
    backupDate: snapshotDate,
    timestamp: Date.now(),
    appVersion: '1.0.0',
    deviceInfo: navigator.userAgent.substring(0, 100),
    summary,
    assets: uploadedAssetMetas,
    encryption: {
      algorithm: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA256',
      iterations: 100000,
      salt: '',
      authVerificationTag: authTag,
    },
  };

  categoryProgress.manifest_signature.status = 'processing';
  onProgress?.({
    phase: 'uploading',
    currentStepText: '正在写入带日期的全局密文元数据快照清单...',
    completedItems: totalTasks,
    totalItems: totalTasks,
    currentFileName: 'manifest.json (全局时序快照清单)',
    currentEncryptedFileName: `metadata_manifests/manifest_${snapshotDate.replace(/[: ]/g, '-')}.json`,
    majorCategory: 'manifest_signature',
    categoryProgress: { ...categoryProgress },
    uploadedFiles,
    skippedFiles,
    percent: 92,
  });

  const manifestFileName = `manifest_${snapshotDate.replace(/[: ]/g, '-')}.json`;
  const encryptedManifestContainer = await encryptPayload(JSON.stringify(manifest), password, 'application/json');
  await adapter.uploadFile(
    `metadata_manifests/${manifestFileName}`,
    JSON.stringify(encryptedManifestContainer),
    'application/json'
  );

  // Auto-Pruning: Keep only latest 10 manifests
  onProgress?.({
    phase: 'pruning',
    currentStepText: '正在检测云端快照生命周期 (保留最近 10 次)...',
    completedItems: totalTasks,
    totalItems: totalTasks,
    percent: 95,
  });

  try {
    const remoteManifests = await adapter.listFiles('metadata_manifests');
    const sortedManifests = remoteManifests
      .filter((f) => f.name.startsWith('manifest_') && f.name.endsWith('.json'))
      .sort((a, b) => b.name.localeCompare(a.name));

    if (sortedManifests.length > 10) {
      const manifestsToDelete = sortedManifests.slice(10);
      for (const oldFile of manifestsToDelete) {
        await adapter.deleteFile(oldFile.path);
      }
    }
  } catch (err) {
    console.warn('Auto pruning old snapshots skipped:', err);
  }

  categoryProgress.manifest_signature.current = 1;
  categoryProgress.manifest_signature.status = 'done';

  const statusMessage = mode === 'force_overwrite'
    ? `本地覆盖云端完成！已强制覆写 ${uploadedFiles} 个独立加密文件至网盘`
    : `同步完成！共 ${totalTasks} 个文件（跳过 ${skippedFiles} 个重复，推送 ${uploadedFiles} 个新文件）`;

  onProgress?.({
    phase: 'done',
    currentStepText: statusMessage,
    completedItems: totalTasks,
    totalItems: totalTasks,
    categoryProgress: { ...categoryProgress },
    uploadedFiles,
    skippedFiles,
    percent: 100,
  });

  return {
    ...manifest,
    uploadedFiles,
    skippedFiles,
  };
}

/**
 * Fetch list of all available remote dated snapshot manifests (Up to 10)
 */
export async function fetchRemoteSnapshotsList(
  config: CloudStorageConfig,
  customPassword?: string
): Promise<{ fileName: string; path: string; manifest?: SnapshotManifest; dateStr: string }[]> {
  const adapter = createStorageAdapter(config);
  const files = await adapter.listFiles('metadata_manifests');

  const manifestFiles = files
    .filter((f) => f.name.startsWith('manifest_') && f.name.endsWith('.json'))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, 10);

  const keyToUse = customPassword || getEffectiveEncryptionKey(config);

  const results = [];
  for (const file of manifestFiles) {
    let dateStr = file.name.replace('manifest_', '').replace('.json', '').replace(/-/g, ':');
    if (dateStr.length >= 10) {
      dateStr = dateStr.substring(0, 10) + ' ' + dateStr.substring(11);
    }

    let manifest: SnapshotManifest | undefined;
    if (keyToUse) {
      try {
        const rawBuffer = await adapter.downloadFile(file.path);
        const text = new TextDecoder().decode(rawBuffer);
        const container: EncryptedContainer = JSON.parse(text);
        const { buffer } = await decryptPayload(container, keyToUse);
        manifest = JSON.parse(new TextDecoder().decode(buffer));
      } catch (err) {
        // Key mismatch or corrupted
      }
    }

    results.push({
      fileName: file.name,
      path: file.path,
      manifest,
      dateStr: manifest?.backupDate || dateStr,
    });
  }

  return results as any;
}

/**
 * Execute Direct Decrypted Sequential Rollback Pipeline
 */
export async function executeSequentialRollback(
  config: CloudStorageConfig,
  manifestFilePath: string,
  onProgress?: (progress: SyncProgressUpdate) => void,
  passwordOverride?: string
): Promise<any> {
  const adapter = createStorageAdapter(config);
  const password = passwordOverride || getEffectiveEncryptionKey(config);
  if (!password) {
    throw new Error('未获取到有效的解密密钥或密码，无法解密回滚');
  }

  onProgress?.({
    phase: 'downloading',
    currentStepText: '正在下载并解密目标元数据快照清单...',
    completedItems: 0,
    totalItems: 0,
    percent: 5,
  });

  // 1. Download & Decrypt Manifest
  const rawManifestBuffer = await adapter.downloadFile(manifestFilePath);
  const manifestContainer: EncryptedContainer = JSON.parse(new TextDecoder().decode(rawManifestBuffer));
  const { buffer: decryptedManifestBuffer } = await decryptPayload(manifestContainer, password);
  const manifest: SnapshotManifest = JSON.parse(new TextDecoder().decode(decryptedManifestBuffer));

  const totalAssets = manifest.assets.length;
  const manifestCategories = new Set<string>();
  manifest.assets.forEach((a) => {
    if (a.subCategory) manifestCategories.add(a.subCategory);
    if (a.majorCategory) manifestCategories.add(a.majorCategory);
  });

  const reconstructedData: any = {
    _manifestCategories: Array.from(manifestCategories),
    _rollbackErrors: [],
  };

  // Pre-initialize collections present in this manifest
  manifest.assets.forEach((a) => {
    if (a.subCategory === 'st_cards') {
      if (!reconstructedData.cards) reconstructedData.cards = [];
      if (!reconstructedData.stCards) reconstructedData.stCards = [];
    } else if (a.subCategory === 'normal_cards') {
      if (!reconstructedData.normalCards) reconstructedData.normalCards = [];
    } else if (a.subCategory === 'st_worldbooks') {
      if (!reconstructedData.stWorldBooks) reconstructedData.stWorldBooks = [];
    } else if (a.subCategory === 'phone_worldbooks') {
      if (!reconstructedData.worldBooks) reconstructedData.worldBooks = [];
    } else if (a.subCategory === 'st_regex') {
      if (!reconstructedData.stRegexScripts) reconstructedData.stRegexScripts = [];
    } else if (a.subCategory === 'st_scripts') {
      if (!reconstructedData.scripts) reconstructedData.scripts = [];
      if (!reconstructedData.stScripts) reconstructedData.stScripts = [];
    } else if (a.subCategory === 'st_plugins') {
      if (!reconstructedData.plugins) reconstructedData.plugins = [];
      if (!reconstructedData.stPlugins) reconstructedData.stPlugins = [];
    } else if (a.subCategory === 'st_themes') {
      if (!reconstructedData.themes) reconstructedData.themes = [];
      if (!reconstructedData.stThemes) reconstructedData.stThemes = [];
    } else if (a.subCategory === 'st_presets') {
      if (!reconstructedData.presets) reconstructedData.presets = [];
      if (!reconstructedData.stPresets) reconstructedData.stPresets = [];
    } else if (a.subCategory === 'phone_beautification') {
      if (!reconstructedData.beautifications) reconstructedData.beautifications = [];
    } else if (a.subCategory === 'phone_links') {
      if (!reconstructedData.phoneLinks) reconstructedData.phoneLinks = [];
    } else if (a.subCategory === 'user_personas') {
      if (!reconstructedData.userPersonas) reconstructedData.userPersonas = [];
    } else if (a.subCategory === 'phone_sticker_packs') {
      if (!reconstructedData.stickerPacks) reconstructedData.stickerPacks = [];
    } else if (a.subCategory === 'phone_chat_memes') {
      if (!reconstructedData.chatMemes) reconstructedData.chatMemes = [];
    } else if (a.subCategory === 'st_extra_theater') {
      if (!reconstructedData.extraStories) reconstructedData.extraStories = [];
    } else if (a.subCategory === 'st_chat_logs') {
      if (!reconstructedData.chatLogs) reconstructedData.chatLogs = [];
    } else if (a.subCategory === 'chat_backgrounds') {
      if (!reconstructedData.chatBackgrounds) reconstructedData.chatBackgrounds = [];
      if (!reconstructedData.backgroundImages) reconstructedData.backgroundImages = [];
    } else if (a.subCategory === 'card_covers') {
      if (!reconstructedData.cardCovers) reconstructedData.cardCovers = [];
    }
  });

  let successCount = 0;
  const failureItems: { name: string; path: string; error: string }[] = [];

  // 2. Ordered Download & Direct Decrypt
  for (let i = 0; i < totalAssets; i++) {
    const asset = manifest.assets[i];
    const itemNum = i + 1;

    onProgress?.({
      phase: 'downloading',
      currentStepText: `正在拉取并直接解密 [${itemNum}/${totalAssets}]: ${asset.name}`,
      completedItems: successCount,
      totalItems: totalAssets,
      currentFileName: asset.name,
      percent: Math.round(10 + (i / totalAssets) * 85),
    });

    let downloadPath = asset.remotePath.trim();
    if (!downloadPath.startsWith('raw_encrypted_assets/')) {
      downloadPath = `raw_encrypted_assets/${downloadPath.replace(/^\/+/, '')}`;
    }

    let itemSuccess = false;
    let lastError = '';

    // Retry up to 3 attempts with brief backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const rawEncryptedBuffer = await adapter.downloadFile(downloadPath);
        const container: EncryptedContainer = JSON.parse(new TextDecoder().decode(rawEncryptedBuffer));
        const { buffer } = await decryptPayload(container, password);
        const parsedContent = JSON.parse(new TextDecoder().decode(buffer));

        // Hydrate into reconstructed app data
        if (asset.majorCategory === 'settings_center') {
          if (asset.subCategory === 'fonts') {
            reconstructedData.fontConfig = parsedContent.fontConfig;
            reconstructedData.fonts = parsedContent.fonts;
          } else if (asset.subCategory === 'apis') {
            reconstructedData.apis = parsedContent.apis;
            reconstructedData.apiKeys = parsedContent.apis;
            reconstructedData.activeApi = parsedContent.activeApi;
          } else if (asset.subCategory === 'taxonomies') {
            Object.assign(reconstructedData, parsedContent);
          } else if (asset.subCategory === 'ui_system') {
            Object.assign(reconstructedData, parsedContent);
          }
        } else if (asset.majorCategory === 'common_tools') {
          if (asset.subCategory === 'user_personas') {
            reconstructedData.userPersonas = parsedContent;
          } else if (asset.subCategory === 'chat_backgrounds') {
            reconstructedData.chatBackgrounds = reconstructedData.chatBackgrounds || [];
            reconstructedData.chatBackgrounds.push(parsedContent);
            reconstructedData.backgroundImages = reconstructedData.backgroundImages || [];
            reconstructedData.backgroundImages.push(parsedContent);
          } else if (asset.subCategory === 'card_covers') {
            reconstructedData.cardCovers = reconstructedData.cardCovers || [];
            reconstructedData.cardCovers.push(parsedContent);
          }
        } else if (asset.majorCategory === 'mobile_phone') {
          if (asset.subCategory === 'phone_links') {
            reconstructedData.phoneLinks = parsedContent;
          } else if (asset.subCategory === 'normal_cards') {
            reconstructedData.normalCards = reconstructedData.normalCards || [];
            reconstructedData.normalCards.push(parsedContent);
          } else if (asset.subCategory === 'phone_worldbooks') {
            reconstructedData.worldBooks = reconstructedData.worldBooks || [];
            reconstructedData.worldBooks.push(parsedContent);
          } else if (asset.subCategory === 'phone_sticker_packs') {
            reconstructedData.stickerPacks = reconstructedData.stickerPacks || [];
            reconstructedData.stickerPacks.push(parsedContent);
          } else if (asset.subCategory === 'phone_chat_memes') {
            reconstructedData.chatMemes = reconstructedData.chatMemes || [];
            reconstructedData.chatMemes.push(parsedContent);
          } else if (asset.subCategory === 'phone_beautification') {
            reconstructedData.beautifications = reconstructedData.beautifications || [];
            reconstructedData.beautifications.push(parsedContent);
          }
        } else if (asset.majorCategory === 'sillytavern') {
          if (asset.subCategory === 'st_worldbooks') {
            reconstructedData.stWorldBooks = reconstructedData.stWorldBooks || [];
            reconstructedData.stWorldBooks.push(parsedContent);
          } else if (asset.subCategory === 'st_regex') {
            reconstructedData.stRegexScripts = reconstructedData.stRegexScripts || [];
            reconstructedData.stRegexScripts.push(parsedContent);
          } else if (asset.subCategory === 'st_scripts') {
            reconstructedData.scripts = reconstructedData.scripts || [];
            reconstructedData.scripts.push(parsedContent);
            reconstructedData.stScripts = reconstructedData.stScripts || [];
            reconstructedData.stScripts.push(parsedContent);
          } else if (asset.subCategory === 'st_plugins') {
            reconstructedData.plugins = reconstructedData.plugins || [];
            reconstructedData.plugins.push(parsedContent);
            reconstructedData.stPlugins = reconstructedData.stPlugins || [];
            reconstructedData.stPlugins.push(parsedContent);
          } else if (asset.subCategory === 'st_themes') {
            reconstructedData.themes = reconstructedData.themes || [];
            reconstructedData.themes.push(parsedContent);
            reconstructedData.stThemes = reconstructedData.stThemes || [];
            reconstructedData.stThemes.push(parsedContent);
          } else if (asset.subCategory === 'st_presets') {
            reconstructedData.presets = reconstructedData.presets || [];
            reconstructedData.presets.push(parsedContent);
            reconstructedData.stPresets = reconstructedData.stPresets || [];
            reconstructedData.stPresets.push(parsedContent);
          } else if (asset.subCategory === 'st_cards') {
            // Re-hydrate card with pointers and embedded resources
            const cardObj = parsedContent;
            if (asset.pointers) {
              cardObj.boundWorldBookIds = asset.pointers.boundWorldBookIds || [];
              cardObj.boundRegexIds = asset.pointers.boundRegexIds || [];
              cardObj.boundScriptIds = asset.pointers.boundScriptIds || [];
            }
            reconstructedData.cards = reconstructedData.cards || [];
            reconstructedData.cards.push(cardObj);
            reconstructedData.stCards = reconstructedData.stCards || [];
            reconstructedData.stCards.push(cardObj);
          } else if (asset.subCategory === 'st_chat_logs') {
            reconstructedData.chatLogs = reconstructedData.chatLogs || [];
            reconstructedData.chatLogs.push(parsedContent);
          } else if (asset.subCategory === 'st_extra_theater') {
            reconstructedData.extraStories = reconstructedData.extraStories || [];
            reconstructedData.extraStories.push(parsedContent);
          }
        }

        successCount++;
        itemSuccess = true;
        break;
      } catch (err: any) {
        lastError = err.message || String(err);
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
    }

    if (!itemSuccess) {
      console.error(`Failed to download/decrypt asset ${asset.name} (${downloadPath}):`, lastError);
      failureItems.push({
        name: asset.name,
        path: downloadPath,
        error: lastError,
      });
      reconstructedData._rollbackErrors.push(`${asset.name}: ${lastError}`);
    }
  }

  // If ALL assets failed, abort immediately to protect user data from being wiped
  if (totalAssets > 0 && successCount === 0) {
    const firstErr = failureItems[0]?.error || '未知网络或解密错误';
    syncLogger.addLog({
      category: 'pipeline',
      level: 'error',
      title: '回滚拉取全部失败',
      error: firstErr,
      diagnosis: '未能从云端成功下载并解密任何资产，可能是解密密钥不匹配或网盘资源已被转移。已拦截数据还原，本地数据保持完好。',
    });
    throw new Error(`回滚拉取失败：全部 ${totalAssets} 个资产文件均拉取失败。首个错误: ${firstErr}`);
  }

  if (failureItems.length > 0) {
    syncLogger.addLog({
      category: 'pipeline',
      level: 'warn',
      title: `回滚部分完成：成功 ${successCount} 个，失败 ${failureItems.length} 个`,
      requestDetails: { totalAssets, successCount, failureCount: failureItems.length },
      diagnosis: '部分文件可能因网络超时或节点缺失未能拉取，其余数据已恢复。',
    });
  } else {
    syncLogger.addLog({
      category: 'pipeline',
      level: 'success',
      title: `回滚拉取成功：全部 ${successCount} 个文件已解密还原`,
      diagnosis: '全部时序加密资产已成功从云端网盘下载、解密并重建索引关联。',
    });
  }

  onProgress?.({
    phase: 'done',
    currentStepText:
      failureItems.length > 0
        ? `回滚完成（成功恢复 ${successCount} 个，${failureItems.length} 个失败）`
        : `回滚成功！全部 ${successCount} 个资产已无损还原并重建关联`,
    completedItems: totalAssets,
    totalItems: totalAssets,
    percent: 100,
  });

  return reconstructedData;
}
