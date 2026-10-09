import React, { useState } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { BaseCard } from '../ui/BaseCard';
import {
  Search,
  Plus,
  Trash2,
  Filter,
  Sparkles,
  Menu,
  Layout,
  Check,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Settings,
  X,
  FileText,
  Tag,
  Star,
  ChevronDown,
  ChevronUp,
  Layers,
  Sliders,
  Maximize2,
  HelpCircle,
  Eye,
  Info,
  ExternalLink,
} from 'lucide-react';
import { CustomThemePalette } from '../../utils/themeCustomizer';

interface LiveThemePreviewProps {
  draft: Partial<CustomThemePalette>;
}

export const LiveThemePreview: React.FC<LiveThemePreviewProps> = ({ draft }) => {
  const hexToRgbaStr = (hex: string, alpha: number) => {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    const rRaw = parseInt(c.slice(0, 2), 16); const r = isNaN(rRaw) ? 217 : rRaw;
    const gRaw = parseInt(c.slice(2, 4), 16); const g = isNaN(gRaw) ? 119 : gRaw;
    const bRaw = parseInt(c.slice(4, 6), 16); const b = isNaN(bRaw) ? 6 : bRaw;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const baseAccent = draft.accent || "#D97706";

  const getInlineBorder = (color?: string, width?: string, sides?: string, defaultSide?: string): React.CSSProperties => {
    if (!color) return {};
    const w = width || "1px";
    const s = sides || defaultSide || "all";
    const style: React.CSSProperties = { borderStyle: "solid", borderColor: color };
    if (s === "none") {
      style.borderWidth = 0;
    } else if (s === "all") {
      style.borderWidth = w;
    } else {
      style.borderWidth = 0;
      if (s === "top") style.borderTopWidth = w;
      if (s === "bottom") style.borderBottomWidth = w;
      if (s === "left") style.borderLeftWidth = w;
      if (s === "right") style.borderRightWidth = w;
    }
    return style;
  };

  const bgType =
    draft.bgType || (draft.bgImage ? 'image' : draft.bgGradient ? 'gradient' : 'solid');

  // Preview interactive states
  const [activePreviewView, setActivePreviewView] = useState<'overview' | 'modal' | 'typography'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDropdownOption, setSelectedDropdownOption] = useState('全部角色卡 (默认分类)');
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);
  const [isDangerHovered, setIsDangerHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputValue, setInputValue] = useState('实时测试输入内容...');
  
  // State for hover styles on inner components
  const [hoveredOptionIndex, setHoveredOptionIndex] = useState<number | null>(null);
  const [isModalCancelHovered, setIsModalCancelHovered] = useState(false);
  const [isModalConfirmHovered, setIsModalConfirmHovered] = useState(false);
  const [isModalTriggerHovered, setIsModalTriggerHovered] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Background style computation for the mini preview container
  const getContainerBgStyle = (): React.CSSProperties => {
    if (bgType === 'image' && draft.bgImage) {
      return {
        backgroundImage: `url("${draft.bgImage}")`,
        backgroundPosition: 'center',
        backgroundRepeat: draft.bgImageFit === 'tile' ? 'repeat' : 'no-repeat',
        backgroundSize: draft.bgImageFit === 'tile' ? 'auto' : draft.bgImageFit || 'cover',
        backgroundColor: draft.bgPaper || '#FAF8F5',
      };
    }
    if (bgType === 'gradient' && draft.bgGradient) {
      return {
        backgroundImage: draft.bgGradient,
        backgroundColor: 'transparent',
      };
    }
    return {
      backgroundColor: draft.bgPaper || '#FAF8F5',
      backgroundImage: 'none',
    };
  };

  const dropdownOptions = [
    { label: '全部角色卡 (默认分类)', tag: 'ST Card' },
    { label: '世界书与条目预设 (Lorebook)', tag: 'Lore' },
    { label: '酒馆主题与UI扩展 (Themes)', tag: 'Ext' },
    { label: '自定义CSS美化包 (Styling)', tag: 'CSS' },
  ];

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden space-y-0">
      {/* Top Banner: Mini Window Header & View Mode Switcher */}
      <div className="px-3.5 py-2 bg-zinc-100/90 dark:bg-zinc-800/90 border-b border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-2">
          {/* macOS style dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center items-start gap-1.5">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-amber-500" />
              全景多模块调色效果对比展台 (包含全部配件与类名)
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 w-fit">
              {bgType === 'gradient' ? '渐变背景' : bgType === 'image' ? '壁纸背景' : '纯色纸张'}
            </span>
          </div>
        </div>

        {/* View Switchers for Deep Dive Testing */}
        <div className="flex items-center gap-1">
          <BaseButton
            type="button"
            onClick={() => setActivePreviewView('overview')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              activePreviewView === 'overview'
                ? 'shadow-2xs font-bold'
                : 'bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
            }`}
            style={activePreviewView === 'overview' ? { backgroundColor: draft.accent || '#D97706', color: '#FFFFFF' } : {}}
          >
            综合全景
          </BaseButton>
          <BaseButton
            type="button"
            onClick={() => {
              setActivePreviewView('modal');
              setIsModalOpen(true);
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activePreviewView === 'modal' || isModalOpen
                ? 'shadow-2xs font-bold'
                : 'bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
            }`}
            style={activePreviewView === 'modal' || isModalOpen ? { backgroundColor: draft.accent || '#D97706', color: '#FFFFFF' } : {}}
          >
            <span>弹窗&下拉</span>
          </BaseButton>
          <BaseButton
            type="button"
            onClick={() => setActivePreviewView('typography')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              activePreviewView === 'typography'
                ? 'shadow-2xs font-bold'
                : 'bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
            }`}
            style={activePreviewView === 'typography' ? { backgroundColor: draft.accent || '#D97706', color: '#FFFFFF' } : {}}
          >
            文字&线条排版
          </BaseButton>
        </div>
      </div>

      {/* Main Simulated App Window Container */}
      <div className="p-2 sm:p-3 bg-zinc-200/40 dark:bg-zinc-950/40">
        <div
          className="rounded-xl border shadow-md overflow-hidden relative transition-all duration-200 min-h-[380px] flex flex-col"
          style={{
            ...getContainerBgStyle(),
            borderColor: draft.line || hexToRgbaStr(baseAccent, 0.2),
            color: draft.text || '#291F18',
          }}
        >
          {/* Background image opacity overlay mask */}
          {bgType === 'image' && draft.bgImage && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity"
              style={{
                backgroundColor: draft.bgPaper || '#FAF8F5',
                opacity: 1 - (draft.bgImageOpacity !== undefined ? draft.bgImageOpacity : 0.85),
                backdropFilter: draft.bgImageBlur ? `blur(${draft.bgImageBlur}px)` : 'none',
              }}
            />
          )}

          {/* 1. Simulated App Header (.app-header) */}
          <div
            className="px-3 py-2 border-b flex items-center justify-between gap-2 relative z-10 transition-colors"
            style={{
              backgroundColor: draft.headerBg || 'rgba(255, 253, 245, 0.92)',
              ...getInlineBorder(draft.headerBorder || draft.line || "rgba(217, 119, 6, 0.18)", draft.headerBorderWidth, draft.headerBorderSides, "bottom"),
              color: draft.headerText || draft.text || '#291F18',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <BaseButton 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 -ml-1 transition-colors flex items-center justify-center cursor-pointer hover:opacity-70"
                title="Toggle Sidebar"
                style={{ backgroundColor: 'transparent', color: draft.headerText || draft.text || '#291F18' }}
              >
                <Menu className="w-4 h-4" />
              </BaseButton>
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: draft.accent || '#D97706' }}
              >
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="text-xs font-bold font-serif truncate"
                  style={{
                    color: draft.headerText || draft.text || '#291F18',
                    fontFamily: 'serif',
                  }}
                >
                  酒馆资产管理库
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 text-zinc-500 opacity-80 hidden sm:inline">
                  header.app-header
                </span>
              </div>
            </div>

            {/* Interactive Header Tools */}
            <div className="flex items-center gap-1.5">
              {/* Simulated Search Input with Focus State (.input-bg) */}
              <div
                className="px-2 py-0.5 rounded-lg text-[10px] flex items-center gap-1.5 border transition-all"
                style={{
                  backgroundColor: draft.inputBg || 'rgba(255, 255, 255, 0.95)',
                  borderColor: isInputFocused
                    ? draft.inputFocus || draft.lineFocus || draft.accent || '#D97706'
                    : draft.inputBorder || hexToRgbaStr(baseAccent, 0.22),
                  boxShadow: isInputFocused
                    ? `0 0 0 2px ${draft.lineFocus || hexToRgbaStr(baseAccent, 0.3)}`
                    : 'none',
                  color: draft.inputText || draft.text || '#291F18',
                }}
              >
                <Search className="w-2.5 h-2.5 opacity-60" />
                <BaseInput
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  className="bg-transparent border-none outline-none text-[10px] w-24 sm:w-32 truncate"
                  style={{ color: draft.inputText || draft.text || '#291F18' }}
                  placeholder="搜索角色卡..."
                />
                <span className="text-[8px] font-mono opacity-50 hidden md:inline">.input-bg</span>
              </div>

              {/* Quick Trigger for Modal */}
              <BaseButton
                type="button"
                onMouseEnter={() => setIsModalTriggerHovered(true)}
                onMouseLeave={() => setIsModalTriggerHovered(false)}
                onClick={() => setIsModalOpen(true)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-medium border flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                style={{
                  backgroundColor: isModalTriggerHovered
                    ? draft.btnSecondaryHover || hexToRgbaStr(baseAccent, 0.16)
                    : draft.btnSecondaryBg || hexToRgbaStr(baseAccent, 0.08),
                  borderColor: draft.btnSecondaryBorder || draft.line || hexToRgbaStr(baseAccent, 0.25),
                  color: draft.btnSecondaryText || draft.text || '#291F18',
                }}
                title="打开弹窗演示"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                <span>演示弹窗</span>
              </BaseButton>
            </div>
          </div>

          {/* 2. Workspace Body: Sidebar + Main Stage */}
          <div className="flex-1 flex min-h-0 relative z-10">
            {/* Simulated Sidebar (aside.sidebar) */}
            {isSidebarOpen && (
            <div
              className="w-28 sm:w-36 border-r p-2 space-y-1.5 shrink-0 flex flex-col justify-between transition-colors"
              style={{
                backgroundColor: draft.sidebarBg || 'rgba(255, 253, 245, 0.85)',
                ...getInlineBorder(draft.sidebarBorder || draft.line || "rgba(217, 119, 6, 0.15)", draft.sidebarBorderWidth, draft.sidebarBorderSides, "right"),
                color: draft.sidebarText || draft.text || '#291F18',
              }}
            >
              <div className="space-y-1">
                <div className="text-[9px] font-mono text-zinc-400 px-1">aside.sidebar</div>

                {/* Active Sidebar Item */}
                <div
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between transition-all shadow-2xs"
                  style={{
                    backgroundColor: draft.accent || '#D97706',
                    color: draft.btnPrimaryText || '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Star className="w-3 h-3" />
                    <span className="truncate">角色卡库</span>
                  </div>
                  <span className="text-[8px] px-1 rounded-full bg-white/20">12</span>
                </div>

                {/* Normal Sidebar Item */}
                <div
                  className="px-2 py-1 rounded-lg text-[11px] font-medium flex items-center justify-between opacity-80 hover:opacity-100 transition-all cursor-pointer"
                  style={{ color: draft.sidebarText || draft.text || '#291F18' }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3 h-3 opacity-70" />
                    <span className="truncate">世界书设定</span>
                  </div>
                </div>

                {/* Third Sidebar Item */}
                <div
                  className="px-2 py-1 rounded-lg text-[11px] font-medium flex items-center justify-between opacity-80 hover:opacity-100 transition-all cursor-pointer"
                  style={{ color: draft.sidebarText || draft.text || '#291F18' }}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Tag className="w-3 h-3 opacity-70" />
                    <span className="truncate">主题样式</span>
                  </div>
                </div>
              </div>

              {/* Sidebar Bottom Status */}
              <div
                className="p-1.5 rounded-lg border text-[9px] space-y-0.5"
                style={{
                  backgroundColor: draft.cardInnerBg || hexToRgbaStr(baseAccent, 0.05),
                  borderColor: draft.line || hexToRgbaStr(baseAccent, 0.15),
                  color: draft.dim || '#786558',
                }}
              >
                <div className="font-semibold flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: draft.ok || '#16A34A' }}
                  />
                  <span>系统状态正常</span>
                </div>
                <div className="text-[8px] font-mono opacity-70">--card-inner-bg</div>
              </div>
            </div>
            )}
            {/* Main Stage Area */}
            <div className="flex-1 p-2 sm:p-3 space-y-2.5 overflow-y-auto">
              {/* VIEW 1: OVERVIEW (Comprehensive cards, nested containers, dropdown, buttons, lines) */}
              {activePreviewView === 'overview' && (
                <div className="space-y-2.5">
                  {/* Main Card Container (.card-bg) */}
                  <div
                    className="p-3 sm:p-3.5 rounded-xl border space-y-2.5 shadow-xs transition-colors"
                    style={{
                      backgroundColor: draft.cardBg || '#FFFFFF',
                      ...getInlineBorder(draft.cardBorder || draft.line || "rgba(217, 119, 6, 0.16)", draft.cardBorderWidth, draft.cardBorderSides, "all"),
                    }}
                  >
                    {/* Card Header (.card-header) */}
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="text-xs font-bold font-serif truncate"
                          style={{
                            color: draft.textSerif || draft.text || '#291F18',
                          }}
                        >
                          卡片与组件样式展示 (Card Block)
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 text-zinc-500">
                          .card-bg
                        </span>
                      </div>

                      {/* Badge Tag (.badge-bg) */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-md font-bold transition-colors shadow-2xs"
                          style={{
                            backgroundColor: draft.badgeBg || hexToRgbaStr(baseAccent, 0.12),
                            color: draft.badgeText || draft.accent || '#B45309',
                          }}
                        >
                          标签 · .badge-bg
                        </span>
                      </div>
                    </div>

                    {/* Interactive Dropdown Select Menu (.custom-select-trigger & .custom-select-menu) */}
                    <div className="relative">
                      <div className="flex items-center justify-between gap-1 text-[10px] pb-1">
                        <span className="font-semibold" style={{ color: draft.text || '#291F18' }}>
                          分类下拉菜单 (Dropdown Select):
                        </span>
                        <span className="text-[8px] font-mono text-zinc-400">
                          .custom-select-menu
                        </span>
                      </div>

                      <BaseButton
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between shadow-2xs transition-all cursor-pointer"
                        style={{
                          backgroundColor: draft.inputBg || 'rgba(255, 255, 255, 0.95)',
                          borderColor: isDropdownOpen
                            ? draft.lineFocus || draft.accent || '#D97706'
                            : draft.inputBorder || draft.line || hexToRgbaStr(baseAccent, 0.22),
                          color: draft.inputText || draft.text || '#291F18',
                        }}
                      >
                        <span className="font-medium truncate">{selectedDropdownOption}</span>
                        {isDropdownOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        )}
                      </BaseButton>

                      {/* Expanded Dropdown Options Floating Layer */}
                      {isDropdownOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg z-30 p-1 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150"
                          style={{
                            backgroundColor: draft.modalBg || draft.cardBg || '#FFFFFF',
                            ...getInlineBorder(draft.modalBorder || draft.line || "rgba(217, 119, 6, 0.25)", draft.modalBorderWidth, draft.modalBorderSides, "all"),
                          }}
                        >
                          <div className="px-2 py-1 text-[9px] font-mono text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 flex justify-between">
                            <span>选项列表</span>
                            <span>.select-option</span>
                          </div>
                          {dropdownOptions.map((opt, i) => {
                            const isSelected = selectedDropdownOption === opt.label;
                            const isHovered = hoveredOptionIndex === i;
                            return (
                              <div
                                key={i}
                                onMouseEnter={() => setHoveredOptionIndex(i)}
                                onMouseLeave={() => setHoveredOptionIndex(null)}
                                onClick={() => {
                                  setSelectedDropdownOption(opt.label);
                                  setIsDropdownOpen(false);
                                }}
                                className={`px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected ? 'font-bold' : 'font-normal opacity-85 hover:opacity-100'
                                }`}
                                style={{
                                  backgroundColor: isSelected
                                    ? draft.badgeBg || draft.faint || hexToRgbaStr(baseAccent, 0.12)
                                    : isHovered 
                                      ? draft.cardInnerBg || hexToRgbaStr(baseAccent, 0.05)
                                      : 'transparent',
                                  color: isSelected
                                    ? draft.accent || '#D97706'
                                    : draft.text || '#291F18',
                                }}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {isSelected && <Check className="w-3 h-3 text-amber-500 shrink-0" />}
                                  <span className="truncate">{opt.label}</span>
                                </div>
                                <span
                                  className="text-[9px] px-1 rounded font-mono"
                                  style={{
                                    backgroundColor: draft.cardInnerBg || 'rgba(0,0,0,0.04)',
                                    color: draft.dim || '#786558',
                                  }}
                                >
                                  {opt.tag}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Nested Container: Outer (.card-bg) -> Inner (.card-inner-bg) -> Deep Sub-box */}
                    <div
                      className="p-2.5 rounded-lg text-[11px] leading-relaxed transition-colors border space-y-1.5"
                      style={{
                        backgroundColor: draft.cardInnerBg || hexToRgbaStr(baseAccent, 0.05),
                        borderColor: draft.line || hexToRgbaStr(baseAccent, 0.12),
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" style={{ color: draft.text || '#291F18' }}>
                          多层级嵌套与透明度对比 (Nested Container Structure)
                        </span>
                        <span className="text-[8px] font-mono text-zinc-400">.card-inner-bg</span>
                      </div>

                      <p className="text-[10px]" style={{ color: draft.dim || '#786558' }}>
                        支持外层卡片与内层模块的透明度叠加渲染，保证多重底板层次分明。
                      </p>

                      {/* Deep Nested Sub-Box for Multi-layer Depth Verification */}
                      <div
                        className="p-2 rounded-md border text-[10px] flex items-center justify-between gap-2"
                        style={{
                          backgroundColor: draft.cardBg || '#FFFFFF',
                          borderColor: draft.lineSoft || hexToRgbaStr(baseAccent, 0.1),
                          color: draft.text || '#291F18',
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: draft.accent || '#D97706' }}
                          />
                          <span className="truncate font-medium">
                            内嵌深层子项展示 (Sub-item Depth)
                          </span>
                        </div>
                        <span className="text-[8px] font-mono opacity-60">--line-soft</span>
                      </div>
                    </div>

                    {/* Dividers & Lines Demonstration */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between text-[9px] text-zinc-400">
                        <span>标准分割线 (--line):</span>
                        <span className="font-mono">.border-line</span>
                      </div>
                      <div
                        className="h-px w-full"
                        style={{ backgroundColor: draft.line || hexToRgbaStr(baseAccent, 0.18) }}
                      />

                      <div className="flex items-center justify-between text-[9px] text-zinc-400">
                        <span>弱化分割线 (--line-soft):</span>
                        <span className="font-mono">.border-line-soft</span>
                      </div>
                      <div
                        className="h-px w-full"
                        style={{ backgroundColor: draft.lineSoft || hexToRgbaStr(baseAccent, 0.08) }}
                      />
                    </div>

                    {/* Status Highlights Row (Warn / Error / Ok / Focus) */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium border"
                        style={{
                          backgroundColor: hexToRgbaStr(baseAccent, 0.1),
                          borderColor: draft.warn || '#D97706',
                          color: draft.warn || '#D97706',
                        }}
                      >
                        预警: --warn
                      </span>

                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium border"
                        style={{
                          backgroundColor: 'rgba(220, 38, 38, 0.1)',
                          borderColor: draft.err || '#DC2626',
                          color: draft.err || '#DC2626',
                        }}
                      >
                        错误: --err
                      </span>

                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium border"
                        style={{
                          backgroundColor: 'rgba(22, 163, 74, 0.1)',
                          borderColor: draft.ok || '#16A34A',
                          color: draft.ok || '#16A34A',
                        }}
                      >
                        成功: --ok
                      </span>

                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium border"
                        style={{
                          borderColor: draft.lineFocus || hexToRgbaStr(baseAccent, 0.5),
                          color: draft.text || '#291F18',
                        }}
                      >
                        高光轮廓: --line-focus
                      </span>
                    </div>

                    {/* Action Buttons Row with Hover & Interactive Testing */}
                    <div className="flex items-center justify-between pt-1.5 flex-wrap gap-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Primary Button */}
                        <BaseButton
                          type="button"
                          onMouseEnter={() => setIsPrimaryHovered(true)}
                          onMouseLeave={() => setIsPrimaryHovered(false)}
                          className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          style={{
                            backgroundColor: isPrimaryHovered
                              ? draft.btnPrimaryHover || draft.accentHover || '#B45309'
                              : draft.btnPrimaryBg || draft.accent || '#D97706',
                            color: draft.btnPrimaryText || '#FFFFFF',
                            borderColor: draft.btnPrimaryBorder || 'transparent',
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isPrimaryHovered ? '激活态' : '主要按钮'}</span>
                          <span className="text-[8px] font-mono opacity-80">.btn-primary</span>
                        </BaseButton>

                        {/* Secondary Button */}
                        <BaseButton
                          type="button"
                          onMouseEnter={() => setIsSecondaryHovered(true)}
                          onMouseLeave={() => setIsSecondaryHovered(false)}
                          className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium border flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          style={{
                            backgroundColor: isSecondaryHovered
                              ? draft.btnSecondaryHover || hexToRgbaStr(baseAccent, 0.16)
                              : draft.btnSecondaryBg || hexToRgbaStr(baseAccent, 0.08),
                            borderColor:
                              draft.btnSecondaryBorder || draft.line || hexToRgbaStr(baseAccent, 0.25),
                            color: draft.btnSecondaryText || draft.text || '#291F18',
                          }}
                        >
                          <Filter className="w-3 h-3" />
                          <span>次级按钮</span>
                          <span className="text-[8px] font-mono opacity-70">.btn-secondary</span>
                        </BaseButton>

                        {/* Disabled Button */}
                        <BaseButton
                          type="button"
                          disabled
                          className="px-2 py-1 rounded-lg text-xs font-medium opacity-50 cursor-not-allowed hidden sm:inline"
                          style={{
                            backgroundColor: draft.btnSecondaryBg || hexToRgbaStr(baseAccent, 0.08),
                            color: draft.dim || '#786558',
                          }}
                        >
                          禁用
                        </BaseButton>
                      </div>

                      {/* Danger Button */}
                      <BaseButton
                        type="button"
                        onMouseEnter={() => setIsDangerHovered(true)}
                        onMouseLeave={() => setIsDangerHovered(false)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        style={{
                          backgroundColor: isDangerHovered ? draft.btnDangerHover || '#B91C1C' : draft.btnDangerBg || '#DC2626',
                          color: draft.btnDangerText || '#FFFFFF',
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>删除</span>
                        <span className="text-[8px] font-mono opacity-80">.btn-danger</span>
                      </BaseButton>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: MODAL DIALOG & DROPDOWN VIEW (Deep Inspection) */}
              {(activePreviewView === 'modal' || isModalOpen) && (
                <div className="relative">
                  {/* Backdrop Overlay (.modal-backdrop) */}
                  <div
                    className="p-3 sm:p-4 rounded-xl border space-y-3 shadow-lg relative transition-all"
                    style={{
                      backgroundColor: draft.modalBg || '#FFFFFF',
                      ...getInlineBorder(draft.modalBorder || draft.line || "rgba(217, 119, 6, 0.25)", draft.modalBorderWidth, draft.modalBorderSides, "all"),
                    }}
                  >
                    {/* Modal Header (.modal-header) */}
                    <div
                      className="flex items-center justify-between pb-2 border-b"
                      style={{
                        borderColor: draft.line || hexToRgbaStr(baseAccent, 0.18),
                      }}
                    >
            <div className="flex items-center gap-2">
              <BaseButton 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Toggle Sidebar"
              >
                <Menu className="w-3.5 h-3.5" />
              </BaseButton>
                        <div
                          className="w-4 h-4 rounded-md flex items-center justify-center text-white text-[10px]"
                          style={{ backgroundColor: draft.accent || '#D97706' }}
                        >
                          !
                        </div>
                        <span
                          className="text-xs font-bold font-serif"
                          style={{
                            color: draft.textSerif || draft.text || '#291F18',
                            fontFamily: 'serif',
                          }}
                        >
                          角色卡高级属性编辑 (Modal Dialog)
                        </span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 text-zinc-500">
                          .modal-card
                        </span>
                      </div>

                      <span role="button" onClick={() => setIsModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
                    </div>

                    {/* Modal Body with Nested Box */}
                    <div className="space-y-2 text-xs">
                      <p style={{ color: draft.text || '#291F18' }}>
                        弹窗浮层底色通过 <code className="font-mono text-[10px]">--modal-bg</code> 与{' '}
                        <code className="font-mono text-[10px]">--modal-border</code> 进行专属定制。
                      </p>

                      <div
                        className="p-2.5 rounded-lg border space-y-1"
                        style={{
                          backgroundColor: draft.cardInnerBg || hexToRgbaStr(baseAccent, 0.05),
                          borderColor: draft.line || hexToRgbaStr(baseAccent, 0.12),
                        }}
                      >
                        <div className="text-[11px] font-bold" style={{ color: draft.text || '#291F18' }}>
                          弹窗内层嵌套块 (.modal-inner-card)
                        </div>
                        <p className="text-[10px]" style={{ color: draft.dim || '#786558' }}>
                          次要说明文字采用 --dim 色值，注脚与弱化说明采用 --faint 色值。
                        </p>
                      </div>
                    </div>

                    {/* Modal Footer Action Bar (.modal-footer) */}
                    <div
                      className="pt-2 border-t flex items-center justify-end gap-2"
                      style={{ borderColor: draft.line || hexToRgbaStr(baseAccent, 0.18) }}
                    >
                      <BaseButton
                        type="button"
                        onMouseEnter={() => setIsModalCancelHovered(true)}
                        onMouseLeave={() => setIsModalCancelHovered(false)}
                        onClick={() => setIsModalOpen(false)}
                        className="px-3 py-1 rounded-lg text-[10px] sm:text-xs font-medium border transition-all cursor-pointer"
                        style={{
                          backgroundColor: isModalCancelHovered
                            ? draft.btnSecondaryHover || hexToRgbaStr(baseAccent, 0.16)
                            : draft.btnSecondaryBg || hexToRgbaStr(baseAccent, 0.08),
                          borderColor: draft.btnSecondaryBorder || draft.line || hexToRgbaStr(baseAccent, 0.25),
                          color: draft.btnSecondaryText || draft.text || '#291F18',
                        }}
                      >
                        取消关闭
                      </BaseButton>

                      <BaseButton
                        type="button"
                        onMouseEnter={() => setIsModalConfirmHovered(true)}
                        onMouseLeave={() => setIsModalConfirmHovered(false)}
                        onClick={() => setIsModalOpen(false)}
                        className="px-3.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold text-white transition-all cursor-pointer shadow-xs border"
                        style={{
                          backgroundColor: isModalConfirmHovered
                            ? draft.btnPrimaryHover || draft.accentHover || '#B45309'
                            : draft.btnPrimaryBg || draft.accent || '#D97706',
                          color: draft.btnPrimaryText || '#FFFFFF',
                          borderColor: draft.btnPrimaryBorder || 'transparent',
                        }}
                      >
                        确认保存配置
                      </BaseButton>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 3: TYPOGRAPHY & LINES (All font hierarchy & lines) */}
              {activePreviewView === 'typography' && (
                <div
                  className="p-3 sm:p-4 rounded-xl border space-y-3 shadow-xs"
                  style={{
                    backgroundColor: draft.cardBg || '#FFFFFF',
                    ...getInlineBorder(draft.cardBorder || draft.line || "rgba(217, 119, 6, 0.16)", draft.cardBorderWidth, draft.cardBorderSides, "all"),
                  }}
                >
                  <div className="text-xs font-bold font-serif" style={{ color: draft.text || '#291F18' }}>
                    全套文字层级与线条对比 (Typography & Line Scale)
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Serif Display Title */}
                    <div className="p-2 rounded-lg border space-y-0.5" style={{ borderColor: draft.line || 'rgba(0,0,0,0.1)' }}>
                      <div className="text-[9px] font-mono text-zinc-400">标题宋体 (Serif Heading) · --text-serif</div>
                      <div className="text-sm font-bold font-serif" style={{ color: draft.textSerif || draft.text || '#291F18' }}>
                        天地玄黄 宇宙洪荒 · 酒馆典藏大标题
                      </div>
                    </div>

                    {/* Primary Body Text */}
                    <div className="p-2 rounded-lg border space-y-0.5" style={{ borderColor: draft.line || 'rgba(0,0,0,0.1)' }}>
                      <div className="text-[9px] font-mono text-zinc-400">正文主要文字 (Primary Body Text) · --text</div>
                      <div className="text-xs font-medium" style={{ color: draft.text || '#291F18' }}>
                        主要正文字符，用于角色卡名称、对话内容与主要属性标签。
                      </div>
                    </div>

                    {/* Dim Secondary Text */}
                    <div className="p-2 rounded-lg border space-y-0.5" style={{ borderColor: draft.line || 'rgba(0,0,0,0.1)' }}>
                      <div className="text-[9px] font-mono text-zinc-400">次级弱化文字 (Secondary Dim Text) · --dim</div>
                      <div className="text-xs" style={{ color: draft.dim || '#786558' }}>
                        辅助说明与次要标签，降低对比度以突出主要信息。
                      </div>
                    </div>

                    {/* Faint Footnote Text */}
                    <div className="p-2 rounded-lg border space-y-0.5" style={{ borderColor: draft.line || 'rgba(0,0,0,0.1)' }}>
                      <div className="text-[9px] font-mono text-zinc-400">极淡微光/注脚 (Faint / Footnote) · --faint</div>
                      <div className="text-[11px]" style={{ color: draft.faint || '#A89689' }}>
                        创建时间戳、版本号与占位提示符。
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
