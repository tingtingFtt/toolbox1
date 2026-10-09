/**
 * 字体管理与多区域动态应用调度中心
 * 支持自定义字体上传、在线字体注入、多区域/多层级独立绑定、4px~40px 自定义字号及即时无刷新 CSS 变量响应
 */

export type FontCategoryKey = 'home' | 'page' | 'modal' | 'nav' | 'button' | 'code';

export type FontZoneKey =
  // 1. 主页系统
  | 'home_hero'       // 主页·一级主标题
  | 'home_section'    // 主页·二级区块大标题
  | 'home_module'     // 主页·三级条目小标题
  | 'home_desc'       // 主页·模块卡片说明正文
  // 2. 分界面与列表页
  | 'page_title'      // 分界面·顶栏页面主标题
  | 'toolbar_text'    // 分界面·工具栏与操作文字
  | 'card_title'      // 分界面·卡片标题
  | 'card_body'       // 分界面·卡片正文与辅助信息
  // 3. 详情弹窗与编辑
  | 'modal_title'     // 详情页·顶栏核心大标题
  | 'modal_subtitle'  // 详情页·表单分区块子标题
  | 'modal_body'      // 详情页·核心长文本正文
  | 'modal_meta'      // 详情页·元数据与提示文本
  // 4. 导航系统
  | 'nav_tabs'        // 横向导航栏文字
  | 'sidebar_menu'    // 侧边导航栏主菜单文字
  | 'sidebar_footer'  // 侧边导航栏底部按钮文字
  // 5. 按钮与徽章系统
  | 'btn_primary'     // 核心主要行动按键
  | 'btn_secondary'   // 次要与操作按键
  | 'btn_danger'      // 危险与警示按键
  | 'badge_tag'       // 徽章与微型标签按键
  // 6. 代码与特殊文本
  | 'mono_code';      // 等宽代码与正则文本

export interface FontZoneInfo {
  key: FontZoneKey;
  category: FontCategoryKey;
  categoryLabel: string;
  label: string;
  desc: string;
  defaultSize: number;
  defaultWeight: number;
  cssFontVar: string;
  cssSizeVar: string;
  cssColorVar: string;
  cssWeightVar: string;
}

