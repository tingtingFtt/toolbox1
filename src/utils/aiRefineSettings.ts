import { AppData, AIRefineFeatureKey, AIRefineFeatureConfig, AIRefinePromptPreset, AIRefineSettings } from '../types';

export const AI_REFINE_STORAGE_KEY = 'tavern_vault_ai_refine_settings';

export const DEFAULT_AI_REFINE_SETTINGS: AIRefineSettings = {
  scope: {
    refinePersonaAndDesc: true,
    refineGreetings: true, // 开场白与备选问候语润色
    refineWorldBook: true  // 内嵌世界书条目润色
  },
  features: {
    format: {
      key: 'format',
      title: '排版与格式规范',
      description: '去除冗余连环空行与乱码，规范化字段排版与段落结构',
      enabled: true,
      activePresetIds: ['format-markdown'],
      presetType: 'prompt',
      presetTypeName: '排版提示词预设',
      presets: [
        {
          id: 'format-markdown',
          name: '酒馆标准 Markdown 规范',
          description: '段落清晰分明，规范引号、破折号与省略号，清理多余连续空行与不可见控制符',
          prompt: '【排版规范】1. 彻底清理多余的连续换行符与不可见乱码字符；2. 统一中英文符号标准，纠正全半角混用；3. 保持规范段落清晰分行，使描述条理井然、视觉舒适；4. 对话使用规范中文双引号“”，动作描写可自然分段。',
          isBuiltIn: true,
          category: '排版提示词预设',
          styleTag: '酒馆标准'
        },
        {
          id: 'format-compact',
          name: '精简紧凑卡片排版',
          description: '消除冗余虚浮修饰词，转为高度概括清晰的紧凑段落与条目结构',
          prompt: '【排版规范】将角色人设与描述进行紧凑化排版重构：消除冗赘空话，将长篇大论精简提炼为脉络分明的条理结构，保留关键事实与动作细节，方便大语言模型更敏捷准确地捕捉角色关键信息。',
          isBuiltIn: true,
          category: '排版提示词预设',
          styleTag: '紧凑高效'
        },
        {
          id: 'format-structured',
          name: '结构化条目与属性对齐',
          description: '将杂乱的设定拆解为规整的属性词条、背景、外貌、性格模块化对齐',
          prompt: '【排版规范】模块化结构重整：对杂乱的角色描述拆分为【基础信息】、【外貌特征】、【性格特点】、【背景经历】等清晰层级，使用规范小标题清晰分段。',
          isBuiltIn: true,
          category: '排版提示词预设',
          styleTag: '结构清晰'
        },
        {
          id: 'format-dialogue',
          name: '对话与动作标点规范',
          description: '统一双引号、动作括号区分、破折号与省略号标准化，提升对白可读性',
          prompt: '【排版规范】对话与动作标点标准化：1. 统一角色台词使用中文双引号“”，内心独白或心理活动规范使用小括号或斜体；2. 修正省略号为标准“……”并修复连续长横线；3. 清理首尾行异常空格与多余引号。',
          isBuiltIn: true,
          category: '排版提示词预设',
          styleTag: '标点规范'
        }
      ]
    },
    persona: {
      key: 'persona',
      title: '人设与口吻润色',
      description: '强化角色语气口吻与叙事画面感，支持多选融合文风与提示词，严守固有性格与背景锚定',
      enabled: true,
      activePresetIds: ['persona-novel'],
      presetType: 'style',
      presetTypeName: '文风与提示词预设',
      presets: [
        // --- 核心文风预设 (Writing Styles) ---
        {
          id: 'persona-novel',
          name: '细腻小说叙事风',
          description: '文学质感叙事，增强环境氛围烘托、细腻微表情与情绪流动，文字富有画面感',
          prompt: '【文风预设：细腻小说叙事风】\n[人设性格与背景锚定铁律]：严禁脱离角色的核心性格与既有设定背景！\n[润色要求]：深度丰富角色描写中的微表情、动作下意识反应与环境氛围烘托；用细腻而富有文学质感的叙述强化情绪张力，让角色的对话与举止立体生动，富有沉浸感。',
          isBuiltIn: true,
          category: '文风预设',
          styleTag: '小说叙事',
          kind: 'style'
        },
        {
          id: 'persona-anime',
          name: '动漫轻小说风',
          description: '日系ACG鲜活生动，强调标志性口癖、语调反差萌与生动元气互动',
          prompt: '【文风预设：动漫轻小说风】\n[人设性格与背景锚定铁律]：严禁脱离角色的核心性格与既有设定背景！\n[润色要求]：突出角色的标志性口癖、语调和性格反差萌（如傲娇、毒舌、天然、元气等）；对话与描写更具戏剧冲突与轻快趣味，符合日式ACG与轻小说生动鲜明的人设质感。',
          isBuiltIn: true,
          category: '文风预设',
          styleTag: '轻小说ACG',
          kind: 'style'
        },
        {
          id: 'persona-restrained',
          name: '冷峻克制硬派风',
          description: '简练凝练的短句，注重动作细节与心理暗涌，减少过度修饰，突出冷静干练',
          prompt: '【文风预设：冷峻克制硬派风】\n[人设性格与背景锚定铁律]：严禁脱离角色的核心性格与既有设定背景！\n[润色要求]：文字简短凝练，少用主观煽情修饰词，通过精准的动作细节、停顿与心理暗涌表现人设；塑造沉稳、冷冽、警惕或神秘的人物气质。',
          isBuiltIn: true,
          category: '文风预设',
          styleTag: '冷峻硬派',
          kind: 'style'
        },
        {
          id: 'persona-faithful',
          name: '原汁原味人设提纯',
          description: '严格保留原有核心性格设定，仅纠正语病语感，平滑补齐逻辑空白，忠实原作者风格',
          prompt: '【文风预设：原汁原味人设提纯】\n[人设性格与背景锚定铁律]：在绝对忠实原角色设定、语气口吻与背景故事的前提下，仅修正生硬语病、修复语句断层与补齐细节，绝不无故添加与原人设冲突的性格要素，最大程度保真原作者口吻。',
          isBuiltIn: true,
          category: '文风预设',
          styleTag: '忠实原作',
          kind: 'style'
        },
        {
          id: 'persona-classical',
          name: '古风雅韵风',
          description: '融入含蓄典雅的古风辞藻，强化契合古风设定的自称、言行礼节与古典韵致',
          prompt: '【文风预设：古风雅韵风】\n[人设性格与背景锚定铁律]：严禁脱离角色的核心性格与既有设定背景！\n[润色要求]：用词温文含蓄、辞藻清雅，契合古代江湖、世家或仙侠背景；润色人物自称（如妾身、在下、孤等）与言谈举止，展现古典风韵。',
          isBuiltIn: true,
          category: '文风预设',
          styleTag: '古风仙侠',
          kind: 'style'
        },
        {
          id: 'persona-urban',
          name: '现代都市日常风',
          description: '自然生活化节奏与生活气息，贴近现代日常对话，平实细腻自然流畅',
          prompt: '【文风预设：现代都市日常风】\n[人设性格与背景锚定铁律]：严禁脱离角色的核心性格与既有设定背景！\n[润色要求]：采用贴近现代都市日常的自然口吻，避免中二生硬词藻，生活细节生动真实，对白流畅自然，展现角色的烟火气与灵动感。',
          isBuiltIn: true,
          category: '文风预设',
          styleTag: '都市日常',
          kind: 'style'
        },
        // --- 核心提示词预设 (Functional Prompts) ---
        {
          id: 'persona-prompt-depth',
          name: '心理暗涌与行为动机强化',
          description: '深化角色的内在心理动机、下意识微动作与眼神交汇，使人设立体有深度',
          prompt: '【人设润色提示词：心理暗涌与行为动机强化】\n[人设锚定铁律]：严禁更改既有性格与背景！\n[优化要点]：1. 在人物对话与交互描写中，深挖并具象化其潜台词、微表情与情绪暗涌；2. 补全角色言行背后的性格成因与下意识防备/依恋动作；3. 增强肢体语言和目光流转细节，拒绝脸谱化单一表现。',
          isBuiltIn: true,
          category: '提示词预设',
          styleTag: '心理动机',
          kind: 'prompt'
        },
        {
          id: 'persona-prompt-tone',
          name: '口癖语调与对白张力纠偏',
          description: '校准角色说话口吻、称谓习惯与对白节奏，增强台词辨识度与戏剧张力',
          prompt: '【人设润色提示词：口癖语调与对白张力纠偏】\n[人设锚定铁律]：严禁更改既有性格与背景！\n[优化要点]：1. 针对角色每句台词进行口吻审查，确保完全契合其年龄、阅历与身份；2. 强化特征自称、标志性句尾口癖或特有停顿习惯；3. 剔除与人设不符的现代化口头禅或通用网络流行语，确保对白生动且张力十足。',
          isBuiltIn: true,
          category: '提示词预设',
          styleTag: '语调台词',
          kind: 'prompt'
        },
        {
          id: 'persona-prompt-conflict',
          name: '反差萌与性格多面性刻画',
          description: '强化外冷内热、表面强势内心柔软等反差性格细节，打破扁平单一面貌',
          prompt: '【人设润色提示词：反差萌与性格多面性刻画】\n[人设锚定铁律]：严禁更改既有性格与背景！\n[优化要点]：1. 捕捉并细腻放大角色的“反差特质”（例如：外表威严却对小动物心软、毒舌傲娇却暗中体贴）；2. 在遇到特定情境（受挫、独处、被戳中痛处）时描摹其情绪破防或不经意显露的软肋，使人物更加惹人怜爱或富有人格魅力。',
          isBuiltIn: true,
          category: '提示词预设',
          styleTag: '反差魅力',
          kind: 'prompt'
        }
      ]
    },
    tags: {
      key: 'tags',
      title: '智能特征标签',
      description: '根据人设性格与外貌背景描写，自动提炼精准标签与分类索引',
      enabled: true,
      activePresetIds: ['tags-3d'],
      presetType: 'prompt',
      presetTypeName: '标签提取提示词预设',
      presets: [
        {
          id: 'tags-3d',
          name: '三维立体特征提炼',
          description: '全面提炼核心性格 (如 #傲娇)、外观标识 (如 #白发) 与世界观题材 (如 #科幻)',
          prompt: '【标签提取提示词】从角色人设中自动提炼多维度标签：1. 核心性格特质（如 #高冷、#病娇、#腹黑、#温柔 等）；2. 核心外貌/身份标志（如 #白发、#JK、#女仆、#机娘 等）；3. 世界观题材（如 #科幻、#赛博朋克、#古风 等）。每个维度提取2-3个高识别度标签。',
          isBuiltIn: true,
          category: '标签提取提示词预设',
          styleTag: '三维全能'
        },
        {
          id: 'tags-search',
          name: '酒馆高频检索标签',
          description: '提取酒馆社区常用搜索词汇与筛选标签，极大方便卡片分类检索',
          prompt: '【标签提取提示词】提炼符合酒馆社区标准的高频搜索索引标签，偏向常用检索词汇（如 #纯爱、#剧情向、#治愈、#战斗、#多角色、#学园、#反差萌），便于快速归类与精准检索。',
          isBuiltIn: true,
          category: '标签提取提示词预设',
          styleTag: '社区高频'
        },
        {
          id: 'tags-relationship',
          name: '情感倾向与关系定位',
          description: '深度提炼角色对待 {{user}} 的态度、情感基调与互动羁绊模式',
          prompt: '【标签提取提示词】专注提取角色与用户（{{user}}）的情感互动倾向标签，如 #青梅竹马、#宿敌、#下属、#契约伙伴、#单相思、#忠诚、#敌对，明确互动初始关系。',
          isBuiltIn: true,
          category: '标签提取提示词预设',
          styleTag: '互动关系'
        }
      ]
    },
    placeholders: {
      key: 'placeholders',
      title: '宏变量与安全质检',
      description: '自动纠正 {{user}} / {{char}} 错漏与异常符号，排查死循环与穿帮风险',
      enabled: true,
      activePresetIds: ['check-macros'],
      presetType: 'prompt',
      presetTypeName: '质检规则提示词预设',
      presets: [
        {
          id: 'check-macros',
          name: '酒馆标准宏语法全面校验',
          description: '严格纠偏 {{user}}, {{char}}, <USER>, <CHAR> 等变量大小写及未闭合大括号',
          prompt: '【质检规则提示词】酒馆标准宏变量全面质检：1. 检查并纠正所有变量语法，确保规范为 {{user}} 与 {{char}}；2. 修复常见手误（如 {user}, {User}, <user>, {{User}}）；3. 检查未闭合的大括号与尖括号；4. 修复中英文双大括号混用的情况。',
          isBuiltIn: true,
          category: '质检规则提示词预设',
          styleTag: '标准宏质检'
        },
        {
          id: 'check-safety',
          name: '防穿帮与异常符号清理',
          description: '排查导致大模型指令漂移、格式崩坏的异常字符、死循环诱导与坏死控制符',
          prompt: '【质检规则提示词】提示词安全与健壮性检查：排查人设与首句中易导致大模型回复穿帮、系统指令泄露或无限复读的死循环诱导符、多余特殊控制符（如 [SYSTEM], [OOC] 格式冲突），保证卡片在各主流大模型下稳定运行。',
          isBuiltIn: true,
          category: '质检规则提示词预设',
          styleTag: '防死循环'
        }
      ]
    }
  }
};

