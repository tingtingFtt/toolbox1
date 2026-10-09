import React, { useState, useEffect, useRef } from 'react';
import { BaseCard } from '../ui/BaseCard';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import {
  Type,
  Sparkles,
  Upload,
  Globe,
  Trash2,
  RotateCcw,
  Check,
  Sliders,
  Layers,
  Plus,
  HelpCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Wand2,
  ExternalLink,
  Info,
  Palette,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';
import {
  FONT_ZONES,
  BUILTIN_FONTS,
  FontItem,
  FontZoneKey,
  ZoneConfigMap,
  ZoneSetting,
  getSavedZoneSettings,
  saveZoneSettings,
  updateZoneSetting,
  resetSingleZone,
  applyFontToAllZones,
  resetAllZonesToDefault,
  getSavedCustomFonts,
  saveCustomFonts,
  injectFontFaceRule,
  normalizeFontFamily,
  parseWebFontInput,
  tryFetchFontFamilyFromUrl
} from '../../utils/fontManager';

interface FontManagerPanelProps {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
}

// 模块级会话内存状态：初次进入默认折叠收缩（isEntirePanelExpanded: false）；在未刷新页面前跨界面切换时，保留用户操作后的展开收缩与调节状态
interface FontManagerSessionState {
  isEntirePanelExpanded: boolean;
  isHierarchyExpanded: boolean;
  isPreviewExpanded: boolean;
  isFontListExpanded: boolean;
  selectedZoneKey: FontZoneKey;
  selectedFontId: string;
  previewText: string;
  previewSize: number;
  previewWeight: number;
}

const sessionFontState: FontManagerSessionState = {
  isEntirePanelExpanded: false, // 初次进入默认收缩放置
  isHierarchyExpanded: true,
  isPreviewExpanded: true,
  isFontListExpanded: true,
  selectedZoneKey: 'home_hero',
  selectedFontId: BUILTIN_FONTS[1]?.id || '',
  previewText: '欢迎来到 酒馆工作台，一切皆流，無物常駐。123456',
  previewSize: 20,
  previewWeight: 700,
};

export const FontManagerPanel: React.FC<FontManagerPanelProps> = ({ showToast }) => {
  const [zoneSettings, setZoneSettings] = useState<ZoneConfigMap>(getSavedZoneSettings());
  const [customFonts, setCustomFonts] = useState<FontItem[]>(getSavedCustomFonts());
  const [selectedZoneKey, setSelectedZoneKey] = useState<FontZoneKey>(() => sessionFontState.selectedZoneKey);
  const [selectedFont, setSelectedFont] = useState<FontItem>(() => {
    return BUILTIN_FONTS.find((f) => f.id === sessionFontState.selectedFontId) || BUILTIN_FONTS[1];
  });
  
  // 实时预览控制
  const [previewText, setPreviewText] = useState<string>(() => sessionFontState.previewText);
  const [previewSize, setPreviewSize] = useState<number>(() => sessionFontState.previewSize);
  const [previewWeight, setPreviewWeight] = useState<number>(() => sessionFontState.previewWeight);

  // 折叠收缩状态（初次进入默认为 false 收缩，离开后再回来保持上一次状态）
  const [isEntirePanelExpanded, setIsEntirePanelExpanded] = useState<boolean>(() => sessionFontState.isEntirePanelExpanded);
  const [isHierarchyExpanded, setIsHierarchyExpanded] = useState<boolean>(() => sessionFontState.isHierarchyExpanded);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(() => sessionFontState.isPreviewExpanded);
  const [isFontListExpanded, setIsFontListExpanded] = useState<boolean>(() => sessionFontState.isFontListExpanded);

  // 弹窗状态
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [fontToApply, setFontToApply] = useState<FontItem | null>(null);
  const [selectedZonesForApply, setSelectedZonesForApply] = useState<Record<FontZoneKey, boolean>>(() => {
    const init: Partial<Record<FontZoneKey, boolean>> = {};
    FONT_ZONES.forEach((z) => {
      init[z.key] = true;
    });
    return init as Record<FontZoneKey, boolean>;
  });

  // 网络字体导入表单
  const [isWebFontModalOpen, setIsWebFontModalOpen] = useState<boolean>(false);
  const [webFontInput, setWebFontInput] = useState<string>('');
  const [webFontName, setWebFontName] = useState<string>('');
  const [webFontUrl, setWebFontUrl] = useState<string>('');
  const [webFontFamily, setWebFontFamily] = useState<string>('');
  const [isAutoParsing, setIsAutoParsing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 合并全部可用字体列表
  const allFonts: FontItem[] = [...BUILTIN_FONTS, ...customFonts];

  useEffect(() => {
    setZoneSettings(getSavedZoneSettings());
  }, []);

  // 同步状态到 session 模块缓存，跨页面切换时保持状态
  useEffect(() => {
    sessionFontState.isEntirePanelExpanded = isEntirePanelExpanded;
  }, [isEntirePanelExpanded]);

  useEffect(() => {
    sessionFontState.isHierarchyExpanded = isHierarchyExpanded;
  }, [isHierarchyExpanded]);

  useEffect(() => {
    sessionFontState.isPreviewExpanded = isPreviewExpanded;
  }, [isPreviewExpanded]);

  useEffect(() => {
    sessionFontState.isFontListExpanded = isFontListExpanded;
  }, [isFontListExpanded]);

  useEffect(() => {
    sessionFontState.selectedZoneKey = selectedZoneKey;
  }, [selectedZoneKey]);

  useEffect(() => {
    if (selectedFont?.id) {
      sessionFontState.selectedFontId = selectedFont.id;
    }
  }, [selectedFont]);

  useEffect(() => {
    sessionFontState.previewText = previewText;
    sessionFontState.previewSize = previewSize;
    sessionFontState.previewWeight = previewWeight;
  }, [previewText, previewSize, previewWeight]);

  // 选中字体时，立即确保其 CSS 规则已注入 DOM
  useEffect(() => {
    if (selectedFont) {
      injectFontFaceRule(selectedFont);
    }
  }, [selectedFont]);

  // 刷新当前配置状态
  const refreshZoneState = () => {
    setZoneSettings({ ...getSavedZoneSettings() });
  };

  // 当前选中的层级元信息与设置
  const currentZoneInfo = FONT_ZONES.find((z) => z.key === selectedZoneKey) || FONT_ZONES[0];
  const currentSetting = zoneSettings[selectedZoneKey] || {
    family: '',
    size: currentZoneInfo.defaultSize,
    color: '',
    weight: currentZoneInfo.defaultWeight,
  };

  // 更改当前层级配置
  const handleUpdateCurrentZone = (partial: Partial<ZoneSetting>) => {
    updateZoneSetting(selectedZoneKey, partial);
    refreshZoneState();
  };

  // 单个区域重置
  const handleResetCurrentZone = () => {
    resetSingleZone(selectedZoneKey);
    refreshZoneState();
    showToast('info', `已将「${currentZoneInfo.label}」恢复为初始默认设置`);
  };

  // 一键全部重置
  const handleResetAllZones = () => {
    resetAllZonesToDefault();
    refreshZoneState();
    showToast('info', '已将所有界面层级的字号 (4~40px)、字体与颜色全部重置为系统默认');
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExts = ['.woff2', '.woff', '.ttf', '.otf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      showToast('error', '请上传 .woff2, .woff, .ttf 或 .otf 格式的字体文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const uniqueFamily = `CustomFont_${Date.now()}`;

      const newFont: FontItem = {
        id: `uploaded-${Date.now()}`,
        name: cleanName,
        family: `"${uniqueFamily}", sans-serif`,
        type: 'uploaded',
        dataUrl,
        weights: '100-900',
        description: `本地上传字体 (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      };

      injectFontFaceRule(newFont);
      const updated = [...customFonts, newFont];
      setCustomFonts(updated);
      saveCustomFonts(updated);
      setSelectedFont(newFont);
      showToast('success', `成功导入本地字体「${cleanName}」，已同步加入库表`);
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 智能解析粘贴内容
  const handleSmartParseInput = async (val: string) => {
    setWebFontInput(val);
    const parsed = parseWebFontInput(val);
    if (parsed.url) setWebFontUrl(parsed.url);
    if (parsed.family) setWebFontFamily(parsed.family);
    if (parsed.nameSuggestion && !webFontName) setWebFontName(parsed.nameSuggestion);

    if (parsed.url && !parsed.family) {
      setIsAutoParsing(true);
      const fetched = await tryFetchFontFamilyFromUrl(parsed.url);
      if (fetched) {
        setWebFontFamily(fetched);
        if (!webFontName) setWebFontName(fetched);
      }
      setIsAutoParsing(false);
    }
  };

  // 处理添加网络字体
  const handleAddWebFont = async () => {
    const rawUrl = webFontUrl.trim() || parseWebFontInput(webFontInput).url || '';
    if (!rawUrl) {
      showToast('warning', '请填写网络字体 CSS 链接或粘贴 @import 语句');
      return;
    }

    let finalFamily = webFontFamily.trim() || parseWebFontInput(webFontInput).family || '';
    let finalName = webFontName.trim() || parseWebFontInput(webFontInput).nameSuggestion || '网络自定义字体';

    if (!finalFamily) {
      const fetched = await tryFetchFontFamilyFromUrl(rawUrl);
      if (fetched) {
        finalFamily = fetched;
        if (!webFontName.trim()) finalName = fetched;
      } else {
        finalFamily = finalName;
      }
    }

    const safeFamily = normalizeFontFamily(finalFamily, finalName);

    const newFont: FontItem = {
      id: `web-${Date.now()}`,
      name: finalName,
      family: safeFamily,
      type: 'web',
      url: rawUrl,
      description: `网络 WebFont (族名: ${finalFamily})`,
    };

    injectFontFaceRule(newFont);
    const updated = [...customFonts, newFont];
    setCustomFonts(updated);
    saveCustomFonts(updated);
    setSelectedFont(newFont);
    setIsWebFontModalOpen(false);
    setWebFontInput('');
    setWebFontName('');
    setWebFontUrl('');
    setWebFontFamily('');
    showToast('success', `成功添加网络字体「${newFont.name}」，已就绪！`);
  };

  // 删除自定义字体
  const handleDeleteCustomFont = (id: string, name: string) => {
    const updated = customFonts.filter((f) => f.id !== id);
    setCustomFonts(updated);
    saveCustomFonts(updated);
    if (selectedFont.id === id) {
      setSelectedFont(BUILTIN_FONTS[0]);
    }
    showToast('info', `已移除自定义字体「${name}」`);
  };

  // 打开批量应用弹窗
  const openApplyModal = (font: FontItem) => {
    setFontToApply(font);
    const initialSelected: Record<FontZoneKey, boolean> = {} as any;
    FONT_ZONES.forEach((z) => {
      initialSelected[z.key] = true;
    });
    setSelectedZonesForApply(initialSelected);
    setIsApplyModalOpen(true);
  };

  // 一键应用到全部区域
  const handleApplyToAllZones = (font: FontItem) => {
    injectFontFaceRule(font);
    applyFontToAllZones(font.family);
    refreshZoneState();
    showToast('success', `已将「${font.name}」一键应用到全局所有层级与区域！`);
  };

  // 确认应用字体到勾选区域
  const handleConfirmApply = () => {
    if (!fontToApply) return;
    injectFontFaceRule(fontToApply);

    let appliedCount = 0;
    FONT_ZONES.forEach((z) => {
      if (selectedZonesForApply[z.key]) {
        updateZoneSetting(z.key, { family: fontToApply.family });
        appliedCount++;
      }
    });

    refreshZoneState();
    setIsApplyModalOpen(false);
    showToast('success', `已将「${fontToApply.name}」应用到 ${appliedCount} 个指定层级，即时生效！`);
  };

  // 获取当前层级绑定的字体显示名称
  const getZoneFontDisplayName = (family?: string) => {
    if (!family || !family.trim()) return '系统自带默认 (跟随主题/全局)';
    const matched = allFonts.find((f) => f.family === family || family.includes(f.name));
    return matched ? matched.name : family.replace(/["']/g, '');
  };

  // 按分类对 FONT_ZONES 分组
  const categories: { key: string; label: string; zones: typeof FONT_ZONES }[] = [
    { key: 'home', label: '🏠 1. 主页系统 (独立隔离)', zones: FONT_ZONES.filter((z) => z.category === 'home') },
    { key: 'page', label: '📑 2. 分界面与列表页', zones: FONT_ZONES.filter((z) => z.category === 'page') },
    { key: 'modal', label: '🔍 3. 详情弹窗与编辑', zones: FONT_ZONES.filter((z) => z.category === 'modal') },
    { key: 'nav', label: '🧭 4. 导航系统 (顶栏/横栏/侧边栏)', zones: FONT_ZONES.filter((z) => z.category === 'nav') },
    { key: 'button', label: '🔘 5. 按钮与徽章系统', zones: FONT_ZONES.filter((z) => z.category === 'button') },
    { key: 'code', label: '💻 6. 代码与特殊文本', zones: FONT_ZONES.filter((z) => z.category === 'code') },
  ];

  return (
    <div data-design-id="font-manager-panel" className="space-y-3">
      {/* 隐藏的文件选择器 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".woff2,.woff,.ttf,.otf"
        className="hidden"
      />

      {/* 顶部标题与轻量操作条卡片 */}
      <BaseCard designId="font-manager-header-card" className="p-2.5 sm:p-3 bg-[var(--bg-paper,#f3eee8)] border border-[var(--line,#e2d0bc)] shadow-xs">
        <div className="space-y-1.5">
          {/* 首行：标题 (左) + 上传/网络字体按钮 + 收缩三角 (最右) */}
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => setIsEntirePanelExpanded(!isEntirePanelExpanded)}
              className="flex items-center gap-1.5 cursor-pointer select-none group min-w-0"
            >
              <Type className="w-4 h-4 text-[var(--accent,#486175)] shrink-0" />
              <h2 className="text-sm sm:text-[15px] font-bold text-[var(--text-serif,#1a232d)] group-hover:text-[var(--accent,#486175)] transition-colors truncate">
                全站字体层级与字号缩放管理中心
              </h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-design-id="upload-font-btn"
                onClick={() => fileInputRef.current?.click()}
                className="h-5.5 px-2 rounded bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] hover:bg-[var(--btn-primary-hover,rgba(96,126,149,0.22))] text-[var(--accent,#486175)] font-semibold text-[10.5px] inline-flex items-center justify-center gap-1 border border-[var(--line-focus,rgba(96,126,149,0.3))] transition-all cursor-pointer leading-none min-h-0 shrink-0"
              >
                <Upload className="w-2.5 h-2.5" />
                <span>上传字体</span>
              </button>
              <button
                type="button"
                data-design-id="add-webfont-btn"
                onClick={() => setIsWebFontModalOpen(true)}
                className="h-5.5 px-2 rounded bg-transparent hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.1))] text-[var(--dim,#647382)] text-[10.5px] inline-flex items-center justify-center gap-1 border border-[var(--line,#e2d0bc)] transition-all cursor-pointer leading-none min-h-0 shrink-0"
              >
                <Globe className="w-2.5 h-2.5" />
                <span>网络字体</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEntirePanelExpanded(!isEntirePanelExpanded)}
                className="p-0.5 rounded text-[var(--dim,#647382)] hover:text-[var(--accent,#486175)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ml-0.5 no-underline border-none outline-none"
                title={isEntirePanelExpanded ? '收起字体管理中心' : '展开字体管理中心'}
              >
                {isEntirePanelExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[var(--dim,#647382)] leading-relaxed no-underline select-none">
            支持主页三级层级系统、分界面、详情页、横向/侧边导航栏及各类按钮字号在 <strong>4px ～ 40px</strong> 之间自由缩放，可独立绑定字体与颜色，0 刷新即时生效。
          </p>
        </div>
      </BaseCard>

      {isEntirePanelExpanded && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* ======================= 板块一：层级系统与下拉选择（支持标题折叠收放） ======================= */}
          <BaseCard designId="font-hierarchy-selector-card" className="p-2.5 sm:p-3 space-y-2 bg-[var(--bg-paper,#f3eee8)] border border-[var(--line,#e2d0bc)] shadow-xs">
            {/* 标题栏（支持点击展开/收起） */}
            <div className="flex items-center justify-between pb-0.5">
              <button
                type="button"
                onClick={() => setIsHierarchyExpanded(!isHierarchyExpanded)}
                className="flex-1 flex items-center justify-between gap-2 text-xs font-bold text-[var(--text-serif,#1a232d)] hover:text-[var(--accent,#486175)] transition-colors cursor-pointer no-underline min-w-0 border-none outline-none"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent,#486175)] shrink-0" />
                  <span className="shrink-0">选择目标层级与字号独立定制：</span>
                  <span className="text-[var(--accent,#486175)] font-mono truncate">{currentZoneInfo.label}</span>
                </div>
                <div className="shrink-0 flex items-center gap-1 p-0.5 text-[var(--dim,#647382)]">
                  <span className="text-[9.5px] font-mono hidden sm:inline">{isHierarchyExpanded ? '收起' : '展开'}</span>
                  {isHierarchyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>
            </div>

            {isHierarchyExpanded && (
              <div className="space-y-2 pt-0.5 animate-in fade-in duration-150">
                {/* 首行：目标层级下拉选择框 + 一键全部重置按钮在同一行 */}
                <div className="flex items-center justify-between gap-2 flex-nowrap">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <label htmlFor="font-zone-select-dropdown" className="flex items-center gap-1 text-xs font-bold text-[var(--text-serif,#1a232d)] shrink-0 select-none">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent,#486175)]" />
                      <span>选择目标层级:</span>
                    </label>
                    
                    {/* 下拉列表 (Dropdown Select) */}
                    <select
                      id="font-zone-select-dropdown"
                      data-design-id="font-zone-select-dropdown"
                      value={selectedZoneKey}
                      onChange={(e) => setSelectedZoneKey(e.target.value as FontZoneKey)}
                      className="flex-1 min-w-0 h-7 px-2 text-xs font-medium bg-[var(--bg-page,#ffffff)] text-[var(--text-serif,#1a232d)] border border-[var(--line,#e2d0bc)] rounded-md focus:outline-none focus:border-[var(--accent,#486175)] cursor-pointer shadow-2xs truncate"
                    >
                      {categories.map((cat) => (
                        <optgroup key={cat.key} label={cat.label}>
                          {cat.zones.map((zone) => {
                            const s = zoneSettings[zone.key];
                            const isCustom = (s && s.family) || (s && s.size !== zone.defaultSize) || (s && s.color);
                            return (
                              <option key={zone.key} value={zone.key}>
                                {zone.label} {isCustom ? `[已定制: ${s?.size || zone.defaultSize}px]` : `[默认: ${zone.defaultSize}px]`}
                              </option>
                            );
                          })}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* 全部重置按键 - 与下拉列表严格在同一行 */}
                  <button
                    type="button"
                    data-design-id="reset-all-zones-btn"
                    onClick={handleResetAllZones}
                    className="h-7 px-2.5 rounded bg-transparent hover:bg-red-500/10 text-[var(--dim,#647382)] hover:text-red-500 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-[var(--line,#e2d0bc)] hover:border-red-300 shrink-0 whitespace-nowrap"
                    title="一键将所有层级的字号、字体与颜色恢复为系统初始预设"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>一键全部重置</span>
                  </button>
                </div>

                {/* 当前选中层级的细分设置面板 */}
                <div className="p-2.5 rounded-lg border border-[var(--line,#e2d0bc)]/80 bg-[var(--bg-page,#ffffff)]/60 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 pb-1 border-b border-[var(--line-soft,rgba(0,0,0,0.06))]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs sm:text-[13px] font-bold text-[var(--text-serif,#1a232d)] truncate">
                        {currentZoneInfo.label}
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] text-[var(--accent,#486175)] font-mono shrink-0">
                        {currentZoneInfo.categoryLabel}
                      </span>
                      <span className="text-[10px] text-[var(--dim,#647382)] truncate hidden sm:inline">
                        ({currentZoneInfo.desc})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetCurrentZone}
                      className="text-[10px] text-[var(--dim,#647382)] hover:text-red-500 px-2 py-0.5 rounded border border-[var(--line,#e2d0bc)]/60 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                    >
                      恢复此项默认
                    </button>
                  </div>

                  {/* 核心参数调节网格：字号 (4px-40px) + 字体绑定 + 颜色 + 字重 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {/* 1. 字号缩放调节 (严格 4px ~ 40px) */}
                    <div className="space-y-1 p-2 rounded bg-[var(--bg-paper,#f3eee8)]/50 border border-[var(--line-soft,rgba(0,0,0,0.06))] flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[var(--text-serif,#1a232d)] flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-[var(--accent,#486175)]" />
                          <span>字号缩放 (4px ～ 40px):</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={4}
                            max={40}
                            value={currentSetting.size ?? currentZoneInfo.defaultSize}
                            onChange={(e) => handleUpdateCurrentZone({ size: Number(e.target.value) })}
                            className="w-11 h-5 text-center text-[11px] font-bold font-mono bg-[var(--bg-page,#ffffff)] text-[var(--accent,#486175)] rounded border border-[var(--line,#e2d0bc)] focus:outline-none"
                          />
                          <span className="text-[9.5px] text-[var(--dim,#647382)] font-mono">px</span>
                        </div>
                      </div>

                      {/* 滑块 */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[9.5px] text-[var(--dim,#647382)] font-mono">4px</span>
                        <input
                          type="range"
                          min={4}
                          max={40}
                          step={1}
                          value={currentSetting.size ?? currentZoneInfo.defaultSize}
                          onChange={(e) => handleUpdateCurrentZone({ size: Number(e.target.value) })}
                          className="flex-1 accent-[var(--accent,#486175)] cursor-pointer h-1.5"
                        />
                        <span className="text-[9.5px] text-[var(--dim,#647382)] font-mono">40px</span>
                      </div>

                      {/* 快捷推荐字号 */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[9.5px]">
                        <span className="text-[var(--dim,#647382)] shrink-0">快捷:</span>
                        {[8, 10, 11, 12, 13, 14, 16, 20, 24, 30].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => handleUpdateCurrentZone({ size: sz })}
                            className={`px-1 py-0.2 rounded transition-colors cursor-pointer text-[9px] font-mono ${
                              (currentSetting.size ?? currentZoneInfo.defaultSize) === sz
                                ? 'bg-[var(--accent,#486175)] text-white font-bold'
                                : 'bg-[var(--bg-page,#ffffff)] text-[var(--dim,#647382)] hover:bg-black/5 border border-[var(--line,#e2d0bc)]/60'
                            }`}
                          >
                            {sz}px
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. 绑定字体族 (Font Family) - 标题后方直接放置压缩高度的下拉框 */}
                    <div className="space-y-1 p-2 rounded bg-[var(--bg-paper,#f3eee8)]/50 border border-[var(--line-soft,rgba(0,0,0,0.06))] flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-serif,#1a232d)] flex items-center gap-1 shrink-0">
                          <Type className="w-3 h-3 text-[var(--accent,#486175)]" />
                          <span>绑定字体族:</span>
                        </label>

                        {/* 下拉框直接置于标题后方，压缩高度 */}
                        <select
                          value={currentSetting.family || ''}
                          onChange={(e) => handleUpdateCurrentZone({ family: e.target.value })}
                          className="flex-1 min-w-0 h-6 px-1.5 py-0 text-[11px] font-medium bg-[var(--bg-page,#ffffff)] text-[var(--text-serif,#1a232d)] border border-[var(--line,#e2d0bc)] rounded focus:outline-none focus:border-[var(--accent,#486175)] cursor-pointer truncate shadow-2xs"
                        >
                          <option value="" className="text-[9.5px]">系统自带默认 (跟随主题/全局)</option>
                          {allFonts.map((font) => (
                            <option key={font.id} value={font.family}>
                              {font.name} ({font.type === 'builtin' ? '内置' : font.type === 'uploaded' ? '上传' : font.type === 'web' ? '网络' : '系统'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between text-[9.5px] text-[var(--dim,#647382)] pt-1">
                        <div className="truncate flex-1 min-w-0 pr-1">
                          当前生效：<span className={`font-mono ${!currentSetting.family ? 'text-[8.5px] text-[var(--dim,#647382)] font-normal' : 'font-bold text-[var(--accent,#486175)]'}`}>{getZoneFontDisplayName(currentSetting.family)}</span>
                        </div>
                        {currentSetting.family && (
                          <button
                            type="button"
                            onClick={() => handleUpdateCurrentZone({ family: '' })}
                            className="text-[9px] text-[var(--dim,#647382)] hover:text-red-500 cursor-pointer shrink-0 underline"
                          >
                            清空绑定
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3. 字体颜色配置 (Color) - 精炼单行排版 */}
                    <div className="space-y-1 p-2 rounded bg-[var(--bg-paper,#f3eee8)]/50 border border-[var(--line-soft,rgba(0,0,0,0.06))] flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-serif,#1a232d)] flex items-center gap-1 shrink-0">
                          <Palette className="w-3 h-3 text-[var(--accent,#486175)]" />
                          <span>文字颜色:</span>
                        </label>

                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <input
                            type="color"
                            value={currentSetting.color || '#1A232D'}
                            onChange={(e) => handleUpdateCurrentZone({ color: e.target.value })}
                            className="w-6 h-6 rounded border border-[var(--line,#e2d0bc)] cursor-pointer bg-transparent p-0 shrink-0"
                          />
                          <input
                            type="text"
                            placeholder="跟随主题 (留空)"
                            value={currentSetting.color || ''}
                            onChange={(e) => handleUpdateCurrentZone({ color: e.target.value })}
                            className="flex-1 min-w-0 max-w-[140px] h-6 px-1.5 text-[11px] font-mono bg-[var(--bg-page,#ffffff)] rounded border border-[var(--line,#e2d0bc)] focus:outline-none"
                          />
                          {currentSetting.color && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCurrentZone({ color: '' })}
                              className="text-[9.5px] text-[var(--dim,#647382)] hover:text-red-500 cursor-pointer shrink-0"
                            >
                              清除
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-[9.5px] text-[var(--dim,#647382)] pt-1 truncate">
                        {currentSetting.color ? `已指定固定色: ${currentSetting.color}` : '未指定（自动根据浅色/深色主题自适应）'}
                      </div>
                    </div>

                    {/* 4. 字重粗细 (Font Weight) - 精炼单行排版 */}
                    <div className="space-y-1 p-2 rounded bg-[var(--bg-paper,#f3eee8)]/50 border border-[var(--line-soft,rgba(0,0,0,0.06))] flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[11px] font-bold text-[var(--text-serif,#1a232d)] flex items-center gap-1 shrink-0">
                          <Layers className="w-3 h-3 text-[var(--accent,#486175)]" />
                          <span>字重粗细:</span>
                        </label>

                        <div className="flex flex-wrap items-center gap-1 text-[9.5px] justify-end">
                          {[
                            { label: '常规 400', val: 400 },
                            { label: '中等 500', val: 500 },
                            { label: '半粗 600', val: 600 },
                            { label: '粗体 700', val: 700 },
                            { label: '特粗 900', val: 900 },
                          ].map((w) => (
                            <button
                              key={w.val}
                              type="button"
                              onClick={() => handleUpdateCurrentZone({ weight: w.val })}
                              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer text-[9.5px] leading-tight ${
                                (currentSetting.weight ?? currentZoneInfo.defaultWeight) === w.val
                                  ? 'bg-[var(--accent,#486175)] text-white font-bold shadow-2xs'
                                  : 'bg-[var(--bg-page,#ffffff)] text-[var(--dim,#647382)] hover:bg-black/5 border border-[var(--line,#e2d0bc)]/60'
                              }`}
                            >
                              {w.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-[9.5px] text-[var(--dim,#647382)] pt-1">
                        当前字重：<span className="font-mono font-bold text-[var(--accent,#486175)]">{currentSetting.weight ?? currentZoneInfo.defaultWeight}</span>
                      </div>
                    </div>
                  </div>

                  {/* 当前层级效果即时预览框 */}
                  <div className="pt-0.5">
                    <div className="text-[9.5px] text-[var(--dim,#647382)] mb-1 font-semibold flex items-center justify-between">
                      <span>此层级实时渲染效果预览：</span>
                      <span className="font-mono text-[9px] text-[var(--accent,#486175)]">
                        {currentSetting.size ?? currentZoneInfo.defaultSize}px / 字重 {currentSetting.weight ?? currentZoneInfo.defaultWeight}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: currentSetting.family || undefined,
                        fontSize: `${currentSetting.size ?? currentZoneInfo.defaultSize}px`,
                        fontWeight: currentSetting.weight ?? currentZoneInfo.defaultWeight,
                        color: currentSetting.color || undefined,
                        lineHeight: 1.4,
                      }}
                      className="p-2 sm:p-2.5 rounded-md bg-[var(--bg-paper,#f3eee8)] border border-[var(--line,#e2d0bc)] text-center transition-all truncate"
                    >
                      【{currentZoneInfo.label}】 示例：酒馆工作台 SillyTavern 123456 AaBb
                    </div>
                  </div>
                </div>
              </div>
            )}
          </BaseCard>

          {/* ======================= 板块二：实时字体预览工作台 ======================= */}
          <BaseCard designId="font-live-preview-card" className="p-2.5 sm:p-3 space-y-2 bg-[var(--bg-paper,#f3eee8)] border border-[var(--line,#e2d0bc)] shadow-xs">
            <div className="flex items-center justify-between pb-0.5">
              <button
                type="button"
                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                className="flex-1 flex items-center justify-between gap-2 text-xs font-bold text-[var(--text-serif,#1a232d)] hover:text-[var(--accent,#486175)] transition-colors cursor-pointer no-underline min-w-0 border-none outline-none"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <Eye className="w-3.5 h-3.5 text-[var(--accent,#486175)] shrink-0" />
                  <span className="shrink-0">全局字体库即时试样预览：</span>
                  <span className="text-[var(--accent,#486175)] font-mono truncate">{selectedFont.name}</span>
                </div>
                <div className="shrink-0 p-0.5 text-[var(--dim,#647382)]">
                  {isPreviewExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>
            </div>

            {isPreviewExpanded && (
              <div className="space-y-2 pt-0.5 animate-in fade-in duration-150">
                {/* 预览控制条（字号、字重） */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                    <span className="text-[var(--dim,#647382)] text-[11px] shrink-0">字号:</span>
                    <input
                      type="range"
                      min={4}
                      max={40}
                      value={previewSize}
                      onChange={(e) => setPreviewSize(Number(e.target.value))}
                      className="flex-1 accent-[var(--accent,#486175)] cursor-pointer h-1.5"
                    />
                    <span className="w-8 text-right font-mono text-[var(--accent,#486175)] font-bold text-[11px]">{previewSize}px</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[var(--dim,#647382)] text-[11px]">字重:</span>
                    {[
                      { label: '常规 400', val: 400 },
                      { label: '粗体 700', val: 700 },
                      { label: '特粗 800', val: 800 },
                    ].map((w) => (
                      <button
                        key={w.val}
                        type="button"
                        onClick={() => setPreviewWeight(w.val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                          previewWeight === w.val
                            ? 'bg-[var(--accent,#486175)] text-white font-bold'
                            : 'bg-[var(--bg-page,#ffffff)] text-[var(--dim,#647382)] hover:bg-black/5 border border-[var(--line-soft,rgba(0,0,0,0.06))]'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 快捷例句切换条 */}
                <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar text-[10px]">
                  <span className="text-[var(--dim,#647382)] shrink-0 mr-0.5">例句:</span>
                  {[
                    '欢迎来到 酒馆工作台',
                    '一切皆流，無物常駐。',
                    '天地玄黄 宇宙洪荒 123456',
                    'SillyTavern ST角色卡 ST预设',
                    'The quick brown fox jumps over the lazy dog.',
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewText(sample)}
                      className="px-1.5 py-0.5 rounded bg-[var(--bg-page,#ffffff)] hover:bg-[var(--btn-primary-hover,rgba(96,126,149,0.2))] text-[var(--dim,#647382)] shrink-0 transition-colors cursor-pointer border border-[var(--line,#e2d0bc)]/60 text-[10px] whitespace-nowrap"
                    >
                      {sample}
                    </button>
                  ))}
                </div>

                {/* 可自由编辑的文字输入框 */}
                <BaseInput
                  designId="preview-text-input"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="在此输入想要预览的任意文字..."
                  className="text-xs py-1 px-2.5 h-7.5 bg-[var(--bg-page,#ffffff)]"
                />

                {/* 动态渲染舞台 */}
                <div
                  data-design-id="font-preview-stage"
                  style={{
                    fontFamily: selectedFont.family,
                    fontSize: `${previewSize}px`,
                    fontWeight: previewWeight,
                    lineHeight: 1.5,
                  }}
                  className="p-3 sm:p-3.5 rounded-lg bg-gradient-to-br from-[var(--bg-paper,#f3eee8)]/40 via-transparent to-[var(--bg-paper,#f3eee8)]/20 dark:from-zinc-900/40 dark:to-zinc-950/20 border border-[var(--line,#e2d0bc)] max-h-32 overflow-y-auto flex items-center justify-center text-center transition-all select-none break-words text-[var(--text-serif,#1a232d)] backdrop-blur-[2px]"
                >
                  {previewText || '请输入预览文字'}
                </div>

                {/* 底部操作条 */}
                <div className="flex flex-wrap items-center justify-between pt-0.5 gap-1.5">
                  <span className="text-[10px] text-[var(--dim,#647382)] truncate min-w-0">
                    当前预览：<strong className="text-[var(--text-serif,#1a232d)] font-mono">{selectedFont.name}</strong>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleApplyToAllZones(selectedFont)}
                      className="h-6 px-2 rounded bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] hover:bg-[var(--btn-primary-hover,rgba(96,126,149,0.22))] text-[var(--accent,#486175)] text-[10.5px] font-bold inline-flex items-center justify-center gap-1 border border-[var(--line-focus,rgba(96,126,149,0.3))] transition-all cursor-pointer leading-none min-h-0 shrink-0 shadow-2xs"
                      title="一键将当前预览字体应用到所有界面层级"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>一键全层级应用</span>
                    </button>
                    <button
                      type="button"
                      data-design-id="preview-apply-current-btn"
                      onClick={() => openApplyModal(selectedFont)}
                      className="h-6 px-2.5 rounded bg-[var(--accent,#486175)] hover:bg-[var(--accent,#486175)]/90 text-white text-[10.5px] font-bold shadow-xs inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0 transition-all leading-none min-h-0 border-none outline-none"
                    >
                      <Check className="w-3 h-3" />
                      <span>应用到指定层级...</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </BaseCard>

          {/* ======================= 板块三：可用字体库表 ======================= */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsFontListExpanded(!isFontListExpanded)}
                className="text-xs font-bold uppercase tracking-wider text-[var(--dim,#647382)] flex items-center gap-1.5 hover:text-[var(--text-serif,#1a232d)] transition-colors cursor-pointer no-underline border-none outline-none"
              >
                <Type className="w-3.5 h-3.5 text-[var(--accent,#486175)]" />
                <span>可用字体库表 ({allFonts.length})</span>
                {isFontListExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 ml-1 text-zinc-400" />}
              </button>
              <span className="text-[10px] text-[var(--dim,#647382)]">点击卡片可在上方即时试样</span>
            </div>

            {isFontListExpanded && (
              <div className="max-h-60 overflow-y-auto pr-1 space-y-1.5 no-scrollbar animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {allFonts.map((font) => {
                    const isSelected = selectedFont.id === font.id;
                    return (
                      <BaseCard
                        key={font.id}
                        designId={`font-card-${font.id}`}
                        className={`p-2 transition-all duration-150 cursor-pointer border bg-[var(--bg-paper,#f3eee8)] shadow-2xs ${
                          isSelected
                            ? 'border-[var(--accent,#486175)] ring-1 ring-[var(--accent,#486175)]'
                            : 'border-[var(--line,#e2d0bc)] hover:border-[var(--accent,#486175)]/50'
                        }`}
                        onClick={() => {
                          setSelectedFont(font);
                          injectFontFaceRule(font);
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-[11.5px] font-bold text-[var(--text-serif,#1a232d)] truncate">{font.name}</span>
                            <span
                              className={`px-1 py-0 rounded text-[8.5px] font-semibold shrink-0 leading-tight ${
                                font.type === 'builtin'
                                  ? 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                                  : font.type === 'uploaded'
                                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                  : font.type === 'web'
                                  ? 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              {font.type === 'builtin'
                                ? '内置'
                                : font.type === 'uploaded'
                                ? '上传'
                                : font.type === 'web'
                                ? '网络'
                                : '系统'}
                            </span>
                          </div>

                          {font.type === 'uploaded' || font.type === 'web' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomFont(font.id, font.name);
                              }}
                              className="p-0.5 text-zinc-400 hover:text-red-500 transition-colors"
                              title="删除此字体"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          ) : null}
                        </div>

                        {/* 字体微缩预览条 */}
                        <div
                          style={{ fontFamily: font.family }}
                          className="mt-1 py-0.5 px-1.5 rounded bg-[var(--bg-page,#ffffff)]/80 dark:bg-zinc-900 text-[10.5px] text-[var(--text-serif,#1a232d)] truncate leading-tight border border-[var(--line-soft,rgba(0,0,0,0.05))]"
                        >
                          酒馆工作台 · {font.name} 1234 AaBb
                        </div>

                        {/* 底部精简操作条 */}
                        <div className="mt-1 flex items-center justify-between pt-0.5 border-t border-[var(--line-soft,rgba(0,0,0,0.06))]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFont(font);
                              injectFontFaceRule(font);
                            }}
                            className="text-[10.5px] text-[var(--dim,#647382)] hover:text-[var(--accent,#486175)] flex items-center gap-0.5 leading-none"
                          >
                            <Eye className="w-2.5 h-2.5" />
                            <span>试样</span>
                          </button>
                          <button
                            type="button"
                            data-design-id={`font-apply-btn-${font.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openApplyModal(font);
                            }}
                            className="h-4.5 px-1.5 py-0 rounded bg-[var(--btn-primary-bg,rgba(96,126,149,0.15))] hover:bg-[var(--btn-primary-hover,rgba(96,126,149,0.25))] text-[var(--accent,#486175)] text-[10.5px] font-bold inline-flex items-center justify-center gap-0.5 transition-all cursor-pointer leading-none min-h-0 shrink-0"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>应用到...</span>
                          </button>
                        </div>
                      </BaseCard>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== 应用字体到指定层级弹窗 ===================== */}
      {isApplyModalOpen && fontToApply && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-page,#ffffff)] dark:bg-zinc-900 rounded-xl shadow-2xl border border-[var(--line,#e2d0bc)] overflow-hidden">
            <div className="p-3.5 border-b border-[var(--line-soft,rgba(0,0,0,0.08))] flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-serif,#1a232d)]">
                  应用字体：「{fontToApply.name}」
                </h3>
                <p className="text-[10px] text-[var(--dim,#647382)] mt-0.5">请勾选需要生效的具体界面与层级：</p>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 space-y-2 max-h-80 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.key} className="space-y-1">
                  <div className="text-[11px] font-bold text-[var(--accent,#486175)] px-1">
                    {cat.label}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {cat.zones.map((zone) => {
                      const isChecked = selectedZonesForApply[zone.key];
                      return (
                        <label
                          key={zone.key}
                          className={`flex items-start gap-1.5 p-1.5 rounded border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'border-[var(--accent,#486175)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))]'
                              : 'border-[var(--line-soft,rgba(0,0,0,0.06))] hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelectedZonesForApply({
                                ...selectedZonesForApply,
                                [zone.key]: e.target.checked,
                              })
                            }
                            className="mt-0.5 accent-[var(--accent,#486175)] w-3.5 h-3.5 rounded cursor-pointer"
                          />
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-[var(--text-serif,#1a232d)] truncate">{zone.label}</div>
                            <div className="text-[9.5px] text-[var(--dim,#647382)] truncate">{zone.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 flex items-center justify-between text-[11px] border-t border-[var(--line-soft,rgba(0,0,0,0.06))]">
                <button
                  type="button"
                  onClick={() => {
                    const allTrue: Record<FontZoneKey, boolean> = {} as any;
                    FONT_ZONES.forEach((z) => {
                      allTrue[z.key] = true;
                    });
                    setSelectedZonesForApply(allTrue);
                  }}
                  className="text-[var(--accent,#486175)] hover:underline cursor-pointer font-medium"
                >
                  全部勾选
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allFalse: Record<FontZoneKey, boolean> = {} as any;
                    FONT_ZONES.forEach((z) => {
                      allFalse[z.key] = false;
                    });
                    setSelectedZonesForApply(allFalse);
                  }}
                  className="text-zinc-400 hover:underline cursor-pointer"
                >
                  全部取消
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-t border-[var(--line-soft,rgba(0,0,0,0.08))] flex items-center justify-end gap-2">
              <button
                type="button"
                data-design-id="cancel-apply-modal-btn"
                onClick={() => setIsApplyModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-medium text-[var(--dim,#647382)] hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer h-7 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                data-design-id="confirm-apply-modal-btn"
                onClick={handleConfirmApply}
                className="px-3.5 py-1.5 rounded text-xs font-bold bg-[var(--accent,#486175)] hover:bg-[var(--accent,#486175)]/90 text-white shadow-xs cursor-pointer h-7 transition-colors inline-flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>确认并立即生效</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 添加网络字体弹窗 ===================== */}
      {isWebFontModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-page,#ffffff)] dark:bg-zinc-900 rounded-xl shadow-2xl border border-[var(--line,#e2d0bc)] overflow-hidden">
            <div className="p-3.5 border-b border-[var(--line-soft,rgba(0,0,0,0.08))] flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-serif,#1a232d)]">导入网络 WebFont 样式</h3>
                <p className="text-[10px] text-[var(--dim,#647382)] mt-0.5">支持 ZeoSeven / Google Fonts / 自建 CDN CSS 链接</p>
              </div>
              <button
                type="button"
                onClick={() => setIsWebFontModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 space-y-2.5 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[var(--text-serif,#1a232d)] flex items-center gap-1">
                    <Wand2 className="w-3 h-3 text-[var(--accent,#486175)]" />
                    <span>一键智能粘贴区 (可直接粘贴整段 CSS 或 URL)</span>
                  </label>
                  {isAutoParsing && <span className="text-[10px] text-[var(--accent,#486175)] animate-pulse">正在解析...</span>}
                </div>
                <textarea
                  value={webFontInput}
                  onChange={(e) => handleSmartParseInput(e.target.value)}
                  placeholder={'支持直接粘贴：\n@import url("https://fontsapi.zeoseven.com/2385/main/result.css");\n或直接粘贴 CSS 直链'}
                  rows={2}
                  className="w-full p-2 text-xs font-mono rounded border border-[var(--line,#e2d0bc)] bg-[var(--bg-paper,#fbfaf8)] focus:outline-none focus:border-[var(--accent,#486175)]"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 border-t border-[var(--line-soft,rgba(0,0,0,0.06))]">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-semibold text-[var(--text-serif,#1a232d)]">字体显示名称</label>
                  <BaseInput
                    designId="webfont-name-input"
                    value={webFontName}
                    onChange={(e) => setWebFontName(e.target.value)}
                    placeholder="例如：扇尾兜黑 16 / 寒蝉活宋体"
                    className="text-xs py-1 px-2.5 h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[11px] font-semibold text-[var(--text-serif,#1a232d)]">CSS 样式表直链 (URL)</label>
                  <BaseInput
                    designId="webfont-url-input"
                    value={webFontUrl}
                    onChange={(e) => {
                      setWebFontUrl(e.target.value);
                      handleSmartParseInput(e.target.value);
                    }}
                    placeholder="例如：https://fontsapi.zeoseven.com/2385/main/result.css"
                    className="text-xs font-mono py-1 px-2.5 h-7.5"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-[var(--text-serif,#1a232d)]">
                      字体族名称 (font-family)
                    </label>
                    <span className="text-[10px] text-zinc-400 font-normal">选填（自动解析）</span>
                  </div>
                  <BaseInput
                    designId="webfont-family-input"
                    value={webFontFamily}
                    onChange={(e) => setWebFontFamily(e.target.value)}
                    placeholder='例如："ShanWeiZhouHei 16" (留空将自动提取)'
                    className="text-xs font-mono py-1 px-2.5 h-7.5"
                  />
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-t border-[var(--line-soft,rgba(0,0,0,0.08))] flex items-center justify-end gap-1.5">
              <BaseButton
                designId="cancel-webfont-btn"
                onClick={() => setIsWebFontModalOpen(false)}
                className="px-3 py-1 rounded text-xs font-medium text-[var(--dim,#647382)] hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer h-7"
              >
                取消
              </BaseButton>
              <BaseButton
                designId="save-webfont-btn"
                onClick={handleAddWebFont}
                className="px-3 py-1 rounded text-xs font-bold bg-[var(--accent,#486175)] text-white shadow hover:opacity-90 cursor-pointer h-7"
              >
                导入并添加
              </BaseButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
