import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  Wand2, 
  ShieldCheck, 
  Tag as TagIcon, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Plus,
  Info,
  Edit3
} from 'lucide-react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { AppData, AIRefineFeatureKey, AIRefinePromptPreset, AIRefineSettings } from '../../types';
import { 
  getStoredAIRefineSettings, 
  saveAIRefineSettings, 
  togglePresetSelection,
  getMaxPresetsForFeature,
  addCustomPresetToFeature,
  updatePresetInFeature 
} from '../../utils/aiRefineSettings';

interface BatchAIRefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCardIds: string[];
  appData: AppData;
  updateAppData: (data: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSettings?: (tab?: string) => void;
}

export const BatchAIRefineModal: React.FC<BatchAIRefineModalProps> = ({
  isOpen,
  onClose,
  selectedCardIds,
  appData,
  updateAppData,
  showToast,
  onOpenSettings
}) => {
  // Settings & presets state
  const [refineSettings, setRefineSettings] = useState<AIRefineSettings>(() => getStoredAIRefineSettings(appData));
  
  // Feature toggles
  const [refineFormat, setRefineFormat] = useState(true);
  const [refinePersona, setRefinePersona] = useState(true);
  const [autoExtractTags, setAutoExtractTags] = useState(true);
  const [checkPlaceholders, setCheckPlaceholders] = useState(true);

  // Scope toggles (Persona/Desc, Greetings, WorldBook)
  const [refineScopePersonaAndDesc, setRefineScopePersonaAndDesc] = useState(true);
  const [refineScopeGreetings, setRefineScopeGreetings] = useState(true);
  const [refineScopeWorldBook, setRefineScopeWorldBook] = useState(true);
  
  // Expanded preset selector per feature
  const [expandedFeature, setExpandedFeature] = useState<AIRefineFeatureKey | null>(null);

  // Quick edit/add modal state
  const [quickEditFeatureKey, setQuickEditFeatureKey] = useState<AIRefineFeatureKey | null>(null);
  const [quickEditingPreset, setQuickEditingPreset] = useState<AIRefinePromptPreset | null>(null);
  const [isQuickNew, setIsQuickNew] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickTag, setQuickTag] = useState('');

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCardName, setCurrentCardName] = useState('');
  const [completed, setCompleted] = useState(false);
  const [refineSummary, setRefineSummary] = useState<string[]>([]);

  // Sync settings when modal opens or appData changes
  useEffect(() => {
    if (isOpen) {
      const s = getStoredAIRefineSettings(appData);
      setRefineSettings(s);
      setRefineFormat(s.features.format.enabled);
      setRefinePersona(s.features.persona.enabled);
      setAutoExtractTags(s.features.tags.enabled);
      setCheckPlaceholders(s.features.placeholders.enabled);

      if (s.scope) {
        setRefineScopePersonaAndDesc(s.scope.refinePersonaAndDesc ?? true);
        setRefineScopeGreetings(s.scope.refineGreetings ?? true);
        setRefineScopeWorldBook(s.scope.refineWorldBook ?? true);
      }
      setCompleted(false);
      setProgress(0);
    }
  }, [isOpen, appData]);

  if (!isOpen) return null;

  const selectedCards = appData.cards.filter(c => selectedCardIds.includes(c.id));
  const isSingle = selectedCards.length === 1;

  // Toggle active preset for a feature (Multi-selection enabled)
  const handleTogglePreset = (featureKey: AIRefineFeatureKey, presetId: string) => {
    const feat = refineSettings.features[featureKey];
    const maxAllowed = getMaxPresetsForFeature(featureKey);
    const { updatedIds, error } = togglePresetSelection(feat.activePresetIds, presetId, maxAllowed);

    if (error) {
      showToast?.(error, 'error');
      return;
    }

    const updated: AIRefineSettings = {
      ...refineSettings,
      features: {
        ...refineSettings.features,
        [featureKey]: {
          ...feat,
          activePresetIds: updatedIds
        }
      }
    };
    setRefineSettings(updated);
    saveAIRefineSettings(updated, updateAppData as any);
  };

  // Open quick create/edit
  const handleOpenQuickCreate = (featureKey: AIRefineFeatureKey) => {
    setQuickEditFeatureKey(featureKey);
    setQuickEditingPreset(null);
    setIsQuickNew(true);
    setQuickName('');
    setQuickPrompt('');
    setQuickTag('');
  };

  const handleOpenQuickEdit = (featureKey: AIRefineFeatureKey, preset: AIRefinePromptPreset) => {
    setQuickEditFeatureKey(featureKey);
    setQuickEditingPreset(preset);
    setIsQuickNew(false);
    setQuickName(preset.name);
    setQuickPrompt(preset.prompt);
    setQuickTag(preset.styleTag || '');
  };

  // Save quick modal
  const handleSaveQuickPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditFeatureKey || !quickName.trim() || !quickPrompt.trim()) {
      showToast?.('请填写完整名称与提示词内容', 'error');
      return;
    }

    let updated = refineSettings;
    if (isQuickNew) {
      updated = addCustomPresetToFeature(refineSettings, quickEditFeatureKey, {
        name: quickName.trim(),
        prompt: quickPrompt.trim(),
        styleTag: quickTag.trim() || '自定义'
      });
      showToast?.(`已添加提示词预设【${quickName.trim()}】`, 'success');
    } else if (quickEditingPreset) {
      updated = updatePresetInFeature(refineSettings, quickEditFeatureKey, {
        ...quickEditingPreset,
        name: quickName.trim(),
        prompt: quickPrompt.trim(),
        styleTag: quickTag.trim() || quickEditingPreset.styleTag
      });
      showToast?.(`已更新提示词预设【${quickName.trim()}】`, 'success');
    }

    setRefineSettings(updated);
    saveAIRefineSettings(updated, updateAppData as any);
    setQuickEditFeatureKey(null);
  };

  // Execute refinement with API or enhanced rules
  const handleStartRefine = async () => {
    if (selectedCards.length === 0) return;
    setIsRunning(true);
    setProgress(0);
    setCompleted(false);
    setRefineSummary([]);

    const total = selectedCards.length;
    const updatedCards = [...appData.cards];

    // Check if API is configured
    const apiUrl = localStorage.getItem('tavern_vault_default_api_url') || '';
    const apiKey = localStorage.getItem('tavern_vault_default_api_key') || '';
    const apiModel = localStorage.getItem('tavern_vault_default_api_model') || 'gpt-4o';
    const hasApi = Boolean(apiUrl && apiKey);

    // Build active prompt directives summary
    const summaryItems: string[] = [];
    if (refineFormat) {
      const activeP = refineSettings.features.format.presets.filter(p => refineSettings.features.format.activePresetIds.includes(p.id));
      summaryItems.push(`排版规范: ${activeP.map(p => p.name).join(' + ') || '基础标准'}`);
    }
    if (refinePersona) {
      const activeP = refineSettings.features.persona.presets.filter(p => refineSettings.features.persona.activePresetIds.includes(p.id));
      summaryItems.push(`文风润色: ${activeP.map(p => p.name).join(' + ') || '小说叙事风'}`);
    }
    if (autoExtractTags) {
      const activeP = refineSettings.features.tags.presets.filter(p => refineSettings.features.tags.activePresetIds.includes(p.id));
      summaryItems.push(`特征标签: ${activeP.map(p => p.name).join(' + ') || '三维特征'}`);
    }
    if (checkPlaceholders) {
      const activeP = refineSettings.features.placeholders.presets.filter(p => refineSettings.features.placeholders.activePresetIds.includes(p.id));
      summaryItems.push(`宏与质检: ${activeP.map(p => p.name).join(' + ') || '标准宏纠偏'}`);
    }
    setRefineSummary(summaryItems);

    // Active prompts for format
    const activeFormatPrompts: string[] = [];
    if (refineFormat) {
      refineSettings.features.format.presets
        .filter(p => refineSettings.features.format.activePresetIds.includes(p.id))
        .forEach(p => activeFormatPrompts.push(p.prompt));
    }

    // Active prompts for persona style (unique to persona feature)
    const activeStylePrompts: string[] = [];
    if (refinePersona) {
      refineSettings.features.persona.presets
        .filter(p => refineSettings.features.persona.activePresetIds.includes(p.id))
        .forEach(p => activeStylePrompts.push(p.prompt));
    }

    // Active prompts for tag extraction
    const activeTagPrompts: string[] = [];
    if (autoExtractTags) {
      refineSettings.features.tags.presets
        .filter(p => refineSettings.features.tags.activePresetIds.includes(p.id))
        .forEach(p => activeTagPrompts.push(p.prompt));
    }

    // Active prompts for placeholders
    const activePlaceholderPrompts: string[] = [];
    if (checkPlaceholders) {
      refineSettings.features.placeholders.presets
        .filter(p => refineSettings.features.placeholders.activePresetIds.includes(p.id))
        .forEach(p => activePlaceholderPrompts.push(p.prompt));
    }

    for (let i = 0; i < total; i++) {
      const card = selectedCards[i];
      setCurrentCardName(card.name || '未命名卡片');

      const cardIdx = updatedCards.findIndex(c => c.id === card.id);
      if (cardIdx !== -1) {
        const c = { ...updatedCards[cardIdx] };
        const raw = JSON.parse(JSON.stringify(c.rawData || {}));
        const charData = raw.data || raw;

        let desc = (charData && charData.description) || '';
        let personality = (charData && charData.personality) || '';
        let scenario = (charData && charData.scenario) || '';
        let mes = (charData && charData.first_mes) || '';
        let altGreetings: string[] = Array.isArray(charData.alternate_greetings) 
          ? [...charData.alternate_greetings] 
          : (Array.isArray(raw.alternate_greetings) ? [...raw.alternate_greetings] : []);

        let characterBook = charData.character_book || raw.character_book || c.editHistory?.character_book;
        if (characterBook) {
          characterBook = JSON.parse(JSON.stringify(characterBook));
        }

        let tags = Array.isArray(c.customTags) ? [...c.customTags] : [];

        // Helper: Clean macros and anomalous brackets
        const fixMacros = (str: string) => {
          if (!str || typeof str !== 'string') return str;
          return str
            .replace(/\{\{User\}\}/g, '{{user}}')
            .replace(/\{\{Char\}\}/g, '{{char}}')
            .replace(/\{user\}/gi, '{{user}}')
            .replace(/\{char\}/gi, '{{char}}')
            .replace(/<user>/gi, '{{user}}')
            .replace(/<char>/gi, '{{char}}')
            .replace(/｛｛user｝｝/g, '{{user}}')
            .replace(/｛｛char｝｝/g, '{{char}}');
        };

        // Helper: Clean formatting, zero-width chars, and punctuation
        const cleanFormat = (str: string) => {
          if (!str || typeof str !== 'string') return str;
          return str
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[\r\n]{3,}/g, '\n\n')
            .replace(/\.{3,}/g, '……')
            .replace(/--{1,}/g, '——')
            .trim();
        };

        // Helper: Persona and style polish respecting original tone & background
        const polishPunctuation = (str: string) => {
          if (!str || typeof str !== 'string') return str;
          const trimmed = str.trim();
          if (trimmed && !/[。！？…\.\!\?]$/.test(trimmed)) {
            return trimmed + '。';
          }
          return trimmed;
        };

        let apiSuccess = false;

        // Try calling real LLM API if configured
        if (hasApi && isSingle && (activeFormatPrompts.length > 0 || activeStylePrompts.length > 0)) {
          try {
            const cleanUrl = apiUrl.replace(/\/+$/, '');
            const endpoint = cleanUrl.endsWith('/chat/completions') ? cleanUrl : `${cleanUrl}/chat/completions`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const allPrompts = [
              ...activeFormatPrompts,
              ...activeStylePrompts,
              ...activeTagPrompts,
              ...activePlaceholderPrompts
            ];

            const systemPrompt = `You are a professional AI Character Card refiner.
【最高准则：人设与背景绝对锚定原则 (Anti-OOC Protocol)】
必须严格忠于角色的固有性格特质（Personality）与世界观背景设定（Description）。文风预设仅供修饰神态笔触、叙事镜头与说话口吻，绝对严禁脱离人设或违背背景设定！开场白与世界书润色亦须紧密贴合人物性格。

请遵循以下具体指令：
${allPrompts.join('\n\n')}

请只输出纯 JSON 格式：
{
  "description": string,
  "personality": string,
  "first_mes": string,
  "alternate_greetings": string[],
  "tags": string[]
}`;

            const userContent = JSON.stringify({
              name: c.name,
              description: refineScopePersonaAndDesc ? desc : undefined,
              personality: refineScopePersonaAndDesc ? personality : undefined,
              first_mes: refineScopeGreetings ? mes : undefined,
              alternate_greetings: refineScopeGreetings ? altGreetings : undefined,
              tags: tags
            });

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              signal: controller.signal,
              body: JSON.stringify({
                model: apiModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userContent }
                ],
                temperature: 0.65
              })
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const resData = await res.json();
              let content = resData.choices?.[0]?.message?.content || '{}';
              content = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').replace(/```$/g, '').trim();
              const parsed = JSON.parse(content);
              if (refineScopePersonaAndDesc) {
                if (parsed.description) desc = parsed.description;
                if (parsed.personality) personality = parsed.personality;
              }
              if (refineScopeGreetings) {
                if (parsed.first_mes) mes = parsed.first_mes;
                if (Array.isArray(parsed.alternate_greetings) && parsed.alternate_greetings.length > 0) {
                  altGreetings = parsed.alternate_greetings;
                }
              }
              if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
                tags = Array.from(new Set([...tags, ...parsed.tags]));
              }
              apiSuccess = true;
            }
          } catch (apiErr) {
            console.warn('API refinement fallback to smart local engine:', apiErr);
          }
        }

        // Fallback / Enhanced rule-based refinement engine
        if (!apiSuccess) {
          await new Promise(r => setTimeout(r, isSingle ? 450 : 250));

          // 1. Refine Description & Personality & Scenario (if scope enabled)
          if (refineScopePersonaAndDesc) {
            if (refineFormat) {
              desc = cleanFormat(desc);
              personality = cleanFormat(personality);
              scenario = cleanFormat(scenario);
            }
            if (checkPlaceholders) {
              desc = fixMacros(desc);
              personality = fixMacros(personality);
              scenario = fixMacros(scenario);
            }
            if (refinePersona) {
              personality = polishPunctuation(personality);
              desc = polishPunctuation(desc);
            }
          }

          // 2. Refine Greetings (first_mes & alternate_greetings) (if scope enabled)
          if (refineScopeGreetings) {
            if (refineFormat) {
              mes = cleanFormat(mes);
              altGreetings = altGreetings.map(g => cleanFormat(g));
            }
            if (checkPlaceholders) {
              mes = fixMacros(mes);
              altGreetings = altGreetings.map(g => fixMacros(g));
            }
            if (refinePersona) {
              mes = polishPunctuation(mes);
              altGreetings = altGreetings.map(g => polishPunctuation(g));
            }
          }

          // 3. Refine WorldBook (character_book entries) (if scope enabled)
          if (refineScopeWorldBook && characterBook && Array.isArray(characterBook.entries)) {
            characterBook.entries = characterBook.entries.map((entry: any) => {
              let entryContent = entry.content || '';
              let entryComment = entry.comment || '';
              if (refineFormat) {
                entryContent = cleanFormat(entryContent);
                entryComment = cleanFormat(entryComment);
              }
              if (checkPlaceholders) {
                entryContent = fixMacros(entryContent);
                entryComment = fixMacros(entryComment);
              }
              return {
                ...entry,
                content: entryContent,
                comment: entryComment
              };
            });
          }

          // 4. Auto Extract Tags
          if (autoExtractTags) {
            const dictionary = [
              '傲娇', '温柔', '病娇', '腹黑', '高冷', '热血', '无口', '机甲', '魔法', 
              '日常', '科幻', '古风', '奇幻', '学园', '治愈', '战斗', '同人', '剧情',
              '白发', '黑发', '金发', '红瞳', '蓝瞳', 'JK', '女仆', '御姐', '萝莉',
              '青梅竹马', '宿敌', '反差萌', '纯爱', '赛博朋克'
            ];
            const fullText = `${c.name} ${desc} ${personality} ${mes}`.toLowerCase();
            dictionary.forEach(kw => {
              if (fullText.includes(kw.toLowerCase()) && !tags.includes(kw)) {
                tags.push(kw);
              }
            });
            if (tags.length === 0) {
              tags.push('精修角色');
            }
          }
        }

        // ==========================================
        // 核心要求：AI精修版本直接作为该卡面的新版本进行存档
        // ==========================================
        const currentVerNum = c.activeVersionNumber || 1;
        const existingVersions = Array.isArray(c.versions) ? [...c.versions] : [];
        const highestVer = existingVersions.reduce((max, v) => Math.max(max, v.versionNumber || 0), currentVerNum);
        const nextVerNum = highestVer + 1;

        // 创建精修前的无损历史快照并归档入卡面的 versions 数组
        const currentSnapshot = {
          versionId: c.activeVersionId || `ver_${c.id}_v${currentVerNum}_${c.importedAt || c.createdAt || c.updatedAt || Date.now()}`,
          versionNumber: currentVerNum,
          versionLabel: c.activeVersionLabel || `V${currentVerNum}`,
          updatedAt: c.updatedAt || Date.now(),
          importedAt: c.importedAt || c.createdAt || c.updatedAt || Date.now(),
          fileName: c.fileName,
          changeSummary: c.currentVersionSummary || '精修前初始版本 (系统自动完整存档)',
          data: {
            name: c.name,
            charName: c.charName,
            fileName: c.fileName,
            fileType: c.fileType,
            version: c.version,
            author: c.author,
            rawData: JSON.parse(JSON.stringify(c.rawData || {})),
            coverImage: c.coverImage,
            editHistory: c.editHistory ? JSON.parse(JSON.stringify(c.editHistory)) : undefined,
            customTags: c.customTags ? [...c.customTags] : [],
            boundWorldBooks: c.boundWorldBooks ? [...c.boundWorldBooks] : [],
            boundRegexes: c.boundRegexes ? [...c.boundRegexes] : [],
            boundScripts: c.boundScripts ? [...c.boundScripts] : [],
            content: c.content
          }
        };

        const updatedVersions = [
          currentSnapshot,
          ...existingVersions.filter(v => v.versionId !== currentSnapshot.versionId)
        ];

        // 提取激活的文风预设标签（如果有）
        const activePersonaStyleNames = refineSettings.features.persona.presets
          .filter(p => refineSettings.features.persona.activePresetIds.includes(p.id))
          .map(p => p.name)
          .join('+');

        // 更新卡面至最新精修版本
        c.versions = updatedVersions;
        c.activeVersionNumber = nextVerNum;
        c.activeVersionLabel = `V${nextVerNum} (AI精修${activePersonaStyleNames ? `·${activePersonaStyleNames}` : ''})`;
        c.activeVersionId = `ver_${c.id}_v${nextVerNum}_ai_${Date.now()}`;
        c.currentVersionSummary = `AI精修新版本 [${summaryItems.join(' · ')}] (人设与背景锚定)`;
        c.customTags = tags;
        c.edited = true;
        c.updatedAt = Date.now();

        // 将精修后的新数据存入卡面的 rawData
        const newRaw = { ...raw };
        if (newRaw.data) {
          newRaw.data = {
            ...newRaw.data,
            description: desc,
            personality: personality,
            scenario: scenario,
            first_mes: mes,
            alternate_greetings: altGreetings
          };
          if (characterBook) {
            newRaw.data.character_book = characterBook;
          }
        } else {
          newRaw.description = desc;
          newRaw.personality = personality;
          newRaw.scenario = scenario;
          newRaw.first_mes = mes;
          newRaw.alternate_greetings = altGreetings;
          if (characterBook) {
            newRaw.character_book = characterBook;
          }
        }
        c.rawData = newRaw;

        // 如果存在 editHistory 也同步更新
        if (c.editHistory) {
          c.editHistory = {
            ...c.editHistory,
            description: desc,
            personality: personality,
            first_mes: mes,
            alternate_greetings: altGreetings,
            ...(characterBook ? { character_book: characterBook } : {})
          };
        }

        updatedCards[cardIdx] = c;
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    updateAppData({ ...appData, cards: updatedCards });
    setIsRunning(false);
    setCompleted(true);

    if (isSingle) {
      showToast(`已成功为角色卡 “${selectedCards[0]?.name || '未命名'}” 生成并切换至 AI 精修新版本！原版本已归档。`, 'success');
    } else {
      showToast(`成功对 ${total} 张角色卡生成 AI 精修新版本并直接存储至各卡面！`, 'success');
    }
  };

  // Helper renderer for a feature option card
  const renderFeatureCard = (
    key: AIRefineFeatureKey,
    title: string,
    desc: string,
    icon: React.ReactNode,
    checked: boolean,
    setChecked: (val: boolean) => void
  ) => {
    const feat = refineSettings.features[key];
    const isExpanded = expandedFeature === key;
    const activeCount = feat.activePresetIds.length;
    const activePresets = feat.presets.filter(p => feat.activePresetIds.includes(p.id));
    const isPersona = key === 'persona';
    const isStylePreset = feat.presetType === 'style' || isPersona;
    const presetTypeName = isPersona ? '文风/提示词' : (feat.presetTypeName || '提示词预设');

    return (
      <div
        className={`p-2.5 rounded-none border transition-all text-left space-y-2 ${
          checked
            ? 'bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] border-[var(--accent,#607E95)] ring-1 ring-[var(--line-focus,rgba(96,126,149,0.4))]'
            : 'bg-[var(--card-solid-bg,#fff)] border-[var(--line,rgba(96,126,149,0.2))] hover:border-[var(--line-focus)] opacity-85'
        }`}
      >
        {/* Main Checkbox & Header Row */}
        <div className="flex items-start justify-between gap-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none flex-1 min-w-0">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              disabled={isRunning}
              className="mt-0.5 rounded-none accent-[var(--accent,#607E95)] cursor-pointer"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[var(--text-serif,#1A232D)] flex items-center gap-1.5 flex-wrap">
                {icon}
                <span>{title}</span>
                {isPersona ? (
                  <span className="text-[8px] px-1 py-0.2 rounded-none font-semibold bg-[var(--btn-primary-bg,rgba(96,126,149,0.15))] text-[var(--accent,#607E95)] border border-[var(--accent,#607E95)]/30">
                    文风 + 提示词 (可多选)
                  </span>
                ) : (
                  <span className="text-[8px] px-1 py-0.2 rounded-none font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    提示词预设 (可多选)
                  </span>
                )}
              </div>
              <div className="text-[9px] text-[var(--dim,#647382)] mt-0.5 leading-snug line-clamp-1">
                {desc}
              </div>
            </div>
          </label>

          {/* Active Preset Count & Expand Button */}
          {checked && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setExpandedFeature(isExpanded ? null : key)}
                className={`text-[9px] px-1.5 py-0.5 rounded-none font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                  activeCount > 0
                    ? 'border-[var(--accent,#607E95)] bg-white dark:bg-zinc-900 text-[var(--accent,#607E95)]'
                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
                title={`点击展开/收起${presetTypeName}选择`}
              >
                <span>已选 {activeCount} 项</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* Selected Presets Summary Row (when not expanded) */}
        {checked && !isExpanded && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
            {activePresets.map(p => (
              <span
                key={p.id}
                className="text-[9px] px-1.5 py-0.5 bg-white dark:bg-zinc-900 border border-[var(--accent,#607E95)] text-[var(--accent,#607E95)] font-semibold flex items-center gap-1 rounded-none whitespace-nowrap"
              >
                <Check className="w-2.5 h-2.5" />
                {p.kind === 'prompt' && isPersona ? `[提示词] ${p.name}` : p.name}
              </span>
            ))}
            {activePresets.length === 0 && (
              <span className="text-[9px] text-[var(--dim,#647382)] italic">
                未选用预设 (点击右侧展开选择，支持自由多选组合)
              </span>
            )}
          </div>
        )}

        {/* Expanded Preset Selector & Management (Multi-selection enabled) */}
        {checked && isExpanded && (
          <div className="pt-2 border-t border-[var(--line,rgba(96,126,149,0.2))] space-y-2 animate-in fade-in">
            {isPersona && (
              <div className="p-1.5 bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] border border-[var(--accent,#607E95)]/30 text-[9px] text-[var(--text,#2B3540)] leading-snug">
                <strong>🛡️ 人设性格与背景绝对锚定：</strong>文风预设为人设与口吻润色独有。所有修饰必须100%符合角色既有性格与世界观背景，开场白与世界书润色亦须紧密契合，严禁 OOC。
              </div>
            )}

            <div className="flex items-center justify-between text-[9px] text-[var(--dim,#647382)] font-medium">
              <span>选择{presetTypeName} (支持自由多选组合):</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenQuickCreate(key)}
                  className="text-[9px] text-[var(--accent,#607E95)] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  新建预设
                </button>
              </div>
            </div>

            {/* Presets Chips - Scrollable with fixed max-height */}
            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {feat.presets.map(preset => {
                const isActive = feat.activePresetIds.includes(preset.id);
                const isStyleKind = preset.kind !== 'prompt' && isPersona;

                return (
                  <div
                    key={preset.id}
                    className={`flex items-center justify-between p-1.5 border transition-all text-left ${
                      isActive
                        ? 'bg-[var(--btn-primary-bg,rgba(96,126,149,0.1))] border-[var(--accent,#607E95)] shadow-2xs font-semibold'
                        : 'bg-white/60 dark:bg-zinc-900/60 border-[var(--line,rgba(96,126,149,0.15))] hover:border-[var(--line-focus)]'
                    }`}
                  >
                    <div 
                      className="min-w-0 flex-1 cursor-pointer flex items-center gap-1.5"
                      onClick={() => handleTogglePreset(key, preset.id)}
                    >
                      {/* Circle Toggle Button: Transparent inside when unchecked, filled with theme color when checked */}
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[9px] shrink-0 transition-colors ${
                        isActive 
                          ? 'border-[var(--accent,#607E95)] bg-[var(--accent,#607E95)] text-white' 
                          : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                      }`}>
                        {isActive && <Check className="w-2 h-2 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-[var(--text,#2B3540)] dark:text-zinc-200 truncate flex items-center gap-1">
                          <span>{preset.name}</span>
                          {isPersona && (
                            <span className={`text-[7px] px-1 py-0.2 rounded-none font-semibold ${
                              isStyleKind
                                ? 'bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] border border-[var(--accent,#607E95)]/30'
                                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600'
                            }`}>
                              {isStyleKind ? '文风' : '提示词'}
                            </span>
                          )}
                          {preset.styleTag && (
                            <span className="text-[8px] px-1 bg-[var(--btn-bg,rgba(226,208,188,0.45))] text-[var(--dim,#647382)]">
                              {preset.styleTag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenQuickEdit(key, preset)}
                      className="p-1 text-[var(--dim,#647382)] hover:text-[var(--accent,#607E95)] transition-colors cursor-pointer shrink-0"
                      title="修改内容"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-backdrop p-3 animate-in fade-in" role="dialog" aria-modal="true">
      <div 
        className="fixed inset-0 bg-transparent cursor-pointer"
        onClick={isRunning ? undefined : onClose}
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card relative z-10 max-h-[92vh] overflow-y-auto bg-[var(--modal-solid-bg,#E8EAEB)] text-[var(--text,#2B3540)] border border-[var(--line-focus,rgba(96,126,149,0.3))] rounded-none w-full max-w-xl p-4 sm:p-5 space-y-3.5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--modal-solid-bg, #E8EAEB)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line,rgba(96,126,149,0.18))] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-none border border-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] text-[var(--accent,#607E95)] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-serif,#1A232D)] flex items-center gap-2">
                {isSingle ? 'AI 角色卡精修' : 'AI 批量精修中心'}
                <span className="text-[9px] px-1.5 py-0.5 rounded-none border border-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] text-[var(--accent,#607E95)] font-semibold truncate max-w-[140px]">
                  {isSingle ? (selectedCards[0]?.name || '当前卡片') : `已选 ${selectedCards.length} 张`}
                </span>
              </h3>
              <p className="text-[10px] text-[var(--dim,#647382)] mt-0.5">
                {isSingle ? '智能规范当前角色卡格式、深度润色人设与自动提炼特征标签' : '智能规范格式、深度润色人设与自动提炼特征标签'}
              </p>
            </div>
          </div>
          {!isRunning && (
            <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
          )}
        </div>

        {/* Target Card Preview */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-[var(--dim,#647382)] flex items-center justify-between">
            <span>{isSingle ? '目标角色卡信息' : '选中的角色卡预览'}</span>
            <span>{isSingle ? '1 个项目' : `共 ${selectedCards.length} 个项目`}</span>
          </div>

          {isSingle && selectedCards[0] ? (
            <div className="flex items-center gap-3 p-2.5 bg-[var(--card-solid-bg,#fff)] border border-[var(--line,rgba(96,126,149,0.2))] rounded-none">
              {selectedCards[0].coverImage ? (
                <img src={selectedCards[0].coverImage} alt="" className="w-10 h-14 object-cover flex-shrink-0 border border-[var(--line,rgba(96,126,149,0.2))] rounded-none" />
              ) : (
                <div className="w-10 h-14 bg-[var(--btn-bg,rgba(226,208,188,0.45))] flex items-center justify-center text-[9px] text-[var(--dim,#647382)] border border-[var(--line,rgba(96,126,149,0.2))] flex-shrink-0 rounded-none">
                  无封面
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1 text-left">
                <div className="text-xs font-bold text-[var(--text-serif,#1A232D)] truncate">
                  {selectedCards[0].name || '未命名卡片'}
                </div>
                <div className="text-[10px] text-[var(--dim,#647382)] flex items-center gap-2">
                  <span>作者: {selectedCards[0].author || '未知'}</span>
                  <span>版本: {selectedCards[0].version || 'V1'}</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {(selectedCards[0].customTags || []).map((t, idx) => (
                    <span key={idx} className="text-[9px] px-1 py-0.2 bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] text-[var(--accent,#607E95)] border border-[var(--line-focus,rgba(96,126,149,0.3))] rounded-none whitespace-nowrap">
                      #{t}
                    </span>
                  ))}
                  {(!selectedCards[0].customTags || selectedCards[0].customTags.length === 0) && (
                    <span className="text-[9px] text-[var(--dim,#647382)]">暂无标签 (精修将自动提炼)</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {selectedCards.map(card => (
                <div 
                  key={card.id} 
                  className="flex items-center gap-1.5 px-2 py-1 bg-[var(--card-solid-bg,#fff)] border border-[var(--line,rgba(96,126,149,0.2))] rounded-none flex-shrink-0 max-w-[140px]"
                  title={card.name}
                >
                  {card.coverImage ? (
                    <img src={card.coverImage} alt="" className="w-4 h-4 object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 bg-[var(--btn-bg,rgba(226,208,188,0.45))] flex-shrink-0" />
                  )}
                  <span className="text-[10px] font-medium text-[var(--text,#2B3540)] truncate">
                    {card.name || '未命名'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refine Scope & Versioning Mode */}
        <div className="p-2.5 bg-[var(--card-solid-bg,#fff)] border border-[var(--line,rgba(96,126,149,0.2))] rounded-none space-y-2 text-left">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="text-[10px] font-bold text-[var(--text-serif,#1A232D)] flex items-center gap-1.5">
              <span>🎯 精修覆盖范围 (Scope)</span>
              <span className="text-[9px] font-normal text-[var(--dim,#647382)]">
                (润色同步作用于选中的项目)
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
              自动生成新版本直接存于卡面
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium text-[var(--text,#2B3540)] dark:text-zinc-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={refineScopePersonaAndDesc}
                onChange={e => setRefineScopePersonaAndDesc(e.target.checked)}
                disabled={isRunning}
                className="rounded-none accent-[var(--accent,#607E95)]"
              />
              <span>人设与背景 (Desc/Persona)</span>
            </label>

            <label className="flex items-center gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium text-[var(--text,#2B3540)] dark:text-zinc-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={refineScopeGreetings}
                onChange={e => setRefineScopeGreetings(e.target.checked)}
                disabled={isRunning}
                className="rounded-none accent-[var(--accent,#607E95)]"
              />
              <span>开场白与问候语 (Greetings)</span>
            </label>

            <label className="flex items-center gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium text-[var(--text,#2B3540)] dark:text-zinc-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={refineScopeWorldBook}
                onChange={e => setRefineScopeWorldBook(e.target.checked)}
                disabled={isRunning}
                className="rounded-none accent-[var(--accent,#607E95)]"
              />
              <span>内嵌世界书 (World Book)</span>
            </label>
          </div>

          <div className="text-[9px] text-[var(--dim,#647382)] leading-relaxed pt-0.5 flex items-start gap-1">
            <Info className="w-3 h-3 text-[var(--accent,#607E95)] shrink-0 mt-0.5" />
            <span>
              <strong>新版本存档政策：</strong>精修完成后将直接在该卡面创建并切换至新版本 (V+1)，原卡面历史数据自动无损归档至版本历史，可在卡片详情随时比对或一键回滚。
            </span>
          </div>
        </div>

        {/* Refine Processing Modes & Features */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-[var(--text-serif,#1A232D)] flex items-center gap-1.5">
              <span>精修处理模式与功能</span>
              <span className="text-[9px] font-normal text-[var(--dim,#647382)]">
                (各功能最多同时激活 2 项预设)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Feature 1: Format */}
            {renderFeatureCard(
              'format',
              '排版与格式规范',
              '去除冗余连环空行与乱码，规范化字段排版',
              <FileText className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />,
              refineFormat,
              setRefineFormat
            )}

            {/* Feature 2: Persona (with built-in styles) */}
            {renderFeatureCard(
              'persona',
              '人设与口吻润色',
              '强化角色语气口吻，补齐语句标点细节',
              <Wand2 className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />,
              refinePersona,
              setRefinePersona
            )}

            {/* Feature 3: Smart Tags */}
            {renderFeatureCard(
              'tags',
              '智能特征标签',
              '根据人设描写自动提炼风格与性格标签',
              <TagIcon className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />,
              autoExtractTags,
              setAutoExtractTags
            )}

            {/* Feature 4: Placeholders & Quality Check */}
            {renderFeatureCard(
              'placeholders',
              '宏变量与安全质检',
              '自动纠正 {{user}} / {{char}} 错漏与异常符号',
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />,
              checkPlaceholders,
              setCheckPlaceholders
            )}
          </div>
        </div>

        {/* Processing State / Progress */}
        {isRunning && (
          <div className="p-3 bg-[var(--card-solid-bg,#fff)] border border-[var(--line-focus,rgba(96,126,149,0.3))] rounded-none space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-[var(--accent,#607E95)]">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent,#607E95)]" />
                正在精修: {currentCardName}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-[var(--btn-bg,rgba(226,208,188,0.45))] h-2 rounded-none overflow-hidden">
              <div 
                className="bg-[var(--accent,#607E95)] h-full transition-all duration-200" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed State */}
        {completed && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-none space-y-1 text-left">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>
                {isSingle 
                  ? `精修完成！已成功对角色卡 “${selectedCards[0]?.name || ''}” 完成深度格式规范与润色。`
                  : `精修完成！已成功更新 ${selectedCards.length} 张卡片的数据设定与规范。`
                }
              </span>
            </div>
            {refineSummary.length > 0 && (
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 pl-6 flex flex-wrap gap-x-3 gap-y-0.5">
                {refineSummary.map((item, idx) => (
                  <span key={idx}>• {item}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--line,rgba(96,126,149,0.18))]">
          <div className="text-[10px] text-[var(--dim,#647382)] flex items-center gap-1">
            <span>支持在「设置 &gt; API与AI精修」中深度修改提示词</span>
          </div>

          <div className="flex items-center gap-2">
            <BaseButton
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="px-3.5 py-1 text-xs font-medium text-[var(--dim,#647382)] hover:text-[var(--text,#2B3540)] bg-[var(--card-solid-bg,#fff)] border border-[var(--line,rgba(96,126,149,0.2))] rounded-none transition-colors cursor-pointer min-h-[26px] leading-none"
            >
              {completed ? '关闭' : '取消'}
            </BaseButton>

            {!completed && (
              <BaseButton
                type="button"
                onClick={handleStartRefine}
                disabled={isRunning || (!refineFormat && !refinePersona && !autoExtractTags && !checkPlaceholders)}
                className="px-4 py-1 text-xs font-bold bg-[var(--accent,#607E95)] text-white hover:brightness-105 rounded-none border-0 border-b-2 border-b-[var(--accent-hover,#486175)] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer min-h-[26px] leading-none active:scale-95"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    精修中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    开始精修
                  </>
                )}
              </BaseButton>
            )}
          </div>
        </div>
      </div>

      {/* Quick Edit/Add Preset Mini Modal */}
      {quickEditFeatureKey && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-transparent cursor-pointer"
            onClick={() => setQuickEditFeatureKey(null)}
          />
          <div 
            className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-4 space-y-3 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />
                <span>
                  {quickEditFeatureKey === 'persona'
                    ? (isQuickNew ? '新增文风预设 (人设独有)' : `修改文风预设: ${quickEditingPreset?.name}`)
                    : (isQuickNew ? '新增提示词预设' : `修改提示词预设: ${quickEditingPreset?.name}`)
                  }
                </span>
              </h4>
              <span role="button" onClick={() => setQuickEditFeatureKey(null)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
            </div>

            {quickEditFeatureKey === 'persona' && (
              <div className="p-2 bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] border border-[var(--accent,#607E95)]/30 text-[9px] text-[var(--text,#2B3540)] leading-snug">
                <strong>🛡️ 人设性格与背景绝对锚定：</strong>文风预设用于调整角色的叙事文风、神态描摹与口吻习惯。精修与润色必须严格遵循角色的固有性格设定与世界观背景，严禁脱离人设。
              </div>
            )}

            <form onSubmit={handleSaveQuickPreset} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  {quickEditFeatureKey === 'persona' ? '文风预设名称' : '预设名称'}
                </label>
                <BaseInput
                  type="text"
                  value={quickName}
                  onChange={(e: any) => setQuickName(e.target.value)}
                  placeholder={quickEditFeatureKey === 'persona' ? "如：古风典雅 / 赛博冷硬 / 傲娇口吻" : "如：紧凑排版 / 中文引号规范"}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-none text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  风格标识 / 分类简述
                </label>
                <BaseInput
                  type="text"
                  value={quickTag}
                  onChange={(e: any) => setQuickTag(e.target.value)}
                  placeholder={quickEditFeatureKey === 'persona' ? "如：口吻润色 / 小说叙事" : "如：排版规范 / 占位符"}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  {quickEditFeatureKey === 'persona' ? '文风指导提示词 (Prompt)' : '提示词详细内容 (Prompt)'}
                </label>
                <textarea
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  rows={5}
                  placeholder={quickEditFeatureKey === 'persona' ? "在此输入文风润色指令，要求严格忠于角色固有性格与背景设定..." : "在此输入供大模型执行精修的提示词内容..."}
                  className="w-full p-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-none text-zinc-900 dark:text-zinc-100 outline-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <BaseButton
                  type="button"
                  onClick={() => setQuickEditFeatureKey(null)}
                  className="px-3 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-none cursor-pointer"
                >
                  取消
                </BaseButton>
                <BaseButton
                  type="submit"
                  className="px-4 py-1 text-xs font-bold bg-[var(--accent,#607E95)] text-white hover:brightness-105 rounded-none cursor-pointer"
                >
                  保存预设
                </BaseButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
