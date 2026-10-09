import React, { useState, useEffect, useRef } from 'react';
import { BaseButton } from './BaseButton';
import { X, Sliders, LogOut, Check, Sparkles, Trash2, Info, Eye, MousePointer2, Crosshair, ChevronDown, Palette, Layers, Box, Type, Sparkle, RotateCcw, GripVertical, GripHorizontal, Maximize2, Minimize2 } from 'lucide-react';

const PRESET_GRADIENTS = [
  { name: '雅韵素绢', value: 'linear-gradient(135deg, #fdfbf7 0%, #f4ede4 100%)' },
  { name: '暖阳日落', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { name: '青黛淡雅', value: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' },
  { name: '樱落微雨', value: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' },
  { name: '紫晶幻境', value: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' },
  { name: '赛博深邃', value: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)' },
  { name: '暗夜星河', value: 'linear-gradient(135deg, #090d16 0%, #171d2d 50%, #221a36 100%)' },
  { name: '碧海幽澜', value: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #0369a1 100%)' },
  { name: '极光翡翠', value: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)' },
];

const PRESET_BLURS = [
  { name: '无毛玻璃', value: 'none' },
  { name: '微柔 (8px)', value: 'blur(8px)' },
  { name: '标准 (16px)', value: 'blur(16px)' },
  { name: '高通透 (20px)', value: 'blur(20px) saturate(180%)' },
  { name: '重度深邃 (32px)', value: 'blur(32px)' },
];

const PRESET_RADIUS = [
  { name: '直角 0px', value: '0px' },
  { name: '微圆 6px', value: '6px' },
  { name: '标准 12px', value: '12px' },
  { name: '柔润 20px', value: '20px' },
  { name: '大圆角 28px', value: '28px' },
  { name: '胶囊 9999px', value: '9999px' },
];

const PRESET_SHADOWS = [
  { name: '无阴影', value: 'none' },
  { name: '轻柔浅浮', value: '0 2px 8px rgba(0,0,0,0.06)' },
  { name: '立体卡片', value: '0 8px 24px rgba(0,0,0,0.12)' },
  { name: '深度沉浸', value: '0 20px 40px rgba(0,0,0,0.22)' },
  { name: '主题光晕', value: '0 0 20px var(--accent, rgba(96,126,149,0.35))' },
];

const COMMON_INSPECT_TARGETS = [
  { id: 'app-header', label: '顶部主导航栏 (Header)' },
  { id: 'app-sidebar', label: '全局侧边栏 (Sidebar)' },
  { id: 'card-detail-dialog-box', label: '角色卡详情主弹窗 (Detail Box)' },
  { id: 'card-detail-header', label: '角色卡详情顶部头部 (Header)' },
  { id: 'card-detail-tabbar', label: '角色卡详情标签导航 (Tabs)' },
  { id: 'st-cards-upload-box', label: '角色卡上传拖放区域 (Upload Area)' },
  { id: 'st-cards-search-toolbar', label: '角色卡搜索与过滤工具栏' },
  { id: 'settings-modal-panel', label: '设置中心弹窗面板' },
  { id: 'theme-customizer-panel', label: '主题样式定制面板' },
];

export function InspectWorkspace({ appData, updateAppData, isInspectMode, setIsInspectMode }: any) {
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'inspect' | 'navigate'>('inspect');
  const [activeTab, setActiveTab] = useState<'bg' | 'border' | 'effects' | 'text' | 'raw'>('bg');
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

  // Draggable Floating Inspector Bar State
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const isDraggingBarRef = useRef(false);
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resizable Mobile Drawer State (min 1/3 viewport height)
  const [mobileHeight, setMobileHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.round(Math.max(window.innerHeight * 0.35, 240));
    }
    return 260;
  });
  const isResizingDrawerRef = useRef(false);

  // Listen for window resize to maintain min 1/3 viewport height constraint
  useEffect(() => {
    const handleResize = () => {
      const minH = Math.round(Math.max(window.innerHeight * 0.333, 200));
      setMobileHeight((prev) => Math.max(minH, prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Mouse/Touch Move & End Listeners for Draggable Bar & Resizable Drawer
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      // 1. Dragging the floating bar
      if (isDraggingBarRef.current && barRef.current) {
        const barW = barRef.current.offsetWidth || 320;
        const barH = barRef.current.offsetHeight || 60;
        const newX = Math.max(8, Math.min(window.innerWidth - barW - 8, clientX - dragStartOffsetRef.current.x));
        const newY = Math.max(8, Math.min(window.innerHeight - barH - 8, clientY - dragStartOffsetRef.current.y));
        setFloatingPos({ x: newX, y: newY });
      }

      // 2. Resizing the mobile drawer
      if (isResizingDrawerRef.current) {
        const newHeight = window.innerHeight - clientY;
        const minH = Math.round(Math.max(window.innerHeight * 0.333, 200));
        const maxH = Math.round(window.innerHeight * 0.90);
        setMobileHeight(Math.max(minH, Math.min(maxH, newHeight)));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingBarRef.current || isResizingDrawerRef.current) {
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if ((isDraggingBarRef.current || isResizingDrawerRef.current) && e.touches[0]) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      isDraggingBarRef.current = false;
      isResizingDrawerRef.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, []);

  // Floating Bar Drag Handlers
  const startBarDrag = (clientX: number, clientY: number) => {
    if (!barRef.current) return;
    isDraggingBarRef.current = true;
    document.body.style.userSelect = 'none';
    const rect = barRef.current.getBoundingClientRect();
    dragStartOffsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleBarMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicked on header/grip/background, not on inputs or buttons
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, label')) return;
    startBarDrag(e.clientX, e.clientY);
  };

  const handleBarTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, label')) return;
    if (e.touches[0]) {
      startBarDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Drawer Resize Handlers
  const startDrawerResize = (clientY: number) => {
    isResizingDrawerRef.current = true;
    document.body.style.userSelect = 'none';
  };

  // Global ESC key to exit inspect mode or close active element panel
  useEffect(() => {
    if (!isInspectMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDesignId) {
          setActiveDesignId(null);
        } else {
          setIsInspectMode?.(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInspectMode, activeDesignId, setIsInspectMode]);

  // Global click listener to intercept clicks on [data-design-id]
  useEffect(() => {
    if (!isInspectMode) {
      setActiveDesignId(null);
      return;
    }

    const handleClick = (e: MouseEvent) => {
      // In navigate mode, allow user to freely click, navigate, open modals, switch tabs
      if (interactionMode === 'navigate') return;

      let target = e.target as HTMLElement;
      let foundDesignId = null;

      // Don't intercept clicks inside the inspector controls themselves
      if (target.closest('.inspect-floating-bar') || target.closest('.inspect-side-panel')) {
        return;
      }

      while (target && target !== document.body) {
        const id = target.getAttribute('data-design-id');
        if (id) {
          foundDesignId = id;
          break;
        }
        target = target.parentElement as HTMLElement;
      }

      if (foundDesignId) {
        e.preventDefault();
        e.stopPropagation();
        setActiveDesignId(foundDesignId);
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (interactionMode === 'navigate') {
        const hoverStyle = document.getElementById('inspect-hover-style');
        if (hoverStyle) hoverStyle.innerHTML = '';
        return;
      }

      const target = e.target as HTMLElement;
      if (target.closest('.inspect-floating-bar') || target.closest('.inspect-side-panel')) {
        return;
      }

      let foundDesignId = null;
      let curr = target;
      while (curr && curr !== document.body) {
        if (curr.getAttribute('data-design-id')) {
          foundDesignId = curr.getAttribute('data-design-id');
          break;
        }
        curr = curr.parentElement as HTMLElement;
      }
      
      const hoverStyle = document.getElementById('inspect-hover-style');
      if (hoverStyle) {
        if (foundDesignId) {
          hoverStyle.innerHTML = `[data-design-id="${foundDesignId}"] { outline: 2px dashed #D97706 !important; outline-offset: 2px !important; cursor: crosshair !important; }`;
        } else {
          hoverStyle.innerHTML = '';
        }
      }
    };

    document.addEventListener('click', handleClick, true); // Use capture phase
    document.addEventListener('mouseover', handleMouseOver, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mouseover', handleMouseOver, true);
      const hoverStyle = document.getElementById('inspect-hover-style');
      if (hoverStyle) hoverStyle.innerHTML = '';
    };
  }, [isInspectMode, interactionMode]);

  useEffect(() => {
    if (isInspectMode && !document.getElementById('inspect-hover-style')) {
      const style = document.createElement('style');
      style.id = 'inspect-hover-style';
      document.head.appendChild(style);
    }
  }, [isInspectMode]);

  if (!isInspectMode) return null;

  const currentOverrides = activeDesignId ? (appData?.customOverrides?.[activeDesignId] || {}) : {};
  const totalOverriddenCount = Object.keys(appData?.customOverrides || {}).length;

  const handleUpdateStyle = (key: string, value: string) => {
    if (!activeDesignId) return;
    const newOverrides = { ...(appData?.customOverrides || {}) };
    if (!newOverrides[activeDesignId]) newOverrides[activeDesignId] = {};
    
    if (value !== undefined && value !== '') {
      newOverrides[activeDesignId][key] = value;
    } else {
      delete newOverrides[activeDesignId][key];
    }
    
    updateAppData({ ...appData, customOverrides: newOverrides });
  };

  return (
    <>
      {/* 1. Top Draggable Floating Inspector Control Bar - Freely Moveable on Mobile & Desktop */}
      <div
        ref={barRef}
        onMouseDown={handleBarMouseDown}
        onTouchStart={handleBarTouchStart}
        style={
          floatingPos
            ? {
                top: `${floatingPos.y}px`,
                left: `${floatingPos.x}px`,
                transform: 'none',
              }
            : undefined
        }
        className={`inspect-floating-bar fixed ${
          floatingPos ? '' : 'top-2 sm:top-3 left-1/2 -translate-x-1/2'
        } z-[9990] bg-[var(--card-bg,rgba(255,255,255,0.96))] text-[var(--text-serif,#1a232d)] dark:bg-zinc-900/98 dark:text-zinc-100 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2.5 w-[96vw] sm:w-auto max-w-full sm:max-w-[95vw] transition-shadow cursor-grab active:cursor-grabbing select-none`}
      >
        {/* Upper Row on Mobile / Left Info on Desktop */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 shrink-0">
          {/* Drag Handle Indicator */}
          <div
            className="p-1 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 cursor-grab active:cursor-grabbing flex items-center justify-center shrink-0 touch-none"
            title="按住拖拽可将精调控制条移动至任意位置"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-amber-500"></span>
            </span>
            
            <div className="flex items-center gap-1">
              <span className="text-[11px] sm:text-xs font-bold text-[var(--accent,#d97706)] whitespace-nowrap">
                局部精调
              </span>
              {totalOverriddenCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap">
                  已改 {totalOverriddenCount} 处
                </span>
              )}
            </div>
          </div>

          {/* Quick Target Dropdown & Reset Position */}
          <div className="relative shrink-0 flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTargetDropdown(!showTargetDropdown);
              }}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-medium rounded-lg border border-[var(--line,#e2d0bc)] dark:border-zinc-700 bg-white/60 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800 text-[var(--text-serif,#1a232d)] dark:text-zinc-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">快捷部件</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
            </button>

            {floatingPos && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFloatingPos(null);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="重置浮条到顶部居中"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
              </button>
            )}

            {/* Exit Button on Mobile Header */}
            <BaseButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDesignId(null);
                setIsInspectMode?.(false);
              }}
              className="sm:hidden px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer border-none shrink-0 whitespace-nowrap"
              title="退出精调模式 (ESC)"
            >
              <LogOut className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">退出</span>
            </BaseButton>

            {showTargetDropdown && (
              <div className="absolute top-full mt-1.5 right-0 w-64 max-h-64 overflow-y-auto bg-[var(--card-bg,#ffffff)] text-[var(--text-serif,#1a232d)] dark:bg-zinc-900 dark:text-zinc-100 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-xl shadow-2xl p-1.5 z-[9999] space-y-1">
                <div className="text-[10px] font-bold text-[var(--dim,#647382)] px-2 py-1 whitespace-nowrap">常用核心部件直达：</div>
                {COMMON_INSPECT_TARGETS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveDesignId(t.id);
                      setShowTargetDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-lg text-[11px] transition-colors flex items-center justify-between cursor-pointer whitespace-nowrap ${
                      activeDesignId === t.id
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text,#1a232d)] dark:text-zinc-200'
                    }`}
                  >
                    <span className="truncate whitespace-nowrap">{t.label}</span>
                    {appData?.customOverrides?.[t.id] && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls: Mode Switcher & Exit Button */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border border-[var(--line-soft,rgba(0,0,0,0.08))] dark:border-white/10 flex-1 sm:flex-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInteractionMode('inspect');
              }}
              className={`flex-1 sm:flex-none px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                interactionMode === 'inspect'
                  ? 'bg-[var(--accent,#d97706)] text-white shadow-xs'
                  : 'text-[var(--dim,#647382)] hover:text-[var(--text,#1a232d)]'
              }`}
              title="点击页面上任何部件直接开启精调"
            >
              <Crosshair className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">🎯 拾取部件</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInteractionMode('navigate');
              }}
              className={`flex-1 sm:flex-none px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                interactionMode === 'navigate'
                  ? 'bg-[var(--accent,#d97706)] text-white shadow-xs'
                  : 'text-[var(--dim,#647382)] hover:text-[var(--text,#1a232d)]'
              }`}
              title="自由点击浏览各页面或打开弹窗，再切回拾取模式"
            >
              <MousePointer2 className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">🖱️ 自由浏览</span>
            </button>
          </div>

          {/* Exit Button on Desktop */}
          <BaseButton
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveDesignId(null);
              setIsInspectMode?.(false);
            }}
            className="hidden sm:flex px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm items-center gap-1.5 cursor-pointer border-none shrink-0 whitespace-nowrap"
            title="退出精调模式 (快捷键: ESC)"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">退出精调 (ESC)</span>
          </BaseButton>
        </div>
      </div>

      {/* 2. Inspector Drawer - Resizable on Mobile (Min 1/3 viewport height), Desktop is full height sidebar */}
      {activeDesignId && (
        <div
          style={
            typeof window !== 'undefined' && window.innerWidth < 640
              ? { height: `${mobileHeight}px`, maxHeight: '90vh' }
              : undefined
          }
          className="inspect-side-panel fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-0 sm:left-auto sm:right-0 sm:w-88 md:sm:w-96 sm:h-screen sm:border-t-0 sm:border-l border-t border-[var(--line,#e2d0bc)] dark:border-zinc-800 bg-[var(--card-bg,rgba(255,255,255,0.98))] text-[var(--text-serif,#1a232d)] dark:bg-zinc-900/98 dark:text-zinc-100 backdrop-blur-xl shadow-2xl z-[9999] transition-all overflow-hidden flex flex-col rounded-t-2xl sm:rounded-none animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
        >
          {/* Mobile Top Drag Handle Bar for Free Height Resizing */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              startDrawerResize(e.clientY);
            }}
            onTouchStart={(e) => {
              if (e.touches[0]) {
                startDrawerResize(e.touches[0].clientY);
              }
            }}
            className="w-full py-2 flex flex-col items-center justify-center cursor-ns-resize touch-none select-none sm:hidden shrink-0 hover:bg-black/5 dark:hover:bg-white/5 active:bg-amber-500/10 transition-colors"
            title="按住上下拖拽可随意调整抽屉高度"
          >
            <div className="w-10 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 active:bg-amber-500 transition-colors" />
            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium select-none pointer-events-none">
              上下拖拽调整高度 (至少占 1/3 屏)
            </span>
          </div>

          {/* Drawer Header */}
          <div className="px-3 py-1.5 sm:p-3.5 border-b border-[var(--line,#e2d0bc)] dark:border-zinc-800 bg-[var(--card-bg,#ffffff)]/90 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-serif,#1a232d)] dark:text-zinc-100 whitespace-nowrap shrink-0">
                  精调部件
                </h3>
                <span className="font-mono text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 truncate max-w-[110px] sm:max-w-[160px]">
                  {activeDesignId}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* Mobile Quick Height Presets */}
              <div className="flex sm:hidden items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-md border border-[var(--line-soft,rgba(0,0,0,0.06))] dark:border-white/10 mr-1">
                <button
                  type="button"
                  onClick={() => setMobileHeight(Math.round(window.innerHeight * 0.35))}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer whitespace-nowrap"
                  title="设为1/3高度"
                >
                  1/3
                </button>
                <button
                  type="button"
                  onClick={() => setMobileHeight(Math.round(window.innerHeight * 0.55))}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer whitespace-nowrap"
                  title="设为半屏高度"
                >
                  1/2
                </button>
                <button
                  type="button"
                  onClick={() => setMobileHeight(Math.round(window.innerHeight * 0.85))}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer whitespace-nowrap"
                  title="设为大屏高度"
                >
                  大屏
                </button>
              </div>

              <span role="button" onClick={() => setActiveDesignId(null)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4 shrink-0" /></span>
            </div>
          </div>

          {/* Category Tabs Bar - Horizontal Scroll on Narrow Screens, No Wrapping */}
          <div className="flex items-center gap-1 border-b border-[var(--line,#e2d0bc)] dark:border-zinc-800 px-2 py-1 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'bg', label: '背景/渐变', icon: Palette },
              { id: 'border', label: '边框/圆角', icon: Box },
              { id: 'effects', label: '毛玻璃/阴影', icon: Sparkles },
              { id: 'text', label: '文字排版', icon: Type },
              { id: 'raw', label: '自定义CSS', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-1 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'text-[var(--dim,#647382)] hover:text-[var(--text,#1a232d)]'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Content Body */}
          <div className="p-2.5 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto text-xs">
            {/* TAB: Background & Gradients */}
            {activeTab === 'bg' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Background Color */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    背景纯色 (backgroundColor)
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={currentOverrides.backgroundColor?.startsWith('#') ? currentOverrides.backgroundColor : '#ffffff'}
                      onChange={(e) => handleUpdateStyle('backgroundColor', e.target.value)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-md cursor-pointer border border-zinc-300 dark:border-zinc-700 p-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={currentOverrides.backgroundColor || ''}
                      onChange={(e) => handleUpdateStyle('backgroundColor', e.target.value)}
                      placeholder="如 #ffffff 或 rgba(255,255,255,0.8)"
                      className="flex-1 text-[11px] sm:text-xs bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg px-2 py-1 font-mono"
                    />
                  </div>
                </div>

                {/* Preset Gradients */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    🌅 预设高级渐变背景 (点击应用)
                  </label>
                  <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                    {PRESET_GRADIENTS.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUpdateStyle('backgroundImage', g.value)}
                        className="h-8 sm:h-10 rounded-md border border-black/10 dark:border-white/10 p-0.5 sm:p-1 flex flex-col justify-end text-left shadow-2xs hover:scale-102 transition-transform cursor-pointer overflow-hidden relative shrink-0"
                        style={{ background: g.value }}
                      >
                        <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-black/60 text-white backdrop-blur-xs truncate max-w-full whitespace-nowrap">
                          {g.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Gradient / Image */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    自定义渐变 / 背景 (backgroundImage)
                  </label>
                  <input
                    type="text"
                    value={currentOverrides.backgroundImage || ''}
                    onChange={(e) => handleUpdateStyle('backgroundImage', e.target.value)}
                    placeholder="linear-gradient(...) 或 url(...)"
                    className="w-full text-[11px] sm:text-xs bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg px-2 py-1 font-mono"
                  />
                  {currentOverrides.backgroundImage && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStyle('backgroundImage', '')}
                      className="text-[10px] text-rose-500 hover:underline mt-0.5 cursor-pointer whitespace-nowrap"
                    >
                      移除渐变背景
                    </button>
                  )}
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1">
                    <span className="whitespace-nowrap">透明度 (opacity)</span>
                    <span className="font-mono text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {Math.round((parseFloat(currentOverrides.opacity || '1') || 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={currentOverrides.opacity || '1'}
                    onChange={(e) => handleUpdateStyle('opacity', e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: Border & Corner Radius */}
            {activeTab === 'border' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Border Color & Width */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    边框颜色 (borderColor)
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={currentOverrides.borderColor?.startsWith('#') ? currentOverrides.borderColor : '#d4d4d8'}
                      onChange={(e) => handleUpdateStyle('borderColor', e.target.value)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-md cursor-pointer border border-zinc-300 dark:border-zinc-700 p-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={currentOverrides.borderColor || ''}
                      onChange={(e) => handleUpdateStyle('borderColor', e.target.value)}
                      placeholder="如 #d4d4d8 或 rgba(0,0,0,0.1)"
                      className="flex-1 text-[11px] sm:text-xs bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg px-2 py-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    边框粗细 (borderWidth)
                  </label>
                  <input
                    type="text"
                    value={currentOverrides.borderWidth || ''}
                    onChange={(e) => handleUpdateStyle('borderWidth', e.target.value)}
                    placeholder="如 1px, 2px, 0px"
                    className="w-full text-[11px] sm:text-xs bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg px-2 py-1 font-mono"
                  />
                </div>

                {/* Preset Radius */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    🔲 圆角预设 (borderRadius)
                  </label>
                  <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                    {PRESET_RADIUS.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUpdateStyle('borderRadius', r.value)}
                        className={`py-1 px-1.5 rounded-lg border text-center text-[10px] sm:text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                          currentOverrides.borderRadius === r.value
                            ? 'bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                            : 'border-[var(--line,#e2d0bc)] dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text,#1a232d)] dark:text-zinc-200'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    自定义圆角 (borderRadius)
                  </label>
                  <input
                    type="text"
                    value={currentOverrides.borderRadius || ''}
                    onChange={(e) => handleUpdateStyle('borderRadius', e.target.value)}
                    placeholder="如 12px 或 1rem"
                    className="w-full text-[11px] sm:text-xs bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg px-2 py-1 font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB: Glass Blur & Shadow Effects */}
            {activeTab === 'effects' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Backdrop Filter Blur */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    ✨ 毛玻璃通透效果 (backdropFilter)
                  </label>
                  <div className="space-y-1">
                    {PRESET_BLURS.map((b, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUpdateStyle('backdropFilter', b.value)}
                        className={`w-full py-1 px-2 rounded-lg border text-left text-[10px] sm:text-[11px] transition-colors flex items-center justify-between cursor-pointer whitespace-nowrap ${
                          currentOverrides.backdropFilter === b.value
                            ? 'bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                            : 'border-[var(--line,#e2d0bc)] dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text,#1a232d)] dark:text-zinc-200'
                        }`}
                      >
                        <span>{b.name}</span>
                        <code className="text-[9px] opacity-70 font-mono">{b.value}</code>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Box Shadows */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    🌑 阴影与立体感 (boxShadow)
                  </label>
                  <div className="space-y-1">
                    {PRESET_SHADOWS.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUpdateStyle('boxShadow', s.value)}
                        className={`w-full py-1 px-2 rounded-lg border text-left text-[10px] sm:text-[11px] transition-colors flex items-center justify-between cursor-pointer whitespace-nowrap ${
                          currentOverrides.boxShadow === s.value
                            ? 'bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200 font-bold'
                            : 'border-[var(--line,#e2d0bc)] dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text,#1a232d)] dark:text-zinc-200'
                        }`}
                      >
                        <span>{s.name}</span>
                        <code className="text-[9px] opacity-70 font-mono truncate max-w-[120px]">{s.value}</code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Typography */}
            {activeTab === 'text' && (
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    文字颜色 (color)
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={currentOverrides.color?.startsWith('#') ? currentOverrides.color : '#000000'}
                      onChange={(e) => handleUpdateStyle('color', e.target.value)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-md cursor-pointer border border-zinc-300 dark:border-zinc-700 p-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={currentOverrides.color || ''}
                      onChange={(e) => handleUpdateStyle('color', e.target.value)}
                      placeholder="如 #1a232d 或 var(--accent)"
                      className="flex-1 text-[11px] sm:text-xs bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg px-2 py-1 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    字号大小 (fontSize)
                  </label>
                  <input
                    type="text"
                    value={currentOverrides.fontSize || ''}
                    onChange={(e) => handleUpdateStyle('fontSize', e.target.value)}
                    placeholder="如 12px, 14px, 1.1rem"
                    className="w-full text-[11px] sm:text-xs bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg px-2 py-1 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-[var(--text-serif,#1a232d)] dark:text-zinc-200 mb-1 whitespace-nowrap">
                    字重粗细 (fontWeight)
                  </label>
                  <input
                    type="text"
                    value={currentOverrides.fontWeight || ''}
                    onChange={(e) => handleUpdateStyle('fontWeight', e.target.value)}
                    placeholder="如 normal, 500, bold, 700"
                    className="w-full text-[11px] sm:text-xs bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg px-2 py-1 font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB: Raw Custom CSS */}
            {activeTab === 'raw' && (
              <div className="space-y-2 sm:space-y-3">
                <div className="text-[11px] sm:text-xs text-[var(--dim,#647382)]">
                  直接为该部件编写任意 CSS 声明 (分号隔开)：
                </div>
                <textarea
                  rows={4}
                  value={currentOverrides.customCss || ''}
                  onChange={(e) => handleUpdateStyle('customCss', e.target.value)}
                  placeholder={`filter: contrast(1.1);\ntransform: translateY(-2px);\nletter-spacing: 0.5px;`}
                  className="w-full text-[11px] sm:text-xs font-mono bg-black/5 dark:bg-white/5 border border-[var(--line,#e2d0bc)] dark:border-zinc-700 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Action Bar at Bottom of Drawer */}
          <div className="p-2 sm:p-3.5 border-t border-[var(--line,#e2d0bc)] dark:border-zinc-800 bg-[var(--card-bg,#ffffff)]/90 dark:bg-zinc-900/90 flex flex-row gap-2 shrink-0">
            <BaseButton
              variant="danger"
              size="sm"
              className="flex-1 py-1 sm:py-1.5 text-[10px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => {
                const newOverrides = { ...(appData?.customOverrides || {}) };
                delete newOverrides[activeDesignId];
                updateAppData({ ...appData, customOverrides: newOverrides });
                setActiveDesignId(null);
              }}
            >
              <Trash2 className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">重置此部件</span>
            </BaseButton>

            <BaseButton
              variant="outline"
              size="sm"
              className="flex-1 py-1 sm:py-1.5 text-[10px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              onClick={() => setActiveDesignId(null)}
            >
              <Check className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">完成设定</span>
            </BaseButton>
          </div>

        </div>
      )}
    </>
  );
}