/**
 * Get stored AI Refine settings from localStorage / appData with deep merging
 */
export function getStoredAIRefineSettings(appData?: AppData): AIRefineSettings {
  let loaded: any = null;

  try {
    const raw = localStorage.getItem(AI_REFINE_STORAGE_KEY);
    if (raw) {
      loaded = JSON.parse(raw);
    } else if (appData?.aiRefineSettings) {
      loaded = appData.aiRefineSettings;
    }
  } catch (err) {
    console.error('Failed to parse stored AI refine settings:', err);
  }

  // Deep clone default settings
  const result: AIRefineSettings = JSON.parse(JSON.stringify(DEFAULT_AI_REFINE_SETTINGS));

  if (loaded && loaded.scope) {
    result.scope = {
      refinePersonaAndDesc: typeof loaded.scope.refinePersonaAndDesc === 'boolean' ? loaded.scope.refinePersonaAndDesc : true,
      refineGreetings: typeof loaded.scope.refineGreetings === 'boolean' ? loaded.scope.refineGreetings : true,
      refineWorldBook: typeof loaded.scope.refineWorldBook === 'boolean' ? loaded.scope.refineWorldBook : true,
    };
  }

  if (loaded && loaded.features) {
    const featureKeys: AIRefineFeatureKey[] = ['format', 'persona', 'tags', 'placeholders'];
    for (const key of featureKeys) {
      if (loaded.features[key]) {
        const loadedFeature = loaded.features[key];
        result.features[key].enabled = typeof loadedFeature.enabled === 'boolean' ? loadedFeature.enabled : result.features[key].enabled;
        
        // Merge active preset IDs
        if (Array.isArray(loadedFeature.activePresetIds)) {
          const maxAllowed = getMaxPresetsForFeature(key);
          result.features[key].activePresetIds = loadedFeature.activePresetIds.slice(0, maxAllowed);
        }

        // Keep correct presetType and presetTypeName
        if (!result.features[key].presetType) {
          result.features[key].presetType = key === 'persona' ? 'style' : 'prompt';
        }
        if (!result.features[key].presetTypeName) {
          result.features[key].presetTypeName = key === 'persona' ? '文风预设' : '提示词预设';
        }

        // Merge custom presets if any
        if (Array.isArray(loadedFeature.presets)) {
          const defaultPresets = result.features[key].presets;
          const mergedPresets: AIRefinePromptPreset[] = [...defaultPresets];
          
          for (const p of loadedFeature.presets) {
            const existingIdx = mergedPresets.findIndex(m => m.id === p.id);
            if (existingIdx !== -1) {
              // Update if user modified
              mergedPresets[existingIdx] = { ...mergedPresets[existingIdx], ...p };
            } else {
              // Add custom preset
              mergedPresets.push(p);
            }
          }
          result.features[key].presets = mergedPresets;
        }
      }
    }
  }

  return result;
}

