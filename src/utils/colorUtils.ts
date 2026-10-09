/**
 * Color Utilities for Custom Theme Tuner
 * Supports Hex, RGB, RGBA, Opacity extraction, Conversion, and Random Light Scheme Generation.
 */

export interface ParsedColor {
  hex: string;
  opacity: number; // 0 - 100
  rgbaString: string;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleaned.length === 6 || cleaned.length === 8) {
    const num = parseInt(cleaned.slice(0, 6), 16);
    if (isNaN(num)) return null;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
  return null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Parses any color string (Hex, RGB, RGBA) into Hex + Opacity (0 - 100)
 */
export function parseColorAndOpacity(colorStr?: string, defaultHex = '#607E95'): ParsedColor {
  if (!colorStr || colorStr === 'transparent') {
    return {
      hex: defaultHex,
      opacity: colorStr === 'transparent' ? 0 : 100,
      rgbaString: colorStr === 'transparent' ? 'rgba(0, 0, 0, 0)' : `${defaultHex}`,
    };
  }

  const str = colorStr.trim();

  // 1. RGBA / RGB format
  const rgbaMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    const hex = rgbToHex(r, g, b);
    const opacity = Math.round(Math.max(0, Math.min(1, a)) * 100);
    return {
      hex,
      opacity,
      rgbaString: opacity === 100 ? hex : `rgba(${r}, ${g}, ${b}, ${opacity / 100})`,
    };
  }

  // 2. Hex 8 (#rrggbbaa)
  if (/^#([0-9a-f]{8})$/i.test(str)) {
    const r = parseInt(str.slice(1, 3), 16);
    const g = parseInt(str.slice(3, 5), 16);
    const b = parseInt(str.slice(5, 7), 16);
    const a = parseInt(str.slice(7, 9), 16) / 255;
    const hex = `#${str.slice(1, 7).toUpperCase()}`;
    const opacity = Math.round(a * 100);
    return {
      hex,
      opacity,
      rgbaString: opacity === 100 ? hex : `rgba(${r}, ${g}, ${b}, ${(opacity / 100).toFixed(2)})`,
    };
  }

  // 3. Hex 6 or Hex 3 (#rrggbb / #rgb)
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(str)) {
    let cleanHex = str;
    if (str.length === 4) {
      cleanHex = `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`;
    }
    return {
      hex: cleanHex.toUpperCase(),
      opacity: 100,
      rgbaString: cleanHex.toUpperCase(),
    };
  }

  return {
    hex: defaultHex,
    opacity: 100,
    rgbaString: defaultHex,
  };
}

/**
 * Formats a Hex color and Opacity (0-100) into standard CSS color string
 */
