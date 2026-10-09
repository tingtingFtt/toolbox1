// Enhanced Theme Customizer with Exclusively Light Harmonious Schemes, Detailed Transparency Controls, and Gradient Spread Controllers

import { generateRandomLightPalette, LIGHT_THEME_SEEDS } from './colorUtils';

export interface CustomThemePalette {
  id: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
  tags?: string[];

  // 1. 大背景相关 (Background & Wallpaper)
  bgType?: 'solid' | 'gradient' | 'image';
  bgPaper: string; // 基础底色
  bgGradient?: string; // CSS 渐变表达式
  bgGradientFrom?: string;
  bgGradientVia?: string;
  bgGradientTo?: string;
  bgGradientAngle?: number; // 0 - 360 deg
  bgGradientIntensity?: number; // 30 - 100% 渲染跨度
  bgImage?: string; // 上传的图片 base64 或图片链接
  bgImageOpacity?: number; // 0.05 - 1.0 (默认 0.85)
  bgImageBlur?: number; // 0 - 20 px (默认 0)
  bgImageFit?: 'cover' | 'contain' | 'tile'; // 适配方式

  // 2. 顶栏相关 (Header & Navigation)
  headerBg?: string;
  headerText?: string;
  headerBorder?: string;

  // 3. 侧边栏 (Sidebar)
  sidebarBg?: string;
  sidebarText?: string;
  sidebarBorder?: string;

  // 4. 每个块与卡片 (Blocks & Cards)
  cardBg?: string;
  cardBorder?: string;
  cardInnerBg?: string;
  modalBg?: string;
  modalBorder?: string;

  // 5. 按键与交互控件 (Buttons & Inputs)
  // 强调主按钮
  btnPrimaryBg?: string;
  btnPrimaryHover?: string;
  btnPrimaryText?: string;
  btnPrimaryBorder?: string;
  // 次级/普通按钮
  btnSecondaryBg?: string;
  btnSecondaryHover?: string;
  btnSecondaryText?: string;
  btnSecondaryBorder?: string;
  // 危险/删除按钮
  btnDangerBg?: string;
  btnDangerHover?: string;
  btnDangerText?: string;
  // 输入框与选择框
  inputBg?: string;
  inputBorder?: string;
  inputText?: string;
  inputFocus?: string;
  // 徽章与标签
  badgeBg?: string;
  badgeText?: string;
  
  // 新增的高级边框控制属性
  headerBorderWidth?: string;
  headerBorderSides?: 'all' | 'top' | 'bottom' | 'left' | 'right' | 'none';
  sidebarBorderWidth?: string;
  sidebarBorderSides?: 'all' | 'top' | 'bottom' | 'left' | 'right' | 'none';
  cardBorderWidth?: string;
  cardBorderSides?: 'all' | 'top' | 'bottom' | 'left' | 'right' | 'none';
  modalBorderWidth?: string;
  modalBorderSides?: 'all' | 'top' | 'bottom' | 'left' | 'right' | 'none';

  // 6. 核心色彩与状态文字 (Core Colors & States - 浅色系为主)
  accent: string;
  accentHover?: string;
  text: string;
  textSerif?: string;
  dim?: string;
  faint?: string;
  line: string;
  lineSoft?: string;
  lineFocus?: string;
  warn?: string;
  err?: string;
  ok?: string;
  tabBgGradient?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
}

export const SYSTEM_THEME_IDS = [
  'wulan',
  'jinsha',
  'shilu',
  'chayan',
  'bamboo',
  'songci',
  'yanzhi',
  'yuebai',
  'jilan',
  'qianhe',
  'yunfen',
  'glass-default',
  'glass-amber',
  'glass-blue',
  'glass-purple',
  'glass-emerald',
  'glass-rose',
  'line-brown-default',
  'line-green-default',
];

