import React, { useState, useEffect, useRef } from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import {
  Palette,
  RotateCcw,
  Check,
  Sparkles,
  Sliders,
  Sun,
  Moon,
  Plus,
  Trash2,
  BookmarkPlus,
  Save,
  Shuffle,
  Image as ImageIcon,
  Layout,
  Box,
  MousePointerClick,
  Sparkle,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Info,
  LogOut,
  Target,
} from 'lucide-react';
import { FLAT_THEMES } from './ThemeDrawer';
import { CustomSelect } from './CustomSelect';
import {
  CustomThemePalette,
  DIVERSE_INSPIRATION_TEMPLATES,
  getUserSavedPalettes,
  saveUserPalette,
  deleteUserPalette,
  getActiveCustomPaletteId,
  setActiveCustomPaletteId,
  applyCustomPaletteCss,
  clearCustomCssOverrides,
  restoreActiveSavedThemeCss,
  generateRandomHarmonyPalette,
  getCleanInitialLightDraft,
  exportPalettesToJson,
  exportSingleThemeToJson,
  importPalettesFromJson,
} from '../../utils/themeCustomizer';
import { sessionStore } from '../../utils/sessionStore';
import { generateHarmonyFromBaseColor, generateHarmonyFromColors } from '../../utils/colorUtils';
import { BackgroundCustomizer } from '../theme/BackgroundCustomizer';
import { HeaderSidebarCustomizer } from '../theme/HeaderSidebarCustomizer';
import { BlocksCardsCustomizer } from '../theme/BlocksCardsCustomizer';
import { ButtonsInputsCustomizer } from '../theme/ButtonsInputsCustomizer';
import { ColorPickerInput } from '../theme/ColorPickerInput';
import { LiveThemePreview } from '../theme/LiveThemePreview';
import { AppData } from '../../types';

interface ThemeColorCustomizerProps {
  uiStyle: 'glass' | 'flat' | 'line-brown' | 'line-green';
  setUiStyle: (s: 'glass' | 'flat' | 'line-brown' | 'line-green') => void;
  flatTheme: string;
  setFlatTheme: (t: string) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  appData?: AppData;
  updateAppData?: React.Dispatch<React.SetStateAction<AppData>> | ((data: AppData) => void);
  isInspectMode?: boolean;
  setIsInspectMode?: (val: boolean) => void;
}

