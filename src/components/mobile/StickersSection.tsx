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
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload, CheckSquare, ArrowUpDown } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';

export const StickersSection = (props: any) => {
    const {
        appData,
  stickerTagsFilter = [],
  setstickerTagsFilter = () => {}, updateAppData, showToast, 
        stickerSearchQuery, selectedStickerPackIds, setSelectedStickerPackIds, MoreHorizontal, openBatchUpload, setStickerDetailTab, setRenameStickerCategoryInput, stickerFileInputRef, Circle, setShowNewStickerGroupModal, setShowStickerBatchMoveModal, setEditingStickerPack, stickerBatchMode, setStickerBatchMode, setStickerSearchQuery, stickerPacksList, handleFileUploadSticker, handleBatchDeleteStickerPacks, setStickerCategoryFilter, filteredStickerPacks, stickerCategoryFilter, setManagingStickerCategory, sortItemList, stickerSortOrder, setStickerSortOrder
    } = props;

  const [localSortOrder, setLocalSortOrder] = React.useState('default');
  const currentSortOrder = stickerSortOrder || localSortOrder;
  const updateSortOrder = setStickerSortOrder || setLocalSortOrder;
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const customTags = appData.stickerTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    if (stickerFileInputRef?.current) {
      stickerFileInputRef.current.click();
    }
  };

  const handleCreateNewStickerPack = () => {
    const newPack: StickerPackEntry = {
      id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: '新建表情包',
      category: stickerCategoryFilter !== '全部分组' ? stickerCategoryFilter : '默认',
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (setEditingStickerPack) {
      setEditingStickerPack(newPack);
    } else {
      updateAppData((prev: any) => ({ ...prev, stickerPacks: [...(prev.stickerPacks || []), newPack] }));
      showToast('已新建表情包', 'success');
    }
  };

  return (
        <div className="max-w-7xl mx-auto space-y-4">
                {/* Hidden File Input for Sticker Document Upload */}
                <input
                  type="file"
                  multiple
                  ref={stickerFileInputRef}
                  onChange={handleFileUploadSticker}
                  accept=".png,.jpg,.jpeg,.gif,.webp,.zip,.json,.txt,.docx"
                  className="hidden"
                />

      <div className="space-y-3 md:space-y-4 mb-6">
                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <ManagementHeader data-design-id="stickers-header-banner"
        icon={<>
            <ImageIcon className="w-4 h-4" />
          </>}
        title={<>表情包仓库</>}
        badge={<>
                格式：.png / .gif / .webp / .zip / .json / .docx
              </>}
        description={<>
              导入和管理聊天表情贴图、角色专属大头贴、动态 GIF 与批量 ZIP 表情包
            </>}
        actions={<>
          <ActionButton type="button" onClick={triggerUpload} title="导入表情包或图片 (.png, .gif, .webp, .zip, .json, .docx)" action="import" context="toolbar" tone="primary">
                      <Upload className="w-3 h-3" />
                      <span>导入表情包</span>
                    </ActionButton>
          <ActionButton type="button" onClick={handleCreateNewStickerPack} action="create" context="toolbar">
                      <Plus className="w-3 h-3" />
                      <span>新建表情包</span>
                    </ActionButton>
        </>}
      />

                
                {/* Toolbar (Search, Categories, Group Actions, Batch Mode) */}
                <ManagementToolbarFrame data-design-id="stickers-toolbar">
                  {/* Search Input */}
                  <ManagementSearch designId="stickers-search-input" type="text" value={stickerSearchQuery} onChange={(e: any) => setStickerSearchQuery(e.target.value)} placeholder="搜索表情包名称、作者或内容..." />

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', ...(appData.stickerCategories || [])]))}
                      currentGroup={stickerCategoryFilter}
                      onSelectGroup={setStickerCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={stickerTagsFilter}
                      onChange={setstickerTagsFilter}
                    />
                    <CustomSelect
                      value={currentSortOrder}
                      onChange={(val) => updateSortOrder(val)}
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
                setStickerBatchMode(!stickerBatchMode);
              }}
              title={stickerBatchMode ? '退出批量选择' : '开启多选模式'}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                stickerBatchMode
                  ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                  : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="leading-none">{stickerBatchMode ? '完成' : '选择'}</span>
            </button>
                  </div>

                  {/* Group Navigation Bar & Actions */}
                  <BaseCard designId="stickers-group-bar-card" className="p-2 w-full">
                    <GroupCategoryBar 
                        groups={Array.from(new Set(['默认', ...(appData.stickerCategories || [])]))} 
                        currentGroup={stickerCategoryFilter} 
                        onSelectGroup={setStickerCategoryFilter} 
                        getCount={(g) => (appData.stickerPacks || []).filter((c: any) => (c.category || '默认') === g).length} 
                        totalCount={appData.stickerPacks?.length || 0} 
                        allGroupName="全部分组" onDeleteGroup={(g) => { setManagingStickerCategory(g); /* trigger delete modal later via App.tsx logic */ }} />
                  </BaseCard>
                </ManagementToolbarFrame>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {stickerBatchMode && (
                  <ManagementBatchOverlay >
                    <ManagementBatchBar data-design-id="stickers-batch-bar">
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedStickerPackIds.length} 项
                        </span>
                        <ActionButton onClick={() => {
                            setStickerBatchMode(false);
                            setSelectedStickerPackIds([]);
                          }} aria-label="关闭选择" action="close" context="icon">
                          <X className="w-3.5 h-3.5" />
                        </ActionButton>
                      </div>

                      {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
                      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
                        <ActionButton type="button" onClick={() => {
                            if (selectedStickerPackIds.length === filteredStickerPacks.length && filteredStickerPacks.length > 0) {
                              setSelectedStickerPackIds([]);
                            } else {
                              setSelectedStickerPackIds(filteredStickerPacks.map((p: any) => p.id));
                            }
                          }} action="select" context="batch">
                          {selectedStickerPackIds.length === filteredStickerPacks.length && filteredStickerPacks.length > 0
                            ? '取消'
                            : '全选'}
                        </ActionButton>

                        <ActionButton type="button" onClick={() => {
                            const currentSet = new Set(selectedStickerPackIds);
                            const inversed = filteredStickerPacks
                              .filter((p: any) => !currentSet.has(p.id))
                              .map((p: any) => p.id);
                            setSelectedStickerPackIds(inversed);
                          }} action="invert" context="batch">
                          反选
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedStickerPackIds.length === 0} onClick={() => setShowStickerBatchMoveModal(true)} action="move" context="batch" tone="primary">
                          移动
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedStickerPackIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="tag" context="batch" tone="primary">
                          标签
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedStickerPackIds.length === 0} onClick={handleBatchDeleteStickerPacks} action="delete" context="batch" tone="danger">
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          删除
                        </ActionButton>
                      </div>
                    </ManagementBatchBar>
                  </ManagementBatchOverlay>
                )}

                {/* Gallery List of Stickers */}
                {filteredStickerPacks.length === 0 ? (
                  <BaseCard designId="stickers-empty-card" className="text-center py-16 space-y-3">
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {stickerSearchQuery || stickerCategoryFilter !== '全部分组'
                        ? '未找到匹配的表情包'
                        : '暂无表情包'}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      点击右上角的 “新建表情包” 按钮，导入表情包 (.zip) 或添加本地图片
                    </p>
                  </BaseCard>
                ) : (
                  <div data-design-id="stickers-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5">
                    {sortItemList(filteredStickerPacks, stickerSortOrder).map((item: any) => {
                      const isSelected = selectedStickerPackIds.includes(item.id);
                      return (
                        <BaseCard
                          key={item.id}
                          designId={`stickers-item-${item.id}`}
                          nested
                          onClick={() => {
                            if (stickerBatchMode) {
                              if (isSelected) {
                                setSelectedStickerPackIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedStickerPackIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              setEditingStickerPack({ ...item });
                            }
                          }}
                          className={`group overflow-hidden cursor-pointer transition-all hover:shadow-lg flex flex-col relative ${
                            isSelected
                              ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)]'
                              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {/* Card Cover (aspect-square for stickers) */}
                          <div className="aspect-square w-full bg-zinc-100 dark:bg-zinc-800/80 relative overflow-hidden flex items-center justify-center p-2">
                             <ImageIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
                          </div>
                          
                          {/* Content */}
                          <div className="p-3 flex flex-col flex-1">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.title || item.name || '未命名表情包'}
                            </h3>
                            {item.author && (
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                                {item.author}
                              </p>
                            )}
                            <div className="mt-2 text-[10px] text-zinc-400">
                              {item.items?.length || 0} 个表情
                            </div>
                          </div>
                        </BaseCard>
                      );
                    })}
                  </div>
                )}

                <BatchTagModal
                  isOpen={showBatchTagModal}
                  onClose={() => setShowBatchTagModal(false)}
                  availableTags={appData.stickerTags || []}
                  selectedCount={selectedStickerPackIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.stickerPacks || [];
                      const newList = list.map((item: any) => {
                        if (selectedStickerPackIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                        
                      const globalTags = prev.stickerTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                        
                      return { ...prev, stickerPacks: newList, stickerTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedStickerPackIds === 'function') {
                       props.setSelectedStickerPackIds([]);
                    }
                    showToast(`成功为 ${selectedStickerPackIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />
              </div>
            </div>
          );
        };