// 常见浅色渐变快捷预设 (全部为浅色系)
export interface GradientPreset {
  name: string;
  css: string;
  from: string;
  to: string;
  angle: number;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    name: '晨曦浅金 (Dawn Gold)',
    css: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    from: '#FFFBEB',
    to: '#FEF3C7',
    angle: 135,
  },
  {
    name: '烟雨天青 (Misty Celadon)',
    css: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
    from: '#F0FDFA',
    to: '#CCFBF1',
    angle: 135,
  },
  {
    name: '霁蓝水墨 (Light Indigo)',
    css: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    from: '#EEF2FF',
    to: '#E0E7FF',
    angle: 135,
  },
  {
    name: '暮山紫霜 (Twilight Orchid)',
    css: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
    from: '#FAF5FF',
    to: '#F3E8FF',
    angle: 135,
  },
  {
    name: '浅樱微风 (Sakura Breeze)',
    css: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
    from: '#FFF1F2',
    to: '#FFE4E6',
    angle: 135,
  },
  {
    name: '浅竹青露 (Bamboo Dew)',
    css: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    from: '#F0FDF4',
    to: '#DCFCE7',
    angle: 135,
  },
  {
    name: '澄空暖阳 (Clear Sky)',
    css: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
    from: '#F0F9FF',
    to: '#E0F2FE',
    angle: 135,
  },
  {
    name: '杏仁奶白 (Almond Creme)',
    css: 'linear-gradient(135deg, #FAF7F2 0%, #F3ECE0 100%)',
    from: '#FAF7F2',
    to: '#F3ECE0',
    angle: 135,
  },
];

