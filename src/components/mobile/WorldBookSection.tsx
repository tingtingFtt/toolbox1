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

export const WorldBookSection = (props: any) => {
    const {
        appData,
  worldBookTagsFilter = [],
  setworldBookTagsFilter = () => {}, updateAppData, showToast, 
        setWorldBookBatchMode, handleBatchDeleteWorldBooks, worldBookCategoryFilter, selectedWorldBookIds, setShowNewWorldBookGroupModal, setShowWorldBookBatchMoveModal, setIsWorldBookContentExpanded, openBatchUpload, worldBookSortOrder, CheckSquare, ArrowUpDown, MoreHorizontal, setEditingWorldBook, setWorldBookSortOrder, worldBookFileInputRef, setManagingWorldBookCategory, sortItemList, Circle, setRenameWorldBookCategoryInput, setSelectedWorldBookIds, worldBookSearchQuery, setWorldBookSearchQuery, worldBooksList, handleFileUploadWorldBook, setWorldBookCategoryFilter, worldBookBatchMode, filteredWorldBooks,
    } = props;

  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const customTags = appData.worldBookTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    if (worldBookFileInputRef?.current) {
      worldBookFileInputRef.current.click();
    }
  };

  const handleCreateNewWorldBook = () => {
    const newBook: WorldBookEntry = {
      id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: '新建世界书',
      author: 'User',
      content: '世界书背景设定条目...',
      category: worldBookCategoryFilter !== '全部分组' ? worldBookCategoryFilter : '默认',
      entries: [
        {
          id: 'ent_' + Date.now(),
          keys: ['设定关键词'],
          content: '设定词条内容详情...',
          enabled: true
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (setEditingWorldBook) {
      setEditingWorldBook(newBook);
    } else {
      updateAppData((prev: any) => ({ ...prev, worldBooks: [...(prev.worldBooks || []), newBook] }));
      showToast('已新建世界书', 'success');
    }
  };

  return (
        <div className="max-w-7xl mx-auto space-y-4">
                {/* Hidden File Input for World Book Upload */}
                <input
                  type="file"
                  multiple
                  ref={worldBookFileInputRef}
                  onChange={handleFileUploadWorldBook}
                  accept=".docx,.txt,.json"
                  className="hidden"
                />

                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <ManagementHeader data-design-id="worldbook-header-banner"
        icon={<>
            <Book className="w-4 h-4" />
          </>}
        title={<>小手机世界书与世界观设定</>}
        badge={<>
                格式：.json (ST / Lorebook 格式) / .txt / .docx
              </>}
        description={<>
              管理小手机全局及角色专属的世界观词条、关键词递归扫描触发与资料条目
            </>}
        actions={<>
          <ActionButton title="导入世界书文档 (.docx, .txt, .json)" action="import" context="toolbar" tone="primary">
                      <Upload className="w-3 h-3" />
                      <span>导入小手机世界书</span>
                    </ActionButton>
          <ActionButton  action="create" context="toolbar">
                      <Plus className="w-3 h-3" />
                      <span>新建小手机世界书</span>
                    </ActionButton>
        </>}
      />

                {/* Toolbar (Search, Categories, Group Actions, Batch Mode) */}
                <ManagementToolbarFrame data-design-id="worldbook-toolbar">
                  <ManagementSearch type="text" value={worldBookSearchQuery} onChange={(e: any) => setWorldBookSearchQuery(e.target.value)} placeholder="搜索世界书..." />

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', ...(appData.worldBookCategories || [])]))}
                      currentGroup={worldBookCategoryFilter}
                      onSelectGroup={setWorldBookCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={worldBookTagsFilter}
                      onChange={setworldBookTagsFilter}
                    />
                    <CustomSelect
                      value={worldBookSortOrder}
                      onChange={(val) => setWorldBookSortOrder(val)}
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
                setWorldBookBatchMode(!worldBookBatchMode);
              }}
              title={worldBookBatchMode ? '退出批量选择' : '开启多选模式'}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                worldBookBatchMode
                  ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                  : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="leading-none">{worldBookBatchMode ? '完成' : '选择'}</span>
            </button>
                  </div>

                  {/* Group Navigation Bar & Actions */}
                  <BaseCard className="group-category-container p-2 w-full bg-[var(--group-card-bg,#E3CDAE)] border-none rounded-none shadow-none">
                    <GroupCategoryBar 
                        groups={Array.from(new Set(['默认', ...(appData.worldBookCategories || [])]))} 
                        currentGroup={worldBookCategoryFilter} 
                        onSelectGroup={setWorldBookCategoryFilter} 
                        getCount={(g) => (appData.worldBooks || []).filter((c: any) => (c.category || '默认') === g).length} 
                        totalCount={appData.worldBooks?.length || 0} 
                        allGroupName="全部分组" onDeleteGroup={(g) => { setManagingWorldBookCategory(g); /* trigger delete modal later via App.tsx logic */ }} />
                  </BaseCard>
                </ManagementToolbarFrame>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {worldBookBatchMode && (
                  <ManagementBatchOverlay >
                    <ManagementBatchBar data-design-id="worldbook-batch-bar">
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedWorldBookIds.length} 项
                        </span>
                        <ActionButton onClick={() => {
                            setWorldBookBatchMode(false);
                            setSelectedWorldBookIds([]);
                          }} aria-label="关闭选择" action="close" context="icon">
                          <X className="w-3.5 h-3.5" />
                        </ActionButton>
                      </div>

                      {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
                      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
                        <ActionButton type="button" onClick={() => {
                            if (selectedWorldBookIds.length === filteredWorldBooks.length && filteredWorldBooks.length > 0) {
                              setSelectedWorldBookIds([]);
                            } else {
                              setSelectedWorldBookIds(filteredWorldBooks.map((p: any) => p.id));
                            }
                          }} action="select" context="batch">
                          {selectedWorldBookIds.length === filteredWorldBooks.length && filteredWorldBooks.length > 0
                            ? '取消'
                            : '全选'}
                        </ActionButton>

                        <ActionButton type="button" onClick={() => {
                            const currentSet = new Set(selectedWorldBookIds);
                            const inversed = filteredWorldBooks
                              .filter((p: any) => !currentSet.has(p.id))
                              .map((p: any) => p.id);
                            setSelectedWorldBookIds(inversed);
                          }} action="invert" context="batch">
                          反选
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedWorldBookIds.length === 0} onClick={() => setShowWorldBookBatchMoveModal(true)} action="move" context="batch" tone="primary">
                          移动
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedWorldBookIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="tag" context="batch" tone="primary">
                          标签
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedWorldBookIds.length === 0} onClick={handleBatchDeleteWorldBooks} action="delete" context="batch" tone="danger">
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          删除
                        </ActionButton>
                      </div>
                    </ManagementBatchBar>
                  </ManagementBatchOverlay>
                )}

                {/* World Books List (Aligned with Phone Links panel margins and style) */}
                {filteredWorldBooks.length === 0 ? (
                  <BaseCard designId="worldbook-empty-state-card" className="text-center py-20 p-8 space-y-3">
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      {worldBookSearchQuery ? '未找到匹配的世界书' : '暂无世界书，点击右上角 “+” 按钮上传文档 (.docx / .txt / .json)'}
                    </p>
                    {!worldBookSearchQuery && (
                      <BaseButton
                        designId="worldbook-empty-upload-btn"
                        variant="primary"
                        onClick={() => openBatchUpload('worldbook')}
                        className="px-4 py-2 rounded-xl text-[10px] font-bold"
                      >
                        <Plus className="w-4 h-4" /> 上传世界书文档
                      </BaseButton>
                    )}
                  </BaseCard>
                ) : (
                  <div data-design-id="worldbook-list-container" className="flex flex-col gap-3">
                    {sortItemList(
                      filteredWorldBooks,
                      worldBookSortOrder,
                      (item: any) => item.title || '',
                      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
                    ).map((item: any) => {
                      const isSelected = selectedWorldBookIds.includes(item.id);

                      return (
                        <BaseCard
                          key={item.id}
                          designId={`worldbook-item-${item.id}`}
                          nested
                          onClick={() => {
                            if (worldBookBatchMode) {
                              if (isSelected) {
                                setSelectedWorldBookIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedWorldBookIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              setEditingWorldBook(JSON.parse(JSON.stringify(item)));
                              setIsWorldBookContentExpanded(false);
                            }
                          }}
                          className={`cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-4 ${
                            isSelected
                              ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)]'
                              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {/* Title & Author */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 w-full justify-center pb-1">
                              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={item.title}>
                                {item.title}
                              </h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                                {item.category || '默认'}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                              作者：{item.author || '默认'}
                            </p>
                          </div>

                          {worldBookBatchMode ? (
                            <div className="flex-shrink-0">
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                              ) : (
                                <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                              )}
                            </div>
                          ) : (
                            <div className="flex-shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                              <span>查看 / 编辑</span>
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
                  availableTags={appData.worldBookTags || []}
                  selectedCount={selectedWorldBookIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.worldBooks || [];
                      const newList = list.map((item: any) => {
                        if (selectedWorldBookIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.worldBookTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, worldBooks: newList, worldBookTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedWorldBookIds === 'function') {
                       props.setSelectedWorldBookIds([]);
                    }
                    showToast(`成功为 ${selectedWorldBookIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>
    );
};



