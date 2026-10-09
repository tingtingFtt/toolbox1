export type StorageProviderType = 'webdav' | 's3' | 'baidu';

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string; // App Token or Password
  rootPath: string; // e.g. /TavernVault/
}

export interface S3Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  rootPath: string; // e.g. /TavernVault/
}

export interface BaiduUserInfo {
  baidu_name?: string;
  netdisk_name?: string;
  avatar_url?: string;
  uk?: number;
  vip_type?: number;
}

export interface BaiduConfig {
  accessToken: string;
  refreshToken?: string;
  appKey?: string; // Optional custom App Key / Client ID
  appSecret?: string; // Optional custom App Secret / Secret Key
  apiBaseUrl?: string; // Backend service origin/base path; required for static deployments
  redirectUri?: string;
  rootPath: string; // e.g. /apps/TavernVault/
  userInfo?: BaiduUserInfo;
  lastLoginTime?: number;
}

export type EncryptionMode = 'device_auto' | 'custom_password';

export interface CloudStorageConfig {
  provider: StorageProviderType;
  webdav: WebDAVConfig;
  s3: S3Config;
  baidu: BaiduConfig;
  encryptionMode?: EncryptionMode;
  encryptionPassword?: string;
  rememberPassword?: boolean;
  autoSyncOnClose?: boolean;
  lastSyncTime?: number;
}

export type SidebarMajorCategory = 'sillytavern' | 'mobile_phone' | 'common_tools' | 'settings_center';

export interface FileAssetMetadata {
  id: string;
  name: string;
  majorCategory: SidebarMajorCategory;
  subCategory: string;
  remotePath: string;
  mimeType: string;
  size: number;
  sha256: string;
  updatedAt: number;
  versionSeq: number;
  // External pointers (e.g. For character cards)
  pointers?: {
    boundWorldBookIds?: string[];
    boundRegexIds?: string[];
    boundScriptIds?: string[];
    avatarAssetRef?: string;
  };
  // Has native embedded resources
  hasEmbeddedResources?: {
    characterBook?: boolean;
    regexRules?: boolean;
    alternateGreetings?: boolean;
    scenario?: boolean;
  };
}

export interface SnapshotManifest {
  snapshotId: string;
  backupDate: string; // e.g. "2026-09-16 02:15:00"
  timestamp: number;
  appVersion: string;
  deviceInfo: string;
  summary: {
    totalFiles: number;
    totalSize: number;
    sillytavernCounts: {
      cards: number;
      themes: number;
      presets: number;
      plugins: number;
      scripts: number;
      worldbooks: number;
      regex: number;
      chatHistory: number;
      extraTheater: number;
    };
    mobilePhoneCounts: {
      links: number;
      cards: number;
      worldbooks: number;
      beautifications: number;
      chatMemes: number;
      stickers: number;
      extraTheater: number;
    };
    commonToolsCounts: {
      userPersonas: number;
      chatBackgrounds: number;
      cardFaceMaterials: number;
      fonts: number;
      apis: number;
    };
    settingsCenterCounts: {
      fontConfigs: number;
      apiConfigs: number;
      taxonomies: number;
      uiPreferences: number;
    };
  };
  assets: FileAssetMetadata[];
  encryption: {
    algorithm: 'AES-GCM-256';
    kdf: 'PBKDF2-SHA256';
    iterations: number;
    salt: string;
    authVerificationTag: string; // Used to quickly verify password correctness
  };
}

export interface LocalSnapshotItem {
  id: string;
  dateStr: string;
  timestamp: number;
  summary: string;
  totalSize: number;
  data: any; // Entire structured app data snapshot
}

export interface CategoryProgressItem {
  name: string;
  total: number;
  current: number;
  status: 'pending' | 'processing' | 'done' | 'skipped';
}

export interface SyncProgressUpdate {
  phase: 'scanning' | 'encrypting' | 'uploading' | 'downloading' | 'decrypting' | 'pruning' | 'done' | 'error';
  currentStepText: string;
  completedItems: number;
  totalItems: number;
  currentFileName?: string;
  currentEncryptedFileName?: string;
  majorCategory?: string;
  subCategory?: string;
  percent: number;
  categoryProgress?: Record<string, CategoryProgressItem>;
  uploadedFiles?: number;
  skippedFiles?: number;
}

