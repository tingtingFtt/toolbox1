import { ManagementSearch, ManagementHeader, ManagementToolbarFrame, ManagementBatchBar, ManagementBatchOverlay } from '../ui/ManagementChrome';
import { ActionButton } from '../ui/ActionButton';
import React, { useRef } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { BaseButton } from '../ui/BaseButton';
import { BaseCard } from '../ui/BaseCard';
import { BaseInput } from '../ui/BaseInput';
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload, Sparkles } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes, processImageFile } from '../../utils';

export const BeautificationThemesSection = (props: any) => {
    const {
        appData,
  beautificationTagsFilter = [],
  setbeautificationTagsFilter = () => {}, updateAppData, showToast, 
        beautificationBatchMode, beautificationSortOrder, MoreHorizontal, beautificationSearchQuery, beautificationCategoryFilter, setBeautificationBatchMode, setSelectedBeautificationIds, setBeautificationDetailTab, Circle, FolderPlus, handleBatchDeleteBeautifications, setRenameBeautificationGroupInput, setManagingBeautificationGroup, setBeautificationSortOrder, filteredBeautifications, CheckSquare, setShowNewBeautificationGroupModal, setBeautificationSearchQuery, sortItemList, setEditingBeautification, setCodeSearchQuery, setBeautificationCategoryFilter, setShowBeautificationBatchMoveModal, Move, selectedBeautificationIds, beautificationsList, ArrowUpDown,
        beautificationDocumentFileInputRef,
        handleBeautificationDocumentFileUpload
    } = props;

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const customTags = appData.beautificationTags || [];
  const builtInTags: string[] = [];


  const triggerUpload = () => {
    if (beautificationDocumentFileInputRef?.current) {
      beautificationDocumentFileInputRef.current.click();
    } else if (localFileInputRef.current) {
      localFileInputRef.current.click();
    }
  };

  const handleLocalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (handleBeautificationDocumentFileUpload) {
        handleBeautificationDocumentFileUpload(e.target.files);
      } else {
        const files = Array.from(e.target.files);
        let newEntries: any[] = [];
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            const scaled = await processImageFile(file, 800, 1200);
            newEntries.push({
              id: 'beau_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              name: file.name.replace(/\.[^/.]+$/, ''),
              category: beautificationCategoryFilter !== '全部分组' ? beautificationCategoryFilter : '默认',
              coverImage: scaled,
              css: '',
              createdAt: Date.now()
            });
          } else {
            const text = await file.text();
            newEntries.push({
              id: 'beau_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              name: file.name.replace(/\.[^/.]+$/, ''),
              category: beautificationCategoryFilter !== '全部分组' ? beautificationCategoryFilter : '默认',
              css: text,
              createdAt: Date.now()
            });
          }
        }
        if (newEntries.length > 0) {
          updateAppData((prev: any) => ({ ...prev, beautifications: [...(prev.beautifications || []), ...newEntries] }));
          showToast(`成功导入 ${newEntries.length} 个美化文件`, 'success');
        }
      }
      e.target.value = '';
    }
  };

  const handleCreateNewBeautification = () => {
    const newEntry = {
      id: 'beau_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: '新建美化',
      category: beautificationCategoryFilter !== '全部分组' ? beautificationCategoryFilter : '默认',
      css: '/* 自定义美化样式 */\n',
      createdAt: Date.now()
    };
    if (setEditingBeautification) {
      setEditingBeautification(newEntry);
    } else {
      updateAppData((prev: any) => ({ ...prev, beautifications: [...(prev.beautifications || []), newEntry] }));
      showToast('已新建美化主题', 'success');
    }
  };

  return (
        <div className="max-w-7xl mx-auto space-y-4">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={localFileInputRef}
                  multiple
                  accept=".docx,.txt,.json,.css,.png,.jpg,.jpeg,.webp,image/*"
                  className="hidden"
                  onChange={handleLocalFileChange}
                />

      <div className="space-y-3 md:space-y-4 mb-6">
                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <ManagementHeader data-design-id="beautification-header-banner"
        icon={<>
            <Sparkles className="w-4 h-4" />
          </>}
        title={<>小手机美化包</>}
        badge={<>
                格式：.css / .json / .png / .webp / .txt / .docx
              </>}
        description={<>
              管理小手机整体美化包、自定义 CSS 特效、气泡样式与背景壁纸
            </>}
        actions={<>
          <ActionButton title="导入美化文档或图片 (.css, .json, .png, .jpg, .webp, .txt, .docx)" action="import" context="toolbar" tone="primary">
                      <Upload className="w-3 h-3" />
                      <span>导入小手机美化</span>
                    </ActionButton>
          <ActionButton  action="create" context="toolbar">
                      <Plus className="w-3 h-3" />
                      <span>新建小手机美化</span>
                    </ActionButton>
        </>}
      />

                {/* Search Bar & Category Group Bar */}
                <ManagementToolbarFrame data-design-id="beautification-toolbar">
                  <ManagementSearch type="text" value={beautificationSearchQuery} onChange={(e: any) => setBeautificationSearchQuery(e.target.value)} placeholder="搜索美化名称、作者、类型、分类..." />

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', ...(appData.beautificationCategories || [])]))}
                      currentGroup={beautificationCategoryFilter}
                      onSelectGroup={setBeautificationCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={beautificationTagsFilter}
                      onChange={setbeautificationTagsFilter}
                    />
                    <CustomSelect
                      value={beautificationSortOrder}
                      onChange={(val) => setBeautificationSortOrder(val)}
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
                setBeautificationBatchMode(!beautificationBatchMode);
              }}
              title={beautificationBatchMode ? '退出批量选择' : '开启多选模式'}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                beautificationBatchMode
                  ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                  : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="leading-none">{beautificationBatchMode ? '完成' : '选择'}</span>
            </button>
                  </div>

                  {/* Group Navigation Bar & Actions */}
                  <BaseCard className="group-category-container p-2 w-full bg-[var(--group-card-bg,#E3CDAE)] border-none rounded-none shadow-none">
                    <GroupCategoryBar 
                      groups={Array.from(new Set(['默认', ...(appData.beautificationCategories || [])]))} 
                      currentGroup={beautificationCategoryFilter} 
                      onSelectGroup={setBeautificationCategoryFilter} 
                      getCount={(g) => (appData.beautifications || []).filter((c: any) => (c.category || '默认') === g).length} 
                      totalCount={appData.beautifications?.length || 0} 
                      allGroupName="全部分组" onDeleteGroup={(g) => { setManagingBeautificationGroup(g); /* trigger delete modal later via App.tsx logic */ }} />
                  </BaseCard>
                </ManagementToolbarFrame>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {beautificationBatchMode && (
                  <ManagementBatchOverlay >
                    <ManagementBatchBar data-design-id="beautification-batch-bar">
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedBeautificationIds.length} 项
                        </span>
                        <ActionButton onClick={() => {
                            setBeautificationBatchMode(false);
                            setSelectedBeautificationIds([]);
                          }} aria-label="关闭选择" action="close" context="icon">
                          <X className="w-3.5 h-3.5" />
                        </ActionButton>
                      </div>

                      {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
                      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
                        <ActionButton type="button" onClick={() => {
                            if (selectedBeautificationIds.length === filteredBeautifications.length && filteredBeautifications.length > 0) {
                              setSelectedBeautificationIds([]);
                            } else {
                              setSelectedBeautificationIds(filteredBeautifications.map((item: any) => item.id));
                            }
                          }} action="select" context="batch">
                          {selectedBeautificationIds.length === filteredBeautifications.length && filteredBeautifications.length > 0
                            ? '取消'
                            : '全选'}
                        </ActionButton>

                        <ActionButton type="button" onClick={() => {
                            const currentSet = new Set(selectedBeautificationIds);
                            const inversed = filteredBeautifications
                              .filter((item: any) => !currentSet.has(item.id))
                              .map((item: any) => item.id);
                            setSelectedBeautificationIds(inversed);
                          }} action="invert" context="batch">
                          反选
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedBeautificationIds.length === 0} onClick={() => setShowBeautificationBatchMoveModal(true)} action="move" context="batch" tone="primary">
                          <Move className="w-3 h-3 inline mr-1" />
                          移动
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedBeautificationIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="tag" context="batch" tone="primary">
                          标签
                        </ActionButton>

                        <ActionButton type="button" disabled={selectedBeautificationIds.length === 0} onClick={handleBatchDeleteBeautifications} action="delete" context="batch" tone="danger">
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          删除
                        </ActionButton>
                      </div>
                    </ManagementBatchBar>
                  </ManagementBatchOverlay>
                )}

                {/* Gallery List of Beautifications ("图集形式") */}
      </div>
                {filteredBeautifications.length === 0 ? (
                  <BaseCard designId="beautification-empty-card" className="text-center py-16 space-y-3">
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {beautificationSearchQuery || beautificationCategoryFilter !== '全部分组'
                        ? '未找到匹配的美化'
                        : '暂无美化'}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      点击右上角的 “+” 按钮，上传并导入美化文档或图片 (.docx, .txt, .json, .css, .png)
                    </p>
                  </BaseCard>
                ) : (
                  <div data-design-id="beautification-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                    {sortItemList(
                      filteredBeautifications,
                      beautificationSortOrder,
                      (item: any) => item.name || '',
                      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
                    ).map((item: any) => {
                      const isSelected = selectedBeautificationIds.includes(item.id);

                      return (
                        <BaseCard
                          key={item.id}
                          designId={`beautification-item-${item.id}`}
                          nested
                          onClick={() => {
                            if (beautificationBatchMode) {
                              if (isSelected) {
                                setSelectedBeautificationIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedBeautificationIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              setEditingBeautification({ ...item });
                              setBeautificationDetailTab('preview');
                              setCodeSearchQuery('');
                            }
                          }}
                          className={`cursor-pointer transition-all hover:shadow-lg flex flex-col relative overflow-hidden ${
                            isSelected
                              ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)]'
                              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {/* Card Cover (aspect-[2/3] for gallery format) */}
                          <div className="aspect-[2/3] w-full bg-zinc-100 dark:bg-zinc-800/80 relative overflow-hidden flex items-center justify-center p-2">
                            {item.coverImage ? (
                              <img
                                src={item.coverImage}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-center p-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
                                <FileText className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-tight">
                                  {item.name}
                                </span>
                                <span className="text-[9px] uppercase font-mono text-zinc-400 dark:text-zinc-500">
                                  {item.fileType || '美化'}
                                </span>
                              </div>
                            )}

                            {/* Batch Selection Checkbox */}
                            {beautificationBatchMode && (
                              <div className="absolute top-2 left-2 z-10 bg-black/50 rounded-full p-0.5">
                                {isSelected ? (
                                  <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                                ) : (
                                  <Circle className="w-5 h-5 text-white/80" />
                                )}
                              </div>
                            )}

                            {/* Category or Type Badge */}
                            {(item.type || (item.category && item.category !== '默认')) && (
                              <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/60 text-white ">
                                {item.type || item.category}
                              </span>
                            )}
                          </div>

                          {/* Theme Title & Author */}
                          <div className="p-3 space-y-1 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate" title={item.name}>
                              {item.name}
                            </h3>
                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                              <span className="truncate">作者：{item.author || '默认'}</span>
                              <span className="uppercase text-[9px]">{item.fileType || '文档'}</span>
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
                  availableTags={appData.beautificationsTags || []}
                  selectedCount={selectedBeautificationIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.beautifications || [];
                      const newList = list.map((item: any) => {
                        if (selectedBeautificationIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.beautificationsTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, beautifications: newList, beautificationsTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedBeautificationIds === 'function') {
                       props.setSelectedBeautificationIds([]);
                    }
                    showToast(`成功为 ${selectedBeautificationIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>
    );
};