// 灵感调色模板库 (包含用户需求的高级精调配色模板与经典浅色雅韵模板)
export const DIVERSE_INSPIRATION_TEMPLATES: Omit<CustomThemePalette, 'id' | 'createdAt'>[] = [
  {
    name: '琥珀复古 (Amber Vintage)',
    bgType: 'gradient',
    accent: '#B45309',
    accentHover: '#92400E',
    bgPaper: '#FDF8F0',
    text: '#29180E',
    textSerif: '#1C0F08',
    line: 'rgba(180, 83, 9, 0.22)',
    dim: '#7C5B42',
    faint: '#B09177',
    headerBg: 'rgba(253, 248, 240, 0.92)',
    headerText: '#29180E',
    sidebarBg: '#FDF8F0',
    sidebarText: '#29180E',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnPrimaryBg: '#B45309',
    btnPrimaryHover: '#92400E',
    btnPrimaryText: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#B45309',
    badgeBg: 'rgba(180, 83, 9, 0.12)',
    badgeText: '#92400E',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#15803D',
    bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FDF8F0 100%)',
    bgGradientFrom: '#FEF3C7',
    bgGradientTo: '#FDF8F0',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '深空紫罗兰 (Deep Space Violet)',
    bgType: 'gradient',
    accent: '#7C3AED',
    accentHover: '#6D28D9',
    bgPaper: '#F9F7FE',
    text: '#1F1235',
    textSerif: '#150A26',
    line: 'rgba(124, 58, 237, 0.2)',
    dim: '#69558A',
    faint: '#A08EC0',
    headerBg: 'rgba(249, 247, 254, 0.92)',
    headerText: '#1F1235',
    sidebarBg: '#F9F7FE',
    sidebarText: '#1F1235',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnPrimaryBg: '#7C3AED',
    btnPrimaryHover: '#6D28D9',
    btnPrimaryText: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#7C3AED',
    badgeBg: 'rgba(124, 58, 237, 0.12)',
    badgeText: '#6D28D9',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#059669',
    bgGradient: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 50%, #F9F7FE 100%)',
    bgGradientFrom: '#EDE9FE',
    bgGradientTo: '#F9F7FE',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '青瓷翠竹 (Celadon Bamboo)',
    bgType: 'gradient',
    accent: '#059669',
    accentHover: '#047857',
    bgPaper: '#F2FBF7',
    text: '#0E291E',
    textSerif: '#091C14',
    line: 'rgba(5, 150, 105, 0.2)',
    dim: '#487361',
    faint: '#7CA896',
    headerBg: 'rgba(242, 251, 247, 0.92)',
    headerText: '#0E291E',
    sidebarBg: '#F2FBF7',
    sidebarText: '#0E291E',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnPrimaryBg: '#059669',
    btnPrimaryHover: '#047857',
    btnPrimaryText: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#059669',
    badgeBg: 'rgba(5, 150, 105, 0.12)',
    badgeText: '#047857',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#059669',
    bgGradient: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 50%, #F2FBF7 100%)',
    bgGradientFrom: '#D1FAE5',
    bgGradientTo: '#F2FBF7',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '赛博霓虹 (Cyber Neon)',
    bgType: 'gradient',
    accent: '#0284C7',
    accentHover: '#0369A1',
    bgPaper: '#F0F9FF',
    text: '#0C273D',
    textSerif: '#061726',
    line: 'rgba(2, 132, 199, 0.24)',
    dim: '#476E8C',
    faint: '#7CA7C9',
    headerBg: 'rgba(240, 249, 255, 0.92)',
    headerText: '#0C273D',
    sidebarBg: '#F0F9FF',
    sidebarText: '#0C273D',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnPrimaryBg: '#0284C7',
    btnPrimaryHover: '#0369A1',
    btnPrimaryText: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#0284C7',
    badgeBg: 'rgba(2, 132, 199, 0.14)',
    badgeText: '#0369A1',
    warn: '#EA580C',
    err: '#DC2626',
    ok: '#06B6D4',
    bgGradient: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 50%, #EDE9FE 100%)',
    bgGradientFrom: '#E0F2FE',
    bgGradientTo: '#EDE9FE',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '宣纸古韵 (Rice Paper Antique)',
    bgType: 'gradient',
    accent: '#78350F',
    accentHover: '#592507',
    bgPaper: '#FAF6ED',
    text: '#2A1C11',
    textSerif: '#1B1109',
    line: 'rgba(120, 53, 15, 0.2)',
    dim: '#755F4D',
    faint: '#A69281',
    headerBg: 'rgba(250, 246, 237, 0.92)',
    headerText: '#2A1C11',
    sidebarBg: '#FAF6ED',
    sidebarText: '#2A1C11',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnPrimaryBg: '#78350F',
    btnPrimaryHover: '#592507',
    btnPrimaryText: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#78350F',
    badgeBg: 'rgba(120, 53, 15, 0.12)',
    badgeText: '#592507',
    warn: '#B45309',
    err: '#DC2626',
    ok: '#15803D',
    bgGradient: 'linear-gradient(135deg, #FEF3C7 0%, #F5E6CA 50%, #FAF6ED 100%)',
    bgGradientFrom: '#FEF3C7',
    bgGradientTo: '#FAF6ED',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '晨曦浅金 (Dawn Gold)',
    bgType: 'gradient',
    accent: '#D97706',
    accentHover: '#B45309',
    bgPaper: '#FFFDF5',
    text: '#291F18',
    textSerif: '#1B140F',
    line: 'rgba(128,128,128,0.2)',
    dim: '#786558',
    faint: '#AB968A',
    headerBg: 'rgba(255, 253, 245, 0.9)',
    headerText: '#291F18',
    sidebarBg: '#FFFDF5',
    sidebarText: '#291F18',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#D97706',
    badgeText: '#B45309',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#16A34A',
    bgGradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    bgGradientFrom: '#FFFBEB',
    bgGradientTo: '#FEF3C7',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '烟雨天青 (Misty Celadon)',
    bgType: 'gradient',
    accent: '#0D9488',
    accentHover: '#0F766E',
    bgPaper: '#F4FCFA',
    text: '#132F2B',
    textSerif: '#0C201D',
    line: 'rgba(128,128,128,0.2)',
    dim: '#557571',
    faint: '#8CA5A2',
    headerBg: 'rgba(244, 252, 250, 0.9)',
    headerText: '#132F2B',
    sidebarBg: '#F4FCFA',
    sidebarText: '#132F2B',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#0D9488',
    badgeText: '#0F766E',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#0D9488',
    bgGradient: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
    bgGradientFrom: '#F0FDFA',
    bgGradientTo: '#CCFBF1',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '霁蓝水墨 (Light Indigo)',
    bgType: 'gradient',
    accent: '#4F46E5',
    accentHover: '#4338CA',
    bgPaper: '#F8F9FE',
    text: '#1E1B4B',
    textSerif: '#131133',
    line: 'rgba(128,128,128,0.2)',
    dim: '#5B5880',
    faint: '#918EB5',
    headerBg: 'rgba(248, 249, 254, 0.9)',
    headerText: '#1E1B4B',
    sidebarBg: '#F8F9FE',
    sidebarText: '#1E1B4B',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#4F46E5',
    badgeText: '#4338CA',
    warn: '#EA580C',
    err: '#DC2626',
    ok: '#16A34A',
    bgGradient: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    bgGradientFrom: '#EEF2FF',
    bgGradientTo: '#E0E7FF',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '暮山紫霜 (Twilight Lavender)',
    bgType: 'gradient',
    accent: '#9333EA',
    accentHover: '#7E22CE',
    bgPaper: '#FCF9FF',
    text: '#2C143B',
    textSerif: '#1E0D29',
    line: 'rgba(128,128,128,0.2)',
    dim: '#715682',
    faint: '#A58EBA',
    headerBg: 'rgba(252, 249, 255, 0.9)',
    headerText: '#2C143B',
    sidebarBg: '#FCF9FF',
    sidebarText: '#2C143B',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#9333EA',
    badgeText: '#7E22CE',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#0D9488',
    bgGradient: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
    bgGradientFrom: '#FAF5FF',
    bgGradientTo: '#F3E8FF',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '杏仁暖白 (Almond Creme)',
    bgType: 'gradient',
    accent: '#C26A3E',
    accentHover: '#A34F25',
    bgPaper: '#FAF6F0',
    text: '#2E2219',
    textSerif: '#1F1610',
    line: 'rgba(128,128,128,0.2)',
    dim: '#7E6B5D',
    faint: '#B09E91',
    headerBg: 'rgba(250, 246, 240, 0.9)',
    headerText: '#2E2219',
    sidebarBg: '#FAF6F0',
    sidebarText: '#2E2219',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#C26A3E',
    badgeText: '#A34F25',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#16A34A',
    bgGradient: 'linear-gradient(135deg, #FAF7F2 0%, #F3ECE0 100%)',
    bgGradientFrom: '#FAF7F2',
    bgGradientTo: '#F3ECE0',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '浅樱微风 (Sakura Breeze)',
    bgType: 'gradient',
    accent: '#E11D48',
    accentHover: '#BE123C',
    bgPaper: '#FFF7F8',
    text: '#38161E',
    textSerif: '#250D14',
    line: 'rgba(128,128,128,0.2)',
    dim: '#855661',
    faint: '#B88B95',
    headerBg: 'rgba(255, 247, 248, 0.9)',
    headerText: '#38161E',
    sidebarBg: '#FFF7F8',
    sidebarText: '#38161E',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#E11D48',
    badgeText: '#BE123C',
    warn: '#EA580C',
    err: '#DC2626',
    ok: '#059669',
    bgGradient: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
    bgGradientFrom: '#FFF1F2',
    bgGradientTo: '#FFE4E6',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '浅竹青露 (Bamboo Dew)',
    bgType: 'gradient',
    accent: '#16A34A',
    accentHover: '#15803D',
    bgPaper: '#F6FCF7',
    text: '#142918',
    textSerif: '#0C1C10',
    line: 'rgba(128,128,128,0.2)',
    dim: '#506E55',
    faint: '#87A68D',
    headerBg: 'rgba(246, 252, 247, 0.9)',
    headerText: '#142918',
    sidebarBg: '#F6FCF7',
    sidebarText: '#142918',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#16A34A',
    badgeText: '#15803D',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#16A34A',
    bgGradient: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    bgGradientFrom: '#F0FDF4',
    bgGradientTo: '#DCFCE7',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
  {
    name: '澄空暖阳 (Clear Sky)',
    bgType: 'gradient',
    accent: '#0284C7',
    accentHover: '#0369A1',
    bgPaper: '#F6FAFD',
    text: '#132838',
    textSerif: '#0D1A25',
    line: 'rgba(128,128,128,0.2)',
    dim: '#516E82',
    faint: '#8BA6BA',
    headerBg: 'rgba(246, 250, 253, 0.9)',
    headerText: '#132838',
    sidebarBg: '#F6FAFD',
    sidebarText: '#132838',
    cardBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    btnDangerBg: '#DC2626',
    inputBg: 'rgba(255, 255, 255, 0.95)',
    inputFocus: '#0284C7',
    badgeText: '#0369A1',
    warn: '#D97706',
    err: '#DC2626',
    ok: '#0284C7',
    bgGradient: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
    bgGradientFrom: '#F0F9FF',
    bgGradientTo: '#E0F2FE',
    bgGradientAngle: 135,
    bgGradientIntensity: 100,
  },
];

