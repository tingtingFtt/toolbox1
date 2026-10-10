import { flushSync } from 'react-dom';
import { TavernImportContext } from './hooks/TavernImportContext';
import { setTavernImportCheckpoint } from './utils/tavernImportPipeline';
import { useCardPayload } from './hooks/useCardPayload';
import { hydrateCard, hydrateCardAsset, hydrateCardBoundAssets } from './utils/largeCardStore';
import { ImportCenter } from './components/st/ImportCenter';
import { STQuickRepliesSection } from './components/st/STQuickRepliesSection';
import * as fflate from 'fflate';
import { connectTavernDirectory, scanTavernDirectory } from "./utils/tavernSync";
import { SettingsSection } from './components/sections/SettingsSection';
import { WorldBookSection } from './components/mobile/WorldBookSection';
import { StickersSection } from './components/mobile/StickersSection';
import { ExtrasAppSection } from './components/mobile/ExtrasAppSection';
import { FontsSection } from './components/sections/FontsSection';
import { ApiStorageSection } from './components/sections/ApiStorageSection';
import { NormalCardsSection } from './components/mobile/NormalCardsSection';
import { STPresetsSection } from './components/st/STPresetsSection';
import { reconcilePresetResources, syncPresetResources } from './utils/presetResources';
import { MobileLinksSection } from './components/mobile/MobileLinksSection';
import { BeautificationThemesSection } from './components/mobile/BeautificationThemesSection';
import { ChatMemesSection } from './components/mobile/ChatMemesSection';
import { UserPersonasSection } from './components/sections/UserPersonasSection';
import { BackgroundImagesSection } from './components/sections/BackgroundImagesSection';
import { CardCoversSection } from './components/sections/CardCoversSection';
import { STThemesSection } from './components/st/STThemesSection';
import { NewGroupModal, BottomSheetModal, UnifiedModal, DeleteConfirmationModal, ChoiceModal, ConfirmModal } from "./components/ui/UnifiedModal";
import { useImportEngine } from './hooks/useImportEngine';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TagEditor } from './components/ui/TagEditor';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { unzipSync, strFromU8 } from 'fflate';
import { DynamicStyleEngine } from './components/ui/DynamicStyleEngine';
import { InspectWorkspace } from './components/ui/InspectWorkspace';
import { BaseButton } from './components/ui/BaseButton';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BaseInput } from './components/ui/BaseInput';
import { BaseCard } from './components/ui/BaseCard';
import { Database, Menu, X, Code2, Cpu, Sun, Moon, Search, Plus, Trash2, FolderPlus, Edit3, Download, Upload, Home,
  Maximize2, ChevronDown, ChevronUp, Check, Image as ImageIcon, Tag, Folder, CheckSquare, Square,
  MoreHorizontal, RefreshCw, FileText, CheckCircle2, Circle, ArrowRightLeft, Move, Copy, Sliders, ZoomIn, FileCode,
  Save, Dices, QrCode, ArrowUpDown, Sparkles, Link2, HardDrive, Layers
, ExternalLink, Palette, AlertCircle, AlertTriangle, Info, Settings, History, RotateCcw, ArrowLeft, Book, BookOpen, Eye, Smartphone } from 'lucide-react';
import { getCardCoreSignature } from './utils/diffEngine';
import { CardEntry, CardAssociation, AppData, PhoneLink, ThemeEntry, PresetEntry, PluginEntry, NormalCardEntry, ApiEntry, ApiKeyItem, FontEntry, ExtraStoryEntry, StickerItem, StickerPackEntry, WorldBookEntry, ChatMemeEntry, STRegexEntry, ScriptEntry } from './types';
import {
  loadAppData, loadAppDataAsync, saveAppData, getCardDisplayName, getCardCreator, getCardDescription,
  getCardPersonality, getCardGreeting, getCardAlternateGreetings, getCardWorldBook,
  getCardRegex, getCardTags, getCurrentCardData, getCardSearchIndexString, injectBoundAssetsForExport, generateCardPngBlob, createZip,
  deleteCardsAndCascadeAssets, deleteCardSingleVersionAndCascadeAssets, normalizeResourceName, normalizeAssociationName,
  getPureVersionLabel
} from './utils';
import { parseCardFile, extractBundledAssets, estimateTokens, sortItemList, parseNormalCardFile } from './utils';
import { getPureCardDataForExport, injectPngTextChunk, scaleImage, processImageFile, fileToDataURL } from './utils';
import { HomeSection } from './components/sections/HomeSection';
import { STCardsSection } from './components/st/STCardsSection';
import { STPluginsSection } from './components/st/STPluginsSection';
import { STScriptsSection } from './components/st/STScriptsSection';
import { STWorldBooksSection } from './components/st/STWorldBooksSection';
import { STRegexSection } from './components/st/STRegexSection';
import { MobilePresetsSection } from './components/mobile/MobilePresetsSection';
import { MobileHtmlSection } from './components/mobile/MobileHtmlSection';
import { ChatLogsSection } from './components/sections/ChatLogsSection';
import { syncAllCardsToStData } from './utils';
import { BigDataExportModal } from './components/ui/BigDataExportModal';
import { GachaModal } from './components/ui/GachaModal';
import { GroupTagManager } from './components/ui/GroupTagManager';
import { compareCards, comparePresets, compareThemes, compareWorldBooks, compareRegexScripts, compareScripts, compareNormalCards, DiffResult, findMatchingCardAndVersion, CardMatchDetail } from './utils/diffEngine';
import { DuplicateConfirmModal, DuplicateAction } from './components/modals/DuplicateConfirmModal';
import { autoAssociateAllAssets, getAlternateCardFaces } from './utils/associationEngine';

import { ThemeDrawer } from './components/ui/ThemeDrawer';
import { AssetBindingModal } from './components/st/AssetBindingModal';
import { CustomSelect } from './components/ui/CustomSelect';
import { FullscreenDataModal } from './components/ui/FullscreenDataModal';
import { BatchImportProgressModal } from './components/modals/BatchImportProgressModal';
import { StagingVaultModal } from './components/modals/StagingVaultModal';
import { CardDetailModal } from './components/modals/CardDetailModal';
import { GlobalModals } from './components/modals/GlobalModals';
import { BatchImportProgressState, StagedDuplicateCard, ItemVersion } from './types';
import { createSafeJsonBlob, mergeImportFiles, triggerFileDownload } from './utils';
import {
  getActiveCustomPaletteId,
  getUserSavedPalettes,
  applyCustomPaletteCss,
} from './utils/themeCustomizer';



const PAGE_NAMES: Record<string, string> = {
  'home': '主页',
  'st-cards': 'ST 角色卡',
  'st-themes': 'ST 主题',
  'st-presets': 'ST 预设',
  'st-plugins': 'ST 插件',
  'st-scripts': 'ST 脚本',
  'st-worldbooks': 'ST 世界书',
  'st-regex': '正则脚本',
  'chat-logs': '聊天记录',
  'st-extras': '番外小剧场',
  'st-mobile': '小手机链接',
  'normal-cards': '普通角色卡',
  'worldbook': '小手机世界书',
  'themes': '小手机美化',
  'mobile-presets': '破限/预设',
  'mobile-html': 'HTML 管理',
  'chat-memes': '聊天表情',
  'stickers': '表情包图集',
  'extras-app': '番外小剧场',
  'fonts': '字体管理',
  'api-storage': 'API 存储',
  'settings': '系统设置',
};

