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
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3 } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';

export const FontsSection = (props: any) => {
    const {
        appData,
  fontTagsFilter = [],
  setfontTagsFilter = () => {}, updateAppData, showToast, 
        setFontSortOrder, MoreHorizontal, setRenameFontCategoryInput, setEditingFont, fontFileInputRef, activePreviewFontId, fontSortOrder, setShowAddFontChoiceModal, setActivePreviewFontId, Circle, filteredFonts, handleFileUploadFont, fontCategoryFilter, setSelectedFontIds, setManagingFontCategory, CheckSquare, fontBatchMode, sortItemList, setFontBatchMode, setShowNewFontGroupModal, setShowFontBatchMoveModal, fontSearchQuery, selectedFontIds, setFontCategoryFilter, fontsList, handleBatchDeleteFonts, ArrowUpDown, setFontSearchQuery,
    } = props;

  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const customTags = appData.fontTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    if (fontFileInputRef?.current) {
      fontFileInputRef.current.click();
    }
  };

  return (
        <div className="max-w-7xl mx-auto space-y-4">
                {/* Hidden File Input for Font Upload */}
                <input
                  type="file"
                  multiple
                  ref={fontFileInputRef}
                  onChange={handleFileUploadFont}
                  accept=".ttf,.otf,.woff,.woff2"
                  className="hidden"
                />

      <div className="space-y-3 md:space-y-4 mb-6">
                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <ManagementHeader data-design-id="fonts-header-banner"
        icon={<>
            <FileText className="w-4 h-4" />
          </>}
        title={<>字体库管理</>}
        badge={<>
                格式：.ttf / .otf / .woff / .woff2
              </>}
        description={<>
              安装与预览自定义中英文字体文件，支持全局界面字体及酒馆卡面字体切换
            </>}
        actions={<>
          <ActionButton onClick={triggerUpload} title="导入字体文件 (.ttf, .otf, .woff, .woff2)" action="import" context="toolbar" tone="primary">
                      <Plus className="w-3 h-3" />
                      <span>导入字体文件</span>
                    </ActionButton>
        </>}
      />

                {/* Search Bar & Categories Toolbar */}
                <ManagementToolbarFrame data-design-id="fonts-toolbar">
                  <ManagementSearch type="text" value={fontSearchQuery} onChange={(e: any) => setFontSearchQuery(e.target.value)} placeholder="搜索字体名称..." />

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', ...(appData.fontCategories || [])]))}
                      currentGroup={fontCategoryFilter}
                      onSelectGroup={setFontCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={fontTagsFilter}
                      onChange={setfontTagsFilter}
                    />
                    <CustomSelect
                      value={fontSortOrder}
                      onChange={(val) => setFontSortOrder(val)}
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
                setFontBatchMode(!fontBatchMode);
              }}
              title={fontBatchMode ? '退出批量选择' : '开启多选模式'}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                fontBatchMode
                  ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                  : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="leading-none">{fontBatchMode ? '完成' : '选择'}</span>
            </button>
                  </div>

                  {/* Group Navigation Bar & Actions */}
                  <BaseCard className="group-category-container p-2 w-full bg-[var(--group-card-bg,#E3CDAE)] border-none rounded-none shadow-none">
                    <GroupCategoryBar 
                        groups={Array.from(new Set(['默认', ...(appData.fontCategories || [])]))} 
                        currentGroup={fontCategoryFilter} 
                        onSelectGroup={setFontCategoryFilter} 
                        getCount={(g) => (appData.fonts || []).filter((c: any) => (c.category || '默认') === g).length} 
                        totalCount={appData.fonts?.length || 0} 
                        allGroupName="全部分组" onDeleteGroup={(g) => { setManagingFontCategory(g); /* trigger delete modal later via App.tsx logic */ }} />
                  </BaseCard>
                </ManagementToolbarFrame>

                {/* Batch Mode Toolbar */}
                {fontBatchMode && (
                  <ManagementBatchOverlay >
                    <ManagementBatchBar data-design-id="fonts-batch-bar">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedFontIds.length} 项
                        </span>
                        <ActionButton onClick={() => {
                            setFontBatchMode(false);
                            setSelectedFontIds([]);
                          }} aria-label="关闭选择" action="close" context="icon"><X className="w-3.5 h-3.5" /></ActionButton>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
                        <ActionButton type="button" onClick={() => {
                            if (selectedFontIds.length === filteredFonts.length && filteredFonts.length > 0) {
                              setSelectedFontIds([]);
                            } else {
                              setSelectedFontIds(filteredFonts.map((p: any) => p.id));
                            }
                          }} action="select" context="batch">
                          {selectedFontIds.length === filteredFonts.length && filteredFonts.length > 0 ? '取消' : '全选'}
                        </ActionButton>
                        <ActionButton type="button" onClick={() => {
                            const currentSet = new Set(selectedFontIds);
                            const newSelected = filteredFonts
                              .map((c: any) => c.id)
                              .filter((id: string) => !currentSet.has(id));
                            setSelectedFontIds(newSelected);
                          }} action="invert" context="batch">
                          反选
                        </ActionButton>
                        <ActionButton type="button" disabled={selectedFontIds.length === 0} onClick={() => setShowFontBatchMoveModal(true)} action="move" context="batch" tone="primary">
                          移动分组
                        </ActionButton>
                        <ActionButton type="button" disabled={selectedFontIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="create" context="batch" tone="primary">
                          添加标签
                        </ActionButton>
                        <ActionButton type="button" disabled={selectedFontIds.length === 0} onClick={handleBatchDeleteFonts} action="delete" context="batch" tone="danger">
                          删除
                        </ActionButton>
                      </div>
                    </ManagementBatchBar>
                  </ManagementBatchOverlay>
                )}

                {/* Font Cards List */}
      </div>
                {filteredFonts.length === 0 ? (
                  <BaseCard designId="fonts-empty-card" className="text-center py-20 p-8 space-y-3">
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      {fontSearchQuery ? '未找到匹配的字体' : '暂无字体数据，点击右上角 “+” 按钮添加'}
                    </p>
                    {!fontSearchQuery && (
                      <BaseButton
                        designId="fonts-empty-add-btn"
                        variant="primary"
                        onClick={() => setShowAddFontChoiceModal(true)}
                        className="px-4 py-2 rounded-xl text-[10px] font-bold"
                      >
                        <Plus className="w-4 h-4" /> 添加字体
                      </BaseButton>
                    )}
                  </BaseCard>
                ) : (
                  <div data-design-id="fonts-grid" className="flex flex-col gap-3">
                    {sortItemList(
                      filteredFonts,
                      fontSortOrder,
                      (item: any) => item.name || '',
                      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
                    ).map((item: any) => {
                      const isSelected = selectedFontIds.includes(item.id);
                      const isActivePreview = activePreviewFontId === item.id;

                      return (
                        <BaseCard
                          key={item.id}
                          designId={`fonts-item-${item.id}`}
                          nested
                          onClick={() => {
                            if (fontBatchMode) {
                              if (isSelected) {
                                setSelectedFontIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedFontIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              setActivePreviewFontId(item.id);
                              showToast(`已切换预览字体为 “${item.name}”`, 'info');
                            }
                          }}
                          className={`cursor-pointer transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                            isActivePreview
                              ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)]'
                              : isSelected
                              ? 'border-rose-500 ring-2 ring-rose-500/30'
                              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 w-full justify-center pb-1">
                              <h3
                                className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate"
                                style={{ fontFamily: item.fontFamily }}
                              >
                                {item.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {item.category || '默认'}
                              </span>
                              {isActivePreview && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  预览中
                                </span>
                              )}
                            </div>

                            <p
                              className="text-[10px] text-zinc-600 dark:text-zinc-300 truncate pt-0.5"
                              style={{ fontFamily: item.fontFamily }}
                            >
                              永和九年，歲在癸丑 / AaBbCc 123
                            </p>

                            {item.url ? (
                              <p className="text-[10px] text-zinc-400 font-mono truncate">{item.url}</p>
                            ) : (
                              <p className="text-[10px] text-zinc-400 italic">本地文件上传</p>
                            )}
                          </div>

                          {fontBatchMode ? (
                            <div className="flex-shrink-0 self-end md:self-center">
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                              ) : (
                                <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                              )}
                            </div>
                          ) : (
                            <div className="flex-shrink-0 flex items-center gap-2 self-end md:self-center">
                              <BaseButton
                                variant="outline"
                                size="sm"
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  setEditingFont(JSON.parse(JSON.stringify(item)));
                                }}
                                className="px-3 py-1.5 text-[10px] font-semibold rounded-lg"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> 编辑
                              </BaseButton>
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
                  availableTags={appData.fontTags || []}
                  selectedCount={selectedFontIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.fonts || [];
                      const newList = list.map((item: any) => {
                        if (selectedFontIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.fontTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, fonts: newList, fontTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedFontIds === 'function') {
                       props.setSelectedFontIds([]);
                    }
                    showToast(`成功为 ${selectedFontIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>
    );
};