const STORAGE_KEY_CUSTOM_PALETTES = 'tavern_vault_user_saved_palettes';
const STORAGE_KEY_ACTIVE_CUSTOM_ID = 'tavern_vault_active_custom_palette_id';

export function exportSingleThemeToJson(palette: CustomThemePalette): string {
  return JSON.stringify(
    {
      format: 'sillytavern-vault-theme',
      version: 2,
      exportedAt: Date.now(),
      theme: {
        ...palette,
      },
    },
    null,
    2
  );
}

export function exportPalettesToJson(palettes: CustomThemePalette[]): string {
  return JSON.stringify(
    {
      format: 'sillytavern-vault-themes-pack',
      version: 2,
      exportedAt: Date.now(),
      appName: 'SillyTavern Vault Theme Palettes',
      palettes: palettes,
    },
    null,
    2
  );
}

export function importPalettesFromJson(
  jsonStr: string
): { success: boolean; count: number; palettes: CustomThemePalette[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    let list: any[] = [];

    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (Array.isArray(parsed.palettes)) {
      list = parsed.palettes;
    } else if (parsed.theme && typeof parsed.theme === 'object') {
      list = [parsed.theme];
    } else if (parsed && typeof parsed === 'object' && (parsed.accent || parsed.bgPaper || parsed.name || parsed.main_text_color)) {
      list = [parsed];
    }

    if (!list || list.length === 0) {
      return { success: false, count: 0, palettes: [], error: '未找到有效的主题配色数据' };
    }

    const validPalettes: CustomThemePalette[] = [];
    const now = Date.now();

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item && typeof item === 'object') {
        // Handle SillyTavern style themes
        const accent = item.accent || item.blur_tint || item.shadow_color || item.accent_color || '#D97706';
        const bgPaper = item.bgPaper || item.main_bg_color || item.bg_color || '#FFFDF5';
        const text = item.text || item.main_text_color || item.text_color || '#291F18';
        const name = item.name || item.theme_name || `导入主题 ${i + 1}`;

        validPalettes.push({
          ...item,
          id: item.id || `custom_theme_${now}_${i}`,
          name: name,
          createdAt: item.createdAt || now,
          updatedAt: now,
          accent: accent,
          bgPaper: bgPaper,
          text: text,
          line: item.line || 'rgba(217, 119, 6, 0.18)',
        });
      }
    }

    if (validPalettes.length === 0) {
      return { success: false, count: 0, palettes: [], error: '文件中没有合法的配色字段' };
    }

    const current = getUserSavedPalettes();
    // Merge by id or add
    const currentMap = new Map(current.map((p) => [p.id, p]));
    validPalettes.forEach((p) => currentMap.set(p.id, p));
    const merged = Array.from(currentMap.values());

    localStorage.setItem(STORAGE_KEY_CUSTOM_PALETTES, JSON.stringify(merged));
    return { success: true, count: validPalettes.length, palettes: merged };
  } catch (err: any) {
    return { success: false, count: 0, palettes: [], error: err?.message || 'JSON 解析失败' };
  }
}