export const FONT_ZONES: FontZoneInfo[] = [
  // 1. 主页系统
  {
    key: 'home_hero',
    category: 'home',
    categoryLabel: '1. 主页系统',
    label: '主页·一级主标题',
    desc: '首页“欢迎来到 酒馆工作台 / 小手机工作台”顶层醒目主标题',
    defaultSize: 30,
    defaultWeight: 900,
    cssFontVar: '--user-font-home-hero',
    cssSizeVar: '--user-size-home-hero',
    cssColorVar: '--user-color-home-hero',
    cssWeightVar: '--user-weight-home-hero',
  },
  {
    key: 'home_section',
    category: 'home',
    categoryLabel: '1. 主页系统',
    label: '主页·二级区块大标题',
    desc: '带有数字印章的区块大标题（如 1. SillyTavern 酒馆、2. 最近导入）',
    defaultSize: 16.5,
    defaultWeight: 700,
    cssFontVar: '--user-font-home-section',
    cssSizeVar: '--user-size-home-section',
    cssColorVar: '--user-color-home-section',
    cssWeightVar: '--user-weight-home-section',
  },
  {
    key: 'home_module',
    category: 'home',
    categoryLabel: '1. 主页系统',
    label: '主页·三级条目小标题',
    desc: '数字区块下各卡片条目小标题（如 ST 角色卡、ST 主题、普通角色卡）',
    defaultSize: 13,
    defaultWeight: 600,
    cssFontVar: '--user-font-home-module',
    cssSizeVar: '--user-size-home-module',
    cssColorVar: '--user-color-home-module',
    cssWeightVar: '--user-weight-home-module',
  },
  {
    key: 'home_desc',
    category: 'home',
    categoryLabel: '1. 主页系统',
    label: '主页·模块卡片说明正文',
    desc: '主页卡片下方的功能简介与辅助说明文字',
    defaultSize: 11,
    defaultWeight: 400,
    cssFontVar: '--user-font-home-desc',
    cssSizeVar: '--user-size-home-desc',
    cssColorVar: '--user-color-home-desc',
    cssWeightVar: '--user-weight-home-desc',
  },

  // 2. 分界面与列表页
  {
    key: 'page_title',
    category: 'page',
    categoryLabel: '2. 分界面与列表页',
    label: '分界面·顶栏页面主标题',
    desc: '角色卡库、世界书、预设等独立分页面顶部的页面大标题',
    defaultSize: 13,
    defaultWeight: 700,
    cssFontVar: '--user-font-page-title',
    cssSizeVar: '--user-size-page-title',
    cssColorVar: '--user-color-page-title',
    cssWeightVar: '--user-weight-page-title',
  },
  {
    key: 'toolbar_text',
    category: 'page',
    categoryLabel: '2. 分界面与列表页',
    label: '分界面·工具栏与操作文字',
    desc: '管理工具栏中的搜索、视图切换、批量操作文字',
    defaultSize: 12,
    defaultWeight: 500,
    cssFontVar: '--user-font-toolbar-text',
    cssSizeVar: '--user-size-toolbar-text',
    cssColorVar: '--user-color-toolbar-text',
    cssWeightVar: '--user-weight-toolbar-text',
  },
  {
    key: 'card_title',
    category: 'page',
    categoryLabel: '2. 分界面与列表页',
    label: '分界面·卡片标题',
    desc: '列表/网格中的角色名、世界书名、预设标题等',
    defaultSize: 14,
    defaultWeight: 600,
    cssFontVar: '--user-font-card-title',
    cssSizeVar: '--user-size-card-title',
    cssColorVar: '--user-color-card-title',
    cssWeightVar: '--user-weight-card-title',
  },
  {
    key: 'card_body',
    category: 'page',
    categoryLabel: '2. 分界面与列表页',
    label: '分界面·卡片正文与辅助信息',
    desc: '卡片上的作者、最后修改时间、简介摘要、词条数等',
    defaultSize: 12,
    defaultWeight: 400,
    cssFontVar: '--user-font-card-body',
    cssSizeVar: '--user-size-card-body',
    cssColorVar: '--user-color-card-body',
    cssWeightVar: '--user-weight-card-body',
  },

  // 3. 详情弹窗与编辑
  {
    key: 'modal_title',
    category: 'modal',
    categoryLabel: '3. 详情弹窗与编辑',
    label: '详情页·顶栏核心大标题',
    desc: '角色卡详情、世界书编辑弹窗顶部的核心大标题',
    defaultSize: 13,
    defaultWeight: 700,
    cssFontVar: '--user-font-modal-title',
    cssSizeVar: '--user-size-modal-title',
    cssColorVar: '--user-color-modal-title',
    cssWeightVar: '--user-weight-modal-title',
  },
  {
    key: 'modal_subtitle',
    category: 'modal',
    categoryLabel: '3. 详情弹窗与编辑',
    label: '详情页·表单分区块子标题',
    desc: '详情页内部的各配置分组标题（如角色描述、性格特征、开场白）',
    defaultSize: 11.5,
    defaultWeight: 600,
    cssFontVar: '--user-font-modal-subtitle',
    cssSizeVar: '--user-size-modal-subtitle',
    cssColorVar: '--user-color-modal-subtitle',
    cssWeightVar: '--user-weight-modal-subtitle',
  },
  {
    key: 'modal_body',
    category: 'modal',
    categoryLabel: '3. 详情弹窗与编辑',
    label: '详情页·核心长文本正文',
    desc: '角色设定描述、开场白消息、世界书词条正文等阅读区域',
    defaultSize: 11.5,
    defaultWeight: 400,
    cssFontVar: '--user-font-modal-body',
    cssSizeVar: '--user-size-modal-body',
    cssColorVar: '--user-color-modal-body',
    cssWeightVar: '--user-weight-modal-body',
  },
  {
    key: 'modal_meta',
    category: 'modal',
    categoryLabel: '3. 详情弹窗与编辑',
    label: '详情页·元数据与提示文本',
    desc: 'Token 消耗统计、字数统计、文件大小、字段说明提示',
    defaultSize: 10,
    defaultWeight: 400,
    cssFontVar: '--user-font-modal-meta',
    cssSizeVar: '--user-size-modal-meta',
    cssColorVar: '--user-color-modal-meta',
    cssWeightVar: '--user-weight-modal-meta',
  },

  // 4. 导航系统
  {
    key: 'nav_tabs',
    category: 'nav',
    categoryLabel: '4. 导航系统',
    label: '横向导航栏文字',
    desc: '所有区域的横向顶栏 Tab 切换按钮与分类标签条',
    defaultSize: 13,
    defaultWeight: 600,
    cssFontVar: '--user-font-nav-tabs',
    cssSizeVar: '--user-size-nav-tabs',
    cssColorVar: '--user-color-nav-tabs',
    cssWeightVar: '--user-weight-nav-tabs',
  },
  {
    key: 'sidebar_menu',
    category: 'nav',
    categoryLabel: '4. 导航系统',
    label: '侧边导航栏主菜单文字',
    desc: '左侧边栏各个功能页面跳转链接与分类项文字',
    defaultSize: 13,
    defaultWeight: 500,
    cssFontVar: '--user-font-sidebar-menu',
    cssSizeVar: '--user-size-sidebar-menu',
    cssColorVar: '--user-color-sidebar-menu',
    cssWeightVar: '--user-weight-sidebar-menu',
  },
  {
    key: 'sidebar_footer',
    category: 'nav',
    categoryLabel: '4. 导航系统',
    label: '侧边导航栏底部按钮文字',
    desc: '左侧边栏底部的 设置中心、导入备份数据、数据导出中心',
    defaultSize: 11,
    defaultWeight: 500,
    cssFontVar: '--user-font-sidebar-footer',
    cssSizeVar: '--user-size-sidebar-footer',
    cssColorVar: '--user-color-sidebar-footer',
    cssWeightVar: '--user-weight-sidebar-footer',
  },

  // 5. 按钮与徽章系统
  {
    key: 'btn_primary',
    category: 'button',
    categoryLabel: '5. 按钮与徽章系统',
    label: '核心主要行动按键',
    desc: '主题色实心重点按键（如命运抽卡、保存设定、新建角色）',
    defaultSize: 13,
    defaultWeight: 700,
    cssFontVar: '--user-font-btn-primary',
    cssSizeVar: '--user-size-btn-primary',
    cssColorVar: '--user-color-btn-primary',
    cssWeightVar: '--user-weight-btn-primary',
  },
  {
    key: 'btn_secondary',
    category: 'button',
    categoryLabel: '5. 按钮与徽章系统',
    label: '次要与操作按键',
    desc: '线框按钮、幽灵操作按钮（如取消、编辑、导出、重命名）',
    defaultSize: 12,
    defaultWeight: 500,
    cssFontVar: '--user-font-btn-secondary',
    cssSizeVar: '--user-size-btn-secondary',
    cssColorVar: '--user-color-btn-secondary',
    cssWeightVar: '--user-weight-btn-secondary',
  },
  {
    key: 'btn_danger',
    category: 'button',
    categoryLabel: '5. 按钮与徽章系统',
    label: '危险与警示按键',
    desc: '红色警示按键（如删除、清空、全部重置）',
    defaultSize: 12,
    defaultWeight: 600,
    cssFontVar: '--user-font-btn-danger',
    cssSizeVar: '--user-size-btn-danger',
    cssColorVar: '--user-color-btn-danger',
    cssWeightVar: '--user-weight-btn-danger',
  },
  {
    key: 'badge_tag',
    category: 'button',
    categoryLabel: '5. 按钮与徽章系统',
    label: '徽章与微型标签按键',
    desc: '卡片状态标签 Tag、版本标记、筛选指示徽章',
    defaultSize: 10,
    defaultWeight: 600,
    cssFontVar: '--user-font-badge-tag',
    cssSizeVar: '--user-size-badge-tag',
    cssColorVar: '--user-color-badge-tag',
    cssWeightVar: '--user-weight-badge-tag',
  },

  // 6. 代码与特殊文本
  {
    key: 'mono_code',
    category: 'code',
    categoryLabel: '6. 代码与特殊文本',
    label: '等宽代码与正则文本',
    desc: '正则脚本编辑区、JSON 源码查看器、宏指令变量展示块',
    defaultSize: 12,
    defaultWeight: 400,
    cssFontVar: '--user-font-mono-code',
    cssSizeVar: '--user-size-mono-code',
    cssColorVar: '--user-color-mono-code',
    cssWeightVar: '--user-weight-mono-code',
  },
];

