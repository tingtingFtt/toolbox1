import React from 'react';
import { CustomThemePalette } from '../../utils/themeCustomizer';
import { ColorPickerInput } from './ColorPickerInput';
import {
  MousePointerClick,
  TextCursorInput,
  AlertTriangle,
  Tag,
} from 'lucide-react';

interface ButtonsInputsCustomizerProps {
  draft: Partial<CustomThemePalette>;
  onChange: (keyOrUpdates: keyof CustomThemePalette | Partial<CustomThemePalette>, value?: any) => void;
}

export const ButtonsInputsCustomizer: React.FC<ButtonsInputsCustomizerProps> = ({
  draft,
  onChange,
}) => {
  return (
    <div className="space-y-3.5">
      {/* 1. 强调主按钮 (Primary Button) */}
      <div className="p-3 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />
          强调主按钮设置 (.btn-primary)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <ColorPickerInput
            label="主按钮底色 (Primary Bg)"
            value={draft.btnPrimaryBg}
            defaultValue="#E65100"
            onChange={(val) => onChange('btnPrimaryBg', val)}
            description="支持透明度"
          />
          <ColorPickerInput
            label="主按钮悬停色 (Hover Bg)"
            value={draft.btnPrimaryHover}
            defaultValue="#BF360C"
            onChange={(val) => onChange('btnPrimaryHover', val)}
            description="悬停激活色"
          />
          <ColorPickerInput
            label="主按钮文字色 (Text Color)"
            value={draft.btnPrimaryText}
            defaultValue="#FFFFFF"
            onChange={(val) => onChange('btnPrimaryText', val)}
            description="按钮文本与图标"
          />
          <ColorPickerInput
            label="主按钮边框色 (Border)"
            value={draft.btnPrimaryBorder}
            defaultValue="transparent"
            onChange={(val) => onChange('btnPrimaryBorder', val)}
            description="描边轮廓颜色"
          />
        </div>
      </div>

      {/* 2. 次级与普通按钮 (Secondary Buttons) */}
      <div className="p-3 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5 text-zinc-500" />
          次级与普通按钮设置 (.btn-secondary)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <ColorPickerInput
            label="次级按钮底色 (Secondary Bg)"
            value={draft.btnSecondaryBg}
            defaultValue="rgba(230, 81, 0, 0.08)"
            placeholder="rgba(0, 0, 0, 0.04)"
            onChange={(val) => onChange('btnSecondaryBg', val)}
            description="支持透明度"
          />
          <ColorPickerInput
            label="次级悬停底色 (Hover Bg)"
            value={draft.btnSecondaryHover}
            defaultValue="rgba(230, 81, 0, 0.16)"
            placeholder="rgba(0, 0, 0, 0.08)"
            onChange={(val) => onChange('btnSecondaryHover', val)}
            description="悬停高亮底色"
          />
          <ColorPickerInput
            label="次级按钮边框色 (Border)"
            value={draft.btnSecondaryBorder}
            defaultValue="rgba(230, 81, 0, 0.25)"
            placeholder="rgba(0, 0, 0, 0.15)"
            onChange={(val) => onChange('btnSecondaryBorder', val)}
            description="边框线条颜色"
          />
          <ColorPickerInput
            label="次级按钮文字色 (Text Color)"
            value={draft.btnSecondaryText}
            defaultValue="#2B3540"
            onChange={(val) => onChange('btnSecondaryText', val)}
            description="文本与图标颜色"
          />
        </div>
      </div>

      {/* 3. 危险与删除按钮 (Danger Action) */}
      <div className="p-3 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          危险与删除按钮 (.btn-danger)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <ColorPickerInput
            label="危险按钮背景色 (Danger Bg)"
            value={draft.btnDangerBg}
            defaultValue="#DC2626"
            onChange={(val) => onChange('btnDangerBg', val)}
            description="支持透明度"
          />
          <ColorPickerInput
            label="危险悬停色 (Danger Hover)"
            value={draft.btnDangerHover}
            defaultValue="#B91C1C"
            onChange={(val) => onChange('btnDangerHover', val)}
            description="悬停与高亮"
          />
          <ColorPickerInput
            label="危险按钮文字色 (Text Color)"
            value={draft.btnDangerText}
            defaultValue="#FFFFFF"
            onChange={(val) => onChange('btnDangerText', val)}
            description="文字与图标"
          />
        </div>
      </div>

      {/* 4. 输入框与选择框 (Inputs & Selects) */}
      <div className="p-3 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <TextCursorInput className="w-3.5 h-3.5 text-blue-500" />
          输入框与表单控件 (.input-bg)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <ColorPickerInput
            label="输入框底色 (Input Bg)"
            value={draft.inputBg}
            defaultValue="rgba(255, 255, 255, 0.9)"
            placeholder="rgba(255, 255, 255, 0.9)"
            onChange={(val) => onChange('inputBg', val)}
            description="支持透明度调色"
          />
          <ColorPickerInput
            label="输入框边框色 (Border)"
            value={draft.inputBorder}
            defaultValue="rgba(96, 126, 149, 0.22)"
            onChange={(val) => onChange('inputBorder', val)}
            description="未聚焦边框"
          />
          <ColorPickerInput
            label="聚焦高亮色 (Focus Ring)"
            value={draft.inputFocus}
            defaultValue="#E65100"
            onChange={(val) => onChange('inputFocus', val)}
            description="聚焦时的边框高光"
          />
          <ColorPickerInput
            label="输入文本颜色 (Text)"
            value={draft.inputText}
            defaultValue="#2B3540"
            onChange={(val) => onChange('inputText', val)}
            description="输入内容文字颜色"
          />
        </div>
      </div>

      {/* 5. 徽章与标签 (Badges & Tags) */}
      <div className="p-3 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-500" />
          徽章与状态标签配色 (.badge-bg)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <ColorPickerInput
            label="徽章标签底色 (Badge Bg)"
            value={draft.badgeBg}
            defaultValue="rgba(230, 81, 0, 0.12)"
            onChange={(val) => onChange('badgeBg', val)}
            description="支持透明度调色"
          />
          <ColorPickerInput
            label="徽章文字色 (Badge Text)"
            value={draft.badgeText}
            defaultValue="#BF360C"
            onChange={(val) => onChange('badgeText', val)}
            description="标签文字颜色"
          />
        </div>
      </div>
    </div>
  );
};