export default function App() {
  // App State
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const appDataRef = useRef<AppData>(appData);
  appDataRef.current = appData;
  const appDataDirtyRef = useRef(false);
  const appDataHydratedRef = useRef(false);
  const [appDataHydrated, setAppDataHydrated] = useState(false);
  const [storageLoadError, setStorageLoadError] = useState('');
  
  const [showGroupTagManager, setShowGroupTagManager] = useState(false);
  const [isInspectMode, setIsInspectMode] = useState(false);
  useEffect(() => {
    const handleOpenGroupManager = () => setShowGroupTagManager(true);
    window.addEventListener('open-group-manager', handleOpenGroupManager);
    const handleQuickAddGroup = () => setShowNewGroupModal(true);
    window.addEventListener('open-group-manager-add', handleQuickAddGroup);
    return () => {
      window.removeEventListener('open-group-manager', handleOpenGroupManager);
      window.removeEventListener('open-group-manager-add', handleQuickAddGroup);
    };
  }, []);
  const buildGroupTagProps = () => {
    let title = '板块';
    let groupsKey = '';
    let tagsKey = '';
    let itemsKey = '';
    let groupField = 'category';

    switch (currentPage) {
      case 'st-cards': title = 'ST 角色卡'; groupsKey = 'groups'; tagsKey = 'cardTags'; itemsKey = 'cards'; groupField = 'group'; break;
      case 'st-themes': title = 'ST 主题'; groupsKey = 'themeCategories'; tagsKey = 'themeTags'; itemsKey = 'themes'; groupField = 'category'; break;
      case 'themes': title = '小手机美化'; groupsKey = 'beautificationCategories'; tagsKey = 'beautificationTags'; itemsKey = 'beautifications'; groupField = 'category'; break;
      case 'st-presets': title = 'ST 预设'; groupsKey = 'presetCategories'; tagsKey = 'presetTags'; itemsKey = 'presets'; groupField = 'category'; break;
      case 'st-plugins': title = 'ST 插件'; groupsKey = 'pluginCategories'; tagsKey = 'pluginTags'; itemsKey = 'plugins'; groupField = 'category'; break;
      case 'st-scripts': title = 'ST 脚本'; groupsKey = 'scriptCategories'; tagsKey = 'scriptTags'; itemsKey = 'scripts'; groupField = 'category'; break;
      case 'st-worldbooks': title = 'ST 世界书'; groupsKey = 'stWorldBookCategories'; tagsKey = 'stWorldBookTags'; itemsKey = 'stWorldBooks'; groupField = 'category'; break;
      case 'worldbook': title = '小手机世界书'; groupsKey = 'worldBookCategories'; tagsKey = 'worldBookTags'; itemsKey = 'worldBooks'; groupField = 'category'; break;
      case 'st-regex': title = '正则脚本'; groupsKey = 'stRegexCategories'; tagsKey = 'stRegexTags'; itemsKey = 'stRegexScripts'; groupField = 'category'; break;
      case 'chat-logs': title = '聊天记录'; groupsKey = 'chatLogCategories'; tagsKey = 'chatLogTags'; itemsKey = 'chatLogs'; groupField = 'category'; break;
      case 'st-extras': title = '番外小剧场'; groupsKey = 'extraStoryCategories'; tagsKey = 'extraStoryTags'; itemsKey = 'extraStories'; groupField = 'category'; break;
      case 'normal-cards': title = '普通角色卡'; groupsKey = 'normalCardCategories'; tagsKey = 'normalCardTags'; itemsKey = 'normalCards'; groupField = 'category'; break;
      case 'api-storage': title = 'API 存储'; groupsKey = 'apiCategories'; tagsKey = 'apiTags'; itemsKey = 'apiKeys'; groupField = 'category'; break;
      case 'fonts': title = '字体管理'; groupsKey = 'fontCategories'; tagsKey = 'fontTags'; itemsKey = 'fonts'; groupField = 'category'; break;
      case 'extras-app': title = '番外小剧场'; groupsKey = 'extraStoryCategories'; tagsKey = 'extraStoryTags'; itemsKey = 'extraStories'; groupField = 'category'; break;
      case 'stickers': title = '表情包图集'; groupsKey = 'stickerCategories'; tagsKey = 'stickerTags'; itemsKey = 'stickerPacks'; groupField = 'category'; break;
      case 'chat-memes': title = '聊天表情'; groupsKey = 'chatMemeCategories'; tagsKey = 'chatMemeTags'; itemsKey = 'chatMemes'; groupField = 'category'; break;
      default: return null;
    }

    let fixedGroups: string[] = ['默认'];
    if (currentPage === 'st-themes') {
      fixedGroups = ['默认', '整体美化包', '自定义 CSS 特效', '气泡样式', '全屏背景壁纸'];
    }

    return {
      title,
      groups: [...fixedGroups.filter(g => !((appData as any)[groupsKey] || ['默认']).includes(g)), ...((appData as any)[groupsKey] || ['默认'])],
      fixedGroups,
      onReorderGroups: (newGroups: string[]) => {
        updateAppData((prev: any) => {
          const res: any = { ...prev, [groupsKey]: newGroups };
          if (groupsKey === 'groups') res.cardCategories = newGroups;
          return res;
        });
      },
      tags: Array.from(new Set([
        ...((appData as any)[tagsKey] || []),
        ...((appData as any)[itemsKey] || []).flatMap((item: any) => Array.isArray(item.customTags) ? item.customTags : (Array.isArray(item.tags) ? item.tags : []))
      ])),
      onReorderTags: (newTags: string[]) => {
        updateAppData((prev: any) => {
          return { ...prev, [tagsKey]: newTags };
        });
      },
      items: (appData as any)[itemsKey] || [],
      groupField,
      onBatchChangeGroup: (itemIds: string[], targetGroup: string) => {
        updateAppData((prev: any) => {
          const list = prev[itemsKey] || [];
          const updated = list.map((item: any) => itemIds.includes(item.id) ? { ...item, [groupField]: targetGroup } : item);
          return { ...prev, [itemsKey]: updated };
        });
        showToast("已成功移动项目到目标分组", 'success');
      },
      onAddGroup: (name: string) => {
        updateAppData((prev: any) => {
          const newGroups = [...(prev[groupsKey] || ['默认']), name];
          const res: any = { ...prev, [groupsKey]: newGroups };
          if (groupsKey === 'groups') res.cardCategories = newGroups;
          return res;
        });
      },
      onRenameGroup: (oldName: string, newName: string) => {
        updateAppData((prev: any) => {
          const newGroups = (prev[groupsKey] || ['默认']).map((g: string) => g === oldName ? newName : g);
          const newItems = (prev[itemsKey] || []).map((item: any) => item[groupField] === oldName ? { ...item, [groupField]: newName } : item);
          const res: any = { ...prev, [groupsKey]: newGroups, [itemsKey]: newItems };
          if (groupsKey === 'groups') res.cardCategories = newGroups;
          return res;
        });
      },
      onDeleteGroup: (name: string, deleteItems: boolean) => {
        updateAppData((prev: any) => {
          const newGroups = (prev[groupsKey] || ['默认']).filter((g: string) => g !== name);
          let newItems = prev[itemsKey] || [];
          if (deleteItems) {
            newItems = newItems.filter((item: any) => item[groupField] !== name);
          } else {
            newItems = newItems.map((item: any) => item[groupField] === name ? { ...item, [groupField]: '默认' } : item);
          }
          const res: any = { ...prev, [groupsKey]: newGroups, [itemsKey]: newItems };
          if (groupsKey === 'groups') res.cardCategories = newGroups;
          return res;
        });
      },
      onDeleteMultipleGroups: (names: string[], deleteItems: boolean) => {
        updateAppData((prev: any) => {
          const newGroups = (prev[groupsKey] || ['默认']).filter((g: string) => !names.includes(g));
          let newItems = prev[itemsKey] || [];
          if (deleteItems) {
            newItems = newItems.filter((item: any) => !names.includes(item[groupField]));
          } else {
            newItems = newItems.map((item: any) => names.includes(item[groupField]) ? { ...item, [groupField]: '默认' } : item);
          }
          const res: any = { ...prev, [groupsKey]: newGroups, [itemsKey]: newItems };
          if (groupsKey === 'groups') res.cardCategories = newGroups;
          return res;
        });
        showToast("已成功移动项目到目标分组", 'success');
      },
      onAddTag: (name: string) => {
        updateAppData((prev: any) => ({ ...prev, [tagsKey]: [...(prev[tagsKey] || []), name] }));
      },
      onRenameTag: (oldName: string, newName: string) => {
        updateAppData((prev: any) => {
          const newTags = (prev[tagsKey] || []).map((t: string) => t === oldName ? newName : t);
          const newItems = (prev[itemsKey] || []).map((item: any) => {
            if (item.customTags?.includes(oldName)) {
              return { ...item, customTags: item.customTags.map((t: string) => t === oldName ? newName : t) };
            }
            return item;
          });
          return { ...prev, [tagsKey]: newTags, [itemsKey]: newItems };
        });
      },
      onDeleteTag: (name: string) => {
        updateAppData((prev: any) => {
          const newTags = (prev[tagsKey] || []).filter((t: string) => t !== name);
          const newItems = (prev[itemsKey] || []).map((item: any) => {
            if (item.customTags?.includes(name)) {
              return { ...item, customTags: item.customTags.filter((t: string) => t !== name) };
            }
            return item;
          });
          return { ...prev, [tagsKey]: newTags, [itemsKey]: newItems };
        });
      },
      onDeleteMultipleTags: (names: string[]) => {
        updateAppData((prev: any) => {
          const newTags = (prev[tagsKey] || []).filter((t: string) => !names.includes(t));
          const newItems = (prev[itemsKey] || []).map((item: any) => {
            if (item.customTags?.some((t: string) => names.includes(t))) {
              return { ...item, customTags: item.customTags.filter((t: string) => !names.includes(t)) };
            }
            return item;
          });
          return { ...prev, [tagsKey]: newTags, [itemsKey]: newItems };
        });
        showToast(`已批量删除 ${names.length} 个标签`, 'success');
      }
    };
  };

  const updateAppData = useCallback((newData: AppData | ((prev: AppData) => AppData)) => {
    setAppData((prev) => {
      const candidate = typeof newData === 'function' ? (newData as (prev: AppData) => AppData)(prev) : newData;
      const next = reconcilePresetResources(prev, candidate);
      appDataDirtyRef.current = true;
      return next;
    });
  }, []);

  // 保证 appData 变更后稳定持久化写入 IndexedDB / 本地存储（后台防抖安全存储）
  useEffect(() => {
    if (appDataHydrated && appDataDirtyRef.current) {
      const snapshot = appData;
      saveAppData(snapshot).then(saved => {
        if (saved) setAppData(prev => {
          if (prev !== snapshot) return prev;
          const stored = loadAppData();
          appDataDirtyRef.current = false;
          return stored;
        });
      });
    }
  }, [appData, appDataHydrated]);

  useEffect(() => {
    let cancelled = false;
    
    // Initial Hydration
    loadAppDataAsync().then((asyncData) => {
      if (cancelled) return;
      appDataHydratedRef.current = true;
      if (!appDataDirtyRef.current && asyncData) {
        const synced = syncPresetResources(syncAllCardsToStData(asyncData));
        appDataDirtyRef.current = true;
        setAppData(synced);
      }
      setAppDataHydrated(true);
    }).catch(error => { if (!cancelled) setStorageLoadError(error.message); });

    // Cross-tab sync
    const channel = new BroadcastChannel('tavern_vault_sync');
    channel.onmessage = (event) => {
      if (event.data === 'appData_updated') {
        loadAppDataAsync().then((asyncData) => {
          if (asyncData && !cancelled && !appDataDirtyRef.current) {
            const synced = syncPresetResources(syncAllCardsToStData(asyncData));
            setAppData(synced);
          }
        });
      }
    };

    return () => { 
      cancelled = true; 
      channel.close();
    };
  }, []);
  const [uiStyle, setUiStyle] = useState<'glass' | 'flat' | 'line-brown' | 'line-green'>(() => {
    return (localStorage.getItem('tavern_vault_style') as 'glass' | 'flat' | 'line-brown' | 'line-green') || 'flat';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('tavern_vault_theme') as 'light' | 'dark') || 'light';
  });
  const [flatTheme, setFlatTheme] = useState<string>(() => {
    return localStorage.getItem('tavern_vault_flat_theme') || 'wulan';
  });

  // 确保全局 DOM 节点属性与主题、风格状态无缝实时同步
  useEffect(() => {
    const isFlat = uiStyle === 'flat' || uiStyle === 'line-brown' || uiStyle === 'line-green' || !uiStyle;
    if (isFlat) {
      document.documentElement.classList.add('theme-flat');
      document.body.classList.add('theme-flat');
      document.documentElement.setAttribute('data-theme', flatTheme || 'wulan');
      document.body.setAttribute('data-theme', flatTheme || 'wulan');
    } else {
      document.documentElement.classList.remove('theme-flat');
      document.body.classList.remove('theme-flat');
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
  }, [uiStyle, theme, flatTheme]);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default collapsed
  const [currentPage, setCurrentPage] = useState('home');
  const [settingsInitialTab, setSettingsInitialTab] = useState<'scan' | 'theme' | 'api' | 'storage' | 'about'>('scan');

  // Search, Filter & Grouping
  const [searchQuery, setSearchQuery] = useState('');
  const [currentGroup, setCurrentGroup] = useState('全部分组');
  const [cardTagFilter, setCardTagFilter] = useState<string[]>([]); // '全部' shows all cards
  const [themeTagsFilter, setThemeTagsFilter] = useState<string[]>([]);
  const [presetTagsFilter, setPresetTagsFilter] = useState<string[]>([]);
  const [beautificationTagsFilter, setBeautificationTagsFilter] = useState<string[]>([]);
  const [worldBookTagsFilter, setWorldBookTagsFilter] = useState<string[]>([]);
  const [chatMemeTagsFilter, setChatMemeTagsFilter] = useState<string[]>([]);
  const [stickerTagsFilter, setStickerTagsFilter] = useState<string[]>([]);
  const [extraStoryTagsFilter, setExtraStoryTagsFilter] = useState<string[]>([]);
  const [fontTagsFilter, setFontTagsFilter] = useState<string[]>([]);
  const [normalCardTagsFilter, setNormalCardTagsFilter] = useState<string[]>([]);
  const [apiTagsFilter, setApiTagsFilter] = useState<string[]>([]);

  // Global Delete Confirmation State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirmAsync = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        message,
        resolve,
      });
    });
  };

  // Global Choice Dialog State
  const [choiceDialog, setChoiceDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    options: { id: string; label: string; description?: string }[];
    resolve: (value: string | null) => void;
  } | null>(null);

  const askChoiceAsync = (title: string, message: React.ReactNode, options: { id: string; label: string; description?: string }[]): Promise<string | null> => {
    return new Promise((resolve) => {
      setChoiceDialog({
        isOpen: true,
        title,
        message,
        options,
        resolve,
      });
    });
  };

  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemCount: number;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '确认删除',
    message: '',
    itemCount: 1,
    onConfirm: () => {}
  });

  const requestDelete = (message: string, itemCount: number, onConfirm: () => void) => {
    setDeleteConfirmConfig({
      isOpen: true,
      title: '确认删除',
      message,
      itemCount,
      onConfirm
    });
  };

  const [batchMode, setBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  // 角色卡分页显示：存有成百上千张卡时，一次性把全部卡片渲染进 DOM 会导致页面严重卡顿，
  // 这里只渲染当前可见的一部分，滚动到底部自动加载更多。
  const CARD_PAGE_SIZE = 90;
  const [cardVisibleCount, setCardVisibleCount] = useState(CARD_PAGE_SIZE);
  const cardLoadMoreRef = useRef<HTMLDivElement>(null);

  // Modals State
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'versions' | 'links' | 'personality' | 'greetings' | 'worldbook' | 'regex' | 'qr' | 'raw' | 'extras'>('overview');
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);

  const originalDetailCardRef = useRef<CardEntry | null>(null);

  const [customGreetingUsername, setCustomGreetingUsername] = useState('');
  const handleCancelCardEdit = useCallback(() => {

    setDetailCardId(null);
    setPreviewVersionId(null);
    setCustomGreetingUsername('');
  }, []);

  // Single Version Delete State
  const [versionToDelete, setVersionToDelete] = useState<{
    cardId: string;
    cardName: string;
    versionId: string;
    versionLabel: string;
    importedAt?: number;
    data: any;
    changeSummary?: string;
  } | null>(null);
  const [deleteAssociatedAssetsWithVersion, setDeleteAssociatedAssetsWithVersion] = useState<boolean>(true);

  const handleConfirmDeleteVersion = () => {
    if (!versionToDelete) return;
    const { cardId, versionId, versionLabel } = versionToDelete;
    const result = deleteCardSingleVersionAndCascadeAssets(
      cardId,
      versionId,
      deleteAssociatedAssetsWithVersion,
      appData
    );

    updateAppData(result.updatedAppData);

    const deletedInfo: string[] = [];
    if (result.deletedAssetCounts.worldbooks > 0) deletedInfo.push(`${result.deletedAssetCounts.worldbooks} 个世界书`);
    if (result.deletedAssetCounts.worldbookSnapshots > 0) deletedInfo.push(`${result.deletedAssetCounts.worldbookSnapshots} 个世界书历史快照`);
    if (result.deletedAssetCounts.scripts > 0) deletedInfo.push(`${result.deletedAssetCounts.scripts} 个脚本`);
    if (result.deletedAssetCounts.regexes > 0) deletedInfo.push(`${result.deletedAssetCounts.regexes} 个正则`);

    let msg = `已成功删除历史版本 ${versionLabel}`;
    if (deletedInfo.length > 0) {
      msg += `，并清理关联的 ${deletedInfo.join('、')}`;
    }
    showToast(msg, 'success');
    setVersionToDelete(null);
  };

  // Asset Binding Modal & Handlers
  const [assetBindingModalOpen, setAssetBindingModalOpen] = useState(false);
  const [assetBindingModalType, setAssetBindingModalType] = useState<'worldbook' | 'regex' | 'script'>('worldbook');
  const [assetBindingReplacesId, setAssetBindingReplacesId] = useState<string | undefined>(undefined);

  const handleOpenBindAssetModal = (type: 'worldbook' | 'regex' | 'script', replacesId?: string) => {
    setAssetBindingModalType(type);
    setAssetBindingReplacesId(replacesId);
    setAssetBindingModalOpen(true);
  };

  const handleConfirmBindAsset = async (
    type: 'worldbook' | 'regex' | 'script',
    assetId: string,
    versionId: string,
    assetName: string,
    versionLabel: string,
    replacesAssetId?: string
  ) => {
    if (replacesAssetId) {
      const oldName = (type === 'worldbook'
        ? appData.stWorldBooks?.find(w => w.id === replacesAssetId)?.name
        : type === 'regex'
        ? appData.stRegexScripts?.find(r => r.id === replacesAssetId)?.scriptName
        : appData.scripts?.find(s => s.id === replacesAssetId)?.name) || '原资产';

      const confirmed = await confirmAsync(
        `确定要将角色卡绑定的【${oldName}】换绑为【${assetName}】(版本: ${versionLabel}) 吗？`
      );
      if (!confirmed) return;
    }

    updateAppData(prev => {
      const newCards = (prev.cards || []).map(c => {
        if (c.id !== detailCardId) return c;
        const updated = { ...c };
        const boundAssetVersions = { ...(updated.boundAssetVersions || {}) };

        if (type === 'worldbook') {
          let list = [...(updated.boundWorldBooks || [])];
          if (replacesAssetId) list = list.filter(id => id !== replacesAssetId);
          if (!list.includes(assetId)) list.push(assetId);
          updated.boundWorldBooks = list;
        } else if (type === 'regex') {
          let list = [...(updated.boundRegexes || [])];
          if (replacesAssetId) list = list.filter(id => id !== replacesAssetId);
          if (!list.includes(assetId)) list.push(assetId);
          updated.boundRegexes = list;
        } else if (type === 'script') {
          let list = [...(updated.boundScripts || [])];
          if (replacesAssetId) list = list.filter(id => id !== replacesAssetId);
          if (!list.includes(assetId)) list.push(assetId);
          updated.boundScripts = list;
        }

        if (replacesAssetId && boundAssetVersions[replacesAssetId]) {
          delete boundAssetVersions[replacesAssetId];
        }

        if (versionId === 'latest') {
          delete boundAssetVersions[assetId];
        } else {
          boundAssetVersions[assetId] = versionId;
        }

        updated.boundAssetVersions = boundAssetVersions;
        return updated;
      });

      return { ...prev, cards: newCards };
    });

    showToast(`已${replacesAssetId ? '换绑' : '绑定'}【${assetName}】(${versionLabel})`, 'success');
  };

  const handleUnbindAsset = async (
    type: 'worldbook' | 'regex' | 'script',
    assetId: string,
    assetName: string
  ) => {
    const activeCard = appData.cards.find(c => c.id === detailCardId);
    const cardName = activeCard?.name || '当前角色卡';
    const cardVer = (activeCard as any)?.activeVersionLabel || '当前版本';

    const confirmed = await confirmAsync(
      `确定要从角色卡「${cardName}」(${cardVer}) 中解除绑定【${assetName}】吗？\n解除绑定后，当前角色卡版本将不再携带此资产数据。`
    );
    if (!confirmed) return;

    updateAppData(prev => {
      const newCards = (prev.cards || []).map(c => {
        if (c.id !== detailCardId) return c;
        const updated = { ...c };
        if (type === 'worldbook') {
          updated.boundWorldBooks = (updated.boundWorldBooks || []).filter(id => id !== assetId);
        } else if (type === 'regex') {
          updated.boundRegexes = (updated.boundRegexes || []).filter(id => id !== assetId);
        } else if (type === 'script') {
          updated.boundScripts = (updated.boundScripts || []).filter(id => id !== assetId);
        }

        if (updated.boundAssetVersions && updated.boundAssetVersions[assetId]) {
          const newVerMap = { ...updated.boundAssetVersions };
          delete newVerMap[assetId];
          updated.boundAssetVersions = newVerMap;
        }
        return updated;
      });
      return { ...prev, cards: newCards };
    });

    showToast(`已解除绑定【${assetName}】`, 'success');
  };

  const handleChangeBoundAssetVersion = async (
    assetId: string,
    assetName: string,
    currentVerLabel: string,
    targetVerId: string,
    targetVerLabel: string
  ) => {
    const confirmed = await confirmAsync(
      `确定要将角色卡绑定的【${assetName}】版本从「${currentVerLabel}」切换为「${targetVerLabel}」吗？`
    );
    if (!confirmed) return;

    updateAppData(prev => {
      const newCards = (prev.cards || []).map(c => {
        if (c.id !== detailCardId) return c;
        const boundAssetVersions = { ...(c.boundAssetVersions || {}) };
        if (targetVerId === 'latest') {
          delete boundAssetVersions[assetId];
        } else {
          boundAssetVersions[assetId] = targetVerId;
        }
        return {
          ...c,
          boundAssetVersions
        };
      });
      return { ...prev, cards: newCards };
    });

    showToast(`已将【${assetName}】绑定版本切换为 ${targetVerLabel}`, 'success');
  };



  // Sorting States across sections
  const [homeCardViewMode, setHomeCardViewMode] = useState<"grid-3" | "grid-4" | "grid-5" | "list">(() => {
    return (localStorage.getItem("tavern_vault_home_card_view_mode") as any) || "grid-5";
  });
  useEffect(() => {
    localStorage.setItem("tavern_vault_home_card_view_mode", homeCardViewMode);
  }, [homeCardViewMode]);

  const [stCardViewMode, setStCardViewMode] = useState<"grid-3" | "grid-4" | "grid-5" | "list">(() => {
    return (localStorage.getItem("tavern_vault_st_card_view_mode") as any) || "grid-5";
  });
  useEffect(() => {
    localStorage.setItem("tavern_vault_st_card_view_mode", stCardViewMode);
  }, [stCardViewMode]);

  const [cardSortOrder, setCardSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [themeSortOrder, setThemeSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [presetSortOrder, setPresetSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [pluginSortOrder, setPluginSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [normalCardSortOrder, setNormalCardSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [worldBookSortOrder, setWorldBookSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [extraStorySortOrder, setExtraStorySortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [fontSortOrder, setFontSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [apiSortOrder, setApiSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [beautificationSortOrder, setBeautificationSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');

  // Random Card Gacha State
  const [gachaCard, setGachaCard] = useState<CardEntry | null>(null);
  const [isGachaSpinning, setIsGachaSpinning] = useState(false);
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);

  // Add Alternate Greeting Modal State
  const [newAltGreetingInputText, setNewAltGreetingInputText] = useState('');
  const [showAddAltGreetingModal, setShowAddAltGreetingModal] = useState(false);

  const applyCustomGreetingUsername = (text: string, username = customGreetingUsername) => {
    if (!username.trim()) return text;
    return String(text || '').replace(/\{\{user\}\}/gi, username);
  };

  const restoreCustomGreetingUsername = (text: string, username = customGreetingUsername) => {
    const name = username.trim();
    if (!name) return text;
    return String(text || '').split(name).join('{{user}}');
  };


  // QR Modal & Input Ref
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const cardQrFileInputRef = useRef<HTMLInputElement>(null);
  const cardWorldBookImportFileInputRef = useRef<HTMLInputElement>(null);
  const [showQrImportModal, setShowQrImportModal] = useState(false);
  const [qrInputText, setQrInputText] = useState('');
  const [qrSearchQuery, setQrSearchQuery] = useState('');
  const [cardRegexSearchQuery, setCardRegexSearchQuery] = useState('');
  const [cardSectionImportModal, setCardSectionImportModal] = useState<'worldbook' | 'regex' | 'qr' | null>(null);
  const [cardSectionImportMode, setCardSectionImportMode] = useState<'single' | 'all'>('single');
  const [cardSectionImportPendingFile, setCardSectionImportPendingFile] = useState<File | null>(null);
  const [editingCardRegex, setEditingCardRegex] = useState<{ index: number; scriptName: string; findRegex: string; replaceString: string } | null>(null);

  // ST 角色卡关联状态：仅允许作者 + 角色名同时相同的卡片互相关联
  const [associationTargetId, setAssociationTargetId] = useState('');
  const [associationNote, setAssociationNote] = useState('');
  const [associationPrimary, setAssociationPrimary] = useState(false);
  const [editingQrItem, setEditingQrItem] = useState<{ index: number; item: any } | null>(null);
  const [cardWorldBookSearchQuery, setCardWorldBookSearchQuery] = useState('');
  const [jsonWorldBookSearchQuery, setJsonWorldBookSearchQuery] = useState('');
  const [showJsonWorldBookImportPreview, setShowJsonWorldBookImportPreview] = useState(false);
  const [pendingJsonWorldBook, setPendingJsonWorldBook] = useState<any | null>(null);
  const [normalZipPreview, setNormalZipPreview] = useState<{ fileName: string; files: { name: string; size: number; content: string; selected: boolean }[] } | null>(null);
  // 移动端批量上传队列：部分 Android 文件选择器会忽略 multiple，允许连续选择后一次性导入。
  const [batchUploadKind, setBatchUploadKind] = useState<'stickers' | 'worldbook' | 'extras' | 'fonts' | null>(null);
  const [batchUploadFiles, setBatchUploadFiles] = useState<File[]>([]);
  const batchUploadFileInputRef = useRef<HTMLInputElement>(null);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isBigDataExportModalOpen, setIsBigDataExportModalOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [bigDataExportInitialScope, setBigDataExportInitialScope] = useState<'all' | 'custom'>('all');
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  // Batch Import Progress & Floating Ball State
  const [batchImportProgress, setBatchImportProgress] = useState<BatchImportProgressState | null>(null);
  const [showStagingVaultModal, setShowStagingVaultModal] = useState(false);
  const handleOpenStagingVault = useCallback(() => setShowStagingVaultModal(true), []);
  // 当前板块独立导入/导出
  const sectionImportFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingSection, setIsImportingSection] = useState(false);

  const openBatchUpload = (kind: 'stickers' | 'worldbook' | 'extras' | 'fonts') => {
    if (kind === 'stickers') stickerFileInputRef.current?.click();
    else if (kind === 'worldbook') worldBookFileInputRef.current?.click();
    else if (kind === 'extras') extraStoryFileInputRef.current?.click();
    else if (kind === 'fonts') fontFileInputRef.current?.click();
  };

  const batchUploadAccept: Record<'stickers' | 'worldbook' | 'extras' | 'fonts', string> = {
    stickers: '.docx,.txt,.json',
    worldbook: '.docx,.txt,.json',
    extras: '.docx,.txt',
    fonts: '.ttf,.otf,.woff,.woff2',
  };

  const handleBatchUploadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []) as File[];
    if (selected.length) {
      setBatchUploadFiles((prev) => {
        const merged = [...prev];
        for (const file of selected) {
          const exists = merged.some((x) => x.name === file.name && x.size === file.size && x.lastModified === file.lastModified);
          if (!exists) merged.push(file);
        }
        return merged;
      });
    }
    e.target.value = '';
  };

  const removeBatchUploadFile = (index: number) => {
    setBatchUploadFiles((prev) => prev.filter((_: any, i: number) => i !== index));
  };

  const confirmBatchUpload = async () => {
    const files = [...batchUploadFiles];
    const kind = batchUploadKind;
    if (!kind || !files.length) return;
    setBatchUploadKind(null);
    setBatchUploadFiles([]);
    if (kind === 'fonts') await processFontFiles(files);
    else if (kind === 'extras') await processExtraStoryFiles(files);
    else if (kind === 'stickers') await processStickerFiles(files);
    else if (kind === 'worldbook') {
      for (const file of files) {
        await processWorldBookFileImport([file]);
        if (file.name.toLowerCase().endsWith('.json')) break;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  };

  const handleDrawRandomCard = () => {
    const hasStCards = appData.cards && appData.cards.length > 0;
    const hasNormalCards = appData.normalCards && appData.normalCards.length > 0;

    if (!hasStCards && !hasNormalCards) {
      setGachaCard(null);
      setIsGachaModalOpen(true);
      return;
    }

    if (hasStCards) {
      const randomIndex = Math.floor(Math.random() * appData.cards.length);
      setGachaCard(appData.cards[randomIndex]);
    } else if (appData.normalCards && appData.normalCards.length > 0) {
      const nc = appData.normalCards[Math.floor(Math.random() * appData.normalCards.length)];
      setGachaCard({
        id: nc.id,
        name: nc.charName || nc.fileName || '未知角色',
        category: nc.category || '普通卡',
        group: nc.category || '普通卡',
        coverImage: nc.coverImage || null,
        description: nc.description || nc.content || '',
        version: '1.0',
        createdAt: nc.createdAt || Date.now(),
        updatedAt: nc.updatedAt || Date.now(),
        rawData: {
          data: {
            name: nc.charName || nc.fileName || '未知角色',
            description: nc.description || nc.content || '',
            first_mes: nc.firstMes || '你好！',
            creator: nc.creator || nc.author || '未知作者',
            tags: nc.tags || [],
          }
        }
      } as unknown as CardEntry);
    }
    setIsGachaModalOpen(true);
  };
  const handleDrawRandomNormalCard = () => {
    if (!appData.normalCards || appData.normalCards.length === 0) {
      if (appData.cards && appData.cards.length > 0) {
        handleDrawRandomCard();
        return;
      }
      setGachaCard(null);
      setIsGachaModalOpen(true);
      return;
    }
    const nc = appData.normalCards[Math.floor(Math.random() * appData.normalCards.length)];
    setGachaCard({
      id: nc.id,
      name: nc.charName || nc.fileName || '未知角色',
      category: nc.category || '普通卡',
      group: nc.category || '普通卡',
      coverImage: nc.coverImage || null,
      description: nc.description || nc.content || '',
      version: '1.0',
      createdAt: nc.createdAt || Date.now(),
      updatedAt: nc.updatedAt || Date.now(),
      rawData: {
        data: {
          name: nc.charName || nc.fileName || '未知角色',
          description: nc.description || nc.content || '',
          first_mes: nc.firstMes || '你好！',
          creator: nc.creator || nc.author || '未知作者',
          tags: nc.tags || [],
        }
      }
    } as unknown as CardEntry);
    setIsGachaModalOpen(true);
  };

  const downloadJsonFile = (fileName: string, data: any) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const finalName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    triggerFileDownload(blob, finalName);
  };

  // 导出文件命名统一使用 toolbox-YYYY-MM-DD 样式。
  const formatDateForFileName = (date: Date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /**
   * 将大数组拆成若干个较小的 JSON.stringify 片段，拼成合法的 JSON 数组文本片段列表。
   * 避免在导出成百上千张角色卡（含大量 base64 封面图）时，对整个数组一次性调用
   * JSON.stringify 拼出一个巨大的单一字符串——那样极易触发 "Invalid string length"
   * 或占用双倍以上内存，导致页面卡死甚至崩溃。
   */
  const arrayToJsonParts = (arr: any[] | undefined, chunkSize = 150): string[] => {
    if (!Array.isArray(arr) || arr.length === 0) return ['[]'];
    const parts: string[] = ['['];
    for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.slice(i, i + chunkSize);
      const chunkJson = JSON.stringify(chunk);
      // 去掉这一小段自身的 [ ]，只保留内部内容，再用逗号和其他片段拼接。
      const inner = chunkJson.slice(1, -1);
      if (i > 0) parts.push(',');
      parts.push(inner);
    }
    parts.push(']');
    return parts;
  };

  // 数组型字段超过这个长度时才分片处理，小分类列表直接整体 stringify 即可。
  const LARGE_ARRAY_THRESHOLD = 150;

  const handleExportFullBackup = () => {
    setBigDataExportInitialScope('all');
    setIsBigDataExportModalOpen(true);
  };

  const normalizeRegexScriptsFromJson = (json: any): any[] => {
    if (Array.isArray(json)) return json;
    if (json && typeof json === 'object') {
      if (Array.isArray(json.regex_scripts)) return json.regex_scripts;
      if (Array.isArray(json.regexes)) return json.regexes;
      if (Array.isArray(json.extensions?.regex_scripts)) return json.extensions.regex_scripts;
      if (Array.isArray(json.data?.extensions?.regex_scripts)) return json.data.extensions.regex_scripts;
      if (json.findRegex || json.find_regex || json.pattern || json.scriptName || json.script_name || json.name) return [json];
    }
    return [];
  };

  const normalizeWorldBookEntriesFromJson = (json: any): { book: any; entries: any[] } => {
    // 兼容常见世界书 JSON：
    // 1) character_book.entries / data.character_book.entries
    // 2) entries 数组
    // 3) SillyTavern 风格的 entries 对象：{ "0": {...}, "1": {...} }
    // 4) data.entries / world_info.entries 等嵌套结构
    // 5) 单条 entry 或直接传入 entry 数组
    const asEntryArray = (value: any): any[] => {
      if (Array.isArray(value)) return value.filter((v) => v && typeof v === 'object');
      if (value && typeof value === 'object') {
        // 世界书常见的 keyed entries 对象，Object.values 会保持 JSON 中的键顺序。
        const values = Object.values(value);
        if (values.length && values.every((v: any) => v && typeof v === 'object')) return values;
      }
      return [];
    };

    const looksLikeEntry = (value: any) => !!(value && typeof value === 'object' && (
      'content' in value || 'comment' in value || 'key' in value || 'keys' in value ||
      'keysecondary' in value || 'uid' in value || 'position' in value || 'constant' in value
    ));

    const findEntries = (root: any): { book: any; entries: any[] } | null => {
      if (!root || typeof root !== 'object') return null;

      const candidates = [
        root?.character_book,
        root?.data?.character_book,
        root?.world_book,
        root?.data?.world_book,
        root?.world_info,
        root?.data?.world_info,
        root,
      ].filter(Boolean);

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        for (const key of ['entries', 'worldEntries', 'world_entries', 'items']) {
          if (candidate[key] !== undefined) {
            const entries = asEntryArray(candidate[key]);
            if (entries.length) return { book: candidate, entries };
          }
        }
      }

      // 有些导出会把 entries 再包一层 data / book。
      for (const nested of [root?.data, root?.book, root?.data?.book]) {
        if (!nested || typeof nested !== 'object') continue;
        const result = findEntries(nested);
        if (result?.entries?.length) return result;
      }

      if (looksLikeEntry(root)) return { book: { entries: [root] }, entries: [root] };
      return null;
    };

    if (Array.isArray(json)) return { book: { entries: json }, entries: json };

    const found = findEntries(json);
    if (found) return found;

    // 最后的兼容：某些文件直接是 {"0": entry, "1": entry}。
    if (json && typeof json === 'object') {
      const values = asEntryArray(json);
      if (values.length && values.some(looksLikeEntry)) return { book: { entries: values }, entries: values };
    }

    return { book: json && typeof json === 'object' ? json : { entries: [] }, entries: [] };
  };

  const normalizeQrDocument = (json: any) => {
    if (!json || typeof json !== 'object' || Array.isArray(json) || !Array.isArray(json.qrList)) {
      throw new Error('不是有效的 QR JSON：缺少 qrList 数组');
    }
    if (json.version !== undefined && Number(json.version) !== 2) {
      throw new Error(`暂不支持 QR version ${json.version}`);
    }
    return {
      ...json,
      version: Number(json.version || 2),
      name: json.name || '未命名 QR',
      qrList: json.qrList.map((item: any, index: number) => ({
        ...item,
        id: item?.id ?? index + 1,
      })),
      idIndex: Number(json.idIndex || json.qrList.length || 0),
    };
  };

  const saveCardQrDocument = (doc: any) => {
    if (!activeDetailCard) return;
    const normalized = normalizeQrDocument(doc);
    const updatedCards = appData.cards.map((c) =>
      c.id === activeDetailCard.id
        ? { ...c, qrData: normalized, edited: true, updatedAt: Date.now() }
        : c
    );
    updateAppData({ ...appData, cards: updatedCards });
  };

  const addManualQr = () => {
    const current = activeDetailCard?.qrData ? normalizeQrDocument(activeDetailCard.qrData) : { version: 2, name: '', qrList: [], idIndex: 0 };
    const nextId = Math.max(0, ...(current.qrList || []).map((x: any) => Number(x.id) || 0)) + 1;
    const item = {
      id: nextId,
      showLabel: false,
      label: '新 QR',
      title: '',
      message: '',
      contextList: [],
      preventAutoExecute: true,
      isHidden: false,
      executeOnStartup: false,
      executeOnUser: false,
      executeOnAi: false,
      executeOnChatChange: false,
      executeOnGroupMemberDraft: false,
      executeOnNewChat: false,
      executeBeforeGeneration: false,
      automationId: '',
    };
    const next = { ...current, qrList: [...current.qrList, item], idIndex: nextId };
    saveCardQrDocument(next);
    setEditingQrItem({ index: next.qrList.length - 1, item });
  };

  const saveEditedQrItem = () => {
    if (!activeDetailCard || !editingQrItem) return;
    const current = normalizeQrDocument(activeDetailCard.qrData || { version: 2, name: '', qrList: [], idIndex: 0 });
    const qrList = [...current.qrList];
    qrList[editingQrItem.index] = editingQrItem.item;
    saveCardQrDocument({ ...current, qrList });
    setEditingQrItem(null);
    showToast('QR 已保存', 'success');
  };

  const deleteCardQrItem = (index: number) => {
    if (!activeDetailCard) return;
    const current = normalizeQrDocument(activeDetailCard.qrData || { version: 2, name: '', qrList: [], idIndex: 0 });
    if (!current.qrList[index]) return;
    const label = current.qrList[index]?.label || current.qrList[index]?.title || `QR #${index + 1}`;
    const qrList = current.qrList.filter((_: any, i: number) => i !== index);
    saveCardQrDocument({ ...current, qrList });
    if (editingQrItem?.index === index) setEditingQrItem(null);
    showToast(`已删除 QR：${label}`, 'success');
  };

  const saveCardRegexList = (list: any[]) => {
    if (!activeDetailCard) return;
    const updatedCards = appData.cards.map((c) =>
      c.id === activeDetailCard.id
        ? { ...c, editHistory: { ...c.editHistory, regex_scripts: list }, edited: true, updatedAt: Date.now() }
        : c
    );
    updateAppData({ ...appData, cards: updatedCards });
  };

  const saveCardWorldBook = (book: any) => {
    if (!activeDetailCard) return;
    const updatedCards = appData.cards.map((c) =>
      c.id === activeDetailCard.id
        ? { ...c, editHistory: { ...c.editHistory, character_book: book }, edited: true, updatedAt: Date.now() }
        : c
    );
    updateAppData({ ...appData, cards: updatedCards });
  };


  const importQrJsonText = (text: string, mode: 'single' | 'all' = 'all') => {
    try {
      const parsed = normalizeQrDocument(JSON.parse(text));
      if (!activeDetailCard) {
        showToast('请先打开角色卡详情', 'error');
        return;
      }
      const current = activeDetailCard.qrData && typeof activeDetailCard.qrData === 'object'
        ? normalizeQrDocument(activeDetailCard.qrData)
        : null;
      const next = mode === 'all'
        ? parsed
        : {
            ...(current || parsed),
            name: current?.name || parsed.name,
            qrList: [...(current?.qrList || []), parsed.qrList[0]].filter(Boolean),
            idIndex: Math.max(Number(current?.idIndex || 0), Number(parsed.qrList[0]?.id || 0)),
          };
      saveCardQrDocument(next);
      setShowQrImportModal(false);
      setQrInputText('');
      showToast(`QR ${mode === 'all' ? '全部覆盖' : '单条追加'}成功，共 ${next.qrList.length} 条`, 'success');
    } catch (err: any) {
      showToast('QR JSON 导入失败：' + (err?.message || '格式错误'), 'error');
    }
  };

  const handleQrFileImport = async (file: File, mode: 'single' | 'all' = 'all') => {
    try {
      const text = await file.text();
      importQrJsonText(text, mode);
    } catch (err: any) {
      showToast('读取 QR 文件失败：' + (err?.message || '未知错误'), 'error');
    }
  };

  const handleCardSectionFileImport = async (file: File, section: 'worldbook' | 'regex' | 'qr', mode: 'single' | 'all') => {
    if (!activeDetailCard) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (section === 'worldbook') {
        const normalized = normalizeWorldBookEntriesFromJson(json);
        if (!normalized.entries.length) throw new Error('未找到世界书 entries');
        const current = JSON.parse(JSON.stringify(getCardWorldBook(activeDetailCard) || { entries: [] }));
        const next = mode === 'all' ? normalized.book : { ...(current || normalized.book), entries: [...(current.entries || []), normalized.entries[0]] };
        saveCardWorldBook(next);
        showToast(`世界书 ${mode === 'all' ? '全部覆盖' : '单条追加'}成功，共 ${(next.entries || []).length} 条`, 'success');
      } else if (section === 'regex') {
        const normalized = normalizeRegexScriptsFromJson(json).map((rx: any) => {
          const name = (typeof rx?.scriptName === 'string' ? rx.scriptName : typeof rx?.script_name === 'string' ? rx.script_name : typeof rx?.name === 'string' ? rx.name : typeof rx?.title === 'string' ? rx.title : '导入正则').trim();
          const find = (typeof rx?.findRegex === 'string' ? rx.findRegex : typeof rx?.find_regex === 'string' ? rx.find_regex : typeof rx?.pattern === 'string' ? rx.pattern : typeof rx?.find === 'string' ? rx.find : typeof rx?.regex === 'string' ? rx.regex : '') || '';
          const replace = (typeof rx?.replaceString === 'string' ? rx.replaceString : typeof rx?.replace_string === 'string' ? rx.replace_string : typeof rx?.replacement === 'string' ? rx.replacement : typeof rx?.replace === 'string' ? rx.replace : '') || '';
          return { ...rx, scriptName: name, script_name: name, name, findRegex: find, find_regex: find, pattern: find, replaceString: replace, replace_string: replace, replacement: replace };
        });
        if (!normalized.length) throw new Error('未找到正则条目');
        const current = JSON.parse(JSON.stringify(getCardRegex(activeDetailCard) || []));
        const next = mode === 'all' ? normalized : [...current, normalized[0]];
        saveCardRegexList(next);
        showToast(`正则 ${mode === 'all' ? '全部覆盖' : '单条追加'}成功，共 ${next.length} 条`, 'success');
      } else {
        const parsed = normalizeQrDocument(json);
        const current = activeDetailCard?.qrData && typeof activeDetailCard.qrData === 'object' ? normalizeQrDocument(activeDetailCard.qrData) : null;
        const next = mode === 'all' ? parsed : { ...(current || parsed), name: current?.name || parsed.name, qrList: [...(current?.qrList || []), parsed.qrList[0]].filter(Boolean), idIndex: Math.max(Number(current?.idIndex || 0), Number(parsed.qrList[0]?.id || 0)) };
        saveCardQrDocument(next);
        showToast(`QR ${mode === 'all' ? '全部覆盖' : '单条追加'}成功，共 ${next.qrList.length} 条`, 'success');
      }
    } catch (err: any) {
      showToast(`导入失败：${err?.message || 'JSON 格式错误'}`, 'error');
    }
  };

  const handleCardSectionFileSelected = async (e: React.ChangeEvent<HTMLInputElement>, section: 'worldbook' | 'regex' | 'qr') => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleCardSectionFileImport(file, section, cardSectionImportMode);
    e.target.value = '';
    setCardSectionImportPendingFile(null);
  };

  // New Group Modal
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Manage Group Modal (Delete / Rename Group)
  const [managingGroup, setManagingGroup] = useState<string | null>(null);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [deleteCardsWithGroup, setDeleteCardsWithGroup] = useState(false);
  const [renameGroupInput, setRenameGroupInput] = useState('');

  // Batch Move Modal
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchTargetGroup, setBatchTargetGroup] = useState('');

  // Fullscreen Viewer Modal
  const [fullscreenData, setFullscreenData] = useState<{ title: string; content: string; type?: 'text' | 'json' } | null>(null);

  // Edit Text Modal (Generic)
  const [editModalData, setEditModalData] = useState<{
    title: string;
    initialValue: string;
    type: 'input' | 'textarea';
    onSave: (val: string) => void;
  } | null>(null);

  // Toast Notification
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev: any) => [...prev, { id, msg: message, type }]);
    setTimeout(() => {
      setToasts((prev: any) => prev.filter((t: any) => t.id !== id));
    }, 3000);
  };

  // Missing Sub-Section States

  // API Storage
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiCategoryFilter, setApiCategoryFilter] = useState('全部分组');
  const [apiBatchMode, setApiBatchMode] = useState(false);
  const [selectedApiIds, setSelectedApiIds] = useState<string[]>([]);
  const [editingApi, setEditingApi] = useState<ApiEntry | null>(null);
  const [showNewApiGroupModal, setShowNewApiGroupModal] = useState(false);
  const [managingApiCategory, setManagingApiCategory] = useState<string | null>(null);
  const [renameApiCategoryInput, setRenameApiCategoryInput] = useState('');
  const [showApiBatchMoveModal, setShowApiBatchMoveModal] = useState(false);
  const apisList = appData.apis || appData.apiKeys || [];
  const filteredApis = useMemo(() => {
    return apisList.filter((item: any) => {
      if (apiTagsFilter && apiTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!apiTagsFilter.every(t => allTags.includes(t))) return false;
      }
      if (apiCategoryFilter !== '全部分组' && (item.category || '默认') !== apiCategoryFilter) return false;
      if (apiSearchQuery) {
        const q = apiSearchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchUrl = (item.url || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchName && !matchUrl && !matchDesc) return false;
      }
      return true;
    });
  }, [apisList, apiTagsFilter, apiCategoryFilter, apiSearchQuery]);

  const handleOpenAddApiModal = () => {
    setEditingApi({
      id: 'api_' + Date.now(),
      name: '',
      url: '',
      keys: [{ id: 'key_' + Date.now(), memo: '默认', key: '' }],
      description: '',
      category: apiCategoryFilter !== '全部分组' ? apiCategoryFilter : '默认',
      customTags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const handleBatchDeleteApis = () => {
    if (selectedApiIds.length === 0) return;
    updateAppData((prev: any) => ({
      ...prev,
      apis: (prev.apis || prev.apiKeys || []).filter((a: any) => !selectedApiIds.includes(a.id)),
      apiKeys: (prev.apiKeys || prev.apis || []).filter((a: any) => !selectedApiIds.includes(a.id))
    }));
    setSelectedApiIds([]);
    setApiBatchMode(false);
    showToast(`已删除 ${selectedApiIds.length} 个 API 项目`, 'success');
  };

  // Fonts
  const fontFileInputRef = useRef<HTMLInputElement>(null);
  const [fontSearchQuery, setFontSearchQuery] = useState('');
  const [fontCategoryFilter, setFontCategoryFilter] = useState('全部分组');
  const [fontBatchMode, setFontBatchMode] = useState(false);
  const [selectedFontIds, setSelectedFontIds] = useState<string[]>([]);
  const [editingFont, setEditingFont] = useState<FontEntry | null>(null);
  const [activePreviewFontId, setActivePreviewFontId] = useState<string | null>(null);
  const [showAddFontChoiceModal, setShowAddFontChoiceModal] = useState(false);
  const [showAddFontUrlModal, setShowAddFontUrlModal] = useState(false);
  const [showNewFontGroupModal, setShowNewFontGroupModal] = useState(false);
  const [managingFontCategory, setManagingFontCategory] = useState<string | null>(null);
  const [renameFontCategoryInput, setRenameFontCategoryInput] = useState('');
  const [showFontBatchMoveModal, setShowFontBatchMoveModal] = useState(false);
  const fontsList = appData.fonts || [];
  const filteredFonts = useMemo(() => {
    return fontsList.filter((item: any) => {
      if (fontTagsFilter && fontTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!fontTagsFilter.every(t => allTags.includes(t))) return false;
      }
      if (fontCategoryFilter !== '全部分组' && (item.category || '默认') !== fontCategoryFilter) return false;
      if (fontSearchQuery) {
        const q = fontSearchQuery.toLowerCase();
        const matchName = (item.name || item.fontFamily || '').toLowerCase().includes(q);
        if (!matchName) return false;
      }
      return true;
    });
  }, [fontsList, fontTagsFilter, fontCategoryFilter, fontSearchQuery]);

  const processFontFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    let added = 0;
    const newFonts = [...(appData.fonts || [])];
    for (const f of fileArr) {
      try {
        const base64 = await fileToDataURL(f);
        const name = f.name.replace(/\.[^/.]+$/, '');
        const id = 'font_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        newFonts.push({
          id,
          name,
          fontFamily: name,
          fileData: base64,
          category: fontCategoryFilter !== '全部分组' ? fontCategoryFilter : '默认',
          customTags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        added++;
      } catch (e: any) {
        showToast(`字体 ${f.name} 读取失败: ${e.message}`, 'error');
      }
    }
    if (added > 0) {
      updateAppData((prev: any) => ({ ...prev, fonts: newFonts }));
      showToast(`成功添加 ${added} 个字体`, 'success');
    }
  };

  const handleFileUploadFont = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFontFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleBatchDeleteFonts = () => {
    if (selectedFontIds.length === 0) return;
    updateAppData((prev: any) => ({
      ...prev,
      fonts: (prev.fonts || []).filter((f: any) => !selectedFontIds.includes(f.id))
    }));
    setSelectedFontIds([]);
    setFontBatchMode(false);
    showToast(`已删除 ${selectedFontIds.length} 个字体`, 'success');
  };

  // Extra Stories
  const extraStoryFileInputRef = useRef<HTMLInputElement>(null);
  const [extraStorySearchQuery, setExtraStorySearchQuery] = useState('');
  const [extraStoryCategoryFilter, setExtraStoryCategoryFilter] = useState('全部分组');
  const [extraStoryBatchMode, setExtraStoryBatchMode] = useState(false);
  const [selectedExtraStoryIds, setSelectedExtraStoryIds] = useState<string[]>([]);
  const [editingExtraStory, setEditingExtraStory] = useState<ExtraStoryEntry | null>(null);
  const [showAddExtraStoryChoiceModal, setShowAddExtraStoryChoiceModal] = useState(false);
  const [showAddExtraStoryManualModal, setShowAddExtraStoryManualModal] = useState(false);
  const [showNewExtraStoryGroupModal, setShowNewExtraStoryGroupModal] = useState(false);
  const [managingExtraStoryCategory, setManagingExtraStoryCategory] = useState<string | null>(null);
  const [renameExtraStoryCategoryInput, setRenameExtraStoryCategoryInput] = useState('');
  const [showExtraStoryBatchMoveModal, setShowExtraStoryBatchMoveModal] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const extraStoriesList = appData.extraStories || [];
  const filteredExtraStories = useMemo(() => {
    return extraStoriesList.filter((item: any) => {
      if (extraStoryTagsFilter && extraStoryTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!extraStoryTagsFilter.every(t => allTags.includes(t))) return false;
      }
      if (extraStoryCategoryFilter !== '全部分组' && (item.category || '默认') !== extraStoryCategoryFilter) return false;
      if (extraStorySearchQuery) {
        const q = extraStorySearchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchAuthor = (item.author || '').toLowerCase().includes(q);
        const matchContent = (item.content || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchContent) return false;
      }
      return true;
    });
  }, [extraStoriesList, extraStoryTagsFilter, extraStoryCategoryFilter, extraStorySearchQuery]);

  const processExtraStoryFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    let added = 0;
    const newStories = [...(appData.extraStories || [])];
    for (const f of fileArr) {
      try {
        const text = await f.text();
        const id = 'story_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        newStories.push({
          id,
          title: f.name.replace(/\.[^/.]+$/, ''),
          content: text,
          author: '',
          category: extraStoryCategoryFilter !== '全部分组' ? extraStoryCategoryFilter : '默认',
          customTags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        added++;
      } catch (e: any) {
        showToast(`番外文件 ${f.name} 读取失败: ${e.message}`, 'error');
      }
    }
    if (added > 0) {
      updateAppData((prev: any) => ({ ...prev, extraStories: newStories }));
      showToast(`成功添加 ${added} 个番外篇章`, 'success');
    }
  };

  const handleFileUploadExtraStory = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processExtraStoryFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleBatchDeleteExtraStories = () => {
    if (selectedExtraStoryIds.length === 0) return;
    updateAppData((prev: any) => ({
      ...prev,
      extraStories: (prev.extraStories || []).filter((s: any) => !selectedExtraStoryIds.includes(s.id))
    }));
    setSelectedExtraStoryIds([]);
    setExtraStoryBatchMode(false);
    showToast(`已删除 ${selectedExtraStoryIds.length} 篇番外`, 'success');
  };

  // Stickers
  const stickerFileInputRef = useRef<HTMLInputElement>(null);
  const [stickerSearchQuery, setStickerSearchQuery] = useState('');
  const [stickerCategoryFilter, setStickerCategoryFilter] = useState('全部分组');
  const [stickerBatchMode, setStickerBatchMode] = useState(false);
  const [selectedStickerPackIds, setSelectedStickerPackIds] = useState<string[]>([]);
  const [editingStickerPack, setEditingStickerPack] = useState<StickerPackEntry | null>(null);
  const [stickerDetailTab, setStickerDetailTab] = useState<'info' | 'items'>('info');
  const [showNewStickerGroupModal, setShowNewStickerGroupModal] = useState(false);
  const [managingStickerCategory, setManagingStickerCategory] = useState<string | null>(null);
  const [renameStickerCategoryInput, setRenameStickerCategoryInput] = useState('');
  const [showStickerBatchMoveModal, setShowStickerBatchMoveModal] = useState(false);
  const stickerPacksList = appData.stickerPacks || [];
  const filteredStickerPacks = useMemo(() => {
    return stickerPacksList.filter((item: any) => {
      if (stickerTagsFilter && stickerTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!stickerTagsFilter.every(t => allTags.includes(t))) return false;
      }
      if (stickerCategoryFilter !== '全部分组' && (item.category || '默认') !== stickerCategoryFilter) return false;
      if (stickerSearchQuery) {
        const q = stickerSearchQuery.toLowerCase();
        const matchName = (item.title || item.name || '').toLowerCase().includes(q);
        const matchAuthor = (item.author || '').toLowerCase().includes(q);
        if (!matchName && !matchAuthor) return false;
      }
      return true;
    });
  }, [stickerPacksList, stickerTagsFilter, stickerCategoryFilter, stickerSearchQuery]);

  const processStickerFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    let added = 0;
    const newPacks = [...(appData.stickerPacks || [])];
    const items: StickerItem[] = [];
    for (const f of fileArr) {
      try {
        const url = await processImageFile(f, 300, 300);
        items.push({
          id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: f.name.replace(/\.[^/.]+$/, ''),
          url,
        });
      } catch (e) {}
    }
    if (items.length > 0) {
      newPacks.push({
        id: 'pack_' + Date.now(),
        title: '新表情包图集 ' + new Date().toLocaleDateString(),
        items,
        category: stickerCategoryFilter !== '全部分组' ? stickerCategoryFilter : '默认',
        customTags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      updateAppData((prev: any) => ({ ...prev, stickerPacks: newPacks }));
      showToast(`成功创建包含 ${items.length} 张表情的图集`, 'success');
    }
  };

  const handleFileUploadSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processStickerFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleBatchDeleteStickerPacks = () => {
    if (selectedStickerPackIds.length === 0) return;
    updateAppData((prev: any) => ({
      ...prev,
      stickerPacks: (prev.stickerPacks || []).filter((p: any) => !selectedStickerPackIds.includes(p.id))
    }));
    setSelectedStickerPackIds([]);
    setStickerBatchMode(false);
    showToast(`已删除 ${selectedStickerPackIds.length} 个表情包图集`, 'success');
  };

  // WorldBook
  const worldBookFileInputRef = useRef<HTMLInputElement>(null);
  const [worldBookSearchQuery, setWorldBookSearchQuery] = useState('');
  const [worldBookCategoryFilter, setWorldBookCategoryFilter] = useState('全部分组');
  const [worldBookBatchMode, setWorldBookBatchMode] = useState(false);
  const [selectedWorldBookIds, setSelectedWorldBookIds] = useState<string[]>([]);
  const [editingWorldBook, setEditingWorldBook] = useState<WorldBookEntry | null>(null);
  const [isWorldBookContentExpanded, setIsWorldBookContentExpanded] = useState(false);
  const [showNewWorldBookGroupModal, setShowNewWorldBookGroupModal] = useState(false);
  const [managingWorldBookCategory, setManagingWorldBookCategory] = useState<string | null>(null);
  const [renameWorldBookCategoryInput, setRenameWorldBookCategoryInput] = useState('');
  const [showWorldBookBatchMoveModal, setShowWorldBookBatchMoveModal] = useState(false);
  const worldBooksList = appData.worldBooks || [];
  const filteredWorldBooks = useMemo(() => {
    return worldBooksList.filter((item: any) => {
      if (worldBookTagsFilter && worldBookTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!worldBookTagsFilter.every(t => allTags.includes(t))) return false;
      }
      if (worldBookCategoryFilter !== '全部分组' && (item.category || '默认') !== worldBookCategoryFilter) return false;
      if (worldBookSearchQuery) {
        const q = worldBookSearchQuery.toLowerCase();
        const matchTitle = (item.title || item.name || '').toLowerCase().includes(q);
        const matchAuthor = (item.author || '').toLowerCase().includes(q);
        const matchContent = (item.content || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchContent) return false;
      }
      return true;
    });
  }, [worldBooksList, worldBookTagsFilter, worldBookCategoryFilter, worldBookSearchQuery]);

  const processWorldBookFileImport = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    let added = 0;
    const newBooks = [...(appData.worldBooks || [])];
    for (const f of fileArr) {
      try {
        const text = await f.text();
        const id = 'wb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        newBooks.push({
          id,
          title: f.name.replace(/\.[^/.]+$/, ''),
          content: text,
          category: worldBookCategoryFilter !== '全部分组' ? worldBookCategoryFilter : '默认',
          customTags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        added++;
      } catch (e: any) {
        showToast(`世界书文件 ${f.name} 读取失败`, 'error');
      }
    }
    if (added > 0) {
      updateAppData((prev: any) => ({ ...prev, worldBooks: newBooks }));
      showToast(`成功添加 ${added} 本世界书`, 'success');
    }
  };

  const handleFileUploadWorldBook = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processWorldBookFileImport(e.target.files);
      e.target.value = '';
    }
  };

  const commitJsonWorldBookImport = () => {
    if (!pendingJsonWorldBook) return;
    const newBooks = [...(appData.worldBooks || []), pendingJsonWorldBook];
    updateAppData((prev: any) => ({ ...prev, worldBooks: newBooks }));
    setPendingJsonWorldBook(null);
    setShowJsonWorldBookImportPreview(false);
    showToast('JSON 世界书已成功导入', 'success');
  };

  const handleBatchDeleteWorldBooks = () => {
    if (selectedWorldBookIds.length === 0) return;
    updateAppData((prev: any) => ({
      ...prev,
      worldBooks: (prev.worldBooks || []).filter((w: any) => !selectedWorldBookIds.includes(w.id))
    }));
    setSelectedWorldBookIds([]);
    setWorldBookBatchMode(false);
    showToast(`已删除 ${selectedWorldBookIds.length} 本世界书`, 'success');
  };

  // Chat Memes
  const chatMemeFileInputRef = useRef<HTMLInputElement>(null);
  const chatMemeGroupPressTimer = useRef<any>(null);
  const [chatMemeSearchQuery, setChatMemeSearchQuery] = useState('');
  const [chatMemeCategoryFilter, setChatMemeCategoryFilter] = useState('全部分组');
  const [chatMemeSortOrder, setChatMemeSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>('default');
  const [chatMemeBatchMode, setChatMemeBatchMode] = useState(false);
  const [selectedChatMemeIds, setSelectedChatMemeIds] = useState<string[]>([]);
  const [editingChatMeme, setEditingChatMeme] = useState<ChatMemeEntry | null>(null);
  const [showChatAddChoiceModal, setShowChatAddChoiceModal] = useState(false);
  const [showChatExportModal, setShowChatExportModal] = useState(false);
  const [showChatManualModal, setShowChatManualModal] = useState(false);
  const [showNewChatMemeGroupModal, setShowNewChatMemeGroupModal] = useState(false);
  const [managingChatMemeGroup, setManagingChatMemeGroup] = useState<string | null>(null);
  const [renameChatMemeGroupInput, setRenameChatMemeGroupInput] = useState('');
  const chatMemesList = appData.chatMemes || [];
  const filteredChatMemes = useMemo(() => {
    return chatMemesList.filter((item: any) => {
      if (chatMemeTagsFilter && chatMemeTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!chatMemeTagsFilter.every(t => allTags.includes(t))) return false;
      }
      if (chatMemeCategoryFilter !== '全部分组' && (item.category || '默认') !== chatMemeCategoryFilter) return false;
      if (chatMemeSearchQuery) {
        const q = chatMemeSearchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchContent = (item.content || '').toLowerCase().includes(q);
        if (!matchTitle && !matchContent) return false;
      }
      return true;
    });
  }, [chatMemesList, chatMemeTagsFilter, chatMemeCategoryFilter, chatMemeSearchQuery]);

  const handleDeleteSelectedChatMemes = () => {
    if (selectedChatMemeIds.length === 0) return;
    updateAppData((prev: any) => ({
      ...prev,
      chatMemes: (prev.chatMemes || []).filter((m: any) => !selectedChatMemeIds.includes(m.id))
    }));
    setSelectedChatMemeIds([]);
    setChatMemeBatchMode(false);
    showToast(`已删除 ${selectedChatMemeIds.length} 个聊天表情`, 'success');
  };

  const handleMoveSelectedChatMemes = (targetGroup: string) => {
    if (selectedChatMemeIds.length === 0) return;
    updateAppData((prev: any) => ({
      ...prev,
      chatMemes: (prev.chatMemes || []).map((m: any) => selectedChatMemeIds.includes(m.id) ? { ...m, category: targetGroup } : m)
    }));
    setSelectedChatMemeIds([]);
    setChatMemeBatchMode(false);
    showToast(`已移动 ${selectedChatMemeIds.length} 个聊天表情到「${targetGroup}」`, 'success');
  };

  // ST Card WorldBook Form & Tavern Sync
  const [newCardWorldBookEntryForm, setNewCardWorldBookEntryForm] = useState<any>({
    keys: '',
    secondary_keys: '',
    comment: '',
    content: '',
    constant: false,
    selective: false,
    insertion_order: 100,
    position: 'before_char',
    enabled: true
  });
  const [showAddCardWorldBookEntryModal, setShowAddCardWorldBookEntryModal] = useState(false);

  const handleTavernSync = async () => {
    try {
      const dirHandle = await connectTavernDirectory();
      if (!dirHandle) return;
      const files = await scanTavernDirectory(dirHandle);
      if (files.length > 0) {
        showToast(`酒馆目录扫描到 ${files.length} 个文件，开始同步...`, 'info');
        await handleFileUpload(files);
      } else {
        showToast('酒馆目录扫描完成，未发现新文件', 'info');
      }
    } catch (e: any) {
      showToast(`酒馆同步失败: ${e.message}`, 'error');
    }
  };

  const handleImportCurrentSection = async (file: File) => {
    try {
      if (['st-cards', 'st-presets', 'st-worldbooks', 'st-regex', 'st-scripts', 'st-qr', 'st-themes'].includes(currentPage)) {
        await handleFileUpload([file]);
      } else if (currentPage === 'normal-cards') {
        const nc = await parseNormalCardFile(file);
        updateAppData((prev: any) => ({ ...prev, normalCards: [...(prev.normalCards || []), nc] }));
        showToast(`成功导入普通角色卡: ${(nc as any).charName || nc.fileName || '角色卡'}`, 'success');
      } else if (currentPage === 'fonts') {
        await processFontFiles([file]);
      } else if (currentPage === 'extras-app' || currentPage === 'st-extras') {
        await processExtraStoryFiles([file]);
      } else if (currentPage === 'stickers') {
        await processStickerFiles([file]);
      } else if (currentPage === 'worldbook') {
        await processWorldBookFileImport([file]);
      } else {
        showToast('已完成导入处理', 'success');
      }
    } catch (e: any) {
      showToast(`导入失败: ${e.message}`, 'error');
    }
  };



  // Duplicate Detection and Confirmation Modal State
  const [duplicateModalState, setDuplicateModalState] = useState<{
    isOpen: boolean;
    incomingCard: CardEntry;
    matchDetail: CardMatchDetail;
    remainingCount: number;
    resolve: ((value: { action: DuplicateAction; applyToAll: boolean }) => void) | null;
  } | null>(null);

  const promptDuplicateAction = (
    incomingCard: CardEntry,
    matchDetail: CardMatchDetail,
    remainingCount: number
  ): Promise<{ action: DuplicateAction; applyToAll: boolean }> => {
    return new Promise((resolve) => {
      setDuplicateModalState({
        isOpen: true,
        incomingCard,
        matchDetail,
        remainingCount,
        resolve,
      });
    });
  };

  // File Inputs Refs
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const importBackupInputRef = useRef<HTMLInputElement>(null);
  const updateCardInputRef = useRef<HTMLInputElement>(null);
  const coverUploadInputRef = useRef<HTMLInputElement>(null);
  const authorNoteInputRef = useRef<HTMLInputElement>(null);
  const memoryInputRef = useRef<HTMLInputElement>(null);
  const cardRegexFileInputRef = useRef<HTMLInputElement>(null);
  const beautificationDocumentFileInputRef = useRef<HTMLInputElement>(null);
  const beautificationUpdateInputRef = useRef<HTMLInputElement>(null);

  // Long Press Timer for Group Tabs
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batch Selection in Extras Tab
  const [authorNoteBatchMode, setAuthorNoteBatchMode] = useState(false);
  const [selectedAuthorNoteIndices, setSelectedAuthorNoteIndices] = useState<number[]>([]);

  const [memoryBatchMode, setMemoryBatchMode] = useState(false);
  const [selectedMemoryIndices, setSelectedMemoryIndices] = useState<number[]>([]);

  // Mobile Links State
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false);
  const [phoneForm, setPhoneForm] = useState({ name: '', url: '', contact: '', description: '' });

  const [editingPhoneLink, setEditingPhoneLink] = useState<PhoneLink | null>(null);

  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [phoneBatchMode, setPhoneBatchMode] = useState(false);
  const [selectedPhoneIds, setSelectedPhoneIds] = useState<string[]>([]);
  const phoneFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUploadPhoneLink = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = evt.target?.result as string;
          const json = JSON.parse(content);
          let newLinks: PhoneLink[] = [];
          if (Array.isArray(json)) {
            newLinks = json.filter(item => item && (item.name || item.url)).map(item => ({
              id: item.id || ('phone_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
              name: item.name || '未命名链接',
              url: item.url || '',
              contact: item.contact || undefined,
              description: item.description || undefined,
              createdAt: item.createdAt || Date.now(),
              updatedAt: Date.now(),
              importedAt: Date.now()
            }));
          } else if (json && (json.name || json.url)) {
            newLinks = [{
              id: json.id || ('phone_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
              name: json.name || '未命名链接',
              url: json.url || '',
              contact: json.contact || undefined,
              description: json.description || undefined,
              createdAt: json.createdAt || Date.now(),
              updatedAt: Date.now(),
              importedAt: Date.now()
            }];
          }
          if (newLinks.length > 0) {
            updateAppData((prev) => ({
              ...prev,
              phoneLinks: [...newLinks, ...(prev.phoneLinks || [])]
            }));
            showToast(`成功导入 ${newLinks.length} 个小手机链接`, 'success');
          } else {
            showToast('未检测到有效的链接数据', 'error');
          }
        } catch {
          showToast('JSON 格式解析失败', 'error');
        }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  // Mobile Links Handlers
  const phoneLinksList = appData.phoneLinks || [];
  const filteredPhoneLinks = useMemo(() => {
    return phoneLinksList.filter((item) => {
      if (!phoneSearchQuery.trim()) return true;
      const q = phoneSearchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        (item.contact && item.contact.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  }, [phoneLinksList, phoneSearchQuery]);

  const handleAddPhoneLink = () => {
    if (!phoneForm.name.trim()) {
      showToast('请填写小手机名称', 'error');
      return;
    }
    if (!phoneForm.url.trim()) {
      showToast('请填写链接', 'error');
      return;
    }
    const newLink: PhoneLink = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: phoneForm.name.trim(),
      url: phoneForm.url.trim(),
      contact: phoneForm.contact.trim() || undefined,
      description: phoneForm.description.trim() || undefined,
      importedAt: Date.now(), createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedLinks = [newLink, ...(appData.phoneLinks || [])];
    updateAppData({ ...appData, phoneLinks: updatedLinks });
    setShowAddPhoneModal(false);
    setPhoneForm({ name: '', url: '', contact: '', description: '' });
    showToast('小手机链接添加成功！', 'success');
  };

  const handleSaveEditedPhoneLink = () => {
    if (!editingPhoneLink) return;
    if (!editingPhoneLink.name.trim()) {
      showToast('请填写小手机名称', 'error');
      return;
    }
    if (!editingPhoneLink.url.trim()) {
      showToast('请填写链接', 'error');
      return;
    }

    const updatedLinks = (appData.phoneLinks || []).map((item) =>
      item.id === editingPhoneLink.id
        ? {
            ...editingPhoneLink,
            name: editingPhoneLink.name.trim(),
            url: editingPhoneLink.url.trim(),
            contact: editingPhoneLink.contact?.trim() || undefined,
            description: editingPhoneLink.description?.trim() || undefined,
            updatedAt: Date.now(),
          }
        : item
    );

    updateAppData({ ...appData, phoneLinks: updatedLinks });
    setEditingPhoneLink(null);
    showToast('保存成功！', 'success');
  };

  const handleDeleteSinglePhoneLink = (id: string) => {
    requestDelete('确定要删除此小手机链接存档吗？', 1, () => {
    const updatedLinks = (appData.phoneLinks || []).filter((item) => item.id !== id);
    updateAppData({ ...appData, phoneLinks: updatedLinks });
    setEditingPhoneLink(null);
    showToast('已删除存档', 'info');
    });
  };

  const handleBatchDeletePhoneLinks = () => {
    if (selectedPhoneIds.length === 0) return;
    requestDelete(`确定要删除选中的 ${selectedPhoneIds.length} 个小手机链接吗？`, selectedPhoneIds.length, () => {
    const updatedLinks = (appData.phoneLinks || []).filter(
      (item) => !selectedPhoneIds.includes(item.id)
    );
    updateAppData({ ...appData, phoneLinks: updatedLinks });
    setSelectedPhoneIds([]);
    setPhoneBatchMode(false);
    showToast(`已批量删除 ${selectedPhoneIds.length} 个小手机链接`, 'info');
    });
  };

  // ST Themes State & Refs
  const themeFileInputRef = useRef<HTMLInputElement>(null);
  const themeDocumentFileInputRef = useRef<HTMLInputElement>(null);
  const themeCoverInputRef = useRef<HTMLInputElement>(null);

  const [editingTheme, setEditingTheme] = useState<ThemeEntry | null>(null);
  const [themeDetailTab, setThemeDetailTab] = useState<'info' | 'code'>('info');
  const [isThemeCodeExpanded, setIsThemeCodeExpanded] = useState(false);

  const [themeSearchQuery, setThemeSearchQuery] = useState('');
  const [themeCategoryFilter, setThemeCategoryFilter] = useState('全部分组');
  const [themeBatchMode, setThemeBatchMode] = useState(false);
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [codeSearchQuery, setCodeSearchQuery] = useState('');

  // ST Theme Group Modals & State
  const [showNewThemeGroupModal, setShowNewThemeGroupModal] = useState(false);
  const [newThemeGroupName, setNewThemeGroupName] = useState('');

  const [managingThemeGroup, setManagingThemeGroup] = useState<string | null>(null);
  const [renameThemeGroupInput, setRenameThemeGroupInput] = useState('');
  const [deleteThemesWithGroup, setDeleteThemesWithGroup] = useState(false);

  const [showThemeBatchMoveModal, setShowThemeBatchMoveModal] = useState(false);
  const [batchTargetThemeGroup, setBatchTargetThemeGroup] = useState('');

  // ST Themes Handlers
  const themesList = appData.themes || [];
  const availableThemeCategories = useMemo(() => Array.from(
    new Set(['全部分组', '默认', ...(appData.themeCategories || []), ...themesList.map((t) => t.category || '默认')])
  ), [appData.themeCategories, themesList]);

  const filteredThemes = useMemo(() => {
    return themesList.filter((item) => {
      if (themeTagsFilter && themeTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!themeTagsFilter.every(t => allTags.includes(t))) return false;
      }
      if (themeCategoryFilter !== '全部分组' && (item.category || '默认') !== themeCategoryFilter) {
        return false;
      }
      if (!themeSearchQuery.trim()) return true;
      const q = themeSearchQuery.toLowerCase();
      const rawStr = item.content || item.rawJsonString || (typeof item.jsonData === 'string' ? item.jsonData : JSON.stringify(item.jsonData || {}));
      return (
        item.name.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (rawStr && rawStr.toLowerCase().includes(q))
      );
    });
  }, [themesList, themeTagsFilter, themeCategoryFilter, themeSearchQuery]);

  const handleThemeDocumentFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    let curThemes = [...(appData.themes || [])];
    let addedCount = 0;
    let versionCount = 0;
    let distinctCount = 0;
    let skippedCount = 0;

    const showProgress = fileArray.length > 8;
    if (showProgress) showToast(`开始导入 ${fileArray.length} 个文件…`, 'info');

    // 顺序处理并在每个文件之间让出主线程，避免一次性 forEach(async) 并发解析
    // 大量 docx/图片文件时占用过多内存导致页面卡顿甚至崩溃。
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
      const nameClean = file.name.replace(/\.[^/.]+$/, '') || '未命名美化';

      try {
        let contentText = '';
        let parsedJson: any = null;
        let themeType = 'ST主题';

        if (ext === 'docx') {
          themeType = 'ST主题';
          try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            contentText = result.value || '';
          } catch (err) {
            contentText = '';
          }
        } else {
          contentText = await file.text();
          if (ext === 'json') {
            try {
              parsedJson = JSON.parse(contentText);
              // ST 主题与美化分类完全独立：这里不再根据 JSON 的 type 识别线上/线下美化。
            } catch (e) {
              // keep as string content
            }
          } else if (ext === 'css') {
            themeType = 'CSS样式';
          }
        }

        const themeItem: ThemeEntry = {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6) + '_' + i,
          name: nameClean,
          fileName: file.name,
          author: (parsedJson && (parsedJson.author || parsedJson.creator)) || '默认',
          category: themeCategoryFilter !== '全部分组' ? themeCategoryFilter : ((parsedJson && parsedJson.category) || '默认'),
          type: themeType,
          source: (parsedJson && (parsedJson.source || parsedJson.url)) || '',
          description: (parsedJson && (parsedJson.description || parsedJson.comment)) || '',
          coverImage: null,
          jsonData: parsedJson || {},
          rawJsonString: parsedJson ? JSON.stringify(parsedJson, null, 2) : contentText,
          content: contentText,
          fileType: ext,
          importedAt: Date.now(), createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const existingSameName = curThemes.filter(t => (t.name || '').trim().toLowerCase() === nameClean.toLowerCase());

        if (existingSameName.length === 0) {
          curThemes.push(themeItem);
          addedCount++;
        } else {
          let matchedTheme: ThemeEntry | null = null;
          let bestDiff: any = { status: 'completely_different', similarity: 0, summary: '' };

          for (const extTheme of existingSameName) {
            const diff = compareThemes(contentText, extTheme);
            if (diff.status === 'identical') {
              matchedTheme = extTheme;
              bestDiff = diff;
              break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedTheme = extTheme;
              bestDiff = diff;
            }
          }

          if ((bestDiff.status === 'identical' || bestDiff.status === 'partially_different') && matchedTheme) {
            const currentVersions = matchedTheme.versions || [];
            const verNum = currentVersions.length + 1;
            
            let changeSummaryText = bestDiff.summary || `升级至新版本 (来源于 ${file.name})`;
            if (bestDiff.status === 'identical') {
               let identicalVersionLabel = (matchedTheme as any).activeVersionLabel || `v${(matchedTheme.versions?.length || 0) + 1}`;
               if (matchedTheme.versions && matchedTheme.versions.length > 0) {
                 for (const v of matchedTheme.versions) {
                   if (v.data && v.data.rawJsonString === matchedTheme.rawJsonString) {
                     identicalVersionLabel = v.versionLabel ? v.versionLabel.split(' ')[0] : `v${v.versionNumber}`;
                     break;
                   }
                 }
               }
               changeSummaryText = `导入重复文件 (与 ${identicalVersionLabel} 相同)`;
            }
            const prevSnapshot = {
              versionId: `thver_${matchedTheme.id}_${verNum}_${Date.now()}`,
              versionNumber: verNum,
              versionLabel: `v${verNum} (${new Date(matchedTheme.updatedAt || matchedTheme.createdAt || Date.now()).toLocaleDateString()})`,
              updatedAt: matchedTheme.updatedAt || matchedTheme.createdAt || Date.now(),
              fileName: matchedTheme.fileName,
              changeSummary: changeSummaryText,
              data: {
                name: matchedTheme.name,
                fileName: matchedTheme.fileName,
                content: matchedTheme.content,
                rawJsonString: matchedTheme.rawJsonString,
                jsonData: JSON.parse(JSON.stringify(matchedTheme.jsonData || {}))
              }
            };

            const updatedTheme: ThemeEntry = {
              ...matchedTheme,
              content: contentText,
              rawJsonString: parsedJson ? JSON.stringify(parsedJson, null, 2) : contentText,
              jsonData: parsedJson || {},
              fileName: file.name,
              updatedAt: Date.now(),
              customTags: Array.from(new Set([...(matchedTheme.customTags || []), '已更新版本'])),
              versions: [prevSnapshot, ...currentVersions]
            };

            const idx = curThemes.findIndex(t => t.id === matchedTheme!.id);
            if (idx > -1) curThemes[idx] = updatedTheme;
            versionCount++;
          } else {
            themeItem.customTags = Array.from(new Set([...(themeItem.customTags || []), '同名变体']));
            curThemes.push(themeItem);
            distinctCount++;
          }
        }
      } catch (e: any) {
        showToast(`读取文件 ${file.name} 失败`, 'error');
      }

      if (showProgress && (i + 1) % 5 === 0) showToast(`正在导入 ${i + 1}/${fileArray.length} 个文件…`, 'info');
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (addedCount > 0 || versionCount > 0 || distinctCount > 0) {
      updateAppData((prev) => ({ ...prev, themes: curThemes }));
      const parts: string[] = [];
      if (addedCount > 0) parts.push(`新增 ${addedCount} 个`);
      if (versionCount > 0) parts.push(`版本更新 ${versionCount} 个`);
      if (distinctCount > 0) parts.push(`同名独立变体 ${distinctCount} 个`);
      if (skippedCount > 0) parts.push(`跳过完全重复 ${skippedCount} 个`);
      showToast(`主题美化导入完成：${parts.join('，')}`, 'success');
    } else if (skippedCount > 0) {
      showToast(`已跳过 ${skippedCount} 个内容完全一致的重复主题`, 'info');
    } else {
      showToast('未识别到有效的主题文档内容', 'error');
    }
  };

  const handleThemeFileUpload = (files: FileList) => {
    handleThemeDocumentFileUpload(files);
  };

  const exportThemeDocument = (
    themeItem: Partial<ThemeEntry> & { name: string },
    format: 'docx' | 'txt' | 'json' | 'css'
  ) => {
    try {
      const content = themeItem.content || themeItem.rawJsonString || (typeof themeItem.jsonData === 'string' ? themeItem.jsonData : JSON.stringify(themeItem.jsonData || {}, null, 2)) || '';
      
      if (format === 'docx') {
        const paragraphs = (content || '').split('\n').map((line) => new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
        }));
        const doc = new Document({
          sections: [{ properties: {}, children: paragraphs }],
        });
        Packer.toBlob(doc).then((blob) => {
          triggerFileDownload(blob, `${themeItem.name || '美化文档'}.docx`);
          showToast('已成功导出 .docx 格式文档！', 'success');
        }).catch(() => {
          showToast('导出 .docx 失败', 'error');
        });
        return;
      }

      let mimeType = 'text/plain;charset=utf-8';
      let ext = format;
      if (format === 'json') mimeType = 'application/json;charset=utf-8';
      if (format === 'css') mimeType = 'text/css;charset=utf-8';

      const blob = new Blob([content], { type: mimeType });
      triggerFileDownload(blob, `${themeItem.name || '美化文档'}.${ext}`);
      showToast(`已成功导出 .${ext} 格式文档！`, 'success');
    } catch (err: any) {
      showToast('导出失败: ' + err.message, 'error');
    }
  };

  const exportThemeAsJson = (themeItem: ThemeEntry) => {
    exportThemeDocument(themeItem, 'json');
  };

  const handleSaveEditedTheme = () => {
    if (!editingTheme) return;
    if (!editingTheme.name.trim()) {
      showToast('请填写美化名称', 'error');
      return;
    }

    let finalJsonData = editingTheme.jsonData;
    let finalRawStr = editingTheme.rawJsonString || editingTheme.content || '';

    if (editingTheme.fileType === 'json' && editingTheme.rawJsonString) {
      try {
        finalJsonData = JSON.parse(editingTheme.rawJsonString);
      } catch (e: any) {
        // retain string
      }
    }

    const updatedThemes = (appData.themes || []).map((t) =>
      t.id === editingTheme.id
        ? {
            ...editingTheme,
            name: editingTheme.name.trim(),
            author: editingTheme.author?.trim() || '默认',
            type: editingTheme.type?.trim() || 'ST主题',
            category: editingTheme.category?.trim() || '默认',
            source: editingTheme.source?.trim() || '',
            description: editingTheme.description?.trim() || '',
            content: editingTheme.content || editingTheme.rawJsonString || '',
            jsonData: finalJsonData,
            rawJsonString: finalRawStr,
            updatedAt: Date.now(),
          }
        : t
    );

    const cat = editingTheme.category?.trim() || '默认';
    const existingCats = appData.themeCategories || ['默认'];
    const newCats = existingCats.includes(cat) ? existingCats : [...existingCats, cat];

    updateAppData({ ...appData, themes: updatedThemes, themeCategories: newCats });
    setEditingTheme(null);
    showToast('美化存档已保存！', 'success');
  };

  const handleDeleteSingleTheme = (id: string) => {
    requestDelete('确定要删除此主题美化存档吗？', 1, () => {
    const updatedThemes = (appData.themes || []).filter((t) => t.id !== id);
    updateAppData({ ...appData, themes: updatedThemes });
    setEditingTheme(null);
    showToast('已删除主题存档', 'info');
    });
  };

  const handleBatchDeleteThemes = () => {
    if (selectedThemeIds.length === 0) return;
    requestDelete(`确定要删除选中的 ${selectedThemeIds.length} 个主题美化吗？`, selectedThemeIds.length, () => {
    const updatedThemes = (appData.themes || []).filter((t) => !selectedThemeIds.includes(t.id));
    updateAppData({ ...appData, themes: updatedThemes });
    setSelectedThemeIds([]);
    setThemeBatchMode(false);
    showToast(`已批量删除 ${selectedThemeIds.length} 个主题`, 'info');
    });
  };

  const handleCreateNewThemeGroup = () => {
    const name = newThemeGroupName.trim();
    if (!name) {
      showToast('请输入分组名称', 'error');
      return;
    }
    const currentCats = appData.themeCategories || ['默认'];
    if (currentCats.includes(name)) {
      showToast('该分组已存在', 'info');
      setThemeCategoryFilter(name);
      setShowNewThemeGroupModal(false);
      setNewThemeGroupName('');
      return;
    }
    const updatedCats = [...currentCats, name];
    updateAppData({ ...appData, themeCategories: updatedCats });
    setThemeCategoryFilter(name);
    setShowNewThemeGroupModal(false);
    setNewThemeGroupName('');
    showToast(`成功新建分组: ${name}`, 'success');
  };

  const handleRenameThemeGroup = () => {
    if (!managingThemeGroup) return;
    const newName = renameThemeGroupInput.trim();
    if (!newName) {
      showToast('请输入新的分组名称', 'error');
      return;
    }
    if (newName === managingThemeGroup) {
      setManagingThemeGroup(null);
      return;
    }

    const currentCats = appData.themeCategories || ['默认'];
    const updatedCats = currentCats.map((c) => (c === managingThemeGroup ? newName : c));

    const updatedThemes = (appData.themes || []).map((t) =>
      (t.category || '默认') === managingThemeGroup ? { ...t, category: newName } : t
    );

    updateAppData({
      ...appData,
      themeCategories: Array.from(new Set(updatedCats)),
      themes: updatedThemes,
    });

    if (themeCategoryFilter === managingThemeGroup) {
      setThemeCategoryFilter(newName);
    }

    setManagingThemeGroup(null);
    showToast('分组重命名成功', 'success');
  };

  const handleConfirmDeleteThemeGroup = () => {
    if (!managingThemeGroup) return;
    const targetGroup = managingThemeGroup;

    let updatedThemes = appData.themes || [];
    if (deleteThemesWithGroup) {
      updatedThemes = updatedThemes.filter((t) => (t.category || '默认') !== targetGroup);
    } else {
      updatedThemes = updatedThemes.map((t) =>
        (t.category || '默认') === targetGroup ? { ...t, category: '默认' } : t
      );
    }

    const currentCats = appData.themeCategories || ['默认'];
    const updatedCats = currentCats.filter((c) => c !== targetGroup);

    updateAppData({
      ...appData,
      themeCategories: updatedCats,
      themes: updatedThemes,
    });

    if (themeCategoryFilter === targetGroup) {
      setThemeCategoryFilter('全部分组');
    }

    setManagingThemeGroup(null);
    setDeleteThemesWithGroup(false);
    showToast(`分组 “${targetGroup}” 已删除`, 'info');
  };

  const handleBatchMoveThemes = () => {
    if (selectedThemeIds.length === 0) return;
    const target = batchTargetThemeGroup.trim();
    if (!target) {
      showToast('请选择或输入目标分组', 'error');
      return;
    }

    const updatedThemes = (appData.themes || []).map((t) =>
      selectedThemeIds.includes(t.id) ? { ...t, category: target } : t
    );

    const existingCats = appData.themeCategories || ['默认'];
    const newCats = existingCats.includes(target) ? existingCats : [...existingCats, target];

    updateAppData({
      ...appData,
      themes: updatedThemes,
      themeCategories: newCats,
    });

    setSelectedThemeIds([]);
    setThemeBatchMode(false);
    setShowThemeBatchMoveModal(false);
    setBatchTargetThemeGroup('');
    showToast(`已将 ${selectedThemeIds.length} 个主题移动到 “${target}”`, 'success');
  };

  // ==================== BEAUTIFICATIONS (美化) STATE & HANDLERS ====================
  const beautificationCoverInputRef = useRef<HTMLInputElement>(null);

  const [editingBeautification, setEditingBeautification] = useState<ThemeEntry | null>(null);
  const [beautificationDetailTab, setBeautificationDetailTab] = useState<'info' | 'code' | 'preview'>('info');
  const [isBeautificationCodeExpanded, setIsBeautificationCodeExpanded] = useState(false);

  const [beautificationSearchQuery, setBeautificationSearchQuery] = useState('');
  const [beautificationCategoryFilter, setBeautificationCategoryFilter] = useState('全部分组');
  const [beautificationBatchMode, setBeautificationBatchMode] = useState(false);
  const [selectedBeautificationIds, setSelectedBeautificationIds] = useState<string[]>([]);

  // Beautification Group Modals & State
  const [showNewBeautificationGroupModal, setShowNewBeautificationGroupModal] = useState(false);
  const [newBeautificationGroupName, setNewBeautificationGroupName] = useState('');

  const [managingBeautificationGroup, setManagingBeautificationGroup] = useState<string | null>(null);
  const [renameBeautificationGroupInput, setRenameBeautificationGroupInput] = useState('');
  const [deleteBeautificationsWithGroup, setDeleteBeautificationsWithGroup] = useState(false);

  const [showBeautificationBatchMoveModal, setShowBeautificationBatchMoveModal] = useState(false);
  const [batchTargetBeautificationGroup, setBatchTargetBeautificationGroup] = useState('');

  const beautificationsList = appData.beautifications || [];

  const filteredBeautifications = useMemo(() => {
    return beautificationsList.filter((item) => {
      if (beautificationTagsFilter && beautificationTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!beautificationTagsFilter.every(t => allTags.includes(t))) return false;
      }
      if (beautificationCategoryFilter !== '全部分组' && (item.category || '默认') !== beautificationCategoryFilter) {
        return false;
      }
      if (!beautificationSearchQuery.trim()) return true;
      const q = beautificationSearchQuery.toLowerCase();
      const rawStr = item.content || item.rawJsonString || (typeof item.jsonData === 'string' ? item.jsonData : JSON.stringify(item.jsonData || {}));
      return (
        item.name.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (rawStr && rawStr.toLowerCase().includes(q))
      );
    });
  }, [beautificationsList, beautificationTagsFilter, beautificationCategoryFilter, beautificationSearchQuery]);

  const handleBeautificationDocumentFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newBeautifications: ThemeEntry[] = [];
    const showProgress = fileArray.length > 8;
    if (showProgress) showToast(`开始导入 ${fileArray.length} 个文件…`, 'info');

    // 顺序处理并在每个文件之间让出主线程，避免一次性并发解析大量 docx/图片
    // 文件时占用过多内存导致页面卡顿甚至崩溃。
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
      const nameClean = file.name.replace(/\.[^/.]+$/, '') || '未命名美化';

      try {
        let contentText = '';
        let parsedJson: any = null;
        let themeType = '线上主题';
        let coverImgUrl: string | null = null;

        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || file.type.startsWith('image/')) {
          themeType = 'PNG图片';
          coverImgUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });
          contentText = coverImgUrl;
        } else if (ext === 'docx') {
          themeType = '线上主题';
          try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            contentText = result.value || '';
          } catch (err) {
            contentText = '';
          }
        } else {
          contentText = await file.text();
          if (ext === 'json') {
            try {
              parsedJson = JSON.parse(contentText);
              if (parsedJson.type) themeType = parsedJson.type;
            } catch (e) {
              // keep as string content
            }
          } else if (ext === 'css') {
            themeType = 'CSS样式';
          }
        }

        const beautificationItem: ThemeEntry = {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          name: nameClean,
          fileName: file.name,
          author: (parsedJson && (parsedJson.author || parsedJson.creator)) || '默认',
          category: beautificationCategoryFilter !== '全部分组' ? beautificationCategoryFilter : ((parsedJson && parsedJson.category) || '默认'),
          type: themeType,
          source: (parsedJson && (parsedJson.source || parsedJson.url)) || '',
          description: (parsedJson && (parsedJson.description || parsedJson.comment)) || '',
          coverImage: coverImgUrl,
          jsonData: parsedJson || {},
          rawJsonString: parsedJson ? JSON.stringify(parsedJson, null, 2) : contentText,
          content: contentText,
          fileType: ext,
          importedAt: Date.now(), createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        newBeautifications.push(beautificationItem);
      } catch (e: any) {
        showToast(`读取文件 ${file.name} 失败`, 'error');
      }

      if (showProgress && (i + 1) % 5 === 0) showToast(`正在导入 ${i + 1}/${fileArray.length} 个文件…`, 'info');
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (newBeautifications.length > 0) {
      updateAppData((prev) => ({ ...prev, beautifications: [...newBeautifications, ...(prev.beautifications || [])] }));
      showToast(`成功导入 ${newBeautifications.length} 个美化！`, 'success');
    } else {
      showToast('未识别到有效的美化文档内容', 'error');
    }
  };

  const exportBeautificationDocument = (beautificationItem: ThemeEntry, format: 'docx' | 'txt' | 'json' | 'css') => {
    try {
      const content = beautificationItem.content || beautificationItem.rawJsonString || (typeof beautificationItem.jsonData === 'string' ? beautificationItem.jsonData : JSON.stringify(beautificationItem.jsonData || {}, null, 2)) || '';
      let mimeType = 'text/plain;charset=utf-8';
      let ext = format;
      if (format === 'json') mimeType = 'application/json;charset=utf-8';
      if (format === 'css') mimeType = 'text/css;charset=utf-8';
      if (format === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const blob = new Blob([content], { type: mimeType });
      triggerFileDownload(blob, `${beautificationItem.name || '美化文档'}.${ext}`);
      showToast(`已成功导出 .${ext} 格式文档！`, 'success');
    } catch (err: any) {
      showToast('导出失败: ' + err.message, 'error');
    }
  };

  const handleSaveEditedBeautification = () => {
    if (!editingBeautification) return;
    if (!editingBeautification.name.trim()) {
      showToast('请填写美化名称', 'error');
      return;
    }

    let finalJsonData = editingBeautification.jsonData;
    let finalRawStr = editingBeautification.rawJsonString || editingBeautification.content || '';

    if (editingBeautification.fileType === 'json' && editingBeautification.rawJsonString) {
      try {
        finalJsonData = JSON.parse(editingBeautification.rawJsonString);
      } catch (e: any) {
        // retain string
      }
    }

    const updatedBeautifications = (appData.beautifications || []).map((b) =>
      b.id === editingBeautification.id
        ? {
            ...editingBeautification,
            name: editingBeautification.name.trim(),
            author: editingBeautification.author?.trim() || '默认',
            type: editingBeautification.type?.trim() || '线上主题',
            category: editingBeautification.category?.trim() || '默认',
            source: editingBeautification.source?.trim() || '',
            description: editingBeautification.description?.trim() || '',
            content: editingBeautification.content || editingBeautification.rawJsonString || '',
            jsonData: finalJsonData,
            rawJsonString: finalRawStr,
            updatedAt: Date.now(),
          }
        : b
    );

    const cat = editingBeautification.category?.trim() || '默认';
    const existingCats = appData.beautificationCategories || ['默认'];
    const newCats = existingCats.includes(cat) ? existingCats : [...existingCats, cat];

    updateAppData({ ...appData, beautifications: updatedBeautifications, beautificationCategories: newCats });
    setEditingBeautification(null);
    showToast('美化存档已保存！', 'success');
  };

  const handleDeleteSingleBeautification = (id: string) => {
    requestDelete('确定要删除此美化存档吗？', 1, () => {
    const updatedBeautifications = (appData.beautifications || []).filter((b) => b.id !== id);
    updateAppData({ ...appData, beautifications: updatedBeautifications });
    setEditingBeautification(null);
    showToast('已删除美化存档', 'info');
    });
  };

  const handleBatchDeleteBeautifications = () => {
    if (selectedBeautificationIds.length === 0) return;
    requestDelete(`确定要删除选中的 ${selectedBeautificationIds.length} 个美化存档吗？`, selectedBeautificationIds.length, () => {
    const updatedBeautifications = (appData.beautifications || []).filter((b) => !selectedBeautificationIds.includes(b.id));
    updateAppData({ ...appData, beautifications: updatedBeautifications });
    setSelectedBeautificationIds([]);
    setBeautificationBatchMode(false);
    showToast(`已批量删除 ${selectedBeautificationIds.length} 个美化`, 'info');
    });
  };

  const handleCreateNewBeautificationGroup = () => {
    const name = newBeautificationGroupName.trim();
    if (!name) {
      showToast('请输入分组名称', 'error');
      return;
    }
    const currentCats = appData.beautificationCategories || ['默认'];
    if (currentCats.includes(name)) {
      showToast('该分组已存在', 'info');
      setBeautificationCategoryFilter(name);
      setShowNewBeautificationGroupModal(false);
      setNewBeautificationGroupName('');
      return;
    }
    const updatedCats = [...currentCats, name];
    updateAppData({ ...appData, beautificationCategories: updatedCats });
    setBeautificationCategoryFilter(name);
    setShowNewBeautificationGroupModal(false);
    setNewBeautificationGroupName('');
    showToast(`成功新建分组: ${name}`, 'success');
  };

  const handleRenameBeautificationGroup = () => {
    if (!managingBeautificationGroup) return;
    const newName = renameBeautificationGroupInput.trim();
    if (!newName) {
      showToast('请输入新的分组名称', 'error');
      return;
    }
    if (newName === managingBeautificationGroup) {
      setManagingBeautificationGroup(null);
      return;
    }

    const currentCats = appData.beautificationCategories || ['默认'];
    const updatedCats = currentCats.map((c) => (c === managingBeautificationGroup ? newName : c));

    const updatedBeautifications = (appData.beautifications || []).map((b) =>
      (b.category || '默认') === managingBeautificationGroup ? { ...b, category: newName } : b
    );

    updateAppData({
      ...appData,
      beautificationCategories: Array.from(new Set(updatedCats)),
      beautifications: updatedBeautifications,
    });

    if (beautificationCategoryFilter === managingBeautificationGroup) {
      setBeautificationCategoryFilter(newName);
    }

    setManagingBeautificationGroup(null);
    showToast('分组重命名成功', 'success');
  };

  const handleConfirmDeleteBeautificationGroup = () => {
    if (!managingBeautificationGroup) return;
    const targetGroup = managingBeautificationGroup;

    let updatedBeautifications = appData.beautifications || [];
    if (deleteBeautificationsWithGroup) {
      updatedBeautifications = updatedBeautifications.filter((b) => (b.category || '默认') !== targetGroup);
    } else {
      updatedBeautifications = updatedBeautifications.map((b) =>
        (b.category || '默认') === targetGroup ? { ...b, category: '默认' } : b
      );
    }

    const currentCats = appData.beautificationCategories || ['默认'];
    const updatedCats = currentCats.filter((c) => c !== targetGroup);

    updateAppData({
      ...appData,
      beautificationCategories: updatedCats,
      beautifications: updatedBeautifications,
    });

    if (beautificationCategoryFilter === targetGroup) {
      setBeautificationCategoryFilter('全部分组');
    }

    setManagingBeautificationGroup(null);
    setDeleteBeautificationsWithGroup(false);
    showToast(`分组 “${targetGroup}” 已删除`, 'info');
  };

  const handleBatchMoveBeautifications = () => {
    if (selectedBeautificationIds.length === 0) return;
    const target = batchTargetBeautificationGroup.trim();
    if (!target) {
      showToast('请选择或输入目标分组', 'error');
      return;
    }

    const updatedBeautifications = (appData.beautifications || []).map((b) =>
      selectedBeautificationIds.includes(b.id) ? { ...b, category: target } : b
    );

    const existingCats = appData.beautificationCategories || ['默认'];
    const newCats = existingCats.includes(target) ? existingCats : [...existingCats, target];

    updateAppData({
      ...appData,
      beautifications: updatedBeautifications,
      beautificationCategories: newCats,
    });

    setSelectedBeautificationIds([]);
    setBeautificationBatchMode(false);
    setShowBeautificationBatchMoveModal(false);
    setBatchTargetBeautificationGroup('');
    showToast(`已将 ${selectedBeautificationIds.length} 个美化移动到 “${target}”`, 'success');
  };

  // ==================== ST PRESETS STATE & HANDLERS ====================
  const presetFileInputRef = useRef<HTMLInputElement>(null);
  const presetUpdateInputRef = useRef<HTMLInputElement>(null);
  const presetRegexFileInputRef = useRef<HTMLInputElement>(null);

  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const [presetCategoryFilter, setPresetCategoryFilter] = useState('全部分组');
  const [presetBatchMode, setPresetBatchMode] = useState(false);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);

  // Group Modals State for Presets
  const [showNewPresetGroupModal, setShowNewPresetGroupModal] = useState(false);
  const [newPresetGroupName, setNewPresetGroupName] = useState('');

  const [managingPresetGroup, setManagingPresetGroup] = useState<string | null>(null);
  const [renamePresetGroupInput, setRenamePresetGroupInput] = useState('');
  const [deletePresetsWithGroup, setDeletePresetsWithGroup] = useState(false);

  const [showPresetBatchMoveModal, setShowPresetBatchMoveModal] = useState(false);
  const [batchTargetPresetGroup, setBatchTargetPresetGroup] = useState('');

  // Preset Detail Modal State
  const [editingPreset, setEditingPreset] = useState<PresetEntry | null>(null);
  const [editingPresetTab, setEditingPresetTab] = useState<'details' | 'content' | 'regex'>('details');
  const [presetEntrySearchQuery, setPresetEntrySearchQuery] = useState('');
  const [expandedPresetEntry, setExpandedPresetEntry] = useState<{ key: string; value: any; index?: number } | null>(null);

  // Preset Entry Management State (Multi-select, Add, Edit, Move Up/Down, Move to other Presets)
  const [presetEntryBatchMode, setPresetEntryBatchMode] = useState(false);
  const [selectedPresetEntryIndices, setSelectedPresetEntryIndices] = useState<number[]>([]);
  const [showAddPresetEntryModal, setShowAddPresetEntryModal] = useState(false);
  const [newPresetEntryForm, setNewPresetEntryForm] = useState({ name: '', content: '' });
  const [editingPresetEntryModal, setEditingPresetEntryModal] = useState<{ index: number; name: string; content: string } | null>(null);
  const [showMovePresetEntryModal, setShowMovePresetEntryModal] = useState(false);
  const [movingEntryIndices, setMovingEntryIndices] = useState<number[]>([]);
  const [targetMovePresetId, setTargetMovePresetId] = useState('');

  // Helper to get structured entries list from preset
  const getPresetEntriesList = (preset: PresetEntry | null): { index: number; name: string; content: string; rawItem: any }[] => {
    if (!preset || !preset.jsonData) return [];
    const data = preset.jsonData;
    const list: { index: number; name: string; content: string; rawItem: any }[] = [];

    if (data && typeof data === 'object' && Array.isArray(data.prompts)) {
      data.prompts.forEach((p: any, idx: number) => {
        const name = p?.name || p?.identifier || p?.role || p?.title || `提示词 #${idx + 1}`;
        const content = p?.content ?? p?.value ?? p?.text ?? (typeof p === 'string' ? p : JSON.stringify(p, null, 2));
        list.push({ index: idx, name, content: decodeUnicodeAndEscapes(content), rawItem: p });
      });
    } else if (Array.isArray(data)) {
      data.forEach((item: any, idx: number) => {
        const name = item?.name || item?.identifier || item?.role || `条目 #${idx + 1}`;
        const content = item?.content ?? item?.value ?? item?.text ?? (typeof item === 'string' ? item : JSON.stringify(item, null, 2));
        list.push({ index: idx, name, content: decodeUnicodeAndEscapes(content), rawItem: item });
      });
    } else if (data && typeof data === 'object') {
      Object.entries(data).forEach(([k, v], idx) => {
        if (k !== 'regex_scripts' && k !== 'regexes' && k !== 'extensions' && k !== 'user_regexes') {
          const content = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '');
          list.push({ index: idx, name: k, content: decodeUnicodeAndEscapes(content), rawItem: v });
        }
      });
    } else {
      list.push({ index: 0, name: '内容数据', content: decodeUnicodeAndEscapes(data), rawItem: data });
    }
    return list;
  };

  // Helper to save updated entries list into preset and appData
  const savePresetEntriesList = (preset: PresetEntry, newList: { name: string; content: string; rawItem?: any }[]) => {
    const data = JSON.parse(JSON.stringify(preset.jsonData || {}));
    let newJsonData: any;

    if (data && typeof data === 'object' && Array.isArray(data.prompts)) {
      const updatedPrompts = newList.map((item) => {
        if (item.rawItem && typeof item.rawItem === 'object') {
          return { ...item.rawItem, name: item.name, content: item.content };
        }
        return { name: item.name, content: item.content, role: 'system' };
      });
      newJsonData = { ...data, prompts: updatedPrompts };
    } else if (Array.isArray(data)) {
      newJsonData = newList.map((item) => {
        if (item.rawItem && typeof item.rawItem === 'object') {
          return { ...item.rawItem, name: item.name, content: item.content };
        }
        return { name: item.name, content: item.content };
      });
    } else if (data && typeof data === 'object') {
      const newObj: Record<string, any> = {};
      if (data.regex_scripts) newObj.regex_scripts = data.regex_scripts;
      if (data.extensions) newObj.extensions = data.extensions;
      newList.forEach((item) => {
        newObj[item.name] = item.content;
      });
      newJsonData = newObj;
    } else {
      newJsonData = newList.length === 1 ? newList[0].content : newList;
    }

    const updatedEntry: PresetEntry = {
      ...preset,
      jsonData: newJsonData,
      rawJsonString: JSON.stringify(newJsonData, null, 2),
      updatedAt: Date.now(),
    };

    setEditingPreset(updatedEntry);

    updateAppData((prev) => ({
      ...prev,
      presets: (prev.presets || []).map((p) => (p.id === preset.id ? updatedEntry : p)),
    }));
  };

  // Filtered Presets List
  const presetsList = appData.presets || [];
  const availablePresetCategories = useMemo(() => Array.from(
    new Set(['全部分组', '默认', ...(appData.presetCategories || []), ...presetsList.map((p) => p.category || '默认')])
  ), [appData.presetCategories, presetsList]);

  const filteredPresets = useMemo(() => {
    return presetsList.filter((item) => {
      if (presetTagsFilter && presetTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!presetTagsFilter.every((t: string) => allTags.includes(t))) return false;
      }
      if (presetCategoryFilter !== '全部分组' && (item.category || '默认') !== presetCategoryFilter) {
        return false;
      }
      if (!presetSearchQuery.trim()) return true;
      const q = presetSearchQuery.toLowerCase();
      const rawStr = item.rawJsonString || (typeof item.jsonData === 'string' ? item.jsonData : JSON.stringify(item.jsonData));
      return (
        item.name.toLowerCase().includes(q) ||
        (item.fileName && item.fileName.toLowerCase().includes(q)) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (rawStr && rawStr.toLowerCase().includes(q))
      );
    });
  }, [presetsList, presetTagsFilter, presetCategoryFilter, presetSearchQuery]);

  const decodeUnicodeAndEscapes = (str: any): string => {
    if (typeof str !== 'string') return typeof str === 'object' ? JSON.stringify(str, null, 2) : String(str ?? '');
    try {
      let s = str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
      s = s.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
      return s;
    } catch {
      return str;
    }
  };


  const handleCreateNewPresetGroup = () => {
    const name = newPresetGroupName.trim();
    if (!name) {
      showToast('请输入分组名称', 'error');
      return;
    }
    const currentCats = appData.presetCategories || ['默认'];
    if (currentCats.includes(name)) {
      showToast('该分组已存在', 'info');
      setPresetCategoryFilter(name);
      setShowNewPresetGroupModal(false);
      setNewPresetGroupName('');
      return;
    }
    const updatedCats = [...currentCats, name];
    updateAppData({ ...appData, presetCategories: updatedCats });
    setPresetCategoryFilter(name);
    setShowNewPresetGroupModal(false);
    setNewPresetGroupName('');
    showToast(`成功新建预设分组: ${name}`, 'success');
  };

  const handleRenamePresetGroup = () => {
    if (!managingPresetGroup) return;
    const newName = renamePresetGroupInput.trim();
    if (!newName) {
      showToast('请输入新的分组名称', 'error');
      return;
    }
    if (newName === managingPresetGroup) {
      setManagingPresetGroup(null);
      return;
    }

    const currentCats = appData.presetCategories || ['默认'];
    const updatedCats = currentCats.map((c) => (c === managingPresetGroup ? newName : c));

    const updatedPresets = (appData.presets || []).map((p) =>
      (p.category || '默认') === managingPresetGroup ? { ...p, category: newName } : p
    );

    updateAppData({
      ...appData,
      presetCategories: Array.from(new Set(updatedCats)),
      presets: updatedPresets,
    });

    if (presetCategoryFilter === managingPresetGroup) {
      setPresetCategoryFilter(newName);
    }

    setManagingPresetGroup(null);
    showToast('分组重命名成功', 'success');
  };

  const handleConfirmDeletePresetGroup = () => {
    if (!managingPresetGroup) return;
    const targetGroup = managingPresetGroup;

    let updatedPresets = appData.presets || [];
    if (deletePresetsWithGroup) {
      updatedPresets = updatedPresets.filter((p) => (p.category || '默认') !== targetGroup);
    } else {
      updatedPresets = updatedPresets.map((p) =>
        (p.category || '默认') === targetGroup ? { ...p, category: '默认' } : p
      );
    }

    const currentCats = appData.presetCategories || ['默认'];
    const updatedCats = currentCats.filter((c) => c !== targetGroup);

    updateAppData({
      ...appData,
      presetCategories: updatedCats,
      presets: updatedPresets,
    });

    if (presetCategoryFilter === targetGroup) {
      setPresetCategoryFilter('全部分组');
    }

    setManagingPresetGroup(null);
    setDeletePresetsWithGroup(false);
    showToast(`分组 “${targetGroup}” 已删除`, 'info');
  };

  const handleBatchMovePresets = () => {
    if (selectedPresetIds.length === 0) return;
    const target = batchTargetPresetGroup.trim();
    if (!target) {
      showToast('请选择或输入目标分组', 'error');
      return;
    }

    const updatedPresets = (appData.presets || []).map((p) =>
      selectedPresetIds.includes(p.id) ? { ...p, category: target } : p
    );

    const existingCats = appData.presetCategories || ['默认'];
    const newCats = existingCats.includes(target) ? existingCats : [...existingCats, target];

    updateAppData({
      ...appData,
      presets: updatedPresets,
      presetCategories: newCats,
    });

    setSelectedPresetIds([]);
    setPresetBatchMode(false);
    setShowPresetBatchMoveModal(false);
    setBatchTargetPresetGroup('');
    showToast(`已将 ${selectedPresetIds.length} 个预设移动到 “${target}”`, 'success');
  };

  const handleBatchDeletePresets = () => {
    if (selectedPresetIds.length === 0) return;
    const updatedPresets = (appData.presets || []).filter((p) => !selectedPresetIds.includes(p.id));
    updateAppData({ ...appData, presets: updatedPresets });
    setSelectedPresetIds([]);
    setPresetBatchMode(false);
    showToast(`已批量删除 ${selectedPresetIds.length} 个预设`, 'info');
  };

  // Detail Modal Actions
  const handleSaveEditingPreset = async () => {
    if (!editingPreset) return;

    // 以当前编辑面板的最终快照为准，并使用函数式更新，避免快速编辑/保存时旧 appData 覆盖新内容。
    const snapshot: PresetEntry = {
      ...editingPreset,
      jsonData: editingPreset.jsonData,
      updatedAt: Date.now(),
      rawJsonString: JSON.stringify(editingPreset.jsonData || {}, null, 2),
    };

    updateAppData((prev) => ({
      ...prev,
      presets: (prev.presets || []).map((item) => (item.id === snapshot.id ? { ...snapshot } : item)),
    }));

    // 先把编辑态同步为最终快照，保证任何仍在显示的预览内容立即跟随修改；
    // 随后关闭详情面板，外层预设列表直接从更新后的 appData 渲染。
    setEditingPreset(snapshot);
    setEditingPreset(null);
    showToast('预设修改已保存，预览内容已同步更新', 'success');
  };

  const handleExportEditingPreset = () => {
    if (!editingPreset) return;
    const dataStr = JSON.stringify(editingPreset.jsonData || {}, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    triggerFileDownload(blob, editingPreset.fileName || `${editingPreset.name}.json`);
    showToast('预设文件导出成功', 'success');
  };

  const handleDeleteEditingPreset = () => {
    if (!editingPreset) return;
    const updatedPresets = (appData.presets || []).filter((p) => p.id !== editingPreset.id);
    updateAppData({ ...appData, presets: updatedPresets });
    setEditingPreset(null);
    showToast('预设已删除', 'info');
  };

  const handleUpdateEditingPresetFile = async (file: File) => {
    if (!editingPreset) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const updatedEntry: PresetEntry = {
        ...editingPreset,
        fileName: file.name,
        jsonData: json,
        rawJsonString: JSON.stringify(json, null, 2),
        updatedAt: Date.now(),
      };
      setEditingPreset(updatedEntry);

      // Save to appData
      const updatedPresets = (appData.presets || []).map((p) => (p.id === editingPreset.id ? updatedEntry : p));
      updateAppData({ ...appData, presets: updatedPresets });
      showToast('预设数据文件已更新覆盖', 'success');
    } catch (err) {
      showToast('无法解析上传的 JSON 文件', 'error');
    }
  };

  const getPresetRegexScripts = (preset: PresetEntry | null): any[] => {
    if (!preset) return [];
    if (Array.isArray(preset.regexScripts) && preset.regexScripts.length > 0) {
      return preset.regexScripts;
    }
    const data = preset.jsonData;
    if (!data) return [];
    if (Array.isArray(data.regex_scripts)) return data.regex_scripts;
    if (Array.isArray(data.extensions?.regex_scripts)) return data.extensions.regex_scripts;
    if (Array.isArray(data.regexes)) return data.regexes;
    if (Array.isArray(data.user_regexes)) return data.user_regexes;
    if (Array.isArray(data.regex)) return data.regex;
    if (Array.isArray(data)) {
      const isRegexArray = data.some(
        (item) =>
          item &&
          typeof item === 'object' &&
          (item.findRegex || item.find_regex || item.pattern || item.scriptName || item.script_name || item.replaceString || item.replace_string)
      );
      if (isRegexArray) return data;
    }
    if (data.findRegex || data.find_regex || data.pattern || data.scriptName || data.script_name) {
      return [data];
    }
    return [];
  };

  const handleUploadPresetRegexFile = async (file: File) => {
    if (!editingPreset) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      let newRegexScripts: any[] = [];

      if (Array.isArray(json)) {
        newRegexScripts = json;
      } else if (json && typeof json === 'object') {
        if (Array.isArray(json.regex_scripts)) {
          newRegexScripts = json.regex_scripts;
        } else if (Array.isArray(json.regexes)) {
          newRegexScripts = json.regexes;
        } else if (Array.isArray(json.extensions?.regex_scripts)) {
          newRegexScripts = json.extensions.regex_scripts;
        } else if (json.findRegex || json.find_regex || json.pattern || json.scriptName || json.script_name) {
          newRegexScripts = [json];
        }
      }

      if (newRegexScripts.length === 0) {
        showToast('未能识别有效的正则数据，请检查文件格式', 'error');
        return;
      }

      const normalizedScripts = newRegexScripts.map((rx: any) => {
        const name = (typeof rx?.scriptName === 'string' ? rx.scriptName : typeof rx?.script_name === 'string' ? rx.script_name : typeof rx?.name === 'string' ? rx.name : typeof rx?.title === 'string' ? rx.title : '导入正则').trim();
        const find = (typeof rx?.findRegex === 'string' ? rx.findRegex : typeof rx?.find_regex === 'string' ? rx.find_regex : typeof rx?.pattern === 'string' ? rx.pattern : typeof rx?.find === 'string' ? rx.find : typeof rx?.regex === 'string' ? rx.regex : '') || '';
        const replace = (typeof rx?.replaceString === 'string' ? rx.replaceString : typeof rx?.replace_string === 'string' ? rx.replace_string : typeof rx?.replacement === 'string' ? rx.replacement : typeof rx?.replace === 'string' ? rx.replace : '') || '';
        return {
          ...rx,
          scriptName: name, script_name: name, name: name,
          findRegex: find, find_regex: find, pattern: find,
          replaceString: replace, replace_string: replace, replacement: replace,
          disabled: Boolean(rx.disabled),
        };
      });

      const currentRegex = getPresetRegexScripts(editingPreset);
      const combined = [...currentRegex, ...normalizedScripts];

      const updatedPreset: PresetEntry = {
        ...editingPreset,
        regexScripts: combined,
        jsonData: {
          ...(typeof editingPreset.jsonData === 'object' ? editingPreset.jsonData : {}),
          extensions: {
            ...(editingPreset.jsonData?.extensions || {}),
            regex_scripts: combined,
          },
          regex_scripts: combined,
        },
      };

      setEditingPreset(updatedPreset);
      const updatedPresets = (appData.presets || []).map((p) => (p.id === editingPreset.id ? updatedPreset : p));
      updateAppData({ ...appData, presets: updatedPresets });
      showToast(`已成功自动识别并添加 ${normalizedScripts.length} 条正则`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('解析正则文件失败: ' + err.message, 'error');
    }
  };

  // ==================== ST PLUGINS & SCRIPTS STATE & HANDLERS ====================
  const pluginScriptFileInputRef = useRef<HTMLInputElement>(null);

  const [pluginSearchQuery, setPluginSearchQuery] = useState('');
  const [pluginCategoryFilter, setPluginCategoryFilter] = useState('全部分组');
  const [pluginBatchMode, setPluginBatchMode] = useState(false);
  const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>([]);

  // Selection popup state for top bar '+' button when on 'st-plugins' page
  const [showAddPluginTypeModal, setShowAddPluginTypeModal] = useState(false);

  // Add Plugin (Link) Modal State
  const [showAddPluginModal, setShowAddPluginModal] = useState(false);
  const [pluginForm, setPluginForm] = useState({
    name: '',
    url: '',
    contact: '',
    description: '',
  });

  // Detail Modal State for Plugin or Script
  // 插件保持原来的单页详情；脚本独立使用双 Tab 详情。
  const [editingPlugin, setEditingPlugin] = useState<PluginEntry | null>(null);
  const [scriptDetailTab, setScriptDetailTab] = useState<'info' | 'code'>('info');
  const [isScriptCodeExpanded, setIsScriptCodeExpanded] = useState(false);
  const [scriptSearchQuery, setScriptSearchQuery] = useState('');
  const [scriptContentDraft, setScriptContentDraft] = useState('');

  // New Group Modal State for Plugins
  const [showNewPluginGroupModal, setShowNewPluginGroupModal] = useState(false);
  const [newPluginGroupName, setNewPluginGroupName] = useState('');

  // Manage Group Modal State for Plugins
  const [managingPluginCategory, setManagingPluginCategory] = useState<string | null>(null);
  const [renamePluginCategoryInput, setRenamePluginCategoryInput] = useState('');
  const [showDeletePluginCategoryConfirm, setShowDeletePluginCategoryConfirm] = useState(false);
  const [deleteItemsWithPluginCategory, setDeleteItemsWithPluginCategory] = useState(false);

  // Batch Move Modal State for Plugins
  const [showPluginBatchMoveModal, setShowPluginBatchMoveModal] = useState(false);
  const [batchTargetPluginCategory, setBatchTargetPluginCategory] = useState('');

  // List and Filtering
  const pluginsList = appData.plugins || [];

  const filteredPlugins = useMemo(() => {
    return pluginsList.filter((item) => {
      if (pluginCategoryFilter !== '全部分组' && (item.category || '默认') !== pluginCategoryFilter) {
        return false;
      }
      if (!pluginSearchQuery.trim()) return true;
      const q = pluginSearchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.url && item.url.toLowerCase().includes(q)) ||
        (item.contact && item.contact.toLowerCase().includes(q)) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.fileName && item.fileName.toLowerCase().includes(q))
      );
    });
  }, [pluginsList, pluginCategoryFilter, pluginSearchQuery]);

  // Handlers
  const handleAddPluginSubmit = () => {
    if (!pluginForm.name.trim()) {
      showToast('请填写插件名称', 'error');
      return;
    }
    if (!pluginForm.url.trim()) {
      showToast('请填写插件地址', 'error');
      return;
    }

    const newPlugin: PluginEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      type: 'plugin',
      name: pluginForm.name.trim(),
      url: pluginForm.url.trim(),
      contact: pluginForm.contact.trim(),
      description: pluginForm.description.trim(),
      category: pluginCategoryFilter !== '全部分组' ? pluginCategoryFilter : '默认',
      importedAt: Date.now(), createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...pluginsList, newPlugin];
    updateAppData({ ...appData, plugins: updated });
    setPluginForm({ name: '', url: '', contact: '', description: '' });
    setShowAddPluginModal(false);
    showToast('插件添加成功！', 'success');
  };

  const handleScriptFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newEntries: PluginEntry[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const text = await file.text();
        let json: any = {};
        try {
          json = JSON.parse(text);
        } catch (e) {
          json = {};
        }

        const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
        const nameClean = json.name || json.script_name || json.scriptName || json.qrName || json.qr_name || json.title || json.label || cleanFileName || '未命名脚本';
        const authorClean = json.author || json.creator || json.display_name || json.authorName || '未知作者';

        const entry: PluginEntry = {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6) + i,
          type: 'script',
          name: nameClean,
          fileName: file.name,
          author: authorClean,
          category: pluginCategoryFilter !== '全部分组' ? pluginCategoryFilter : '默认',
          source: json.source || json.link || '',
          description: json.description || json.summary || '',
          jsonData: json,
          importedAt: Date.now(), createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        newEntries.push(entry);
      } catch (err: any) {
        showToast(`读取文件 "${file.name}" 失败: ${err.message}`, 'error');
      }
    }

    if (newEntries.length > 0) {
      const updated = [...pluginsList, ...newEntries];
      updateAppData({ ...appData, plugins: updated });
      showToast(`成功导入 ${newEntries.length} 个脚本文件！`, 'success');
    }
  };

  const getPluginScriptContent = (plugin: PluginEntry | null) => {
    if (!plugin) return '';
    if (typeof plugin.jsonData === 'string') return plugin.jsonData;
    try {
      return JSON.stringify(plugin.jsonData ?? {}, null, 2);
    } catch {
      return String(plugin.jsonData ?? '');
    }
  };

  const handleOpenPluginDetail = (item: PluginEntry) => {
    setEditingPlugin({ ...item });
    if (item.type === 'script') {
      setScriptDetailTab('info');
      setScriptSearchQuery('');
      setScriptContentDraft(getPluginScriptContent(item));
      setIsScriptCodeExpanded(false);
    }
  };

  const handleExportPluginScriptJson = (plugin: PluginEntry) => {
    if (plugin.type !== 'script') return;
    const content = getPluginScriptContent(plugin);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    triggerFileDownload(blob, `${(plugin.name || plugin.fileName || 'script').replace(/[\\/:*?"<>|]/g, '_')}.json`);
    showToast('脚本 JSON 已导出', 'success');
  };

  const handleSaveScriptContent = () => {
    if (!editingPlugin || editingPlugin.type !== 'script') return;
    try {
      const parsed = JSON.parse(scriptContentDraft);
      const updatedPlugin = {
        ...editingPlugin,
        jsonData: parsed,
        updatedAt: Date.now(),
      };
      setEditingPlugin(updatedPlugin);
      const updated = pluginsList.map((p) => (p.id === updatedPlugin.id ? updatedPlugin : p));
      updateAppData({ ...appData, plugins: updated });
      showToast('脚本内容已保存', 'success');
    } catch {
      showToast('脚本内容不是有效的 JSON，请检查后再保存', 'error');
    }
  };

  const handleCreateNewPluginCategory = () => {
    const trimmed = newPluginGroupName.trim();
    if (!trimmed) return;
    if (trimmed === '全部分组') {
      showToast('"全部分组"为系统保留名称', 'error');
      return;
    }
    const currentCats = appData.pluginCategories || ['默认'];
    if (currentCats.includes(trimmed)) {
      showToast('该分组名称已存在', 'error');
      return;
    }

    updateAppData({
      ...appData,
      pluginCategories: [...currentCats, trimmed],
    });
    setNewPluginGroupName('');
    setShowNewPluginGroupModal(false);
    setPluginCategoryFilter(trimmed);
    showToast(`成功新建分组: ${trimmed}`, 'success');
  };

  const handleRenamePluginCategory = () => {
    if (!managingPluginCategory) return;
    const trimmed = renamePluginCategoryInput.trim();
    if (!trimmed) return;
    if (trimmed === '全部分组') {
      showToast('"全部分组"为系统保留名称', 'error');
      return;
    }

    const currentCats = appData.pluginCategories || ['默认'];
    const updatedCats = currentCats.map((c) => (c === managingPluginCategory ? trimmed : c));
    const updatedPlugins = pluginsList.map((p) =>
      (p.category || '默认') === managingPluginCategory ? { ...p, category: trimmed } : p
    );

    updateAppData({
      ...appData,
      plugins: updatedPlugins,
      pluginCategories: updatedCats,
    });

    if (pluginCategoryFilter === managingPluginCategory) {
      setPluginCategoryFilter(trimmed);
    }
    showToast(`分组已重命名为 "${trimmed}"`, 'success');
    setManagingPluginCategory(null);
  };

  const handleConfirmDeletePluginCategory = () => {
    if (!managingPluginCategory) return;

    let updatedPlugins = [...pluginsList];
    if (deleteItemsWithPluginCategory) {
      updatedPlugins = updatedPlugins.filter((p) => (p.category || '默认') !== managingPluginCategory);
    } else {
      updatedPlugins = updatedPlugins.map((p) =>
        (p.category || '默认') === managingPluginCategory ? { ...p, category: '默认' } : p
      );
    }

    const currentCats = appData.pluginCategories || ['默认'];
    const updatedCats = currentCats.filter((c) => c !== managingPluginCategory);

    updateAppData({
      ...appData,
      plugins: updatedPlugins,
      pluginCategories: updatedCats,
    });

    showToast(`分组 "${managingPluginCategory}" 已删除`, 'info');
    if (pluginCategoryFilter === managingPluginCategory) {
      setPluginCategoryFilter('全部分组');
    }
    setManagingPluginCategory(null);
    setShowDeletePluginCategoryConfirm(false);
    setDeleteItemsWithPluginCategory(false);
  };

  const handleBatchDeletePlugins = () => {
    if (selectedPluginIds.length === 0) return;
    requestDelete(`确定要删除选中的 ${selectedPluginIds.length} 个插件/脚本吗？`, selectedPluginIds.length, () => {

    const updated = pluginsList.filter((p) => !selectedPluginIds.includes(p.id));
    updateAppData({ ...appData, plugins: updated });

    showToast(`已成功删除 ${selectedPluginIds.length} 个插件/脚本`, 'info');
    setSelectedPluginIds([]);
    setPluginBatchMode(false);
    });
  };

  const handleConfirmBatchMovePlugins = () => {
    if (!batchTargetPluginCategory) {
      showToast('请选择目标分组', 'error');
      return;
    }
    const target = batchTargetPluginCategory;
    const updated = pluginsList.map((p) =>
      selectedPluginIds.includes(p.id) ? { ...p, category: target } : p
    );

    updateAppData({ ...appData, plugins: updated });

    setSelectedPluginIds([]);
    setPluginBatchMode(false);
    setShowPluginBatchMoveModal(false);
    setBatchTargetPluginCategory('');
    showToast(`已将 ${selectedPluginIds.length} 个插件/脚本移动到 “${target}”`, 'success');
  };

  // ==================== NORMAL CHARACTER CARDS STATE & HANDLERS ====================
  const normalCardFileInputRef = useRef<HTMLInputElement>(null);
  const normalCardCoverInputRef = useRef<HTMLInputElement>(null);
  const normalCardUpdateFileInputRef = useRef<HTMLInputElement>(null);

  const [normalCardSearchQuery, setNormalCardSearchQuery] = useState('');
  const [normalCardCategoryFilter, setNormalCardCategoryFilter] = useState('全部分组');
  const [normalCardBatchMode, setNormalCardBatchMode] = useState(false);
  const [selectedNormalCardIds, setSelectedNormalCardIds] = useState<string[]>([]);

  // Single-Page Detail Modal State
  const [editingNormalCard, setEditingNormalCard] = useState<NormalCardEntry | null>(null);

  // Zoomed/Expanded Document Content Modal State
  const [showExpandedContentModal, setShowExpandedContentModal] = useState(false);

  // New Group Modal State
  const [showNewNormalCardGroupModal, setShowNewNormalCardGroupModal] = useState(false);
  const [newNormalCardGroupName, setNewNormalCardGroupName] = useState('');

  // Manage Group Modal State
  const [managingNormalCardCategory, setManagingNormalCardCategory] = useState<string | null>(null);
  const [renameNormalCardCategoryInput, setRenameNormalCardCategoryInput] = useState('');
  const [showDeleteNormalCardCategoryConfirm, setShowDeleteNormalCardCategoryConfirm] = useState(false);
  const [deleteItemsWithNormalCardCategory, setDeleteItemsWithNormalCardCategory] = useState(false);

  // Batch Move Modal State
  const [showNormalCardBatchMoveModal, setShowNormalCardBatchMoveModal] = useState(false);
  const [batchTargetNormalCardCategory, setBatchTargetNormalCardCategory] = useState('');
  const [normalCardRoleTab, setNormalCardRoleTab] = useState<'main' | 'npc'>('main');

  const normalCardsList = appData.normalCards || [];

  const filteredNormalCards = useMemo(() => {
    return normalCardsList.filter((item) => {
      // Main Character vs NPC Supporting Character switch
      if (normalCardRoleTab === 'npc') {
        if (!item.isNpc && item.cardRole !== 'npc') return false;
      } else {
        if (item.isNpc || item.cardRole === 'npc') return false;
      }

      if (normalCardTagsFilter && normalCardTagsFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!normalCardTagsFilter.every((t: string) => allTags.includes(t))) return false;
      }
      if (normalCardCategoryFilter !== '全部分组' && (item.category || '默认') !== normalCardCategoryFilter) {
        return false;
      }
      if (!normalCardSearchQuery.trim()) return true;
      const q = normalCardSearchQuery.toLowerCase();
      return (
        (item.fileName && item.fileName.toLowerCase().includes(q)) ||
        (item.charName && item.charName.toLowerCase().includes(q)) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q)) ||
        (item.content && item.content.toLowerCase().includes(q))
      );
    });
  }, [normalCardsList, normalCardRoleTab, normalCardTagsFilter, normalCardCategoryFilter, normalCardSearchQuery]);

  const confirmNormalZipImport = async () => {
    if (!normalZipPreview) return;
    const selectedFiles = normalZipPreview.files.filter((item) => item.selected && /\.(docx|txt)$/i.test(item.name));
    if (!selectedFiles.length) {
      showToast('请至少选择一个文档导入', 'error');
      return;
    }
    const newEntries: NormalCardEntry[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      const cleanName = item.name.split('/').pop()!.replace(/\.[^/.]+$/, '') || '未命名角色卡';
      newEntries.push({
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6) + i,
        fileName: cleanName,
        charName: cleanName,
        author: '未知作者',
        category: normalCardCategoryFilter !== '全部分组' ? normalCardCategoryFilter : '默认',
        source: '', coverImage: null, content: item.content || '', importedAt: Date.now(), createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
    if (newEntries.length) {
      updateAppData((prev) => ({ ...prev, normalCards: [...(prev.normalCards || []), ...newEntries] }));
      showToast(`ZIP 已导入 ${newEntries.length} 个文档`, 'success');
    }
    setNormalZipPreview(null);
  };

  const toggleNormalZipFileSelection = (name: string) => {
    setNormalZipPreview((prev) => prev ? {
      ...prev,
      files: prev.files.map((f) => f.name === name ? { ...f, selected: !f.selected } : f),
    } : prev);
  };


  
  const handleNormalCardFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const zipFile = fileArray.find((f) => f.name.toLowerCase().endsWith('.zip'));
    if (zipFile) {
      try {
        const bytes = new Uint8Array(await zipFile.arrayBuffer());
        const unzipped = fflate.unzipSync(bytes);
        const previewFiles: Array<{ name: string; size: number; content: string; selected: boolean }> = [];
        for (const [name, data] of Object.entries(unzipped)) {
          if (name.startsWith('__MACOSX') || name.endsWith('/')) continue;
          let content = '';
          const lower = name.toLowerCase();
          if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.json')) {
            content = fflate.strFromU8(data as Uint8Array);
          } else if (lower.endsWith('.docx')) {
            const ab = (data as Uint8Array).buffer.slice((data as Uint8Array).byteOffset, (data as Uint8Array).byteOffset + (data as Uint8Array).byteLength);
            const res = await mammoth.extractRawText({ arrayBuffer: ab as ArrayBuffer });
            content = res.value || '';
          }
          previewFiles.push({ name, size: (data as Uint8Array).byteLength, content, selected: true });
        }
        setNormalZipPreview({ fileName: zipFile.name, files: previewFiles });
        showToast(`ZIP 已解压，识别到 ${previewFiles.length} 个可导入文件，请确认`, 'info');
      } catch (err: any) {
        showToast(`ZIP 解压失败: ${err.message || '格式错误'}`, 'error');
      }
      return;
    }
    let curCards = [...(appData.normalCards || [])];
    let addedCount = 0;
    let versionCount = 0;
    let distinctCount = 0;
    let skippedCount = 0;
    const showProgress = fileArray.length > 8;
    if (showProgress) showToast(`开始导入 ${fileArray.length} 个文件…`, 'info');
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      try {
        const parsed = await parseNormalCardFile(file);
        const cardName = parsed.fileName || parsed.charName || parsed.name || file.name.replace(/\.[^/.]+$/, '') || '未命名角色卡';
        const cardContent = parsed.content || '';
        const newEntry: NormalCardEntry = {
          ...parsed,
          id: 'nc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6) + '_' + i,
          fileName: cardName,
          charName: parsed.charName || cardName,
          name: parsed.name || cardName,
          category: normalCardCategoryFilter !== '全部分组' ? normalCardCategoryFilter : (parsed.category || '默认'),
          content: cardContent,
          importedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const existingSameName = curCards.filter((c: any) => (c.charName || c.fileName || '').trim().toLowerCase() === cardName.toLowerCase());
        if (existingSameName.length === 0) {
          curCards.push(newEntry);
          addedCount++;
        } else {
          let matchedCard: NormalCardEntry | null = null;
          let bestDiff: any = { status: 'completely_different', similarity: 0, summary: '' };
          for (const extCard of existingSameName) {
            const diff = compareNormalCards(cardContent, extCard);
            if (diff.status === 'identical') {
              matchedCard = extCard;
              bestDiff = diff;
              break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedCard = extCard;
              bestDiff = diff;
            }
          }
          if (bestDiff.status === 'identical' && matchedCard) {
            skippedCount++;
          } else if (bestDiff.status === 'partially_different' && matchedCard) {
            const currentVersions = matchedCard.versions || [];
            const verNum = currentVersions.length + 1;
            const nextVerLabel = `v${verNum + 1}`;
            const prevSnapshot = {
              versionId: `ver_${matchedCard.id}_${verNum}_${Date.now()}`,
              versionNumber: verNum,
              versionLabel: matchedCard.activeVersionLabel || `v${verNum}`,
              updatedAt: matchedCard.updatedAt || matchedCard.createdAt || Date.now(),
              importedAt: (matchedCard as any).importedAt || matchedCard.createdAt || Date.now(),
              fileName: matchedCard.fileName,
              changeSummary: matchedCard.currentVersionSummary || `系统快照 (版本更迭前)`,
              data: {
                charName: matchedCard.charName,
                fileName: matchedCard.fileName,
                content: matchedCard.content
              }
            };
            const updatedCard: NormalCardEntry = {
              ...matchedCard,
              content: cardContent,
              fileName: cardName,
              charName: cardName,
              updatedAt: Date.now(),
              importedAt: Date.now(),
              activeVersionNumber: verNum + 1,
              activeVersionLabel: nextVerLabel,
              currentVersionSummary: bestDiff.summary || `升级至新版本 (来源于 ${file.name})`,
              customTags: Array.from(new Set([...(matchedCard.customTags || []), '已更新'])),
              versions: [prevSnapshot, ...currentVersions]
            };
            versionCount++;
            const idx = curCards.findIndex((c: any) => c.id === matchedCard!.id);
            if (idx > -1) curCards[idx] = updatedCard;
          } else {
            const distinctCard: NormalCardEntry = {
              ...newEntry,
              id: 'ncard_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              importedAt: Date.now(),
              currentVersionSummary: '不同卡面初始导入',
              customTags: Array.from(new Set([...(newEntry.customTags || []), '同名不同卡'])),
            };
            curCards.push(distinctCard);
            distinctCount++;
          }
        }
      } catch (err: any) {
        showToast(`文件 "${file.name}" 解析失败: ${err.message}`, 'error');
      }
    }
    updateAppData(prev => ({ ...prev, normalCards: curCards }));
    showToast(`普通角色卡导入完成：新增 ${addedCount}，更新版本 ${versionCount}，同名卡面 ${distinctCount}，跳过 ${skippedCount}`, 'success');
  };

  const handleBatchDeleteNormalCards = () => {
    if (selectedNormalCardIds.length === 0) return;
    requestDelete(`确定要删除选中的 ${selectedNormalCardIds.length} 个角色卡吗？`, selectedNormalCardIds.length, () => {
      const updatedCards = (appData.normalCards || []).filter((c: any) => !selectedNormalCardIds.includes(c.id));
      updateAppData({ ...appData, normalCards: updatedCards });
      setSelectedNormalCardIds([]);
      setNormalCardBatchMode(false);
      showToast(`已批量删除 ${selectedNormalCardIds.length} 个角色卡`, 'info');
    });
  };

  const handleBatchMoveNormalCards = () => {
    if (selectedNormalCardIds.length === 0) return;
    const target = batchTargetNormalCardCategory.trim();
    if (!target) {
      showToast('请选择或输入目标分组', 'error');
      return;
    }

    const updatedCards = (appData.normalCards || []).map((c: any) =>
      selectedNormalCardIds.includes(c.id) ? { ...c, category: target } : c
    );

    const isNpcTab = normalCardRoleTab === 'npc';
    const existingCats = isNpcTab ? (appData.npcCardCategories || ['默认']) : (appData.normalCardCategories || ['默认']);
    const newCats = existingCats.includes(target) ? existingCats : [...existingCats, target];

    updateAppData({
      ...appData,
      normalCards: updatedCards,
      ...(isNpcTab ? { npcCardCategories: newCats } : { normalCardCategories: newCats })
    });

    setSelectedNormalCardIds([]);
    setNormalCardBatchMode(false);
    setShowNormalCardBatchMoveModal(false);
    setBatchTargetNormalCardCategory('');
    showToast(`已将 ${selectedNormalCardIds.length} 个角色卡移动到 “${target}”`, 'success');
  };

  const [showImportCenter, setShowImportCenter] = useState(false);
  useEffect(() => {
    setTavernImportCheckpoint(async apply => {
      flushSync(() => updateAppData(apply));
      const snapshot = appDataRef.current;
      if (!await saveAppData(snapshot, true)) throw Error('本批数据保存失败，请释放存储空间后重试');
      flushSync(() => setAppData(prev => { if (prev !== snapshot) return prev; appDataDirtyRef.current = false; return loadAppData(); }));
      return appDataRef.current;
    });
    return () => setTavernImportCheckpoint(null);
  }, [updateAppData]);
  const setStagedDuplicates = (cards: any[]) => {
    updateAppData((prev: any) => ({ ...prev, stagedDuplicateCards: cards }));
  };
  const { handleFileUpload } = useImportEngine(
    appData,
    updateAppData,
    currentGroup,
    setBatchImportProgress,
    showToast,
    askChoiceAsync,
    setStagedDuplicates,
    setShowStagingVaultModal,
    autoAssociateAllAssets,
    promptDuplicateAction
  );

  // Delete Single Card (with cascading delete for bound assets)
  const handleDeleteCard = useCallback((id: string) => {
    requestDelete('确定要删除这张角色卡吗？其绑定的专属资源（世界书、脚本、正则）将一同清理。', 1, () => {
      const { updatedAppData, deletedCounts } = deleteCardsAndCascadeAssets([id], appDataRef.current);
      updateAppData(updatedAppData);
      setDetailCardId(prev => prev === id ? null : prev);
      const extraParts: string[] = [];
      if (deletedCounts.worldbooks > 0) extraParts.push(`${deletedCounts.worldbooks} 个世界书`);
      if (deletedCounts.scripts > 0) extraParts.push(`${deletedCounts.scripts} 个脚本`);
      if (deletedCounts.regexes > 0) extraParts.push(`${deletedCounts.regexes} 个正则`);
      const extraStr = extraParts.length > 0 ? `，并同步清理了其专属绑定的 ${extraParts.join('、')}` : '';
      showToast(`角色卡已删除${extraStr}`, 'info');
    });
  }, [updateAppData]);

  // Apply Staging Vault Decisions (Multi-select, All, or Discard)
  const handleApplyStagingVaultDecisions = async (decisions: Array<{ stagedId: string; action: 'skip' | 'new_version' | 'distinct_face' | 'overwrite' }>, quiet = false): Promise<boolean> => {
    if (!decisions.length) return true;
    if (decisions.length > 32) {
      showToast(`正在分批处理 ${decisions.length} 张暂存卡片…`, 'info');
      for (let i = 0; i < decisions.length; i += 32) {
        if (!await handleApplyStagingVaultDecisions(decisions.slice(i, i + 32), true)) return false;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      showToast('暂存卡片已分批处理完成', 'success');
      return true;
    }

    const fullCards = new Map<string, CardEntry>();
    const fullAssets = new Map<string, any>();
    try {
      for (const decision of decisions) {
        if (decision.action === 'skip') continue;
        const staged = appDataRef.current.stagedDuplicateCards?.find(s => s.id === decision.stagedId);
        if (!staged) continue;
        for (const card of [staged.incomingCard, appDataRef.current.cards.find(c => c.id === staged.matchedCard.id) || staged.matchedCard]) if (!fullCards.has(card.id)) fullCards.set(card.id, await hydrateCard(card));
      }
      const owners = new Set([...fullCards.keys()]);
      for (const asset of [...(appDataRef.current.stWorldBooks || []), ...(appDataRef.current.stRegexScripts || []), ...(appDataRef.current.scripts || [])]) if (asset.sourceCardId && owners.has(asset.sourceCardId)) fullAssets.set(asset.id, await hydrateCardAsset(asset));
    } catch (error: any) { showToast(error.message, 'error'); return false; }
    let newVerCount = 0;
    let distinctCount = 0;
    let overwriteCount = 0;
    let skipCount = 0;

    flushSync(() => updateAppData(prev => {
      let currentCards = prev.cards.map(card => fullCards.get(card.id) || card);
      let currentWorldBooks = (prev.stWorldBooks || []).map(item => fullAssets.get(item.id) || item);
      let currentScripts = (prev.scripts || []).map(item => fullAssets.get(item.id) || item);
      let currentRegexes = (prev.stRegexScripts || []).map(item => fullAssets.get(item.id) || item);
      let currentStaged = [...(prev.stagedDuplicateCards || [])];

      for (const d of decisions) {
        const stagedIdx = currentStaged.findIndex(s => s.id === d.stagedId);
        if (stagedIdx === -1) continue;
        const stagedItem = currentStaged[stagedIdx];
        const incomingCard = fullCards.get(stagedItem.incomingCard.id) || stagedItem.incomingCard;
        const matchedCard = fullCards.get(stagedItem.matchedCard.id) || stagedItem.matchedCard;

        const isTavernItem = (stagedItem as any).fileSource === 'tavern' || (stagedItem as any).isTavernSource === true || incomingCard.source === 'tavern-folder' || incomingCard.source === 'tavern-network';

        if (d.action === 'skip') {
          currentStaged.splice(stagedIdx, 1);
          skipCount++;
          continue;
        }

        if (d.action === 'new_version') {
          const cardIdx = currentCards.findIndex(c => c.id === matchedCard.id);
          if (cardIdx > -1) {
            const targetCard = { ...currentCards[cardIdx] };
            const currentVersions = targetCard.versions || [];
            const verNum = currentVersions.length + 1;
            const nextVerNum = verNum + 1;
            const nextVerLabel = `v${nextVerNum}`;

            const prevSnapshot: ItemVersion<any> = {
              versionId: `ver_${targetCard.id}_${verNum}_${Date.now()}`,
              versionNumber: verNum,
              versionLabel: targetCard.activeVersionLabel || `v${verNum}`,
              updatedAt: targetCard.updatedAt || targetCard.createdAt || Date.now(),
              importedAt: (targetCard as any).importedAt || targetCard.createdAt || Date.now(),
              fileName: targetCard.fileName,
              changeSummary: targetCard.currentVersionSummary || `系统快照 (升级至 ${nextVerLabel} 前)`,
              data: {
                name: targetCard.name,
                fileName: targetCard.fileName,
                fileType: targetCard.fileType,
                version: targetCard.version,
                author: targetCard.author,
                rawData: JSON.parse(JSON.stringify(targetCard.rawData || {})),
                coverImage: targetCard.coverImage,
                coverFileKey: targetCard.coverFileKey,
                thumbnailKey: targetCard.thumbnailKey,
                editHistory: targetCard.editHistory ? JSON.parse(JSON.stringify(targetCard.editHistory)) : undefined,
                customTags: targetCard.customTags ? [...targetCard.customTags] : [],
                boundWorldBooks: targetCard.boundWorldBooks ? [...targetCard.boundWorldBooks] : [],
                boundRegexes: targetCard.boundRegexes ? [...targetCard.boundRegexes] : [],
                boundScripts: targetCard.boundScripts ? [...targetCard.boundScripts] : []
              }
            };

            const extracted = extractBundledAssets(
              incomingCard,
              {
                ...prev,
                cards: currentCards,
                stWorldBooks: currentWorldBooks,
                scripts: currentScripts,
                stRegexScripts: currentRegexes,
              },
              {
                forceNewVersion: true,
                matchedCard: targetCard,
                cardVersionLabel: nextVerLabel,
                versionSummary: `从暂存处确认升级至新版本 (${incomingCard.fileName || incomingCard.name})`
              }
            );

            // Merge companion assets
            extracted.newWorldBooks.forEach((w: any) => {
              const idx = currentWorldBooks.findIndex(x => x.id === w.id);
              if (idx > -1) currentWorldBooks[idx] = w;
              else currentWorldBooks.push(w);
            });
            extracted.newScripts.forEach((s: any) => {
              const idx = currentScripts.findIndex(x => x.id === s.id);
              if (idx > -1) currentScripts[idx] = s;
              else currentScripts.push(s);
            });
            extracted.newRegexes.forEach((r: any) => {
              const idx = currentRegexes.findIndex(x => x.id === r.id);
              if (idx > -1) currentRegexes[idx] = r;
              else currentRegexes.push(r);
            });

            // Handle exact match inheritance for tags and summary
            const matchDetail = stagedItem.matchDetail;
            const isExactHash = matchDetail?.isExactHashMatch || matchDetail?.status === 'identical';
            
            let matchedHasTavernTag = false;
            let matchedVersionName = '';
            
            if (isExactHash && matchDetail) {
              matchedVersionName = matchDetail.matchedVersionLabel || '某历史版本';
              
              if (matchDetail.matchedVersionIndex === -1) {
                // matched with active version
                matchedHasTavernTag = targetCard.customTags?.includes('酒馆') || false;
              } else if (matchDetail.matchedVersionIndex > -1 && currentVersions[matchDetail.matchedVersionIndex]) {
                // matched with historical version
                const vData = currentVersions[matchDetail.matchedVersionIndex].data;
                matchedHasTavernTag = vData?.customTags?.includes('酒馆') || false;
              }
            }
            
            const shouldAddTavernTag = isTavernItem || matchedHasTavernTag;
            const updatedCustomTags = shouldAddTavernTag
              ? Array.from(new Set([...(targetCard.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆', '已更新']))
              : Array.from(new Set([...(targetCard.customTags || []).filter(t => t !== '酒馆'), '本地', '已更新']));
              
            let finalSummary = `暂存处升级新版本 (${incomingCard.fileName || '未知文件'})`;
            if (isExactHash && matchedVersionName) {
              finalSummary = `导入内容等同于 [${matchedVersionName}]，已作为新版本导入`;
            }

            const updatedCard: CardEntry = {
              ...targetCard,
              rawData: incomingCard.rawData,
              fileName: incomingCard.fileName || targetCard.fileName,
              fileType: incomingCard.fileType || targetCard.fileType,
              version: incomingCard.version || targetCard.version,
              author: incomingCard.author || targetCard.author,
              coverImage: incomingCard.coverFileKey ? incomingCard.coverImage : incomingCard.coverImage || targetCard.coverImage,
              coverFileKey: incomingCard.coverFileKey || targetCard.coverFileKey,
              thumbnailKey: incomingCard.thumbnailKey || targetCard.thumbnailKey,
              importInfo: incomingCard.importInfo || targetCard.importInfo,
              payloadStub: false,
              updatedAt: Date.now(),
              importedAt: Date.now(),
              source: shouldAddTavernTag ? 'tavern-folder' : 'local',
              activeVersionNumber: nextVerNum,
              activeVersionLabel: nextVerLabel,
              boundWorldBooks: extracted.boundWbIds.length > 0 ? extracted.boundWbIds : (targetCard.boundWorldBooks || []),
              boundScripts: extracted.boundScriptIds.length > 0 ? extracted.boundScriptIds : (targetCard.boundScripts || []),
              boundRegexes: extracted.boundRegexIds.length > 0 ? extracted.boundRegexIds : (targetCard.boundRegexes || []),
              currentVersionSummary: finalSummary,
              customTags: updatedCustomTags,
              versions: [prevSnapshot, ...currentVersions]
            };

            currentCards[cardIdx] = updatedCard;
            newVerCount++;
          }
        } else if (d.action === 'distinct_face') {
          const distinctCustomTags = isTavernItem
            ? Array.from(new Set([...(incomingCard.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆', '同名卡面']))
            : Array.from(new Set([...(incomingCard.customTags || []).filter(t => t !== '酒馆'), '本地', '同名卡面']));

          const distinctCard: CardEntry = {
            ...incomingCard,
            id: 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: incomingCard.name || '未命名卡面',
            activeVersionNumber: 1,
            activeVersionLabel: 'v1',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            importedAt: Date.now(),
            source: isTavernItem ? 'tavern-folder' : 'local',
            currentVersionSummary: '从暂存处作为同名独立卡面导入',
            customTags: distinctCustomTags,
            versions: [],
            associations: [
              {
                cardId: matchedCard.id,
                note: `同名卡面变体 (${matchedCard.fileName || matchedCard.name})`,
                isPrimary: true,
                createdAt: Date.now()
              }
            ]
          };

          const extracted = extractBundledAssets(
            distinctCard,
            {
              ...prev,
              cards: currentCards,
              stWorldBooks: currentWorldBooks,
              scripts: currentScripts,
              stRegexScripts: currentRegexes,
            },
            {
              forceNewVersion: false,
              matchedCard: null,
              cardVersionLabel: 'v1',
              versionSummary: `同名独立卡面 [${distinctCard.name}] 专属资源`
            }
          );

          if (extracted.boundWbIds.length > 0) distinctCard.boundWorldBooks = extracted.boundWbIds;
          if (extracted.boundScriptIds.length > 0) distinctCard.boundScripts = extracted.boundScriptIds;
          if (extracted.boundRegexIds.length > 0) distinctCard.boundRegexes = extracted.boundRegexIds;

          extracted.newWorldBooks.forEach((w: any) => {
            const idx = currentWorldBooks.findIndex(x => x.id === w.id);
            if (idx > -1) currentWorldBooks[idx] = w;
            else currentWorldBooks.push(w);
          });
          extracted.newScripts.forEach((s: any) => {
            const idx = currentScripts.findIndex(x => x.id === s.id);
            if (idx > -1) currentScripts[idx] = s;
            else currentScripts.push(s);
          });
          extracted.newRegexes.forEach((r: any) => {
            const idx = currentRegexes.findIndex(x => x.id === r.id);
            if (idx > -1) currentRegexes[idx] = r;
            else currentRegexes.push(r);
          });

          // Link backwards to original card
          const targetIdx = currentCards.findIndex(c => c.id === matchedCard.id);
          if (targetIdx > -1) {
            const currAssoc = currentCards[targetIdx].associations || [];
            if (!currAssoc.some(a => a.cardId === distinctCard.id)) {
              currentCards[targetIdx] = {
                ...currentCards[targetIdx],
                associations: [
                  ...currAssoc,
                  {
                    cardId: distinctCard.id,
                    note: `同名卡面变体 (${incomingCard.fileName || incomingCard.name})`,
                    isPrimary: false,
                    createdAt: Date.now()
                  }
                ]
              };
            }
          }

          currentCards.push(distinctCard);
          distinctCount++;
        } else if (d.action === 'overwrite') {
          const cardIdx = currentCards.findIndex(c => c.id === matchedCard.id);
          if (cardIdx > -1) {
            const targetCard = { ...currentCards[cardIdx] };

            const extracted = extractBundledAssets(
              incomingCard,
              {
                ...prev,
                cards: currentCards,
                stWorldBooks: currentWorldBooks,
                scripts: currentScripts,
                stRegexScripts: currentRegexes,
              },
              {
                forceNewVersion: false,
                matchedCard: targetCard,
                cardVersionLabel: targetCard.activeVersionLabel || 'v1',
                versionSummary: `直接覆盖当前版本 (来源于暂存处)`
              }
            );

            extracted.newWorldBooks.forEach((w: any) => {
              const idx = currentWorldBooks.findIndex(x => x.id === w.id);
              if (idx > -1) currentWorldBooks[idx] = w;
              else currentWorldBooks.push(w);
            });
            extracted.newScripts.forEach((s: any) => {
              const idx = currentScripts.findIndex(x => x.id === s.id);
              if (idx > -1) currentScripts[idx] = s;
              else currentScripts.push(s);
            });
            extracted.newRegexes.forEach((r: any) => {
              const idx = currentRegexes.findIndex(x => x.id === r.id);
              if (idx > -1) currentRegexes[idx] = r;
              else currentRegexes.push(r);
            });

            // Handle tags inheritance
            const matchDetail = stagedItem.matchDetail;
            const isExactHash = matchDetail?.isExactHashMatch || matchDetail?.status === 'identical';
            
            let matchedHasTavernTag = targetCard.customTags?.includes('酒馆') || false;
            let matchedVersionName = '';
            
            if (isExactHash && matchDetail) {
              matchedVersionName = matchDetail.matchedVersionLabel || '某历史版本';
              if (matchDetail.matchedVersionIndex > -1 && targetCard.versions?.[matchDetail.matchedVersionIndex]) {
                const vData = targetCard.versions[matchDetail.matchedVersionIndex].data;
                if (vData?.customTags?.includes('酒馆')) {
                  matchedHasTavernTag = true;
                }
              }
            }

            const shouldAddTavernTag = isTavernItem || matchedHasTavernTag;
            const updatedCustomTags = shouldAddTavernTag
              ? Array.from(new Set([...(targetCard.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆']))
              : Array.from(new Set([...(targetCard.customTags || []).filter(t => t !== '酒馆'), '本地']));

            let finalSummary = `从暂存处覆盖当前卡片 (${new Date().toLocaleTimeString()})`;
            if (isExactHash && matchedVersionName) {
              finalSummary = `导入内容等同于 [${matchedVersionName}]，已覆盖当前卡片`;
            }

            const updatedCard: CardEntry = {
              ...targetCard,
              rawData: incomingCard.rawData,
              fileName: incomingCard.fileName || targetCard.fileName,
              fileType: incomingCard.fileType || targetCard.fileType,
              version: incomingCard.version || targetCard.version,
              author: incomingCard.author || targetCard.author,
              coverImage: incomingCard.coverFileKey ? incomingCard.coverImage : incomingCard.coverImage || targetCard.coverImage,
              coverFileKey: incomingCard.coverFileKey || targetCard.coverFileKey,
              thumbnailKey: incomingCard.thumbnailKey || targetCard.thumbnailKey,
              importInfo: incomingCard.importInfo || targetCard.importInfo,
              payloadStub: false,
              updatedAt: Date.now(),
              source: shouldAddTavernTag ? 'tavern-folder' : 'local',
              boundWorldBooks: extracted.boundWbIds.length > 0 ? extracted.boundWbIds : (targetCard.boundWorldBooks || []),
              boundScripts: extracted.boundScriptIds.length > 0 ? extracted.boundScriptIds : (targetCard.boundScripts || []),
              boundRegexes: extracted.boundRegexIds.length > 0 ? extracted.boundRegexIds : (targetCard.boundRegexes || []),
              currentVersionSummary: finalSummary,
              customTags: updatedCustomTags
            };

            currentCards[cardIdx] = updatedCard;
            overwriteCount++;
          }
        }

        currentStaged.splice(stagedIdx, 1);
      }

      const synced = autoAssociateAllAssets({
        ...prev,
        cards: currentCards,
        stWorldBooks: currentWorldBooks,
        scripts: currentScripts,
        stRegexScripts: currentRegexes,
        stagedDuplicateCards: currentStaged
      });

      const actions = new Map(decisions.map(d => [d.stagedId, d.action]));
      const previousStaged = new Map((prev.stagedDuplicateCards || []).map(s => [s.id, s]));
      synced.importRecords = (prev.importRecords || []).map(record => {
        const target = record.targets.find(t => t.field === 'stagedDuplicateCards' && actions.has(t.id));
        if (!target) return record;
        const action = actions.get(target.id)!, stage = previousStaged.get(target.id);
        if (!stage || action === 'skip') return { ...record, status: 'skipped', message: '已放弃此重复文件', targets: [] };
        const owner = synced.cards.find(card => card.importInfo?.recordId === record.recordId) || synced.cards.find(card => card.id === stage.matchedCard.id);
        if (!owner) return record;
        return { ...record, status: 'imported', message: '已通过暂存处确认导入', targets: [
          { field: 'cards', id: owner.id },
          ...(synced.stWorldBooks || []).filter(item => item.sourceCardId === owner.id).map(item => ({ field: 'stWorldBooks' as const, id: item.id })),
          ...(synced.stRegexScripts || []).filter(item => item.sourceCardId === owner.id).map(item => ({ field: 'stRegexScripts' as const, id: item.id })),
          ...(synced.scripts || []).filter(item => item.sourceCardId === owner.id).map(item => ({ field: 'scripts' as const, id: item.id })),
        ] };
      });
      return synced;
    }));

    const summaryParts: string[] = [];
    if (newVerCount > 0) summaryParts.push(`升级版本 ${newVerCount} 张`);
    if (distinctCount > 0) summaryParts.push(`同名独立卡面 ${distinctCount} 张`);
    if (overwriteCount > 0) summaryParts.push(`覆盖 ${overwriteCount} 张`);
    if (skipCount > 0) summaryParts.push(`放弃/跳过 ${skipCount} 张`);

    if (!await saveAppData(appDataRef.current, true)) { showToast('暂存处理结果未保存，请释放存储空间后重试', 'error'); return false; }
    if (!quiet) showToast(`暂存处处理完成：${summaryParts.join('，') || '已完成'}`, 'success');
    return true;
  };

  const handleClearAllStagingVault = () => {
    updateAppData(prev => ({
      ...prev,
      stagedDuplicateCards: []
    }));
    showToast('已清空暂缓去重库', 'info');
  };

  const exportAsJson = useCallback(async (card: CardEntry) => {
    try {
    card = await hydrateCard(card);
    const rawCardData = getCurrentCardData(card);
    const pureData = injectBoundAssetsForExport(card, await hydrateCardBoundAssets(card, appDataRef.current));
    const jsonStr = JSON.stringify(pureData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    triggerFileDownload(blob, `${getCardDisplayName(card)}.json`);
    showToast('JSON 导出成功（已移除附加图片与分类数据）', 'success');
    } catch (error: any) { showToast(`导出失败：${error.message}`, 'error'); }
  }, []);

  const exportAsPng = useCallback(async (card: CardEntry) => {
    try {
      const pngBlob = await generateCardPngBlob(card, appDataRef.current);
      triggerFileDownload(pngBlob, `${getCardDisplayName(card)}.png`);
      showToast('PNG 导出成功（已嵌入完整角色数据、世界书与正则脚本）', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('PNG 导出失败: ' + e.message, 'error');
    }
  }, []);

  // Update Card Overwrite (Requirement 6)
  const handleUpdateCardOverwrite = async (file: File) => {
    if (!detailCardId) return;
    const cardIndex = appData.cards.findIndex((c) => c.id === detailCardId);
    if (cardIndex === -1) return;

    try {
      const updatedCardParsed = await parseCardFile(file);
      const existingCard = appData.cards[cardIndex];

      const extracted = extractBundledAssets(
        updatedCardParsed,
        appData,
        {
          forceNewVersion: true,
          matchedCard: existingCard,
          cardVersionLabel: existingCard.activeVersionLabel || `v${(existingCard.versions?.length || 0) + 1}`,
          versionSummary: `随角色卡 [${existingCard.name}] 覆盖更新 (来源于 ${file.name})`
        }
      );

      const mergedWb = [...(appData.stWorldBooks || [])];
      extracted.newWorldBooks.forEach(w => {
        const idx = mergedWb.findIndex(x => x.id === w.id);
        if (idx > -1) mergedWb[idx] = w;
        else mergedWb.push(w);
      });
      const mergedScripts = [...(appData.scripts || [])];
      extracted.newScripts.forEach(s => {
        const idx = mergedScripts.findIndex(x => x.id === s.id);
        if (idx > -1) mergedScripts[idx] = s;
        else mergedScripts.push(s);
      });
      const mergedRegex = [...(appData.stRegexScripts || [])];
      extracted.newRegexes.forEach(r => {
        const idx = mergedRegex.findIndex(x => x.id === r.id);
        if (idx > -1) mergedRegex[idx] = r;
        else mergedRegex.push(r);
      });

      // Overwrite rawData, version, fileType, fileName, name, author, coverImage while keeping id, group, screenshots, createdAt
      const overwrittenCard: CardEntry = {
        ...existingCard,
        name: updatedCardParsed.name,
        fileName: updatedCardParsed.fileName,
        fileType: updatedCardParsed.fileType,
        version: updatedCardParsed.version,
        author: updatedCardParsed.authorManual ? existingCard.author : updatedCardParsed.author,
        rawData: updatedCardParsed.rawData,
        coverImage: updatedCardParsed.coverImage || existingCard.coverImage,
        boundWorldBooks: extracted.boundWbIds.length > 0 ? extracted.boundWbIds : existingCard.boundWorldBooks,
        boundScripts: extracted.boundScriptIds.length > 0 ? extracted.boundScriptIds : existingCard.boundScripts,
        boundRegexes: extracted.boundRegexIds.length > 0 ? extracted.boundRegexIds : existingCard.boundRegexes,
        editHistory: {}, // Reset edit history as rawData is newly updated
        edited: false,
        updatedAt: Date.now(),
      };

      const updatedCards = [...appData.cards];
      updatedCards[cardIndex] = overwrittenCard;
      updateAppData(autoAssociateAllAssets({
        ...appData,
        cards: updatedCards,
        stWorldBooks: mergedWb,
        scripts: mergedScripts,
        stRegexScripts: mergedRegex
      }));

      showToast('角色卡覆盖更新成功！', 'success');
    } catch (err: any) {
      showToast(`覆盖更新失败: ${err.message}`, 'error');
    }
  };

  // Group Management
  const handleCreateNewGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    if (trimmed === '全部') {
      showToast('"全部"为系统保留名称', 'error');
      return;
    }
    if (appData.groups.includes(trimmed)) {
      showToast('该分组已存在', 'error');
      return;
    }

    updateAppData({
      ...appData,
      groups: [...appData.groups, trimmed],
    });
    setNewGroupName('');
    setShowNewGroupModal(false);
    setCurrentGroup(trimmed);
    showToast(`成功新建分组: ${trimmed}`, 'success');
  };

  const handleConfirmDeleteGroup = () => {
    if (!managingGroup) return;

    let nextAppData = { ...appData };
    if (deleteCardsWithGroup) {
      // Cascade delete cards and their bound assets in this group
      const cardsInGroup = (appData.cards || []).filter((c) => c.group === managingGroup);
      const cardIdsInGroup = cardsInGroup.map((c) => c.id);
      const { updatedAppData } = deleteCardsAndCascadeAssets(cardIdsInGroup, appData);
      nextAppData = updatedAppData;
    } else {
      // Reassign cards to '默认'
      const updatedCards = (appData.cards || []).map((c) => (c.group === managingGroup ? { ...c, group: '默认' } : c));
      nextAppData.cards = updatedCards;
    }

    const updatedGroups = (nextAppData.groups || []).filter((g) => g !== managingGroup);
    updateAppData({
      ...nextAppData,
      groups: updatedGroups,
    });

    showToast(`分组 "${managingGroup}" 已删除`, 'info');
    if (currentGroup === managingGroup) setCurrentGroup('全部分组');
    setManagingGroup(null);
    setShowDeleteGroupConfirm(false);
    setDeleteCardsWithGroup(false);
  };

  const handleRenameGroup = () => {
    if (!managingGroup) return;
    const trimmed = renameGroupInput.trim();
    if (!trimmed) return;
    if (trimmed === '全部') {
      showToast('"全部"为系统保留名称', 'error');
      return;
    }

    const updatedGroups = appData.groups.map((g) => (g === managingGroup ? trimmed : g));
    const updatedCards = appData.cards.map((c) => (c.group === managingGroup ? { ...c, group: trimmed } : c));

    updateAppData({
      cards: updatedCards,
      groups: updatedGroups,
    });

    if (currentGroup === managingGroup) setCurrentGroup(trimmed);
    showToast(`分组已重命名为 "${trimmed}"`, 'success');
    setManagingGroup(null);
    setRenameGroupInput('');
  };

  // Batch Operations
  
  const handleBatchExportCards = async () => {
    if (selectedCardIds.length === 0) return;
    const cardsToExport = appData.cards.filter((c) => selectedCardIds.includes(c.id));
    if (cardsToExport.length === 0) return;
    
    showToast(`开始打包 ${cardsToExport.length} 张角色卡（含全部版本），请稍候...`, 'info');
    
    try {
      const zipFiles = [];
      for (const summary of cardsToExport) {
        const card = await hydrateCard(summary);
        const baseName = getCardDisplayName(card).replace(/[\\/:*?"<>|]/g, '_');
        const historyVersions = card.versions || [];
        const activeVerNum = card.activeVersionNumber || (historyVersions.length + 1);
        const activeVerLabel = card.activeVersionLabel || `v${activeVerNum}`;
        const activeFileName = `${baseName}_${activeVerLabel}`;

        // 1. Current active version with version label
        try {
          const pngBlob = await generateCardPngBlob(card, appDataRef.current);
          zipFiles.push({
            name: `${activeFileName}.png`,
            content: pngBlob
          });
        } catch {
          const pureData = injectBoundAssetsForExport(card, await hydrateCardBoundAssets(card, appDataRef.current));
          zipFiles.push({
            name: `${activeFileName}.json`,
            content: JSON.stringify(pureData, null, 2)
          });
        }

        // 2. All historical versions, each clearly labeled with version number
        for (const ver of historyVersions) {
          const vNum = ver.versionNumber;
          const vLabel = ver.versionLabel || `v${vNum}`;
          const histFileName = `${baseName}_${vLabel}`;
          
          const histCard: CardEntry = {
            ...card,
            ...(ver.data || {}),
            name: ver.data?.name || card.name,
            charName: ver.data?.charName || card.charName || card.name,
            fileName: ver.data?.fileName || card.fileName,
            fileType: ver.data?.fileType || card.fileType || 'png',
            version: ver.data?.version || card.version,
            author: ver.data?.author || card.author,
            rawData: ver.data?.rawData || card.rawData,
            coverImage: ver.data?.coverImage || card.coverImage,
            boundWorldBooks: ver.data?.boundWorldBooks || card.boundWorldBooks,
            boundScripts: ver.data?.boundScripts || card.boundScripts,
            boundRegexes: ver.data?.boundRegexes || card.boundRegexes,
            customTags: ver.data?.customTags || card.customTags
          };

          try {
            const pngBlob = await generateCardPngBlob(histCard, appDataRef.current);
            zipFiles.push({
              name: `${histFileName}.png`,
              content: pngBlob
            });
          } catch {
            const pureData = injectBoundAssetsForExport(histCard, await hydrateCardBoundAssets(histCard, appDataRef.current));
            zipFiles.push({
              name: `${histFileName}.json`,
              content: JSON.stringify(pureData, null, 2)
            });
          }
        }
      }
      
      const zipBlob = await createZip(zipFiles);
      triggerFileDownload(zipBlob, `TavernVault_Cards_${new Date().getTime()}.zip`);
      showToast(`成功打包导出 ${cardsToExport.length} 张角色卡（已包含所有版本并标注版本号）`, 'success');
      setBatchMode(false);
      setSelectedCardIds([]);
    } catch (e: any) {
      console.error(e);
      showToast('批量导出失败: ' + (e?.message || String(e)), 'error');
    }
  };

  const handleBatchDeleteCards = () => {
    if (selectedCardIds.length === 0) return;
    requestDelete(`确定要删除选中的 ${selectedCardIds.length} 张角色卡吗？其绑定的专属资源也将一同清理。`, selectedCardIds.length, () => {
      const { updatedAppData, deletedCounts } = deleteCardsAndCascadeAssets(selectedCardIds, appData);
      updateAppData(updatedAppData);
      setSelectedCardIds([]);
      const extraParts: string[] = [];
      if (deletedCounts.worldbooks > 0) extraParts.push(`${deletedCounts.worldbooks} 个世界书`);
      if (deletedCounts.scripts > 0) extraParts.push(`${deletedCounts.scripts} 个脚本`);
      if (deletedCounts.regexes > 0) extraParts.push(`${deletedCounts.regexes} 个正则`);
      const extraStr = extraParts.length > 0 ? `，并同步清理了绑定的 ${extraParts.join('、')}` : '';
      showToast(`已删除 ${selectedCardIds.length} 张角色卡${extraStr}`, 'info');
    });
  };

  const handleBatchMoveCards = () => {
    if (selectedCardIds.length === 0 || !batchTargetGroup) return;
    const updatedCards = appData.cards.map((c) => (selectedCardIds.includes(c.id) ? { ...c, group: batchTargetGroup } : c));
    updateAppData({ ...appData, cards: updatedCards });
    setSelectedCardIds([]);
    setShowBatchMoveModal(false);
    showToast(`已移动 ${selectedCardIds.length} 张卡片到分组 "${batchTargetGroup}"`, 'success');
  };

  // Filtered Cards List
  const { baseFilteredCards, filteredCards } = useMemo(() => {
    const base = appData.cards.filter((card) => {
      // Group filter
      if (currentGroup !== '全部分组') {
        const rawGrp = card.group ? card.group.trim() : '';
        const cardGrp = (!rawGrp || rawGrp === '默认' || rawGrp === '未分组') ? '默认' : rawGrp;
        const targetGrp = (currentGroup === '未分组' || currentGroup === '默认') ? '默认' : currentGroup;
        if (cardGrp !== targetGrp) return false;
      }
      if (cardTagFilter.length > 0) {
        const builtInTags = getCardTags(card);
        const customTags = card.customTags || [];
        // Avoid allocating new arrays inside the loop
        if (!cardTagFilter.every(t => builtInTags.includes(t) || customTags.includes(t))) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchIndex = getCardSearchIndexString(card);
        return searchIndex.includes(q);
      }

      return true;
    });

    const filtered = sortItemList(
      cardSortOrder === 'default' ? [...base].reverse() : base,
      cardSortOrder,
      getCardDisplayName,
      (c) => c.importedAt || c.updatedAt || c.createdAt || 0
    );

    return { baseFilteredCards: base, filteredCards: filtered };
  }, [appData.cards, currentGroup, cardTagFilter, searchQuery, cardSortOrder]);

  // 搜索词/分组/排序方式变化时，把可见数量重置回第一页，避免筛选后仍保留上一次滚动到的很大数值。
  useEffect(() => {
    setCardVisibleCount(CARD_PAGE_SIZE);
  }, [searchQuery, currentGroup, cardSortOrder]);

  useEffect(() => setCardVisibleCount(n => Math.min(n, Math.max(CARD_PAGE_SIZE, Math.ceil(filteredCards.length / CARD_PAGE_SIZE) * CARD_PAGE_SIZE))), [filteredCards.length, cardTagFilter]);
  const visibleFilteredCards = useMemo(() => filteredCards.slice(Math.max(0, cardVisibleCount - CARD_PAGE_SIZE), cardVisibleCount), [filteredCards, cardVisibleCount]);

  // Current Active Detail Card
  const detailCardSummary = useMemo(() => {
    return detailCardId ? appData.cards.find((c) => c.id === detailCardId) : undefined;
  }, [appData.cards, detailCardId]);
  const { card: activeDetailCard, loading: detailLoading, error: detailLoadError } = useCardPayload(detailCardSummary);
  useEffect(() => {
    if (activeDetailCard && detailCardSummary?.payloadStub) setAppData(prev => ({ ...prev, cards: prev.cards.map(card => card === detailCardSummary ? activeDetailCard : card) }));
  }, [activeDetailCard, detailCardSummary]);
  useEffect(() => {
    if (!activeDetailCard) return;
    let cancelled = false;
    const resources = [
      ...(appData.stWorldBooks || []).filter(item => item.assetStub && activeDetailCard.boundWorldBooks?.includes(item.id)).map(item => ({ field: 'stWorldBooks', item })),
      ...(appData.stRegexScripts || []).filter(item => item.assetStub && activeDetailCard.boundRegexes?.includes(item.id)).map(item => ({ field: 'stRegexScripts', item })),
      ...(appData.scripts || []).filter(item => item.assetStub && activeDetailCard.boundScripts?.includes(item.id)).map(item => ({ field: 'scripts', item })),
    ];
    Promise.all(resources.map(async ({ field, item }) => ({ field, old: item, full: await hydrateCardAsset(item) }))).then(loaded => {
      if (cancelled || !loaded.length) return;
      setAppData(prev => {
        const next = { ...prev };
        for (const { field, old, full } of loaded) (next as any)[field] = ((next as any)[field] || []).map((item: any) => item === old ? full : item);
        return next;
      });
    }).catch(error => { if (!cancelled) showToast(error.message, 'error'); });
    return () => { cancelled = true; };
  }, [activeDetailCard, appData.stWorldBooks, appData.stRegexScripts, appData.scripts]);
  useEffect(() => {
    if (detailCardId || appDataDirtyRef.current) return;
    setAppData(prev => {
      const stored = loadAppData();
      return prev === stored ? prev : { ...prev, cards: stored.cards, stWorldBooks: stored.stWorldBooks, stRegexScripts: stored.stRegexScripts, scripts: stored.scripts };
    });
  }, [detailCardId]);
  const previewVersion = null;
  const displayDetailCard = activeDetailCard;
  const activeLiveCardData = useMemo(() => activeDetailCard ? getCurrentCardData(activeDetailCard) : null, [activeDetailCard]);

  const getAssociationCandidates = (card: CardEntry | undefined) => {
    if (!card) return [];
    const name = normalizeAssociationName(getCardDisplayName(card));
    const author = getCardCreator(card).trim().toLowerCase();
    if (!name || !author || author === '未知作者') return [];
    const existingIds = new Set((card.associations || []).map((a) => a.cardId));
    return appData.cards.filter((candidate) => {
      if (candidate.id === card.id || existingIds.has(candidate.id)) return false;
      return normalizeAssociationName(getCardDisplayName(candidate)) === name && getCardCreator(candidate).trim().toLowerCase() === author;
    });
  };

  const buildAssociationComponent = (seedId: string, cards: CardEntry[]) => {
    const seen = new Set<string>();
    const queue = [seedId];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const card = cards.find((c) => c.id === id);
      (card?.associations || []).forEach((a) => {
        if (!seen.has(a.cardId)) queue.push(a.cardId);
      });
    }
    return cards.filter((c) => seen.has(c.id));
  };

  const handleAddCardAssociation = () => {
    if (!activeDetailCard || !associationTargetId) {
      showToast('请先选择要关联的角色卡', 'error');
      return;
    }
    const target = appData.cards.find((c) => c.id === associationTargetId);
    if (!target) {
      showToast('关联目标不存在', 'error');
      return;
    }
    const candidates = getAssociationCandidates(activeDetailCard);
    if (!candidates.some((c) => c.id === target.id)) {
      showToast('只能关联主体相同且作者相同的角色卡', 'error');
      return;
    }

    const now = Date.now();
    const note = associationNote.trim() || undefined;
    let updatedCards = appData.cards.map((c) => ({ ...c, associations: [...(c.associations || [])] }));
    const owner = updatedCards.find((c) => c.id === activeDetailCard.id)!;
    const targetCard = updatedCards.find((c) => c.id === target.id)!;

    const upsert = (card: CardEntry, assoc: CardAssociation) => {
      const existing = (card.associations || []).findIndex((a) => a.cardId === assoc.cardId);
      const next = [...(card.associations || [])];
      if (existing >= 0) next[existing] = { ...next[existing], ...assoc };
      else next.push(assoc);
      card.associations = next;
      card.edited = true;
      card.updatedAt = now;
    };

    upsert(owner, { cardId: target.id, note, noteOwnerId: activeDetailCard.id, isPrimary: associationPrimary, createdAt: now });
    upsert(targetCard, { cardId: activeDetailCard.id, isPrimary: !associationPrimary, createdAt: now });

    // 关联彻底化：把同一主体的整个关联网络补齐。备注始终只属于写备注的那一方，不复制给另一方。
    const component = buildAssociationComponent(activeDetailCard.id, updatedCards);
    const componentIds = new Set(component.map((c) => c.id));
    for (const a of component) {
      for (const b of component) {
        if (a.id === b.id) continue;
        const existing = (a.associations || []).find((x) => x.cardId === b.id);
        if (!existing) {
          upsert(a, { cardId: b.id, isPrimary: false, createdAt: now });
        }
      }
    }

    // 由于新增的边可能扩展组件，再跑一次以确保所有成员两两可见。
    const finalComponent = buildAssociationComponent(activeDetailCard.id, updatedCards);
    const finalIds = new Set(finalComponent.map((c) => c.id));
    updatedCards = updatedCards.map((c) => {
      if (!finalIds.has(c.id)) return c;
      const next = [...(c.associations || [])];
      finalIds.forEach((id) => {
        if (id === c.id || next.some((a) => a.cardId === id)) return;
        next.push({ cardId: id, isPrimary: false, createdAt: now });
      });
      return { ...c, associations: next };
    });

    updateAppData({ ...appData, cards: updatedCards });
    setAssociationTargetId('');
    setAssociationNote('');
    setAssociationPrimary(false);
    showToast(`已关联「${getCardDisplayName(target)}」，关联网络已同步`, 'success');
  };

  const handleRemoveCardAssociation = (relatedId: string) => {
    if (!activeDetailCard) return;
    const updatedCards = appData.cards.map((c) => {
      if (c.id === activeDetailCard.id || c.id === relatedId) {
        return { ...c, associations: (c.associations || []).filter((a) => a.cardId !== relatedId && a.cardId !== activeDetailCard.id), edited: true, updatedAt: Date.now() };
      }
      return c;
    });
    updateAppData({ ...appData, cards: updatedCards });
    showToast('关联已解除', 'info');
  };

  const openAssociatedCard = (cardId: string) => {
    setGachaCard(null);
    setDetailCardId(cardId);
    
  };

  const handleConfirmAddCardWorldBookEntry = () => {
    if (!activeDetailCard) return;

    const wb = JSON.parse(JSON.stringify(getCardWorldBook(activeDetailCard) || { entries: [] }));
    const entry = {
      comment: newCardWorldBookEntryForm.comment.trim() || `新世界书条目 ${((wb.entries || []).length + 1)}`,
      keys: newCardWorldBookEntryForm.keys
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean),
      key: newCardWorldBookEntryForm.keys
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean),
      content: newCardWorldBookEntryForm.content,
      disable: false,
    };
    wb.entries = [...(Array.isArray(wb.entries) ? wb.entries : []), entry];

    const updatedCards = appData.cards.map((c) =>
      c.id === activeDetailCard.id
        ? { ...c, editHistory: { ...c.editHistory, character_book: wb }, edited: true }
        : c
    );
    updateAppData({ ...appData, cards: updatedCards });
    setNewCardWorldBookEntryForm({ comment: '', keys: '', content: '' });
    setShowAddCardWorldBookEntryModal(false);
    showToast('已新增世界书条目', 'success');
  };

  const cardDetailProps = {
    appData,
    updateAppData,
    showToast,
    detailCardId,
    displayDetailCard,
    activeLiveCardData,
    handleCancelCardEdit,
    previewVersionId,
    setPreviewVersionId,
    detailTab,
    setDetailTab,
    handleConfirmDeleteVersion,
    customGreetingUsername,
    setCustomGreetingUsername,
    applyCustomGreetingUsername,
    restoreCustomGreetingUsername,
    confirmAsync,
    setVersionToDelete,
    jumpTargetId,
    setJumpTargetId,
    handleOpenBindAssetModal,
    handleUnbindAsset,
    addManualQr,
    saveEditedQrItem,
    deleteCardQrItem,
    saveCardRegexList,
    saveCardWorldBook,
    importQrJsonText,
    handleDrawRandomCard,
    downloadJsonFile,
    formatDateForFileName,
    handleBatchExportCards,
    askChoiceAsync,
    requestDelete,
    associationPrimary,
    setAssociationPrimary,
    handleAddCardAssociation,
    openAssociatedCard,
    handleRemoveCardAssociation,
    normalizeQrDocument,
    qrSearchQuery,
    setQrSearchQuery,
    setCardSectionImportModal,
    setEditingQrItem,
    deleteCardsAndCascadeAssets,
    setDetailCardId,
    originalDetailCardRef,
    setAssociationTargetId,
    setAssociationNote,
    associationTargetId,
    associationNote,
    getAssociationCandidates,
    setFullscreenData,
    setEditingCardRegex,
    setCurrentPage,
    cardRegexSearchQuery,
    authorNoteInputRef,
    setAuthorNoteBatchMode,
    setSelectedAuthorNoteIndices,
    authorNoteBatchMode,
    selectedAuthorNoteIndices,
    processImageFile,
    memoryInputRef,
    setMemoryBatchMode,
    setSelectedMemoryIndices,
    memoryBatchMode,
    selectedMemoryIndices,
    setCardRegexSearchQuery,
    cardWorldBookSearchQuery,
    setCardWorldBookSearchQuery
  };
  const appModalProps = {
    appData,
    batchImportProgress,
    batchTargetGroup,
    batchTargetThemeGroup,
    bigDataExportInitialScope,
    buildGroupTagProps,
    codeSearchQuery,
    currentPage,
    deleteCardsWithGroup,
    deleteThemesWithGroup,
    displayDetailCard,
    duplicateModalState,
    editingNormalCard,
    editingPhoneLink,
    editingTheme,
    flatTheme,
    fullscreenData,
    gachaCard,
    handleAddPhoneLink,
    handleApplyStagingVaultDecisions,
    handleBatchMoveCards,
    handleBatchMoveThemes,
    handleClearAllStagingVault,
    handleConfirmDeleteGroup,
    handleConfirmDeleteThemeGroup,
    handleDeleteSinglePhoneLink,
    handleDeleteSingleTheme,
    handleOpenStagingVault,
    handleRenameGroup,
    handleRenameThemeGroup,
    handleSaveEditedPhoneLink,
    handleSaveEditedTheme,
    isBigDataExportModalOpen,
    isGachaModalOpen,
    managingGroup,
    managingThemeGroup,
    newAltGreetingInputText,
    phoneForm,
    renameGroupInput,
    renameThemeGroupInput,
    selectedCardIds,
    selectedThemeIds,
    setApiCategoryFilter,
    setBatchImportProgress,
    setBatchTargetGroup,
    setBatchTargetThemeGroup,
    setBeautificationCategoryFilter,
    setCodeSearchQuery,
    setCurrentGroup,
    setCurrentPage,
    setDeleteCardsWithGroup,
    setDeleteThemesWithGroup,
    setDetailCardId,
    setDuplicateModalState,
    setEditingNormalCard,
    setEditingPhoneLink,
    setEditingTheme,
    setExtraStoryCategoryFilter,
    setFlatTheme,
    setFontCategoryFilter,
    setFullscreenData,
    setIsBigDataExportModalOpen,
    setIsGachaModalOpen,
    setIsThemeCodeExpanded,
    setManagingGroup,
    setManagingThemeGroup,
    setNewAltGreetingInputText,
    setNormalCardCategoryFilter,
    setPhoneForm,
    setPresetCategoryFilter,
    setRenameGroupInput,
    setRenameThemeGroupInput,
    setSettingsInitialTab,
    setShowAddAltGreetingModal,
    setShowAddPhoneModal,
    setShowBatchMoveModal,
    setShowNewApiGroupModal,
    setShowNewBeautificationGroupModal,
    setShowNewExtraStoryGroupModal,
    setShowNewFontGroupModal,
    setShowNewGroupModal,
    setShowNewNormalCardGroupModal,
    setShowNewPresetGroupModal,
    setShowNewStickerGroupModal,
    setShowNewThemeGroupModal,
    setShowNewWorldBookGroupModal,
    setShowStagingVaultModal,
    setShowThemeBatchMoveModal,
    setShowThemeMenu,
    setStickerCategoryFilter,
    setTheme,
    setThemeCategoryFilter,
    setThemeDetailTab,
    setUiStyle,
    setWorldBookCategoryFilter,
    showAddAltGreetingModal,
    showAddPhoneModal,
    showBatchMoveModal,
    showNewApiGroupModal,
    showNewBeautificationGroupModal,
    showNewExtraStoryGroupModal,
    showNewFontGroupModal,
    showNewGroupModal,
    showNewNormalCardGroupModal,
    showNewPresetGroupModal,
    showNewStickerGroupModal,
    showNewThemeGroupModal,
    showNewWorldBookGroupModal,
    showStagingVaultModal,
    showThemeBatchMoveModal,
    showThemeMenu,
    showToast,
    theme,
    themeCoverInputRef,
    themeDetailTab,
    uiStyle,
    updateAppData
  };
  return (
    <TavernImportContext.Provider value={{ importFiles: handleFileUpload, openCenter: () => setShowImportCenter(true) }}>
    
    {!appDataHydrated && (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-opacity duration-300">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-sm font-semibold tracking-wide">{storageLoadError || '正在从缓存读取数据…'}</div>
          <div className="text-[10px] text-zinc-500">{storageLoadError ? '已有数据保留，请重试读取或从备份恢复。' : '请稍候，首次加载或数据量较大时可能需要几秒钟'}</div>
          {storageLoadError && <button className="px-4 py-2 border" onClick={() => location.reload()}>重新读取</button>}
        </div>
      </div>
    )}

    <DynamicStyleEngine overrides={appData.customOverrides} />
    <InspectWorkspace appData={appData} updateAppData={updateAppData} isInspectMode={isInspectMode} setIsInspectMode={setIsInspectMode} />
    <div
      id="app-root-container"
      className="app-shell-root h-[100dvh] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-800 selection:text-white"
    >
      {/* App Shell Container */}
      <div className="flex flex-1 overflow-hidden relative w-full h-full">

        {/* Backdrop overlay for closing sidebar when open (Requirement 5) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-[1000] transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} importBackupInputRef={importBackupInputRef} isImportingBackup={isImportingBackup} isInspectMode={isInspectMode} setIsInspectMode={setIsInspectMode} setBigDataExportInitialScope={setBigDataExportInitialScope} setIsBigDataExportModalOpen={setIsBigDataExportModalOpen} />

        {/* Main Content View */}
        {/* Main Content View */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header appDataHydrated={appDataHydrated} appDataDirtyRef={appDataDirtyRef} handleExportFullBackup={handleExportFullBackup} uploadFileInputRef={uploadFileInputRef} qrFileInputRef={qrFileInputRef} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} currentGroup={currentGroup} importBackupInputRef={importBackupInputRef} isImportingBackup={isImportingBackup} setBigDataExportInitialScope={setBigDataExportInitialScope} setIsBigDataExportModalOpen={setIsBigDataExportModalOpen} handleDrawRandomCard={handleDrawRandomCard} showThemeMenu={showThemeMenu} setShowThemeMenu={setShowThemeMenu} isInspectMode={isInspectMode} setIsInspectMode={setIsInspectMode} />

          {/* Page Body Container */}
          <div id="app-content" className={`flex-1 overflow-y-auto ${currentPage === 'settings' ? 'p-0' : 'p-4 md:p-6'}`}>
            {currentPage === 'home' ? (
              <HomeSection cardViewMode={homeCardViewMode} setCardViewMode={setHomeCardViewMode}
                appData={appData}
                onNavigate={(pageId) => {
                  setCurrentPage(pageId);
                  setSidebarOpen(false);
                }}
                onOpenCardDetail={(cardId) => {
                  setDetailCardId(cardId);
                  setCurrentPage('st-cards');
                }}
                onDrawRandomCard={handleDrawRandomCard}
                onDrawRandomNormalCard={handleDrawRandomNormalCard}
                recentNormalCards={appData.normalCards || []}
                onOpenBigDataExport={() => {
                  setBigDataExportInitialScope('all');
                  setIsBigDataExportModalOpen(true);
                }}
                onOpenImportCenter={() => setShowImportCenter(true)}
                onTriggerExport={handleExportFullBackup}
              />            ) : currentPage === 'st-cards' ? (
              <STCardsSection cardViewMode={stCardViewMode} setCardViewMode={setStCardViewMode}
                appData={appData}
                updateAppData={updateAppData}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                cardSortOrder={cardSortOrder}
                setCardSortOrder={setCardSortOrder}
                currentGroup={currentGroup}
                setCurrentGroup={setCurrentGroup}
                cardTagFilter={cardTagFilter}
                setCardTagFilter={setCardTagFilter}
                selectedCardIds={selectedCardIds}
                setSelectedCardIds={setSelectedCardIds}
                batchMode={batchMode}
                setBatchMode={setBatchMode}
                setDetailCardId={setDetailCardId}
                setDetailTab={setDetailTab}
                setManagingGroup={setManagingGroup}
                setRenameGroupInput={setRenameGroupInput}
                setShowBatchMoveModal={setShowBatchMoveModal}
                setShowNewGroupModal={setShowNewGroupModal}
                uploadFileInputRef={uploadFileInputRef}
                handleFileUpload={handleFileUpload}
                handleDeleteCard={handleDeleteCard}
                handleBatchDeleteCards={handleBatchDeleteCards}
                handleBatchExportCards={handleBatchExportCards}
                exportAsPng={exportAsPng}
                exportAsJson={exportAsJson}
                showToast={showToast}
                sortItemList={sortItemList}
                getCardDisplayName={getCardDisplayName}
                getCardDescription={getCardDescription}
                getCardCreator={getCardCreator}
                getCardTags={getCardTags}
                cardVisibleCount={cardVisibleCount}
                setCardVisibleCount={setCardVisibleCount}
                CARD_PAGE_SIZE={CARD_PAGE_SIZE}
                cardLoadMoreRef={cardLoadMoreRef}
                filteredCards={filteredCards}
                visibleFilteredCards={visibleFilteredCards}
                onOpenStagingVault={handleOpenStagingVault}
              />
            ) : currentPage === 'st-mobile' ? (
                            <MobileLinksSection
                appData={appData}
                updateAppData={updateAppData}
                showToast={showToast}
                phoneFileInputRef={phoneFileInputRef}
                handleFileUploadPhoneLink={handleFileUploadPhoneLink}
                setShowAddPhoneModal={setShowAddPhoneModal}
                phoneSearchQuery={phoneSearchQuery}
                setPhoneSearchQuery={setPhoneSearchQuery}
                phoneBatchMode={phoneBatchMode}
                setPhoneBatchMode={setPhoneBatchMode}
              />
            ) : currentPage === 'st-themes' ? (
              <STThemesSection filteredThemes={filteredThemes} setShowThemeBatchMoveModal={setShowThemeBatchMoveModal} showToast={showToast} setRenameThemeGroupInput={setRenameThemeGroupInput} themeCategoryFilter={themeCategoryFilter} selectedThemeIds={selectedThemeIds} MoreHorizontal={MoreHorizontal} setEditingTheme={setEditingTheme} setThemeSearchQuery={setThemeSearchQuery} themeSortOrder={themeSortOrder} updateAppData={updateAppData} setShowNewThemeGroupModal={setShowNewThemeGroupModal} handleBatchDeleteThemes={handleBatchDeleteThemes} Circle={Circle} setThemeCategoryFilter={setThemeCategoryFilter} FolderPlus={FolderPlus} setManagingThemeGroup={setManagingThemeGroup} themesList={themesList} setSelectedThemeIds={setSelectedThemeIds} CheckSquare={CheckSquare} appData={appData} setThemeDetailTab={setThemeDetailTab} sortItemList={sortItemList} themeSearchQuery={themeSearchQuery} setThemeSortOrder={setThemeSortOrder} setCodeSearchQuery={setCodeSearchQuery} themeBatchMode={themeBatchMode} Move={Move} setThemeBatchMode={setThemeBatchMode} ArrowUpDown={ArrowUpDown}  themeTagsFilter={themeTagsFilter} setthemeTagsFilter={setThemeTagsFilter} />
            ) : currentPage === 'chat-memes' ? (
              <ChatMemesSection setChatMemeSortOrder={setChatMemeSortOrder} showToast={showToast} setRenameChatMemeGroupInput={setRenameChatMemeGroupInput} chatMemeCategoryFilter={chatMemeCategoryFilter} updateAppData={updateAppData} selectedChatMemeIds={selectedChatMemeIds} setChatMemeSearchQuery={setChatMemeSearchQuery} setEditingChatMeme={setEditingChatMeme} handleDeleteSelectedChatMemes={handleDeleteSelectedChatMemes} chatMemeSortOrder={chatMemeSortOrder} FolderPlus={FolderPlus} chatMemesList={chatMemesList} setChatMemeCategoryFilter={setChatMemeCategoryFilter} handleMoveSelectedChatMemes={handleMoveSelectedChatMemes} CheckSquare={CheckSquare} appData={appData} setSelectedChatMemeIds={setSelectedChatMemeIds} chatMemeGroupPressTimer={chatMemeGroupPressTimer} filteredChatMemes={filteredChatMemes} Check={Check} chatMemeBatchMode={chatMemeBatchMode} setChatMemeBatchMode={setChatMemeBatchMode} setShowChatExportModal={setShowChatExportModal} setShowNewChatMemeGroupModal={setShowNewChatMemeGroupModal} chatMemeSearchQuery={chatMemeSearchQuery} setManagingChatMemeGroup={setManagingChatMemeGroup} ArrowUpDown={ArrowUpDown}  chatMemeTagsFilter={chatMemeTagsFilter} setchatMemeTagsFilter={setChatMemeTagsFilter} />
            ) : currentPage === 'themes' ? (
              <BeautificationThemesSection beautificationBatchMode={beautificationBatchMode} showToast={showToast} beautificationSortOrder={beautificationSortOrder} MoreHorizontal={MoreHorizontal} beautificationSearchQuery={beautificationSearchQuery} updateAppData={updateAppData} beautificationCategoryFilter={beautificationCategoryFilter} setBeautificationBatchMode={setBeautificationBatchMode} setSelectedBeautificationIds={setSelectedBeautificationIds} setBeautificationDetailTab={setBeautificationDetailTab} Circle={Circle} FolderPlus={FolderPlus} handleBatchDeleteBeautifications={handleBatchDeleteBeautifications} setRenameBeautificationGroupInput={setRenameBeautificationGroupInput} setManagingBeautificationGroup={setManagingBeautificationGroup} setBeautificationSortOrder={setBeautificationSortOrder} filteredBeautifications={filteredBeautifications} CheckSquare={CheckSquare} appData={appData} setShowNewBeautificationGroupModal={setShowNewBeautificationGroupModal} setBeautificationSearchQuery={setBeautificationSearchQuery} sortItemList={sortItemList} setEditingBeautification={setEditingBeautification} setCodeSearchQuery={setCodeSearchQuery} setBeautificationCategoryFilter={setBeautificationCategoryFilter} setShowBeautificationBatchMoveModal={setShowBeautificationBatchMoveModal} Move={Move} selectedBeautificationIds={selectedBeautificationIds} beautificationsList={beautificationsList} ArrowUpDown={ArrowUpDown}  beautificationTagsFilter={beautificationTagsFilter} setbeautificationTagsFilter={setBeautificationTagsFilter} />
            ) : currentPage === 'st-presets' ? (
              <STPresetsSection jumpTargetId={jumpTargetId} onClearJumpTarget={() => setJumpTargetId(null)} onOpenResource={(kind: 'regex' | 'script', id: string) => { setJumpTargetId(id); setCurrentPage(kind === 'regex' ? 'st-regex' : 'st-scripts'); }} showToast={showToast} setShowNewPresetGroupModal={setShowNewPresetGroupModal} setPresetBatchMode={setPresetBatchMode} setPresetCategoryFilter={setPresetCategoryFilter} MoreHorizontal={MoreHorizontal} setPresetEntrySearchQuery={setPresetEntrySearchQuery} updateAppData={updateAppData} setManagingPresetGroup={setManagingPresetGroup} setPresetSearchQuery={setPresetSearchQuery} handleBatchDeletePresets={handleBatchDeletePresets} presetCategoryFilter={presetCategoryFilter} Circle={Circle} FolderPlus={FolderPlus} Sliders={Sliders} setPresetSortOrder={setPresetSortOrder} presetsList={presetsList} appData={appData} CheckSquare={CheckSquare} sortItemList={sortItemList} selectedPresetIds={selectedPresetIds} setShowPresetBatchMoveModal={setShowPresetBatchMoveModal} presetBatchMode={presetBatchMode} presetSearchQuery={presetSearchQuery} presetSortOrder={presetSortOrder} Move={Move} setEditingPresetTab={setEditingPresetTab} setSelectedPresetIds={setSelectedPresetIds} setEditingPreset={setEditingPreset} filteredPresets={filteredPresets} setRenamePresetGroupInput={setRenamePresetGroupInput} ArrowUpDown={ArrowUpDown}  presetTagsFilter={presetTagsFilter} setpresetTagsFilter={setPresetTagsFilter} />
            ) : currentPage === 'st-plugins' ? (
              <STPluginsSection
                appData={appData}
                updateAppData={updateAppData}
                showToast={showToast}
                sortItemList={sortItemList}
              />
            ) : currentPage === 'st-qr' ? (
              <STQuickRepliesSection appData={appData} updateAppData={updateAppData} showToast={showToast} />
            ) : currentPage === 'st-scripts' ? (
              <STScriptsSection
                onOpenPresetDetail={(id) => { setJumpTargetId(id); setCurrentPage('st-presets'); }}
                jumpTargetId={jumpTargetId}
                onClearJumpTarget={() => setJumpTargetId(null)}
                appData={appData}
                updateAppData={updateAppData}
                showToast={showToast}
                sortItemList={sortItemList}
                onOpenCardDetail={(cardId) => {
                  setDetailCardId(cardId);
                  setCurrentPage('st-cards');
                }}
              />
            ) : currentPage === 'st-worldbooks' ? (
              <STWorldBooksSection
                jumpTargetId={jumpTargetId}
                onClearJumpTarget={() => setJumpTargetId(null)}
                appData={appData}
                updateAppData={updateAppData}
                showToast={showToast}
                sortItemList={sortItemList}
                onOpenCardDetail={(cardId) => {
                  setDetailCardId(cardId);
                  setCurrentPage('st-cards');
                }}
              />
            ) : currentPage === 'st-regex' ? (
              <STRegexSection
                onOpenPresetDetail={(id) => { setJumpTargetId(id); setCurrentPage('st-presets'); }}
                jumpTargetId={jumpTargetId}
                onClearJumpTarget={() => setJumpTargetId(null)}
                appData={appData}
                updateAppData={updateAppData}
                showToast={showToast}
                sortItemList={sortItemList}
                onOpenCardDetail={(cardId) => {
                  setDetailCardId(cardId);
                  setCurrentPage('st-cards');
                }}
              />
            ) : currentPage === 'chat-logs' ? (
              <ChatLogsSection
                appData={appData}
                updateAppData={updateAppData}
                showToast={showToast}
                sortItemList={sortItemList}
                onOpenCardDetail={(cardId) => {
                  setDetailCardId(cardId);
                  setCurrentPage('st-cards');
                }}
              />
            ) : currentPage === 'normal-cards' ? (
              <NormalCardsSection
                setShowNormalCardBatchMoveModal={setShowNormalCardBatchMoveModal}
                showToast={showToast}
                setNormalCardCategoryFilter={setNormalCardCategoryFilter}
                MoreHorizontal={MoreHorizontal}
                normalCardsList={normalCardsList}
                setNormalCardSearchQuery={setNormalCardSearchQuery}
                updateAppData={updateAppData}
                setSelectedNormalCardIds={setSelectedNormalCardIds}
                normalCardSortOrder={normalCardSortOrder}
                normalCardRoleTab={normalCardRoleTab}
                setNormalCardRoleTab={setNormalCardRoleTab}
                setRenameNormalCardCategoryInput={setRenameNormalCardCategoryInput}
                filteredNormalCards={filteredNormalCards}
                Circle={Circle}
                normalCardSearchQuery={normalCardSearchQuery}
                setManagingNormalCardCategory={setManagingNormalCardCategory}
                normalCardBatchMode={normalCardBatchMode}
                setNormalCardBatchMode={setNormalCardBatchMode}
                setEditingNormalCard={setEditingNormalCard}
                appData={appData}
                selectedNormalCardIds={selectedNormalCardIds}
                CheckSquare={CheckSquare}
                sortItemList={sortItemList}
                normalCardCategoryFilter={normalCardCategoryFilter}
                setShowNewNormalCardGroupModal={setShowNewNormalCardGroupModal}
                handleBatchDeleteNormalCards={handleBatchDeleteNormalCards}
                setNormalCardSortOrder={setNormalCardSortOrder}
                ArrowUpDown={ArrowUpDown}
                normalCardTagsFilter={normalCardTagsFilter}
                setnormalCardTagsFilter={setNormalCardTagsFilter}
                requestDelete={requestDelete}
                normalCardFileInputRef={normalCardFileInputRef}
                handleNormalCardFileUpload={handleNormalCardFileUpload}
              />
            ) : currentPage === 'user-personas' ? (
              <UserPersonasSection appData={appData} updateAppData={updateAppData} showToast={showToast} />
            ) : currentPage === 'background-images' ? (
              <BackgroundImagesSection appData={appData} updateAppData={updateAppData} showToast={showToast} />
            ) : currentPage === 'card-covers' ? (
              <CardCoversSection appData={appData} updateAppData={updateAppData} showToast={showToast} />
            ) : currentPage === 'api-storage' ? (
              <ApiStorageSection apiCategoryFilter={apiCategoryFilter} setEditingApi={setEditingApi} selectedApiIds={selectedApiIds} showToast={showToast} apisList={apisList} MoreHorizontal={MoreHorizontal} apiBatchMode={apiBatchMode} FileCode={FileCode} updateAppData={updateAppData} handleOpenAddApiModal={handleOpenAddApiModal} setSelectedApiIds={setSelectedApiIds} apiSearchQuery={apiSearchQuery} handleBatchDeleteApis={handleBatchDeleteApis} Circle={Circle} setShowNewApiGroupModal={setShowNewApiGroupModal} setApiCategoryFilter={setApiCategoryFilter} CheckSquare={CheckSquare} appData={appData} setManagingApiCategory={setManagingApiCategory} filteredApis={filteredApis} apiSortOrder={apiSortOrder} sortItemList={sortItemList} setApiBatchMode={setApiBatchMode} setShowApiBatchMoveModal={setShowApiBatchMoveModal} setApiSearchQuery={setApiSearchQuery} setRenameApiCategoryInput={setRenameApiCategoryInput} setApiSortOrder={setApiSortOrder} ArrowUpDown={ArrowUpDown} apiTagsFilter={apiTagsFilter} setapiTagsFilter={setApiTagsFilter} />
            ) : currentPage === 'fonts' ? (
              <FontsSection setFontSortOrder={setFontSortOrder} showToast={showToast} MoreHorizontal={MoreHorizontal} setRenameFontCategoryInput={setRenameFontCategoryInput} updateAppData={updateAppData} setEditingFont={setEditingFont} fontFileInputRef={fontFileInputRef} activePreviewFontId={activePreviewFontId} fontSortOrder={fontSortOrder} setShowAddFontChoiceModal={setShowAddFontChoiceModal} setActivePreviewFontId={setActivePreviewFontId} Circle={Circle} filteredFonts={filteredFonts} handleFileUploadFont={handleFileUploadFont} fontCategoryFilter={fontCategoryFilter} setSelectedFontIds={setSelectedFontIds} setManagingFontCategory={setManagingFontCategory} CheckSquare={CheckSquare} appData={appData} fontBatchMode={fontBatchMode} sortItemList={sortItemList} setFontBatchMode={setFontBatchMode} setShowNewFontGroupModal={setShowNewFontGroupModal} setShowFontBatchMoveModal={setShowFontBatchMoveModal} fontSearchQuery={fontSearchQuery} selectedFontIds={selectedFontIds} setFontCategoryFilter={setFontCategoryFilter} fontsList={fontsList} handleBatchDeleteFonts={handleBatchDeleteFonts} ArrowUpDown={ArrowUpDown} setFontSearchQuery={setFontSearchQuery}  fontTagsFilter={fontTagsFilter} setfontTagsFilter={setFontTagsFilter} />
            ) : (currentPage === 'extras-app' || currentPage === 'st-extras') ? (
              <ExtrasAppSection currentSectionId={currentPage} setShowNewExtraStoryGroupModal={setShowNewExtraStoryGroupModal} setRenameExtraStoryCategoryInput={setRenameExtraStoryCategoryInput} showToast={showToast} extraStoryFileInputRef={extraStoryFileInputRef} setManagingExtraStoryCategory={setManagingExtraStoryCategory} MoreHorizontal={MoreHorizontal} selectedExtraStoryIds={selectedExtraStoryIds} setShowAddExtraStoryChoiceModal={setShowAddExtraStoryChoiceModal} updateAppData={updateAppData} setExtraStorySearchQuery={setExtraStorySearchQuery} extraStorySearchQuery={extraStorySearchQuery} setExtraStoryBatchMode={setExtraStoryBatchMode} Circle={Circle} setExtraStoryCategoryFilter={setExtraStoryCategoryFilter} setShowExtraStoryBatchMoveModal={setShowExtraStoryBatchMoveModal} ArrowUpDown={ArrowUpDown} setEditingExtraStory={setEditingExtraStory} appData={appData} CheckSquare={CheckSquare} sortItemList={sortItemList} handleFileUploadExtraStory={handleFileUploadExtraStory} extraStoriesList={extraStoriesList} extraStoryCategoryFilter={extraStoryCategoryFilter} setSelectedExtraStoryIds={setSelectedExtraStoryIds} setIsContentExpanded={setIsContentExpanded} handleBatchDeleteExtraStories={handleBatchDeleteExtraStories} filteredExtraStories={filteredExtraStories} extraStoryBatchMode={extraStoryBatchMode} setExtraStorySortOrder={setExtraStorySortOrder} extraStorySortOrder={extraStorySortOrder}  extraStoryTagsFilter={extraStoryTagsFilter} setextraStoryTagsFilter={setExtraStoryTagsFilter} />
            ) : currentPage === 'stickers' ? (
              <StickersSection stickerSearchQuery={stickerSearchQuery} showToast={showToast} selectedStickerPackIds={selectedStickerPackIds} setSelectedStickerPackIds={setSelectedStickerPackIds} MoreHorizontal={MoreHorizontal} openBatchUpload={openBatchUpload} setStickerCategoryFilter={setStickerCategoryFilter} updateAppData={updateAppData} setStickerDetailTab={setStickerDetailTab} setRenameStickerCategoryInput={setRenameStickerCategoryInput} stickerFileInputRef={stickerFileInputRef} Circle={Circle} setShowNewStickerGroupModal={setShowNewStickerGroupModal} setShowStickerBatchMoveModal={setShowStickerBatchMoveModal} setEditingStickerPack={setEditingStickerPack} stickerBatchMode={stickerBatchMode} setStickerBatchMode={setStickerBatchMode} appData={appData} CheckSquare={CheckSquare} setStickerSearchQuery={setStickerSearchQuery} handleFileUploadSticker={handleFileUploadSticker} handleBatchDeleteStickerPacks={handleBatchDeleteStickerPacks} stickerPacksList={stickerPacksList} filteredStickerPacks={filteredStickerPacks} stickerCategoryFilter={stickerCategoryFilter} setManagingStickerCategory={setManagingStickerCategory}  stickerTagsFilter={stickerTagsFilter} setstickerTagsFilter={setStickerTagsFilter} />
            ) : currentPage === 'worldbook' ? (
              <WorldBookSection setWorldBookBatchMode={setWorldBookBatchMode} handleBatchDeleteWorldBooks={handleBatchDeleteWorldBooks} worldBookCategoryFilter={worldBookCategoryFilter} selectedWorldBookIds={selectedWorldBookIds} setShowNewWorldBookGroupModal={setShowNewWorldBookGroupModal} setShowWorldBookBatchMoveModal={setShowWorldBookBatchMoveModal} updateAppData={updateAppData} setIsWorldBookContentExpanded={setIsWorldBookContentExpanded} openBatchUpload={openBatchUpload} worldBookSortOrder={worldBookSortOrder} CheckSquare={CheckSquare} showToast={showToast} ArrowUpDown={ArrowUpDown} MoreHorizontal={MoreHorizontal} filteredWorldBooks={filteredWorldBooks} setEditingWorldBook={setEditingWorldBook} setWorldBookSortOrder={setWorldBookSortOrder} worldBookFileInputRef={worldBookFileInputRef} setManagingWorldBookCategory={setManagingWorldBookCategory} sortItemList={sortItemList} Circle={Circle} setRenameWorldBookCategoryInput={setRenameWorldBookCategoryInput} setSelectedWorldBookIds={setSelectedWorldBookIds} worldBookSearchQuery={worldBookSearchQuery} setWorldBookSearchQuery={setWorldBookSearchQuery} worldBooksList={worldBooksList} handleFileUploadWorldBook={handleFileUploadWorldBook} setWorldBookCategoryFilter={setWorldBookCategoryFilter} worldBookBatchMode={worldBookBatchMode} appData={appData}  worldBookTagsFilter={worldBookTagsFilter} setworldBookTagsFilter={setWorldBookTagsFilter} />
            ) : currentPage === 'mobile-presets' ? (
              <MobilePresetsSection
                appData={appData}
                updateAppData={updateAppData}
                showToast={showToast}
                sortItemList={sortItemList}
              />
            ) : currentPage === 'mobile-html' ? (
              <MobileHtmlSection
                appData={appData}
                updateAppData={updateAppData}
                showToast={showToast}
                sortItemList={sortItemList}
              />
            ) : currentPage === 'settings' ? (
              <SettingsSection
                appData={appData}
                updateAppData={updateAppData}
                initialTab={settingsInitialTab}
                theme={theme}
                setTheme={setTheme}
                uiStyle={uiStyle}
                setUiStyle={setUiStyle}
                flatTheme={flatTheme}
                setFlatTheme={setFlatTheme}
                showToast={showToast}
                promptDuplicateAction={promptDuplicateAction}
                batchImportProgress={batchImportProgress}
                setBatchImportProgress={setBatchImportProgress}
                onOpenStagingVault={handleOpenStagingVault}
                isInspectMode={isInspectMode}
                setIsInspectMode={setIsInspectMode}
                onOpenBigDataExport={() => {
                  setBigDataExportInitialScope('all');
                  setIsBigDataExportModalOpen(true);
                }}
              />
            ) : (
              /* Placeholder Page for other non-st-cards pages */
              <div className="text-center py-24 max-w-md mx-auto">
                <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                  {currentPage} 板块
                </h2>
                <p className="text-[10px] text-zinc-400 mt-2">
                  此功能模块已就绪并归属于“通用”分组，请期待功能扩展。
                </p>
                <span className="inline-block mt-4 px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] rounded-full">
                  Coming Soon
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ST 角色卡专用 JSON 导入输入 */}
      <input type="file" ref={cardWorldBookImportFileInputRef} accept=".json,application/json" className="hidden" onChange={(e) => handleCardSectionFileSelected(e, 'worldbook')} />
      <input type="file" ref={cardRegexFileInputRef} accept=".json,application/json" className="hidden" onChange={(e) => handleCardSectionFileSelected(e, 'regex')} />
      <input type="file" ref={cardQrFileInputRef} accept=".json,application/json" className="hidden" onChange={(e) => handleCardSectionFileSelected(e, 'qr')} />

      <input
        type="file"
        ref={sectionImportFileInputRef}
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportCurrentSection(file);
          e.target.value = '';
        }}
      />

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={themeFileInputRef}
        multiple
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleThemeFileUpload(e.target.files);
          e.target.value = '';
        }}
      />

      <input
        type="file"
        ref={themeCoverInputRef}
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && editingTheme) {
            const scaled = await processImageFile(file, 600, 800);
            setEditingTheme((prev) => (prev ? { ...prev, coverImage: scaled } : null));
            showToast('封面图已设置，点击“确认”保存变更', 'info');
          }
          e.target.value = '';
        }}
      />

      {/* Toast Notifications */}
      <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4 toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border text-[11px] sm:text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-[300px] justify-center text-center leading-relaxed  bg-[var(--bg-paper,#ffffff)] dark:bg-[#18181b] border-[var(--line,#e4e4e7)] dark:border-[#27272a] text-[var(--text-serif,#18181b)] dark:text-[#f4f4f5]`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--ok,#059669)] dark:text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-[var(--err,#dc2626)] dark:text-red-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-[var(--accent,#2563eb)] dark:text-blue-400" />}
            <span className="flex-1 text-left">{toast.msg}</span>
          </div>
        ))}
      </div>



      <input
        type="file"
        ref={uploadFileInputRef}
        multiple
        accept=".png,.json,.css,.js,.zip"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFileUpload(Array.from(e.target.files));
          e.target.value = '';
        }}
      />

      <input
        type="file"
        ref={qrFileInputRef}
        multiple
        accept=".json,application/json,text/plain"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) void handleFileUpload(files);
          e.target.value = '';
        }}
      />

      <input
        type="file"
        ref={importBackupInputRef}
        accept=".json,application/json"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          e.target.value = '';
          if (!files || files.length === 0) return;
          setIsImportingBackup(true);
          showToast(`正在读取并合并 ${files.length} 个备份文件，请稍候…`, 'info');
          try {
            const { nextAppData, report } = await mergeImportFiles(Array.from(files), appData, (fileName, idx, total) => {
              showToast(`正在解析合并 (${idx}/${total}): ${fileName}`, 'info');
            });
            updateAppData(nextAppData);
            showToast(
              `成功导入 ${files.length} 个文件！新增角色卡 ${report.addedCards}，更新 ${report.updatedCards}，世界书 ${report.addedWorldBooks}，聊天记录 ${report.addedChatLogs}`,
              'success'
            );
          } catch (err: any) {
            console.error('Import full backup failed', err);
            showToast('导入失败：' + (err?.message || String(err)), 'error');
          } finally {
            setIsImportingBackup(false);
          }
        }}
      />

      <input
        type="file"
        ref={updateCardInputRef}
        accept=".png,.json,image/png,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpdateCardOverwrite(file);
          e.target.value = '';
        }}
      />

      <input
        type="file"
        ref={presetRegexFileInputRef}
        accept=".json,.regex,application/json,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadPresetRegexFile(file);
          e.target.value = '';
        }}
      />

      {/* ==================== GLOBAL DELETE CONFIRMATION MODAL ==================== */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmConfig.isOpen}
        onClose={() => setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmConfig.onConfirm}
        title={deleteConfirmConfig.title}
        message={deleteConfirmConfig.message}
        itemCount={deleteConfirmConfig.itemCount}
      />

      {/* ==================== GLOBAL CONFIRMATION / PROMPT MODAL ==================== */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.resolve(true);
            setConfirmDialog(null);
          }}
          onClose={() => {
            confirmDialog.resolve(false);
            setConfirmDialog(null);
          }}
        />
      )}

      {/* ==================== GLOBAL CHOICE MODAL ==================== */}
      {choiceDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-transparent modal-backdrop animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer" onClick={() => { choiceDialog.resolve(null); setChoiceDialog(null); }} aria-label="关闭遮罩" />
          <div className="modal-panel modal-card relative z-10 w-full max-w-md bg-[var(--modal-bg,var(--card-bg,var(--bg-paper,#faf7f2)))] dark:bg-[var(--modal-bg,var(--card-bg,#151518))] border border-[var(--modal-border,var(--line,rgba(217,119,6,0.3)))] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
            <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-[var(--btn-secondary-bg,rgba(217,119,6,0.05))] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">{choiceDialog.title}</h3>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <div className="text-sm text-zinc-700 dark:text-zinc-300 mb-4 whitespace-pre-wrap">{choiceDialog.message}</div>
              <div className="space-y-2.5">
                {choiceDialog.options.map((opt) => (
                  <BaseButton
                    key={opt.id}
                    onClick={() => { choiceDialog.resolve(opt.id); setChoiceDialog(null); }}
                    className="w-full text-left p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-[var(--line-focus,rgba(217,119,6,0.5))] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer group flex flex-col gap-1"
                  >
                    <span className="font-bold text-[13px] text-zinc-900 dark:text-zinc-100 group-hover:text-[var(--accent,#D97706)] transition-colors">{opt.label}</span>
                    {opt.description && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{opt.description}</span>}
                  </BaseButton>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-zinc-900/90 flex justify-end">
              <BaseButton
                onClick={() => { choiceDialog.resolve(null); setChoiceDialog(null); }}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                取消
              </BaseButton>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CARD DETAIL MODAL (Fixed Dimensions: Requirement 1) ==================== */}
      
      {showJsonWorldBookImportPreview && pendingJsonWorldBook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
            onClick={() => {
              setShowJsonWorldBookImportPreview(false);
              setPendingJsonWorldBook(null);
            }}
            aria-label="关闭遮罩"
          />
          <div className="modal-panel modal-card relative z-10 w-full max-w-lg bg-[var(--bg-paper,#faf7f2)] dark:bg-[#1a1a1c] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between bg-black/5 dark:bg-white/5">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Book className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                识别世界书
              </h3>
              <BaseButton onClick={() => {
                setShowJsonWorldBookImportPreview(false);
                setPendingJsonWorldBook(null);
              }} className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                <X className="w-4 h-4" />
              </BaseButton>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">世界书名称</label>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{pendingJsonWorldBook.title}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">作者</label>
                <div className="text-sm text-zinc-700 dark:text-zinc-300">{pendingJsonWorldBook.author}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500">包含条目数</label>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{pendingJsonWorldBook.entries?.length || 0} 个条目</div>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 mt-4">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  发现这是一个 JSON 格式的世界书。点击导入后，可以在右侧属性栏查看并检索具体条目。
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-black/5 dark:bg-white/5 flex justify-end gap-3">
              <BaseButton
                onClick={() => {
                  setShowJsonWorldBookImportPreview(false);
                  setPendingJsonWorldBook(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                取消
              </BaseButton>
              <BaseButton
                onClick={commitJsonWorldBookImport}
                className="px-5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-bold shadow-sm hover:opacity-90 flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> 确认导入
              </BaseButton>
            </div>
          </div>
        </div>
      )}

      
      {/* Choice Modal: 新增聊天梗 */}
      <ChoiceModal
        isOpen={showChatAddChoiceModal}
        onClose={() => setShowChatAddChoiceModal(false)}
        title="新增聊天梗"
        description="请选择聊天梗的添加方式："
        options={[
          {
            key: 'file',
            label: '从本地文档导入 (.docx, .txt, .json)',
            icon: <Upload className="w-3.5 h-3.5" />,
            onClick: () => {
              setShowChatAddChoiceModal(false);
              chatMemeFileInputRef.current?.click();
            },
          },
          {
            key: 'manual',
            label: '手动录入文本',
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: () => {
              setShowChatAddChoiceModal(false);
              setShowChatManualModal(true);
            },
          },
        ]}
      />

      {/* Choice Modal: 新增番外小剧场 */}
      <ChoiceModal
        isOpen={showAddExtraStoryChoiceModal}
        onClose={() => setShowAddExtraStoryChoiceModal(false)}
        title="新增番外小剧场"
        description="请选择番外小剧场的添加方式："
        options={[
          {
            key: 'file',
            label: '从本地文档导入 (.docx, .txt)',
            icon: <Upload className="w-3.5 h-3.5" />,
            onClick: () => {
              setShowAddExtraStoryChoiceModal(false);
              extraStoryFileInputRef.current?.click();
            },
          },
          {
            key: 'manual',
            label: '手动录入番外文本',
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: () => {
              setShowAddExtraStoryChoiceModal(false);
              setShowAddExtraStoryManualModal(true);
            },
          },
        ]}
      />

      {/* Choice Modal: 新增字体文件 */}
      <ChoiceModal
        isOpen={showAddFontChoiceModal}
        onClose={() => setShowAddFontChoiceModal(false)}
        title="新增字体文件"
        description="请选择字体文件的添加方式："
        options={[
          {
            key: 'file',
            label: '从本地导入字体 (.ttf, .otf, .woff)',
            icon: <Upload className="w-3.5 h-3.5" />,
            onClick: () => {
              setShowAddFontChoiceModal(false);
              fontFileInputRef.current?.click();
            },
          },
          {
            key: 'url',
            label: '使用网络字体链接 (URL)',
            icon: <Link2 className="w-3.5 h-3.5" />,
            onClick: () => {
              setShowAddFontChoiceModal(false);
              setShowAddFontUrlModal(true);
            },
          },
        ]}
      />

      {showGroupTagManager && (() => {
        const props = buildGroupTagProps();
        if (!props) return null;
        return (
          <GroupTagManager 
            isOpen={showGroupTagManager} 
            onClose={() => setShowGroupTagManager(false)} 
            {...props} 
          />
        );
      })()}
      
      { /* Card Detail Modal is rendered unconditionally, internally it checks for displayDetailCard */ }
      <CardDetailModal {...cardDetailProps} />

      <ImportCenter open={showImportCenter} onClose={() => setShowImportCenter(false)} onImportBackup={() => importBackupInputRef.current?.click()} appData={appData} updateAppData={updateAppData} showToast={showToast} />
      {(detailLoading || detailLoadError) && <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"><div className="bg-[var(--modal-solid-bg)] p-6 max-w-md w-[calc(100%-2rem)]"><p>{detailLoading ? '正在读取完整卡片数据…' : detailLoadError}</p><button className="mt-4 underline" onClick={() => setDetailCardId(null)}>关闭</button></div></div>}
      <GlobalModals {...appModalProps} />
    </div>
    </TavernImportContext.Provider>
  );
}