export interface ZoneSetting {
  family?: string;
  size?: number;     // 4px ~ 40px
  color?: string;    // custom color or empty for theme default
  weight?: number;   // 100 ~ 900
}

export type ZoneConfigMap = Record<FontZoneKey, ZoneSetting>;

export interface FontItem {
  id: string;
  name: string;
  family: string;
  type: 'system' | 'builtin' | 'web' | 'uploaded';
  url?: string;
  dataUrl?: string;
  weights?: string;
  description?: string;
}

export const BUILTIN_FONTS: FontItem[] = [
  {
    id: 'system-default',
    name: '系统原生默认字体',
    family: 'var(--system-font-sans)',
    type: 'system',
    description: '跟随操作系统原生默认无衬线字体（苹方 / 微软雅黑 / Segoe UI）',
  },
  {
    id: 'chill-huosong',
    name: '寒蝉活宋体 (ZeoSeven 官方切片)',
    family: '"ChillHuoSong_F", serif',
    type: 'builtin',
    weights: '400 / 700 / 800',
    description: '具有轻度油墨溢出、活字印刷复古斑驳效果的开源宋体，支持三字重',
  },
  {
    id: 'system-serif',
    name: '系统宋体 / 明体',
    family: 'var(--system-font-serif)',
    type: 'system',
    description: '系统内置宋体（Songti SC / SimSun / Noto Serif SC）',
  },
  {
    id: 'system-mono',
    name: '系统等宽代码字体',
    family: 'var(--system-font-mono)',
    type: 'system',
    description: '适合正则与脚本编辑的代码等宽字体栈',
  },
];