export const ThemeColorCustomizer: React.FC<ThemeColorCustomizerProps> = ({
  uiStyle,
  setUiStyle,
  flatTheme,
  setFlatTheme,
  theme,
  setTheme,
  showToast,
  appData,
  updateAppData,
  isInspectMode = false,
  setIsInspectMode = () => {},
}) => {
  // User's custom saved palettes list
  const [savedPalettes, setSavedPalettes] = useState<CustomThemePalette[]>(() =>
    getUserSavedPalettes()
  );
  // Currently active custom palette ID (if any)
  const [activeCustomId, setActiveCustomIdState] = useState<string | null>(() =>
    getActiveCustomPaletteId()
  );

  // Track if current tuning draft has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);

  // Collapse state for fine-grained workbench (Requirement: Collapsed by default on startup, persists across session tabs)
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(() => sessionStore.themeCustomizer.isWorkbenchOpen);
  const [isSavedPalettesOpen, setIsSavedPalettesOpen] = useState(() => sessionStore.themeCustomizer.isSavedPalettesOpen);
  const [isInspirationsOpen, setIsInspirationsOpen] = useState(() => sessionStore.themeCustomizer.isInspirationsOpen);
  const [isCategoryBoardOpen, setIsCategoryBoardOpen] = useState(() => sessionStore.themeCustomizer.isCategoryBoardOpen);

  useEffect(() => {
    sessionStore.themeCustomizer.isWorkbenchOpen = isWorkbenchOpen;
  }, [isWorkbenchOpen]);
  useEffect(() => {
    sessionStore.themeCustomizer.isSavedPalettesOpen = isSavedPalettesOpen;
  }, [isSavedPalettesOpen]);
  useEffect(() => {
    sessionStore.themeCustomizer.isInspirationsOpen = isInspirationsOpen;
  }, [isInspirationsOpen]);
  useEffect(() => {
    sessionStore.themeCustomizer.isCategoryBoardOpen = isCategoryBoardOpen;
  }, [isCategoryBoardOpen]);

  // Active Tab in the custom workbench
  const [activeTab, setActiveTab] = useState<'bg' | 'buttons' | 'header' | 'cards' | 'core' | 'inspect'>(() => sessionStore.themeCustomizer.activeTab);

  useEffect(() => {
    sessionStore.themeCustomizer.activeTab = activeTab;
  }, [activeTab]);

  // Multi-color modal states
  const [isMultiColorModalOpen, setIsMultiColorModalOpen] = useState(false);
  const [multiColors, setMultiColors] = useState<string[]>(['#4F46E5', '#FDF7F0', '#FFFFFF']);


  // Hidden JSON Import File Input ref
  const importInputRef = useRef<HTMLInputElement>(null);

  // Current editing color values in the tuning workbench (Default to pure light draft or session draft)
  const [colorDraft, setColorDraft] = useState<Partial<CustomThemePalette>>(() => {
    if (sessionStore.themeCustomizer.colorDraft) {
      return sessionStore.themeCustomizer.colorDraft;
    }
    const activeId = getActiveCustomPaletteId();
    if (activeId) {
      const saved = getUserSavedPalettes().find((p) => p.id === activeId);
      if (saved) return saved;
    }
    return getCleanInitialLightDraft();
  });

  useEffect(() => {
    sessionStore.themeCustomizer.colorDraft = colorDraft;
  }, [colorDraft]);

  const [newPresetName, setNewPresetName] = useState('');

  // Initialize CSS on mount if a custom palette was previously active
  useEffect(() => {
    const activeId = getActiveCustomPaletteId();
    if (activeId) {
      const found = savedPalettes.find((p) => p.id === activeId);
      if (found) {
        applyCustomPaletteCss(found);
        setColorDraft(found);
      } else {
        clearCustomCssOverrides();
        setActiveCustomPaletteId(null);
        setActiveCustomIdState(null);
      }
    }
  }, []);

  // Cleanup on unmount: If there are unsaved changes, revert back to the saved active theme
  useEffect(() => {
    return () => {
      if (hasUnsavedChangesRef.current) {
        restoreActiveSavedThemeCss();
      }
    };
  }, []);

  // UI Style Options for Settings Dropdown
  const uiStyleOptions = [
    { value: 'flat', label: '扁平风格 (宋式宣纸 · 11款灵感色)' },
    { value: 'glass', label: '毛玻璃风格 (通透微光 · 支持暗黑)' },
    { value: 'line-brown', label: '质感线条 · 暖褐素雅' },
    { value: 'line-green', label: '质感线条 · 竹青雅韵' },
  ];

  // Flat theme options for Settings Dropdown
  const flatThemeOptions = FLAT_THEMES.map((t) => ({
    value: t.id,
    label: (
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full border border-black/10 shrink-0"
          style={{ backgroundColor: t.dotColor }}
        />
        <span>{t.tag}</span>
      </div>
    ),
  }));

  // Mobile Sub-Section Dropdown Options
  const workbenchTabOptions = [
    { value: 'bg', label: '大背景与渐变渲染度 (Background)' },
    { value: 'buttons', label: '按键与透明度调色 (Buttons & Inputs)' },
    { value: 'header', label: '顶栏与侧边栏 (Header & Sidebar)' },
    { value: 'cards', label: '卡片与区块 (Cards & Blocks)' },
    { value: 'core', label: '核心文字与状态 (Core Text & Status)' },
    { value: 'inspect', label: '🎯 元素局部精调 (Inspect)' },
  ];

  // Handle switching to a standard default preset (flat/glass/line)
  const handleSelectStandardStyle = (val: 'glass' | 'flat' | 'line-brown' | 'line-green') => {
    clearCustomCssOverrides();
    setActiveCustomPaletteId(null);
    setActiveCustomIdState(null);
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;

    setUiStyle(val);
    if (val === 'flat') {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', flatTheme);
      document.body.setAttribute('data-theme', flatTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }
    showToast?.('已切换至系统标准主题', 'info');
  };

  // Handle live updating a property or multiple properties in the draft workbench
  const handleUpdateDraft = (
    keyOrUpdates: keyof CustomThemePalette | Partial<CustomThemePalette>,
    value?: any
  ) => {
    setColorDraft((prev) => {
      const next = { ...prev };
      if (typeof keyOrUpdates === 'string') {
        (next as any)[keyOrUpdates] = value;
      } else {
        Object.assign(next, keyOrUpdates);
      }
      return next;
    });
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  // Save current draft as a new custom theme
  const handleSaveAsNewPalette = () => {
    const nameToUse = (newPresetName.trim() || colorDraft.name || '我的浅色专属主题').trim();
    const newId = `custom_theme_${Date.now()}`;
    const newPalette: CustomThemePalette = {
      ...colorDraft,
      id: newId,
      name: nameToUse,
      createdAt: Date.now(),
      accent: colorDraft.accent || '#D97706',
      bgPaper: colorDraft.bgPaper || '#FFFDF5',
      text: colorDraft.text || '#291F18',
      line: colorDraft.line || 'rgba(217, 119, 6, 0.18)',
    };

    const updated = saveUserPalette(newPalette);
    setSavedPalettes(updated);
    setActiveCustomPaletteId(newId);
    setActiveCustomIdState(newId);
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    setNewPresetName('');
    applyCustomPaletteCss(newPalette);
    showToast?.(`已成功保存并启用浅色主题「${nameToUse}」`, 'success');
  };

  // Overwrite save changes to the currently active custom theme
  const handleOverwriteActivePalette = () => {
    if (!activeCustomId) {
      handleSaveAsNewPalette();
      return;
    }
    const current = savedPalettes.find((p) => p.id === activeCustomId);
    if (!current) {
      handleSaveAsNewPalette();
      return;
    }
    const updatedPalette: CustomThemePalette = {
      ...current,
      ...colorDraft,
      id: activeCustomId,
      name: newPresetName.trim() || colorDraft.name || current.name,
      updatedAt: Date.now(),
    };
    const updated = saveUserPalette(updatedPalette);
    setSavedPalettes(updated);
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    applyCustomPaletteCss(updatedPalette);
    showToast?.(`已保存对主题「${updatedPalette.name}」的修改并全站生效`, 'success');
  };

  // Revert unsaved modifications back to the active saved theme / default style
  const handleRevertUnsavedChanges = () => {
    const restored = restoreActiveSavedThemeCss();
    if (restored) {
      setColorDraft(restored);
      setActiveCustomPaletteId(restored.id);
      setActiveCustomIdState(restored.id);
      showToast?.(`已放弃未保存修改，还原至已生效主题「${restored.name}」`, 'info');
    } else {
      setActiveCustomPaletteId(null);
      setActiveCustomIdState(null);
      setColorDraft(getCleanInitialLightDraft());
      showToast?.('已放弃未保存修改，还原至系统默认主题', 'info');
    }
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
  };

  // Apply an existing custom user-saved palette
  const handleApplyCustomPalette = (palette: CustomThemePalette) => {
    setActiveCustomPaletteId(palette.id);
    setActiveCustomIdState(palette.id);
    setColorDraft(palette);
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    applyCustomPaletteCss(palette);
    showToast?.(`已应用自定义主题「${palette.name}」`, 'success');
  };

  // Delete a user-saved custom palette
  const handleDeleteCustomPalette = (
    paletteId: string,
    paletteName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const updated = deleteUserPalette(paletteId);
    setSavedPalettes(updated);
    if (activeCustomId === paletteId) {
      setActiveCustomIdState(null);
      clearCustomCssOverrides();
      setColorDraft(getCleanInitialLightDraft());
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
    }
    showToast?.(`已删除自定义主题「${paletteName}」`, 'info');
  };

  // Load an inspiration template into the draft tuner
  const handleLoadInspiration = (template: typeof DIVERSE_INSPIRATION_TEMPLATES[0]) => {
    const nextDraft: Partial<CustomThemePalette> = {
      ...template,
      name: `${template.name.split(' ')[0]} (副本)`,
    };
    setColorDraft(nextDraft);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
    setIsWorkbenchOpen(true);
    showToast?.(`已载入浅色灵感「${template.name}」（在小框中即时渲染，保存后生效）`, 'info');
  };

  // Reset to System Default: Clears custom overrides and unsets custom active theme
  const handleResetToSystemDefault = () => {
    clearCustomCssOverrides();
    setActiveCustomPaletteId(null);
    setActiveCustomIdState(null);
    setColorDraft(getCleanInitialLightDraft());
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    showToast?.('已恢复系统原生默认主题，清除自定义调色覆盖', 'info');
  };

  // Export saved palettes as JSON
  const handleExportPalettes = () => {
    const jsonStr = exportPalettesToJson(savedPalettes);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tavern_vault_themes_pack_${new Date().toISOString().slice(0, 10)}.theme.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast?.('自定义配色库已成功导出为 .theme.json 文件', 'success');
  };

  // Export single palette as JSON
  const handleExportSinglePalette = (palette: CustomThemePalette, e: React.MouseEvent) => {
    e.stopPropagation();
    const jsonStr = exportSingleThemeToJson(palette);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (palette.name || 'custom_theme').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
    a.href = url;
    a.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.theme.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast?.(`主题方案「${palette.name}」已导出为 .theme.json 文件`, 'success');
  };

  // Import palettes from JSON file
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importPalettesFromJson(content);
        if (res.success) {
          setSavedPalettes(res.palettes);
          showToast?.(`成功导入 ${res.count} 套自定义配色方案！`, 'success');
        } else {
          showToast?.(`导入失败: ${res.error || '文件格式不正确'}`, 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Generate random pleasant light harmonious color combination (Strictly Light Themes)
  const handleGenerateRandomPalette = () => {
    const randomLight = generateRandomHarmonyPalette();
    setColorDraft(randomLight);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
    setIsWorkbenchOpen(true);
    showToast?.(`已生成浅色和谐配色「${randomLight.name}」（在小框中即时渲染，保存后生效）`, 'info');
  };

  const handleGenerateFromMultipleColors = () => {
    const generated = generateHarmonyFromColors(multiColors);
    setColorDraft(generated);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
    setIsWorkbenchOpen(true);
    setIsMultiColorModalOpen(false);
    showToast?.(`已根据选定色系生成多重和谐浅色预设`, 'info');
  };

    const hiddenImageInputRef = useRef<HTMLInputElement>(null);

  const handleExtractImageColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const hex = `#${((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1)}`.toUpperCase();
        const generated = generateHarmonyFromBaseColor(hex);
        setColorDraft(generated);
        setHasUnsavedChanges(true);
        hasUnsavedChangesRef.current = true;
        setIsWorkbenchOpen(true);
        showToast?.(`已从图片提取主色调 ${hex} 并生成浅色灵感配色`, 'success');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => showToast?.('读取图片配色失败', 'error');
    img.src = url;
    e.target.value = '';
  };

  // Start fresh custom light palette
  const handleStartFreshDraft = () => {
    const fresh = getCleanInitialLightDraft();
    setColorDraft(fresh);
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
    setIsWorkbenchOpen(true);
    showToast?.('已载入全新浅色调色底板，已为您展开精细调色工作台', 'info');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Hidden file input for importing JSON palettes */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.theme.json"
        onChange={handleImportJsonFile}
        className="hidden"
      />

      {/* 1. System Theme Selector via CustomSelect */}
      <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-amber-500" />
              系统默认主题样式
            </label>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              系统内置固定主题（包括 11 款宋式国风灵感、毛玻璃及质感线条）。
            </p>
          </div>

          <div className="w-full sm:w-64 shrink-0">
            <CustomSelect
              value={uiStyle}
              onChange={handleSelectStandardStyle}
              options={uiStyleOptions}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xs font-medium flex items-center justify-between"
            />
          </div>
        </div>

        {/* Flat Theme Inspiration Dropdown */}
        {uiStyle === 'flat' && (
          <div className="pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                宋式国风灵感色调：
              </span>
              <div className="w-full sm:w-60">
                <CustomSelect
                  value={flatTheme}
                  onChange={(val) => {
                    clearCustomCssOverrides();
                    setActiveCustomPaletteId(null);
                    setActiveCustomIdState(null);
                    setFlatTheme(val);
                    document.documentElement.setAttribute('data-theme', val);
                    document.body.setAttribute('data-theme', val);
                    const sel = FLAT_THEMES.find((t) => t.id === val);
                    showToast?.(`已应用灵感色调：${sel?.name || val}`, 'success');
                  }}
                  options={flatThemeOptions}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xs font-medium flex items-center justify-between"
                />
              </div>
            </div>

            {/* Quick Palette Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 pt-0.5">
              {FLAT_THEMES.map((item) => {
                const isActive = !activeCustomId && uiStyle === 'flat' && flatTheme === item.id;
                return (
                  <BaseButton
                    key={item.id}
                    type="button"
                    onClick={() => {
                      clearCustomCssOverrides();
                      setActiveCustomPaletteId(null);
                      setActiveCustomIdState(null);
                      setFlatTheme(item.id);
                      document.documentElement.setAttribute('data-theme', item.id);
                      document.body.setAttribute('data-theme', item.id);
                      showToast?.(`已选择：${item.tag}`, 'success');
                    }}
                    className={`px-2 py-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
                      isActive
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-500/30 font-bold text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-black/10"
                      style={{ backgroundColor: item.dotColor }}
                    />
                    <span className="truncate text-[11px]">{item.name}</span>
                    {isActive && <Check className="w-3 h-3 text-amber-500 ml-auto shrink-0" />}
                  </BaseButton>
                );
              })}
            </div>
          </div>
        )}

        {/* Glass Theme Mode Switcher */}
        {uiStyle === 'glass' && (
          <div className="pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              毛玻璃深浅模式微调：
            </span>
            <BaseButton
              type="button"
              onClick={() => {
                const next = theme === 'light' ? 'dark' : 'light';
                setTheme(next);
                showToast?.(next === 'dark' ? '已开启暗黑模式' : '已开启明亮模式', 'info');
              }}
              className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>当前：暗黑模式 (点击切换明亮)</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>当前：明亮模式 (点击切换暗黑)</span>
                </>
              )}
            </BaseButton>
          </div>
        )}
      </div>

      {/* 2. User's Saved Custom Themes Library */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
          onClick={() => setIsSavedPalettesOpen(!isSavedPalettesOpen)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 group-hover:text-amber-600 transition-colors">
                <BookmarkPlus className="w-4 h-4 text-amber-500" />
                我的自定义配色库 ({savedPalettes.length})
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
                {isSavedPalettesOpen ? '点击收起' : '点击展开'}
                {isSavedPalettesOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              您保存的专属主题调色板存放在此处，支持一键应用、单独导出或删除。
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
            {/* Export Palettes */}
            {savedPalettes.length > 0 && (
              <BaseButton
                type="button"
                onClick={handleExportPalettes}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-xs cursor-pointer"
                title="导出自定义配色库为 JSON 文件"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" />
                <span>导出</span>
              </BaseButton>
            )}

            {/* Import Palettes */}
            <BaseButton
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-xs cursor-pointer"
              title="从 JSON 文件导入配色方案"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span>导入</span>
            </BaseButton>

            {/* Start Fresh Custom Draft */}
            <BaseButton
              type="button"
              onClick={handleStartFreshDraft}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors shadow-xs cursor-pointer"
              title="载入全新空白浅色调色板开始设计"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建浅色方案</span>
            </BaseButton>

            {activeCustomId && (
              <BaseButton
                type="button"
                onClick={handleResetToSystemDefault}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-xs cursor-pointer"
                title="退出当前自定义配色，恢复系统默认"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>恢复默认</span>
              </BaseButton>
            )}
          </div>
        </div>

        {isSavedPalettesOpen && (
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 mt-2 animate-in fade-in slide-in-from-top-3 duration-200">
            {savedPalettes.length === 0 ? (
          <div className="py-4 px-3 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-850/30">
            <Sliders className="w-5 h-5 text-zinc-400 mx-auto mb-1.5 opacity-60" />
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              暂无已保存的自定义主题
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              可在下方工作台自由调配浅色背景、渐变角度与渲染度、各按键透明度并保存。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-0.5">
            {savedPalettes.map((palette) => {
              const isCurrent = activeCustomId === palette.id;
              return (
                <div
                  key={palette.id}
                  onClick={() => handleApplyCustomPalette(palette)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-xs ring-1 ring-amber-500/30'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-850/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex -space-x-1.5 shrink-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: palette.accent }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: palette.bgPaper }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: palette.text }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                        {palette.name}
                        {isCurrent && (
                          <span className="text-[9px] px-1 py-0.1 rounded bg-amber-500 text-white font-medium">
                            生效中
                          </span>
                        )}
                        {palette.tags?.includes('AI 生成') && (
                          <span className="text-[9px] px-1 py-0.1 rounded bg-purple-500 text-white font-medium">
                            AI 生成
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {new Date(palette.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <BaseButton
                      type="button"
                      onClick={(e) => handleExportSinglePalette(palette, e)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                      title="单独导出此配色"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </BaseButton>
                    <BaseButton
                      type="button"
                      onClick={(e) => handleDeleteCustomPalette(palette.id, palette.name, e)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="删除此自定义配色"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </BaseButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
        )}
      </div>

      {/* 4. Fine-Grained Modular Customization Workbench (Requirement: Collapsible with description when closed) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-xs transition-all duration-300">
        {/* Collapsible Header */}
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
          onClick={() => setIsWorkbenchOpen(!isWorkbenchOpen)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 group-hover:text-amber-600 transition-colors">
                <Sliders className="w-4 h-4 text-amber-500" />
                高级精细化浅色调色工作台
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                {isWorkbenchOpen ? '点击收起' : '点击展开精细调色'}
                {isWorkbenchOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              支持大背景浅色系纸张、渐变方向与渲染度、各按键交互与透明度调节。所有预览固定在模拟交互小框中，保存前不影响全局。
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
            <BaseButton
              type="button"
              onClick={() => setIsWorkbenchOpen(!isWorkbenchOpen)}
              className="w-full md:w-auto justify-center px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isWorkbenchOpen ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>收起工作台</span>
                </>
              ) : (
                <>
                  <Sliders className="w-3.5 h-3.5" />
                  <span>展开工作台</span>
                </>
              )}
            </BaseButton>
          </div>
        </div>

        {/* When Collapsed: Give Clean Description Card */}
        {!isWorkbenchOpen && (
          <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/40 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                注意事项
              </div>
              <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-400 font-medium">
                工作台目前处于实验阶段，会出现错位不清晰，部分按键不匹配样式的情况，请谨慎使用
              </p>
            </div>
          </div>
        )}

        {/* When Expanded: Render Live Mini Preview Box + Modular Tuning Tabs */}
        {isWorkbenchOpen && (
          <div className="pt-2 space-y-4 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Top: Fixed Live Interactive Mini Preview Window (Requirement: All previews inside this box) */}
            <LiveThemePreview draft={colorDraft} />

            {/* 3. Diverse Inspiration Formulas (All Light Themes) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs">
              <div 
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group"
                onClick={() => setIsInspirationsOpen(!isInspirationsOpen)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 group-hover:text-amber-600 transition-colors">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      精选浅色系灵感配方速选 ({DIVERSE_INSPIRATION_TEMPLATES.length})
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
                      {isInspirationsOpen ? '点击收起' : '点击展开'}
                      {isInspirationsOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    随机生成与预设方案严格限定为浅色系底色，点击即刻载入下方工作台实时预览。
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={hiddenImageInputRef}
                    onChange={handleExtractImageColor}
                    className="hidden" 
                  />

                  <BaseButton
                    type="button"
                    onClick={() => setIsMultiColorModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors shadow-xs cursor-pointer"
                    title="选择自定义色彩，自动生成配套浅色主题"
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                    <span>依色系生成</span>
                  </BaseButton>

                  <BaseButton
                    type="button"
                    onClick={() => hiddenImageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors shadow-xs cursor-pointer"
                    title="上传图片，自动提取主色调并生成浅色主题"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>从图片提取</span>
                  </BaseButton>

                  <BaseButton
                    type="button"
                    onClick={handleGenerateRandomPalette}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    title="随机生成一套全新的浅色和谐方案"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                    <span>随机生成浅色主题</span>
                  </BaseButton>
                </div>
              </div>

              {isInspirationsOpen && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 pt-0.5">
                    {DIVERSE_INSPIRATION_TEMPLATES.map((tmpl, idx) => (
                      <BaseButton
                        key={idx}
                        type="button"
                        onClick={() => handleLoadInspiration(tmpl)}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/80 dark:bg-zinc-800/40 hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all text-left flex flex-col justify-between gap-1.5 group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shrink-0 shadow-xs"
                            style={{ backgroundColor: tmpl.accent }}
                          />
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shrink-0 shadow-xs"
                            style={{ backgroundColor: tmpl.bgPaper }}
                          />
                        </div>
                        <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                          {tmpl.name.split(' ')[0]}
                        </div>
                      </BaseButton>
                    ))}
                  </div>
                </div>
              )}
            </div>

      

            {/* Unsaved Preview Notification Banner */}
            {hasUnsavedChanges && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/40 dark:border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <span>调色参数已在上方小框中即时渲染</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-white font-semibold">
                        预览中
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                      效果仅在上方小框内展示。若未保存，离开设置或切换主题后将自动还原。
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full md:w-auto justify-end flex-wrap">
                  <BaseButton
                    type="button"
                    onClick={handleRevertUnsavedChanges}
                    className="px-2.5 py-1 text-xs font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="放弃当前所有未保存微调，还原界面"
                  >
                    <RotateCcw className="w-3 h-3 text-zinc-500" />
                    <span>放弃修改</span>
                  </BaseButton>

                  {activeCustomId && (
                    <BaseButton
                      type="button"
                      onClick={handleOverwriteActivePalette}
                      className="px-3 py-1 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="直接覆盖更新当前已启用的自定义主题"
                    >
                      <Save className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>保存至当前</span>
                    </BaseButton>
                  )}

                  <BaseButton
                    type="button"
                    onClick={handleSaveAsNewPalette}
                    className="px-3.5 py-1 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>保存为新主题</span>
                  </BaseButton>
                </div>
              </div>
            )}

            {/* Sub-Section Navigation: Collapsible */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs transition-all duration-300">
              <div 
                className="flex items-center justify-between p-3 cursor-pointer group"
                onClick={() => setIsCategoryBoardOpen(!isCategoryBoardOpen)}
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-amber-600 transition-colors">
                    选择调色分类板块
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    {isCategoryBoardOpen ? '点击收起' : '点击展开'}
                  </span>
                </div>
                {isCategoryBoardOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </div>
              
              {isCategoryBoardOpen && (
                <div className="p-3 pt-0 border-t border-zinc-100 dark:border-zinc-800/80 mt-1 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="space-y-1.5">
                    {/* Mobile Dropdown (Avoids messy overflow on phones) */}
              <div className="sm:hidden space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-amber-500" />
                    <span>选择调色分类板块：</span>
                  </label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    {workbenchTabOptions.find((t) => t.value === activeTab)?.label.split(' ')[0]}
                  </span>
                </div>
                <CustomSelect
                  value={activeTab}
                  onChange={(val) => setActiveTab(val as any)}
                  options={workbenchTabOptions}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between"
                />
              </div>

              {/* Tablet & Desktop Horizontal Tab Pill List */}
              <div className="hidden sm:flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/60 overflow-x-auto">
                <BaseButton
                  type="button"
                  onClick={() => setActiveTab('bg')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'bg'
                      ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>大背景与渐变渲染度</span>
                </BaseButton>

                <BaseButton
                  type="button"
                  onClick={() => setActiveTab('buttons')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'buttons'
                      ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>按键与透明度调色</span>
                </BaseButton>

                <BaseButton
                  type="button"
                  onClick={() => setActiveTab('header')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'header'
                      ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>顶栏与侧边栏</span>
                </BaseButton>

                <BaseButton
                  type="button"
                  onClick={() => setActiveTab('cards')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'cards'
                      ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>卡片与区块</span>
                </BaseButton>

                <BaseButton
                  type="button"
                  onClick={() => setActiveTab('core')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'core'
                      ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Sparkle className="w-3.5 h-3.5" />
                  <span>核心文字与状态</span>
                </BaseButton>

                <BaseButton
                  type="button"
                  onClick={() => setActiveTab('inspect')}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'inspect'
                      ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>🎯 元素局部精调</span>
                  {Object.keys(appData?.customOverrides || {}).length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px]">
                      {Object.keys(appData?.customOverrides || {}).length}
                    </span>
                  )}
                </BaseButton>
              </div>
            </div>

            {/* Tab 1: Background & Wallpaper */}
            {activeTab === 'bg' && (
              <BackgroundCustomizer
                draft={colorDraft}
                onChange={handleUpdateDraft}
                showToast={showToast}
              />
            )}

            {/* Tab 2: Buttons & Inputs with Transparency */}
            {activeTab === 'buttons' && (
              <ButtonsInputsCustomizer draft={colorDraft} onChange={handleUpdateDraft} />
            )}

            {/* Tab 3: Header & Sidebar */}
            {activeTab === 'header' && (
              <HeaderSidebarCustomizer draft={colorDraft} onChange={handleUpdateDraft} />
            )}

            {/* Tab 4: Blocks & Cards */}
            {activeTab === 'cards' && (
              <BlocksCardsCustomizer draft={colorDraft} onChange={handleUpdateDraft} />
            )}

            {/* Tab 5: Core Colors & Status */}
            {activeTab === 'core' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                <ColorPickerInput
                  label="全局主题强调色 (Accent)"
                  value={colorDraft.accent}
                  defaultValue="#D97706"
                  onChange={(val) => handleUpdateDraft('accent', val)}
                  description="图标、标签及选中态"
                />
                <ColorPickerInput
                  label="主标题与文字颜色 (Text)"
                  value={colorDraft.text}
                  defaultValue="#291F18"
                  onChange={(val) => handleUpdateDraft('text', val)}
                  description="正文文本主要颜色"
                />
                <ColorPickerInput
                  label="次级弱化文字 (Dim Text)"
                  value={colorDraft.dim}
                  defaultValue="#786558"
                  onChange={(val) => handleUpdateDraft('dim', val)}
                  description="辅助说明与次要标签"
                />
                <ColorPickerInput
                  label="警告提示状态色 (Warn)"
                  value={colorDraft.warn}
                  defaultValue="#D97706"
                  onChange={(val) => handleUpdateDraft('warn', val)}
                  description="预警与提示高光"
                />
                <ColorPickerInput
                  label="错误危险状态色 (Error)"
                  value={colorDraft.err}
                  defaultValue="#DC2626"
                  onChange={(val) => handleUpdateDraft('err', val)}
                  description="异常与删除高光"
                />
                <ColorPickerInput
                  label="聚焦与激活轮廓色 (Focus)"
                  value={colorDraft.lineFocus}
                  defaultValue="rgba(217, 119, 6, 0.5)"
                  onChange={(val) => handleUpdateDraft('lineFocus', val)}
                  description="激活元素高光"
                />
              </div>
            )}

            {/* Tab 6: Element Local Fine-Tuning (Inspect Mode) */}
            {activeTab === 'inspect' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 1. Mode Status & Launch Card */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-amber-500" />
                        全站元素所见即所得精调
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        开启后可在任意页面移动鼠标，带有金色虚线框的部件均支持点击单独调色、设边框或圆角。
                      </p>
                    </div>

                    <BaseButton
                      type="button"
                      onClick={() => {
                        const next = !isInspectMode;
                        setIsInspectMode?.(next);
                        showToast?.(
                          next
                            ? '已开启局部精调模式，移动并点击任意元素即可精调'
                            : '已退出局部精调模式',
                          next ? 'success' : 'info'
                        );
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 ${
                        isInspectMode
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {isInspectMode ? (
                        <>
                          <LogOut className="w-3.5 h-3.5" />
                          <span>退出局部精调模式 (已开启)</span>
                        </>
                      ) : (
                        <>
                          <Sliders className="w-3.5 h-3.5" />
                          <span>开启全站局部精调模式</span>
                        </>
                      )}
                    </BaseButton>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300 font-medium bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    <Info className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      <strong>快捷操作：</strong>精调模式下按键盘 <strong>Esc 键</strong> 或点击顶部浮动栏的红色按钮可立即退出。
                    </span>
                  </div>
                </div>

                {/* 2. List of Currently Customized Overrides */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      当前已生效的局部定制元素 ({Object.keys(appData?.customOverrides || {}).length})
                    </h4>
                    {Object.keys(appData?.customOverrides || {}).length > 0 && (
                      <BaseButton
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('确定要清空所有已定制的局部元素样式吗？此操作无法撤销。')) {
                            updateAppData?.({ ...appData, customOverrides: {} } as any);
                            showToast?.('已清空所有局部定制样式', 'success');
                          }
                        }}
                        className="text-[11px] px-2.5 py-1"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> 清空全部定制
                      </BaseButton>
                    )}
                  </div>

                  {Object.keys(appData?.customOverrides || {}).length === 0 ? (
                    <div className="p-5 text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400">
                      暂无局部元素定制。点击上方开启精调模式，或在下方选择常用部件直接开始定制！
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
                      {Object.entries(appData?.customOverrides || {}).map(([designId, styles]: [string, any]) => (
                        <div
                          key={designId}
                          className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/60 flex items-start justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {designId}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(styles || {}).map(([k, v]: [string, any]) => (
                                <span
                                  key={k}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 font-mono"
                                >
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <BaseButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newOverrides = { ...(appData?.customOverrides || {}) };
                              delete newOverrides[designId];
                              updateAppData?.({ ...appData, customOverrides: newOverrides } as any);
                              showToast?.(`已清除 ${designId} 的样式`, 'info');
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 shrink-0 h-7 w-7 p-0"
                            title="删除此项定制"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </BaseButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Fast-Pick Common UI Targets */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    常用部件快捷清单 (点击立即开启精调)
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    无需在页面手动查找，点击下方预设部件即可立即定位并唤起局部精调编辑器。
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {[
                      { id: 'header-bar', label: '顶部导航栏' },
                      { id: 'sidebar', label: '侧边栏底板' },
                      { id: 'sidebar-footer', label: '侧边栏底部按钮区' },
                      { id: 'card-grid-container', label: '角色卡展示区' },
                      { id: 'search-filter-card', label: '搜索过滤栏' },
                      { id: 'card-detail-modal-box', label: '卡片详情弹窗' },
                      { id: 'worldbook-section', label: '世界书展示面板' },
                      { id: 'chat-meme-section', label: '聊天表情包面板' },
                    ].map((item) => (
                      <BaseButton
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setIsInspectMode?.(true);
                          const el = document.querySelector(`[data-design-id="${item.id}"]`) as HTMLElement;
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.click();
                          } else {
                            const newOverrides = { ...(appData?.customOverrides || {}) };
                            if (!newOverrides[item.id]) {
                              newOverrides[item.id] = { backgroundColor: '#ffffff' };
                              updateAppData?.({ ...appData, customOverrides: newOverrides } as any);
                            }
                          }
                          showToast?.(`已开启并定位部件：${item.label} (${item.id})`, 'info');
                        }}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:border-amber-500 hover:bg-amber-500/5 text-left text-xs transition-all flex flex-col justify-between cursor-pointer"
                      >
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.label}</span>
                        <span className="font-mono text-[10px] text-zinc-400 mt-1 truncate">{item.id}</span>
                      </BaseButton>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom: Save & Revert Action Card */}
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col lg:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <Save className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span>保存调色结果并全站生效</span>
                    {hasUnsavedChanges && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-white font-semibold">
                        未保存 (试色中)
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    保存后将生效并存入配色库。未保存离开设置将自动还原。
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-end flex-wrap">
                {hasUnsavedChanges && (
                  <BaseButton
                    type="button"
                    onClick={handleRevertUnsavedChanges}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="放弃当前所有未保存修改并还原界面"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                    <span>放弃修改</span>
                  </BaseButton>
                )}

                {activeCustomId && (
                  <BaseButton
                    type="button"
                    onClick={handleOverwriteActivePalette}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="直接更新当前已启用的自定义主题"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>保存至当前</span>
                  </BaseButton>
                )}

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <BaseInput
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder={colorDraft.name || '输入新主题名称...'}
                    className="w-full sm:w-40 px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 shadow-xs focus:border-amber-500 outline-none"
                  />
                  <BaseButton
                    type="button"
                    onClick={handleSaveAsNewPalette}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>保存为新主题</span>
                  </BaseButton>
                </div>
              </div>
            </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Color Picker Modal */}
      {isMultiColorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">依色系智能生成 (2-3色)</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">选择您偏好的主色调、副色调和背景色，系统将自动演化出主次按钮、浅色渐变纸张等14组和谐属性的浅色预设。</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-700 dark:text-zinc-300">主要强调色 (Primary/Accent)</label>
                <BaseInput type="color" value={multiColors[0]} onChange={(e) => setMultiColors([e.target.value, multiColors[1], multiColors[2]])} className="w-8 h-8 rounded cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-700 dark:text-zinc-300">次级背景色 (Secondary Bg)</label>
                <BaseInput type="color" value={multiColors[1]} onChange={(e) => setMultiColors([multiColors[0], e.target.value, multiColors[2]])} className="w-8 h-8 rounded cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-700 dark:text-zinc-300">辅助点缀色 (Optional/Paper)</label>
                <BaseInput type="color" value={multiColors[2]} onChange={(e) => setMultiColors([multiColors[0], multiColors[1], e.target.value])} className="w-8 h-8 rounded cursor-pointer" />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <BaseButton
                onClick={() => setIsMultiColorModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </BaseButton>
              <BaseButton
                onClick={handleGenerateFromMultipleColors}
                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                确定生成
              </BaseButton>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
