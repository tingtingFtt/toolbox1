import { CustomSelect } from '../ui/CustomSelect';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { BaseCard } from '../ui/BaseCard';
import { Activity, AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronUp, Cloud, Download, Edit3, Eye, EyeOff, FileCheck, FileCode, FileText, Files, Folder, FolderArchive, FolderInput, FolderPlus, FolderSearch, Globe, HardDrive, History, Info, Key, Layers, Loader2, Package, Palette, Pin, PinOff, Plus, RefreshCw, Send, Server, ShieldCheck, Smartphone, Sparkles, Trash2, Upload, Zap } from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AppData, ApiEntry, CardEntry, STWorldBookEntry, ExtraScanFolder, ScanHistoryRecord, BatchImportProgressState } from '../../types';
import {
  savePinnedDirectoryHandle,
  getPinnedDirectoryHandle,
  clearPinnedDirectoryHandle,
  saveExtraFolderHandle,
  getExtraFolderHandle,
  deleteExtraFolderHandle,
  saveBackupDirectoryHandle,
  getBackupDirectoryHandle,
  clearBackupDirectoryHandle,
  getBackupDirectoryPath,
  writeBackupToDirectoryHandle,
  isFileSystemAccessSupported
} from '../../utils/dirHandleStore';
import {
  scanDirectoryHandle,
  fileListToFileItems,
  dataTransferToFileItems,
  executeSmartSync,
  SyncStats
} from '../../utils/syncEngine';
import { getFolderImportCount } from '../../utils/tavernLedger';
import { generateFullDataZipArchive, ExportZipResult, ExportZipProgress } from '../../utils/zipArchiveExporter';
import { formatBytes, generateId } from '../../utils';
import { calculateStorageStatsAsync, StorageStatItem } from '../../utils/storageCalculator';
import { DeleteConfirmationModal } from '../ui/UnifiedModal';
import { saveUserPalette, CustomThemePalette } from '../../utils/themeCustomizer';
import { FLAT_THEMES } from '../ui/ThemeDrawer';
import { ThemeColorCustomizer } from '../ui/ThemeColorCustomizer';
import {
  testSillyTavernConnection,
  pullFromSillyTavern,
  TavernConnectionStatus
} from '../../utils/sillyTavernApi';
import { PushToTavernModal } from '../modals/PushToTavernModal';
import { processCardImportList, DuplicatePromptHandler } from '../../utils/cardImportProcessor';
import { autoAssociateAllAssets } from '../../utils/associationEngine';
import { createImportAbortController, abortActiveImport, isImportAborted } from '../../utils/importCancellation';
import { AIRefineSettingsPanel } from '../settings/AIRefineSettingsPanel';
import { FontManagerPanel } from '../settings/FontManagerPanel';
import { CloudSyncSettingsPanel } from '../settings/CloudSyncSettingsPanel';
import { sessionStore } from '../../utils/sessionStore';

