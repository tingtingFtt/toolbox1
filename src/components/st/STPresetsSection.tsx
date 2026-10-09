import React, { useRef } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload, Sliders , ArrowRightLeft } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';

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
        let newEntries: any[] = [];
        let promises: Promise<void>[] = [];
        for (const file of fileArray) {
          promises.push(
            file.text().then(text => {
              try {
                const parsed = JSON.parse(text);
                const category = presetCategoryFilter !== '全部分组' ? presetCategoryFilter : '默认';
                newEntries.push({
                  id: 'pre_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  title: file.name.replace(/\.[^/.]+$/, ''),
                  author: parsed.author || '未知作者',
                  category,
                  settings: parsed,
                  createdAt: Date.now()
                });
              } catch (err) {
                newEntries.push({
                  id: 'pre_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  title: file.name.replace(/\.[^/.]+$/, ''),
                  author: '未知作者',
                  category: presetCategoryFilter !== '全部分组' ? presetCategoryFilter : '默认',
                  settings: { rawText: text },
                  createdAt: Date.now()
                });
              }
            }).catch(() => {})
          );
        }
        Promise.all(promises).then(() => {
          if (newEntries.length > 0) {
            updateAppData((prev: any) => ({ ...prev, presets: [...(prev.presets || []), ...newEntries] }));
            showToast(`成功导入 ${newEntries.length} 个预设文件`, 'success');
          } else {
            showToast('未识别到有效的预设文档', 'error');
          }
        });
      }
      e.target.value = '';
    }
  };

  const handleCreateNewPreset = () => {
    const newEntry: PresetEntry = {
      id: 'pre_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: '新建预设',
      title: '新建预设',
      fileName: '新建预设.json',
      author: 'User',
      category: presetCategoryFilter !== '全部分组' ? presetCategoryFilter : '默认',
      settings: {
        temperature: 1.0,
        top_p: 1.0,
        max_tokens: 2048,
        presence_penalty: 0,
        frequency_penalty: 0
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (setEditingPreset) {
      setEditingPreset(newEntry);
    } else {
      updateAppData((prev: any) => ({ ...prev, presets: [...(prev.presets || []), newEntry] }));
      showToast('已新建预设', 'success');
    }
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
                              setEditingPreset({ ...item });
                              setEditingPresetTab('details');
                              setPresetEntrySearchQuery('');
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
                                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2));
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
                                          setEditingPreset({ ...item });
                                          setEditingPresetTab('details');
                                          setPresetEntrySearchQuery('');
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


