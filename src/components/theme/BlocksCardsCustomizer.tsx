import React from 'react';
import { CustomThemePalette } from '../../utils/themeCustomizer';
import { ColorPickerInput } from './ColorPickerInput';
import { CustomSelect } from '../ui/CustomSelect';
import { Layers } from 'lucide-react';

interface BlocksCardsCustomizerProps {
  draft: Partial<CustomThemePalette>;
  onChange: (keyOrUpdates: keyof CustomThemePalette | Partial<CustomThemePalette>, value?: any) => void;
}

export const BlocksCardsCustomizer: React.FC<BlocksCardsCustomizerProps> = ({
  draft,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Cards Config */}
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-500" />
          卡片与组件样式 (Cards & Blocks)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorPickerInput
            label="基础卡片底色 (Card Bg)"
            value={draft.cardBg}
            defaultValue="#FFFFFF"
            placeholder="#FFFFFF"
            onChange={(val: any) => onChange('cardBg', val)}
            description="最外层卡片背景色"
          />
          <ColorPickerInput
            label="嵌套层/小模块底色 (Inner Bg)"
            value={draft.cardInnerBg}
            defaultValue="rgba(96, 126, 149, 0.05)"
            placeholder="rgba(0,0,0,0.02)"
            onChange={(val: any) => onChange('cardInnerBg', val)}
            description="卡片内层的小模块/背景条"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ColorPickerInput
            label="卡片边框色 (Border Color)"
            value={draft.cardBorder}
            defaultValue="rgba(96, 126, 149, 0.18)"
            placeholder="rgba(0,0,0,0.1)"
            onChange={(val: any) => onChange('cardBorder', val)}
            description="卡片外围分割轮廓"
          />
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">卡片边框位置</label>
            <CustomSelect
  value={draft.cardBorderSides || 'all'}
  onChange={(val: any) => onChange('cardBorderSides', val)}
  className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/50"
  options={[
    {value: 'all', label: '四周全部 (All)'},
    {value: 'top', label: '仅顶部 (Top)'},
    {value: 'bottom', label: '仅底部 (Bottom)'},
    {value: 'left', label: '仅左侧 (Left)'},
    {value: 'none', label: '无边框 (None)'}
  ]}
/>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">卡片边框粗细</label>
            <CustomSelect
  value={draft.cardBorderWidth || '1px'}
  onChange={(val: any) => onChange('cardBorderWidth', val)}
  className="w-full text-xs p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/50"
  options={[
    {value: '1px', label: '极细 (1px)'},
    {value: '2px', label: '常规 (2px)'},
    {value: '4px', label: '加粗 (4px)'}
  ]}
/>
          </div>
        </div>
      </div>

      {/* Modal / Dialog Config */}
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-rose-500" />
          弹窗与浮层样式 (Modals)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ColorPickerInput
            label="弹窗底色 (Modal Bg)"
            value={draft.modalBg}
            defaultValue="#FFFFFF"
            placeholder="#FFFFFF"
            onChange={(val: any) => onChange('modalBg', val)}
            description="详情弹窗/下拉菜单背景"
          />
          <ColorPickerInput
            label="弹窗边框色 (Border Color)"
            value={draft.modalBorder}
            defaultValue="rgba(96, 126, 149, 0.2)"
            placeholder="rgba(0,0,0,0.15)"
            onChange={(val: any) => onChange('modalBorder', val)}
            description="浮层外围线条"
          />
          <ColorPickerInput
            label="全局分割线条 (Line)"
            value={draft.line}
            defaultValue="rgba(96, 126, 149, 0.18)"
            placeholder="rgba(0,0,0,0.15)"
            onChange={(val: any) => onChange('line', val)}
            description="列表、区块间的基础分割线"
          />
        </div>
      </div>
    </div>
  );
};
