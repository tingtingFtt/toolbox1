import React, { useRef } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { BaseCard } from '../ui/BaseCard';
import { CustomThemePalette } from '../../utils/themeCustomizer';
import { ColorPickerInput } from './ColorPickerInput';
import { CustomSelect } from '../ui/CustomSelect';
import {
  Palette,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Compass,
  Upload,
  Trash2,
  Check,
  RefreshCw,
  Layers,
  Sun,
  Eye,
} from 'lucide-react';

interface BackgroundCustomizerProps {
  draft: Partial<CustomThemePalette>;
  onChange: (keyOrUpdates: Partial<CustomThemePalette> | keyof CustomThemePalette, value?: any) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// 12 High-Quality, Pure Light Gradient Presets (All carefully calibrated for high readability and aesthetics)
export const GRADIENT_PRESETS = [
  {
    name: '晨曦浅金',
    from: '#FFFBEB',
    to: '#FEF3C7',
    angle: 135,
    css: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
  },
  {
    name: '烟雨天青',
    from: '#F0FDFA',
    to: '#CCFBF1',
    angle: 135,
    css: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
  },
  {
    name: '霁蓝水墨',
    from: '#EEF2FF',
    to: '#E0E7FF',
    angle: 135,
    css: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
  },
  {
    name: '暮山紫霜',
    from: '#FAF5FF',
    to: '#F3E8FF',
    angle: 135,
    css: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
  },
  {
    name: '杏仁暖白',
    from: '#FAF7F2',
    to: '#F3ECE0',
    angle: 135,
    css: 'linear-gradient(135deg, #FAF7F2 0%, #F3ECE0 100%)',
  },
  {
    name: '浅樱微风',
    from: '#FFF1F2',
    to: '#FFE4E6',
    angle: 135,
    css: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
  },
  {
    name: '浅竹青露',
    from: '#F0FDF4',
    to: '#DCFCE7',
    angle: 135,
    css: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
  },
  {
    name: '澄空暖阳',
    from: '#F0F9FF',
    to: '#E0F2FE',
    angle: 135,
    css: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
  },
  {
    name: '抹茶奶绿',
    from: '#F7FEE7',
    to: '#ECFCCB',
    angle: 135,
    css: 'linear-gradient(135deg, #F7FEE7 0%, #ECFCCB 100%)',
  },
  {
    name: '浮光浅橘',
    from: '#FFF7ED',
    to: '#FFEDD5',
    angle: 135,
    css: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
  },
  {
    name: '银霜皓白',
    from: '#F8FAFC',
    to: '#F1F5F9',
    angle: 180,
    css: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
  },
  {
    name: '素雅米白',
    from: '#FCFBF9',
    to: '#F7F4EE',
    angle: 180,
    css: 'linear-gradient(180deg, #FCFBF9 0%, #F7F4EE 100%)',
  },
];

// Curated Elegant Light Wallpapers
export const WALLPAPER_PRESETS = [
  {
    name: '素雅纸纹 (Paper Grain)',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: '晨曦微光 (Dawn Glow)',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: '水墨群山 (Mountain Mist)',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: '浅蓝海韵 (Soft Ocean)',
    url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1200&auto=format&fit=crop',
  },
];

export const BackgroundCustomizer: React.FC<BackgroundCustomizerProps> = ({
  draft,
  onChange,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bgType = draft.bgType || (draft.bgImage ? 'image' : draft.bgGradient ? 'gradient' : 'solid');
  const angle = draft.bgGradientAngle !== undefined ? draft.bgGradientAngle : 135;
  const intensity = draft.bgGradientIntensity !== undefined ? draft.bgGradientIntensity : 100;
  const fromColor = draft.bgGradientFrom || '#FFFBEB';
  const toColor = draft.bgGradientTo || '#FEF3C7';
  const viaColor = draft.bgGradientVia || '';

  const opacity = draft.bgImageOpacity !== undefined ? draft.bgImageOpacity : 0.85;
  const blur = draft.bgImageBlur !== undefined ? draft.bgImageBlur : 0;
  const fit = draft.bgImageFit || 'cover';

  // Helper to recompute gradient CSS atomically
  const recomputeGradient = (
    newAngle: number,
    from: string,
    to: string,
    via?: string,
    intVal?: number
  ) => {
    const currentInt = intVal !== undefined ? intVal : intensity;
    const spread1 = Math.round(100 - currentInt);
    const spread2 = Math.round(currentInt);

    let css = '';
    if (via && via.trim()) {
      css = `linear-gradient(${newAngle}deg, ${from} ${spread1}%, ${via} 50%, ${to} ${spread2}%)`;
    } else {
      css = `linear-gradient(${newAngle}deg, ${from} ${spread1}%, ${to} ${spread2}%)`;
    }

    onChange({
      bgType: 'gradient',
      bgGradient: css,
      bgGradientAngle: newAngle,
      bgGradientFrom: from,
      bgGradientTo: to,
      bgGradientVia: via || '',
      bgGradientIntensity: currentInt,
    });
  };

  const handleApplyGradientPreset = (preset: typeof GRADIENT_PRESETS[0]) => {
    onChange({
      bgType: 'gradient',
      bgGradient: preset.css,
      bgGradientAngle: preset.angle,
      bgGradientFrom: preset.from,
      bgGradientTo: preset.to,
      bgGradientVia: '',
      bgGradientIntensity: 100,
    });
    showToast?.(`已应用渐变：${preset.name}`, 'info');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast?.('图片大小不能超过 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onChange({
          bgType: 'image',
          bgImage: base64,
          bgImageOpacity: draft.bgImageOpacity ?? 0.85,
          bgImageBlur: draft.bgImageBlur ?? 0,
          bgImageFit: draft.bgImageFit ?? 'cover',
        });
        showToast?.('已成功导入本地背景图片', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* 1. Background Type Selection Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <BaseButton
          type="button"
          onClick={() => onChange('bgType', 'solid')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            bgType === 'solid'
              ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>纯色纸张底色</span>
        </BaseButton>

        <BaseButton
          type="button"
          onClick={() => {
            if (!draft.bgGradient) {
              recomputeGradient(angle, fromColor, toColor, viaColor, intensity);
            } else {
              onChange('bgType', 'gradient');
            }
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            bgType === 'gradient'
              ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>浅色渐变背景</span>
        </BaseButton>

        <BaseButton
          type="button"
          onClick={() => onChange('bgType', 'image')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            bgType === 'image'
              ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>自定义壁纸图片</span>
        </BaseButton>
      </div>

      {/* 2. Solid Background Configuration */}
      {bgType === 'solid' && (
        <div className="space-y-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              全站大背景纸张主色 (--bg-paper / 大背景底色)
            </span>
            <span className="text-[10px] text-zinc-400">推荐使用纯净、温润的浅色纸张调</span>
          </div>

          <ColorPickerInput
            label="纸张底色 (Paper Background)"
            value={draft.bgPaper || '#FFFDF5'}
            onChange={(val: any) => onChange('bgPaper', val)}
            description="酒馆整个界面的最底层衬底颜色，直接影响全站视觉基调。"
          />
        </div>
      )}

      {/* 3. Gradient Background Configuration */}
      {bgType === 'gradient' && (
        <div className="space-y-5">
          {/* Quick Presets for Light Gradients */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                精选浅色渐变预设
              </label>
              <span className="text-[10px] text-zinc-400">所有预设均为柔和浅色系 (点击即时渲染)</span>
            </div>

            
            <CustomSelect
              value={draft.bgGradient || 'none'}
              onChange={(val: any) => {
                const preset = GRADIENT_PRESETS.find(p => p.css === val);
                if (preset) {
                  handleApplyGradientPreset(preset);
                }
              }}
              options={[
                { value: 'none', label: '请选择渐变预设...' },
                ...GRADIENT_PRESETS.map((p) => ({
                  value: p.css,
                  label: p.name,
                  icon: (
                    <div
                      className="w-4 h-4 rounded shadow-2xs border border-black/5"
                      style={{ background: p.css }}
                    />
                  )
                }))
              ]}
            />

          </div>

          {/* Detailed Gradient Adjustments */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-4">
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              渐变调色、方向角度与渲染度控制
            </div>

            {/* Gradient Color Stops */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ColorPickerInput
                label="起始颜色 (From)"
                value={fromColor}
                onChange={(val: any) => recomputeGradient(angle, val, toColor, viaColor, intensity)}
                description="渐变起点浅色调"
              />

              <ColorPickerInput
                label="中间过渡色 (Via / 可选)"
                value={viaColor || '#FFFFFF'}
                onChange={(val: any) => recomputeGradient(angle, fromColor, toColor, val, intensity)}
                description="如不需要可清空"
              />

              <ColorPickerInput
                label="结束颜色 (To)"
                value={toColor}
                onChange={(val: any) => recomputeGradient(angle, fromColor, val, viaColor, intensity)}
                description="渐变终点浅色调"
              />
            </div>

            {/* Gradient Angle Slider */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                  渐变方向角度 (Angle)
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  {angle}°
                </span>
              </div>
              <BaseInput
                type="range"
                min="0"
                max="360"
                step="15"
                value={angle}
                onChange={(e) => {
                  const newAngle = parseInt(e.target.value, 10);
                  recomputeGradient(newAngle, fromColor, toColor, viaColor, intensity);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>0° (从下到上)</span>
                <span>90° (从左到右)</span>
                <span>135° (经典对角)</span>
                <span>180° (从上到下)</span>
                <span>270° (从右到左)</span>
              </div>
            </div>

            {/* Gradient Intensity Slider */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  渐变扩散渲染度 (Intensity / Spread)
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  {intensity}%
                </span>
              </div>
              <BaseInput
                type="range"
                min="10"
                max="100"
                step="5"
                value={intensity}
                onChange={(e) => {
                  const newInt = parseInt(e.target.value, 10);
                  recomputeGradient(angle, fromColor, toColor, viaColor, newInt);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>柔和过渡扩散</span>
                <span>标准 100% 满幅渲染</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Wallpaper / Background Image Configuration */}
      {bgType === 'image' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  自定义壁纸上传或输入图片链接
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  支持 JPG, PNG, WebP (建议浅色高雅壁纸，最大 5MB)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <BaseButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>选择本地壁纸图片</span>
                </BaseButton>

                {draft.bgImage && (
                  <BaseButton
                    type="button"
                    onClick={() => {
                      onChange({
                        bgImage: '',
                        bgType: 'solid',
                      });
                      showToast?.('已移除自定义壁纸', 'info');
                    }}
                    className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors cursor-pointer"
                    title="移除图片"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </BaseButton>
                )}
              </div>
            </div>

            {/* Online URL input */}
            <div className="flex items-center gap-2">
              <BaseInput
                type="text"
                value={
                  draft.bgImage?.startsWith('data:')
                    ? '已载入本地上传壁纸图片 (Base64)'
                    : draft.bgImage || ''
                }
                placeholder="或粘贴在线壁纸图片 URL 链接..."
                onChange={(e) => {
                  if (!draft.bgImage?.startsWith('data:')) {
                    onChange({
                      bgType: 'image',
                      bgImage: e.target.value,
                    });
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Current Image Preview & Controls */}
            {draft.bgImage && (
              <div className="space-y-3 pt-1">
                <div className="relative w-full h-28 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-900">
                  <img
                    src={draft.bgImage}
                    alt="Background Preview"
                    className="w-full h-full object-cover"
                    style={{
                      opacity: opacity,
                      filter: blur > 0 ? `blur(${blur}px)` : 'none',
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                      壁纸渲染预览中 ({Math.round(opacity * 100)}% 不透明度)
                    </span>
                  </div>
                </div>

                {/* Opacity + Blur + Fit Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span>壁纸不透明度：</span>
                      <span className="font-mono font-bold">{Math.round(opacity * 100)}%</span>
                    </div>
                    <BaseInput
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={opacity}
                      onChange={(e) =>
                        onChange('bgImageOpacity', parseFloat(e.target.value))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span>背景高斯模糊：</span>
                      <span className="font-mono font-bold">{blur}px</span>
                    </div>
                    <BaseInput
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={blur}
                      onChange={(e) =>
                        onChange('bgImageBlur', parseInt(e.target.value, 10))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">适配平铺方式：</div>
                    <CustomSelect
  value={fit}
  onChange={(val: any) => onChange('bgImageFit', val as any)}
  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200"
  options={[
    {value: 'cover', label: '铺满拉伸 (Cover)'},
    {value: 'contain', label: '等比完整 (Contain)'},
    {value: 'tile', label: '纹理平铺 (Tile)'}
  ]}
/>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preset Wallpaper Quick Selection */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              精选浅色雅致壁纸速选：
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WALLPAPER_PRESETS.map((wp, i) => (
                <BaseButton
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange({
                      bgType: 'image',
                      bgImage: wp.url,
                      bgImageOpacity: draft.bgImageOpacity ?? 0.85,
                      bgImageBlur: draft.bgImageBlur ?? 0,
                      bgImageFit: draft.bgImageFit ?? 'cover',
                    });
                    showToast?.(`已载入壁纸：${wp.name}`, 'info');
                  }}
                  className="relative h-18 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 group text-left cursor-pointer shadow-2xs hover:border-amber-500"
                >
                  <img
                    src={wp.url}
                    alt={wp.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors p-2 flex items-end">
                    <span className="text-[10px] font-bold text-white truncate drop-shadow-xs">
                      {wp.name}
                    </span>
                  </div>
                </BaseButton>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