const STORAGE_KEY_ZONE_SETTINGS = 'st_zone_fonts_settings_v2';
const STORAGE_KEY_CUSTOM_FONTS = 'st_custom_fonts_registry';

/**
 * 规范化字体族名称，自动处理空格、引号和 fallback
 */
export function normalizeFontFamily(rawFamily: string, fallbackName?: string): string {
  const trimmed = (rawFamily || '').trim();
  if (!trimmed) {
    if (fallbackName && fallbackName.trim()) {
      const cleanName = fallbackName.trim().replace(/["']/g, '');
      return `"${cleanName}", sans-serif`;
    }
    return '';
  }

  if (trimmed.startsWith('var(') || trimmed.startsWith('inherit') || trimmed.startsWith('initial')) {
    return trimmed;
  }

  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return trimmed;
  }

  if (trimmed.includes(',')) {
    return trimmed;
  }

  return `"${trimmed}", sans-serif`;
}

/**
 * 从 CSS 文本中智能提取 @font-face 中的 font-family 声明
 */
export function extractFontFamilyFromCss(cssText: string): string | null {
  if (!cssText) return null;
  const match = cssText.match(/font-family\s*:\s*["']?([^"';,\n\r]+)["']?/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * 智能解析网络字体输入（支持 URL、@import、<link> 标签或完整 CSS 代码）
 */
export function parseWebFontInput(input: string): { url?: string; family?: string; nameSuggestion?: string } {
  const text = (input || '').trim();
  let url = '';
  let family = '';

  const importMatch = text.match(/@import\s+(?:url\(['"]?|['"])(https?:\/\/[^'"\)]+)['"]?\)?/i);
  if (importMatch && importMatch[1]) {
    url = importMatch[1].trim();
  } else {
    const linkMatch = text.match(/href=["'](https?:\/\/[^"']+)["']/i);
    if (linkMatch && linkMatch[1]) {
      url = linkMatch[1].trim();
    } else {
      const urlMatch = text.match(/https?:\/\/[^\s"'<>\)]+/i);
      if (urlMatch && urlMatch[0]) {
        url = urlMatch[0].trim();
      }
    }
  }

  const familyMatch = text.match(/font-family\s*:\s*["']?([^"';,\n\r]+)["']?/i);
  if (familyMatch && familyMatch[1]) {
    family = familyMatch[1].trim();
  }

  let nameSuggestion = family || '';
  if (!nameSuggestion && url) {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        nameSuggestion = `网络字体 (${segments[segments.length - 1].replace(/\.css$/i, '')})`;
      }
    } catch {
      nameSuggestion = '网络自定义字体';
    }
  }

  return { url, family, nameSuggestion };
}

/**
 * 尝试通过 Fetch 动态拉取 CSS 文件并提取声明的 font-family
 */
export async function tryFetchFontFamilyFromUrl(cssUrl: string): Promise<string | null> {
  if (!cssUrl || !cssUrl.startsWith('http')) return null;
  try {
    const res = await fetch(cssUrl, { mode: 'cors' });
    if (res.ok) {
      const text = await res.text();
      const extracted = extractFontFamilyFromCss(text);
      if (extracted) return extracted;
    }
  } catch (e) {
    console.debug('Direct fetch for font-family extraction failed (likely CORS), will use fallback:', e);
  }
  return null;
}

/**
 * 构造默认的完整层级配置
 */
export function getDefaultZoneSettings(): ZoneConfigMap {
  const result: Partial<ZoneConfigMap> = {};
  FONT_ZONES.forEach((z) => {
    result[z.key] = {
      family: '',
      size: z.defaultSize,
      color: '',
      weight: z.defaultWeight,
    };
  });
  return result as ZoneConfigMap;
}

/**
 * 读取保存的区域字体详细设置
 */
export function getSavedZoneSettings(): ZoneConfigMap {
  const defaults = getDefaultZoneSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ZONE_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 如果分界面顶栏标题为旧版默认的 20px 或 18px，自动缩小至更协调紧凑的 13px
      if (parsed.page_title && (parsed.page_title.size === 20 || parsed.page_title.size === 18)) {
        parsed.page_title.size = 13;
      }
      // 如果详情页字号为旧版偏大的默认值，自动迁移至紧凑协调的新版字号
      if (parsed.modal_title && parsed.modal_title.size >= 18) {
        parsed.modal_title.size = 13;
      }
      if (parsed.modal_subtitle && parsed.modal_subtitle.size >= 13) {
        parsed.modal_subtitle.size = 11.5;
      }
      if (parsed.modal_body && parsed.modal_body.size >= 13) {
        parsed.modal_body.size = 11.5;
      }
      if (parsed.modal_meta && parsed.modal_meta.size >= 11) {
        parsed.modal_meta.size = 10;
      }
      return { ...defaults, ...parsed };
    }
    // 兼容旧版简单的 string 映射
    const oldRaw = localStorage.getItem('st_zone_fonts_config');
    if (oldRaw) {
      const oldConfig = JSON.parse(oldRaw);
      if (oldConfig.hero) defaults.home_hero.family = oldConfig.hero;
      if (oldConfig.sidebar) {
        defaults.sidebar_menu.family = oldConfig.sidebar;
        defaults.sidebar_footer.family = oldConfig.sidebar;
      }
      if (oldConfig.navbar) defaults.nav_tabs.family = oldConfig.navbar;
      if (oldConfig.body) {
        defaults.card_body.family = oldConfig.body;
        defaults.modal_body.family = oldConfig.body;
      }
      if (oldConfig.mono) defaults.mono_code.family = oldConfig.mono;
    }
  } catch (e) {
    console.warn('Failed to parse saved zone font settings:', e);
  }
  return defaults;
}

/**
 * 保存区域字体详细设置
 */
export function saveZoneSettings(settings: ZoneConfigMap) {
  try {
    localStorage.setItem(STORAGE_KEY_ZONE_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save zone font settings:', e);
  }
}

/**
 * 读取保存的用户自定义字体列表
 */
export function getSavedCustomFonts(): FontItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_FONTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse saved custom fonts:', e);
  }
  return [];
}

/**
 * 保存用户自定义字体列表
 */
export function saveCustomFonts(fonts: FontItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_FONTS, JSON.stringify(fonts));
  } catch (e) {
    console.error('Failed to save custom fonts:', e);
  }
}

