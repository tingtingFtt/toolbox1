export interface ScannedDirectoryRecord { path: string; time: number; stats?: any; sourceType?: "tavern" | "local"; folderId?: string; isAnchor?: boolean; }
export interface ItemVersion<T = any> {
  versionId: string;
  versionNumber: number;
  versionLabel?: string;
  updatedAt: number;
  importedAt?: number;
  fileName?: string;
  source?: string;
  sourceCardId?: string;
  sourceCardName?: string;
  sourceCardVersion?: string;
  changeSummary?: string;
  boundAssetsSnapshots?: {
    worldBookId?: string;
    worldBookVersion?: string;
    regexIds?: { id: string; version: string }[];
    scriptIds?: { id: string; version: string }[];
  };
  data: T;
}

export interface CardAssociation {
  cardId: string;
  note?: string;
  noteOwnerId?: string;
  isPrimary?: boolean;
  createdAt: number;
}

export interface CardEntry {
  edited?: boolean;
  createdAt?: number;
  updatedAt?: number;
  importedAt?: number;
  currentVersionSummary?: string;
  charName?: string;
  content?: string;
  customFields?: { key: string; value: string }[];
  editHistory?: Record<string, any>;
  versions?: ItemVersion<any>[];

  activeVersionNumber?: number;
  activeVersionLabel?: string;
  activeVersionId?: string;

  id: string;
  name: string;
  fileName: string;
  fileType: string; // 'png' | 'json' | 'webp'
  version: string;  // 'v2' | 'v3' | 'json'
  author: string;
  authorManual: boolean;
  category?: string;
  customTags?: string[];
  group?: string; // Group name
  source?: string; // 来源 (qq号/群，社区链接)
  rawData: any;
  coverImage: string | null;
  extraCovers?: string[];
  activeCoverIndex?: number;
  qrData?: any;
  associations?: CardAssociation[];
  boundWorldBooks?: string[];
  boundRegexes?: string[];
  boundScripts?: string[];
  boundAssetVersions?: Record<string, string>; // Maps assetId to versionId ('latest' or specific versionId)
  screenshots?: any;
}export interface PhoneLink {
  importedAt?: number;
  id: string;
  name: string;
  url: string;
  contact?: string;
  description?: string;
  createdAt: number;

  updatedAt: number;
}

export interface ThemeEntry {
  importedAt?: number;
  id: string;
  name: string;
  fileName: string;
  author?: string;
  category?: string;
  customTags?: string[];
  type?: string;
  source?: string;
  description?: string;
  coverImage?: string | null;
  jsonData?: any;
  rawJsonString?: string;
  content?: string;
  customFields?: { key: string; value: string }[];
  css?: string;
  fileType?: string;
  versions?: ItemVersion<any>[];
  createdAt: number;
  updatedAt?: number;
}export interface MobilePresetEntry {
  id: string;
  name: string;
  title?: string;
  type?: 'jailbreak' | 'preset' | 'prompt'; // 破限词 / 模型预设 / 提示词
  mode: 'online' | 'offline'; // 线上 / 线下
  author?: string;
  category?: string;
  customTags?: string[];
  source?: string; // 来源 / 订阅链接 / 社区地址
  description?: string;
  content?: string; // 预设核心内容 / 主体提示词
  jailbreakPrompt?: string; // 破限词 / 越狱提示词
  systemPrompt?: string; // 系统设定
  postHistoryInstructions?: string; // 后置指令
  settings?: {
    model?: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    context_window?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    stream?: boolean;
    [key: string]: any;
  };
  rawJsonString?: string;
  jsonData?: any;
  fileName?: string;
  versions?: ItemVersion<any>[];
  isFavorite?: boolean;
  createdAt: number;
  updatedAt?: number;
  importedAt?: number;
}

