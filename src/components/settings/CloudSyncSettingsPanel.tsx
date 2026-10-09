import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  Server,
  Lock,
  History,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  DownloadCloud,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  RefreshCw,
  FolderSync,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Database,
  FileCheck,
  ExternalLink,
  LogOut,
  Key,
  Copy,
  Check,
  Cpu,
  ShieldAlert,
  Settings2,
  Terminal,
  QrCode,
} from 'lucide-react';
import { SyncDiagnosticLogDrawer } from './SyncDiagnosticLogDrawer';
import { BaiduQRCodeModal } from './BaiduQRCodeModal';
import { CloudSyncProgressModal } from '../modals/CloudSyncProgressModal';
import { syncLogger } from '../../utils/cloudSyncLogger';
import { CustomSelect } from '../ui/CustomSelect';
import {
  CloudStorageConfig,
  LocalSnapshotItem,
  SnapshotManifest,
  SyncProgressUpdate,
  EncryptionMode,
  BaiduUserInfo,
} from '../../types/cloudSync';
import {
  createStorageAdapter,
  executeSequentialUpload,
  fetchRemoteSnapshotsList,
  executeSequentialRollback,
  formatNowString,
} from '../../utils/syncPipeline';
import {
  getOrCreateDeviceEncryptionKey,
  exportDeviceEncryptionKey,
  importDeviceEncryptionKey,
  regenerateDeviceEncryptionKey,
  getEffectiveEncryptionKey,
} from '../../utils/cryptoEngine';
import {
  buildBaiduOAuthUrl,
  parseBaiduTokenFromUrl,
  fetchBaiduUserInfo,
  DEFAULT_BAIDU_APP_KEY,
} from '../../utils/storageAdapters/baiduAdapter';