export function getUserSavedPalettes(): CustomThemePalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PALETTES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserPalette(palette: CustomThemePalette): CustomThemePalette[] {
  try {
    const current = getUserSavedPalettes();
    const existingIdx = current.findIndex((p) => p.id === palette.id);
    let updated: CustomThemePalette[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = palette;
    } else {
      updated = [palette, ...current];
    }
    localStorage.setItem(STORAGE_KEY_CUSTOM_PALETTES, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function deleteUserPalette(paletteId: string): CustomThemePalette[] {
  try {
    const current = getUserSavedPalettes();
    const updated = current.filter((p) => p.id !== paletteId);
    localStorage.setItem(STORAGE_KEY_CUSTOM_PALETTES, JSON.stringify(updated));

    // If currently active palette was deleted, remove active custom id
    const activeId = getActiveCustomPaletteId();
    if (activeId === paletteId) {
      setActiveCustomPaletteId(null);
      clearCustomCssOverrides();
    }
    return updated;
  } catch {
    return [];
  }
}

export function getActiveCustomPaletteId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_CUSTOM_ID) || null;
  } catch {
    return null;
  }
}

export function setActiveCustomPaletteId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_CUSTOM_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_CUSTOM_ID);
    }
  } catch {}
}

export function clearCustomCssOverrides() {
  const styleEl = document.getElementById('custom-theme-overrides');
  if (styleEl) {
    styleEl.textContent = '';
  }
  const bgLayer = document.getElementById('custom-theme-bg-layer');
  if (bgLayer) {
    bgLayer.remove();
  }
}

/**
 * 还原当前已保存生效的自定义主题（若无有效自定义主题则清空覆盖，还原系统原生样式）
 */
export function restoreActiveSavedThemeCss(): CustomThemePalette | null {
  try {
    const activeId = getActiveCustomPaletteId();
    if (activeId) {
      const all = getUserSavedPalettes();
      const found = all.find((p) => p.id === activeId);
      if (found) {
        applyCustomPaletteCss(found);
        return found;
      }
    }
    clearCustomCssOverrides();
    return null;
  } catch {
    clearCustomCssOverrides();
    return null;
  }
}

