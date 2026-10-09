import React from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { X, Sun, Moon, Check, Palette, Sliders, Sparkles } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export interface ThemeOption {
  id: string;
  name: string;
  tag: string;
  desc: string;
  dotColor: string;
}

export const FLAT_THEMES: ThemeOption[] = [
  {
    id: 'wulan',
    name: '雾蓝银灰',
    tag: '宋式 · 雾蓝银灰',
    desc: '宋式清淡 · 雾蓝雅韵',
    dotColor: '#607E95',
  },
  {
    id: 'jinsha',
    name: '墨红金砂',
    tag: '宋式 · 墨红金砂',
    desc: '宋式朱砂 · 金砂淡赭',
    dotColor: '#8C2F2D',
  },
  {
    id: 'shilu',
    name: '槐黄石绿',
    tag: '宋式 · 槐黄石绿',
    desc: '庭院草木 · 槐黄浅青',
    dotColor: '#6C7F4F',
  },
  {
    id: 'chayan',
    name: '茶烟米褐',
    tag: '宋式 · 茶烟米褐',
    desc: '素朴茶韵 · 宣纸暖米',
    dotColor: '#7E6554',
  },
  {
    id: 'bamboo',
    name: '青瓦竹影',
    tag: '宋式 · 青瓦竹影',
    desc: '宋式米白 · 幽碧粉青',
    dotColor: '#4A6460',
  },
  {
    id: 'songci',
    name: '宋瓷青绿',
    tag: '宋式 · 宋瓷青绿',
    desc: '青翠如瓷 · 幽兰温润',
    dotColor: '#2E6A67',
  },
  {
    id: 'yanzhi',
    name: '胭脂暖灰',
    tag: '宋式 · 胭脂暖灰',
    desc: '淡雅胭脂 · 暮云暖灰',
    dotColor: '#A45668',
  },
  {
    id: 'yuebai',
    name: '月白青鸾',
    tag: '国风 · 月白青鸾',
    desc: '逍遥青鸾 · 月白澄澈',
    dotColor: '#5F829A',
  },
  {
    id: 'jilan',
    name: '霁蓝天青',
    tag: '天青 · 霁蓝水影',
    desc: '雨过天晴 · 霁蓝波影',
    dotColor: '#527A9C',
  },
  {
    id: 'qianhe',
    name: '浅荷淡翠',
    tag: '春水 · 浅荷淡翠',
    desc: '春水初生 · 荷叶浅碧',
    dotColor: '#5E896E',
  },
  {
    id: 'yunfen',
    name: '浅水云粉',
    tag: '柔雾 · 浅水云粉',
    desc: '水色淡青 · 暮云柔粉',
    dotColor: '#8A729A',
  },
];

interface ThemeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  uiStyle: 'glass' | 'flat' | 'line-brown' | 'line-green';
  setUiStyle: (s: 'glass' | 'flat' | 'line-brown' | 'line-green') => void;
  flatTheme: string;
  setFlatTheme: (t: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSettingsTheme?: () => void;
}