export function formatColorWithOpacity(hex: string, opacity: number): string {
  const op = Math.max(0, Math.min(100, Math.round(opacity)));
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  if (op >= 100) {
    return hex.toUpperCase();
  }
  const alpha = Number((op / 100).toFixed(2));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Generate Light Pastel / Harmonious Color Scheme
 * Strictly LIGHT color backgrounds, gentle pastel tones, high readability, and light dynamic states.
 */
export interface LightPaletteSeed {
  name: string;
  accent: string;
  accentHover: string;
  bgFrom: string;
  bgTo: string;
  bgPaper: string;
  headerBg: string;
  cardBg: string;
  text: string;
  dim: string;
}

export const LIGHT_THEME_SEEDS: LightPaletteSeed[] = [
  {
    name: '晨曦浅金',
    accent: '#D97706',
    accentHover: '#B45309',
    bgFrom: '#FFFBEB',
    bgTo: '#FEF3C7',
    bgPaper: '#FFFDF5',
    headerBg: '#FFFDF5',
    cardBg: '#FFFFFF',
    text: '#291F18',
    dim: '#786558',
  },
  {
    name: '烟雨天青',
    accent: '#0D9488',
    accentHover: '#0F766E',
    bgFrom: '#F0FDFA',
    bgTo: '#CCFBF1',
    bgPaper: '#F4FCFA',
    headerBg: '#F4FCFA',
    cardBg: '#FFFFFF',
    text: '#132F2B',
    dim: '#557571',
  },
  {
    name: '霁蓝水墨',
    accent: '#4F46E5',
    accentHover: '#4338CA',
    bgFrom: '#EEF2FF',
    bgTo: '#E0E7FF',
    bgPaper: '#F8F9FE',
    headerBg: '#F8F9FE',
    cardBg: '#FFFFFF',
    text: '#1E1B4B',
    dim: '#5B5880',
  },
  {
    name: '暮山紫霜',
    accent: '#9333EA',
    accentHover: '#7E22CE',
    bgFrom: '#FAF5FF',
    bgTo: '#F3E8FF',
    bgPaper: '#FCF9FF',
    headerBg: '#FCF9FF',
    cardBg: '#FFFFFF',
    text: '#2C143B',
    dim: '#715682',
  },
  {
    name: '杏仁暖白',
    accent: '#C26A3E',
    accentHover: '#A34F25',
    bgFrom: '#FAF7F2',
    bgTo: '#F3ECE0',
    bgPaper: '#FAF6F0',
    headerBg: '#FAF6F0',
    cardBg: '#FFFFFF',
    text: '#2E2219',
    dim: '#7E6B5D',
  },
  {
    name: '浅竹青露',
    accent: '#16A34A',
    accentHover: '#15803D',
    bgFrom: '#F0FDF4',
    bgTo: '#DCFCE7',
    bgPaper: '#F6FCF7',
    headerBg: '#F6FCF7',
    cardBg: '#FFFFFF',
    text: '#142918',
    dim: '#506E55',
  },
  {
    name: '浅樱微风',
    accent: '#E11D48',
    accentHover: '#BE123C',
    bgFrom: '#FFF1F2',
    bgTo: '#FFE4E6',
    bgPaper: '#FFF7F8',
    headerBg: '#FFF7F8',
    cardBg: '#FFFFFF',
    text: '#38161E',
    dim: '#855661',
  },
  {
    name: '澄空暖阳',
    accent: '#0284C7',
    accentHover: '#0369A1',
    bgFrom: '#F0F9FF',
    bgTo: '#E0F2FE',
    bgPaper: '#F6FAFD',
    headerBg: '#F6FAFD',
    cardBg: '#FFFFFF',
    text: '#132838',
    dim: '#516E82',
  },
  {
    name: '抹茶奶绿',
    accent: '#65A30D',
    accentHover: '#4D7C0F',
    bgFrom: '#F7FEE7',
    bgTo: '#ECFCCB',
    bgPaper: '#FAFEF0',
    headerBg: '#FAFEF0',
    cardBg: '#FFFFFF',
    text: '#22330C',
    dim: '#617842',
  },
  {
    name: '浮光浅橘',
    accent: '#EA580C',
    accentHover: '#C2410C',
    bgFrom: '#FFF7ED',
    bgTo: '#FFEDD5',
    bgPaper: '#FFF9F2',
    headerBg: '#FFF9F2',
    cardBg: '#FFFFFF',
    text: '#381E11',
    dim: '#85614F',
  },
];

/**
 * Generate a complete, perfectly calibrated Light-Themed Custom Palette
 */
export function generateRandomLightPalette(seedIndex?: number) {
  const seed =
    seedIndex !== undefined
      ? LIGHT_THEME_SEEDS[seedIndex % LIGHT_THEME_SEEDS.length]
      : LIGHT_THEME_SEEDS[Math.floor(Math.random() * LIGHT_THEME_SEEDS.length)];

  const angle = Math.floor(Math.random() * 8) * 45; // 0, 45, 90, 135, 180, 225, 270, 315
  const accentRgb = hexToRgb(seed.accent) || { r: 96, g: 126, b: 149 };

  return {
    name: `${seed.name} (浅色)`,
    bgType: 'gradient' as const,
    bgPaper: seed.bgPaper,
    bgGradient: `linear-gradient(${angle}deg, ${seed.bgFrom} 0%, ${seed.bgTo} 100%)`,
    bgGradientFrom: seed.bgFrom,
    bgGradientTo: seed.bgTo,
    bgGradientAngle: angle,
    bgGradientIntensity: 100,

    accent: seed.accent,
    accentHover: seed.accentHover,
    text: seed.text,
    textSerif: seed.text,
    dim: seed.dim,
    faint: `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.3)`,

    headerBg: `rgba(255, 255, 255, 0.88)`,
    headerText: seed.text,

    sidebarBg: seed.bgPaper,
    sidebarText: seed.text,

    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',

    btnDangerBg: '#DC2626',
    btnDangerHover: '#B91C1C',

    inputBg: `rgba(255, 255, 255, 0.9)`,
    inputFocus: seed.accent,
    badgeText: seed.accentHover,

    warn: '#D97706',
    err: '#DC2626',
    ok: '#16A34A',
  };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) cleaned = cleaned.split('').map((c) => c + c).join('');
  if (cleaned.length !== 6 && cleaned.length !== 8) return { h: 0, s: 0, l: 0 };
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec('#' + cleaned);
  if (!result) return { h: 0, s: 0, l: 0 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function generateHarmonyFromBaseColor(baseHex: string) {
  const hsl = hexToHsl(baseHex);
  
  const accent = hslToHex(hsl.h, Math.min(hsl.s + 20, 100), 45);
  const accentHover = hslToHex(hsl.h, Math.min(hsl.s + 30, 100), 38);
  
  const bgFrom = hslToHex(hsl.h, Math.max(hsl.s - 20, 10), 97);
  const bgTo = hslToHex((hsl.h + 15) % 360, Math.max(hsl.s - 20, 10), 94);
  const bgPaper = hslToHex(hsl.h, Math.max(hsl.s - 30, 5), 98);
  
  const text = hslToHex(hsl.h, Math.min(hsl.s, 30), 15);
  const dim = hslToHex(hsl.h, Math.min(hsl.s, 20), 40);

  const seed: LightPaletteSeed = {
    name: '自定提取浅色',
    accent,
    accentHover,
    bgFrom,
    bgTo,
    bgPaper,
    headerBg: bgPaper,
    cardBg: '#FFFFFF',
    text,
    dim
  };
  
  const angle = 135;
  const accentRgb = hexToRgb(seed.accent) || { r: 96, g: 126, b: 149 };

  return {
    name: `${seed.name}`,
    bgType: 'gradient' as const,
    bgPaper: seed.bgPaper,
    bgGradient: `linear-gradient(${angle}deg, ${seed.bgFrom} 0%, ${seed.bgTo} 100%)`,
    bgGradientFrom: seed.bgFrom,
    bgGradientTo: seed.bgTo,
    bgGradientAngle: angle,
    bgGradientIntensity: 100,

    accent: seed.accent,
    accentHover: seed.accentHover,
    text: seed.text,
    textSerif: seed.text,
    dim: seed.dim,
    faint: `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.3)`,

    headerBg: `rgba(255, 255, 255, 0.88)`,
    headerText: seed.text,

    sidebarBg: seed.bgPaper,
    sidebarText: seed.text,

    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',

    btnDangerBg: '#DC2626',
    btnDangerHover: '#B91C1C',

    inputBg: `rgba(255, 255, 255, 0.9)`,
    inputFocus: seed.accent,
    badgeText: seed.accentHover,

    warn: '#D97706',
    err: '#DC2626',
    ok: '#16A34A',
  };
}

export function generateHarmonyFromColors(hexColors: string[]) {
  const baseColor = hexColors[0] || '#4F46E5';
  const secondaryColor = hexColors[1] || '#FDF7F0';
  const tertiaryColor = hexColors[2] || '#FFFFFF';

  const baseHsl = hexToHsl(baseColor);
  const bgHsl = hexToHsl(secondaryColor);

  const accent = hslToHex(baseHsl.h, Math.min(baseHsl.s, 100), Math.max(Math.min(baseHsl.l, 60), 30));
  const accentHover = hslToHex(baseHsl.h, Math.min(baseHsl.s + 10, 100), Math.max(baseHsl.l - 10, 20));
  
  const bgPaper = secondaryColor;
  const bgFrom = hslToHex(bgHsl.h, bgHsl.s, Math.min(bgHsl.l + 5, 99));
  const bgTo = hslToHex((bgHsl.h + 15) % 360, Math.max(bgHsl.s - 10, 0), Math.max(bgHsl.l - 5, 90));
  
  const text = hslToHex(baseHsl.h, Math.min(baseHsl.s, 30), 15);
  const dim = hslToHex(baseHsl.h, Math.min(baseHsl.s, 20), 40);

  const seed = {
    name: '定制多色灵感',
    accent,
    accentHover,
    bgFrom,
    bgTo,
    bgPaper,
    headerBg: bgPaper,
    text,
    textSerif: text,
    dim
  };

  const accentRgb = hexToRgb(accent) || { r: 96, g: 126, b: 149 };

  return {
    name: seed.name,
    bgType: 'gradient' as const,
    bgPaper: seed.bgPaper,
    bgGradient: `linear-gradient(135deg, ${seed.bgFrom} 0%, ${seed.bgTo} 100%)`,
    bgGradientFrom: seed.bgFrom,
    bgGradientTo: seed.bgTo,
    bgGradientAngle: 135,
    
    accent: seed.accent,
    accentHover: seed.accentHover,
    text: seed.text,
    textSerif: seed.text,
    dim: seed.dim,
    
    headerBg: `rgba(255, 255, 255, 0.88)`,
    headerText: seed.text,
    sidebarBg: seed.bgPaper,
    sidebarText: seed.text,
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    
    btnDangerBg: '#DC2626',
    btnDangerHover: '#B91C1C',
    btnDangerText: '#FFFFFF',
    
    inputBg: `rgba(255, 255, 255, 0.9)`,
    inputFocus: seed.accent,
    
    badgeText: seed.accentHover,
    
    warn: '#D97706',
    err: '#DC2626',
    ok: '#16A34A',
  };
}