/**
 * Generate a pristine default light base template for starting fresh custom tuning
 */
export function getCleanInitialLightDraft(): Partial<CustomThemePalette> {
  return generateRandomLightPalette(0);
}

/**
 * Generate Random Harmonious Palette (Guaranteed Light Pastel Palette)
 */
export function generateRandomHarmonyPalette(): Partial<CustomThemePalette> {
  return generateRandomLightPalette();
}

/**
 * Apply Custom Palette CSS Rules across the entire DOM tree
 */
export function applyCustomPaletteCss(palette: Partial<CustomThemePalette>) {
  let styleEl = document.getElementById('custom-theme-overrides') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-theme-overrides';
    document.head.appendChild(styleEl);
  }

  let bgLayer = document.getElementById('custom-theme-bg-layer');
  if (bgLayer) {
    bgLayer.remove();
  }

  const rootRules: string[] = [];
  const extraRules: string[] = [];

  if (palette.bgType === 'image' && palette.bgImage) {
    bgLayer = document.createElement('div');
    bgLayer.id = 'custom-theme-bg-layer';
    bgLayer.style.position = 'fixed';
    bgLayer.style.top = '0';
    bgLayer.style.left = '0';
    bgLayer.style.width = '100vw';
    bgLayer.style.height = '100vh';
    bgLayer.style.zIndex = '-1';
    bgLayer.style.pointerEvents = 'none';
    bgLayer.style.backgroundImage = "url('" + palette.bgImage + "')";
    bgLayer.style.backgroundSize = palette.bgImageFit || 'cover';
    bgLayer.style.backgroundPosition = 'center';
    bgLayer.style.backgroundRepeat = palette.bgImageFit === 'tile' ? 'repeat' : 'no-repeat';
    
    const opacity = palette.bgImageOpacity !== undefined ? palette.bgImageOpacity : 0.85;
    const blur = palette.bgImageBlur !== undefined ? palette.bgImageBlur : 0;
    
    bgLayer.style.opacity = opacity.toString();
    bgLayer.style.filter = blur > 0 ? "blur(" + blur + "px)" : 'none';
    bgLayer.style.transform = blur > 0 ? 'scale(1.04)' : 'none';
    bgLayer.style.transition = 'opacity 0.2s ease, filter 0.2s ease';
    
    document.body.prepend(bgLayer);

    extraRules.push(`
      html, body, #root, #root > div, .app-shell-root, .min-h-screen, #app-content {
        background-color: transparent !important;
        background-image: none !important;
      }
    `);
  } else if (palette.bgType === 'gradient' && palette.bgGradient) {
    extraRules.push(`
      html, body, #root, #root > div, .app-shell-root, .min-h-screen, #app-content {
        background-image: ${palette.bgGradient} !important;
        background-attachment: fixed !important;
        background-size: cover !important;
        background-color: transparent !important;
      }
    `);
  } else if (palette.bgPaper) {
    extraRules.push(`
      html, body, #root, #root > div, .app-shell-root, .min-h-screen, #app-content {
        background-color: ${palette.bgPaper} !important;
        background-image: none !important;
      }
    `);
  }

  const getBorderRule = (color?: string, width?: string, sides?: string, defaultSide?: string) => {
    if (!color) return '';
    const w = width || '1px';
    const s = sides || defaultSide || 'all';
    if (s === 'all') return `border: ${w} solid ${color} !important;`;
    return `border-${s}: ${w} solid ${color} !important;`;
  };

  const accentHex = palette.accent || '#D97706';
  let _c = accentHex.replace('#', '');
  if (_c.length === 3) _c = _c.split('').map(x => x + x).join('');
  const _rRaw = parseInt(_c.slice(0, 2), 16);
  const _r = isNaN(_rRaw) ? 217 : _rRaw;
  const _gRaw = parseInt(_c.slice(2, 4), 16);
  const _g = isNaN(_gRaw) ? 119 : _gRaw;
  const _bRaw = parseInt(_c.slice(4, 6), 16);
  const _b = isNaN(_bRaw) ? 6 : _bRaw;
  const aStr = `${_r}, ${_g}, ${_b}`;

  const safePush = (key: string, val: string | undefined, fallback: string) => {
    rootRules.push(`--${key}: ${val || fallback} !important;`);
  };

  safePush('accent', palette.accent, '#D97706');
  safePush('ok', palette.accent, '#D97706');
  safePush('accent-hover', palette.accentHover, '#B45309');
  safePush('bg-paper', palette.bgPaper, '#FFFDF5');
  safePush('text', palette.text, '#291F18');
  safePush('text-serif', palette.textSerif, '#1B140F');
  safePush('dim', palette.dim, '#786558');
  safePush('faint', palette.faint, `rgba(${aStr}, 0.3)`);

  safePush('line', palette.line, `rgba(${aStr}, 0.18)`);
  safePush('line-soft', palette.lineSoft, `rgba(${aStr}, 0.08)`);
  safePush('line-focus', palette.lineFocus, `rgba(${aStr}, 0.5)`);
  safePush('header-bg', palette.headerBg, 'rgba(255, 253, 245, 0.92)');
  safePush('header-text', palette.headerText, '#291F18');
  safePush('header-border', palette.headerBorder, `rgba(${aStr}, 0.18)`);
  safePush('sidebar-bg', palette.sidebarBg, '#FFFDF5');
  safePush('sidebar-text', palette.sidebarText, '#291F18');
  safePush('sidebar-border', palette.sidebarBorder, `rgba(${aStr}, 0.15)`);
  safePush('card-bg', palette.cardBg, '#FFFFFF');
  safePush('card-border', palette.cardBorder, `rgba(${aStr}, 0.16)`);
  safePush('card-inner-bg', palette.cardInnerBg, `rgba(${aStr}, 0.05)`);
  safePush('card-solid-bg', palette.cardBg, '#EAE3DA');
  safePush('group-card-bg', palette.cardInnerBg || palette.cardBg, '#E5DDD3');
  safePush('jump-card-bg', palette.cardBg, '#EAE3DA');
  safePush('modal-bg', palette.modalBg, '#FFFFFF');
  safePush('modal-solid-bg', palette.modalBg || palette.cardBg, '#EAE3DA');
  safePush('modal-border', palette.modalBorder, `rgba(${aStr}, 0.2)`);
  
  safePush('btn-secondary-bg', palette.btnSecondaryBg, `rgba(${aStr}, 0.08)`);
  safePush('btn-bg', palette.btnSecondaryBg, `rgba(${aStr}, 0.08)`);
  safePush('btn-secondary-hover', palette.btnSecondaryHover, `rgba(${aStr}, 0.16)`);
  safePush('btn-secondary-text', palette.btnSecondaryText, '#291F18');
  safePush('btn-secondary-border', palette.btnSecondaryBorder, `rgba(${aStr}, 0.25)`);
  
  safePush('btn-primary-bg', undefined, `rgba(${aStr}, 0.14)`);
  safePush('btn-primary-solid-bg', palette.btnPrimaryBg, accentHex);
  safePush('btn-primary-hover', undefined, `rgba(${aStr}, 0.22)`);
  safePush('btn-primary-solid-hover', palette.btnPrimaryHover, palette.accentHover || '#B45309');
  safePush('btn-primary-text', palette.btnPrimaryText, '#FFFFFF');
  
  safePush('input-bg', palette.inputBg, 'rgba(255, 255, 255, 0.95)');
  safePush('input-border', palette.inputBorder, `rgba(${aStr}, 0.22)`);
  safePush('input-text', palette.inputText, '#291F18');
  safePush('input-focus', palette.inputFocus, accentHex);
  
  safePush('badge-bg', palette.badgeBg, `rgba(${aStr}, 0.12)`);
  safePush('badge-text', palette.badgeText, palette.accentHover || '#B45309');

  safePush('warn', palette.warn, '#D97706');
  safePush('err', palette.err, '#DC2626');
  
  if (palette.headerBg || palette.headerBorder) {
    extraRules.push(`
      header.app-header {
        ${palette.headerBg ? `background-color: ${palette.headerBg} !important;` : ''}
        ${getBorderRule(palette.headerBorder, palette.headerBorderWidth, palette.headerBorderSides, 'bottom')}
      }
    `);
  }

  if (palette.sidebarBg || palette.sidebarBorder) {
    extraRules.push(`
      aside.sidebar {
        ${palette.sidebarBg ? `background-color: ${palette.sidebarBg} !important;` : ''}
        ${getBorderRule(palette.sidebarBorder, palette.sidebarBorderWidth, palette.sidebarBorderSides, 'right')}
      }
    `);
  }

  if (palette.cardBg || palette.cardBorder) {
    extraRules.push(`
      .card-item, .flat-card, .option-block, section > .border, .bg-white:not(.modal-panel):not(.dropdown-panel):not(.file-detail-modal),
      .bg-zinc-50:not(.modal-panel):not(.dropdown-panel) {
        ${palette.cardBg ? `background-color: ${palette.cardBg} !important;` : ''}
        ${getBorderRule(palette.cardBorder, palette.cardBorderWidth, palette.cardBorderSides, 'all')}
      }
    `);
  }

  if (palette.modalBg || palette.modalBorder) {
    extraRules.push(`
      .modal-panel, .dropdown-panel, .file-detail-modal {
        ${palette.modalBg ? `background-color: ${palette.modalBg} !important;` : ''}
        ${getBorderRule(palette.modalBorder, palette.modalBorderWidth, palette.modalBorderSides, 'all')}
      }
    `);
  }
  
  
  // Background logic injected
  const bgType = palette.bgType || 'solid';
  const bgImage = palette.bgImage || '';
  const bgGradient = palette.bgGradient || '';
  const bgGradientAngle = palette.bgGradientAngle || 135;
  const bgGradientFrom = palette.bgGradientFrom || palette.bgPaper || '#FFFFFF';
  const bgGradientTo = palette.bgGradientTo || palette.bgPaper || '#FFFFFF';
  
  const bgImageStr = bgType === 'image' && bgImage ? `url(${bgImage}) center/cover no-repeat fixed` : 'none';
  const bgGradientStr = bgType === 'gradient' ? (bgGradient || `linear-gradient(${bgGradientAngle}deg, ${bgGradientFrom} 0%, ${bgGradientTo} 100%)`) : 'none';
  const bgSolidStr = palette.bgPaper || '#FFFFFF';
  const bgFinalStr = bgType === 'image' && bgImage ? bgImageStr : (bgType === 'gradient' ? bgGradientStr : bgSolidStr);
  
  extraRules.push(`
    :root {
      --app-bg-final: ${bgFinalStr};
    }
    body, .app-background {
      background: var(--app-bg-final) !important;
    }
  `);
  
  // Existing extra rules
  extraRules.push(`
    button.btn-secondary {
      background-color: var(--btn-secondary-bg) !important;
      color: var(--btn-secondary-text) !important;
      border-color: var(--btn-secondary-border) !important;
    }
    button.btn-secondary:hover {
      background-color: var(--btn-secondary-hover) !important;
    }
    /* Only override border and text for utility buttons, don't destroy their native backgrounds */
    button.border-zinc-200:not(.btn-primary):not(.bg-rose-600):not([data-primary="true"]),
    button.border-zinc-300:not(.btn-primary):not(.bg-rose-600):not([data-primary="true"]) {
      border-color: var(--btn-secondary-border) !important;
      color: var(--btn-secondary-text) !important;
    }
  `);
  
  extraRules.push(`
    button.btn-primary, button.bg-zinc-900:not(.btn-secondary):not(.btn-danger), button[data-primary="true"] {
      background-color: var(--btn-primary-solid-bg) !important;
      color: var(--btn-primary-text) !important;
      border-color: transparent !important;
    }
    button.btn-primary:hover, button.bg-zinc-900:hover:not(.btn-secondary):not(.btn-danger) {
      background-color: var(--btn-primary-solid-hover) !important;
    }
  `);
  
  extraRules.push(`
    button.btn-danger, button.bg-rose-600 {
      background-color: ${palette.btnDangerBg || '#DC2626'} !important;
      color: ${palette.btnDangerText || '#FFFFFF'} !important;
    }
    button.btn-danger:hover, button.bg-rose-600:hover {
      background-color: ${palette.btnDangerHover || '#B91C1C'} !important;
    }
  `);
  
  extraRules.push(`
    input, select, textarea, .input-bg {
      background-color: var(--input-bg) !important;
      color: var(--input-text) !important;
      border-color: var(--input-border) !important;
    }
    input:focus, select:focus, textarea:focus, .input-bg:focus-within {
      border-color: var(--input-focus) !important;
      outline: none !important;
      box-shadow: 0 0 0 2px rgba(${aStr}, 0.2) !important;
    }
  `);
  
  extraRules.push(`
    .badge, .tag, .status-badge {
      background-color: var(--badge-bg) !important;
      color: var(--badge-text) !important;
    }
  `);

  const fullCss = `
    :root, body {
      ${rootRules.join('\n      ')}
    }
    ${extraRules.join('\n')}
  `;

  styleEl.textContent = fullCss;
}