export const ThemeDrawer: React.FC<ThemeDrawerProps> = ({
  isOpen,
  onClose,
  theme,
  setTheme,
  uiStyle,
  setUiStyle,
  flatTheme,
  setFlatTheme,
  showToast,
  onOpenSettingsTheme,
}) => {
  if (!isOpen) return null;

  const currentThemeObj = FLAT_THEMES.find((t: any) => t.id === flatTheme) || FLAT_THEMES[0];

  const handleSelectFlatTheme = (id: string, name: string, tag: string) => {
    setUiStyle('flat');
    setFlatTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    document.body.setAttribute('data-theme', id);
    try {
      localStorage.setItem('tavern_vault_flat_theme', id);
    } catch (e: any) {}
    showToast?.(`已应用灵感色调：${tag}`, 'success');
  };

  const handleSwitchToFlat = () => {
    setUiStyle('flat');
    // 扁平风格使用宋式宣纸质感，不需要暗黑模式
    setTheme('light');
    document.documentElement.setAttribute('data-theme', flatTheme);
    document.body.setAttribute('data-theme', flatTheme);
    showToast?.(`已切换至扁平风格（${currentThemeObj.name}）`, 'info');
  };

  const handleSwitchToGlass = () => {
    setUiStyle('glass');
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    showToast?.('已切换至毛玻璃质感风格', 'info');
  };

  const toggleDarkLight = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    showToast?.(next === 'dark' ? '已开启暗黑模式' : '已开启明亮模式', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-transparent modal-backdrop transition-opacity animate-in fade-in duration-200" role="dialog" aria-modal="true">
      {/* 点击遮罩区域关闭 */}
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer" 
        onClick={onClose}
        aria-label="关闭色彩界面"
      />

      {/* 抽屉/弹窗面板 主体 (匹配第二张图 1:1) */}
      <div 
        className="modal-panel modal-card theme-drawer-panel theme-gradient-panel relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#1a1a1c] shadow-2xl p-5 sm:p-6 pb-7 z-10 animate-in slide-in-from-bottom duration-250"
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800 pb-3.5 mb-5">
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            选择灵感色调
          </h3>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* 基础模式切换 (毛玻璃 / 扁平风格) */}
        <div className="mb-5 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              外观风格
            </span>
            {uiStyle === 'glass' && (
              <BaseButton
                type="button"
                onClick={toggleDarkLight}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>暗黑模式</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>明亮模式</span>
                  </>
                )}
              </BaseButton>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BaseButton
              type="button"
              onClick={handleSwitchToGlass}
              className={`py-2.5 px-3 rounded-lg text-center transition-all border-b ${
                uiStyle === 'glass'
                  ? 'border-b border-zinc-700 dark:border-b-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                  : 'border-b-zinc-200 dark:border-b-zinc-800 bg-transparent hover:bg-black/5 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold">毛玻璃风格</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">通透微光 · 支持暗黑</div>
            </BaseButton>
            <BaseButton
              type="button"
              onClick={handleSwitchToFlat}
              className={`py-2.5 px-3 rounded-lg text-center transition-all border-b ${
                uiStyle === 'flat'
                  ? 'border-b border-[var(--accent)] bg-[var(--btn-primary-bg)] text-[var(--accent)] font-bold shadow-xs'
                  : 'border-b-zinc-200 dark:border-b-zinc-800 bg-transparent hover:bg-black/5 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold">扁平风格</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">宋式雅致 · 11款灵感色调</div>
            </BaseButton>
          </div>
        </div>

        {/* 11 款灵感色调 - 2列双栏美化 (完全对照第二张图 1:1) */}
        {uiStyle === 'flat' && (
          <div>
            <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              灵感色调列表
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {FLAT_THEMES.map((item: any) => {
                const isActive = flatTheme === item.id;
                return (
                  <BaseButton
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectFlatTheme(item.id, item.name, item.tag)}
                    className={`py-2.5 px-3 text-left flex items-center gap-3 transition-all duration-150 rounded-xs ${
                      isActive
                        ? 'bg-[#e2ebe6] dark:bg-zinc-800/80 border-b font-bold'
                        : 'bg-transparent border-b border-zinc-200/70 dark:border-zinc-800 hover:bg-black/5'
                    }`}
                    style={{
                      borderBottomColor: isActive ? item.dotColor : undefined,
                      backgroundColor: isActive ? `${item.dotColor}18` : undefined,
                    }}
                  >
                    {/* 圆形纯色调图标 */}
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10 shadow-2xs"
                      style={{ backgroundColor: item.dotColor }}
                    />

                    {/* 名称与副标题 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] sm:text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </BaseButton>
                );
              })}
            </div>
          </div>
        )}
        {/* 前往设置 · 主题样式选择 进行全面调色与美化自定修改 */}
        <div className="mt-5 pt-4 border-t border-zinc-200/70 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            需要精细调色、背景/按键定制或 AI 美化？
          </div>
          <BaseButton
            type="button"
            onClick={() => {
              onClose();
              if (onOpenSettingsTheme) {
                onOpenSettingsTheme();
              }
            }}
            className="px-3.5 py-2 text-xs font-bold bg-[var(--btn-primary-bg,rgba(217,119,6,0.1))] hover:bg-[var(--btn-primary-hover,rgba(217,119,6,0.2))] text-[var(--accent,#D97706)] border border-[var(--accent,#D97706)]/30 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>进入主题样式选择</span>
          </BaseButton>
        </div>
      </div>
    </div>
  );
};