export interface HtmlStorageEntry {
  id: string;
  title: string;
  name?: string;
  fileName?: string;
  author?: string;
  category?: string;
  customTags?: string[];
  source?: string;
  description?: string;
  htmlContent: string; // HTML 代码
  cssContent?: string; // 附加 CSS
  jsContent?: string; // 附加 JS
  type?: 'widget' | 'hud' | 'bubble' | 'page' | 'template' | 'custom'; // 挂件 / 状态栏 / 气泡 / 页面 / 模板
  previewImage?: string | null;
  isSandboxed?: boolean;
  versions?: ItemVersion<any>[];
  createdAt: number;
  updatedAt?: number;
  importedAt?: number;
}

export interface PresetEntry {
  importedAt?: number;
  id: string;
  name: string;
  title?: string;
  fileName?: string;
  author?: string;
  category?: string;
  customTags?: string[];
  source?: string;
  description?: string;
  jsonData?: any;
  settings?: any;
  rawJsonString?: string;
  regexScripts?: any[];
  embeddedScripts?: any[];
  activeVersionNumber?: number;
  activeVersionLabel?: string;
  activeVersionId?: string;
  currentVersionSummary?: string;
  versions?: ItemVersion<any>[];
  createdAt: number;
  updatedAt?: number;
}export interface PluginEntry {
  importedAt?: number;
  id: string;
  type?: 'plugin' | 'script'; // 'plugin' = link based, 'script' = imported json file based
  name: string;
  url?: string;
  contact?: string;
  author?: string;
  category?: string;
  customTags?: string[];
  tags?: string[];
  source?: string;
  description?: string;
  jsonData?: any;
  fileName?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface NormalCardEntry {
  currentVersionSummary?: string;
  importedAt?: number;
  activeVersionNumber?: number;
  activeVersionLabel?: string;
  activeVersionId?: string;

  id: string;
  fileName?: string;
  charName?: string;
  name?: string;
  realName?: string;
  gender?: string;
  creator?: string;
  author?: string;
  category?: string;
  customTags?: string[];
  tags?: string[];
  firstMes?: string;
  alternateGreetings?: string[];
  scenario?: string;
  personality?: string;
  description?: string;
  mesExample?: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;
  creatorNotes?: string;
  characterVersion?: string;
  source?: string;
  coverImage?: string | null;
  isNpc?: boolean;
  cardRole?: 'main' | 'npc';
  age?: string;
  appearance?: string;
  brief?: string;
  relation?: string;
  reverseRelation?: string;
  familyRelations?: { name: string; relation: string; note?: string }[];
  associations?: CardAssociation[];
  boundWorldBooks?: string[];
  extraStories?: string[];
  rawContent?: string;
  content?: string;
  cardType?: 'document' | 'tavern' | 'png' | 'json' | 'docx' | 'txt';
  importFormat?: 'docx' | 'doc' | 'txt' | 'md' | 'json' | 'png' | 'webp' | 'document' | 'tavern';
  rawData?: any;
  jsonData?: any;
  customFields?: { key: string; value: string }[];
  versions?: ItemVersion<any>[];
  createdAt: number;
  updatedAt?: number;
}

export interface ApiKeyItem {
  id: string;
  memo?: string;
  key: string;
}

export interface ApiEntry {
  importedAt?: number;
  id: string;
  name: string;
  url: string;
  keys: ApiKeyItem[];
  description?: string;
  category?: string;
  customTags?: string[];
  createdAt: number;

  updatedAt: number;
}

export interface FontEntry {
  importedAt?: number;
  id: string;
  name: string;
  url?: string;
  fileData?: string;
  fontFamily: string;
  category?: string;
  customTags?: string[];
  createdAt: number;

  updatedAt: number;
}

export interface ExtraStoryEntry {
  importedAt?: number;
  id: string;
  title: string;
  author?: string;
  content: string;
  category?: string;
  customTags?: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface StickerItem {
  id: string;
  name: string;
  url: string;
}

export interface StickerPackEntry {
  importedAt?: number;
  id: string;
  title: string;
  name?: string;
  author?: string;
  category?: string;
  customTags?: string[];
  items: StickerItem[];
  createdAt: number;
  updatedAt?: number;
}


export interface ChatMemeEntry {
  id: string;
  title?: string;
  content: string;
  category?: string;
  customTags?: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface WorldBookEntry {
  importedAt?: number;
  id: string;
  title: string;
  name?: string;
  author?: string;
  content: string;
  category?: string;
  customTags?: string[];
  createdAt: number;

  updatedAt: number;
  /** JSON 世界书导入时保留原始结构与逐条条目；docx/txt 不使用这些字段 */
  entries?: any[];
  jsonData?: any;
  importFormat?: 'json' | 'docx' | 'txt';
}

export interface ScriptItemRule {
  id?: string | number;
  name?: string;
  type?: string;
  content?: string;
  customFields?: { key: string; value: string }[];
  description?: string;
  enabled?: boolean;
  [key: string]: any;
}

export interface ScriptEntry {
  activeVersionNumber?: number;
  activeVersionLabel?: string;
  activeVersionId?: string;
  importedAt?: number;
  currentVersionSummary?: string;
  sourceCardVersion?: string;
  id: string;
  name: string;
  fileName?: string;
  author?: string;
  category?: string;
  customTags?: string[];
  source?: string;
  description?: string;
  type?: string;
  jsonData?: any;
  rawContent?: string;
  entries?: ScriptItemRule[];
  sourceCardId?: string;
  sourceCardName?: string;
  sourcePresetId?: string;
  sourcePresetName?: string;
  sourceScope?: 'card' | 'preset' | 'standalone' | string;
  isBuiltIn?: boolean;
  versions?: ItemVersion<any>[];
  createdAt: number;
  updatedAt?: number;
}export interface STWorldBookRule {
  id?: number | string;
  keys?: string[] | string;
  secondary_keys?: string[] | string;
  comment?: string;
  content?: string;
  customFields?: { key: string; value: string }[];
  constant?: boolean;
  selective?: boolean;
  insertion_order?: number;
  enabled?: boolean;
  position?: string;
  extensions?: Record<string, any>;
  [key: string]: any;
}

export interface STWorldBookEntry {
  activeVersionNumber?: number;
  activeVersionLabel?: string;
  activeVersionId?: string;
  importedAt?: number;
  currentVersionSummary?: string;
  sourceCardVersion?: string;

  id: string;
  name: string;
  fileName?: string;
  author?: string;
  category?: string;
  customTags?: string[];
  source?: string;
  description?: string;
  entries: STWorldBookRule[];
  jsonData?: any;
  sourceCardId?: string;
  sourceCardName?: string;
  sourcePresetId?: string;
  sourcePresetName?: string;
  sourceScope?: 'card' | 'preset' | 'standalone' | string;
  isBuiltIn?: boolean;
  versions?: ItemVersion<any>[];
  createdAt: number;
  updatedAt?: number;
}export interface STRegexRule {
  id?: string | number;
  scriptName?: string;
  findRegex: string;
  replaceString: string;
  trimStrings?: string[];
  placement?: number[];
  disabled?: boolean;
  isRegex?: boolean;
  promptOnly?: boolean;
  markdownOnly?: boolean;
  substituteRegex?: boolean;
  [key: string]: any;
}

export interface STRegexEntry {
  activeVersionNumber?: number;
  activeVersionLabel?: string;
  activeVersionId?: string;
  importedAt?: number;
  currentVersionSummary?: string;
  sourceCardVersion?: string;

  id: string;
  scriptName: string;
  fileName?: string;
  author?: string;
  category?: string;
  customTags?: string[];
  source?: string;
  description?: string;
  findRegex?: string;
  replaceString?: string;
  disabled?: boolean;
  rules?: STRegexRule[];
  jsonData?: any;
  sourceCardId?: string;
  sourceCardName?: string;
  isBuiltIn?: boolean;
  versions?: ItemVersion<any>[];
  createdAt: number;
  updatedAt?: number;
}export interface ChatMessage {
  id?: string | number;
  name?: string;
  is_user?: boolean;
  is_system?: boolean;
  send_date?: string | number;
  mes?: string;
  extra?: Record<string, any>;
  swipe_id?: number;
  swipes?: string[];
  [key: string]: any;
}

export interface ChatLogEntry {
  id: string;
  title: string;
  fileName?: string;
  characterName?: string;
  userName?: string;
  category?: string;
  customTags?: string[];
  source?: string;
  description?: string;
  summary?: string;
  sourceCardId?: string;
  sourceCardName?: string;
  messages: ChatMessage[];
  messageCount: number;
  tokenCount?: number;
  totalTokens?: number;
  jsonData?: any;
  versions?: ItemVersion<any>[];
  createdAt: number;
  updatedAt?: number;
}export interface PinnedDirectoryConfig {
  path: string;
  folderName: string;
  lastSyncTime?: number;
  hasPermissionHandle?: boolean;
  totalSynced?: number;
}

export interface ExtraScanFolder {
  id: string;
  name: string;
  path: string;
  folderName: string;
  lastSyncTime?: number;
  hasPermissionHandle?: boolean;
  totalCardsFound?: number;
  lastSyncedCount?: number;
}

export interface ScanHistoryRecord {
  id: string;
  path: string;
  time: number;
  stats?: {
    cards?: number;
    worlds?: number;
    regex?: number;
    chats?: number;
    presets?: number;
    themes?: number;
    newAdded?: number;
    updatedVersions?: number;
    skippedDuplicates?: number;
    [key: string]: any;
  };
}

export interface StagedDuplicateCard {
  id: string;
  incomingCard: CardEntry;
  matchedCard: CardEntry;
  matchDetail: any;
  userDecision?: 'skip' | 'new_version' | 'distinct_face' | 'overwrite';
  stagedAt: number;
  fileSource?: string;
}

export interface BatchImportProgressState {
  isActive: boolean;
  isMinimized: boolean;
  total: number;
  current: number;
  currentName: string;
  currentPhase: 'parsing' | 'diffing' | 'staging' | 'extracting' | 'complete' | 'paused' | 'aborted';
  startTime: number;
  stats: {
    added: number;
    updatedVersion: number;
    distinctCard: number;
    overwritten: number;
    skipped: number;
    stagedDuplicates: number;
    failed: number;
  };
  stagedCards: StagedDuplicateCard[];
  isCompleted: boolean;
  errorMessage?: string;
  onCancelImport?: () => void;
}

export interface AppData {

  scriptCategories?: string[];
  stWorldBookCategories?: string[];
  normalCardCategories?: string[];
  npcCardCategories?: string[];
  extraStoryCategories?: string[];
  beautificationCategories?: string[];
  


  themeCategories?: string[];
  presetCategories?: string[];
  pluginCategories?: string[];
  stRegexCategories?: string[];
  chatLogCategories?: string[];
  fontCategories?: string[];
  stickerCategories?: string[];
  worldBookCategories?: string[];
  chatMemeCategories?: string[];

  cards: CardEntry[];
  groups: string[];
  Categories?: string[];
  cardCategories?: string[];
  cardTags?: string[];
  cardsTags?: string[];
  phoneLinks?: PhoneLink[];
  themes?: ThemeEntry[];
  themeTags?: string[];
  beautifications?: ThemeEntry[];
  beautificationTags?: string[];
  presets?: PresetEntry[];
  presetTags?: string[];
  plugins?: PluginEntry[];
  pluginTags?: string[];
  stPluginTags?: string[];
  scripts?: ScriptEntry[];
  scriptTags?: string[];
  stWorldBooks?: STWorldBookEntry[];
  stWorldBookTags?: string[];
  stRegexScripts?: STRegexEntry[];
  stRegexTags?: string[];
  chatLogs?: ChatLogEntry[];
  chatLogTags?: string[];
  normalCards?: NormalCardEntry[];
  normalCardTags?: string[];
  npcCardTags?: string[];
  apiKeys?: ApiEntry[];
  apis?: ApiEntry[];
  apiCategories?: string[];
  apiTags?: string[];
  fonts?: FontEntry[];
  fontTags?: string[];
  extraStories?: ExtraStoryEntry[];
  extraStoryTags?: string[];
  stickerPacks?: StickerPackEntry[];
  stickerTags?: string[];
  worldBooks?: WorldBookEntry[];
  worldBookTags?: string[];
  chatMemes?: ChatMemeEntry[];
  chatMemeTags?: string[];

  mobilePresets?: MobilePresetEntry[];
  mobilePresetCategories?: string[];
  mobilePresetTags?: string[];

  htmlStorages?: HtmlStorageEntry[];
  htmlStorageCategories?: string[];
  htmlStorageTags?: string[];
  
  userPersonas?: UserPersonaEntry[];
  userPersonaCategories?: string[];
  userPersonaTags?: string[];
  
  backgroundImages?: BackgroundImageEntry[];
  backgroundImageCategories?: string[];
  backgroundImageTags?: string[];
  
  cardCovers?: CardCoverEntry[];
  cardCoverCategories?: string[];
  cardCoverTags?: string[];

  lastScannedFolder?: string;
  lastScanTime?: number;
  pinnedDirectory?: PinnedDirectoryConfig;
  extraScanFolders?: ExtraScanFolder[];
  stagedDuplicateCards?: StagedDuplicateCard[];
  scannedDirectories?: ScannedDirectoryRecord[];
  customOverrides?: Record<string, React.CSSProperties>;
  aiRefineSettings?: AIRefineSettings;
}

export type AIRefineFeatureKey = 'format' | 'persona' | 'tags' | 'placeholders';

export interface AIRefinePromptPreset {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  isBuiltIn?: boolean;
  category?: string;
  styleTag?: string;
  kind?: 'style' | 'prompt'; // For persona: distinguish between writing style and functional prompt
}

export interface AIRefineScopeOptions {
  refinePersonaAndDesc: boolean; // 人设与背景设定
  refineGreetings: boolean;      // 开场白与备选问候语
  refineWorldBook: boolean;      // 内嵌世界书条目
}

export interface AIRefineFeatureConfig {
  key: AIRefineFeatureKey;
  title: string;
  description: string;
  enabled: boolean;
  activePresetIds: string[]; // Max 2!
  presets: AIRefinePromptPreset[];
  presetType?: 'prompt' | 'style'; // 'style' is unique to persona, 'prompt' for other features
  presetTypeName?: string; // e.g. '文风预设' vs '排版提示词预设'
}

export interface AIRefineSettings {
  features: Record<AIRefineFeatureKey, AIRefineFeatureConfig>;
  scope?: AIRefineScopeOptions;
}

// Type aliases for backwards compatibility
export type STPreset = PresetEntry;
export type STScript = ScriptEntry;
export type STWorldBook = STWorldBookEntry;
export type STRegexScript = STRegexEntry;
export type STTheme = ThemeEntry;
export type STPlugin = PluginEntry;
export type STChatLog = ChatLogEntry;
export type BeautificationEntry = ThemeEntry;

export interface UserPersonaEntry {
  id: string;
  name: string;
  category: string;
  tags: string[];
  description?: string;
  size: number;
  format: string;
  content?: string;
  customFields?: { key: string; value: string }[];
  fileData?: string; 
  createdAt: number;
  updatedAt: number;
}

export interface BackgroundImageEntry {
  id: string;
  name: string;
  category: string;
  tags: string[];
  size: number;
  format: string;
  fileData: string;
  createdAt: number;
  updatedAt: number;
}

export interface CardCoverEntry {
  id: string;
  name: string;
  category: string;
  tags: string[];
  size: number;
  format: string;
  fileData: string;
  createdAt: number;
  updatedAt: number;
}