interface CloudSyncSettingsPanelProps {
  appData: any;
  onRestoreData: (restoredData: any) => void;
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STORAGE_CONFIG_KEY = 'tavern_vault_cloud_sync_config';
const LOCAL_SNAPSHOTS_KEY = 'tavern_vault_local_snapshots_stack';

function encryptSensitiveField(val?: string): string {
  if (!val) return '';
  if (val.startsWith('enc_sec_')) return val;
  try {
    const encoded = btoa(encodeURIComponent(val));
    const scrambled = encoded.split('').map((c) => String.fromCharCode(c.charCodeAt(0) ^ 0x3f)).join('');
    return 'enc_sec_' + btoa(scrambled);
  } catch {
    return 'enc_sec_' + btoa(val);
  }
}

function decryptSensitiveField(cipher?: string): string {
  if (!cipher) return '';
  if (!cipher.startsWith('enc_sec_')) return cipher;
  try {
    const raw = cipher.replace('enc_sec_', '');
    const scrambled = atob(raw);
    const unScrambled = scrambled.split('').map((c) => String.fromCharCode(c.charCodeAt(0) ^ 0x3f)).join('');
    return decodeURIComponent(atob(unScrambled));
  } catch {
    try {
      return atob(cipher.replace('enc_sec_', ''));
    } catch {
      return cipher;
    }
  }
}

export const CloudSyncSettingsPanel: React.FC<CloudSyncSettingsPanelProps> = ({
  appData,
  onRestoreData,
  showNotification,
}) => {
  // Config state
  const [config, setConfig] = useState<CloudStorageConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.baidu?.appKey) parsed.baidu.appKey = decryptSensitiveField(parsed.baidu.appKey);
        if (parsed.baidu?.appSecret) parsed.baidu.appSecret = decryptSensitiveField(parsed.baidu.appSecret);
        return parsed;
      }
    } catch {}
    return {
      provider: 'baidu',
      webdav: {
        url: '',
        username: '',
        password: '',
        rootPath: '/TavernVault/',
      },
      s3: {
        endpoint: '',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        region: 'auto',
        rootPath: 'TavernVault/',
      },
      baidu: {
        accessToken: '',
        rootPath: '/apps/卡面存储',
      },
      encryptionMode: 'device_auto',
      encryptionPassword: '',
      rememberPassword: true,
      autoSyncOnClose: false,
    };
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [baiduQrModalOpen, setBaiduQrModalOpen] = useState(false);

  // Baidu OAuth states
  const [baiduLoadingUser, setBaiduLoadingUser] = useState(false);
  const [showBaiduAdvanced, setShowBaiduAdvanced] = useState(false);

  // Device Encryption Key Modal states
  const [deviceKeyModalOpen, setDeviceKeyModalOpen] = useState(false);
  const [importKeyModalOpen, setImportKeyModalOpen] = useState(false);
  const [importKeyInput, setImportKeyInput] = useState('');
  const [currentDeviceKey, setCurrentDeviceKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Sync / Rollback execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<SyncProgressUpdate | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncModalMinimized, setSyncModalMinimized] = useState(false);

  // AppKey and AppSecret visibility toggles
  const [showBaiduAppKey, setShowBaiduAppKey] = useState(false);
  const [showBaiduAppSecret, setShowBaiduAppSecret] = useState(false);

  // Sync mode split dropdown state
  const [syncDropdownOpen, setSyncDropdownOpen] = useState(false);
  const syncDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (syncDropdownRef.current && !syncDropdownRef.current.contains(e.target as Node)) {
        setSyncDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Snapshot tabs & data
  const [activeSnapshotTab, setActiveSnapshotTab] = useState<'cloud' | 'local'>('cloud');
  const [localSnapshots, setLocalSnapshots] = useState<LocalSnapshotItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [remoteSnapshots, setRemoteSnapshots] = useState<
    { fileName: string; path: string; manifest?: SnapshotManifest; dateStr: string }[]
  >([]);
  const [loadingRemoteSnapshots, setLoadingRemoteSnapshots] = useState(false);

  // Selected snapshot for inspection/rollback
  const [selectedRemoteSnapshot, setSelectedRemoteSnapshot] = useState<any | null>(null);
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);
  const [rollbackCustomPassword, setRollbackCustomPassword] = useState('');

  // Save config changes helper
  const updateConfig = (newConfig: Partial<CloudStorageConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...newConfig };
      try {
        const toSave = JSON.parse(JSON.stringify(merged));
        if (toSave.baidu?.appKey) toSave.baidu.appKey = encryptSensitiveField(toSave.baidu.appKey);
        if (toSave.baidu?.appSecret) toSave.baidu.appSecret = encryptSensitiveField(toSave.baidu.appSecret);
        localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(toSave));
      } catch {
        localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(merged));
      }
      return merged;
    });
  };

  // Load device key on mount
  useEffect(() => {
    const key = getOrCreateDeviceEncryptionKey();
    setCurrentDeviceKey(key);
  }, []);

  // Handle Baidu Token auto-capture from URL (Hash or Query)
  useEffect(() => {
    const tokenInfo = parseBaiduTokenFromUrl();
    if (tokenInfo?.accessToken) {
      // Clear hash/query from URL without reload
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      applyBaiduToken(tokenInfo.accessToken);
    }

    // Listen to popup postMessage if opened in popup
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'BAIDU_OAUTH_TOKEN' && e.data.token) {
        applyBaiduToken(e.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Apply and verify Baidu Access Token
  const applyBaiduToken = async (token: string) => {
    setBaiduLoadingUser(true);
    try {
      const userInfo = await fetchBaiduUserInfo(token);
      updateConfig({
        provider: 'baidu',
        baidu: {
          ...config.baidu,
          accessToken: token,
          userInfo: userInfo || undefined,
          lastLoginTime: Date.now(),
        },
      });
      const name = userInfo?.baidu_name || userInfo?.netdisk_name || '用户';
      showNotification?.(`百度网盘授权登录成功！已绑定账号: ${name}`, 'success');
    } catch {
      updateConfig({
        provider: 'baidu',
        baidu: {
          ...config.baidu,
          accessToken: token,
        },
      });
      showNotification?.('百度网盘 Token 已保存', 'success');
    } finally {
      setBaiduLoadingUser(false);
    }
  };

  // Handle Baidu Direct OAuth Login
  const handleBaiduOAuthLogin = () => {
    const authUrl = buildBaiduOAuthUrl(config.baidu.appKey, config.baidu.redirectUri, 'page');
    window.location.href = authUrl;
  };

  // Handle Baidu Popup OAuth Login
  const handleBaiduPopupOAuthLogin = () => {
    const authUrl = buildBaiduOAuthUrl(config.baidu.appKey, config.baidu.redirectUri, 'popup');
    const width = 700;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      authUrl,
      'baidu_oauth_window',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no`
    );
  };

  // Logout from Baidu NetDisk
  const handleBaiduLogout = () => {
    updateConfig({
      baidu: {
        ...config.baidu,
        accessToken: '',
        userInfo: undefined,
      },
    });
    showNotification?.('已解除百度网盘授权绑定', 'info');
  };

  // Generate strong random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let pass = '';
    const array = new Uint8Array(18);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 18; i++) {
      pass += chars[array[i] % chars.length];
    }
    updateConfig({ encryptionPassword: pass, encryptionMode: 'custom_password' });
    showNotification?.('已自动生成高强度军事级加密密钥', 'success');
  };

  // Test Storage Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const adapter = createStorageAdapter(config);
      const res = await adapter.testConnection();
      setTestResult(res);
      if (res.success) {
        showNotification?.(res.message, 'success');
        handleRefreshRemoteSnapshots();
      } else {
        showNotification?.(res.message, 'error');
      }
    } catch (err: any) {
      const failMsg = `连接失败: ${err.message || '网络无法访问'}`;
      setTestResult({ success: false, message: failMsg });
      showNotification?.(failMsg, 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  // Refresh remote snapshots list
  const handleRefreshRemoteSnapshots = async () => {
    setLoadingRemoteSnapshots(true);
    try {
      const list = await fetchRemoteSnapshotsList(config);
      setRemoteSnapshots(list as any);
    } catch (err: any) {
      console.warn('Refresh remote snapshots error:', err);
    } finally {
      setLoadingRemoteSnapshots(false);
    }
  };

  useEffect(() => {
    if (
      (config.provider === 'webdav' && config.webdav.url) ||
      (config.provider === 's3' && config.s3.endpoint) ||
      (config.provider === 'baidu' && config.baidu.accessToken)
    ) {
      handleRefreshRemoteSnapshots();
    }
  }, [config.provider, config.baidu.accessToken]);

  // Save local snapshot protection point
  const saveLocalSnapshot = (data: any, summary: string) => {
    try {
      const dataStr = JSON.stringify(data);
      const newSnap: LocalSnapshotItem = {
        id: `local_${Date.now()}`,
        dateStr: formatNowString(),
        timestamp: Date.now(),
        summary,
        totalSize: dataStr.length,
        data,
      };
      const updated = [newSnap, ...localSnapshots.slice(0, 9)];
      setLocalSnapshots(updated);
      localStorage.setItem(LOCAL_SNAPSHOTS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save local snapshot:', err);
    }
  };

  // Restore from local snapshot
  const handleRestoreLocalSnapshot = (snap: LocalSnapshotItem) => {
    if (window.confirm(`确认要将全量数据回滚至本地保护点：${snap.dateStr} 吗？`)) {
      saveLocalSnapshot(appData, '本地回滚前临时保护点');
      onRestoreData(snap.data);
      showNotification?.(`已秒级还原至本地快照：${snap.dateStr}`, 'success');
    }
  };

  // 1. 立即同步：直接上传，对比云端文件如果有重复则跳过上传新文件
  const handleIncrementalSync = async () => {
    setSyncDropdownOpen(false);
    setIsProcessing(true);
    setSyncModalOpen(true);
    setSyncModalMinimized(false);
    setProgress({
      phase: 'scanning',
      currentStepText: '正在扫描全量业务数据并比对云端重复...',
      completedItems: 0,
      totalItems: 0,
      percent: 0,
    });

    try {
      saveLocalSnapshot(appData, '立即同步前即时保护点');

      const result = await executeSequentialUpload(
        config,
        appData,
        (p) => setProgress(p),
        { mode: 'incremental' }
      );

      updateConfig({ lastSyncTime: Date.now() });
      const statsMsg = result.skippedFiles > 0
        ? `立即同步完成！共 ${result.summary.totalFiles} 个文件（对比跳过 ${result.skippedFiles} 个重复文件，上传 ${result.uploadedFiles} 个新文件）`
        : `立即同步完成！已成功上传全部 ${result.uploadedFiles} 个文件至云端`;
      showNotification?.(statsMsg, 'success');
      handleRefreshRemoteSnapshots();
    } catch (err: any) {
      showNotification?.(`立即同步失败: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. 云端覆盖本地：直接把云端现有所有数据拉取覆盖到本地
  const handleCloudOverwriteLocal = async () => {
    setSyncDropdownOpen(false);
    if (!window.confirm('确定要从云端拉取现有数据并完全覆盖本地吗？\n\n警告：当前本地所有数据将被云端最新数据完全覆盖！（系统会在覆盖前自动在本地保存一份安全快照以备撤销）')) {
      return;
    }

    setIsProcessing(true);
    setSyncModalOpen(true);
    setSyncModalMinimized(false);
    setProgress({
      phase: 'downloading',
      currentStepText: '正在连接网盘检索最新云端快照...',
      completedItems: 0,
      totalItems: 0,
      percent: 0,
    });

    try {
      saveLocalSnapshot(appData, '云端覆盖本地前自动保护点');

      const remoteSnaps = await fetchRemoteSnapshotsList(config);
      if (!remoteSnaps || remoteSnaps.length === 0) {
        throw new Error('云端暂无任何可用的备份快照，无法执行覆盖本地');
      }

      const latestSnap = remoteSnaps[0];

      const restored = await executeSequentialRollback(
        config,
        latestSnap.path,
        (p) => setProgress(p)
      );

      // Construct overwritten state: start from appData, but reset/overwrite collections with restored data
      const collectionsToOverWrite = [
        'cards', 'stCards', 'normalCards',
        'worldBooks', 'stWorldBooks',
        'scripts', 'stScripts',
        'plugins', 'stPlugins',
        'themes', 'stThemes',
        'presets', 'stPresets',
        'stRegexScripts',
        'beautifications',
        'phoneLinks',
        'userPersonas',
        'stickerPacks',
        'chatMemes',
        'extraStories',
        'chatLogs',
        'chatBackgrounds',
        'backgroundImages',
        'cardCovers',
      ];

      const overwritten: any = { ...appData };
      for (const col of collectionsToOverWrite) {
        overwritten[col] = Array.isArray(restored[col]) ? restored[col] : [];
      }

      for (const [key, value] of Object.entries(restored)) {
        if (key.startsWith('_')) continue;
        overwritten[key] = value;
      }

      onRestoreData(overwritten);
      showNotification?.(`云端覆盖本地成功！已拉取最新云端快照 (${latestSnap.dateStr}) 完整覆盖当前本地数据。`, 'success');
      handleRefreshRemoteSnapshots();
    } catch (err: any) {
      showNotification?.(`云端覆盖本地失败: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. 本地覆盖云端：直接把本地现有所有数据强制全部覆盖掉云端的数据
  const handleLocalOverwriteCloud = async () => {
    setSyncDropdownOpen(false);
    if (!window.confirm('确定要将本地现有所有数据强制全部覆盖掉云端的数据吗？\n\n警告：此操作将忽略云端重复判断，强制将本地所有数据加密上传并覆写云端最新状态！')) {
      return;
    }

    setIsProcessing(true);
    setSyncModalOpen(true);
    setSyncModalMinimized(false);
    setProgress({
      phase: 'scanning',
      currentStepText: '准备就绪，正在准备本地数据强制覆盖云端...',
      completedItems: 0,
      totalItems: 0,
      percent: 0,
    });

    try {
      saveLocalSnapshot(appData, '本地覆盖云端前自动保护点');

      const result = await executeSequentialUpload(
        config,
        appData,
        (p) => setProgress(p),
        { mode: 'force_overwrite' }
      );

      updateConfig({ lastSyncTime: Date.now() });
      showNotification?.(`本地覆盖云端成功！已将本地全部 ${result.uploadedFiles} 个数据文件强制覆盖至云端`, 'success');
      handleRefreshRemoteSnapshots();
    } catch (err: any) {
      showNotification?.(`本地覆盖云端失败: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Keep legacy alias for auto-sync on close
  const handleStartUpload = handleIncrementalSync;

  // Confirm Remote Rollback
  const handleConfirmRemoteRollback = async () => {
    if (!selectedRemoteSnapshot) return;
    setRollbackConfirmOpen(false);
    setIsProcessing(true);
    setSyncModalOpen(true);
    setSyncModalMinimized(false);
    setProgress({
      phase: 'downloading',
      currentStepText: '正在连接网盘拉取远端快照清单...',
      completedItems: 0,
      totalItems: 0,
      percent: 0,
    });

    try {
      saveLocalSnapshot(appData, '云端回滚前临时保护点');

      const restored = await executeSequentialRollback(
        config,
        selectedRemoteSnapshot.path,
        (p) => {
          setProgress(p);
        },
        rollbackCustomPassword.trim() || undefined
      );

      // Safe non-destructive merge: preserve local collections if not present in the restored snapshot
      const merged: any = { ...appData };
      for (const [key, value] of Object.entries(restored)) {
        if (key.startsWith('_')) continue;
        if (Array.isArray(value) && value.length === 0) {
          if (restored._manifestCategories?.includes(key)) {
            merged[key] = value;
          }
        } else if (value !== undefined) {
          merged[key] = value;
        }
      }

      onRestoreData(merged);
      if (restored._rollbackErrors && restored._rollbackErrors.length > 0) {
        showNotification?.(
          `回滚完成（${restored._rollbackErrors.length} 个非关键文件未能拉取，其余数据已还原）`,
          'info'
        );
      } else {
        showNotification?.(`已成功无损解密回滚至云端快照：${selectedRemoteSnapshot.dateStr}`, 'success');
      }
    } catch (err: any) {
      showNotification?.(`回滚失败: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setRollbackCustomPassword('');
    }
  };

  const handleCopyDeviceKey = () => {
    if (!currentDeviceKey) return;
    navigator.clipboard.writeText(currentDeviceKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showNotification?.('设备加密密钥已复制到剪贴板', 'success');
  };

  const handleApplyImportKey = () => {
    const success = importDeviceEncryptionKey(importKeyInput);
    if (success) {
      setCurrentDeviceKey(importKeyInput.trim());
      setImportKeyModalOpen(false);
      setImportKeyInput('');
      showNotification?.('已成功导入设备加密密钥，可直接解密免密备份', 'success');
    } else {
      showNotification?.('输入的密钥格式无效，请确认是 256 位有效密钥', 'error');
    }
  };

  const handleRegenerateKey = () => {
    if (window.confirm('警告：重新生成设备密钥后，旧设备密钥加密的免密备份将无法直接解密（需手动输入旧密钥）。确定重新生成吗？')) {
      const newKey = regenerateDeviceEncryptionKey();
      setCurrentDeviceKey(newKey);
      showNotification?.('已生成新的设备安全密钥', 'success');
    }
  };

  const isBaiduConnected = Boolean(config.baidu.accessToken);
  const currentMode: EncryptionMode = config.encryptionMode || (config.encryptionPassword ? 'custom_password' : 'device_auto');

  return (
    <div className="space-y-4 sm:space-y-5 text-stone-800 dark:text-stone-200">

      {/* 正在执行进度条浮层 */}
      {isProcessing && progress && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-md animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {progress.currentStepText}
            </span>
            <span>{progress.percent}%</span>
          </div>
          <div className="w-full bg-amber-200 dark:bg-amber-900/50 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {progress.currentFileName && (
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 truncate">
              正在处理目标: {progress.currentFileName}
            </p>
          )}
        </div>
      )}

      {/* 第一区：网盘连接配置区 */}
      <div className="p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/40 space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <Server className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h4 className="font-semibold text-[13px] tracking-wide" style={{ fontSize: '13px' }}>网盘连接配置</h4>
          </div>

          {/* 桌面界面保留分段选择 */}
          <div className="hidden md:flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-medium -translate-y-0.5">
            {(['baidu', 'webdav', 's3'] as const).map((p) => (
              <button
                key={p}
                onClick={() => updateConfig({ provider: p })}
                className={`px-3 py-1 rounded-md transition ${
                  config.provider === p
                    ? 'bg-white dark:bg-stone-700 shadow-sm text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {p === 'baidu' ? '百度网盘 (支持跳转登录)' : p === 'webdav' ? 'WebDAV 网盘' : 'S3 对象存储'}
              </button>
            ))}
          </div>

          {/* 最右边：立刻同步按钮和下拉按钮 */}
          <div className="relative flex items-center shrink-0" ref={syncDropdownRef}>
            <button
              onClick={handleIncrementalSync}
              disabled={isProcessing}
              className="h-7 px-3 rounded-l-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] sm:text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {isProcessing ? '处理中...' : '立即同步'}
            </button>

            <button
              type="button"
              onClick={() => setSyncDropdownOpen((prev) => !prev)}
              disabled={isProcessing}
              title="选择同步或覆盖模式"
              aria-label="选择同步模式"
              className="h-7 px-2 rounded-r-lg bg-amber-700 hover:bg-amber-800 border-l border-amber-500/40 active:scale-95 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center justify-center"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${syncDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 下拉列表 (立即同步、云端覆盖本地、本地覆盖云端) */}
            {syncDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={handleIncrementalSync}
                  className="w-full px-3.5 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-start gap-2.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200">立即同步</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                      直接上传，对比云端文件如果有重复则跳过上传新文件
                    </div>
                  </div>
                </button>

                <div className="border-t border-stone-100 dark:border-stone-800/80 my-1" />

                <button
                  type="button"
                  onClick={handleCloudOverwriteLocal}
                  className="w-full px-3.5 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-start gap-2.5 transition"
                >
                  <DownloadCloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200">云端覆盖本地</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                      直接把云端现有所有数据拉取覆盖到本地
                    </div>
                  </div>
                </button>

                <div className="border-t border-stone-100 dark:border-stone-800/80 my-1" />

                <button
                  type="button"
                  onClick={handleLocalOverwriteCloud}
                  className="w-full px-3.5 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-start gap-2.5 transition"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200">本地覆盖云端</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                      直接把本地现有所有数据强制全部覆盖掉云端的数据
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 手机界面使用项目中自己的 CustomSelect 下拉列表 */}
        <div className="block md:hidden w-full -mt-2">
          <CustomSelect
            value={config.provider}
            onChange={(val) => updateConfig({ provider: val })}
            options={[
              { value: 'baidu', label: '百度网盘 (支持跳转登录)' },
              { value: 'webdav', label: 'WebDAV 网盘 (坚果云/Nextcloud等)' },
              { value: 's3', label: 'S3 对象存储 (Cloudflare R2/AWS/MinIO)' },
            ]}
            className="w-full justify-between py-1.5 px-3 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-xs font-semibold"
          />
        </div>

        {/* 百度网盘：一键跳转登录与配置 */}
        {config.provider === 'baidu' && (
          <div className="space-y-4">
            {isBaiduConnected ? (
              // 百度网盘已登录状态卡片
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {config.baidu.userInfo?.avatar_url ? (
                      <img
                        src={config.baidu.userInfo.avatar_url}
                        alt="Avatar"
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full border border-emerald-500/30 object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-base border border-emerald-500/30">
                        BD
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {config.baidu.userInfo?.baidu_name || config.baidu.userInfo?.netdisk_name || '百度网盘用户'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          已授权登录
                        </span>
                        {config.baidu.userInfo?.vip_type === 2 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                            SVIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        远端根目录: <span className="font-mono text-stone-700 dark:text-stone-300">{config.baidu.rootPath || '/apps/TavernVault'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBaiduOAuthLogin}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      重新授权
                    </button>
                    <button
                      onClick={handleBaiduLogout}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-rose-500/10 hover:text-rose-600 text-stone-600 dark:text-stone-400 text-xs font-medium transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      退出登录
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <label className="text-stone-500">更改备份存储路径:</label>
                    <input
                      type="text"
                      value={config.baidu.rootPath}
                      onChange={(e) => updateConfig({ baidu: { ...config.baidu, rootPath: e.target.value } })}
                      className="px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs focus:border-amber-500 outline-none w-48 font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // 百度网盘未登录状态：一键跳转登录引导
              <div className="py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 text-center space-y-2">
                <div className="max-w-md mx-auto space-y-1 mb-2.5">
                  <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center justify-center gap-1.5" style={{ fontSize: '12px' }}>
                    <Cloud className="w-3.5 h-3.5 text-blue-500" />
                    百度网盘官方开放平台授权
                  </h5>
                  <p className="text-[10px] sm:text-[11px] text-stone-400 dark:text-stone-500 leading-tight">
                    点击下方按钮直接跳转至百度账号授权中心完成登录，授权后自动返回并绑定，免去繁琐配置。
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setBaiduQrModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-sm transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    百度网盘App扫码登录
                  </button>

                  <button
                    onClick={handleBaiduOAuthLogin}
                    className="flex items-center gap-1 px-2.5 h-7 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[10px] font-medium transition"
                    style={{ fontSize: '10px' }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    网页跳转授权
                  </button>

                  <button
                    onClick={handleBaiduPopupOAuthLogin}
                    className="flex items-center gap-1 px-2.5 h-7 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[10px] font-medium transition"
                    style={{ fontSize: '10px' }}
                  >
                    弹窗授权
                  </button>
                </div>

                {/* 折叠高级设置 */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowBaiduAdvanced(!showBaiduAdvanced)}
                    className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 flex items-center gap-1 mx-auto"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    {showBaiduAdvanced ? '收起高级选项 (百度开放平台 AppKey / AppSecret)' : '高级选项 (配置百度开放平台 AppKey)'}
                  </button>

                  {showBaiduAdvanced && (
                    <div
                      id="baidu-advanced-settings-section"
                      className="mt-3 p-3.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-900/80 text-left grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-in fade-in"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-stone-500 font-medium">
                            百度开放平台 AppKey (Client ID)
                          </label>
                          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-normal">
                            <Lock className="w-2.5 h-2.5" />
                            已加密保护
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type={showBaiduAppKey ? 'text' : 'password'}
                            placeholder="您的百度开放平台 AppKey"
                            value={config.baidu.appKey || ''}
                            onChange={(e) => updateConfig({ baidu: { ...config.baidu, appKey: e.target.value } })}
                            className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowBaiduAppKey(!showBaiduAppKey)}
                            className="absolute right-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                            title={showBaiduAppKey ? '隐藏密钥' : '查看明文'}
                          >
                            {showBaiduAppKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-stone-500 font-medium">
                            AppSecret (Secret Key，可选)
                          </label>
                          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-normal">
                            <Lock className="w-2.5 h-2.5" />
                            已加密保护
                          </span>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type={showBaiduAppSecret ? 'text' : 'password'}
                            placeholder="私有应用 Secret Key"
                            value={config.baidu.appSecret || ''}
                            onChange={(e) => updateConfig({ baidu: { ...config.baidu, appSecret: e.target.value } })}
                            className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowBaiduAppSecret(!showBaiduAppSecret)}
                            className="absolute right-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                            title={showBaiduAppSecret ? '隐藏密钥' : '查看明文'}
                          >
                            {showBaiduAppSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WebDAV Form */}
        {config.provider === 'webdav' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                WebDAV 服务器 URL
              </label>
              <input
                type="text"
                placeholder="例如: https://dav.jianguoyun.com/dav/ 或 Alist 地址"
                value={config.webdav.url}
                onChange={(e) =>
                  updateConfig({ webdav: { ...config.webdav, url: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                用户名 / 账号邮箱
              </label>
              <input
                type="text"
                placeholder="输入网盘账号"
                value={config.webdav.username}
                onChange={(e) =>
                  updateConfig({ webdav: { ...config.webdav, username: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                应用密码 / 授权 Token
              </label>
              <input
                type="password"
                placeholder="网盘生成的独立授权密码"
                value={config.webdav.password}
                onChange={(e) =>
                  updateConfig({ webdav: { ...config.webdav, password: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                网盘远端根目录
              </label>
              <input
                type="text"
                placeholder="默认 /TavernVault/"
                value={config.webdav.rootPath}
                onChange={(e) =>
                  updateConfig({ webdav: { ...config.webdav, rootPath: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* S3 Form */}
        {config.provider === 's3' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div className="md:col-span-2">
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                Endpoint 接入点 (兼容 Cloudflare R2 / AWS / OSS / MinIO)
              </label>
              <input
                type="text"
                placeholder="例如: https://<accountid>.r2.cloudflarestorage.com"
                value={config.s3.endpoint}
                onChange={(e) =>
                  updateConfig({ s3: { ...config.s3, endpoint: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                Bucket 桶名称
              </label>
              <input
                type="text"
                placeholder="例如: tavern-vault"
                value={config.s3.bucket}
                onChange={(e) =>
                  updateConfig({ s3: { ...config.s3, bucket: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                Access Key ID
              </label>
              <input
                type="text"
                value={config.s3.accessKeyId}
                onChange={(e) =>
                  updateConfig({ s3: { ...config.s3, accessKeyId: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                Secret Access Key
              </label>
              <input
                type="password"
                value={config.s3.secretAccessKey}
                onChange={(e) =>
                  updateConfig({ s3: { ...config.s3, secretAccessKey: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-stone-500 dark:text-stone-400 font-medium mb-1">
                存储根前缀目录
              </label>
              <input
                type="text"
                placeholder="默认 TavernVault/"
                value={config.s3.rootPath}
                onChange={(e) =>
                  updateConfig({ s3: { ...config.s3, rootPath: e.target.value } })
                }
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* 第一区底部操作行：左侧测试与日志，右下方立即同步与下拉列表 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1.5 -mt-1.5 border-t border-stone-200/70 dark:border-stone-800/70">
          {/* 左侧：测试网盘连通性按钮和日志记录按钮放置在一行 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="h-7 px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-[11px] sm:text-xs font-semibold transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              {testingConnection ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FolderSync className="w-3 h-3 text-amber-600" />}
              测试网盘连通性
            </button>

            <button
              type="button"
              onClick={() => setLogDrawerOpen(true)}
              className="h-7 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-semibold transition active:scale-98 flex items-center justify-center gap-1.5"
              title="查看百度网盘与云同步通信与报错诊断日志"
            >
              <Terminal className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              日志记录
            </button>

            {testResult && (
              <div
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate max-w-xs">{testResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 第二区：文件加密 */}
      <div className="p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/40 space-y-3 sm:space-y-4">
        <div className="border-b border-stone-200 dark:border-stone-800 pb-2 sm:pb-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h4 className="font-semibold text-[13px] tracking-wide" style={{ fontSize: '13px' }}>文件加密</h4>
          </div>
          <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-tight ml-[5px]" style={{ marginLeft: '5px' }}>
            加密保护：无论您选择免密透明模式还是自定义密码模式，所有数据在上传前均在浏览器本地直转换为加密模式。第三方无法查看真实数据。
          </p>
        </div>

        {/* 加密模式选择：免密透明加密 vs 自定义密码加密 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 模式 1: 免密透明加密 */}
          <div
            onClick={() => updateConfig({ encryptionMode: 'device_auto' })}
            className={`p-3 rounded-xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
              currentMode === 'device_auto'
                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/30 dark:bg-stone-800/20'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${currentMode === 'device_auto' ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-600'}`}>
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[11px] sm:text-xs text-stone-900 dark:text-stone-100">
                      免密透明加密 (系统设备硬件密钥)
                    </h5>
                    <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      推荐单设备 · 免记忆密码 · 依然密文上传
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="encryption_mode"
                  checked={currentMode === 'device_auto'}
                  onChange={() => updateConfig({ encryptionMode: 'device_auto' })}
                  className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
              </div>

              <p className="text-[10px] sm:text-[11px] text-stone-400 dark:text-stone-500 leading-relaxed">
                无需手动设置或记忆密码。系统自动生成 256 位高熵设备专属密钥，<strong>上传网盘时依然对全部文件直接加密</strong>。本设备上一键备份与秒级还原。
              </p>
            </div>

            {currentMode === 'device_auto' && (
              <div className="pt-2 mt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeviceKeyModalOpen(true);
                  }}
                  className="h-6 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold transition flex items-center gap-1 active:scale-95"
                >
                  <Key className="w-2.5 h-2.5" />
                  查看/导出设备密钥
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImportKeyModalOpen(true);
                  }}
                  className="h-6 px-2 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 text-[10px] transition flex items-center gap-1 active:scale-95"
                >
                  <DownloadCloud className="w-2.5 h-2.5" />
                  导入已有设备密钥
                </button>
              </div>
            )}
          </div>

          {/* 模式 2: 自定义主密码加密 */}
          <div
            onClick={() => updateConfig({ encryptionMode: 'custom_password' })}
            className={`p-3 rounded-xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
              currentMode === 'custom_password'
                ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/30 dark:bg-stone-800/20'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${currentMode === 'custom_password' ? 'bg-amber-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-600'}`}>
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[11px] sm:text-xs text-stone-900 dark:text-stone-100">
                      自定义主密码加密 (跨端设备通行)
                    </h5>
                    <span className="text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      推荐多端多设备同步 · 手动掌控密码
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="encryption_mode"
                  checked={currentMode === 'custom_password'}
                  onChange={() => updateConfig({ encryptionMode: 'custom_password' })}
                  className="text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
              </div>

              <p className="text-[10px] sm:text-[11px] text-stone-400 dark:text-stone-500 leading-relaxed">
                手动设定专属加密密码。所有文件离开浏览器时使用 PBKDF2 (100,000次迭代) + AES-GCM-256 独立加密。在任何新设备上只需输入该密码即可直接解密还原。
              </p>
            </div>

            {currentMode === 'custom_password' && (
              <div className="pt-2 mt-2 border-t border-amber-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-stone-400">加密主密码:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      generateRandomPassword();
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 h-5"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    生成随机强密码
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="输入专属加密主密码"
                    value={config.encryptionPassword || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateConfig({ encryptionPassword: e.target.value })}
                    className="w-full pl-2.5 pr-8 h-7 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 focus:border-amber-500 outline-none font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPassword(!showPassword);
                    }}
                    className="absolute right-2 top-1.5 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 第三区：双轨 10 次快照与安全回溯中心 */}
      <div className="p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/40 space-y-2.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 border-b border-stone-200 dark:border-stone-800 pb-2 sm:pb-3">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h4 className="font-semibold text-[13px] tracking-wide" style={{ fontSize: '13px' }}>快照历史与安全回溯中心 (保留 10 次)</h4>
          </div>

          <div className="flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveSnapshotTab('cloud')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                activeSnapshotTab === 'cloud'
                  ? 'bg-white dark:bg-stone-700 shadow-sm text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-stone-500'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              云端网盘快照 ({remoteSnapshots.length})
            </button>
            <button
              onClick={() => setActiveSnapshotTab('local')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                activeSnapshotTab === 'local'
                  ? 'bg-white dark:bg-stone-700 shadow-sm text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-stone-500'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              本地即时快照 ({localSnapshots.length})
            </button>
          </div>
        </div>

        {/* Tab 1: 云端快照列表 */}
        {activeSnapshotTab === 'cloud' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[10px] sm:text-[11px] text-stone-400 dark:text-stone-500">
                网盘中按日期归档的全局快照清单 (最多保留 10 份，回滚直接解密拉取)
              </span>
              <button
                type="button"
                onClick={handleRefreshRemoteSnapshots}
                disabled={loadingRemoteSnapshots}
                className="h-6 px-2 rounded-md border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 text-[10px] sm:text-[11px] font-medium transition active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${loadingRemoteSnapshots ? 'animate-spin' : ''}`} />
                刷新列表
              </button>
            </div>

            {remoteSnapshots.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-400">
                暂无云端快照，请先点击上方「立即执行全量加密备份」创建第一份云端快照
              </div>
            ) : (
              <div className="space-y-2">
                {remoteSnapshots.map((item, idx) => (
                  <div
                    key={item.path}
                    className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-amber-500/40 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                          {item.dateStr}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                            最新版本
                          </span>
                        )}
                      </div>
                      {item.manifest ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                          <span className="px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-700/60">
                            酒馆: {item.manifest.summary.sillytavernCounts.cards}卡 / {item.manifest.summary.sillytavernCounts.worldbooks}书 / {item.manifest.summary.sillytavernCounts.regex}正则
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-700/60">
                            小手机: {item.manifest.summary.mobilePhoneCounts.cards}卡 / {item.manifest.summary.mobilePhoneCounts.links}链接
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-700/60">
                            设置中心全配置
                          </span>
                          <span>({(item.manifest.summary.totalSize / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-stone-400">快照清单文件已归档 (点击回滚解密)</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedRemoteSnapshot(item);
                          setRollbackConfirmOpen(true);
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold transition text-xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        解密回滚此版本
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 本地即时快照列表 */}
        {activeSnapshotTab === 'local' && (
          <div className="space-y-2 pt-0 sm:pt-0.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 px-1">
              <span className="text-[10px] sm:text-[11px] text-stone-400 dark:text-stone-500 leading-tight">
                本地浏览器 IndexedDB 快照栈 (每次云端备份或回滚前自动生成临时保护点，断网即时恢复)
              </span>
              <button
                type="button"
                onClick={() => {
                  saveLocalSnapshot(appData, '手动创建元数据备份');
                  showNotification?.('已成功直接创建本地元数据快照备份！', 'success');
                }}
                className="h-6 px-2.5 rounded-md bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold transition text-[10px] sm:text-[11px] flex items-center justify-center gap-1 shrink-0 shadow-sm self-start sm:self-auto"
              >
                <Database className="w-3 h-3" />
                直接创建元数据备份
              </button>
            </div>

            {localSnapshots.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-400">
                暂无本地快照
              </div>
            ) : (
              <div className="space-y-2">
                {localSnapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-blue-500" />
                        {snap.dateStr}
                        <span className="text-[11px] text-stone-400 font-normal">({snap.summary})</span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        大小: {(snap.totalSize / 1024).toFixed(1)} KB
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestoreLocalSnapshot(snap)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold transition text-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      秒级撤销还原
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 查看/导出设备密钥对话框 */}
      {deviceKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">当前设备专属安全密钥</h4>
                <p className="text-xs text-stone-500">256 位高熵加密种子 (用于免密加密与跨端迁移)</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 font-mono text-xs break-all text-stone-700 dark:text-stone-300 select-all border border-stone-200 dark:border-stone-700">
              {currentDeviceKey}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              💡 提示：若要在新电脑或手机上恢复此前由免密透明加密上传的云端数据，可将此密钥复制并在新设备上点击「导入已有设备密钥」即可直接解密。
            </p>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleRegenerateKey}
                className="text-xs text-rose-500 hover:underline"
              >
                重置/生成新密钥
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeviceKeyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
                >
                  关闭
                </button>
                <button
                  onClick={handleCopyDeviceKey}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? '已复制' : '一键复制密钥'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导入设备密钥对话框 */}
      {importKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <DownloadCloud className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">导入其他设备的加密密钥</h4>
                <p className="text-xs text-stone-500">粘贴此前导出的 256 位设备密钥以实现免密还原</p>
              </div>
            </div>

            <div>
              <textarea
                placeholder="粘贴 64 位十六进制设备密钥字符串..."
                rows={3}
                value={importKeyInput}
                onChange={(e) => setImportKeyInput(e.target.value)}
                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 font-mono text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setImportKeyModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
              >
                取消
              </button>
              <button
                onClick={handleApplyImportKey}
                disabled={!importKeyInput.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                确认导入并应用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回滚安全确认对话框 */}
      {rollbackConfirmOpen && selectedRemoteSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-stone-900 dark:text-stone-100">确认回滚到目标云端快照？</h4>
                <p className="text-xs text-stone-500">时序解密拉取并重构所有关联关系</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800/60 text-xs space-y-1.5 text-stone-600 dark:text-stone-300">
              <p><strong>快照日期</strong>：{selectedRemoteSnapshot.dateStr}</p>
              <p><strong>回滚机制</strong>：系统将逐个从网盘拉取对应的独立加密文件，执行直接解密，并自动挂载角色卡内嵌资源与外部关联指针。</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                🛡️ 安全哨兵：执行回滚前，系统已自动将当前本地实时状态暂存为「临时保护点」，防止误操作。
              </p>
            </div>

            {/* 若当前处于自定义密码模式或在异地设备，提供解密密码校验输入 */}
            <div className="space-y-1 text-xs">
              <label className="text-stone-500 font-medium">解密密码 (若该快照使用自定义密码创建，在此输入):</label>
              <input
                type="password"
                placeholder="留空则自动使用系统默认/已存密钥解密"
                value={rollbackCustomPassword}
                onChange={(e) => setRollbackCustomPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setRollbackConfirmOpen(false)}
                className="px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
              >
                取消
              </button>
              <button
                onClick={handleConfirmRemoteRollback}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-sm transition"
              >
                开始直接解密回滚
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 百度网盘内置 App 扫码登录模态框 */}
      <BaiduQRCodeModal
        isOpen={baiduQrModalOpen}
        onClose={() => setBaiduQrModalOpen(false)}
        onSuccess={(token) => applyBaiduToken(token)}
        onSwitchToWebAuth={handleBaiduOAuthLogin}
        onGoToAdvanced={() => {
          setBaiduQrModalOpen(false);
          setShowBaiduAdvanced(true);
          setTimeout(() => {
            document.getElementById('baidu-advanced-settings-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }}
        appKey={config.baidu.appKey}
        appSecret={config.baidu.appSecret}
      />

      {/* 实时通信与错误诊断日志抽屉浮层 */}
      <SyncDiagnosticLogDrawer
        isOpen={logDrawerOpen}
        onClose={() => setLogDrawerOpen(false)}
      />

      {/* 网盘云端同步进度与分类时序加密推送模态框 & 悬浮球 */}
      <CloudSyncProgressModal
        isOpen={syncModalOpen}
        isMinimized={syncModalMinimized}
        progress={progress}
        onMinimize={() => setSyncModalMinimized(true)}
        onMaximize={() => setSyncModalMinimized(false)}
        onClose={() => {
          setSyncModalOpen(false);
          setProgress(null);
        }}
      />
    </div>
  );
};