/**
 * 注入自定义字体 @font-face 规则或 <link> 样式表到页面 DOM 中
 */
export function injectFontFaceRule(font: FontItem) {
  if (typeof document === 'undefined' || !font) return;

  let styleEl = document.getElementById('st-dynamic-user-fonts') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'st-dynamic-user-fonts';
    document.head.appendChild(styleEl);
  }

  if (font.type === 'uploaded' && font.dataUrl) {
    const cleanFamily = font.family.replace(/["']/g, '');
    const rule = `
@font-face {
  font-family: "${cleanFamily}";
  src: url("${font.dataUrl}") format("woff2"), url("${font.dataUrl}") format("truetype");
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
}\n`;
    if (!styleEl.textContent?.includes(cleanFamily)) {
      styleEl.textContent += rule;
    }
  } else if (font.type === 'web' && font.url) {
    const linkId = `st-webfont-${font.id}`;
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = font.url;
      document.head.appendChild(link);
    } else if (link.href !== font.url) {
      link.href = font.url;
    }
  }
}

/**
 * 将单个区域的所有设置（字体、字号、颜色、字重）写入 CSS 变量（0 刷新即时生效）
 */
export function applySingleZoneSetting(zone: FontZoneKey, setting: ZoneSetting) {
  if (typeof document === 'undefined') return;

  const zoneInfo = FONT_ZONES.find((z) => z.key === zone);
  if (!zoneInfo) return;

  const root = document.documentElement;

  // 1. Font Family
  if (setting.family && setting.family.trim()) {
    const norm = normalizeFontFamily(setting.family);
    root.style.setProperty(zoneInfo.cssFontVar, norm);
    if (zone === 'sidebar_menu') {
      root.style.setProperty('--font-sidebar', norm);
    }
  } else {
    root.style.removeProperty(zoneInfo.cssFontVar);
    if (zone === 'sidebar_menu') {
      root.style.removeProperty('--font-sidebar');
    }
  }

  // 2. Font Size (严格限制 4px ~ 40px)
  if (setting.size !== undefined && setting.size !== null) {
    const clampedSize = Math.max(4, Math.min(40, Number(setting.size)));
    root.style.setProperty(zoneInfo.cssSizeVar, `${clampedSize}px`);
  } else {
    root.style.setProperty(zoneInfo.cssSizeVar, `${zoneInfo.defaultSize}px`);
  }

  // 3. Color
  if (setting.color && setting.color.trim()) {
    root.style.setProperty(zoneInfo.cssColorVar, setting.color.trim());
  } else {
    root.style.removeProperty(zoneInfo.cssColorVar);
  }

  // 4. Weight
  if (setting.weight) {
    root.style.setProperty(zoneInfo.cssWeightVar, String(setting.weight));
  } else {
    root.style.setProperty(zoneInfo.cssWeightVar, String(zoneInfo.defaultWeight));
  }
}

