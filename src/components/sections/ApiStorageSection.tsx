import { ManagementSearch, ManagementHeader, ManagementToolbarFrame, ManagementBatchBar, ManagementBatchOverlay } from '../ui/ManagementChrome';
import { ActionButton } from '../ui/ActionButton';
import React, { useRef, useState } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { BaseButton } from '../ui/BaseButton';
import { BaseCard } from '../ui/BaseCard';
import { BaseInput } from '../ui/BaseInput';
import { Search, Plus, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload, Key } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';

export const ApiStorageSection = (props: any) => {
    const {
        appData, updateAppData, showToast, 
        apiCategoryFilter, setEditingApi, selectedApiIds, apisList, MoreHorizontal, apiBatchMode, FileCode, handleOpenAddApiModal, setSelectedApiIds, apiSearchQuery, handleBatchDeleteApis, Circle, setShowNewApiGroupModal, setApiCategoryFilter, CheckSquare, setManagingApiCategory, filteredApis, apiSortOrder, sortItemList, setApiBatchMode, setShowApiBatchMoveModal, setApiSearchQuery, setRenameApiCategoryInput, setApiSortOrder, ArrowUpDown,
        apiTagsFilter, setapiTagsFilter
    } = props;

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const customTags = appData.apiTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    if (localFileInputRef.current) {
      localFileInputRef.current.click();
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      let newEntries: any[] = [];
      let promises: Promise<void>[] = [];
      for (const file of files) {
        promises.push(
          file.text().then(text => {
            try {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                  newEntries.push({
                    id: 'api_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    name: item.name || item.title || file.name.replace(/\.[^/.]+$/, ''),
                    endpoint: item.endpoint || item.url || item.baseUrl || '',
                    apiKey: item.apiKey || item.key || item.token || '',
                    model: item.model || item.defaultModel || 'gpt-4o',
                    category: apiCategoryFilter !== '全部分组' ? apiCategoryFilter : '默认',
                    createdAt: Date.now()
                  });
                });
              } else {
                newEntries.push({
                  id: 'api_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  name: parsed.name || parsed.title || file.name.replace(/\.[^/.]+$/, ''),
                  endpoint: parsed.endpoint || parsed.url || parsed.baseUrl || '',
                  apiKey: parsed.apiKey || parsed.key || parsed.token || '',
                  model: parsed.model || parsed.defaultModel || 'gpt-4o',
                  category: apiCategoryFilter !== '全部分组' ? apiCategoryFilter : '默认',
                  createdAt: Date.now()
                });
              }
            } catch (err) {
              newEntries.push({
                id: 'api_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                name: file.name.replace(/\.[^/.]+$/, ''),
                endpoint: '',
                apiKey: text.trim().slice(0, 100),
                model: 'gpt-4o',
                category: apiCategoryFilter !== '全部分组' ? apiCategoryFilter : '默认',
                createdAt: Date.now()
              });
            }
          }).catch(() => {})
        );
      }
      Promise.all(promises).then(() => {
        if (newEntries.length > 0) {
          updateAppData((prev: any) => ({ ...prev, apis: [...(prev.apis || []), ...newEntries] }));
          showToast(`成功导入 ${newEntries.length} 条 API 配置`, 'success');
        }
      });
      e.target.value = '';
    }
  };

  const handleCreateNewApi = () => {
    if (handleOpenAddApiModal) {
      handleOpenAddApiModal();
    } else if (setEditingApi) {
      setEditingApi({
        id: 'api_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: '新建 API 配置',
        endpoint: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o',
        category: apiCategoryFilter !== '全部分组' ? apiCategoryFilter : '默认',
        createdAt: Date.now()
      });
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

      <div className="space-y-3 md:space-y-4 mb-6">
                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <ManagementHeader data-design-id="api-storage-header-banner"
        icon={<>
            <Key className="w-4 h-4" />
          </>}
        title={<>API 节点与密钥库</>}
        badge={<>
                格式：.json (API 配置文件) / .txt / .docx
              </>}
        description={<>
              安全存储各家大模型接口、中转代理地址、自定义密钥及模型映射配置
            </>}
        actions={<>
          <ActionButton type="button" onClick={triggerUpload} title="导入 API 配置文件 (.json, .txt, .docx)" action="import" context="toolbar" tone="primary">
                      <Upload className="w-3 h-3" />
                      <span>导入 API 配置</span>
                    </ActionButton>
          <ActionButton type="button" onClick={handleCreateNewApi} action="create" context="toolbar">
                      <Plus className="w-3 h-3" />
                      <span>新建 API</span>
                    </ActionButton>
        </>}
      />

                {/* Search Bar & Category Toolbar */}
                <ManagementToolbarFrame data-design-id="api-storage-toolbar">
                  <ManagementSearch designId="api-storage-search-input" type="text" value={apiSearchQuery} onChange={(e: any) => setApiSearchQuery(e.target.value)} placeholder="搜索 API 名称、地址、Key、描述..." />

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', ...(appData.apiCategories || [])]))}
                      currentGroup={apiCategoryFilter}
                      onSelectGroup={setApiCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={apiTagsFilter}
                      onChange={setapiTagsFilter}
                    />
                    <CustomSelect
                      value={apiSortOrder}
                      onChange={(val) => setApiSortOrder(val)}
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
                setApiBatchMode(!apiBatchMode);
                if (apiBatchMode) setSelectedApiIds(new Set());
              }}
              title={apiBatchMode ? '退出批量选择' : '开启多选模式'}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                apiBatchMode
                  ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                  : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="leading-none">{apiBatchMode ? '完成' : '选择'}</span>
            </button>
                  </div>

                  {/* Group Navigation Bar & Actions */}
                  <BaseCard designId="api-storage-group-bar-card" className="p-2 w-full">
                    <GroupCategoryBar 
                        groups={Array.from(new Set(['默认', ...(appData.apiCategories || [])]))} 
                        currentGroup={apiCategoryFilter} 
                        onSelectGroup={setApiCategoryFilter} 
                        getCount={(g) => (appData.apiKeys || []).filter((c: any) => (c.category || '默认') === g).length} 
                        totalCount={appData.apiKeys?.length || 0} 
                        allGroupName="全部分组" onDeleteGroup={(g) => { setManagingApiCategory(g); /* trigger delete modal later via App.tsx logic */ }} />
                  </BaseCard>
                </ManagementToolbarFrame>

                {/* Batch Mode Toolbar */}
                {apiBatchMode && (
                  <ManagementBatchOverlay >
                    <ManagementBatchBar data-design-id="api-storage-batch-bar">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedApiIds.length} 项
                        </span>
                        <ActionButton onClick={() => {
                            setApiBatchMode(false);
                            setSelectedApiIds([]);
                          }} aria-label="关闭选择" action="close" context="icon"><X className="w-3.5 h-3.5" /></ActionButton>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
                        <ActionButton type="button" onClick={() => {
                            if (selectedApiIds.length === filteredApis.length && filteredApis.length > 0) {
                              setSelectedApiIds([]);
                            } else {
                              setSelectedApiIds(filteredApis.map((p: any) => p.id));
                            }
                          }} action="select" context="batch">
                          {selectedApiIds.length === filteredApis.length && filteredApis.length > 0 ? '取消' : '全选'}
                        </ActionButton>
                        <ActionButton type="button" onClick={() => {
                            const currentSet = new Set(selectedApiIds);
                            const newSelected = filteredApis
                              .map((c: any) => c.id)
                              .filter((id: string) => !currentSet.has(id));
                            setSelectedApiIds(newSelected);
                          }} action="invert" context="batch">
                          反选
                        </ActionButton>
                        <ActionButton type="button" disabled={selectedApiIds.length === 0} onClick={() => setShowApiBatchMoveModal(true)} action="move" context="batch" tone="primary">
                          移动分组
                        </ActionButton>
                        <ActionButton type="button" disabled={selectedApiIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="create" context="batch" tone="primary">
                          添加标签
                        </ActionButton>
                        <ActionButton type="button" disabled={selectedApiIds.length === 0} onClick={handleBatchDeleteApis} action="delete" context="batch" tone="danger">
                          删除
                        </ActionButton>
                      </div>
                    </ManagementBatchBar>
                  </ManagementBatchOverlay>
                )}

                {/* API List */}
      </div>
                {filteredApis.length === 0 ? (
                  <BaseCard designId="api-storage-empty-card" className="text-center py-20 p-8 space-y-3">
                    <FileCode className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      {apiSearchQuery ? '未找到匹配的 API' : '暂无 API 数据，点击右上角 “+” 按钮添加'}
                    </p>
                    {!apiSearchQuery && (
                      <BaseButton
                        designId="api-storage-empty-add-btn"
                        variant="primary"
                        onClick={handleOpenAddApiModal}
                        className="px-4 py-2 rounded-xl text-[10px] font-bold"
                      >
                        <Plus className="w-4 h-4" /> 添加 API
                      </BaseButton>
                    )}
                  </BaseCard>
                ) : (
                  <div data-design-id="api-storage-grid" className="space-y-3">
                    {sortItemList(
                      filteredApis,
                      apiSortOrder,
                      (item: any) => item.name || '',
                      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
                    ).map((item: any) => {
                      const isSelected = selectedApiIds.includes(item.id);

                      return (
                        <BaseCard
                          key={item.id}
                          designId={`api-storage-item-${item.id}`}
                          nested
                          onClick={() => {
                            if (apiBatchMode) {
                              if (isSelected) {
                                setSelectedApiIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedApiIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              setEditingApi(JSON.parse(JSON.stringify(item)));
                            }
                          }}
                          className={`cursor-pointer transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)]'
                              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={item.name}>
                                {item.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {item.category || '默认'}
                              </span>
                            </div>

                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono" title={item.url}>
                              {item.url}
                            </p>

                            {/* Display all listed Keys */}
                            {item.keys && item.keys.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {item.keys.map((k: any, idx: any) => (
                                  <div
                                    key={k.id || idx}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 text-[10px]"
                                  >
                                    {k.memo && (
                                      <span className="font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-700/60 px-1 rounded text-[10px]">
                                        {k.memo}
                                      </span>
                                    )}
                                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                                      {k.key ? (k.key.length > 18 ? `${k.key.substring(0, 8)}...${k.key.substring(k.key.length - 6)}` : k.key) : '（无Key）'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {item.description && (
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>

                          {apiBatchMode ? (
                            <div className="flex-shrink-0 self-end md:self-center">
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                              ) : (
                                <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                              )}
                            </div>
                          ) : (
                            <div className="flex-shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 self-end md:self-center">
                              <span className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-md">查看/编辑</span>
                            </div>
                          )}
                        </BaseCard>
                      );
                    })}
                  </div>
                )}
              

                <BatchTagModal
                  isOpen={showBatchTagModal}
                  onClose={() => setShowBatchTagModal(false)}
                  availableTags={appData.apiTags || []}
                  selectedCount={selectedApiIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.apis || [];
                      const newList = list.map((item: any) => {
                        if (selectedApiIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.apiTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, apis: newList, apiTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedApiIds === 'function') {
                       props.setSelectedApiIds([]);
                    }
                    showToast(`成功为 ${selectedApiIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>
    );
};



