import React, { useRef } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload, Sliders , ArrowRightLeft } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';


const createStPresetTemplate = (name = '新建 ST 预设') => ({
  temperature: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  top_p: 1,
  top_k: 0,
  top_a: 0,
  min_p: 0,
  repetition_penalty: 1,
  openai_max_context: 8192,
  openai_max_tokens: 2048,
  stream_openai: true,
  prompts: [
    {
      identifier: 'main',
      name: '主提示词',
      enabled: true,
      role: 'system',
      content: '',
      injection_position: 0,
      injection_depth: 4,
      injection_order: 100,
      system_prompt: true,
      marker: false,
      forbid_overrides: false,
    },
  ],
  prompt_order: [
    {
      character_id: 100001,
      order: [{ identifier: 'main', enabled: true }],
    },
  ],
  extensions: {
    regex_scripts: [],
    tavern_helper: {
      scripts: [],
    },
  },
});

const safeStringifyPreset = (value: any) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
};

const readArrayAt = (root: any, path: string[]) => {
  let cur = root;
  for (const key of path) {
    cur = cur?.[key];
  }
  return Array.isArray(cur) ? cur : [];
};

const normalizeEmbeddedRegexScripts = (json: any) => {
  const sources = [
    readArrayAt(json, ['extensions', 'regex_scripts']),
    readArrayAt(json, ['regex_scripts']),
    readArrayAt(json, ['regexes']),
    readArrayAt(json, ['user_regexes']),
    readArrayAt(json, ['data', 'extensions', 'regex_scripts']),
  ];
  return sources.flat().filter(Boolean).map((rx: any, index: number) => {
    const scriptName = String(rx?.scriptName || rx?.script_name || rx?.name || rx?.title || `预设内嵌正则 #${index + 1}`).trim();
    const findRegex = String(rx?.findRegex ?? rx?.find_regex ?? rx?.pattern ?? rx?.regex ?? '');
    const replaceString = String(rx?.replaceString ?? rx?.replace_string ?? rx?.replacement ?? rx?.replace ?? '');
    return {
      ...rx,
      id: rx?.id || `preset_rx_${index + 1}`,
      scriptName,
      findRegex,
      replaceString,
      sourceScope: 'preset-embedded',
      sourceLabel: '预设内嵌正则',
    };
  });
};

const normalizeEmbeddedScripts = (json: any) => {
  const candidates = [
    json?.extensions?.tavern_helper?.scripts,
    json?.extensions?.scripts,
    json?.scripts,
    json?.data?.extensions?.tavern_helper?.scripts,
  ];

  const result: any[] = [];
  candidates.forEach((value) => {
    if (Array.isArray(value)) {
      result.push(...value);
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, val]) => {
        result.push({ id: key, name: key, ...(typeof val === 'object' && val !== null ? val : { content: String(val ?? '') }) });
      });
    }
  });

  return result.map((script: any, index: number) => ({
    ...script,
    id: script?.id || script?.uid || `preset_script_${index + 1}`,
    name: script?.name || script?.title || script?.id || script?.uid || `预设内嵌脚本 #${index + 1}`,
    content: typeof script?.content === 'string' ? script.content : typeof script?.script === 'string' ? script.script : safeStringifyPreset(script),
    sourceScope: 'preset-embedded',
    sourceLabel: '预设内嵌脚本',
  }));
};

const extractPromptList = (json: any) => {
  return Array.isArray(json?.prompts) ? json.prompts : [];
};

const extractPromptOrderCount = (json: any) => {
  const promptOrder = Array.isArray(json?.prompt_order) ? json.prompt_order : [];
  return promptOrder.reduce((sum: number, group: any) => sum + (Array.isArray(group?.order) ? group.order.length : 0), 0);
};

const buildPresetEntryFromJson = (json: any, fileName: string, category: string, rawText?: string): PresetEntry => {
  const cleanName = String(json?.name || json?.title || json?.preset_name || fileName.replace(/\.[^/.]+$/, '') || '未命名 ST 预设').trim();
  const regexScripts = normalizeEmbeddedRegexScripts(json);
  const embeddedScripts = normalizeEmbeddedScripts(json);
  const tags = Array.from(new Set([
    'ST预设',
    regexScripts.length > 0 ? '内嵌正则' : '',
    embeddedScripts.length > 0 ? '内嵌脚本' : '',
  ].filter(Boolean)));

  return {
    id: 'preset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: cleanName,
    title: cleanName,
    fileName,
    author: json?.author || json?.creator || json?.user || '',
    category,
    customTags: tags,
    source: json?.source || json?.url || json?.dc || '',
    description: json?.description || json?.notes || json?.comment || '',
    jsonData: json,
    settings: json,
    rawJsonString: rawText || safeStringifyPreset(json),
    regexScripts,
    embeddedScripts,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    importedAt: Date.now(),
  } as PresetEntry;
};