/**
 * 保存并应用单个区域配置
 */
export function updateZoneSetting(zone: FontZoneKey, partialSetting: Partial<ZoneSetting>) {
  const current = getSavedZoneSettings();
  current[zone] = {
    ...current[zone],
    ...partialSetting,
  };
  // 确保字号在 4~40 之间
  if (current[zone].size !== undefined) {
    current[zone].size = Math.max(4, Math.min(40, Number(current[zone].size)));
  }
  saveZoneSettings(current);
  applySingleZoneSetting(zone, current[zone]);
}

/**
 * 重置单个区域为默认设置
 */
export function resetSingleZone(zone: FontZoneKey) {
  const defaults = getDefaultZoneSettings();
  const current = getSavedZoneSettings();
  current[zone] = { ...defaults[zone] };
  saveZoneSettings(current);
  applySingleZoneSetting(zone, current[zone]);
}

/**
 * 一键将某个字体应用到所有区域
 */
export function applyFontToAllZones(family: string) {
  const current = getSavedZoneSettings();
  FONT_ZONES.forEach((z) => {
    current[z.key].family = family ? normalizeFontFamily(family) : '';
    applySingleZoneSetting(z.key, current[z.key]);
  });
  saveZoneSettings(current);
}

/**
 * 一键重置所有区域为系统原生与初始默认值
 */
export function resetAllZonesToDefault() {
  const defaults = getDefaultZoneSettings();
  saveZoneSettings(defaults);
  FONT_ZONES.forEach((z) => {
    applySingleZoneSetting(z.key, defaults[z.key]);
  });
}

/**
 * 系统启动时初始化字体引擎
 */
export function initFontEngine() {
  if (typeof document === 'undefined') return;

  // 1. 恢复所有用户已上传/配置的自定义字体
  const customFonts = getSavedCustomFonts();
  customFonts.forEach((font) => {
    injectFontFaceRule(font);
  });

  // 2. 恢复所有区域详细样式
  const settings = getSavedZoneSettings();
  FONT_ZONES.forEach((zone) => {
    const s = settings[zone.key] || {
      family: '',
      size: zone.defaultSize,
      color: '',
      weight: zone.defaultWeight,
    };
    applySingleZoneSetting(zone.key, s);
  });
}