/**
 * Save AI Refine settings to localStorage and optionally appData
 */
export function saveAIRefineSettings(
  settings: AIRefineSettings,
  updateAppData?: (updater: (prev: AppData) => AppData) => void
): void {
  try {
    localStorage.setItem(AI_REFINE_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save AI refine settings to localStorage:', err);
  }

  if (updateAppData) {
    updateAppData(prev => ({
      ...prev,
      aiRefineSettings: settings
    }));
  }
}

/**
 * Maximum presets allowed per feature.
 * 智能特征标签、排版与格式规范、宏变量与安全质检支持自由多选任意多个预设
 */
export function getMaxPresetsForFeature(featureKey: AIRefineFeatureKey): number {
  if (featureKey === 'tags' || featureKey === 'format' || featureKey === 'placeholders') {
    return 99; // 自由多选很多预设
  }
  return 10; // 人设与口吻也支持多选混搭文风与提示词
}

/**
 * Toggle preset selection for a feature.
 * Supports multi-selection according to feature configuration.
 */
export function togglePresetSelection(
  currentActiveIds: string[],
  presetId: string,
  maxAllowed: number = 99
): { updatedIds: string[]; error?: string } {
  const isSelected = currentActiveIds.includes(presetId);
  if (isSelected) {
    // Unselect
    return { updatedIds: currentActiveIds.filter(id => id !== presetId) };
  }

  if (currentActiveIds.length >= maxAllowed) {
    return {
      updatedIds: currentActiveIds,
      error: `当前功能最多同时选用 ${maxAllowed} 项预设。请先取消一个已选预设。`
    };
  }

  return { updatedIds: [...currentActiveIds, presetId] };
}

/**
 * Add a custom prompt preset for a feature
 */
export function addCustomPresetToFeature(
  settings: AIRefineSettings,
  featureKey: AIRefineFeatureKey,
  preset: { name: string; prompt: string; description?: string; styleTag?: string; kind?: 'style' | 'prompt' }
): AIRefineSettings {
  const feature = settings.features[featureKey];
  if (!feature) return settings;

  const newId = `custom-${featureKey}-${Date.now()}`;
  const newPreset: AIRefinePromptPreset = {
    id: newId,
    name: preset.name.trim(),
    description: preset.description?.trim() || '',
    prompt: preset.prompt.trim(),
    isBuiltIn: false,
    category: feature.title,
    styleTag: preset.styleTag?.trim() || '自定义',
    kind: preset.kind || (featureKey === 'persona' ? 'style' : 'prompt')
  };

  const updatedPresets = [...feature.presets, newPreset];
  
  // If no active presets, auto-select this new one
  let updatedActiveIds = [...feature.activePresetIds];
  const maxAllowed = getMaxPresetsForFeature(featureKey);
  if (updatedActiveIds.length < maxAllowed) {
    updatedActiveIds.push(newId);
  }

  const updatedSettings: AIRefineSettings = {
    ...settings,
    features: {
      ...settings.features,
      [featureKey]: {
        ...feature,
        presets: updatedPresets,
        activePresetIds: updatedActiveIds.slice(0, maxAllowed)
      }
    }
  };

  return updatedSettings;
}

/**
 * Update an existing prompt preset
 */
export function updatePresetInFeature(
  settings: AIRefineSettings,
  featureKey: AIRefineFeatureKey,
  preset: AIRefinePromptPreset
): AIRefineSettings {
  const feature = settings.features[featureKey];
  if (!feature) return settings;

  const updatedPresets = feature.presets.map(p => (p.id === preset.id ? { ...p, ...preset } : p));

  return {
    ...settings,
    features: {
      ...settings.features,
      [featureKey]: {
        ...feature,
        presets: updatedPresets
      }
    }
  };
}

/**
 * Delete a prompt preset
 */
export function deletePresetFromFeature(
  settings: AIRefineSettings,
  featureKey: AIRefineFeatureKey,
  presetId: string
): AIRefineSettings {
  const feature = settings.features[featureKey];
  if (!feature) return settings;

  const updatedPresets = feature.presets.filter(p => p.id !== presetId);
  const updatedActiveIds = feature.activePresetIds.filter(id => id !== presetId);
  const maxAllowed = getMaxPresetsForFeature(featureKey);

  // If none active, fallback to first preset if available
  if (updatedActiveIds.length === 0 && updatedPresets.length > 0) {
    updatedActiveIds.push(updatedPresets[0].id);
  }

  return {
    ...settings,
    features: {
      ...settings.features,
      [featureKey]: {
        ...feature,
        presets: updatedPresets,
        activePresetIds: updatedActiveIds.slice(0, maxAllowed)
      }
    }
  };
}

/**
 * Select all presets currently filtered/available for a feature
 */
export function selectAllPresetsInFeature(
  settings: AIRefineSettings,
  featureKey: AIRefineFeatureKey,
  presetIdsToSelect: string[]
): AIRefineSettings {
  const feature = settings.features[featureKey];
  if (!feature) return settings;

  const maxAllowed = getMaxPresetsForFeature(featureKey);
  const combined = Array.from(new Set([...feature.activePresetIds, ...presetIdsToSelect]));

  return {
    ...settings,
    features: {
      ...settings.features,
      [featureKey]: {
        ...feature,
        activePresetIds: combined.slice(0, maxAllowed)
      }
    }
  };
}

/**
 * Clear all selected active presets for a feature
 */
export function clearAllPresetsInFeature(
  settings: AIRefineSettings,
  featureKey: AIRefineFeatureKey
): AIRefineSettings {
  const feature = settings.features[featureKey];
  if (!feature) return settings;

  return {
    ...settings,
    features: {
      ...settings.features,
      [featureKey]: {
        ...feature,
        activePresetIds: []
      }
    }
  };
}

/**
 * Reset a feature's presets back to factory defaults
 */
export function resetFeaturePresets(
  settings: AIRefineSettings,
  featureKey: AIRefineFeatureKey
): AIRefineSettings {
  const defaultFeature = DEFAULT_AI_REFINE_SETTINGS.features[featureKey];
  if (!defaultFeature) return settings;

  return {
    ...settings,
    features: {
      ...settings.features,
      [featureKey]: JSON.parse(JSON.stringify(defaultFeature))
    }
  };
}
