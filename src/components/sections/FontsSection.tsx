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
                            <div data-design-id="fonts-header-banner" className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">字体库管理</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.ttf / .otf / .woff / .woff2
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              安装与预览自定义中英文字体文件，支持全局界面字体及酒馆卡面字体切换
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button 
                      title="导入字体文件 (.ttf, .otf, .woff, .woff2)"
                     className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap">
                      <Plus className="w-3 h-3" />
                      <span>导入字体文件</span>
                    </button>
        </div>
      </div>

                {/* Search Bar & Categories Toolbar */}
                <div data-design-id="fonts-toolbar" className="space-y-2.5 mb-6">
                  <div className="relative w-full ">
                    <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                    <BaseInput
                      type="text"
                      value={fontSearchQuery}
                      onChange={(e: any) => setFontSearchQuery(e.target.value)}
                      placeholder="搜索字体名称..."
                      className="w-full pl-9 pr-4 py-1.5 text-[10px] rounded-lg"
                    />
                  </div>

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
                </div>

                {/* Batch Mode Toolbar */}
                {fontBatchMode && (
                  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
                    <div data-design-id="fonts-batch-bar" className="batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedFontIds.length} 项
                        </span>
                        <span role="button" onClick={() => {
                            setFontBatchMode(false);
                            setSelectedFontIds([]);
                          }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedFontIds.length === filteredFonts.length && filteredFonts.length > 0) {
                              setSelectedFontIds([]);
                            } else {
                              setSelectedFontIds(filteredFonts.map((p: any) => p.id));
                            }
                          }}
                          className="batch-btn"
                        >
                          {selectedFontIds.length === filteredFonts.length && filteredFonts.length > 0 ? '取消' : '全选'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentSet = new Set(selectedFontIds);
                            const newSelected = filteredFonts
                              .map((c: any) => c.id)
                              .filter((id: string) => !currentSet.has(id));
                            setSelectedFontIds(newSelected);
                          }}
                          className="batch-btn"
                        >
                          反选
                        </button>
                        <button
                          type="button"
                          disabled={selectedFontIds.length === 0}
                          onClick={() => setShowFontBatchMoveModal(true)}
                          className="batch-btn batch-btn-primary"
                        >
                          移动分组
                        </button>
                        <button
                          type="button"
                          disabled={selectedFontIds.length === 0}
                          onClick={() => setShowBatchTagModal(true)}
                          className="batch-btn batch-btn-primary"
                        >
                          添加标签
                        </button>
                        <button
                          type="button"
                          disabled={selectedFontIds.length === 0}
                          onClick={handleBatchDeleteFonts}
                          className="batch-btn batch-btn-danger"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
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


