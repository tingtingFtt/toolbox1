import React, { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Wand2, 
  Tag as TagIcon, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Info, 
  X,
  Sliders,
  CheckCircle2,
  BookOpen,
  MessageSquareQuote,
  Search,
  Filter,
  Layers,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from 'lucide-react';
import { BaseCard } from '../ui/BaseCard';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { AppData, AIRefineFeatureKey, AIRefinePromptPreset, AIRefineSettings } from '../../types';
import {
  getStoredAIRefineSettings,
  saveAIRefineSettings,
  togglePresetSelection,
  getMaxPresetsForFeature,
  addCustomPresetToFeature,
  updatePresetInFeature,
  deletePresetFromFeature,
  resetFeaturePresets,
  selectAllPresetsInFeature,
  clearAllPresetsInFeature
} from '../../utils/aiRefineSettings';

interface AIRefineSettingsPanelProps {
  appData: AppData;
  updateAppData?: React.Dispatch<React.SetStateAction<AppData>>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AIRefineSettingsPanel: React.FC<AIRefineSettingsPanelProps> = ({
  appData,
  updateAppData,
  showToast
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [settings, setSettings] = useState<AIRefineSettings>(() => getStoredAIRefineSettings(appData));
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<AIRefineFeatureKey>('persona');
  
  // Filter and search state for current list
  const [personaSubFilter, setPersonaSubFilter] = useState<'all' | 'style' | 'prompt'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state for Add/Edit
  const [editingPreset, setEditingPreset] = useState<AIRefinePromptPreset | null>(null);
  const [isNewPreset, setIsNewPreset] = useState(false);
  const [modalFeatureKey, setModalFeatureKey] = useState<AIRefineFeatureKey>('persona');
  
  // Form fields for editing
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formStyleTag, setFormStyleTag] = useState('');
  const [formKind, setFormKind] = useState<'style' | 'prompt'>('style');

  const currentFeature = settings.features[selectedFeatureKey];
  const isPersona = selectedFeatureKey === 'persona';
  const modalIsPersona = modalFeatureKey === 'persona';

  // Helper to persist settings
  const handlePersist = (newSettings: AIRefineSettings) => {
    setSettings(newSettings);
    saveAIRefineSettings(newSettings, updateAppData);
  };

  // Toggle scope options
  const handleScopeToggle = (key: 'refinePersonaAndDesc' | 'refineGreetings' | 'refineWorldBook', val: boolean) => {
    const updated: AIRefineSettings = {
      ...settings,
      scope: {
        refinePersonaAndDesc: settings.scope?.refinePersonaAndDesc ?? true,
        refineGreetings: settings.scope?.refineGreetings ?? true,
        refineWorldBook: settings.scope?.refineWorldBook ?? true,
        [key]: val
      }
    };
    handlePersist(updated);
    showToast?.('已更新 AI 精修范围配置', 'info');
  };

  // Toggle feature enabled status
  const handleToggleFeatureEnabled = (key: AIRefineFeatureKey) => {
    const feat = settings.features[key];
    const updated: AIRefineSettings = {
      ...settings,
      features: {
        ...settings.features,
        [key]: {
          ...feat,
          enabled: !feat.enabled
        }
      }
    };
    handlePersist(updated);
    showToast?.(`${feat.title} 精修功能已${!feat.enabled ? '启用' : '暂停'}`, 'info');
  };

  // Toggle preset selection (Multi-selection enabled)
  const handleTogglePreset = (featureKey: AIRefineFeatureKey, presetId: string) => {
    const feat = settings.features[featureKey];
    const maxAllowed = getMaxPresetsForFeature(featureKey);
    const { updatedIds, error } = togglePresetSelection(feat.activePresetIds, presetId, maxAllowed);
    
    if (error) {
      showToast?.(error, 'error');
      return;
    }

    const updated: AIRefineSettings = {
      ...settings,
      features: {
        ...settings.features,
        [featureKey]: {
          ...feat,
          activePresetIds: updatedIds
        }
      }
    };
    handlePersist(updated);
    const targetPreset = feat.presets.find(p => p.id === presetId);
    const itemKind = featureKey === 'persona' 
      ? (targetPreset?.kind === 'prompt' ? '提示词' : '文风')
      : '提示词';
    showToast?.(`已更新【${feat.title}】的启用${itemKind} (已选 ${updatedIds.length} 项)`, 'success');
  };

  // Open Edit Modal
  const handleOpenEditModal = (preset: AIRefinePromptPreset, featureKey: AIRefineFeatureKey) => {
    setEditingPreset(preset);
    setIsNewPreset(false);
    setModalFeatureKey(featureKey);
    setFormName(preset.name);
    setFormDescription(preset.description || '');
    setFormPrompt(preset.prompt);
    setFormStyleTag(preset.styleTag || '');
    setFormKind(preset.kind || (featureKey === 'persona' ? 'style' : 'prompt'));
  };

  // Open Create Modal
  const handleOpenCreateModal = (featureKey: AIRefineFeatureKey, defaultKind?: 'style' | 'prompt') => {
    setEditingPreset(null);
    setIsNewPreset(true);
    setModalFeatureKey(featureKey);
    setFormName('');
    setFormDescription('');
    setFormPrompt('');
    setFormStyleTag('');
    setFormKind(defaultKind || (featureKey === 'persona' ? (personaSubFilter === 'prompt' ? 'prompt' : 'style') : 'prompt'));
  };

  // Save Modal Form
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const typeLabel = modalIsPersona 
      ? (formKind === 'prompt' ? '人设提示词预设' : '文风预设') 
      : '提示词预设';

    if (!formName.trim()) {
      showToast?.(`请输入${typeLabel}名称`, 'error');
      return;
    }
    if (!formPrompt.trim()) {
      showToast?.(`请输入详细${typeLabel}内容`, 'error');
      return;
    }

    if (isNewPreset) {
      const updated = addCustomPresetToFeature(settings, modalFeatureKey, {
        name: formName.trim(),
        prompt: formPrompt.trim(),
        description: formDescription.trim(),
        styleTag: formStyleTag.trim() || (modalIsPersona ? (formKind === 'prompt' ? '人设提示词' : '自定义文风') : '自定义'),
        kind: modalIsPersona ? formKind : 'prompt'
      });
      handlePersist(updated);
      showToast?.(`已成功添加${typeLabel}【${formName.trim()}】`, 'success');
    } else if (editingPreset) {
      const updatedPreset: AIRefinePromptPreset = {
        ...editingPreset,
        name: formName.trim(),
        description: formDescription.trim(),
        prompt: formPrompt.trim(),
        styleTag: formStyleTag.trim() || editingPreset.styleTag,
        kind: modalIsPersona ? formKind : editingPreset.kind
      };
      const updated = updatePresetInFeature(settings, modalFeatureKey, updatedPreset);
      handlePersist(updated);
      showToast?.(`已保存修改${typeLabel}【${formName.trim()}】`, 'success');
    }

    setEditingPreset(null);
    setIsNewPreset(false);
  };

  // Delete preset
  const handleDeletePreset = (featureKey: AIRefineFeatureKey, presetId: string, name: string, isBuiltIn?: boolean) => {
    const feat = settings.features[featureKey];
    const targetPreset = feat.presets.find(p => p.id === presetId);
    const typeLabel = featureKey === 'persona' 
      ? (targetPreset?.kind === 'prompt' ? '人设提示词预设' : '文风预设') 
      : '提示词预设';
    const confirmMsg = isBuiltIn
      ? `确定要删除${typeLabel}【${name}】吗？（您可随时通过“恢复默认”重新找回）`
      : `确定要删除自定义${typeLabel}【${name}】吗？`;
    if (!window.confirm(confirmMsg)) return;
    const updated = deletePresetFromFeature(settings, featureKey, presetId);
    handlePersist(updated);
    showToast?.(`已删除${typeLabel}【${name}】`, 'info');
  };

  // Select all filtered presets
  const handleSelectAllFiltered = (presetIds: string[]) => {
    const updated = selectAllPresetsInFeature(settings, selectedFeatureKey, presetIds);
    handlePersist(updated);
    showToast?.(`已选择当前 ${presetIds.length} 项预设`, 'success');
  };

  // Clear all selections for current feature
  const handleClearAllSelected = () => {
    const updated = clearAllPresetsInFeature(settings, selectedFeatureKey);
    handlePersist(updated);
    showToast?.('已清空当前功能的所有已选预设', 'info');
  };

  // Batch delete selected presets
  const handleBatchDeleteSelected = () => {
    const feat = settings.features[selectedFeatureKey];
    const selectedIds = feat.activePresetIds;
    if (selectedIds.length === 0) return;
    const typeLabel = selectedFeatureKey === 'persona' ? '预设' : '提示词预设';
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个${typeLabel}吗？`)) return;

    let updated = settings;
    for (const id of selectedIds) {
      updated = deletePresetFromFeature(updated, selectedFeatureKey, id);
    }
    handlePersist(updated);
    showToast?.(`已批量删除 ${selectedIds.length} 个${typeLabel}`, 'info');
  };

  // Reset to default
  const handleResetFeature = (featureKey: AIRefineFeatureKey) => {
    const feat = settings.features[featureKey];
    const typeLabel = featureKey === 'persona' ? '文风预设' : '提示词预设';
    if (!window.confirm(`确定要将【${feat.title}】的${typeLabel}恢复为默认内置状态吗？`)) return;
    const updated = resetFeaturePresets(settings, featureKey);
    handlePersist(updated);
    showToast?.(`已重置【${feat.title}】${typeLabel}为默认值`, 'success');
  };

  const featureIcons: Record<AIRefineFeatureKey, React.ReactNode> = {
    format: <FileText className="w-4 h-4 text-[var(--accent,#607E95)]" />,
    persona: <Wand2 className="w-4 h-4 text-[var(--accent,#607E95)]" />,
    tags: <TagIcon className="w-4 h-4 text-[var(--accent,#607E95)]" />,
    placeholders: <ShieldCheck className="w-4 h-4 text-[var(--accent,#607E95)]" />
  };

  const featureKeys: AIRefineFeatureKey[] = ['format', 'persona', 'tags', 'placeholders'];

  return (
    <BaseCard designId="settings-ai-refine-presets-card" className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Top Header - Clickable with small triangle chevron on the far right */}
      <button 
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 p-3 sm:p-4 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-none outline-none"
      >
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent,#607E95)] shrink-0" />
            <h2 className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
              AI 角色卡精修提示词预设与文风配置
            </h2>
          </div>
          <p className="text-[10px] sm:text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
            自定义四大核心精修功能（排版格式、人设文风、智能标签、宏变量质检）的作用与预设。
            <strong className="text-[var(--accent,#607E95)] font-semibold mx-1">
              提示词预设与文风预设严格区分（文风预设为人设与口吻润色独有）
            </strong>
            ，支持按需多选启用预设组合。
          </p>
        </div>
        <div className="flex items-center justify-center shrink-0 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors ml-1">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-4">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2">
            {isPersona ? (
              <div className="flex items-center gap-1.5">
                <BaseButton
                  type="button"
                  onClick={() => handleOpenCreateModal('persona', 'style')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--accent,#607E95)] text-white text-[10px] font-bold hover:opacity-90 transition-colors shadow-xs cursor-pointer"
                  title="新建专属于人设润色的文风预设"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建文风预设</span>
                </BaseButton>
                <BaseButton
                  type="button"
                  onClick={() => handleOpenCreateModal('persona', 'prompt')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[10px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  title="新建人设口吻润色提示词预设"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建提示词</span>
                </BaseButton>
              </div>
            ) : (
              <BaseButton
                type="button"
                onClick={() => handleOpenCreateModal(selectedFeatureKey)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--accent,#607E95)] text-white text-[10px] font-bold hover:opacity-90 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建提示词预设</span>
              </BaseButton>
            )}
          </div>

      {/* Global Refinement Scope & Version Archiving Policy */}
      <div className="p-2.5 sm:p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/30 space-y-1.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--accent,#607E95)] shrink-0" />
            <span>精修作用范围与卡面新版本存档策略</span>
          </div>
          <span className="text-[8px] px-2.5 py-0.5 rounded-full bg-[var(--btn-primary-bg,rgba(96,126,149,0.15))] text-[var(--accent,#607E95)] border border-[var(--accent,#607E95)]/30 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[var(--accent,#607E95)] shrink-0" />
            精修结果将直接作为新版本存于该卡面 · 原版本自动安全归档
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Scope 1: Description / Personality */}
          <label className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-start gap-2.5 cursor-pointer hover:border-[var(--accent,#607E95)] transition-colors">
            <input 
              type="checkbox"
              checked={settings.scope?.refinePersonaAndDesc ?? true}
              onChange={(e) => handleScopeToggle('refinePersonaAndDesc', e.target.checked)}
              className="mt-0.5 accent-[var(--accent,#607E95)] cursor-pointer"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[var(--accent,#607E95)] shrink-0" />
                <span>人设与性格背景润色</span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                对角色的 Description、Personality 字段润色与排版，严格锚定固有性格
              </div>
            </div>
          </label>

          {/* Scope 2: Greetings */}
          <label className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-start gap-2.5 cursor-pointer hover:border-[var(--accent,#607E95)] transition-colors">
            <input 
              type="checkbox"
              checked={settings.scope?.refineGreetings ?? true}
              onChange={(e) => handleScopeToggle('refineGreetings', e.target.checked)}
              className="mt-0.5 accent-[var(--accent,#607E95)] cursor-pointer"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MessageSquareQuote className="w-3.5 h-3.5 text-[var(--accent,#607E95)] shrink-0" />
                <span>开场白与备选问候润色</span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                同步对首条开场白 (first_mes) 与备选问候语进行文风调校与标点纠偏
              </div>
            </div>
          </label>

          {/* Scope 3: WorldBook */}
          <label className="p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex items-start gap-2.5 cursor-pointer hover:border-[var(--accent,#607E95)] transition-colors">
            <input 
              type="checkbox"
              checked={settings.scope?.refineWorldBook ?? true}
              onChange={(e) => handleScopeToggle('refineWorldBook', e.target.checked)}
              className="mt-0.5 accent-[var(--accent,#607E95)] cursor-pointer"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[var(--accent,#607E95)] shrink-0" />
                <span>内嵌世界书条目润色</span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                对卡面内嵌世界书 (character_book) 词条设定内容进行文辞规范与宏质检
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Feature Selector Tabs (4 Main Modules) - Responsive Grid/List for mobile, tablet, desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {featureKeys.map(key => {
          const feat = settings.features[key];
          const isSelected = selectedFeatureKey === key;
          const activeCount = feat.activePresetIds.length;
          const isFeatPersona = key === 'persona';

          return (
            <div
              key={key}
              onClick={() => setSelectedFeatureKey(key)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer select-none text-left flex flex-col justify-between gap-2 ${
                isSelected 
                  ? 'bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] border-[var(--accent,#607E95)] ring-2 ring-[var(--accent,#607E95)] shadow-xs' 
                  : 'bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1.5 rounded-lg bg-white dark:bg-zinc-800 shadow-xs border shrink-0 transition-colors ${
                    isSelected ? 'border-[var(--accent,#607E95)]/50' : 'border-zinc-200 dark:border-zinc-700'
                  }`}>
                    {featureIcons[key]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {feat.title}
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                      {isFeatPersona ? `${feat.presets.length} 个文风预设` : `${feat.presets.length} 个提示词预设`}
                    </div>
                  </div>
                </div>

                <span 
                  className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-semibold shrink-0 whitespace-nowrap transition-colors ${
                    activeCount > 0 
                      ? 'bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] border border-[var(--accent,#607E95)]/40'
                      : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-500 dark:text-zinc-400'
                  }`}
                  title="当前已启用的预设数量"
                >
                  已启用 {activeCount}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {isFeatPersona ? '文风板块:' : '功能开关:'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFeatureEnabled(key);
                  }}
                  className={`text-[10px] px-2.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    feat.enabled
                      ? 'bg-[var(--accent,#607E95)] text-white hover:opacity-90 shadow-2xs'
                      : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-400'
                  }`}
                >
                  {feat.enabled ? '已启用' : '已暂停'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Feature Detail & Presets List */}
      <div className="space-y-3 pt-1">
        {/* Feature Detail Header: Row 1 has Title + Buttons on the right, Row 2 has Text Description */}
        <div className="p-2.5 sm:p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/30 space-y-2">
          {/* Row 1: Icon + Title + Status Badges + Buttons on the right of title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-xs border border-zinc-200 dark:border-zinc-700 shrink-0">
                {featureIcons[selectedFeatureKey]}
              </div>
              <h3 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {currentFeature.title}
              </h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shrink-0">
                {currentFeature.enabled ? '功能生效中' : '功能已停用'}
              </span>
              {isPersona && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[var(--btn-primary-bg,rgba(96,126,149,0.15))] text-[var(--accent,#607E95)] border border-[var(--accent,#607E95)]/30 shrink-0">
                  独有文风预设 (Writing Style)
                </span>
              )}
            </div>

            {/* Buttons placed on the right of the title */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <BaseButton
                type="button"
                onClick={() => handleResetFeature(selectedFeatureKey)}
                className="flex items-center gap-1 px-2.5 py-0 !min-h-[22px] !h-[22px] leading-[10px] text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer"
                title={`重置为此功能的内置默认预设`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>恢复默认</span>
              </BaseButton>

              {isPersona ? (
                <div className="flex items-center gap-1.5">
                  <BaseButton
                    type="button"
                    onClick={() => handleOpenCreateModal('persona', 'style')}
                    className="flex items-center gap-1 px-2.5 py-0 !min-h-[22px] !h-[22px] leading-[10px] text-[10px] font-semibold rounded-lg bg-[var(--accent,#607E95)] text-white hover:opacity-90 transition-colors shadow-xs cursor-pointer"
                    title="添加专属于人设口吻润色的文风预设"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>添加文风</span>
                  </BaseButton>
                  <BaseButton
                    type="button"
                    onClick={() => handleOpenCreateModal('persona', 'prompt')}
                    className="flex items-center gap-1 px-2.5 py-0 !min-h-[22px] !h-[22px] leading-[10px] text-[10px] font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                    title="添加人设口吻提示词预设"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>添加提示词</span>
                  </BaseButton>
                </div>
              ) : (
                <BaseButton
                  type="button"
                  onClick={() => handleOpenCreateModal(selectedFeatureKey)}
                  className="flex items-center gap-1 px-2.5 py-0 !min-h-[22px] !h-[22px] leading-[10px] text-[10px] font-semibold rounded-lg bg-[var(--accent,#607E95)] text-white hover:opacity-90 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>添加新提示词</span>
                </BaseButton>
              )}
            </div>
          </div>

          {/* Row 2: Text description and hint on a clean single line */}
          <div className="pt-1.5 space-y-1 border-t border-zinc-200/60 dark:border-zinc-800/80">
            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {currentFeature.description}
            </p>
            <div className="text-[10px] text-[var(--accent,#607E95)] flex items-center gap-1.5 font-medium leading-normal">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isPersona
                  ? `提示：点击卡片左侧圆圈即可切换多选启用。当前已选 ${currentFeature.activePresetIds.length} 项（支持文风与提示词自由混搭）。`
                  : `提示：点击卡片左侧圆圈即可多选启用。当前已选 ${currentFeature.activePresetIds.length} 项（可自由多选组合预设）。`}
              </span>
            </div>
          </div>
        </div>

        {/* Presets Cards Section: Header Toolbar + Scrollable Compact Grid */}
        <div className="space-y-2">
          {/* Controls Bar: Sub-filter (for Persona) + Multi-select buttons + Search input */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-zinc-50/80 dark:bg-zinc-800/40 p-2 sm:p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 flex-wrap">
              {isPersona ? (
                <div className="inline-flex p-0.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-700/60 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPersonaSubFilter('all')}
                    className={`px-2.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                      personaSubFilter === 'all'
                        ? 'bg-[var(--accent,#607E95)] text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    全部 ({currentFeature.presets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonaSubFilter('style')}
                    className={`flex items-center gap-1 px-2.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                      personaSubFilter === 'style'
                        ? 'bg-[var(--accent,#607E95)] text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span>文风</span>
                    <span className={`text-[10px] px-1 rounded-full ${
                      personaSubFilter === 'style'
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {currentFeature.presets.filter(p => p.kind !== 'prompt').length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonaSubFilter('prompt')}
                    className={`flex items-center gap-1 px-2.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                      personaSubFilter === 'prompt'
                        ? 'bg-[var(--accent,#607E95)] text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span>提示词</span>
                    <span className={`text-[10px] px-1 rounded-full ${
                      personaSubFilter === 'prompt'
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {currentFeature.presets.filter(p => p.kind === 'prompt').length}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                  <Layers className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />
                  <span>支持自由多选组合预设</span>
                </div>
              )}

              {/* Multi-Select Action Buttons */}
              <div className="flex items-center gap-1">
                {(() => {
                  const filteredIds = currentFeature.presets
                    .filter(preset => {
                      if (isPersona) {
                        if (personaSubFilter === 'style' && preset.kind === 'prompt') return false;
                        if (personaSubFilter === 'prompt' && preset.kind !== 'prompt') return false;
                      }
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase().trim();
                        const matchName = preset.name.toLowerCase().includes(q);
                        const matchTag = (preset.styleTag || '').toLowerCase().includes(q);
                        const matchDesc = (preset.description || '').toLowerCase().includes(q);
                        if (!matchName && !matchTag && !matchDesc) return false;
                      }
                      return true;
                    })
                    .map(p => p.id);

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSelectAllFiltered(filteredIds)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] sm:text-[10px] font-medium rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                        title="全选当前列表所有预设"
                      >
                        <CheckSquare className="w-3 h-3 text-[var(--accent,#607E95)]" />
                        <span>全选</span>
                      </button>

                      {currentFeature.activePresetIds.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={handleClearAllSelected}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] sm:text-[10px] font-medium rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                            title="清空当前已勾选的所有预设"
                          >
                            <Square className="w-3 h-3 text-zinc-400" />
                            <span>清空</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleBatchDeleteSelected}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] sm:text-[10px] font-medium rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                            title="删除已勾选的所有预设"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>删除已选</span>
                          </button>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Search & Counter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-44">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索预设名称/标签..."
                  className="w-full pl-8 pr-6 py-1 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[var(--accent,#607E95)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-[10px]"
                  >
                    ×
                  </button>
                )}
              </div>

              <span className={`text-[10px] sm:text-[10px] px-2 py-1 rounded-lg font-mono font-semibold shrink-0 whitespace-nowrap transition-colors ${
                currentFeature.activePresetIds.length > 0
                  ? 'bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] border border-[var(--accent,#607E95)]/40'
                  : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-500 dark:text-zinc-400'
              }`}>
                已选 {currentFeature.activePresetIds.length} 项
              </span>
            </div>
          </div>

          {/* Compact, Fixed-height, Scrollable Presets Grid Frame */}
          <div 
            className="max-h-[460px] overflow-y-auto pr-1 space-y-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 sm:p-2.5 bg-zinc-50/40 dark:bg-zinc-900/20 scrollbar-thin"
            style={{ overscrollBehavior: 'contain' }}
          >
            {(() => {
              const filteredPresets = currentFeature.presets.filter(preset => {
                // Check persona sub-filter
                if (isPersona) {
                  if (personaSubFilter === 'style' && preset.kind === 'prompt') return false;
                  if (personaSubFilter === 'prompt' && preset.kind !== 'prompt') return false;
                }
                // Check search query
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase().trim();
                  const matchName = preset.name.toLowerCase().includes(q);
                  const matchTag = (preset.styleTag || '').toLowerCase().includes(q);
                  const matchDesc = (preset.description || '').toLowerCase().includes(q);
                  if (!matchName && !matchTag && !matchDesc) return false;
                }
                return true;
              });

              if (filteredPresets.length === 0) {
                return (
                  <div className="py-12 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
                    <Filter className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p>没有找到匹配的预设条目</p>
                    {(searchQuery || personaSubFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setPersonaSubFilter('all');
                        }}
                        className="mt-2 text-[var(--accent,#607E95)] hover:underline font-semibold cursor-pointer"
                      >
                        清空筛选条件
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredPresets.map((preset) => {
                    const isActive = currentFeature.activePresetIds.includes(preset.id);
                    const isStyleKind = preset.kind !== 'prompt' && isPersona;

                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleTogglePreset(selectedFeatureKey, preset.id)}
                        className={`p-2.5 sm:p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-center gap-1.5 text-left select-none ${
                          isActive 
                            ? 'bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] border-[var(--accent,#607E95)] ring-1 ring-[var(--accent,#607E95)]/50 shadow-xs' 
                            : 'bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        {/* Title Row: Circle Toggle on Left + Title/Tags + Action Buttons on Far Right */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {/* Circle Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePreset(selectedFeatureKey, preset.id);
                              }}
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-[var(--accent,#607E95)] border border-[var(--accent,#607E95)] text-white shadow-xs'
                                  : 'border border-zinc-300 dark:border-zinc-600 bg-transparent hover:border-[var(--accent,#607E95)]'
                              }`}
                              title={isActive ? '点击取消选中' : '点击选择此预设'}
                            >
                              {isActive && (
                                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                              )}
                            </button>

                            {/* Preset Name */}
                            <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {preset.name}
                            </span>

                            {/* Kind Tag for Persona (Style vs Prompt) */}
                            {isPersona && (
                              <span className={`text-[10px] sm:text-[10px] px-1 py-0.2 rounded font-semibold shrink-0 ${
                                isStyleKind
                                  ? 'bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] border border-[var(--accent,#607E95)]/30'
                                  : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600'
                              }`}>
                                {isStyleKind ? '文风' : '提示词'}
                              </span>
                            )}

                            {/* Style Tag */}
                            {preset.styleTag && (
                              <span className="text-[10px] sm:text-[10px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium shrink-0">
                                {preset.styleTag}
                              </span>
                            )}

                            {/* Built-in vs Custom Badge */}
                            {preset.isBuiltIn ? (
                              <span className="text-[10px] sm:text-[10px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                                内置
                              </span>
                            ) : (
                              <span className="text-[10px] sm:text-[10px] px-1 py-0.2 rounded bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] font-medium shrink-0">
                                自定义
                              </span>
                            )}
                          </div>

                          {/* Action Buttons: Edit + Delete */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(preset, selectedFeatureKey)}
                              className="flex items-center justify-center gap-0.5 px-2.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-[10px] font-medium rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 transition-colors cursor-pointer leading-tight h-auto"
                              title="修改此预设内容"
                            >
                              <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--accent,#607E95)]" />
                              <span>修改</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePreset(selectedFeatureKey, preset.id, preset.name, preset.isBuiltIn)}
                              className="flex items-center justify-center gap-0.5 px-2.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-[10px] font-medium rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 transition-colors cursor-pointer leading-tight h-auto"
                              title="删除此预设"
                            >
                              <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span>删除</span>
                            </button>
                          </div>
                        </div>

                        {/* Description Only */}
                        {preset.description && (
                          <p className="text-[10px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 pl-5 line-clamp-1 leading-snug">
                            {preset.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Edit / Add Prompt or Style Preset Modal */}
      {(isNewPreset || editingPreset) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-transparent cursor-pointer"
            onClick={() => {
              setEditingPreset(null);
              setIsNewPreset(false);
            }}
          />
          <div 
            className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--badge-bg,rgba(217,119,6,0.12))] text-[var(--accent,#D97706)]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">
                    {modalIsPersona 
                      ? (isNewPreset 
                          ? (formKind === 'prompt' ? '添加人设提示词预设' : '添加文风预设 (人设独有)')
                          : `编辑${editingPreset?.kind === 'prompt' ? '人设提示词' : '文风预设'}: ${editingPreset?.name}`)
                      : (isNewPreset ? '添加提示词预设' : `编辑提示词预设: ${editingPreset?.name}`)}
                  </h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    所属功能板块：【{settings.features[modalFeatureKey].title}】
                  </p>
                </div>
              </div>

              <span role="button" onClick={() => {
                  setEditingPreset(null);
                  setIsNewPreset(false);
                }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            </div>

            {/* Persona Preset Type Selection (Style vs Prompt) */}
            {modalIsPersona && (
              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                    预设类型设定
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    文风专用于文辞口吻，提示词侧重动机、对白与反差细节
                  </div>
                </div>
                <div className="inline-flex p-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-[10px] shrink-0">
                  <button
                    type="button"
                    onClick={() => setFormKind('style')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      formKind === 'style'
                        ? 'bg-[var(--accent,#607E95)] text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    文风预设
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormKind('prompt')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      formKind === 'prompt'
                        ? 'bg-[var(--accent,#607E95)] text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    提示词预设
                  </button>
                </div>
              </div>
            )}

            {/* Persona Notice inside Modal */}
            {modalIsPersona && (
              <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] border border-[var(--accent,#607E95)]/30 text-[var(--text,#2B3540)] text-[10px] leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent,#607E95)] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[var(--text-serif,#1A232D)]">人设与背景锚定注意：</strong>
                  {formKind === 'style' 
                    ? '文风预设主要调整角色的辞藻质感、神态描写与口吻节奏。请确保指令中明确要求恪守角色的固有性格与背景经历，严禁脱离人设 (OOC)。' 
                    : '提示词预设用于深挖内在动机、反差萌与特定台词口癖。严禁破坏原有性格设定与核心世界观背景。'}
                </div>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {modalIsPersona ? (formKind === 'prompt' ? '人设提示词预设名称' : '文风预设名称') : '提示词预设名称'} <span className="text-rose-500">*</span>
                </label>
                <BaseInput
                  type="text"
                  value={formName}
                  onChange={(e: any) => setFormName(e.target.value)}
                  placeholder={modalIsPersona 
                    ? (formKind === 'prompt' ? "例如：傲娇反差与潜台词暗涌 / 战斗狂口吻校准" : "例如：日系轻小说萌系风 / 赛博硬汉小说风") 
                    : "例如：极致紧凑排版 / 高频纯爱标签提炼"}
                  className="w-full px-3 py-2 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[var(--accent,#607E95)] text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    {modalIsPersona ? (formKind === 'prompt' ? '提示词分类标签' : '文风分类标签') : '风格标识 / 分类标签'}
                  </label>
                  <BaseInput
                    type="text"
                    value={formStyleTag}
                    onChange={(e: any) => setFormStyleTag(e.target.value)}
                    placeholder={modalIsPersona 
                      ? (formKind === 'prompt' ? "例如：心理暗涌 / 语调纠偏" : "例如：小说叙事 / 轻小说ACG / 古风") 
                      : "例如：标准排版 / 社区索引"}
                    className="w-full px-3 py-2 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[var(--accent,#607E95)] text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    预设简要作用说明
                  </label>
                  <BaseInput
                    type="text"
                    value={formDescription}
                    onChange={(e: any) => setFormDescription(e.target.value)}
                    placeholder="简述该预设的核心侧重点与修改方向"
                    className="w-full px-3 py-2 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[var(--accent,#607E95)] text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    {modalIsPersona 
                      ? (formKind === 'prompt' ? '人设润色指令 (Prompt - 锚定人设与背景)' : '文风指导指令 (Prompt - 锚定人设与背景)') 
                      : '提示词详细内容 (Prompt)'} <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {formPrompt.length} 字符
                  </span>
                </div>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  rows={6}
                  placeholder={modalIsPersona 
                    ? (formKind === 'prompt' 
                        ? "在此输入针对角色性格、动机与对白反差的润色指导 Prompt，要求严格锚定固有背景与性格..." 
                        : "在此输入文风润色指导 Prompt，例如强调动作细节、微表情描写与环境烘托，并要求紧密贴合角色既有性格特质与故事背景...")
                    : "在此输入供大模型执行精修的详细 Prompt 指令或规则..."}
                  className="w-full p-3 text-[10px] font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-[var(--accent,#607E95)] text-zinc-900 dark:text-zinc-100 leading-relaxed outline-none"
                  required
                />
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                  {modalIsPersona 
                    ? "润色必须100%忠于角色原有性格（Personality）与世界观背景（Description），严禁产生性格偏移 (OOC)。"
                    : "支持指引大模型重点关注的排版规则、标签分类或质检纠偏规则。"}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <BaseButton
                  type="button"
                  onClick={() => {
                    setEditingPreset(null);
                    setIsNewPreset(false);
                  }}
                  className="px-3 py-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </BaseButton>

                <BaseButton
                  type="submit"
                  className="px-4 py-1.5 text-[10px] font-bold bg-[var(--accent,#607E95)] hover:opacity-90 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  保存预设
                </BaseButton>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      )}
    </BaseCard>
  );
};
