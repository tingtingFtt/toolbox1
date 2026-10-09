import React, { useState } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { BaseCard } from '../ui/BaseCard';
import { Sliders, Eye } from 'lucide-react';
import { parseColorAndOpacity, formatColorWithOpacity } from '../../utils/colorUtils';

interface ColorPickerInputProps {
  label: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange: (val: string) => void;
  description?: string;
  showOpacity?: boolean;
}

export const ColorPickerInput: React.FC<ColorPickerInputProps> = ({
  label,
  value = '',
  defaultValue = '#607E95',
  placeholder,
  onChange,
  description,
  showOpacity = true,
}) => {
  const [showSlider, setShowSlider] = useState(false);

  const parsed = parseColorAndOpacity(value || defaultValue, defaultValue);
  const currentHex = parsed.hex;
  const currentOpacity = parsed.opacity;

  // Handle color picker change (retains current opacity)
  const handleHexChange = (newHex: string) => {
    const formatted = formatColorWithOpacity(newHex, currentOpacity);
    onChange(formatted);
  };

  // Handle opacity slider change
  const handleOpacityChange = (newOpacity: number) => {
    const formatted = formatColorWithOpacity(currentHex, newOpacity);
    onChange(formatted);
  };

  // Handle raw text input
  const handleTextChange = (rawText: string) => {
    onChange(rawText);
  };

  return (
    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2 transition-all">
      {/* Header: Label + Opacity indicator */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-1">
          {label}
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          {description && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:inline truncate max-w-[120px]">
              {description}
            </span>
          )}
          {showOpacity && (
            <BaseButton
              type="button"
              onClick={() => setShowSlider(!showSlider)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer border ${
                currentOpacity < 100
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
              }`}
              title="展开/收起透明度调节滑块"
            >
              <Sliders className="w-2.5 h-2.5" />
              <span>{currentOpacity}%</span>
            </BaseButton>
          )}
        </div>
      </div>

      {/* Main Row: Color Box + Hex Text Input */}
      <div className="flex items-center gap-2">
        {/* Color preview swatch with checkerboard pattern for transparency */}
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-600 shrink-0 shadow-2xs group cursor-pointer">
          {/* Checkerboard background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
            }}
          />
          {/* Tinted Color Layer */}
          <div
            className="absolute inset-0 pointer-events-none transition-colors"
            style={{ backgroundColor: value || defaultValue }}
          />
          {/* Hidden native color picker */}
          <BaseInput
            type="color"
            value={currentHex}
            onChange={(e) => handleHexChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="点击选取颜色"
          />
        </div>

        {/* Text Input */}
        <BaseInput
          type="text"
          value={value || ''}
          placeholder={placeholder || defaultValue}
          onChange={(e) => handleTextChange(e.target.value)}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 shadow-2xs focus:border-amber-500 outline-none"
        />
      </div>

      {/* Expandable / Always Interactive Opacity Slider */}
      {showOpacity && (
        <div className={`pt-1 space-y-1 ${showSlider ? 'block' : 'hidden sm:block'}`}>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
            <span>不透明度 (Alpha)</span>
            <div className="flex items-center gap-1 font-mono">
              {[25, 50, 75, 100].map((preset) => (
                <BaseButton
                  key={preset}
                  type="button"
                  onClick={() => handleOpacityChange(preset)}
                  className={`px-1 rounded text-[9px] cursor-pointer hover:bg-amber-500/20 transition-colors ${
                    currentOpacity === preset
                      ? 'bg-amber-500 text-white font-bold'
                      : 'bg-zinc-200/70 dark:bg-zinc-700/60'
                  }`}
                >
                  {preset}%
                </BaseButton>
              ))}
            </div>
          </div>
          <BaseInput
            type="range"
            min="0"
            max="100"
            step="1"
            value={currentOpacity}
            onChange={(e) => handleOpacityChange(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      )}
    </div>
  );
};