const getPresetJson = (preset: any) => preset?.jsonData || preset?.settings || {};

export const STPresetsSection = (props: any) => {
    const {
        appData,
  presetTagsFilter = [],
  setpresetTagsFilter = () => {}, updateAppData, showToast, 
        setPresetBatchMode, setPresetCategoryFilter, MoreHorizontal, setPresetEntrySearchQuery, setManagingPresetGroup, setPresetSearchQuery, handleBatchDeletePresets, presetCategoryFilter, Circle, FolderPlus, setRenamePresetGroupInput, setPresetSortOrder, presetsList, CheckSquare, sortItemList, selectedPresetIds, setShowPresetBatchMoveModal, presetBatchMode, presetSearchQuery, presetSortOrder, Move, setEditingPresetTab, setSelectedPresetIds, setEditingPreset, filteredPresets, setShowNewPresetGroupModal, ArrowUpDown,
        presetFileInputRef,
        handlePresetFileUpload
    } = props;

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<any | null>(null);
  const [detailTab, setDetailTab] = React.useState<'details' | 'prompts' | 'regex' | 'scripts' | 'versions' | 'json'>('details');
  const [jsonDraft, setJsonDraft] = React.useState('');
  const customTags = appData.presetTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    if (presetFileInputRef?.current) {
      presetFileInputRef.current.click();
    } else if (localFileInputRef.current) {
      localFileInputRef.current.click();
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (handlePresetFileUpload) {
        handlePresetFileUpload(e.target.files);
      } else {
        const fileArray = Array.from(e.target.files);
        const category = presetCategoryFilter !== '全部分组' ? presetCategoryFilter : '默认';
        const newEntries: PresetEntry[] = [];

        Promise.all(fileArray.map(async (file) => {
          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            newEntries.push(buildPresetEntryFromJson(parsed, file.name, category, text));
          } catch (err) {
            showToast(`无法解析预设文件：${file.name}`, 'error');
          }
        })).then(() => {
          if (newEntries.length > 0) {
            updateAppData((prev: any) => {
              const nextTags = new Set([...(prev.presetTags || [])]);
              newEntries.forEach((entry) => (entry.customTags || []).forEach((tag) => nextTags.add(tag)));
              return {
                ...prev,
                presets: [...(prev.presets || []), ...newEntries],
                presetTags: Array.from(nextTags),
              };
            });
            const rxCount = newEntries.reduce((sum, item: any) => sum + (item.regexScripts?.length || 0), 0);
            const scriptCount = newEntries.reduce((sum, item: any) => sum + (item.embeddedScripts?.length || 0), 0);
            showToast(`成功导入 ${newEntries.length} 个 ST 预设（内嵌正则 ${rxCount} 条，内嵌脚本 ${scriptCount} 条）`, 'success');
          } else {
            showToast('未识别到有效的预设文档', 'error');
          }
        });
      }
      e.target.value = '';
    }
  };

  const openPresetDetail = (preset: any, tab: 'details' | 'prompts' | 'regex' | 'scripts' | 'versions' | 'json' = 'details') => {
    const normalized = {
      ...preset,
      jsonData: getPresetJson(preset),
      regexScripts: preset.regexScripts || normalizeEmbeddedRegexScripts(getPresetJson(preset)),
      embeddedScripts: preset.embeddedScripts || normalizeEmbeddedScripts(getPresetJson(preset)),
    };
    setActivePreset(normalized);
    setJsonDraft(safeStringifyPreset(normalized.jsonData));
    setDetailTab(tab);
  };

  const restorePresetVersion = (version: any) => {
    if (!activePreset || !version?.data) return;
    const restoredJson = version.data.jsonData || {};
    const regexScripts = version.data.regexScripts || normalizeEmbeddedRegexScripts(restoredJson);
    const embeddedScripts = version.data.embeddedScripts || normalizeEmbeddedScripts(restoredJson);
    const currentSnapshot = {
      versionId: 'prever_' + activePreset.id + '_' + Date.now(),
      versionNumber: (activePreset.versions?.length || 0) + 1,
      versionLabel: activePreset.activeVersionLabel || '当前版本',
      updatedAt: activePreset.updatedAt || Date.now(),
      fileName: activePreset.fileName,
      changeSummary: '还原版本前自动保存当前快照',
      data: {
        name: activePreset.name,
        fileName: activePreset.fileName,
        rawJsonString: activePreset.rawJsonString,
        jsonData: activePreset.jsonData,
        regexScripts: activePreset.regexScripts || [],
        embeddedScripts: activePreset.embeddedScripts || [],
      },
    };
    const restoredPreset = {
      ...activePreset,
      name: version.data.name || activePreset.name,
      fileName: version.data.fileName || activePreset.fileName,
      jsonData: restoredJson,
      settings: restoredJson,
      rawJsonString: version.data.rawJsonString || safeStringifyPreset(restoredJson),
      regexScripts,
      embeddedScripts,
      activeVersionNumber: version.versionNumber,
      activeVersionLabel: version.versionLabel || `v${version.versionNumber}`,
      activeVersionId: version.versionId,
      currentVersionSummary: `已还原至 ${version.versionLabel || `v${version.versionNumber}`}`,
      updatedAt: Date.now(),
      versions: [currentSnapshot, ...(activePreset.versions || []).filter((item: any) => item.versionId !== version.versionId)],
    };
    setActivePreset(restoredPreset);
    setJsonDraft(safeStringifyPreset(restoredJson));
    setDetailTab('details');
    updateAppData((prev: any) => ({
      ...prev,
      presets: (prev.presets || []).map((item: any) => item.id === restoredPreset.id ? restoredPreset : item),
    }));
    showToast('预设版本已还原', 'success');
  };

  const saveActivePreset = () => {
    if (!activePreset) return;
    let parsedJson = activePreset.jsonData || {};
    if (detailTab === 'json') {
      try {
        parsedJson = JSON.parse(jsonDraft || '{}');
      } catch {
        showToast('JSON 格式不正确，无法保存', 'error');
        return;
      }
    }

    const regexScripts = normalizeEmbeddedRegexScripts(parsedJson);
    const embeddedScripts = normalizeEmbeddedScripts(parsedJson);
    const exists = (appData.presets || []).some((item: any) => item.id === activePreset.id);
    const currentVersions = activePreset.versions || [];
    const prevSnapshot = exists ? {
      versionId: 'prever_' + activePreset.id + '_' + Date.now(),
      versionNumber: currentVersions.length + 1,
      versionLabel: activePreset.activeVersionLabel || `v${currentVersions.length + 1}`,
      updatedAt: activePreset.updatedAt || Date.now(),
      fileName: activePreset.fileName,
      changeSummary: '保存修改前自动快照',
      data: {
        name: activePreset.name,
        fileName: activePreset.fileName,
        rawJsonString: activePreset.rawJsonString,
        jsonData: activePreset.jsonData,
        regexScripts: activePreset.regexScripts || [],
        embeddedScripts: activePreset.embeddedScripts || [],
      },
    } : null;
    const updatedPreset = {
      ...activePreset,
      jsonData: parsedJson,
      settings: parsedJson,
      regexScripts,
      embeddedScripts,
      rawJsonString: safeStringifyPreset(parsedJson),
      activeVersionNumber: exists ? currentVersions.length + 2 : 1,
      activeVersionLabel: exists ? `v${currentVersions.length + 2}` : 'v1',
      activeVersionId: 'current',
      currentVersionSummary: exists ? '手动保存修改' : '新建预设',
      versions: prevSnapshot ? [prevSnapshot, ...currentVersions] : currentVersions,
      customTags: Array.from(new Set([
        ...(activePreset.customTags || []),
        'ST预设',
        regexScripts.length > 0 ? '内嵌正则' : '',
        embeddedScripts.length > 0 ? '内嵌脚本' : '',
      ].filter(Boolean))),
      updatedAt: Date.now(),
    };

    updateAppData((prev: any) => {
      const exists = (prev.presets || []).some((item: any) => item.id === updatedPreset.id);
      const nextTags = new Set([...(prev.presetTags || [])]);
      (updatedPreset.customTags || []).forEach((tag: string) => nextTags.add(tag));
      return {
        ...prev,
        presets: exists
          ? (prev.presets || []).map((item: any) => item.id === updatedPreset.id ? updatedPreset : item)
          : [...(prev.presets || []), updatedPreset],
        presetTags: Array.from(nextTags),
      };
    });
    setActivePreset(updatedPreset);
    setJsonDraft(safeStringifyPreset(parsedJson));
    showToast('ST 预设已保存', 'success');
  };

  const handleCreateNewPreset = () => {
    const json = createStPresetTemplate('新建 ST 预设');
    const category = presetCategoryFilter !== '全部分组' ? presetCategoryFilter : '默认';
    const newEntry = buildPresetEntryFromJson(json, '新建 ST 预设.json', category, safeStringifyPreset(json));
    openPresetDetail(newEntry, 'details');
    showToast('已按 ST 预设模板创建草稿，保存后加入列表', 'info');
  };

  return (
        <div className="max-w-7xl mx-auto space-y-4">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={localFileInputRef}
                  multiple
                  accept=".json,.txt,.docx"
                  className="hidden"
                  onChange={handleLocalFileChange}
                />

                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <div className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">ST 采样与预设</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.json (SillyTavern 预设) / .txt / .docx
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              管理采样参数、提示词模板、Prompt 预设配置文件与上下文生成设置
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
                      type="button"
                      onClick={triggerUpload}
                      className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
                      title="导入 ST 预设文档 (.json, .txt, .docx)"
                    >
                      <Upload className="w-3 h-3" />
                      <span>导入预设文档</span>
                    </button>
          <button
                      type="button"
                      onClick={handleCreateNewPreset}
                      className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新建预设</span>
                    </button>
        </div>
      </div>

                {/* Search Bar & Category Group Bar */}
                <div className="space-y-2.5 mb-6">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={presetSearchQuery}
                      onChange={(e: any) => setPresetSearchQuery(e.target.value)}
                      placeholder="搜索预设文件名、作者、分类或内容..."
                      className="w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', ...(appData.presetCategories || [])]))}
                      currentGroup={presetCategoryFilter}
                      onSelectGroup={setPresetCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={presetTagsFilter}
                      onChange={setpresetTagsFilter}
                    />
                    <CustomSelect
                      value={presetSortOrder}
                      onChange={(val) => setPresetSortOrder(val)}
                      options={[
                        { value: 'default', label: '默认排序' },
                        { value: 'az', label: '名称 A-Z' },
                        { value: 'za', label: '名称 Z-A' },
                        { value: 'newest', label: '最新添加' },
                        { value: 'oldest', label: '最早添加' },
                      ]}
                      icon={<ArrowUpDown className="w-3.5 h-3.5" />}
                      className="h-[30px] px-2.5 rounded-lg bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer active:bg-black/10 dark:active:bg-white/15"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setPresetBatchMode((prev: any) => {
                          if (prev) setSelectedPresetIds([]);
                          return !prev;
                        });
                      }}
                      title={presetBatchMode ? '退出批量选择' : '开启多选模式'}
                      className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                        presetBatchMode
                          ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                          : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span className="leading-none">{presetBatchMode ? '完成' : '选择'}</span>
                    </button>
                  </div>

                  {/* Group Navigation Bar & Actions */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 w-full">
                    <GroupCategoryBar 
                      groups={Array.from(new Set(['默认', ...(appData.presetCategories || [])]))} 
                      currentGroup={presetCategoryFilter} 
                      onSelectGroup={setPresetCategoryFilter} 
                      getCount={(g) => (appData.presets || []).filter((c: any) => (c.category || '默认') === g).length} 
                      totalCount={appData.presets?.length || 0} 
                      allGroupName="全部分组" onDeleteGroup={(g) => { setManagingPresetGroup(g); /* trigger delete modal later via App.tsx logic */ }} />
                  </div>
                </div>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {presetBatchMode && (
                  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
                    <div className="batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]">
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedPresetIds.length} 项
                        </span>
                        <span role="button" onClick={() => {
                            setPresetBatchMode(false);
                            setSelectedPresetIds([]);
                          }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
                      </div>
                      
                                  {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              {/* 全选 / 取消 */}
              <button
                type="button"
                onClick={() => {
                  if (selectedPresetIds.length === filteredPresets.length && filteredPresets.length > 0) {
                    setSelectedPresetIds([]);
                  } else {
                    setSelectedPresetIds(filteredPresets.map((c: any) => c.id));
                  }
                }}
                className="batch-btn"
              >
                {selectedPresetIds.length === filteredPresets.length && filteredPresets.length > 0 ? '取消' : '全选'}
              </button>
              {/* 反选 */}
              <button
                type="button"
                onClick={() => {
                  const currentSet = new Set(selectedPresetIds);
                  const inversed = filteredPresets.filter((c: any) => !currentSet.has(c.id)).map((c: any) => c.id);
                  setSelectedPresetIds(inversed);
                }}
                className="batch-btn"
              >
                反选
              </button>
              {/* 移动 */}
              <button
                type="button"
                disabled={selectedPresetIds.length === 0}
                onClick={() => setShowPresetBatchMoveModal(true)}
                className="batch-btn batch-btn-primary"
              >
                移动
              </button>
              {/* 标签 */}
              <button
                type="button"
                disabled={selectedPresetIds.length === 0}
                onClick={() => setShowBatchTagModal(true)}
                className="batch-btn batch-btn-primary"
              >
                标签
              </button>
              {/* 删除 */}
              <button
                type="button"
                disabled={selectedPresetIds.length === 0}
                onClick={handleBatchDeletePresets}
                className="batch-btn batch-btn-danger"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

                {/* Preset List View */}
                {filteredPresets.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {presetSearchQuery ? '未找到匹配的预设文件' : '暂无预设文件'}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      点击右上角的 “+” 按钮上传 JSON 格式的预设文件
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sortItemList(
                      filteredPresets,
                      presetSortOrder,
                      (item: any) => item.fileName || item.name || '',
                      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
                    ).map((item: any) => {
                      const isSelected = selectedPresetIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (presetBatchMode) {
                              if (isSelected) {
                                setSelectedPresetIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedPresetIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              openPresetDetail(item, 'details');
                            }
                          }}
                          className={`p-3.5 bg-white dark:bg-zinc-900 border rounded-xl cursor-pointer transition-all hover:shadow-md flex flex-col h-full justify-between gap-3 ${
                            isSelected
                              ? 'border-rose-500 ring-2 ring-rose-500/30 dark:ring-rose-500/30'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex gap-2 h-full">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500 dark:text-zinc-400">
                              <Sliders className="w-4 h-4" />
                            </div>
                            
                            <div className="flex flex-col flex-1 min-w-0 justify-between gap-2">
                              {/* Line 1: Name, Version, Group */}
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1" title={item.name || item.fileName}>
                              {item.name || item.fileName || '未命名预设'}
                            </h3>
                            {presetBatchMode && (
                                <div className="flex-shrink-0 ml-2">
                                  {isSelected ? (
                                    <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                                  )}
                                </div>
                            )}
                          </div>

                          {/* Line 2: Tags & Metadata */}
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="px-1.5 py-0.5 text-[9px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[60px] flex-shrink-0">
                              {item.category || '默认'}
                            </span>
                            {item.customTags && item.customTags.length > 0 && (
                                <div className="flex-1 min-w-0">
                                    <TagEditor 
                                        customTags={item.customTags || []} 
                                        onChange={(newTags) => {
                                            updateAppData((prev: any) => ({
                                                ...prev,
                                                presets: (prev.presets || []).map((t: any) => t.id === item.id ? { ...t, customTags: newTags } : t)
                                            }));
                                        }}
                                        availableTags={appData.presetTags || []}
                                        maxDisplay={1}
                                        hideAddButton={true}
                                    />
                                </div>
                            )}
                            {item.author && (
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex-shrink-0 max-w-[80px]">
                                    作者：{item.author}
                                </span>
                            )}
                            <span className="text-[9px] text-[var(--dim,#7C6865)] bg-[var(--bg-soft,#f4f0ea)] dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                              提示词 {extractPromptList(getPresetJson(item)).length}
                            </span>
                            {(item.regexScripts?.length || normalizeEmbeddedRegexScripts(getPresetJson(item)).length) > 0 && (
                              <span className="text-[9px] text-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] px-1.5 py-0.5 rounded">
                                内嵌正则 {item.regexScripts?.length || normalizeEmbeddedRegexScripts(getPresetJson(item)).length}
                              </span>
                            )}
                            {(item.embeddedScripts?.length || normalizeEmbeddedScripts(getPresetJson(item)).length) > 0 && (
                              <span className="text-[9px] text-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] px-1.5 py-0.5 rounded">
                                内嵌脚本 {item.embeddedScripts?.length || normalizeEmbeddedScripts(getPresetJson(item)).length}
                              </span>
                            )}
                          </div>

                          {/* Line 3: Actions */}
                          {!presetBatchMode && (
                              <div className="flex items-center gap-1.5 pt-1 mt-auto border-t border-zinc-100 dark:border-zinc-800">
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          const newTag = prompt('输入新标签：');
                                          if (newTag && newTag.trim()) {
                                              const tags = item.customTags || [];
                                              if (!tags.includes(newTag.trim())) {
                                                   updateAppData((prev: any) => {
                                                      const updatedItems = (prev.presets || []).map((t: any) => t.id === item.id ? { ...t, customTags: [...tags, newTag.trim()] } : t);
                                                      const globalTags = prev.presetTags || [];
                                                      return {
                                                          ...prev,
                                                          presets: updatedItems,
                                                          presetTags: Array.from(new Set([...globalTags, newTag.trim()]))
                                                      };
                                                   });
                                              }
                                          }
                                      }}
                                      className="px-2 py-1 text-[9px] rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                  >
                                      + 标签
                                  </button>
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(safeStringifyPreset(getPresetJson(item)));
                                          const downloadAnchorNode = document.createElement('a');
                                          downloadAnchorNode.setAttribute("href", dataStr);
                                          downloadAnchorNode.setAttribute("download", `${item.name || item.fileName || 'preset'}.json`);
                                          document.body.appendChild(downloadAnchorNode);
                                          downloadAnchorNode.click();
                                          downloadAnchorNode.remove();
                                          showToast('已导出 JSON', 'success');
                                      }}
                                      className="px-2 py-1 text-[9px] rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ml-auto"
                                  >
                                      导出
                                  </button>
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          openPresetDetail(item, 'details');
                                      }}
                                      className="px-2 py-1 text-[9px] rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                  >
                                      编辑
                                  </button>
                              </div>
                          )}
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              


                {activePreset && (() => {
                  const presetJson = getPresetJson(activePreset);
                  const promptList = extractPromptList(presetJson);
                  const regexList = activePreset.regexScripts || normalizeEmbeddedRegexScripts(presetJson);
                  const scriptList = activePreset.embeddedScripts || normalizeEmbeddedScripts(presetJson);
                  const paramKeys = ['temperature', 'top_p', 'top_k', 'top_a', 'min_p', 'frequency_penalty', 'presence_penalty', 'repetition_penalty', 'openai_max_context', 'openai_max_tokens'];
                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 modal-backdrop p-3 animate-in fade-in" role="dialog" aria-modal="true">
                      <div className="absolute inset-0" onClick={() => setActivePreset(null)} />
                      <div className="relative z-10 w-full max-w-7xl max-h-[92vh] overflow-hidden bg-[var(--bg-paper,#faf7f2)] dark:bg-zinc-950 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col">
                        <div className="px-4 py-3 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[var(--text,#3E3A39)] dark:text-zinc-100 truncate">{activePreset.name || '未命名 ST 预设'}</h3>
                            <p className="text-[10px] text-[var(--dim,#7C6865)] dark:text-zinc-400 truncate">
                              {activePreset.fileName || '新建模板'} · 提示词 {promptList.length} · 排序 {extractPromptOrderCount(presetJson)} · 内嵌正则 {regexList.length} · 内嵌脚本 {scriptList.length}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button type="button" onClick={saveActivePreset} className="px-3 py-1.5 text-[10px] font-semibold bg-[var(--btn-primary-bg,var(--accent,#8C2F2D))] text-white hover:bg-[var(--btn-primary-hover,var(--accent-hover,#6f2422))] rounded-lg transition-colors">保存</button>
                            <button type="button" onClick={() => setActivePreset(null)} className="p-2 text-[var(--dim,#7C6865)] hover:text-[var(--text,#3E3A39)] hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 overflow-x-auto">
                          {[
                            ['details', '详情'],
                            ['prompts', `提示词(${promptList.length})`],
                            ['regex', `内嵌正则(${regexList.length})`],
                            ['scripts', `内嵌脚本(${scriptList.length})`],
                            ['versions', `版本(${activePreset.versions?.length || 0})`],
                            ['json', 'JSON模板'],
                          ].map(([key, label]) => (
                            <button key={key} type="button" onClick={() => setDetailTab(key as any)} className={`px-3 py-1.5 text-[10px] rounded-lg transition-colors whitespace-nowrap ${detailTab === key ? 'bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-bold' : 'text-[var(--dim,#7C6865)] hover:bg-black/5 dark:hover:bg-white/10'}`}>
                              {label}
                            </button>
                          ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                          {detailTab === 'details' && (
                            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4">
                              <aside className="space-y-2 bg-white/70 dark:bg-zinc-900/70 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-xl p-3">
                                <div className="text-[10px] font-bold text-[var(--dim,#7C6865)]">预设档案</div>
                                <div className="text-xs font-bold text-[var(--text,#3E3A39)] dark:text-zinc-100 break-words">{activePreset.name || '未命名 ST 预设'}</div>
                                <div className="text-[10px] text-[var(--dim,#7C6865)] break-words">{activePreset.fileName || '新建模板'}</div>
                                <div className="flex flex-wrap gap-1 pt-1">
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] text-[9px]">{activePreset.activeVersionLabel || 'v1'}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-soft,#f4f0ea)] dark:bg-zinc-800 text-[var(--dim,#7C6865)] text-[9px]">提示词 {promptList.length}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-soft,#f4f0ea)] dark:bg-zinc-800 text-[var(--dim,#7C6865)] text-[9px]">正则 {regexList.length}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-soft,#f4f0ea)] dark:bg-zinc-800 text-[var(--dim,#7C6865)] text-[9px]">脚本 {scriptList.length}</span>
                                </div>
                                {activePreset.currentVersionSummary && <p className="text-[10px] text-[var(--dim,#7C6865)] leading-relaxed">{activePreset.currentVersionSummary}</p>}
                              </aside>
                              <div className="space-y-3">
                                <label className="block text-[10px] font-bold text-[var(--dim,#7C6865)]">预设名称</label>
                                <input value={activePreset.name || ''} onChange={(e) => setActivePreset({ ...activePreset, name: e.target.value, title: e.target.value })} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-lg text-[var(--text,#3E3A39)] dark:text-zinc-100" />
                                <label className="block text-[10px] font-bold text-[var(--dim,#7C6865)]">说明</label>
                                <textarea value={activePreset.description || ''} onChange={(e) => setActivePreset({ ...activePreset, description: e.target.value })} rows={5} className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-lg text-[var(--text,#3E3A39)] dark:text-zinc-100" />
                                <TagEditor customTags={activePreset.customTags || []} availableTags={appData.presetTags || []} onChange={(tags) => setActivePreset({ ...activePreset, customTags: tags })} />
                              </div>
                              <div className="space-y-2">
                                <div className="text-[10px] font-bold text-[var(--dim,#7C6865)]">采样参数</div>
                                {paramKeys.map((key) => (
                                  <div key={key} className="flex items-center justify-between gap-2 text-[10px] bg-white dark:bg-zinc-900 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-lg px-2 py-1.5">
                                    <span className="text-[var(--dim,#7C6865)]">{key}</span>
                                    <span className="font-mono text-[var(--text,#3E3A39)] dark:text-zinc-100">{String(presetJson?.[key] ?? '-')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {detailTab === 'prompts' && (
                            <div className="space-y-2">
                              {promptList.length === 0 ? <p className="text-xs text-[var(--dim,#7C6865)]">暂无 prompts 条目。</p> : promptList.map((prompt: any, index: number) => (
                                <div key={prompt.identifier || index} className="bg-white dark:bg-zinc-900 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-[var(--text,#3E3A39)] dark:text-zinc-100 truncate">{prompt.name || prompt.identifier || `提示词 #${index + 1}`}</div>
                                      <div className="text-[9px] text-[var(--dim,#7C6865)]">identifier: {prompt.identifier || '-'} · role: {prompt.role || '-'} · {prompt.enabled === false ? '禁用' : '启用'}</div>
                                    </div>
                                  </div>
                                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed bg-[var(--bg-soft,#f4f0ea)] dark:bg-zinc-950 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-lg p-2 text-[var(--text,#3E3A39)] dark:text-zinc-200">{String(prompt.content || '')}</pre>
                                </div>
                              ))}
                            </div>
                          )}

                          {detailTab === 'regex' && (
                            <div className="space-y-2">
                              <p className="text-[10px] text-[var(--dim,#7C6865)]">这些正则只属于当前预设，不会进入酒馆“正则脚本”独立管理区。</p>
                              {regexList.length === 0 ? <p className="text-xs text-[var(--dim,#7C6865)]">暂无内嵌正则。</p> : regexList.map((rx: any, index: number) => (
                                <div key={rx.id || index} className="bg-white dark:bg-zinc-900 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-xl p-3">
                                  <div className="text-xs font-bold text-[var(--text,#3E3A39)] dark:text-zinc-100">{rx.scriptName || `正则 #${index + 1}`}</div>
                                  <div className="text-[9px] text-[var(--dim,#7C6865)] mb-2">{rx.disabled ? '禁用' : '启用'} · 预设内嵌正则</div>
                                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[10px] bg-[var(--bg-soft,#f4f0ea)] dark:bg-zinc-950 rounded-lg p-2 mb-2">Find: {rx.findRegex || ''}</pre>
                                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[10px] bg-[var(--bg-soft,#f4f0ea)] dark:bg-zinc-950 rounded-lg p-2">Replace: {rx.replaceString || ''}</pre>
                                </div>
                              ))}
                            </div>
                          )}

                          {detailTab === 'scripts' && (
                            <div className="space-y-2">
                              <p className="text-[10px] text-[var(--dim,#7C6865)]">这些脚本只属于当前预设，不会进入酒馆“脚本”独立管理区。</p>
                              {scriptList.length === 0 ? <p className="text-xs text-[var(--dim,#7C6865)]">暂无内嵌脚本。</p> : scriptList.map((script: any, index: number) => (
                                <div key={script.id || index} className="bg-white dark:bg-zinc-900 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-xl p-3 space-y-2">
                                  <div className="text-xs font-bold text-[var(--text,#3E3A39)] dark:text-zinc-100">{script.name || `脚本 #${index + 1}`}</div>
                                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-[10px] bg-[var(--bg-soft,#f4f0ea)] dark:bg-zinc-950 rounded-lg p-2 text-[var(--text,#3E3A39)] dark:text-zinc-200">{script.content || safeStringifyPreset(script)}</pre>
                                </div>
                              ))}
                            </div>
                          )}

                          {detailTab === 'versions' && (
                            <div className="space-y-2">
                              {(activePreset.versions || []).length === 0 ? (
                                <p className="text-xs text-[var(--dim,#7C6865)]">暂无历史版本。导入同名更新或保存修改后会自动生成版本快照。</p>
                              ) : (
                                (activePreset.versions || []).map((version: any) => (
                                  <div key={version.versionId} className="bg-white dark:bg-zinc-900 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-[var(--text,#3E3A39)] dark:text-zinc-100">{version.versionLabel || `v${version.versionNumber}`}</div>
                                      <div className="text-[10px] text-[var(--dim,#7C6865)] truncate">{version.fileName || '未记录文件'} · {version.changeSummary || '历史快照'}</div>
                                    </div>
                                    <button type="button" onClick={() => restorePresetVersion(version)} className="px-2.5 py-1.5 text-[10px] rounded-lg bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] hover:bg-[var(--btn-primary-hover,rgba(140,47,45,0.18))] transition-colors shrink-0">
                                      还原
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {detailTab === 'json' && (
                            <textarea value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} className="w-full min-h-[58vh] font-mono text-[10px] leading-relaxed bg-white dark:bg-zinc-950 border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-xl p-3 text-[var(--text,#3E3A39)] dark:text-zinc-100" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                                <BatchTagModal
                  isOpen={showBatchTagModal}
                  onClose={() => setShowBatchTagModal(false)}
                  availableTags={appData.presetTags || []}
                  selectedCount={selectedPresetIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.presets || [];
                      const newList = list.map((item: any) => {
                        if (selectedPresetIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.presetTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, presets: newList, presetTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedPresetIds === 'function') {
                       props.setSelectedPresetIds([]);
                    }
                    showToast(`成功为 ${selectedPresetIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>
    );
};


