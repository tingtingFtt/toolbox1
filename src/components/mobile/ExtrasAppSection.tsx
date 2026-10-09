import { ManagementSearch, ManagementHeader, ManagementToolbarFrame, ManagementBatchBar, ManagementBatchOverlay } from '../ui/ManagementChrome';
import { ActionButton } from '../ui/ActionButton';
import React from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { BaseButton } from '../ui/BaseButton';
import { BaseCard } from '../ui/BaseCard';
import { BaseInput } from '../ui/BaseInput';
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';

export const ExtrasAppSection = (props: any) => {
    const {
        appData,
  extraStoryTagsFilter = [],
  setextraStoryTagsFilter = () => {}, updateAppData, showToast, 
        setShowNewExtraStoryGroupModal, setRenameExtraStoryCategoryInput, extraStoryFileInputRef, setManagingExtraStoryCategory, MoreHorizontal, selectedExtraStoryIds, setShowAddExtraStoryChoiceModal, setExtraStorySearchQuery, extraStorySearchQuery, setExtraStoryBatchMode, Circle, setExtraStoryCategoryFilter, setExtraStorySortOrder, setShowExtraStoryBatchMoveModal, setEditingExtraStory, CheckSquare, sortItemList, handleFileUploadExtraStory, extraStoriesList, extraStoryCategoryFilter, setSelectedExtraStoryIds, setIsContentExpanded, handleBatchDeleteExtraStories, filteredExtraStories, extraStoryBatchMode, ArrowUpDown, extraStorySortOrder,
    } = props;

  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const customTags = appData.extraStoryTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    if (extraStoryFileInputRef?.current) {
      extraStoryFileInputRef.current.click();
    }
  };

  const handleCreateNewStory = () => {
    const newStory: ExtraStoryEntry = {
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: '新建番外故事',
      author: 'User',
      category: extraStoryCategoryFilter !== '全部分组' ? extraStoryCategoryFilter : '默认',
      content: '番外故事正文内容...',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (setEditingExtraStory) {
      setEditingExtraStory(newStory);
    } else {
      updateAppData((prev: any) => ({ ...prev, extraStories: [...(prev.extraStories || []), newStory] }));
      showToast('已新建番外', 'success');
    }
  };

  return (
        <div className="max-w-7xl mx-auto space-y-4">
                {/* Hidden File Input for Document Upload */}
                <input
                  type="file"
                  multiple
                  ref={extraStoryFileInputRef}
                  onChange={handleFileUploadExtraStory}
                  accept=".docx,.txt,.json,.html"
                  className="hidden"
                />

      <div className="space-y-3 md:space-y-4 mb-6">
                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <ManagementHeader data-design-id="extras-header-banner"
        icon={<>
            <Book className="w-4 h-4" />
          </>}
        title={<>番外小剧场</>}
        badge={<>
                格式：.docx (Word 人设/番外) / .txt / .json / .html
              </>}
        description={<>
              {props.currentSectionId === 'st-extras' ? '酒馆专属小剧场短篇、前传番外、IF线小说与角色剧本' : '小手机版本番外短篇、角色背景故事、IF线小说与短剧'}
            </>}
        actions={<>
          <ActionButton type="button" onClick={triggerUpload} title="导入番外文档 (.docx, .txt, .json, .html)" action="import" context="toolbar" tone="primary">
                      <Upload className="w-3 h-3" />
                      <span>{props.currentSectionId === 'st-extras' ? '导入小剧场文档' : '导入番外文档'}</span>
                    </ActionButton>
          <ActionButton type="button" onClick={handleCreateNewStory} action="create" context="toolbar">
                      <Plus className="w-3 h-3" />
                      <span>{props.currentSectionId === 'st-extras' ? '新建小剧场' : '新建番外'}</span>
                    </ActionButton>
        </>}
      />

                {/* Toolbar (Search, Categories, Group Actions, Batch Mode) */}
                <ManagementToolbarFrame data-design-id="extras-toolbar">
                  <ManagementSearch designId="extras-search-input" type="text" value={extraStorySearchQuery} onChange={(e: any) => setExtraStorySearchQuery(e.target.value)} placeholder="搜索小剧场名称、作者或内容..." />

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', ...(appData.extraStoryCategories || [])]))}
                      currentGroup={extraStoryCategoryFilter}
                      onSelectGroup={setExtraStoryCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={extraStoryTagsFilter}
                      onChange={setextraStoryTagsFilter}
                    />
                    <CustomSelect
                      value={extraStorySortOrder}
                      onChange={(val) => setExtraStorySortOrder(val)}
                      options={[
                        { value: 'default', label: '默认排序' },
                        { value: 'az', label: '名称 A-Z' },
                        { value: 'za', label: '名称 Z-A' },
                        { value: 'newest', label: '最新添加' },
                        { value: 'oldest', label: '最早添加' },
                      ]}
                      icon={<ArrowUpDown className="w-3.5 h-3.5" />}
                      className="h-[30px] px-2.5 rounded-lg bg-transparent border border-[var(--line,#e6e3dd)] dark:border-zinc-700/60 text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-[var(--btn-bg,rgba(0,0,0,0.05))] dark:hover:bg-white/10 hover:shadow-sm text-[10px] font-medium flex items-center justify-between gap-1.5 transition-all cursor-pointer"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setExtraStoryBatchMode((prev: any) => {
                          if (prev) setSelectedExtraStoryIds([]);
                          return !prev;
                        });
                      }}
                      title={extraStoryBatchMode ? '退出批量选择' : '开启多选模式'}
                      className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                        extraStoryBatchMode
                          ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                          : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span className="leading-none">{extraStoryBatchMode ? '完成' : '选择'}</span>
                    </button>
                  </div>

                  {/* Group Navigation Bar & Actions */}
                  <BaseCard designId="extras-group-bar-card" className="p-2 w-full">
                    <GroupCategoryBar 
                        groups={Array.from(new Set(['默认', ...(appData.extraStoryCategories || [])]))} 
                        currentGroup={extraStoryCategoryFilter} 
                        onSelectGroup={setExtraStoryCategoryFilter} 
                        getCount={(g) => (appData.extraStories || []).filter((c: any) => (c.category || '默认') === g).length} 
                        totalCount={appData.extraStories?.length || 0} 
                        allGroupName="全部分组" onDeleteGroup={(g) => { setManagingExtraStoryCategory(g); /* trigger delete modal later via App.tsx logic */ }} />
                  </BaseCard>
                </ManagementToolbarFrame>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {extraStoryBatchMode && (
                  <ManagementBatchOverlay >
                    <ManagementBatchBar data-design-id="extras-batch-bar">
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedExtraStoryIds.length} 项
                        </span>
                        <ActionButton onClick={() => {
                            setExtraStoryBatchMode(false);
                            setSelectedExtraStoryIds([]);
                          }} aria-label="关闭选择" action="close" context="icon">
                          <X className="w-3.5 h-3.5" />
                        </ActionButton>
                      </div>

                      {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
                      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
                        <ActionButton type="button" onClick={() => {
                            if (selectedExtraStoryIds.length === filteredExtraStories.length && filteredExtraStories.length > 0) {
                              setSelectedExtraStoryIds([]);
                            } else {
                              setSelectedExtraStoryIds(filteredExtraStories.map((p: any) => p.id));
                            }
                          }} action="select" context="batch">
                          {selectedExtraStoryIds.length === filteredExtraStories.length && filteredExtraStories.length > 0
                            ? '取消'
                            : '全选'}
                        </ActionButton>

                        <ActionButton type="button" onClick={() => {
                            const currentSet = new Set(selectedExtraStoryIds);
                            const inversed = filteredExtraStories
                              .filter((p: any) => !currentSet.has(p.id))
                              .map((p: any) => p.id);
                            setSelectedExtraStoryIds(inversed);
                          }} action="invert" context="batch">
                          反选
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedExtraStoryIds.length === 0} onClick={() => setShowExtraStoryBatchMoveModal(true)} action="move" context="batch" tone="primary">
                          移动
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedExtraStoryIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="tag" context="batch" tone="primary">
                          标签
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedExtraStoryIds.length === 0} onClick={handleBatchDeleteExtraStories} action="delete" context="batch" tone="danger">
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          删除
                        </ActionButton>
                      </div>
                    </ManagementBatchBar>
                  </ManagementBatchOverlay>
                )}

                {/* Extra Story List */}
                {filteredExtraStories.length === 0 ? (
                  <BaseCard designId="extras-empty-card" className="text-center py-20 p-8 space-y-3">
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      {extraStorySearchQuery ? '未找到匹配的番外小剧场' : '暂无番外小剧场，点击右上角 “+” 按钮录入或上传'}
                    </p>
                    {!extraStorySearchQuery && (
                      <BaseButton
                        designId="extras-empty-add-btn"
                        variant="primary"
                        onClick={() => setShowAddExtraStoryChoiceModal(true)}
                        className="px-4 py-2 rounded-xl text-[10px] font-bold"
                      >
                        <Plus className="w-4 h-4" /> 添加番外小剧场
                      </BaseButton>
                    )}
                  </BaseCard>
                ) : (
                  <div data-design-id="extras-grid" className="space-y-3">
                    {sortItemList(
                      filteredExtraStories,
                      extraStorySortOrder,
                      (item: any) => item.title || '',
                      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
                    ).map((item: any) => {
                      const isSelected = selectedExtraStoryIds.includes(item.id);

                      return (
                        <BaseCard
                          key={item.id}
                          designId={`extras-item-${item.id}`}
                          nested
                          onClick={() => {
                            if (extraStoryBatchMode) {
                              if (isSelected) {
                                setSelectedExtraStoryIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedExtraStoryIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              setEditingExtraStory(JSON.parse(JSON.stringify(item)));
                              setIsContentExpanded(false);
                            }
                          }}
                          className={`cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)]'
                              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 w-full justify-center pb-1">
                              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {item.title}
                              </h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                                {item.category || '默认'}
                              </span>
                            </div>

                            {item.author && (
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                作者/来源：{item.author}
                              </p>
                            )}

                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-2 leading-relaxed">
                              {item.content}
                            </p>
                          </div>

                          {extraStoryBatchMode ? (
                            <div className="flex-shrink-0">
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                              ) : (
                                <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                              )}
                            </div>
                          ) : (
                            <div className="flex-shrink-0 text-[var(--accent)] hover:text-[var(--accent-hover)] p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                              <Edit3 className="w-4 h-4" />
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
                  availableTags={appData.extraStoryTags || []}
                  selectedCount={selectedExtraStoryIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.extraStories || [];
                      const newList = list.map((item: any) => {
                        if (selectedExtraStoryIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.extraStoryTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, extraStories: newList, extraStoryTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedExtraStoryIds === 'function') {
                       props.setSelectedExtraStoryIds([]);
                    }
                    showToast(`成功为 ${selectedExtraStoryIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>
            </div>
    );
};



