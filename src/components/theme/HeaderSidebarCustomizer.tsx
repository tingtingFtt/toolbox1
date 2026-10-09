import React from 'react';
import { CustomThemePalette } from '../../utils/themeCustomizer';
import { ColorPickerInput } from './ColorPickerInput';
import { CustomSelect } from '../ui/CustomSelect';
import { Layout } from 'lucide-react';

interface HeaderSidebarCustomizerProps {
  draft: Partial<CustomThemePalette>;
  onChange: (keyOrUpdates: keyof CustomThemePalette | Partial<CustomThemePalette>, value?: any) => void;
}

export const HeaderSidebarCustomizer: React.FC<HeaderSidebarCustomizerProps> = ({
  draft,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      {/* 顶栏配置 (Header) */}
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <Layout className="w-3.5 h-3.5 text-amber-500" />
          顶栏专属配色 (Header & Top Navigation)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorPickerInput
            label="顶栏背景色 (Header Bg)"
            value={draft.headerBg}
            defaultValue="#FFFFFF"
            placeholder="rgba(255, 255, 255, 0.85)"
            onChange={(val: any) => onChange('headerBg', val)}
            description="支持半透明 RGBA"
          />
          <ColorPickerInput
            label="顶栏文字与图标色 (Text)"
            value={draft.headerText}
            defaultValue="#2B3540"
            onChange={(val: any) => onChange('headerText', val)}
            description="标题与导航文字"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ColorPickerInput
            label="顶栏下边框色 (Border Color)"
            value={draft.headerBorder}
            defaultValue="rgba(96, 126, 149, 0.18)"
            placeholder="rgba(0, 0, 0, 0.08)"
            onChange={(val: any) => onChange('headerBorder', val)}
            description="底部分割线颜色"
          />
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">顶栏边框位置</label>
            <CustomSelect
  value={draft.headerBorderSides || 'bottom'}
  onChange={(val: any) => onChange('headerBorderSides', val)}
  className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50"
  options={[
    {value: 'bottom', label: '仅底部 (Bottom)'},
    {value: 'all', label: '四周全部 (All)'},
    {value: 'none', label: '无边框 (None)'}
  ]}
/>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">顶栏边框粗细</label>
            <CustomSelect
  value={draft.headerBorderWidth || '1px'}
  onChange={(val: any) => onChange('headerBorderWidth', val)}
  className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/50"
  options={[
    {value: '1px', label: '极细 (1px)'},
    {value: '2px', label: '常规 (2px)'},
    {value: '4px', label: '加粗 (4px)'}
  ]}
/>
          </div>
        </div>
      </div>

      {/* 侧边栏配置 (Sidebar) */}
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <Layout className="w-3.5 h-3.5 text-indigo-500" />
          侧边栏配色 (Sidebar)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorPickerInput
            label="侧边栏背景色 (Sidebar Bg)"
            value={draft.sidebarBg}
            defaultValue="#FDF7F0"
            placeholder="#FDF7F0"
            onChange={(val: any) => onChange('sidebarBg', val)}
            description="侧边菜单背景底色"
          />
          <ColorPickerInput
            label="侧边栏文字与菜单项 (Text)"
            value={draft.sidebarText}
            defaultValue="#2B3540"
            onChange={(val: any) => onChange('sidebarText', val)}
            description="菜单项文本"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ColorPickerInput
            label="侧边栏分割边框色 (Border Color)"
            value={draft.sidebarBorder}
            defaultValue="rgba(96, 126, 149, 0.18)"
            placeholder="rgba(0, 0, 0, 0.08)"
            onChange={(val: any) => onChange('sidebarBorder', val)}
            description="右侧边界线条"
          />
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">侧边栏边框位置</label>
            <CustomSelect
  value={draft.sidebarBorderSides || 'right'}
  onChange={(val: any) => onChange('sidebarBorderSides', val)}
  className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
  options={[
    {value: 'right', label: '仅右侧 (Right)'},
    {value: 'all', label: '四周全部 (All)'},
    {value: 'none', label: '无边框 (None)'}
  ]}
/>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">侧边栏边框粗细</label>
            <CustomSelect
  value={draft.sidebarBorderWidth || '1px'}
  onChange={(val: any) => onChange('sidebarBorderWidth', val)}
  className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
  options={[
    {value: '1px', label: '极细 (1px)'},
    {value: '2px', label: '常规 (2px)'},
    {value: '4px', label: '加粗 (4px)'}
  ]}
/>
          </div>
        </div>
      </div>
    </div>
  );
};
