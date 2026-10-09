import { ManagementSearch, ManagementHeader, ManagementToolbarFrame, ManagementBatchBar, ManagementGrid, ManagementBatchOverlay } from '../ui/ManagementChrome';
import { ActionButton } from '../ui/ActionButton';
import React, { useRef } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload, Sliders , ArrowRightLeft } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';
import { createPresetEntry, getPresetJson, getPresetResources, normalizePreset, savePresetVersion } from '../../utils/presetResources';
import { PresetDetailModal } from '../modals/PresetDetailModal';
import { ChoiceModal } from '../ui/UnifiedModal';


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

const normalizeEmbeddedRegexScripts = (json: any) => getPresetResources(json, 'regex').map(item => item.value);
const normalizeEmbeddedScripts = (json: any) => getPresetResources(json, 'script').map(item => item.value);
const extractPromptList = (json: any) => Array.isArray(json?.prompts) ? json.prompts : [];
const extractPromptOrderCount = (json: any) => (json?.prompt_order || []).reduce((sum: number, group: any) => sum + (group.order?.length || 0), 0);

export const STPresetsSection = (props: any) => {
    const {
        appData,
  presetTagsFilter = [],
  setpresetTagsFilter = () => {}, updateAppData, showToast, 
        setPresetBatchMode, setPresetCategoryFilter, MoreHorizontal, setPresetEntrySearchQuery, setManagingPresetGroup, setPresetSearchQuery, handleBatchDeletePresets, presetCategoryFilter, Circle, FolderPlus, setRenamePresetGroupInput, setPresetSortOrder, presetsList, CheckSquare, sortItemList, selectedPresetIds, setShowPresetBatchMoveModal, presetBatchMode, presetSearchQuery, presetSortOrder, Move, setEditingPresetTab, setSelectedPresetIds, setEditingPreset, filteredPresets, setShowNewPresetGroupModal, ArrowUpDown,
    } = props;

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<any | null>(null);
  const [detailTab, setDetailTab] = React.useState<'details' | 'prompts' | 'regex' | 'scripts' | 'versions' | 'json'>('details');
  const customTags = appData.presetTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    localFileInputRef.current?.click();
  };

  const [importQueue, setImportQueue] = React.useState<PresetEntry[]>([]);
  const [importTargetId, setImportTargetId] = React.useState('');
  const { jumpTargetId, onClearJumpTarget, onOpenResource } = props;

  React.useEffect(() => {
    if (!jumpTargetId) return;
    const target = (appData.presets || []).find((item: PresetEntry) => item.id === jumpTargetId);
    if (target) {
      openPresetDetail(target);
      onClearJumpTarget?.();
    }
  }, [jumpTargetId, appData.presets]);

  const handleLocalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const entries: PresetEntry[] = [];
    for (const file of files) {
      try {
        const json = JSON.parse(await file.text());
        const category = presetCategoryFilter !== '全部分组' ? presetCategoryFilter : '默认';
        entries.push(createPresetEntry(json, file.name, category));
      } catch (error: any) {
        showToast(`无法导入 ${file.name}：${error.message}`, 'error');
      }
    }
    setImportQueue(queue => [...queue, ...entries]);
  };

  const incomingPreset = importQueue[0];
  const matchingPresets: PresetEntry[] = incomingPreset
    ? (appData.presets || []).filter((item: PresetEntry) => item.name.trim().toLowerCase() === incomingPreset.name.toLowerCase())
    : [];
  React.useEffect(() => {
    if (!incomingPreset) return;
    if (matchingPresets.length) {
      setImportTargetId(matchingPresets[0].id);
      return;
    }
    updateAppData((prev: AppData) => ({ ...prev, presets: [...(prev.presets || []), incomingPreset] }));
    showToast(`已导入「${incomingPreset.name}」，同步正则 ${incomingPreset.regexScripts?.length || 0} 条、脚本 ${incomingPreset.embeddedScripts?.length || 0} 个`, 'success');
    setImportQueue(queue => queue[0]?.id === incomingPreset.id ? queue.slice(1) : queue);
  }, [incomingPreset]);

  const finishImport = (mode: 'update' | 'new' | 'skip') => {
    if (!incomingPreset) return;
    if (mode !== 'skip') {
      updateAppData((prev: AppData) => {
        if (mode === 'new') return { ...prev, presets: [...(prev.presets || []), incomingPreset] };
        const target = (prev.presets || []).find(item => item.id === importTargetId) || matchingPresets[0];
        const updated = savePresetVersion(target, {
          ...target, ...incomingPreset, id: target.id, createdAt: target.createdAt,
          category: target.category, customTags: target.customTags, versions: target.versions,
        }, `导入更新：${incomingPreset.fileName}`);
        return { ...prev, presets: (prev.presets || []).map(item => item.id === target.id ? updated : item) };
      });
      showToast(mode === 'update' ? '预设已更新，内嵌资源已同步' : '已另存为新预设', 'success');
    }
    setImportQueue(queue => queue[0]?.id === incomingPreset.id ? queue.slice(1) : queue);
  };

  const openPresetDetail = (preset: PresetEntry, tab: any = 'details') => {
    setActivePreset(JSON.parse(JSON.stringify(normalizePreset(preset))));
    setDetailTab(tab);
  };

  const saveActivePreset = (draft: PresetEntry) => {
    const previous = (appData.presets || []).find((item: PresetEntry) => item.id === draft.id);
    const updated = savePresetVersion(previous, draft, '手动保存修改');
    updateAppData((prev: AppData) => ({
      ...prev,
      presets: previous
        ? (prev.presets || []).map(item => item.id === draft.id ? updated : item)
        : [...(prev.presets || []), updated],
      presetTags: Array.from(new Set([...(prev.presetTags || []), ...(updated.customTags || [])])),
    }));
    setActivePreset(updated);
    showToast('预设已保存，内嵌资源已同步', 'success');
  };

  const restorePresetVersion = (version: any) => {
    if (!activePreset || !version?.data) return;
    const previous = (appData.presets || []).find((item: PresetEntry) => item.id === activePreset.id);
    const restored = savePresetVersion(previous, {
      ...activePreset, ...version.data, id: activePreset.id,
      jsonData: version.data.jsonData || version.data.settings || {},
      versions: previous?.versions || [],
    }, `恢复自 ${version.versionLabel || '历史版本'}`);
    updateAppData((prev: AppData) => ({
      ...prev, presets: (prev.presets || []).map(item => item.id === restored.id ? restored : item),
    }));
    setActivePreset(restored);
    showToast('版本已恢复，正则与脚本已同步', 'success');
  };

  const handleCreateNewPreset = () => {
    const category = presetCategoryFilter !== '全部分组' ? presetCategoryFilter : '默认';
    openPresetDetail(createPresetEntry(createStPresetTemplate(), '新建 ST 预设.json', category));
  };

  return (
        <div className="max-w-7xl mx-auto space-y-4">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={localFileInputRef}
                  multiple
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleLocalFileChange}
                />

                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <ManagementHeader
        icon={<>
            <Sliders className="w-4 h-4" />
          </>}
        title={<>ST 采样与预设</>}
        badge={<>
                格式：.json (SillyTavern 预设)
              </>}
        description={<>
              管理采样参数、提示词模板、Prompt 预设配置文件与上下文生成设置
            </>}
        actions={<>
          <ActionButton type="button" onClick={triggerUpload} title="导入 ST 预设 JSON" action="import" context="toolbar" tone="primary">
                      <Upload className="w-3 h-3" />
                      <span>导入预设文档</span>
                    </ActionButton>
          <ActionButton type="button" onClick={handleCreateNewPreset} action="create" context="toolbar">
                      <Plus className="w-3 h-3" />
                      <span>新建预设</span>
                    </ActionButton>
        </>}
      />

                {/* Search Bar & Category Group Bar */}
                <ManagementToolbarFrame>
                  <ManagementSearch type="text" value={presetSearchQuery} onChange={(e: any) => setPresetSearchQuery(e.target.value)} placeholder="搜索预设文件名、作者、分类或内容..." />

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
                </ManagementToolbarFrame>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {presetBatchMode && (
                  <ManagementBatchOverlay >
                    <ManagementBatchBar>
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedPresetIds.length} 项
                        </span>
                        <ActionButton onClick={() => {
                            setPresetBatchMode(false);
                            setSelectedPresetIds([]);
                          }} aria-label="关闭选择" action="close" context="icon"><X className="w-3.5 h-3.5" /></ActionButton>
                      </div>
                      
                                  {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              {/* 全选 / 取消 */}
              <ActionButton type="button" onClick={() => {
                  if (selectedPresetIds.length === filteredPresets.length && filteredPresets.length > 0) {
                    setSelectedPresetIds([]);
                  } else {
                    setSelectedPresetIds(filteredPresets.map((c: any) => c.id));
                  }
                }} action="select" context="batch">
                {selectedPresetIds.length === filteredPresets.length && filteredPresets.length > 0 ? '取消' : '全选'}
              </ActionButton>
              {/* 反选 */}
              <ActionButton type="button" onClick={() => {
                  const currentSet = new Set(selectedPresetIds);
                  const inversed = filteredPresets.filter((c: any) => !currentSet.has(c.id)).map((c: any) => c.id);
                  setSelectedPresetIds(inversed);
                }} action="invert" context="batch">
                反选
              </ActionButton>
              {/* 移动 */}
              <ActionButton type="button" disabled={selectedPresetIds.length === 0} onClick={() => setShowPresetBatchMoveModal(true)} action="move" context="batch" tone="primary">
                移动
              </ActionButton>
              {/* 标签 */}
              <ActionButton type="button" disabled={selectedPresetIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="tag" context="batch" tone="primary">
                标签
              </ActionButton>
              {/* 删除 */}
              <ActionButton type="button" disabled={selectedPresetIds.length === 0} onClick={handleBatchDeletePresets} action="delete" context="batch" tone="danger">
                删除
              </ActionButton>
            </div>
          </ManagementBatchBar>
        </ManagementBatchOverlay>
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
                  <ManagementGrid className=" grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                  </ManagementGrid>
                )}
              


                {activePreset && <PresetDetailModal preset={activePreset} initialTab={detailTab} appData={appData} onClose={() => setActivePreset(null)} onSave={saveActivePreset} onRestore={restorePresetVersion} onOpenResource={onOpenResource} showToast={showToast} />}
                <ChoiceModal isOpen={!!incomingPreset && matchingPresets.length > 0} onClose={() => finishImport('skip')} title="导入同名预设" description={<div className="space-y-2"><p>{incomingPreset?.name}</p><CustomSelect value={importTargetId} onChange={setImportTargetId} options={matchingPresets.map(item => ({ value: item.id, label: `${item.name} · ${item.activeVersionLabel || 'v1'} · ${item.fileName || item.id}` }))} /></div>} options={[
                  { key: 'update', label: '更新已有预设', primary: true, onClick: () => finishImport('update') },
                  { key: 'new', label: '另存新预设', onClick: () => finishImport('new') },
                  { key: 'skip', label: '跳过', onClick: () => finishImport('skip') },
                ]} />

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