interface SettingsSectionProps {
  appData: AppData;
  updateAppData: React.Dispatch<React.SetStateAction<AppData>>;
  theme?: 'light' | 'dark';
  setTheme?: (t: 'light' | 'dark') => void;
  uiStyle?: 'glass' | 'flat' | 'line-brown' | 'line-green';
  setUiStyle?: (s: 'glass' | 'flat' | 'line-brown' | 'line-green') => void;
  flatTheme?: string;
  setFlatTheme?: (t: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenBigDataExport?: () => void;
  promptDuplicateAction?: DuplicatePromptHandler;
  batchImportProgress?: BatchImportProgressState | null;
  setBatchImportProgress?: React.Dispatch<React.SetStateAction<BatchImportProgressState | null>>;
  onOpenStagingVault?: () => void;
  initialTab?: SettingsTab;
  isInspectMode?: boolean;
  setIsInspectMode?: (val: boolean) => void;
}

export type SettingsTab = 'scan' | 'theme' | 'api' | 'storage' | 'cloud_sync' | 'about';



const AiBeautificationGenerator = ({ appData, showToast }: { appData: AppData, showToast: any }) => {
  const [aiPrompt, setAiPrompt] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isAiGenerating, setIsAiGenerating] = React.useState(false);
  const [selectedApiId, setSelectedApiId] = React.useState('default');

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      showToast?.('请输入样式描述', 'error');
      return;
    }
    
    let apiUrl = localStorage.getItem('tavern_vault_default_api_url') || 'https://api.openai.com/v1';
    let apiKey = localStorage.getItem('tavern_vault_default_api_key') || '';
    let apiModel = localStorage.getItem('tavern_vault_default_api_model') || 'gpt-4o';

    if (selectedApiId !== 'default' && appData.apis) {
      const selectedApi = appData.apis.find(a => a.id === selectedApiId);
      if (selectedApi) {
        apiUrl = selectedApi.url;
        apiKey = selectedApi.keys?.[0]?.key || '';
      }
    }

    if (!apiUrl) {
      showToast?.('请先配置 API 接口', 'error');
      return;
    }

    setIsAiGenerating(true);
    try {
      const cleanUrl = apiUrl.replace(/\/+$/, '');
      const endpoint = cleanUrl.endsWith('/chat/completions') ? cleanUrl : `${cleanUrl}/chat/completions`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model: apiModel,
          messages: [
            {
              role: 'system',
              content: `You are an expert JSON color theme designer. Generate a JSON object containing a custom theme palette based on the user's description.
              The JSON object must have exactly these fields with hex color values (no alpha channel):
              "bgPaper", "bgMuted", "bgSubtle", "line", "lineFocus", "text", "dim", "accent", "accentHover", "accentText", "warn", "err", "btnBase", "btnHover", "btnText".
              DO NOT include markdown formatting (like \`\`\`json), DO NOT include HTML tags, ONLY output valid raw JSON code. ONLY return the JSON object.`
            },
            {
              role: 'user',
              content: aiPrompt
            }
          ]
        })
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      let generatedJson = data.choices?.[0]?.message?.content || '{}';
      generatedJson = generatedJson.replace(new RegExp("```json\\n?", "gi"), "").replace(new RegExp("```\\n?", "gi"), "").replace(new RegExp("```$", "g"), "");
      const parsedPalette = JSON.parse(generatedJson);

      const newId = `custom_theme_${Date.now()}`;
      const newPalette: CustomThemePalette = {
        ...parsedPalette,
        id: newId,
        name: 'AI 生成: ' + (aiPrompt.substring(0, 10) || '主题'),
        createdAt: Date.now(),
        tags: ['AI 生成']
      };

      saveUserPalette(newPalette);

      showToast?.('AI 主题生成成功，并已保存至您的自定义配色库中', 'success');
      setAiPrompt('');
    } catch (err: any) {
      console.error(err);
      showToast?.('生成失败: ' + err.message, 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 mt-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          AI 智能生成美化
        </h3>
      </div>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
        根据您的自然语言描述（如“赛博朋克风格”、“圆角毛玻璃卡片”），自动生成全局 CSS 美化代码，并保存至我的自定义配色库供选择。
      </p>
      
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">选择调用的 API:</label>
          <CustomSelect
  value={selectedApiId}
  onChange={(val) => setSelectedApiId(val)}
  className="px-2.5 py-1 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 outline-none"
  options={[
    {value: 'default', label: '全局默认 API'},
    ...(appData.apis || []).map(api => ({value: api.id, label: api.name}))
  ]}
/>
        </div>
        <textarea
          ref={textareaRef}
          value={aiPrompt}
          onChange={(e: any) => {
            setAiPrompt(e.target.value);
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
          }}
          rows={1}
          placeholder="例如：赛博朋克风格，霓虹灯配色，圆角卡片，深色背景，发光边框..."
          className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none text-zinc-900 dark:text-zinc-100 overflow-hidden leading-relaxed transition-[height] duration-75"
          disabled={isAiGenerating}
        />
        <div className="flex justify-end">
          <BaseButton
            type="button"
            onClick={handleAiGenerate}
            disabled={isAiGenerating || !aiPrompt.trim()}
            className="px-4 py-2 text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAiGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在生成并保存...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                生成美化包
              </>
            )}
          </BaseButton>
        </div>
      </div>
    </div>
  );
};

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  appData,
  updateAppData,
  theme = 'light',
  setTheme,
  uiStyle = 'glass',
  setUiStyle,
  flatTheme = 'wulan',
  setFlatTheme,
  showToast,
  onOpenBigDataExport,
  promptDuplicateAction,
  batchImportProgress,
  setBatchImportProgress,
  onOpenStagingVault,
  initialTab = 'scan',
  isInspectMode,
  setIsInspectMode,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => sessionStore.settings.activeTab || initialTab || 'scan');

  useEffect(() => {
    sessionStore.settings.activeTab = activeTab;
  }, [activeTab]);

  const [storageStats, setStorageStats] = useState<StorageStatItem[]>([]);
  const [isCalculatingStorage, setIsCalculatingStorage] = useState(false);

  useEffect(() => {
    if (activeTab !== 'storage') return;
    
    let isCancelled = false;
    setIsCalculatingStorage(true);

    calculateStorageStatsAsync(appData, (interim) => {
      if (!isCancelled) {
        setStorageStats(interim);
      }
    }).then((finalStats) => {
      if (!isCancelled) {
        setStorageStats(finalStats);
        setIsCalculatingStorage(false);
      }
    }).catch(() => {
      if (!isCancelled) {
        setIsCalculatingStorage(false);
      }
    });
    
    return () => {
      isCancelled = true;
    };
  }, [appData, activeTab]);

  // --- Folder Scan & Sync States ---
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [hasPinnedHandle, setHasPinnedHandle] = useState(false);
  const [pinnedPathInput, setPinnedPathInput] = useState(appData.pinnedDirectory?.path || '');
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [showDetailsDropdown, setShowDetailsDropdown] = useState<boolean>(() => sessionStore.settings.showDetailsDropdown);
  useEffect(() => {
    sessionStore.settings.showDetailsDropdown = showDetailsDropdown;
  }, [showDetailsDropdown]);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showMobileBackupModal, setShowMobileBackupModal] = useState(false);

  // Mobile detection for adapted UX
  const isMobileDevice = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }, []);

  // --- ZIP Archive Export States ---
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<ExportZipProgress | null>(null);
  const [zipResult, setZipResult] = useState<ExportZipResult | null>(null);
  const [showZipResultModal, setShowZipResultModal] = useState(false);
  const zipAbortControllerRef = useRef<AbortController | null>(null);

  // --- API Settings States ---
  const [globalEndpoint, setGlobalEndpoint] = useState(() => localStorage.getItem('tavern_vault_default_api_url') || 'https://api.openai.com/v1');
  const [globalApiKey, setGlobalApiKey] = useState(() => localStorage.getItem('tavern_vault_default_api_key') || '');
  const [globalModel, setGlobalModel] = useState(() => localStorage.getItem('tavern_vault_default_api_model') || 'gpt-4o');
  const [showKey, setShowKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // New API Modal / Edit State
  const [showNewApiModal, setShowNewApiModal] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [newApiUrl, setNewApiUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiModel, setNewApiModel] = useState('gpt-4o');

  // --- SillyTavern Network Interoperability States ---
  const [tavernUrl, setTavernUrl] = useState(() => localStorage.getItem('st_vault_tavern_url') || 'http://127.0.0.1:8000');
  const [tavernApiKey, setTavernApiKey] = useState(() => localStorage.getItem('st_vault_tavern_api_key') || '');
  const [showTavernApiKey, setShowTavernApiKey] = useState(false);
  const [isTestingTavern, setIsTestingTavern] = useState(false);
  const [isPullingTavern, setIsPullingTavern] = useState(false);
  const [tavernStatus, setTavernStatus] = useState<TavernConnectionStatus>({ status: 'disconnected' });
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);

  // --- SillyTavern Directory Archive Points States ---
  const [archivePoints, setArchivePoints] = useState<Array<{
    id: string;
    name: string;
    path: string;
    folderName: string;
    lastSyncTime?: number;
    itemCount?: number;
    handle?: any;
  }>>(() => {
    try {
      const saved = localStorage.getItem('st_vault_archive_points');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [showNewArchiveModal, setShowNewArchiveModal] = useState(false);
  const [newArchivePointName, setNewArchivePointName] = useState('');
  const [syncingArchivePointId, setSyncingArchivePointId] = useState<string | null>(null);
  const archiveFolderInputRef = useRef<HTMLInputElement>(null);
  const archiveMultiFileInputRef = useRef<HTMLInputElement>(null);
  const restoreBackupInputRef = useRef<HTMLInputElement>(null);
  const extraFolderInputRef = useRef<HTMLInputElement>(null);

  // --- Extra Scan Folders States ---
  const [editingExtraFolderId, setEditingExtraFolderId] = useState<string | null>(null);
  const [editingExtraFolderNameInput, setEditingExtraFolderNameInput] = useState('');
  const [syncingExtraFolderId, setSyncingExtraFolderId] = useState<string | null>(null);

  // --- History Records Management ---
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(() => sessionStore.settings.isHistoryExpanded);
  useEffect(() => {
    sessionStore.settings.isHistoryExpanded = isHistoryExpanded;
  }, [isHistoryExpanded]);

  // --- Live Backup States ---
  const [isLiveBackupEnabled, setIsLiveBackupEnabled] = useState(
    () => localStorage.getItem('st_vault_live_backup_enabled') === 'true'
  );
  const [liveBackupPath, setLiveBackupPath] = useState(
    () => localStorage.getItem('st_vault_live_backup_path') || ''
  );
  const [isEditingBackupPath, setIsEditingBackupPath] = useState(false);
  const [editBackupPathInput, setEditBackupPathInput] = useState('');
  const [hasBackupHandle, setHasBackupHandle] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string>(
    () => localStorage.getItem('st_vault_live_backup_last_time') || ''
  );
  const backupFolderInputRef = useRef<HTMLInputElement>(null);
  const [backupHealthReport, setBackupHealthReport] = useState<{
    checked: boolean;
    score: number;
    totalRecords: number;
    issues: string[];
    repairedCount: number;
  } | null>(null);

  const canUseFSA = isFileSystemAccessSupported();

  // Ensure DOM elements have native webkitdirectory and directory properties set for local files
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      // @ts-ignore
      folderInputRef.current.webkitdirectory = true;
    }
    if (archiveFolderInputRef.current) {
      archiveFolderInputRef.current.setAttribute('webkitdirectory', '');
      archiveFolderInputRef.current.setAttribute('directory', '');
      // @ts-ignore
      archiveFolderInputRef.current.webkitdirectory = true;
    }
    if (extraFolderInputRef.current) {
      extraFolderInputRef.current.setAttribute('webkitdirectory', '');
      extraFolderInputRef.current.setAttribute('directory', '');
      // @ts-ignore
      extraFolderInputRef.current.webkitdirectory = true;
    }
  }, []);

  useEffect(() => {
    // Check if there is an existing pinned handle in IndexedDB
    getPinnedDirectoryHandle().then(handle => {
      if (handle) {
        setHasPinnedHandle(true);
        if (!appData.pinnedDirectory?.folderName) {
          updateAppData(prev => ({
            ...prev,
            pinnedDirectory: {
              path: prev.pinnedDirectory?.path || handle.name,
              folderName: handle.name,
              lastSyncTime: prev.pinnedDirectory?.lastSyncTime,
              hasPermissionHandle: true
            }
          }));
        }
      }
    });

    // Check if there is an existing backup directory handle in IndexedDB
    getBackupDirectoryHandle().then(handle => {
      if (handle) {
        setHasBackupHandle(true);
        setLiveBackupPath(handle.name);
        setIsLiveBackupEnabled(true);
      } else {
        getBackupDirectoryPath().then(path => {
          if (path) {
            setLiveBackupPath(path);
            setIsLiveBackupEnabled(true);
          }
        });
      }
    });
  }, []);

  // --- Theme Selection Handlers ---
  const handleSelectFlatTheme = (id: string, name: string, tag: string) => {
    if (setUiStyle) setUiStyle('flat');
    if (setFlatTheme) setFlatTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    document.body.setAttribute('data-theme', id);
    try {
      localStorage.setItem('tavern_vault_flat_theme', id);
      localStorage.setItem('tavern_vault_style', 'flat');
    } catch (e: any) {}
    showToast?.(`已应用灵感色调：${tag}`, 'success');
  };

  const handleSwitchToFlat = () => {
    if (setUiStyle) setUiStyle('flat');
    if (setTheme) setTheme('light');
    document.documentElement.setAttribute('data-theme', flatTheme);
    document.body.setAttribute('data-theme', flatTheme);
    try {
      localStorage.setItem('tavern_vault_style', 'flat');
      localStorage.setItem('tavern_vault_theme', 'light');
    } catch (e: any) {}
    showToast?.(`已切换至扁平风格`, 'info');
  };

  const handleSwitchToGlass = () => {
    if (setUiStyle) setUiStyle('glass');
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('tavern_vault_style', 'glass');
    } catch (e: any) {}
    showToast?.('已切换至毛玻璃质感风格', 'info');
  };

  const toggleDarkLight = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    if (setTheme) setTheme(next);
    try {
      localStorage.setItem('tavern_vault_theme', next);
    } catch (e: any) {}
    if (uiStyle === 'glass') {
      document.documentElement.setAttribute('data-theme', next);
      document.body.setAttribute('data-theme', next);
    }
    showToast?.(next === 'dark' ? '已开启暗黑模式' : '已开启明亮模式', 'info');
  };

  const scrollToFolderArchive = () => {
    setActiveTab('scan');
    setTimeout(() => {
      document.getElementById('folder-archive-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  // --- Folder Sync Handlers ---
  const handleDirectSync = async () => {
    if (canUseFSA) {
      try {
        const storedHandle = await getPinnedDirectoryHandle();
        if (storedHandle) {
          // @ts-ignore
          const perm = await storedHandle.requestPermission({ mode: 'read' });
          if (perm === 'granted') {
            await runSyncFromHandle(storedHandle);
            return;
          }
        }
        handlePickAndPinDirectory();
        return;
      } catch (e) {
        console.warn('Direct FSA sync fallback:', e);
      }
    }
    folderInputRef.current?.click();
  };

  const handlePickAndPinDirectory = async () => {
    if (canUseFSA) {
      try {
        // @ts-ignore
        const handle = await window.showDirectoryPicker({
          id: 'st-vault-sync-dir',
          mode: 'read'
        });
        if (handle) {
          await savePinnedDirectoryHandle(handle, pinnedPathInput || handle.name);
          setHasPinnedHandle(true);
          updateAppData(prev => ({
            ...prev,
            pinnedDirectory: {
              path: pinnedPathInput || handle.name,
              folderName: handle.name,
              lastSyncTime: Date.now(),
              hasPermissionHandle: true
            }
          }));
          await runSyncFromHandle(handle);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker failed, fallback to input:', err);
      }
    }
    folderInputRef.current?.click();
  };

  const runSyncFromHandle = async (handle: FileSystemDirectoryHandle, archivePointId?: string) => {
    const abortCtrl = createImportAbortController();

    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);
    setCurrentFile('正在索引文件夹结构...');

    try {
      const fileItems = await scanDirectoryHandle(handle);
      if (isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }

      const folderName = handle.name || appData.pinnedDirectory?.folderName || '本地角色卡目录';

      if (fileItems.length > 1) {
        setBatchImportProgress?.({
          isActive: true,
          isMinimized: false,
          total: fileItems.length,
          current: 0,
          currentName: `正在读取目录 [${folderName}]...`,
          currentPhase: 'parsing',
          startTime: Date.now(),
          stats: {
            added: 0,
            updatedVersion: 0,
            distinctCard: 0,
            overwritten: 0,
            skipped: 0,
            stagedDuplicates: 0,
            failed: 0
          },
          stagedCards: [],
          isCompleted: false,
          onCancelImport: () => {
            abortActiveImport();
          }
        });
      }

      const { updatedAppData, stats, stagedDuplicates } = await executeSmartSync(
        fileItems,
        appData,
        (prog, file, currentStats) => {
          if (isImportAborted()) return;
          setScanProgress(prog);
          setCurrentFile(file);
          setSyncStats({ ...currentStats });
          if (fileItems.length > 1) {
            setBatchImportProgress?.(prev => prev ? {
              ...prev,
              current: Math.round((prog / 100) * fileItems.length),
              currentName: file,
              currentPhase: prog < 30 ? 'parsing' : prog < 80 ? 'diffing' : 'extracting',
              stats: {
                added: currentStats.newAdded,
                updatedVersion: currentStats.updatedVersions,
                distinctCard: (currentStats as any).distinctCard || 0,
                overwritten: (currentStats as any).overwritten || 0,
                skipped: currentStats.skippedDuplicates,
                stagedDuplicates: (currentStats as any).stagedDuplicates || 0,
                failed: 0
              }
            } : null);
          }
        },
        {
          folderId: archivePointId || pinnedPathInput || folderName,
          folderName,
          isTavernSource: false,
          onDuplicatePrompt: promptDuplicateAction,
          abortSignal: abortCtrl.signal,
          checkAborted: isImportAborted
        }
      );

      if (isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }

      const scanRecord = {
        path: archivePointId ? `存档点: ${folderName}` : (pinnedPathInput || folderName),
        time: Date.now(),
        sourceType: 'local' as const,
        folderId: archivePointId || pinnedPathInput || folderName,
        isAnchor: false,
        stats: {
          cards: stats.cards,
          worlds: stats.worlds,
          regex: stats.regex,
          chats: stats.chats,
          presets: stats.presets,
          themes: stats.themes,
          newAdded: stats.newAdded,
          updatedVersions: stats.updatedVersions,
          skippedDuplicates: stats.skippedDuplicates
        }
      };

      if (archivePointId) {
        setArchivePoints(prev => {
          const updated = prev.map(p => p.id === archivePointId ? { ...p, handle, lastSyncTime: Date.now(), itemCount: stats.cards } : p);
          localStorage.setItem('st_vault_archive_points', JSON.stringify(updated.map(p => ({ ...p, handle: undefined }))));
          return updated;
        });
      }

      updateAppData({
        ...updatedAppData,
        lastScannedFolder: folderName,
        lastScanTime: Date.now(),
        pinnedDirectory: archivePointId ? appData.pinnedDirectory : {
          path: pinnedPathInput || folderName,
          folderName: folderName,
          lastSyncTime: Date.now(),
          hasPermissionHandle: true,
          totalSynced: (appData.pinnedDirectory?.totalSynced || 0) + stats.newAdded + stats.updatedVersions
        },
        scannedDirectories: [scanRecord, ...(appData.scannedDirectories || [])]
      });

      setSyncStats(stats);
      setScanProgress(100);

      if (fileItems.length > 1) {
        setBatchImportProgress?.(prev => prev ? {
          ...prev,
          current: fileItems.length,
          currentName: stagedDuplicates && stagedDuplicates.length > 0 ? '同步完成，已将重复待决卡片放入暂存处' : '同步完成',
          currentPhase: 'complete',
          isCompleted: true,
          stagedCards: stagedDuplicates || [],
          stats: {
            added: stats.newAdded,
            updatedVersion: stats.updatedVersions,
            distinctCard: (stats as any).distinctCard || 0,
            overwritten: (stats as any).overwritten || 0,
            skipped: stats.skippedDuplicates,
            stagedDuplicates: stats.stagedDuplicates || (stagedDuplicates ? stagedDuplicates.length : 0),
            failed: 0
          }
        } : null);
      }

      if (stagedDuplicates && stagedDuplicates.length > 0) {
        showToast?.(`已同步完成，其中 ${stagedDuplicates.length} 张冲突卡片已放入暂存处等待确认`, 'info');
        setTimeout(() => {
          onOpenStagingVault?.();
        }, 300);
      } else {
        showToast?.(`已成功从目录 [${folderName}] 同步卡片与资源！`, 'success');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('终止') || isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }
      console.error('Error during FSA directory sync:', err);
      showToast?.(`同步失败: ${err.message || '未知错误'}`, 'error');
    } finally {
      setIsScanning(false);
      setCurrentFile('');
    }
  };

  const handleFallbackFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const abortCtrl = createImportAbortController();

    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);
    setCurrentFile('正在解析文件结构...');

    try {
      const fileItems = fileListToFileItems(files);
      let rootFolder = files[0].webkitRelativePath
        ? files[0].webkitRelativePath.split('/')[0]
        : (files[0].name ? '已选文件' : '本地角色卡目录');

      if (fileItems.length > 1) {
        setBatchImportProgress?.({
          isActive: true,
          isMinimized: false,
          total: fileItems.length,
          current: 0,
          currentName: `正在读取目录 [${rootFolder}]...`,
          currentPhase: 'parsing',
          startTime: Date.now(),
          stats: {
            added: 0,
            updatedVersion: 0,
            distinctCard: 0,
            overwritten: 0,
            skipped: 0,
            stagedDuplicates: 0,
            failed: 0
          },
          stagedCards: [],
          isCompleted: false,
          onCancelImport: () => {
            abortActiveImport();
          }
        });
      }

      const { updatedAppData, stats, stagedDuplicates } = await executeSmartSync(
        fileItems,
        appData,
        (prog, file, currentStats) => {
          if (isImportAborted()) return;
          setScanProgress(prog);
          setCurrentFile(file);
          setSyncStats({ ...currentStats });
          if (fileItems.length > 1) {
            setBatchImportProgress?.(prev => prev ? {
              ...prev,
              current: Math.round((prog / 100) * fileItems.length),
              currentName: file,
              currentPhase: prog < 30 ? 'parsing' : prog < 80 ? 'diffing' : 'extracting',
              stats: {
                added: currentStats.newAdded,
                updatedVersion: currentStats.updatedVersions,
                distinctCard: (currentStats as any).distinctCard || 0,
                overwritten: (currentStats as any).overwritten || 0,
                skipped: currentStats.skippedDuplicates,
                stagedDuplicates: (currentStats as any).stagedDuplicates || 0,
                failed: 0
              }
            } : null);
          }
        },
        {
          folderId: rootFolder,
          folderName: rootFolder,
          isTavernSource: false,
          onDuplicatePrompt: promptDuplicateAction,
          abortSignal: abortCtrl.signal,
          checkAborted: isImportAborted
        }
      );

      if (isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }

      const scanRecord = {
        path: pinnedPathInput || rootFolder,
        time: Date.now(),
        sourceType: 'local' as const,
        folderId: pinnedPathInput || rootFolder,
        isAnchor: false,
        stats: {
          cards: stats.cards,
          worlds: stats.worlds,
          regex: stats.regex,
          chats: stats.chats,
          presets: stats.presets,
          themes: stats.themes,
          newAdded: stats.newAdded,
          updatedVersions: stats.updatedVersions,
          skippedDuplicates: stats.skippedDuplicates
        }
      };

      updateAppData({
        ...updatedAppData,
        lastScannedFolder: rootFolder,
        lastScanTime: Date.now(),
        pinnedDirectory: {
          path: pinnedPathInput || rootFolder,
          folderName: rootFolder,
          lastSyncTime: Date.now(),
          hasPermissionHandle: false,
          totalSynced: (appData.pinnedDirectory?.totalSynced || 0) + stats.newAdded + stats.updatedVersions
        },
        scannedDirectories: [scanRecord, ...(appData.scannedDirectories || [])]
      });

      setSyncStats(stats);
      setScanProgress(100);

      if (fileItems.length > 1) {
        setBatchImportProgress?.(prev => prev ? {
          ...prev,
          current: fileItems.length,
          currentName: stagedDuplicates && stagedDuplicates.length > 0 ? '同步完成，已将重复待决卡片放入暂存处' : '同步完成',
          currentPhase: 'complete',
          isCompleted: true,
          stagedCards: stagedDuplicates || [],
          stats: {
            added: stats.newAdded,
            updatedVersion: stats.updatedVersions,
            distinctCard: (stats as any).distinctCard || 0,
            overwritten: (stats as any).overwritten || 0,
            skipped: stats.skippedDuplicates,
            stagedDuplicates: stats.stagedDuplicates || (stagedDuplicates ? stagedDuplicates.length : 0),
            failed: 0
          }
        } : null);
      }

      if (stagedDuplicates && stagedDuplicates.length > 0) {
        showToast?.(`已同步完成，其中 ${stagedDuplicates.length} 张冲突卡片已放入暂存处等待确认`, 'info');
        setTimeout(() => {
          onOpenStagingVault?.();
        }, 300);
      } else {
        showToast?.(`已成功从 [${rootFolder}] 导入角色卡与数据！`, 'success');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('终止') || isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }
      console.error('Error during fallback folder sync:', err);
      showToast?.(`同步失败: ${err.message || '未知错误'}`, 'error');
    } finally {
      setIsScanning(false);
      setCurrentFile('');
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
      if (multiFileInputRef.current) {
        multiFileInputRef.current.value = '';
      }
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSavePathAlias = () => {
    setIsEditingPath(false);
    updateAppData(prev => ({
      ...prev,
      pinnedDirectory: {
        path: pinnedPathInput,
        folderName: prev.pinnedDirectory?.folderName || pinnedPathInput,
        lastSyncTime: prev.pinnedDirectory?.lastSyncTime,
        hasPermissionHandle: prev.pinnedDirectory?.hasPermissionHandle,
        totalSynced: prev.pinnedDirectory?.totalSynced
      }
    }));
  };

  const handleUnpinDirectory = async () => {
    await clearPinnedDirectoryHandle();
    setHasPinnedHandle(false);
    updateAppData(prev => ({
      ...prev,
      pinnedDirectory: undefined
    }));
    setPinnedPathInput('');
  };

  // --- Extra Folders and History Handlers ---
  const handleDeleteHistoryRecord = (indexToDelete: number) => {
    updateAppData(prev => {
      const records = [...(prev.scannedDirectories || [])];
      records.splice(indexToDelete, 1);
      return { ...prev, scannedDirectories: records };
    });
    showToast?.('已删除该条扫描历史记录', 'success');
  };

  const handleClearAllHistory = () => {
    if (window.confirm('确定要清空所有已归档的历史扫描记录吗？（固定锚点记录将保留）')) {
      updateAppData(prev => {
        const remaining = (prev.scannedDirectories || []).filter(r => r.isAnchor);
        return { ...prev, scannedDirectories: remaining };
      });
      showToast?.('已清空全部非固定扫描历史记录', 'success');
    }
  };

  const handleAddNewExtraFolder = async () => {
    if (canUseFSA) {
      try {
        // @ts-ignore
        const handle = await window.showDirectoryPicker({
          id: 'st-vault-extra-dir-' + Date.now(),
          mode: 'read'
        });
        if (handle) {
          const folderId = 'extra_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          await saveExtraFolderHandle(folderId, handle);

          const abortCtrl = createImportAbortController();

          setIsScanning(true);
          setScanComplete(false);
          setScanProgress(0);
          setCurrentFile(`正在扫描附加目录 [${handle.name}]...`);

          const fileItems = await scanDirectoryHandle(handle);
          if (isImportAborted()) {
            showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
            setBatchImportProgress?.(null);
            return;
          }

          if (fileItems.length > 1) {
            setBatchImportProgress?.({
              isActive: true,
              isMinimized: false,
              total: fileItems.length,
              current: 0,
              currentName: `正在读取附加目录 [${handle.name}]...`,
              currentPhase: 'parsing',
              startTime: Date.now(),
              stats: {
                added: 0,
                updatedVersion: 0,
                distinctCard: 0,
                overwritten: 0,
                skipped: 0,
                stagedDuplicates: 0,
                failed: 0
              },
              stagedCards: [],
              isCompleted: false,
              onCancelImport: () => {
                abortActiveImport();
              }
            });
          }

          const { updatedAppData, stats, stagedDuplicates } = await executeSmartSync(
            fileItems,
            appData,
            (prog, file, currentStats) => {
              if (isImportAborted()) return;
              setScanProgress(prog);
              setCurrentFile(file);
              setSyncStats({ ...currentStats });
              if (fileItems.length > 1) {
                setBatchImportProgress?.(prev => prev ? {
                  ...prev,
                  current: Math.round((prog / 100) * fileItems.length),
                  currentName: file,
                  currentPhase: prog < 30 ? 'parsing' : prog < 80 ? 'diffing' : 'extracting',
                  stats: {
                    added: currentStats.newAdded,
                    updatedVersion: currentStats.updatedVersions,
                    distinctCard: (currentStats as any).distinctCard || 0,
                    overwritten: (currentStats as any).overwritten || 0,
                    skipped: currentStats.skippedDuplicates,
                    stagedDuplicates: (currentStats as any).stagedDuplicates || 0,
                    failed: 0
                  }
                } : null);
              }
            },
            {
              folderId,
              folderName: handle.name,
              isTavernSource: false,
              onDuplicatePrompt: promptDuplicateAction,
              abortSignal: abortCtrl.signal,
              checkAborted: isImportAborted
            }
          );

          if (isImportAborted()) {
            showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
            setBatchImportProgress?.(null);
            return;
          }

          const newFolder: ExtraScanFolder = {
            id: folderId,
            name: handle.name || `附加文件夹 ${(appData.extraScanFolders?.length || 0) + 1}`,
            path: handle.name,
            folderName: handle.name,
            lastSyncTime: Date.now(),
            hasPermissionHandle: true,
            totalCardsFound: stats.cards,
            lastSyncedCount: stats.newAdded + stats.updatedVersions
          };

          const scanRecord = {
        path: `附加目录: ${handle.name}`,
        time: Date.now(),
        sourceType: 'local' as const,
        folderId: folderId,
        isAnchor: false,
        stats: {
              cards: stats.cards,
              worlds: stats.worlds,
              regex: stats.regex,
              chats: stats.chats,
              presets: stats.presets,
              themes: stats.themes,
              newAdded: stats.newAdded,
              updatedVersions: stats.updatedVersions,
              skippedDuplicates: stats.skippedDuplicates
            }
          };

          updateAppData({
            ...updatedAppData,
            extraScanFolders: [...(appData.extraScanFolders || []), newFolder],
            scannedDirectories: [scanRecord, ...(appData.scannedDirectories || [])]
          });

          setSyncStats(stats);
          setScanProgress(100);

          if (fileItems.length > 1) {
            setBatchImportProgress?.(prev => prev ? {
              ...prev,
              current: fileItems.length,
              currentName: stagedDuplicates && stagedDuplicates.length > 0 ? '附加目录同步完成，已将重复待决卡片放入暂存处' : '附加目录关联并同步完成',
              currentPhase: 'complete',
              isCompleted: true,
              stagedCards: stagedDuplicates || [],
              stats: {
                added: stats.newAdded,
                updatedVersion: stats.updatedVersions,
                distinctCard: (stats as any).distinctCard || 0,
                overwritten: (stats as any).overwritten || 0,
                skipped: stats.skippedDuplicates,
                stagedDuplicates: stats.stagedDuplicates || (stagedDuplicates ? stagedDuplicates.length : 0),
                failed: 0
              }
            } : null);
          }

          if (stagedDuplicates && stagedDuplicates.length > 0) {
            showToast?.(`附加目录 [${handle.name}] 同步完成，其中 ${stagedDuplicates.length} 张冲突卡片已放入暂存处`, 'info');
            setTimeout(() => {
              onOpenStagingVault?.();
            }, 300);
          } else {
            showToast?.(`已成功关联附加目录 [${handle.name}] 并同步角色卡！`, 'success');
          }
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('终止') || isImportAborted()) {
          showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
          setBatchImportProgress?.(null);
          return;
        }
        console.warn('showDirectoryPicker extra folder failed, fallback to input:', err);
      }
    }
    extraFolderInputRef.current?.click();
  };

  const handleFallbackExtraFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const abortCtrl = createImportAbortController();

    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);
    setCurrentFile('正在解析附加文件夹结构...');

    try {
      const fileItems = fileListToFileItems(files);
      let rootFolder = files[0].webkitRelativePath
        ? files[0].webkitRelativePath.split('/')[0]
        : (files[0].name ? '附加角色卡文件夹' : `附加文件夹 ${(appData.extraScanFolders?.length || 0) + 1}`);
      const folderId = 'extra_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      if (fileItems.length > 1) {
        setBatchImportProgress?.({
          isActive: true,
          isMinimized: false,
          total: fileItems.length,
          current: 0,
          currentName: `正在读取附加目录 [${rootFolder}]...`,
          currentPhase: 'parsing',
          startTime: Date.now(),
          stats: {
            added: 0,
            updatedVersion: 0,
            distinctCard: 0,
            overwritten: 0,
            skipped: 0,
            stagedDuplicates: 0,
            failed: 0
          },
          stagedCards: [],
          isCompleted: false,
          onCancelImport: () => {
            abortActiveImport();
          }
        });
      }

      const { updatedAppData, stats, stagedDuplicates } = await executeSmartSync(
        fileItems,
        appData,
        (prog, file, currentStats) => {
          if (isImportAborted()) return;
          setScanProgress(prog);
          setCurrentFile(file);
          setSyncStats({ ...currentStats });
          if (fileItems.length > 1) {
            setBatchImportProgress?.(prev => prev ? {
              ...prev,
              current: Math.round((prog / 100) * fileItems.length),
              currentName: file,
              currentPhase: prog < 30 ? 'parsing' : prog < 80 ? 'diffing' : 'extracting',
              stats: {
                added: currentStats.newAdded,
                updatedVersion: currentStats.updatedVersions,
                distinctCard: (currentStats as any).distinctCard || 0,
                overwritten: (currentStats as any).overwritten || 0,
                skipped: currentStats.skippedDuplicates,
                stagedDuplicates: (currentStats as any).stagedDuplicates || 0,
                failed: 0
              }
            } : null);
          }
        },
        {
          folderId,
          folderName: rootFolder,
          isTavernSource: false,
          onDuplicatePrompt: promptDuplicateAction,
          abortSignal: abortCtrl.signal,
          checkAborted: isImportAborted
        }
      );

      if (isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }

      const newFolder: ExtraScanFolder = {
        id: folderId,
        name: rootFolder,
        path: rootFolder,
        folderName: rootFolder,
        lastSyncTime: Date.now(),
        hasPermissionHandle: false,
        totalCardsFound: stats.cards,
        lastSyncedCount: stats.newAdded + stats.updatedVersions
      };

      const scanRecord = {
        path: `附加目录: ${rootFolder}`,
        time: Date.now(),
        sourceType: 'local' as const,
        folderId: folderId,
        isAnchor: false,
        stats: {
          cards: stats.cards,
          worlds: stats.worlds,
          regex: stats.regex,
          chats: stats.chats,
          presets: stats.presets,
          themes: stats.themes,
          newAdded: stats.newAdded,
          updatedVersions: stats.updatedVersions,
          skippedDuplicates: stats.skippedDuplicates
        }
      };

      updateAppData({
        ...updatedAppData,
        extraScanFolders: [...(appData.extraScanFolders || []), newFolder],
        scannedDirectories: [scanRecord, ...(appData.scannedDirectories || [])]
      });

      setSyncStats(stats);
      setScanProgress(100);

      if (fileItems.length > 1) {
        setBatchImportProgress?.(prev => prev ? {
          ...prev,
          current: fileItems.length,
          currentName: stagedDuplicates && stagedDuplicates.length > 0 ? '附加目录关联完成，已将重复待决卡片放入暂存处' : '附加目录关联并导入完成',
          currentPhase: 'complete',
          isCompleted: true,
          stagedCards: stagedDuplicates || [],
          stats: {
            added: stats.newAdded,
            updatedVersion: stats.updatedVersions,
            distinctCard: (stats as any).distinctCard || 0,
            overwritten: (stats as any).overwritten || 0,
            skipped: stats.skippedDuplicates,
            stagedDuplicates: stats.stagedDuplicates || (stagedDuplicates ? stagedDuplicates.length : 0),
            failed: 0
          }
        } : null);
      }

      if (stagedDuplicates && stagedDuplicates.length > 0) {
        showToast?.(`附加文件夹 [${rootFolder}] 导入完成，其中 ${stagedDuplicates.length} 张冲突卡片已放入暂存处`, 'info');
        setTimeout(() => {
          onOpenStagingVault?.();
        }, 300);
      } else {
        showToast?.(`已成功关联附加文件夹 [${rootFolder}] 并导入角色卡！`, 'success');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('终止') || isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }
      console.error('Error during fallback extra folder sync:', err);
      showToast?.(`同步失败: ${err.message || '未知错误'}`, 'error');
    } finally {
      setIsScanning(false);
      setCurrentFile('');
      if (extraFolderInputRef.current) {
        extraFolderInputRef.current.value = '';
      }
    }
  };

  const handleSyncExtraFolder = async (folder: ExtraScanFolder) => {
    setSyncingExtraFolderId(folder.id);
    const abortCtrl = createImportAbortController();
    try {
      const handle = await getExtraFolderHandle(folder.id);
      if (handle) {
        setIsScanning(true);
        setScanComplete(false);
        setScanProgress(0);
        setCurrentFile(`正在扫描附加目录 [${folder.name}]...`);

        const fileItems = await scanDirectoryHandle(handle);
        if (isImportAborted()) {
          showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
          setBatchImportProgress?.(null);
          return;
        }

        if (fileItems.length > 1) {
          setBatchImportProgress?.({
            isActive: true,
            isMinimized: false,
            total: fileItems.length,
            current: 0,
            currentName: `正在同步附加目录 [${folder.name}]...`,
            currentPhase: 'parsing',
            startTime: Date.now(),
            stats: {
              added: 0,
              updatedVersion: 0,
              distinctCard: 0,
              overwritten: 0,
              skipped: 0,
              stagedDuplicates: 0,
              failed: 0
            },
            stagedCards: [],
            isCompleted: false,
            onCancelImport: () => {
              abortActiveImport();
            }
          });
        }

        const { updatedAppData, stats, stagedDuplicates } = await executeSmartSync(
          fileItems,
          appData,
          (prog, file, currentStats) => {
            if (isImportAborted()) return;
            setScanProgress(prog);
            setCurrentFile(file);
            setSyncStats({ ...currentStats });
            if (fileItems.length > 1) {
              setBatchImportProgress?.(prev => prev ? {
                ...prev,
                current: Math.round((prog / 100) * fileItems.length),
                currentName: file,
                currentPhase: prog < 30 ? 'parsing' : prog < 80 ? 'diffing' : 'extracting',
                stats: {
                  added: currentStats.newAdded,
                  updatedVersion: currentStats.updatedVersions,
                  distinctCard: (currentStats as any).distinctCard || 0,
                  overwritten: (currentStats as any).overwritten || 0,
                  skipped: currentStats.skippedDuplicates,
                  stagedDuplicates: (currentStats as any).stagedDuplicates || 0,
                  failed: 0
                }
              } : null);
            }
          },
          {
            folderId: folder.id,
            folderName: folder.name,
            isTavernSource: false,
            onDuplicatePrompt: promptDuplicateAction,
            abortSignal: abortCtrl.signal,
            checkAborted: isImportAborted
          }
        );

        if (isImportAborted()) {
          showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
          setBatchImportProgress?.(null);
          return;
        }

        const scanRecord = {
        path: `附加目录同步: ${folder.name}`,
        time: Date.now(),
        sourceType: 'local' as const,
        folderId: folder.id,
        isAnchor: false,
        stats: {
            cards: stats.cards,
            worlds: stats.worlds,
            regex: stats.regex,
            chats: stats.chats,
            presets: stats.presets,
            themes: stats.themes,
            newAdded: stats.newAdded,
            updatedVersions: stats.updatedVersions,
            skippedDuplicates: stats.skippedDuplicates
          }
        };

        const updatedExtraFolders = (appData.extraScanFolders || []).map(f =>
          f.id === folder.id
            ? {
                ...f,
                lastSyncTime: Date.now(),
                totalCardsFound: stats.cards,
                lastSyncedCount: stats.newAdded + stats.updatedVersions
              }
            : f
        );

        updateAppData({
          ...updatedAppData,
          extraScanFolders: updatedExtraFolders,
          scannedDirectories: [scanRecord, ...(appData.scannedDirectories || [])]
        });

        setSyncStats(stats);
        setScanProgress(100);

        if (fileItems.length > 1) {
          setBatchImportProgress?.(prev => prev ? {
            ...prev,
            current: fileItems.length,
            currentName: stagedDuplicates && stagedDuplicates.length > 0 ? '附加目录同步完成，已将重复待决卡片放入暂存处' : '附加目录同步完成',
            currentPhase: 'complete',
            isCompleted: true,
            stagedCards: stagedDuplicates || [],
            stats: {
              added: stats.newAdded,
              updatedVersion: stats.updatedVersions,
              distinctCard: (stats as any).distinctCard || 0,
              overwritten: (stats as any).overwritten || 0,
              skipped: stats.skippedDuplicates,
              stagedDuplicates: stats.stagedDuplicates || (stagedDuplicates ? stagedDuplicates.length : 0),
              failed: 0
            }
          } : null);
        }

        if (stagedDuplicates && stagedDuplicates.length > 0) {
          showToast?.(`目录 [${folder.name}] 增量同步完成，其中 ${stagedDuplicates.length} 张冲突卡片已放入暂存处`, 'info');
          setTimeout(() => {
            onOpenStagingVault?.();
          }, 300);
        } else {
          showToast?.(`目录 [${folder.name}] 增量同步完成！`, 'success');
        }
      } else {
        showToast?.('需要重新授权此文件夹访问权限，请点击重新选择', 'info');
        handleAddNewExtraFolder();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('终止') || isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }
      showToast?.(`同步失败: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
      setSyncingExtraFolderId(null);
    }
  };

  const handleDeleteExtraFolder = async (folderId: string) => {
    await deleteExtraFolderHandle(folderId);
    updateAppData(prev => ({
      ...prev,
      extraScanFolders: (prev.extraScanFolders || []).filter(f => f.id !== folderId)
    }));
    showToast?.('已解除附加文件夹关联', 'success');
  };

  const handleSaveExtraFolderName = (folderId: string) => {
    if (!editingExtraFolderNameInput.trim()) {
      setEditingExtraFolderId(null);
      return;
    }
    updateAppData(prev => ({
      ...prev,
      extraScanFolders: (prev.extraScanFolders || []).map(f =>
        f.id === folderId ? { ...f, name: editingExtraFolderNameInput.trim() } : f
      )
    }));
    setEditingExtraFolderId(null);
    showToast?.('已更新文件夹名称', 'success');
  };

  // --- API Handlers ---
  const handleSaveGlobalApiConfig = () => {
    try {
      localStorage.setItem('tavern_vault_default_api_url', globalEndpoint);
      localStorage.setItem('tavern_vault_default_api_key', globalApiKey);
      localStorage.setItem('tavern_vault_default_api_model', globalModel);
      showToast?.('全局 API 配置已保存', 'success');
    } catch (e) {
      showToast?.('保存失败', 'error');
    }
  };

  const handleFetchModels = async () => {
    if (!globalEndpoint || !globalApiKey) {
      showToast?.('请先填写接口地址和密钥', 'error');
      return;
    }
    setFetchingModels(true);
    try {
      const baseUrl = globalEndpoint.replace(/\/$/, '');
      const url = baseUrl.endsWith('/v1') ? `${baseUrl}/models` : `${baseUrl}/v1/models`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${globalApiKey}`
        }
      });
      if (!response.ok) throw new Error('获取模型失败: ' + response.statusText);
      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id);
        setAvailableModels(models);
        showToast?.(`成功获取 ${models.length} 个模型`, 'success');
      } else {
        throw new Error('未知的模型列表格式');
      }
    } catch (e: any) {
      showToast?.(e.message || '获取模型失败', 'error');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTestConnection = async () => {
    if (!globalEndpoint) {
      showToast?.('请先输入 API 接口地址', 'error');
      return;
    }
    setTestingConnection(true);
    setTestResult(null);

    try {
      const cleanUrl = globalEndpoint.replace(/\/+$/, '');
      const testUrl = cleanUrl.endsWith('/models') ? cleanUrl : `${cleanUrl}/models`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (globalApiKey) {
        headers['Authorization'] = `Bearer ${globalApiKey}`;
      }

      const res = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setTestResult({ success: true, msg: `连接成功 (状态码: ${res.status})` });
        showToast?.('API 连通测试成功！', 'success');
      } else {
        setTestResult({ success: false, msg: `服务器返回状态码: ${res.status} (${res.statusText})` });
        showToast?.(`连接异常: ${res.status}`, 'error');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: err.name === 'AbortError' ? '连接超时 (6秒无响应)' : `网络请求失败: ${err.message || '跨域或无法连接'}`
      });
      showToast?.('API 连通失败', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAddNewApi = () => {
    if (!newApiName.trim() || !newApiUrl.trim()) {
      showToast?.('请填写 API 名称和接口地址', 'error');
      return;
    }

    const newEntry: ApiEntry = {
      id: 'api_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: newApiName.trim(),
      url: newApiUrl.trim(),
      keys: newApiKey ? [{ id: 'k1', key: newApiKey.trim() }] : [],
      category: '默认',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    updateAppData(prev => ({
      ...prev,
      apis: [newEntry, ...(prev.apis || [])]
    }));

    setNewApiName('');
    setNewApiUrl('');
    setNewApiKey('');
    setShowNewApiModal(false);
    showToast?.('成功添加 API 配置', 'success');
  };

  const handleDeleteApi = (id: string) => {
    updateAppData(prev => ({
      ...prev,
      apis: (prev.apis || []).filter(a => a.id !== id)
    }));
    showToast?.('已删除 API 配置', 'success');
  };

  // --- Full Backup Export & Import ---
  const handleExportFullZip = async () => {
    setIsExportingZip(true);
    setZipResult(null);
    const controller = new AbortController();
    zipAbortControllerRef.current = controller;

    setZipProgress({
      stage: 'starting',
      currentSection: '初始化',
      percent: 5,
      details: '正在准备全量结构化归档引擎...'
    });

    try {
      const result = await generateFullDataZipArchive(
        appData,
        (p) => setZipProgress(p),
        controller.signal
      );

      setZipResult(result);
      setIsExportingZip(false);
      setShowZipResultModal(true);

      // Trigger download
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', URL.createObjectURL(result.blob));
      downloadAnchor.setAttribute('download', result.fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast?.('已成功打包并导出全量结构化 ZIP 归档包！', 'success');
    } catch (err: any) {
      setIsExportingZip(false);
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        showToast?.('已取消归档导出', 'info');
      } else {
        console.error('ZIP export error:', err);
        showToast?.(`导出归档包失败: ${err?.message || String(err)}`, 'error');
      }
    } finally {
      zipAbortControllerRef.current = null;
    }
  };

  const handleCancelZipExport = () => {
    if (zipAbortControllerRef.current) {
      zipAbortControllerRef.current.abort();
      showToast?.('正在中断导出...', 'info');
    }
  };

  const handleExportFullBackup = () => {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', URL.createObjectURL(blob));
    downloadAnchor.setAttribute('download', `TavernVault_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast?.('已导出完整 JSON 数据备份', 'success');
  };

  const handleExportStandaloneHtml = async () => {
    try {
      showToast?.('正在准备单文件独立版 HTML...', 'info');
      const res = await fetch('/TavernVault_Standalone.html');
      if (!res.ok) {
        throw new Error(`HTTP 状态码: ${res.status}`);
      }
      const htmlBlob = await res.blob();
      const url = URL.createObjectURL(htmlBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TavernVault_单文件独立版_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast?.('已成功导出单文件独立版 HTML！双击该文件即可直接在本地浏览器离线使用。', 'success');
    } catch (err: any) {
      console.error('Failed to export standalone html:', err);
      // Fallback direct link
      const a = document.createElement('a');
      a.href = '/TavernVault_Standalone.html';
      a.download = 'TavernVault_单文件独立版.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast?.('已触发单文件 HTML 下载', 'info');
    }
  };

  const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          updateAppData(prev => ({
            ...prev,
            ...parsed
          }));
          showToast?.('备份数据导入成功！', 'success');
        }
      } catch (err) {
        showToast?.('备份文件解析失败，请检查格式', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Tavern Interoperability Handlers ---
  const handleSaveTavernAddress = () => {
    const cleanUrl = (tavernUrl || '').trim();
    localStorage.setItem('st_vault_tavern_url', cleanUrl);
    localStorage.setItem('st_vault_tavern_api_key', tavernApiKey.trim());
    showToast?.('酒馆服务配置已保存', 'success');
  };

  const handleTestTavernConnection = async () => {
    setIsTestingTavern(true);
    try {
      const res = await testSillyTavernConnection(tavernUrl, tavernApiKey);
      setTavernStatus(res);
      if (res.status === 'connected') {
        showToast?.(`酒馆连接成功！延迟: ${res.latencyMs}ms (${res.serverVersion})`, 'success');
      } else {
        showToast?.(res.errorMessage || '连接失败，请检查酒馆服务', 'error');
      }
    } catch (e: any) {
      setTavernStatus({ status: 'error', errorMessage: e.message || '网络异常' });
      showToast?.(`连接失败: ${e.message}`, 'error');
    } finally {
      setIsTestingTavern(false);
    }
  };

  const handlePullFromTavern = async () => {
    setIsPullingTavern(true);
    setBatchImportProgress?.({
      isActive: true,
      isMinimized: false,
      total: 10,
      current: 0,
      currentName: '正在连接酒馆服务 API...',
      currentPhase: 'parsing',
      startTime: Date.now(),
      stats: {
        added: 0,
        updatedVersion: 0,
        distinctCard: 0,
        overwritten: 0,
        skipped: 0,
        stagedDuplicates: 0,
        failed: 0
      },
      stagedCards: [],
      isCompleted: false
    });

    try {
      const result = await pullFromSillyTavern(tavernUrl, tavernApiKey, (current: number, total: number, name: string, phase?: string) => {
        setBatchImportProgress?.(prev => prev ? {
          ...prev,
          total: total || prev.total,
          current,
          currentName: name,
          currentPhase: phase === 'downloading' ? 'parsing' : phase === 'converting' ? 'extracting' : 'diffing'
        } : null);
      });

      if (result.charactersCount > 0 || result.worldBooksCount > 0) {
        if (result.newCards && result.newCards.length > 0 && promptDuplicateAction) {
          const processed = await processCardImportList(
            result.newCards,
            appData,
            promptDuplicateAction,
            { defaultGroup: '酒馆拉取', sourceTag: '酒馆', isTavernSource: true }
          );

          // Merge standalone pulled worldbooks
          const existingWbNames = new Set((processed.currentWorldBooks || []).map(w => (w.name || '').toLowerCase()));
          const newWorldBooks: STWorldBookEntry[] = (result.newWorldBooks || []).map(w => ({
            id: generateId('wb'),
            name: w.name || '未命名世界书',
            description: '从酒馆网络服务直接拉取',
            source: 'tavern-network',
            entries: w.entries || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            jsonData: w.jsonData || {}
          }));

          const mergedWbs = [...processed.currentWorldBooks];
          newWorldBooks.forEach(w => {
            if (!existingWbNames.has((w.name || '').toLowerCase())) {
              mergedWbs.push(w);
            }
          });

          // Atomically update app data and run association engine
          updateAppData(prev => {
            const synced = autoAssociateAllAssets({
              ...prev,
              cards: processed.currentCards,
              stWorldBooks: mergedWbs,
              scripts: processed.currentScripts,
              stRegexScripts: processed.currentRegexes,
              cardTags: Array.from(new Set(processed.currentTags))
            });
            return synced;
          });

          setBatchImportProgress?.(prev => prev ? {
            ...prev,
            current: prev.total,
            currentName: '酒馆拉取完成',
            currentPhase: 'complete',
            isCompleted: true,
            stats: {
              added: processed.stats.added,
              updatedVersion: processed.stats.updatedVersion,
              distinctCard: processed.stats.distinctCard,
              overwritten: processed.stats.overwritten,
              skipped: processed.stats.skipped,
              stagedDuplicates: (processed.stats as any).stagedDuplicates || 0,
              failed: 0
            }
          } : null);

          const summaryParts: string[] = [];
          if (processed.stats.added > 0) summaryParts.push(`新增 ${processed.stats.added} 张`);
          if (processed.stats.updatedVersion > 0) summaryParts.push(`升级版本 ${processed.stats.updatedVersion} 张`);
          if (processed.stats.distinctCard > 0) summaryParts.push(`同名独立卡面 ${processed.stats.distinctCard} 张`);
          if (processed.stats.overwritten > 0) summaryParts.push(`覆盖 ${processed.stats.overwritten} 张`);
          if (processed.stats.skipped > 0) summaryParts.push(`跳过 ${processed.stats.skipped} 张`);
          if (result.worldBooksCount > 0) summaryParts.push(`世界书 ${result.worldBooksCount} 本`);

          showToast?.(
            `酒馆拉取完成：${summaryParts.join('，') || '未发现变动'}`,
            'success'
          );
        } else {
          updateAppData(prev => {
            const newCards: CardEntry[] = result.newCards.map(c => ({
              id: c.id || generateId('card'),
              name: c.name || '未命名卡片',
              fileName: c.fileName || `${c.name}.png`,
              coverImage: c.coverImage || null,
              author: c.author || '',
              authorManual: false,
              customTags: ['酒馆拉取'],
              version: c.version || 'v2',
              fileType: 'png',
              source: 'tavern-network',
              group: '酒馆拉取',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              rawData: c.rawData || {},
              versions: []
            }));

            const newWorldBooks: STWorldBookEntry[] = (result.newWorldBooks || []).map(w => ({
              id: generateId('wb'),
              name: w.name || '未命名世界书',
              description: '从酒馆网络服务直接拉取',
              source: 'tavern-network',
              entries: w.entries || [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              jsonData: w.jsonData || {}
            }));

            return {
              ...prev,
              cards: [...(prev.cards || []), ...newCards],
              stWorldBooks: [...(prev.stWorldBooks || []), ...newWorldBooks]
            };
          });

          setBatchImportProgress?.(prev => prev ? {
            ...prev,
            current: prev.total,
            currentName: '酒馆拉取完成',
            currentPhase: 'complete',
            isCompleted: true,
            stats: {
              added: result.charactersCount,
              updatedVersion: 0,
              distinctCard: 0,
              overwritten: 0,
              skipped: 0,
              stagedDuplicates: 0,
              failed: 0
            }
          } : null);

          showToast?.(`成功拉取 ${result.charactersCount} 张角色卡与 ${result.worldBooksCount} 本世界书！`, 'success');
        }
      } else {
        setBatchImportProgress?.(null);
        if (result.errors.length > 0) {
          showToast?.(`拉取遇到问题: ${result.errors[0]}`, 'error');
        } else {
          showToast?.('酒馆未返回可拉取的角色或世界书数据', 'info');
        }
      }
    } catch (e: any) {
      setBatchImportProgress?.(null);
      showToast?.(`拉取失败: ${e.message}`, 'error');
    } finally {
      setIsPullingTavern(false);
    }
  };

  // --- Archive Points Handlers ---
  const handleCreateArchivePoint = async () => {
    if (canUseFSA) {
      try {
        // @ts-ignore
        const handle = await window.showDirectoryPicker({ mode: 'read' });
        if (handle) {
          const pointName = newArchivePointName.trim() || handle.name || '酒馆存档点';
          const newPoint = {
            id: generateId('arch'),
            name: pointName,
            path: handle.name,
            folderName: handle.name,
            lastSyncTime: Date.now(),
            itemCount: 0,
            handle
          };
          const updated = [newPoint, ...archivePoints];
          setArchivePoints(updated);
          localStorage.setItem('st_vault_archive_points', JSON.stringify(updated.map(p => ({ ...p, handle: undefined }))));
          setShowNewArchiveModal(false);
          setNewArchivePointName('');
          showToast?.(`已创建存档点「${pointName}」，正在直接拉取并同步卡片数据...`, 'info');

          // Directly sync from directory handle!
          await runSyncFromHandle(handle, newPoint.id);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    archiveFolderInputRef.current?.click();
  };

  const handleArchiveFolderFallbackSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const abortCtrl = createImportAbortController();

    const folderName = (files[0].webkitRelativePath && files[0].webkitRelativePath.includes('/'))
      ? files[0].webkitRelativePath.split('/')[0]
      : (files[0].name ? '已选酒馆文件' : '本地酒馆目录');

    let targetPointId = syncingArchivePointId;
    let pointName = '';
    let updated = [...archivePoints];

    if (targetPointId) {
      const existing = updated.find(p => p.id === targetPointId);
      pointName = existing?.name || folderName;
    } else {
      pointName = newArchivePointName.trim() || folderName;
      targetPointId = generateId('arch');
      const newPoint = {
        id: targetPointId,
        name: pointName,
        path: folderName,
        folderName: folderName,
        lastSyncTime: Date.now(),
        itemCount: files.length
      };
      updated = [newPoint, ...archivePoints];
      setArchivePoints(updated);
      localStorage.setItem('st_vault_archive_points', JSON.stringify(updated));
      setShowNewArchiveModal(false);
      setNewArchivePointName('');
    }

    setSyncingArchivePointId(null);
    showToast?.(`正在拉取并同步存档点「${pointName}」...`, 'info');

    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);
    setCurrentFile('正在解析存档点文件结构...');

    const fileItems = fileListToFileItems(files);
    setBatchImportProgress?.({
      isActive: true,
      isMinimized: false,
      total: fileItems.length,
      current: 0,
      currentName: `正在读取存档点 [${pointName}]...`,
      currentPhase: 'parsing',
      startTime: Date.now(),
      stats: {
        added: 0,
        updatedVersion: 0,
        distinctCard: 0,
        overwritten: 0,
        skipped: 0,
        stagedDuplicates: 0,
        failed: 0
      },
      stagedCards: [],
      isCompleted: false,
      onCancelImport: () => {
        abortActiveImport();
      }
    });

    try {
      const { updatedAppData, stats, stagedDuplicates } = await executeSmartSync(
        fileItems,
        appData,
        (prog, file, currentStats) => {
          if (isImportAborted()) return;
          setScanProgress(prog);
          setCurrentFile(file);
          setSyncStats({ ...currentStats });
          setBatchImportProgress?.(prev => prev ? {
            ...prev,
            current: Math.round((prog / 100) * fileItems.length),
            currentName: file,
            currentPhase: prog < 30 ? 'parsing' : prog < 80 ? 'diffing' : 'extracting',
            stats: {
              added: currentStats.newAdded,
              updatedVersion: currentStats.updatedVersions,
              distinctCard: (currentStats as any).distinctCard || 0,
              overwritten: (currentStats as any).overwritten || 0,
              skipped: currentStats.skippedDuplicates,
              stagedDuplicates: (currentStats as any).stagedDuplicates || 0,
              failed: 0
            }
          } : null);
        },
        {
          folderId: targetPointId,
          folderName: pointName,
          isTavernSource: true,
          onDuplicatePrompt: promptDuplicateAction,
          abortSignal: abortCtrl.signal,
          checkAborted: isImportAborted
        }
      );

      if (isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }

      const scanRecord = {
        path: `存档点: ${pointName}`,
        time: Date.now(),
        sourceType: 'tavern' as const,
        folderId: targetPointId,
        isAnchor: getFolderImportCount(targetPointId) === 1,
        stats: {
          cards: stats.cards,
          worlds: stats.worlds,
          regex: stats.regex,
          chats: stats.chats,
          presets: stats.presets,
          themes: stats.themes,
          newAdded: stats.newAdded,
          updatedVersions: stats.updatedVersions,
          skippedDuplicates: stats.skippedDuplicates
        }
      };

      const updatedArch = updated.map(p => p.id === targetPointId ? { ...p, lastSyncTime: Date.now(), itemCount: stats.cards } : p);
      setArchivePoints(updatedArch);
      localStorage.setItem('st_vault_archive_points', JSON.stringify(updatedArch));

      updateAppData({
        ...updatedAppData,
        scannedDirectories: [scanRecord, ...(appData.scannedDirectories || [])]
      });

      setSyncStats(stats);
      setScanProgress(100);
      setScanComplete(true);
      setBatchImportProgress?.(prev => prev ? {
        ...prev,
        current: fileItems.length,
        currentName: stagedDuplicates && stagedDuplicates.length > 0 ? '存档点同步完成，已将重复待决卡片放入暂存处' : '存档点同步完成',
        currentPhase: 'complete',
        isCompleted: true,
        stagedCards: stagedDuplicates || [],
        stats: {
          added: stats.newAdded,
          updatedVersion: stats.updatedVersions,
          distinctCard: (stats as any).distinctCard || 0,
          overwritten: (stats as any).overwritten || 0,
          skipped: stats.skippedDuplicates,
          stagedDuplicates: stats.stagedDuplicates || (stagedDuplicates ? stagedDuplicates.length : 0),
          failed: 0
        }
      } : null);
      if (stagedDuplicates && stagedDuplicates.length > 0) {
        showToast?.(`存档点「${pointName}」同步完成，其中 ${stagedDuplicates.length} 张冲突卡片已放入暂存处`, 'info');
        setTimeout(() => {
          onOpenStagingVault?.();
        }, 300);
      } else {
        showToast?.(`存档点「${pointName}」同步完成！`, 'success');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('终止') || isImportAborted()) {
        showToast?.('已终止导入，已停止后续文件读取与入库', 'info');
        setBatchImportProgress?.(null);
        return;
      }
      showToast?.(`同步失败: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
      setCurrentFile('');
      if (archiveFolderInputRef.current) {
        archiveFolderInputRef.current.value = '';
      }
      if (archiveMultiFileInputRef.current) {
        archiveMultiFileInputRef.current.value = '';
      }
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSyncArchivePoint = async (point: { id: string; name: string; path: string; handle?: any }) => {
    if (canUseFSA) {
      if (point.handle) {
        try {
          // @ts-ignore
          let perm = await point.handle.queryPermission({ mode: 'read' });
          if (perm !== 'granted') {
            // @ts-ignore
            perm = await point.handle.requestPermission({ mode: 'read' });
          }
          if (perm === 'granted') {
            await runSyncFromHandle(point.handle, point.id);
            return;
          }
        } catch (e) {
          console.warn('Handle permission check error:', e);
        }
      }

      // If handle missing or permission denied, prompt picker
      try {
        // @ts-ignore
        const handle = await window.showDirectoryPicker({ mode: 'read' });
        if (handle) {
          point.handle = handle;
          const updated = archivePoints.map(p => p.id === point.id ? { ...p, handle, path: handle.name, folderName: handle.name } : p);
          setArchivePoints(updated);
          localStorage.setItem('st_vault_archive_points', JSON.stringify(updated.map(p => ({ ...p, handle: undefined }))));
          await runSyncFromHandle(handle, point.id);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback file picker
    setSyncingArchivePointId(point.id);
    archiveFolderInputRef.current?.click();
  };

  const handleDeleteArchivePoint = (id: string) => {
    const updated = archivePoints.filter(p => p.id !== id);
    setArchivePoints(updated);
    localStorage.setItem('st_vault_archive_points', JSON.stringify(updated.map(p => ({ ...p, handle: undefined }))));
    showToast?.('已删除该存档点配置', 'info');
  };

  // --- Data Backup Handlers ---
  const handleSelectLiveBackupDir = async () => {
    if (isMobileDevice) {
      setShowMobileBackupModal(true);
      return;
    }
    if (canUseFSA) {
      try {
        // @ts-ignore
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        if (handle) {
          await saveBackupDirectoryHandle(handle);
          setHasBackupHandle(true);
          setIsLiveBackupEnabled(true);
          setLiveBackupPath(handle.name);
          localStorage.setItem('st_vault_live_backup_enabled', 'true');
          localStorage.setItem('st_vault_live_backup_path', handle.name);

          showToast?.(`已成功固定备份目录: ${handle.name}（尚未执行写入，需备份时点击下方按钮）`, 'success');
          return;
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.warn('FSA directory picker failed/fallback:', e);
      }
    }
    // Fallback directory picker or modal
    setShowMobileBackupModal(true);
  };

  const handleFallbackBackupFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    let folderName = '';
    if (files && files.length > 0) {
      const firstFile = files[0];
      if (firstFile.webkitRelativePath) {
        folderName = firstFile.webkitRelativePath.split('/')[0] || '';
      }
    }
    // If the folder was empty, files is empty; give a sensible default or prompt
    if (!folderName) {
      folderName = '本地备份目录 (已固定)';
    }
    setLiveBackupPath(folderName);
    setIsLiveBackupEnabled(true);
    localStorage.setItem('st_vault_live_backup_enabled', 'true');
    localStorage.setItem('st_vault_live_backup_path', folderName);
    showToast?.(`已成功固定备份目录: ${folderName}`, 'success');

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSaveManualBackupPath = () => {
    const trimmed = editBackupPathInput.trim();
    if (!trimmed) {
      showToast?.('目录路径不能为空', 'error');
      return;
    }
    setLiveBackupPath(trimmed);
    setIsLiveBackupEnabled(true);
    localStorage.setItem('st_vault_live_backup_enabled', 'true');
    localStorage.setItem('st_vault_live_backup_path', trimmed);
    setIsEditingBackupPath(false);
    showToast?.(`已成功更新并固定备份目录: ${trimmed}`, 'success');
  };

  const handleExecuteBackupNow = async () => {
    if (hasBackupHandle) {
      setIsBackingUp(true);
      try {
        const handle = await getBackupDirectoryHandle();
        if (handle) {
          const handleAny = handle as any;
          let perm = typeof handleAny.queryPermission === 'function' ? await handleAny.queryPermission({ mode: 'readwrite' }) : 'granted';
          if (perm !== 'granted' && typeof handleAny.requestPermission === 'function') {
            perm = await handleAny.requestPermission({ mode: 'readwrite' });
          }
          if (perm === 'granted') {
            const res = await writeBackupToDirectoryHandle(handle, appData);
            if (res.success) {
              const now = Date.now().toString();
              setLastBackupTime(now);
              localStorage.setItem('st_vault_live_backup_last_time', now);
              showToast?.(`已成功同步最新备份文件至固定目录: ${handle.name}`, 'success');
              return;
            }
          }
        }
      } catch (e: any) {
        console.error('Direct backup error:', e);
      } finally {
        setIsBackingUp(false);
      }
    }
    // If no handle or permission restricted, export JSON download
    handleExportFullBackup();
  };

  const handleClearBackupDir = async () => {
    await clearBackupDirectoryHandle();
    setHasBackupHandle(false);
    setLiveBackupPath('');
    setIsLiveBackupEnabled(false);
    localStorage.removeItem('st_vault_live_backup_enabled');
    localStorage.removeItem('st_vault_live_backup_path');
    localStorage.removeItem('st_vault_live_backup_last_time');
    showToast?.('已解除固定的备份目录', 'info');
  };

  const handleToggleLiveBackup = () => {
    const next = !isLiveBackupEnabled;
    setIsLiveBackupEnabled(next);
    localStorage.setItem('st_vault_live_backup_enabled', next ? 'true' : 'false');
    showToast?.(next ? '已开启实时备份模式' : '已关闭实时备份模式', 'info');
  };

  const handleRepairLiveBackup = () => {
    let repaired = 0;
    const issues: string[] = [];

    // Check cards
    const cleanCards = (appData.cards || []).map(c => {
      let isChanged = false;
      const card = { ...c };
      if (!card.id) {
        card.id = generateId('card');
        isChanged = true;
        repaired++;
      }
      if (!card.name) {
        card.name = '未命名角色';
        isChanged = true;
        repaired++;
      }
      if (!Array.isArray(card.customTags)) {
        card.customTags = [];
        isChanged = true;
        repaired++;
      }
      if (!Array.isArray(card.versions)) {
        card.versions = [];
        isChanged = true;
        repaired++;
      }
      return isChanged ? card : c;
    });

    // Check worldbooks
    const cleanWbs = (appData.stWorldBooks || []).map(w => {
      let isChanged = false;
      const wb = { ...w };
      if (!wb.id) {
        wb.id = generateId('wb');
        isChanged = true;
        repaired++;
      }
      if (!Array.isArray(wb.entries)) {
        wb.entries = [];
        isChanged = true;
        repaired++;
      }
      return isChanged ? wb : w;
    });

    const totalRecords =
      cleanCards.length +
      cleanWbs.length +
      (appData.stRegexScripts?.length || 0) +
      (appData.chatLogs?.length || 0) +
      (appData.presets?.length || 0) +
      (appData.themes?.length || 0);

    if (repaired > 0) {
      updateAppData(prev => ({
        ...prev,
        cards: cleanCards,
        stWorldBooks: cleanWbs
      }));
      issues.push(`已自动修复 ${repaired} 处缺少主键或结构不全的条目`);
    }

    setBackupHealthReport({
      checked: true,
      score: repaired === 0 ? 100 : 98,
      totalRecords,
      issues,
      repairedCount: repaired
    });

    showToast?.(`数据完整性自检完成！共核查 ${totalRecords} 条记录，健康评分: ${repaired === 0 ? 100 : 98}/100`, 'success');
  };

  const isPinned = !!appData.pinnedDirectory?.path || hasPinnedHandle;
  const currentDisplayPath =
    appData.pinnedDirectory?.path || appData.pinnedDirectory?.folderName || appData.lastScannedFolder || '';

  const tabs = [
    { id: 'scan' as SettingsTab, label: '数据与文件', icon: FolderSearch },
    { id: 'theme' as SettingsTab, label: '主题样式选择', icon: Palette },
    { id: 'api' as SettingsTab, label: 'API与AI精修', icon: Key },
    { id: 'storage' as SettingsTab, label: '数据与存储', icon: HardDrive },
    { id: 'cloud_sync' as SettingsTab, label: '网盘同步与回滚', icon: Cloud },
    { id: 'about' as SettingsTab, label: '关于软件', icon: Info },
  ];

  return (
    <div className="w-full min-h-full">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFallbackFolderSelect}
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
      />
      <input
        type="file"
        ref={multiFileInputRef}
        onChange={handleFallbackFolderSelect}
        className="hidden"
        multiple
        accept=".png,.webp,.json,.zip,image/png,image/webp,application/json"
      />
      <input
        type="file"
        ref={backupFileInputRef}
        onChange={handleImportFullBackup}
        accept=".json"
        className="hidden"
      />
      <input
        type="file"
        ref={archiveFolderInputRef}
        onChange={handleArchiveFolderFallbackSelect}
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
      />
      <input
        type="file"
        ref={archiveMultiFileInputRef}
        onChange={handleArchiveFolderFallbackSelect}
        className="hidden"
        multiple
        accept=".png,.webp,.json,.zip,image/png,image/webp,application/json"
      />
      <input
        type="file"
        ref={restoreBackupInputRef}
        onChange={handleImportFullBackup}
        accept=".json"
        className="hidden"
      />
      <input
        type="file"
        ref={extraFolderInputRef}
        onChange={handleFallbackExtraFolderSelect}
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
      />
      <input
        type="file"
        ref={backupFolderInputRef}
        onChange={handleFallbackBackupFolderSelect}
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
      />

      {/* Horizontal Sliding Tab Bar (横向滑动标签栏 - 紧贴顶栏 sticky top-0, 依酒馆主题色系温润呈现, 未点击底栏/激活加深背景与底栏/当前激活指示器) */}
      <div
        data-design-id="settings-tab-bar"
        style={{ fontFamily: 'var(--font-navbar)' }}
        className="sticky top-0 z-20 bg-[var(--header-bg,var(--bg-paper,#fbfaf8))] dark:bg-zinc-900/95 backdrop-blur-md px-3 sm:px-6 border-b border-[var(--line-soft,rgba(0,0,0,0.06))] dark:border-zinc-800/80"
      >
        <div
          style={{ fontFamily: 'var(--font-navbar)' }}
          className="max-w-4xl mx-auto flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto scrollbar-none py-0"
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <BaseButton
                key={tab.id}
                designId={`settings-tab-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-active={isActive ? "true" : undefined}
                style={{
                  fontFamily: 'var(--font-navbar)',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: isActive ? '3px solid var(--accent, #486175)' : '2px solid var(--line, rgba(96, 126, 149, 0.2))',
                  backgroundColor: isActive ? 'var(--btn-primary-hover, rgba(96, 126, 149, 0.28))' : 'transparent',
                }}
                className={`relative flex items-center gap-2 px-4 sm:px-5 !min-h-[38px] !h-[38px] py-0 text-[12px] sm:text-[14px] whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer select-none rounded-t-lg outline-none focus:outline-none ${
                  isActive
                    ? 'active is-selected text-[var(--accent,#486175)] font-bold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 font-medium hover:text-[var(--accent,#486175)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] hover:border-b-[var(--line-focus,rgba(96,126,149,0.45))] active:bg-[var(--btn-primary-hover,rgba(96,126,149,0.28))] active:border-b-[var(--accent,#486175)]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors duration-200 ${
                    isActive
                      ? 'text-[var(--accent,#486175)]'
                      : 'text-zinc-400 dark:text-zinc-500 group-hover:text-[var(--accent,#486175)]'
                  }`}
                />
                <span className="tracking-tight">{tab.label}</span>
              </BaseButton>
            );
          })}
        </div>
      </div>

      {/* Settings Tab Content Body */}
      <div data-design-id="settings-content-body" className="max-w-4xl mx-auto px-4 md:px-6 pt-3 pb-6 space-y-5">
        {/* ==================== TAB 1: 文件数据扫描 ==================== */}
      {activeTab === 'scan' && (
        <div data-design-id="settings-tab-scan-content" className="space-y-5 animate-in fade-in duration-200">
          {/* Unified Extra Scan Folders Management Card */}
          <BaseCard designId="settings-extra-scan-folders-card" className="p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--accent,#D97706)]"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FolderSearch className="w-4 h-4 text-[var(--accent,#D97706)]" />
                  附加角色卡扫描目录 ({appData.extraScanFolders?.length || 0})
                </h2>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  支持关联多个本地角色卡存放文件夹，随时独立读取或增量同步入库；亦可直接选取卡片文件快速导入。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <BaseButton
                  type="button"
                  onClick={() => multiFileInputRef.current?.click()}
                  disabled={isScanning}
                  title="自由选取多个卡片图片、JSON文件进行快速导入"
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-[var(--accent-hover,#B45309)] border border-[var(--accent,#D97706)]/30 text-[10px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-[var(--accent,#D97706)]" />
                  <span>多选文件导入</span>
                </BaseButton>

                <BaseButton
                  type="button"
                  onClick={handleAddNewExtraFolder}
                  disabled={isScanning}
                  className="px-2.5 py-1 bg-[var(--btn-primary-bg,var(--accent,#D97706))] hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] text-white text-[10px] font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加附加文件夹</span>
                </BaseButton>
              </div>
            </div>

            {/* Folder list */}
            {appData.extraScanFolders && appData.extraScanFolders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 my-3">
                {appData.extraScanFolders.map(folder => {
                  const isSyncing = syncingExtraFolderId === folder.id;
                  const isEditing = editingExtraFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <Folder className="w-4 h-4 text-[var(--accent,#D97706)] flex-shrink-0 mt-0.5" />
                          <div className="flex flex-col min-w-0 flex-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1 w-full">
                                <BaseInput
                                  type="text"
                                  value={editingExtraFolderNameInput}
                                  onChange={(e: any) => setEditingExtraFolderNameInput(e.target.value)}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-[var(--accent,#D97706)] bg-white dark:bg-zinc-900 text-[var(--text-serif,#1a232d)] w-full"
                                  autoFocus
                                  onKeyDown={(e: any) => {
                                    if (e.key === 'Enter') handleSaveExtraFolderName(folder.id);
                                    if (e.key === 'Escape') setEditingExtraFolderId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveExtraFolderName(folder.id)}
                                  className="h-6 w-6 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded cursor-pointer shrink-0 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingExtraFolderId(folder.id);
                                  setEditingExtraFolderNameInput(folder.name);
                                }}
                                className="font-bold text-[10px] text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:text-[var(--accent,#D97706)] group flex items-center gap-1"
                                title="点击修改别名"
                              >
                                <span className="truncate">{folder.name}</span>
                                <Edit3 className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                            )}
                            <div className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                              {folder.path} {folder.totalCardsFound ? `· ${folder.totalCardsFound} 项` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSyncExtraFolder(folder)}
                            disabled={isScanning || isSyncing}
                            title="立即增量同步该文件夹"
                            className="h-6 px-2.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 text-[10px] font-medium rounded flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
                          >
                            {isSyncing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span>同步</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExtraFolder(folder.id)}
                            title="解除此附加文件夹"
                            className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer shrink-0 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 my-3 bg-zinc-50/70 dark:bg-zinc-800/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-[10px] text-zinc-400 space-y-1">
                <p>暂未添加附加角色卡扫描目录。</p>
                <p className="text-[10px] text-zinc-400">点击右上角「添加附加文件夹」关联目录，或点击「多选文件导入」选取单个或多个卡片文件。</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-3 px-1 text-[9.5px] leading-normal text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60 pt-2.5">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-[var(--accent,#D97706)] flex-shrink-0" />
                支持持续追踪同名更新。完全重复文件自动跳过，新内容生成新版本存档。导入数量大于 1 时统一使用批量导入进度弹窗与悬浮球。
              </span>
            </div>

            {isMobileDevice && (
              <div className="mt-2.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9.5px] leading-normal text-[var(--accent-hover,#B45309)] flex items-start gap-2">
                <Smartphone className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--accent,#D97706)]" />
                <div>
                  <span className="font-bold">📱 手机端提示：</span>
                  安卓/iOS 系统文件管理器在选择空文件夹时会提示“无任何文件”且无法点击确定。如需导入角色卡，请直接点击上方
                  <span className="font-bold underline ml-1 cursor-pointer" onClick={() => multiFileInputRef.current?.click()}>「多选文件导入」</span>
                  选取 PNG 图片或 JSON 文件。
                </div>
              </div>
            )}
          </BaseCard>

          {/* Local Tavern Panel: Fully Interactive & Functional */}
          <BaseCard designId="settings-tavern-api-panel" className="space-y-4 relative overflow-hidden mt-5">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--accent,#D97706)]"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-[var(--accent,#D97706)]" />
                  酒馆文件互通
                </h2>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  网络链接与文件夹存档彼此独立，可按酒馆环境任选或同时使用；角色卡同步不会改动酒馆的其他资料。
                </p>
              </div>

              {tavernStatus.status === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex-shrink-0 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  服务在线 ({tavernStatus.latencyMs}ms)
                </span>
              ) : tavernStatus.status === 'error' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex-shrink-0 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  未连接
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex-shrink-0 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                  就绪待测
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 01: 链接互通 */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-50/80 dark:bg-zinc-800/40 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[var(--accent,#D97706)]" />
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">链接互通</div>
                        <div className="text-[10px] text-zinc-500">连接正在运行的 SillyTavern 服务 API</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                      <span>酒馆服务地址 <span className="font-normal text-zinc-400 italic">本机或局域网</span></span>
                      <div className="flex items-center gap-1 font-normal self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setTavernUrl('http://127.0.0.1:8000')}
                          className="text-[10px] px-1 py-0 h-4 min-h-0 text-[var(--accent,#D97706)] hover:underline cursor-pointer leading-none inline-flex items-center bg-transparent border-0"
                        >
                          默认(8000)
                        </button>
                        <span className="text-zinc-400 leading-none">·</span>
                        <button
                          type="button"
                          onClick={() => setTavernUrl('http://localhost:8000')}
                          className="text-[10px] px-1 py-0 h-4 min-h-0 text-[var(--accent,#D97706)] hover:underline cursor-pointer leading-none inline-flex items-center bg-transparent border-0"
                        >
                          localhost
                        </button>
                      </div>
                    </div>
                    <BaseInput
                      type="text"
                      value={tavernUrl}
                      onChange={(e: any) => setTavernUrl(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-[10px] font-mono outline-none focus:border-[var(--accent,#D97706)] focus:ring-1 focus:ring-[var(--accent,#D97706)]"
                      placeholder="http://127.0.0.1:8000"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>API 访问令牌/密钥 (可选)</span>
                      <BaseButton
                        type="button"
                        onClick={() => setShowTavernApiKey(!showTavernApiKey)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showTavernApiKey ? '隐藏' : '显示'}
                      </BaseButton>
                    </div>
                    <BaseInput
                      type={showTavernApiKey ? 'text' : 'password'}
                      value={tavernApiKey}
                      onChange={(e: any) => setTavernApiKey(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-[10px] font-mono outline-none focus:border-[var(--accent,#D97706)]"
                      placeholder="若酒馆开启鉴权请输入，未开启可留空..."
                    />
                  </div>

                  <div className="bg-[var(--accent)]/10 text-[var(--accent-hover,#B45309)] p-2.5 rounded-lg text-[10px] flex flex-col gap-1 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>自动保持会话与双向流动</span>
                    </div>
                    <span>测试通过后，可一键拉取酒馆角色列表/世界书，或将卡库中的角色卡直接推送到酒馆。</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <BaseButton
                      type="button"
                      onClick={handleSaveTavernAddress}
                      className="px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      保存配置
                    </BaseButton>
                    <BaseButton
                      type="button"
                      onClick={handleTestTavernConnection}
                      disabled={isTestingTavern}
                      className="px-2.5 py-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {isTestingTavern && <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />}
                      <span>{isTestingTavern ? '测试中...' : '测试连接'}</span>
                    </BaseButton>
                    <BaseButton
                      type="button"
                      onClick={handlePullFromTavern}
                      disabled={isPullingTavern}
                      className="px-2.5 py-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {isPullingTavern && <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />}
                      <span>{isPullingTavern ? '拉取中...' : '↓ 从酒馆拉取'}</span>
                    </BaseButton>
                    <BaseButton
                      type="button"
                      onClick={() => setIsPushModalOpen(true)}
                      className="px-2.5 py-1 border border-[var(--accent,#D97706)] text-[var(--accent-hover,#B45309)] hover:bg-[var(--accent,#D97706)]/10 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>↑ 选择推送</span>
                    </BaseButton>
                  </div>

                  <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                    {tavernStatus.status === 'connected' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        已连接: {tavernStatus.serverVersion} (延迟 {tavernStatus.latencyMs}ms)
                      </span>
                    ) : tavernStatus.status === 'error' ? (
                      <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 truncate" title={tavernStatus.errorMessage}>
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {tavernStatus.errorMessage}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                        尚未测试连接
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 02: 文件夹存档 */}
              <div id="folder-archive-section" className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-50/80 dark:bg-zinc-800/40 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <FolderArchive className="w-4 h-4 text-[var(--accent,#D97706)]" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">文件夹存档</span>
                      </div>
                      <BaseButton
                        type="button"
                        onClick={() => setShowNewArchiveModal(true)}
                        className="px-2.5 py-1 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/40 text-[var(--accent-hover)] rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>新建存档点</span>
                      </BaseButton>
                    </div>
                    <div className="text-[10px] text-zinc-500 pl-5.5">管理多个酒馆目录授权与同步入口</div>
                  </div>

                  <div className="bg-[var(--accent)]/10 text-[var(--accent-hover)] p-2.5 rounded-lg text-[10px] flex flex-col gap-1 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>多目录独立管理</span>
                    </div>
                    <span>角色卡支持双向对比；世界书、预设与聊天记录可保存在独立目录中。</span>
                  </div>

                  {/* Archive points list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {archivePoints.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-400 text-[10px] flex flex-col items-center justify-center gap-1.5">
                        <FolderInput className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                        <span>还没有目录配置档案，点击上方「新建存档点」添加</span>
                      </div>
                    ) : (
                      archivePoints.map(point => (
                        <div
                          key={point.id}
                          className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl flex flex-col gap-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <Folder className="w-4 h-4 text-[var(--accent,#D97706)] flex-shrink-0 mt-0.5" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-bold text-[10px] text-zinc-900 dark:text-zinc-100 truncate">{point.name}</span>
                                <div className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                                  {point.path} {point.itemCount ? `· ${point.itemCount} 项` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSyncArchivePoint(point)}
                                className="h-6 px-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>同步</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteArchivePoint(point.id)}
                                className="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer shrink-0 transition-colors"
                                title="删除存档点"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-700/60 leading-relaxed">
                  提示：支持直接读取 SillyTavern 的 public/data 文件夹。
                </div>
              </div>
            </div>
          </BaseCard>

          {/* Data & Safety Panel: Fully Functional */}
          <BaseCard designId="settings-data-safety-panel" className="p-5 sm:p-6 space-y-4 relative overflow-hidden mt-5">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--accent,#D97706)]"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent,#D97706)]" />
                  数据备份与安全保护
                </h2>
                <p className="text-[9.5px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  选择本地备份目录后将永久固定，直到下次再次更换。数据与元数据将自动同步至该目录。移入回收站会保留备份；彻底删除时同步清理。
                </p>
              </div>

              {liveBackupPath ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex-shrink-0 self-start sm:self-auto">
                  <Pin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>已固定备份目录</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 flex-shrink-0 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  未选择固定目录
                </span>
              )}
            </div>

            {liveBackupPath ? (
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-[10px]">
                {isEditingBackupPath ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={editBackupPathInput}
                      onChange={e => setEditBackupPathInput(e.target.value)}
                      placeholder="输入本地备份文件夹名称或路径 (如: 我的酒馆备份)"
                      className="flex-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-[10px] text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-[var(--accent,#D97706)]"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveManualBackupPath();
                        if (e.key === 'Escape') setIsEditingBackupPath(false);
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <BaseButton
                        designId="settings-save-manual-backup-path-btn"
                        type="button"
                        onClick={handleSaveManualBackupPath}
                        className="px-2.5 py-1.5 bg-[var(--accent,#D97706)] text-white text-[10px] font-bold rounded-lg cursor-pointer hover:opacity-90"
                      >
                        保存
                      </BaseButton>
                      <BaseButton
                        designId="settings-cancel-manual-backup-path-btn"
                        type="button"
                        onClick={() => setIsEditingBackupPath(false)}
                        className="px-2.5 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        取消
                      </BaseButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[var(--accent,#D97706)] shrink-0" />
                      <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 flex-wrap">
                        固定备份目录: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded">{liveBackupPath}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditBackupPathInput(liveBackupPath);
                            setIsEditingBackupPath(true);
                          }}
                          title="修改目录名称"
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> 持久锁定 · 下次自动沿用
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/40 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <span>
                    上次备份时间: {lastBackupTime ? new Date(Number(lastBackupTime)).toLocaleString() : '尚未执行写入'}
                  </span>
                  {backupHealthReport && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      健康评分: {backupHealthReport.score}/100 ({backupHealthReport.totalRecords} 条记录)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-[10px] text-zinc-600 dark:text-zinc-300 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    尚未指定固定备份目录。点击下方按钮选择文件夹后，该目录将被持久固定，直到您下次主动更换。
                  </div>
                </div>

                {isEditingBackupPath ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={editBackupPathInput}
                      onChange={e => setEditBackupPathInput(e.target.value)}
                      placeholder="直接输入备份目录名称 (如: 我的酒馆备份)"
                      className="flex-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-[10px] text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-[var(--accent,#D97706)]"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveManualBackupPath();
                        if (e.key === 'Escape') setIsEditingBackupPath(false);
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <BaseButton
                        designId="settings-save-manual-backup-path-btn-2"
                        type="button"
                        onClick={handleSaveManualBackupPath}
                        className="px-2.5 py-1.5 bg-[var(--accent,#D97706)] text-white text-[10px] font-bold rounded-lg cursor-pointer hover:opacity-90"
                      >
                        确认固定
                      </BaseButton>
                      <BaseButton
                        designId="settings-cancel-manual-backup-path-btn-2"
                        type="button"
                        onClick={() => setIsEditingBackupPath(false)}
                        className="px-2.5 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        取消
                      </BaseButton>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditBackupPathInput('我的酒馆备份');
                        setIsEditingBackupPath(true);
                      }}
                      className="text-[10px] text-[var(--accent,#D97706)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Edit3 className="w-3 h-3" /> 或者直接手动命名/输入备份目录
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {liveBackupPath ? (
                <>
                  <BaseButton
                    designId="settings-backup-now-btn"
                    type="button"
                    onClick={handleExecuteBackupNow}
                    disabled={isBackingUp}
                    className="px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {isBackingUp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{isBackingUp ? '正在备份...' : '立即同步备份到固定目录'}</span>
                  </BaseButton>

                  <BaseButton
                    designId="settings-reselect-live-backup-btn"
                    type="button"
                    onClick={handleSelectLiveBackupDir}
                    className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    <span>更换固定目录</span>
                  </BaseButton>

                  <BaseButton
                    designId="settings-unpin-backup-btn"
                    type="button"
                    onClick={handleClearBackupDir}
                    className="px-3 py-2 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <PinOff className="w-3.5 h-3.5" />
                    <span>解除固定</span>
                  </BaseButton>
                </>
              ) : (
                <BaseButton
                  designId="settings-select-live-backup-btn"
                  type="button"
                  onClick={handleSelectLiveBackupDir}
                  className="px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>选择并固定备份目录</span>
                </BaseButton>
              )}

              <BaseButton
                designId="settings-export-standalone-html-btn"
                type="button"
                onClick={handleExportStandaloneHtml}
                className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>导出独立 HTML 文件</span>
              </BaseButton>

              <BaseButton
                designId="settings-export-full-backup-btn"
                type="button"
                onClick={handleExportFullBackup}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出独立 JSON 备份</span>
              </BaseButton>

              <BaseButton
                designId="settings-restore-backup-btn"
                type="button"
                onClick={() => restoreBackupInputRef.current?.click()}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>从备份文件恢复</span>
              </BaseButton>

              <BaseButton
                designId="settings-repair-live-backup-btn"
                type="button"
                onClick={handleRepairLiveBackup}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>数据完整性自检</span>
              </BaseButton>
            </div>
          </BaseCard>

          {/* History Record & Version Section at the Bottom */}
          <BaseCard designId="settings-tab1-history-panel" className="p-5 sm:p-6 space-y-4 relative overflow-hidden mt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[var(--accent,#D97706)] flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    数据互通与历史版本记录
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-[var(--accent-hover,#B45309)] border border-amber-200 dark:border-amber-800/40">
                      {appData.scannedDirectories?.length || 0} 次同步归档
                    </span>
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    展示所有本地文件夹存档点、酒馆目录拉取与增量同步的历史版本审计轨迹
                  </p>
                </div>
              </div>

              {appData.scannedDirectories && appData.scannedDirectories.length > 0 && (
                <div className="flex items-center gap-2">
                  <BaseButton
                    type="button"
                    onClick={handleClearAllHistory}
                    className="px-2.5 py-1.5 text-[10px] text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="清空历史版本同步记录"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清空记录</span>
                  </BaseButton>
                </div>
              )}
            </div>

            {/* Version & History List */}
            {appData.scannedDirectories && appData.scannedDirectories.length > 0 ? (
              (() => {
                const historyList = appData.scannedDirectories || [];
                const isCompressed = historyList.length > 3;
                const displayedList = isHistoryExpanded || !isCompressed ? historyList : historyList.slice(0, 3);

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2.5">
                      {displayedList.map((record, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 text-[10px] transition-all hover:border-[var(--accent)]/40 space-y-2"
                        >
                          <div className="flex items-start sm:items-center justify-between gap-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono truncate text-[10px]" title={record.path}>
                                  {record.path}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap ml-5 sm:ml-0">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${record.sourceType === 'tavern' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'}`}>
                                  {record.sourceType === 'tavern' ? '酒馆文件夹' : '本地文件夹'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded font-mono">
                                  记录 #{historyList.length - index}
                                </span>
                                {record.isAnchor && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded font-mono flex items-center" title="作为数据互通固定锚点，首条记录不可删除">
                                    <Pin className="w-2.5 h-2.5 mr-0.5" />
                                    固定锚点
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 flex-shrink-0 text-right">
                              <span className="text-[10px] text-zinc-400 font-mono whitespace-nowrap mt-1 sm:mt-0">
                                {new Date(record.time).toLocaleString([], {
                                  year: 'numeric',
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </span>
                              {!record.isAnchor && (
                                <BaseButton
                                  type="button"
                                  onClick={() => handleDeleteHistoryRecord(index)}
                                  title="删除此条历史记录"
                                  className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors cursor-pointer self-end sm:self-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </BaseButton>
                              )}
                            </div>
                          </div>

                          {/* Stats row with detailed tags */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-zinc-400">角色卡:</span>
                              <strong className="text-[var(--accent-hover,#B45309)] font-bold">{record.stats?.cards || 0}</strong>
                            </div>
                            <div className="inline-flex items-center gap-1">
                              <span className="text-zinc-400">世界书:</span>
                              <strong className="text-blue-600 dark:text-blue-400 font-bold">{record.stats?.worlds || 0}</strong>
                            </div>
                            <div className="inline-flex items-center gap-1">
                              <span className="text-zinc-400">正则脚本:</span>
                              <strong className="text-purple-600 dark:text-purple-400 font-bold">{record.stats?.regex || 0}</strong>
                            </div>
                            <div className="inline-flex items-center gap-1">
                              <span className="text-zinc-400">聊天日志:</span>
                              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{record.stats?.chats || 0}</strong>
                            </div>

                            {record.stats?.newAdded !== undefined && record.stats.newAdded > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                                新增入库 +{record.stats.newAdded}
                              </span>
                            )}
                            {record.stats?.updatedVersions !== undefined && record.stats.updatedVersions > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">
                                产生新版本 +{record.stats.updatedVersions}
                              </span>
                            )}
                            {record.stats?.skippedDuplicates !== undefined && record.stats.skippedDuplicates > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold text-[10px]">
                                相同跳过 {record.stats.skippedDuplicates}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Fold / Expand Toggle Button when > 3 items */}
                    {isCompressed && (
                      <div className="text-center pt-1">
                        <BaseButton
                          type="button"
                          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                          className="px-4 py-2 text-[10px] font-semibold text-[var(--accent-hover,#B45309)] hover:bg-[var(--btn-primary-bg,rgba(217,119,6,0.08))] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-[var(--accent)]/20"
                        >
                          {isHistoryExpanded ? (
                            <>
                              <span>收起历史记录</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>展开查看全部 {historyList.length} 条历史记录 (已折叠 {historyList.length - 3} 条)</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </BaseButton>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-6 bg-zinc-50/60 dark:bg-zinc-800/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-1.5">
                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  暂无历史归档记录
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  当您使用酒馆文件夹存档点拉取、同步或执行增量导入时，系统会自动在此处记录版本变动与同步细节。
                </p>
              </div>
            )}
          </BaseCard>

          {/* New Archive Point Modal */}
          {showNewArchiveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-[var(--accent,#D97706)]" />
                    新建酒馆目录存档点
                  </h3>
                  <BaseButton
                    type="button"
                    onClick={() => setShowNewArchiveModal(false)}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    ×
                  </BaseButton>
                </div>

                <div className="space-y-3 text-[10px]">
                  <div>
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">存档点名称</label>
                    <BaseInput
                      type="text"
                      value={newArchivePointName}
                      onChange={(e: any) => setNewArchivePointName(e.target.value)}
                      placeholder="如：主力酒馆目录 / 笔记本同步盘..."
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    点击下方按钮将打开文件选择器，选择您的 SillyTavern 根目录或 characters 目录。
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <BaseButton
                    type="button"
                    onClick={() => setShowNewArchiveModal(false)}
                    className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl text-[10px] font-bold"
                  >
                    取消
                  </BaseButton>
                  <BaseButton
                    type="button"
                    onClick={handleCreateArchivePoint}
                    className="px-4 py-2 bg-[var(--btn-primary-bg,var(--accent,#D97706))] hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5"
                  >
                    <FolderInput className="w-4 h-4" />
                    <span>选择文件夹并创建</span>
                  </BaseButton>
                </div>
              </div>
            </div>
          )}

          {/* Push To Tavern Modal */}
          <PushToTavernModal
            isOpen={isPushModalOpen}
            onClose={() => setIsPushModalOpen(false)}
            appData={appData}
            updateAppData={updateAppData}
            serverUrl={tavernUrl}
            apiKey={tavernApiKey}
            isOnline={tavernStatus.status === 'connected'}
            showToast={showToast}
          />

        </div>
      )}

      {/* ==================== TAB 2: 主题样式选择与调色板 ==================== */}
      {activeTab === 'theme' && (
        <div data-design-id="settings-tab-theme-content" className="space-y-6 animate-in fade-in duration-200">
          <ThemeColorCustomizer
            uiStyle={uiStyle}
            setUiStyle={setUiStyle || (() => {})}
            flatTheme={flatTheme}
            setFlatTheme={setFlatTheme || (() => {})}
            theme={theme}
            setTheme={setTheme || (() => {})}
            showToast={showToast}
            appData={appData}
            updateAppData={updateAppData}
            isInspectMode={isInspectMode}
            setIsInspectMode={setIsInspectMode}
          />
          <FontManagerPanel
            showToast={(type, msg) => {
              if (showToast) {
                showToast(msg, type === 'warning' ? 'info' : type);
              }
            }}
          />
          <AiBeautificationGenerator appData={appData} showToast={showToast} />
        </div>
      )}

      {/* ==================== TAB 3: API设置 ==================== */}
      {activeTab === 'api' && (
        <div data-design-id="settings-tab-api-content" className="space-y-5 animate-in fade-in duration-200">
          {/* Global API Profile Card */}
          <BaseCard designId="settings-global-api-card" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Key className="w-4 h-4 text-[var(--accent,#D97706)]" />
                  全局默认 API 接口设置
                </h2>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  配置用于 AI 模型请求、卡片扩展解析或翻译的默认 API 接口地址与秘钥。
                </p>
              </div>

              <BaseButton
                designId="settings-add-api-btn"
                type="button"
                onClick={() => setShowNewApiModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--btn-primary-bg,var(--accent,#D97706))] text-white text-[10px] font-bold hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加配置</span>
              </BaseButton>
            </div>

            <div className="space-y-3 pt-2">
              {/* Endpoint URL */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  接口地址 (API Base URL)
                </label>
                <BaseInput
                  type="text"
                  value={globalEndpoint}
                  onChange={(e: any) => setGlobalEndpoint(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3.5 py-2 text-[12px] font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--line-focus,rgba(217,119,6,0.5))] focus:border-[var(--accent,#D97706)] text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  API Key / 认证密钥
                </label>
                <div className="relative">
                  <BaseInput
                    type={showKey ? 'text' : 'password'}
                    value={globalApiKey}
                    onChange={(e: any) => setGlobalApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full pl-3.5 pr-10 py-2 text-[12px] font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--line-focus,rgba(217,119,6,0.5))] focus:border-[var(--accent,#D97706)] text-zinc-900 dark:text-zinc-100"
                  />
                  <BaseButton
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </BaseButton>
                </div>
              </div>

              {/* Default Model */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    默认模型名称
                  </label>
                  <BaseButton
                    type="button"
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                    className="flex items-center gap-1 px-2.5 !py-0 !min-h-[24px] !h-[24px] text-[9px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded transition-colors disabled:opacity-50"
                  >
                    {fetchingModels ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    <span>获取模型</span>
                  </BaseButton>
                </div>
                <div className="flex items-center gap-2">
                  <BaseInput
                    type="text"
                    list="fetched-models"
                    value={globalModel}
                    onChange={(e: any) => setGlobalModel(e.target.value)}
                    placeholder="gpt-4o / claude-3-5-sonnet-20241022 / deepseek-chat"
                    className="flex-1 px-3.5 py-2 text-[12px] font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--line-focus,rgba(217,119,6,0.5))] focus:border-[var(--accent,#D97706)] text-zinc-900 dark:text-zinc-100"
                  />
                  {availableModels.length > 0 && (
                    <datalist id="fetched-models">
                      {availableModels.map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  )}
                  {/* Preset Model Tags */}
                  <div className="hidden sm:flex items-center gap-1">
                    {['gpt-4o', 'claude-3-5-sonnet', 'deepseek-chat', 'gemini-1.5-pro'].map(m => (
                      <BaseButton
                        key={m}
                        type="button"
                        onClick={() => setGlobalModel(m)}
                        className="px-2 py-1 text-[10px] rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-[var(--badge-bg,rgba(217,119,6,0.12))] text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        {m}
                      </BaseButton>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions & Test Result */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BaseButton
                    type="button"
                    onClick={handleSaveGlobalApiConfig}
                    className="px-4 py-2 bg-[var(--btn-primary-bg,var(--accent,#D97706))] hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] text-white text-[10px] font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    保存全局配置
                  </BaseButton>
                  <BaseButton
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent,#D97706)]" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{testingConnection ? '正在测试...' : '测试连接'}</span>
                  </BaseButton>
                </div>

                {testResult && (
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${
                    testResult.success 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>
          </BaseCard>

          {/* Stored APIs List */}
          <BaseCard designId="settings-stored-apis-card" className="p-5 sm:p-6 space-y-4">
            <h3 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              已保存的 API 接口列表 ({appData.apis?.length || 0})
            </h3>

            {(!appData.apis || appData.apis.length === 0) ? (
              <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">暂无已保存的多套 API 列表</p>
                <p className="text-[10px] text-zinc-400 mt-1">点击上方「添加配置」可管理多套 OpenAI / Claude / 自建代理接口</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {appData.apis.map(api => (
                  <div
                    key={api.id}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{api.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                          {api.category || '默认'}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                        {api.url}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <BaseButton
                        type="button"
                        onClick={() => {
                          setGlobalEndpoint(api.url);
                          if (api.keys && api.keys.length > 0) {
                            setGlobalApiKey(api.keys[0].key);
                          }
                          showToast?.(`已将【${api.name}】载入为当前默认 API`, 'success');
                        }}
                        className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                        title="应用为此处的全局 API"
                      >
                        使用
                      </BaseButton>
                      <BaseButton
                        type="button"
                        onClick={() => handleDeleteApi(api.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </BaseButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BaseCard>

          {/* AI Character Card Refine Prompt Presets & Feature Config */}
          <AIRefineSettingsPanel
            appData={appData}
            updateAppData={updateAppData}
            showToast={showToast}
          />
        </div>
      )}

      {/* ==================== TAB 4: 数据与存储 ==================== */}
      {activeTab === 'storage' && (
        <div data-design-id="settings-tab-storage-content" className="space-y-5 animate-in fade-in duration-200">
          {/* Storage Metrics */}
          <BaseCard designId="settings-storage-metrics-card" className="p-5 sm:p-6 space-y-4">
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-500" />
              本地数据存储与用量统计
            </h2>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              您的所有角色卡、世界书、正则、聊天记录及多版本历史均完整保存在本地浏览器中，绝不上载任何外部服务器。
            </p>

            <div className="flex flex-col md:flex-row gap-6 pt-2 items-center">
              <div className="w-full md:w-5/12 flex flex-col justify-center items-center">
                <div className="h-60 w-full flex items-center justify-center">
                  {storageStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart style={{ outline: 'none' }}>
                        <Pie
                          data={storageStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="size"
                          stroke="none"
                          strokeWidth={0}
                          isAnimationActive={true}
                          style={{ outline: 'none' }}
                          label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                            if (!percent || percent < 0.03 || midAngle === undefined) return null;
                            const RADIAN = Math.PI / 180;
                            const radius = (outerRadius || 68) + 18;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            const isRight = x > cx;
                            return (
                              <text
                                x={x}
                                y={y}
                                textAnchor={isRight ? 'start' : 'end'}
                                dominantBaseline="central"
                                fill="#71717a"
                                style={{ fontSize: '11px', fontWeight: 500 }}
                              >
                                {`${name} ${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                          labelLine={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '2 2' }}
                        >
                          {storageStats.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              stroke="none"
                              strokeWidth={0}
                              style={{ outline: 'none', border: 'none', cursor: 'pointer' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatBytes(value as number)}
                          contentStyle={{ borderRadius: '10px', fontSize: '12px', border: 'none', outline: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: 'rgba(255, 255, 255, 0.95)', color: '#18181b' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[10px] text-zinc-400">
                      暂无数据
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 font-medium flex items-center gap-1.5">
                  <span>总占用空间: {formatBytes(storageStats.reduce((acc, curr) => acc + curr.size, 0))}</span>
                  {isCalculatingStorage && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      计算中...
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full md:w-7/12 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500">ST 角色卡</div>
                  <div className="text-lg font-extrabold text-[var(--accent-hover,#B45309)]">{appData.cards?.length || 0}</div>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500">ST 世界书</div>
                  <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{appData.stWorldBooks?.length || 0}</div>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500">正则脚本</div>
                  <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400">{appData.stRegexScripts?.length || 0}</div>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500">聊天记录</div>
                  <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{appData.chatLogs?.length || 0}</div>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500">ST 预设</div>
                  <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400">{appData.presets?.length || 0}</div>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500">ST 主题</div>
                  <div className="text-lg font-extrabold text-cyan-600 dark:text-cyan-400">{appData.themes?.length || 0}</div>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500">快捷脚本</div>
                  <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{appData.scripts?.length || 0}</div>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500">表情包 / 字体</div>
                  <div className="text-lg font-extrabold text-teal-600 dark:text-teal-400">{(appData.stickerPacks?.length || 0) + (appData.fonts?.length || 0)}</div>
                </div>
              </div>
            </div>
          </BaseCard>

          {/* Backup and Export Center */}
          <BaseCard designId="settings-backup-export-card" className="p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-emerald-500" />
                全量数据导出与备份中心 (Export & Backup Center)
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                提供全格式结构化归档压缩包 (含所有角色卡立绘图片/照片资产、多版本历史清晰归档与分界面分类)、单文件 JSON 快速备份以及超大数据分卷导出方案。
              </p>
            </div>

            {/* Option 1: Full ZIP Archive (Recommended) */}
            <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      全量结构化归档压缩包 (.zip)
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full">
                      强烈推荐
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-600 dark:text-zinc-300 leading-relaxed space-y-1">
                    <div>✨ <strong>包含所有照片/图片资产</strong>：提取出所有角色卡主立绘、备选立绘、主题预览图、表情包图片为独立标准文件。</div>
                    <div>📁 <strong>按分界面名称分类</strong>：按照「ST角色卡」「ST世界书」「ST正则」「ST主题」「表情包」等分界面目录清晰存放。</div>
                    <div>🏷️ <strong>多版本清晰标注</strong>：包含多个历史版本的项目自动创建「历史版本」目录，按版本号、更新日期和变更说明详细标注。</div>
                    <div>💾 <strong>内置一键还原文件</strong>：根目录附带完整 JSON 备份与说明文档，随时可无损导入恢复。</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <BaseButton
                  designId="settings-export-zip-btn"
                  type="button"
                  onClick={handleExportFullZip}
                  disabled={isExportingZip}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-[10px] font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExportingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在构建压缩包 ({zipProgress?.percent || 0}%)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>一键导出全量 ZIP 压缩包 (含图片与多版本分类)</span>
                    </>
                  )}
                </BaseButton>
              </div>
            </div>

            {/* Other Export & Restore Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Standalone HTML File */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    单文件独立离线版 (.html)
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    全部界面与代码打包为单文件，双击即可离线运行，支持原生文件夹固定！
                  </p>
                </div>
                <div className="pt-1">
                  <BaseButton
                    designId="settings-export-standalone-html-tab4-btn"
                    type="button"
                    onClick={handleExportStandaloneHtml}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>导出独立 HTML 文件</span>
                  </BaseButton>
                </div>
              </div>

              {/* JSON Backup */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-500" />
                    全量 JSON 备份 (.json)
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    纯文本结构化配置，体积轻巧，适合跨设备快速 1 键导入还原。
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <BaseButton
                    designId="settings-export-json-btn"
                    type="button"
                    onClick={handleExportFullBackup}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-medium rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>导出 JSON 备份</span>
                  </BaseButton>
                  <BaseButton
                    designId="settings-import-json-btn"
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-[10px] font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>导入 JSON 还原</span>
                  </BaseButton>
                </div>
              </div>

              {/* Advanced Big Data / Batched Export */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[var(--accent,#D97706)]" />
                    分卷分批导出 (超大数据防崩溃)
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    当数据量超大或移动端内存受限时，按条数或体积自动分卷切分导出。
                  </p>
                </div>
                <div className="pt-1">
                  <BaseButton
                    designId="settings-open-bigdata-btn"
                    type="button"
                    onClick={() => onOpenBigDataExport?.()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[var(--accent,#D97706)]" />
                    <span>打开分批 / 分卷导出中心</span>
                  </BaseButton>
                </div>
              </div>
            </div>
          </BaseCard>

          {/* Scanned & Synced Version History Records at Bottom */}
          <BaseCard designId="settings-synced-history-card" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-[var(--accent,#D97706)]" />
                  历史导入与同步版本流水 ({appData.scannedDirectories?.length || 0})
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  记录每次酒馆目录同步、存档点读取与增量导入的版本更迭明细
                </p>
              </div>

              {(appData.scannedDirectories?.length || 0) > 0 && (
                <BaseButton
                  designId="settings-clear-history-btn"
                  type="button"
                  onClick={handleClearAllHistory}
                  className="px-2.5 py-1 text-[10px] font-medium text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  清空流水
                </BaseButton>
              )}
            </div>

            {appData.scannedDirectories && appData.scannedDirectories.length > 0 ? (
              <div className="space-y-2.5">
                {appData.scannedDirectories.slice(0, 10).map((record, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate">
                          {record.path}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                        {new Date(record.time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-600 dark:text-zinc-300">
                      <span className="text-zinc-400">角色卡: <strong className="text-[var(--accent-hover,#B45309)]">{record.stats?.cards || 0}</strong></span>
                      <span className="text-zinc-400">世界书: <strong className="text-blue-600 dark:text-blue-400">{record.stats?.worlds || 0}</strong></span>
                      <span className="text-zinc-400">正则: <strong className="text-purple-600 dark:text-purple-400">{record.stats?.regex || 0}</strong></span>
                      <span className="text-zinc-400">聊天: <strong className="text-emerald-600 dark:text-emerald-400">{record.stats?.chats || 0}</strong></span>

                      {record.stats?.newAdded !== undefined && record.stats.newAdded > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                          新增 +{record.stats.newAdded}
                        </span>
                      )}
                      {record.stats?.updatedVersions !== undefined && record.stats.updatedVersions > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                          新版本 +{record.stats.updatedVersions}
                        </span>
                      )}
                      {record.stats?.skippedDuplicates !== undefined && record.stats.skippedDuplicates > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-semibold">
                          跳过 {record.stats.skippedDuplicates}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-[10px] text-zinc-400">
                暂无历史同步版本记录
              </div>
            )}
          </BaseCard>

          {/* Clear Data (Danger Zone) */}
          <BaseCard designId="settings-danger-zone-card" className="p-5 sm:p-6 border-rose-200 dark:border-rose-950/60 space-y-3">
            <h3 className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              危险区域：重置与清空数据
            </h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              清空本工具箱中所有的角色卡、世界书、正则及聊天记录等本地存储数据。执行前请确认已备份重要数据。
            </p>

            <BaseButton
              designId="settings-clear-all-data-btn"
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
            >
              清空所有本地数据
            </BaseButton>
          </BaseCard>
        </div>
      )}

      {/* ==================== TAB 5: 云端网盘同步与回滚 ==================== */}
      {activeTab === 'cloud_sync' && (
        <div data-design-id="settings-tab-cloud-sync-content" className="space-y-5 animate-in fade-in duration-200">
          <CloudSyncSettingsPanel
            appData={appData}
            onRestoreData={(restoredData) => {
              updateAppData(prev => ({
                ...prev,
                ...restoredData
              }));
            }}
            showNotification={(msg, type) => showToast?.(msg, type)}
          />
        </div>
      )}

      {/* ==================== TAB 6: 关于软件 ==================== */}
      {activeTab === 'about' && (
        <div data-design-id="settings-tab-about-content" className="space-y-5 animate-in fade-in duration-200">
          <BaseCard designId="settings-about-info-card" className="p-5 sm:p-6 space-y-4">
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-zinc-500" />
              关于 TavernVault 酒馆综合管理工具箱
            </h2>
            <div className="text-[10px] text-zinc-600 dark:text-zinc-300 leading-relaxed space-y-2">
              <p>
                <strong>版本：</strong> v2.1.0 (宋式美学增量同步版)
              </p>
              <p>
                <strong>核心特性：</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-500 dark:text-zinc-400">
                <li>SillyTavern 本地目录一键固定与增量读取，支持多版本历史追踪与回滚。</li>
                <li>完全支持角色卡 (PNG/JSON)、世界书、正则脚本、快捷脚本、聊天记录等多格式解析。</li>
                <li>支持宋式雅致 11 款灵感色调与现代毛玻璃双风格无缝切换。</li>
                <li>支持全量结构化归档压缩包导出，包含所有图片、多版本清晰分类与说明。</li>
                <li>本地优先架构，数据与 API Key 均仅驻留于本地浏览器，保障极致私密性。</li>
              </ul>
            </div>
          </BaseCard>
        </div>
      )}
      </div>

      {/* ZIP Export Progress Modal */}
      {isExportingZip && zipProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    正在生成结构化归档压缩包...
                  </h3>
                  <p className="text-[10px] text-zinc-500">当前板块：{zipProgress.currentSection}</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {zipProgress.percent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-200"
                style={{ width: `${Math.max(5, zipProgress.percent)}%` }}
              />
            </div>

            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
              {zipProgress.details}
            </p>

            <div className="flex justify-end pt-2">
              <BaseButton
                type="button"
                onClick={handleCancelZipExport}
                className="px-4 py-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                取消导出
              </BaseButton>
            </div>
          </div>
        </div>
      )}

      {/* ZIP Export Success / Result Breakdown Modal */}
      {showZipResultModal && zipResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  全量归档压缩包导出成功！
                </h3>
                <p className="text-[10px] text-zinc-500">
                  文件已自动下载：{zipResult.fileName} ({(zipResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center py-2">
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-500">板块分类</div>
                <div className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">{zipResult.stats.totalSections}</div>
              </div>
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-500">总数据条目</div>
                <div className="text-base font-extrabold text-blue-600 dark:text-blue-400">{zipResult.stats.totalItems}</div>
              </div>
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-500">历史版本数</div>
                <div className="text-base font-extrabold text-[var(--accent-hover,#B45309)]">{zipResult.stats.totalVersions}</div>
              </div>
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-500">提取图片/照片</div>
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{zipResult.stats.totalImages}</div>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">各分界面目录分类明细：</div>
              {Object.entries(zipResult.stats.breakdown).map(([sec, st]) => (
                <div key={sec} className="flex items-center justify-between px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-[10px] border border-zinc-100 dark:border-zinc-800/60">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">📁 {sec}</span>
                  <span className="text-[10px] text-zinc-500">
                    {st.items} 条数据 {st.versions > 0 ? `· ${st.versions} 个历史版本` : ''} {st.images > 0 ? `· ${st.images} 张图片` : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <BaseButton
                type="button"
                onClick={() => setShowZipResultModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl shadow-xs cursor-pointer"
              >
                我知道了
              </BaseButton>
            </div>
          </div>
        </div>
      )}

      {/* Add New API Modal */}
      {showNewApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div className="fixed inset-0 cursor-pointer" onClick={() => setShowNewApiModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-[var(--accent,#D97706)]" />
              添加 API 配置
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">配置名称</label>
                <BaseInput
                  type="text"
                  value={newApiName}
                  onChange={(e: any) => setNewApiName(e.target.value)}
                  placeholder="例如: OpenAI 官方 / DeepSeek 专线 / 本地 Ollama"
                  className="w-full px-2.5 py-1 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">接口地址 (URL)</label>
                <BaseInput
                  type="text"
                  value={newApiUrl}
                  onChange={(e: any) => setNewApiUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-2.5 py-1 text-[10px] font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">API Key</label>
                <BaseInput
                  type="password"
                  value={newApiKey}
                  onChange={(e: any) => setNewApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-2.5 py-1 text-[10px] font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <BaseButton
                type="button"
                onClick={() => setShowNewApiModal(false)}
                className="px-2.5 py-1 text-[10px] rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                取消
              </BaseButton>
              <BaseButton
                type="button"
                onClick={handleAddNewApi}
                className="px-4 py-1.5 text-[10px] font-bold rounded-lg bg-[var(--btn-primary-bg,var(--accent,#D97706))] text-white hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] cursor-pointer shadow-xs"
              >
                添加
              </BaseButton>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backup Directory Modal */}
      {showMobileBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div className="fixed inset-0 cursor-pointer" onClick={() => setShowMobileBackupModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[var(--accent,#D97706)]" />
                手机端备份目录配置
              </h3>
              <BaseButton
                type="button"
                onClick={() => setShowMobileBackupModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[10px] cursor-pointer p-1"
              >
                ✕
              </BaseButton>
            </div>

            <div className="text-[10px] text-zinc-600 dark:text-zinc-300 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
              <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                💡 为什么手机端选择空文件夹会显示「无任何文件」？
              </p>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                手机系统（Android/iOS）文件管理器出于隐私沙盒限制，网页无法直接授权空文件夹。请使用下方的一键快速绑定或自定义命名。
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: One-click Bind to Phone Download Folder */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  <span>推荐方案：一键绑定手机下载目录</span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    免系统授权
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  备份将直接保存在手机的 <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">Download / 酒馆备份</span> 中。
                </p>
                <BaseButton
                  type="button"
                  onClick={() => {
                    const defaultPath = 'Download/酒馆备份';
                    setLiveBackupPath(defaultPath);
                    setIsLiveBackupEnabled(true);
                    localStorage.setItem('st_vault_live_backup_enabled', 'true');
                    localStorage.setItem('st_vault_live_backup_path', defaultPath);
                    setShowMobileBackupModal(false);
                    showToast?.(`已成功固定备份目录: ${defaultPath}！`, 'success');
                  }}
                  className="w-full py-2 bg-[var(--accent,#D97706)] hover:opacity-90 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>一键绑定为「Download/酒馆备份」</span>
                </BaseButton>
              </div>

              {/* Option 2: Custom Name */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                <div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">
                  自定义备份目录名称
                </div>
                <div className="flex gap-1.5">
                  <BaseInput
                    type="text"
                    value={editBackupPathInput}
                    onChange={(e: any) => setEditBackupPathInput(e.target.value)}
                    placeholder="输入自定义名称 (如: 我的手机酒馆备份)"
                    className="flex-1 text-[10px] px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                  <BaseButton
                    type="button"
                    onClick={() => {
                      if (!editBackupPathInput.trim()) {
                        showToast?.('请输入名称', 'error');
                        return;
                      }
                      const p = editBackupPathInput.trim();
                      setLiveBackupPath(p);
                      setIsLiveBackupEnabled(true);
                      localStorage.setItem('st_vault_live_backup_enabled', 'true');
                      localStorage.setItem('st_vault_live_backup_path', p);
                      setShowMobileBackupModal(false);
                      showToast?.(`已成功固定备份目录: ${p}！`, 'success');
                    }}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 text-white text-[10px] font-bold rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    固定
                  </BaseButton>
                </div>
              </div>

              {/* Option 3: Try System Folder Picker */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileBackupModal(false);
                    backupFolderInputRef.current?.click();
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                >
                  仍然尝试打开系统文件夹选择器
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-step Delete Confirmation Modal for Resetting App */}
      <DeleteConfirmationModal
        isOpen={showClearConfirmModal}
        onClose={() => setShowClearConfirmModal(false)}
        onConfirm={() => {
          updateAppData({
            cards: [],
            groups: ['全部角色', '默认分组'],
            stWorldBooks: [],
            stRegexScripts: [],
            chatLogs: [],
            presets: [],
            themes: []
          });
          setShowClearConfirmModal(false);
          showToast?.('已清空所有本地数据', 'info');
        }}
        title="清空所有数据确认"
        message="确定要彻底清空本工具箱的所有角色卡、世界书、正则及聊天记录等全部本地数据吗？"
        itemCount={1}
      />
    </div>
  );
};
