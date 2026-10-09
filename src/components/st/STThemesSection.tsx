import React, { useRef } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload, Palette , ArrowRightLeft } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';

export const STThemesSection = (props: any) => {
    const {
        appData,
  themeTagsFilter = [],
  setthemeTagsFilter = () => {}, updateAppData, showToast, 
        filteredThemes, setShowThemeBatchMoveModal, setRenameThemeGroupInput, themeCategoryFilter, selectedThemeIds, MoreHorizontal, setEditingTheme, setThemeSearchQuery, themeSortOrder, setShowNewThemeGroupModal, handleBatchDeleteThemes, Circle, setThemeCategoryFilter, FolderPlus, setManagingThemeGroup, themesList, setSelectedThemeIds, CheckSquare, setThemeDetailTab, sortItemList, themeSearchQuery, setThemeSortOrder, setCodeSearchQuery, themeBatchMode, Move, setThemeBatchMode, ArrowUpDown,
        themeDocumentFileInputRef,
        handleThemeDocumentFileUpload
    } = props;

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const customTags = appData.themeTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    if (themeDocumentFileInputRef?.current) {
      themeDocumentFileInputRef.current.click();
    } else if (localFileInputRef.current) {
      localFileInputRef.current.click();
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (handleThemeDocumentFileUpload) {
        handleThemeDocumentFileUpload(e.target.files);
      } else {
        const files = Array.from(e.target.files);
        let newEntries: any[] = [];
        let promises: Promise<void>[] = [];
        for (const file of files) {
          promises.push(
            file.text().then(text => {
              newEntries.push({
                id: 'th_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                name: file.name.replace(/\.[^/.]+$/, ''),
                category: themeCategoryFilter !== '全部分组' ? themeCategoryFilter : '默认',
                css: text,
                createdAt: Date.now()
              });
            }).catch(() => {})
          );
        }
        Promise.all(promises).then(() => {
          if (newEntries.length > 0) {
            updateAppData((prev: any) => ({ ...prev, themes: [...(prev.themes || []), ...newEntries] }));
            showToast(`成功导入 ${newEntries.length} 个主题文档`, 'success');
          }
        });
      }
      e.target.value = '';
    }
  };

  const handleCreateNewTheme = () => {
    const newTheme: ThemeEntry = {
      id: 'th_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: '新建主题',
      fileName: '新建主题.css',
      category: themeCategoryFilter !== '全部分组' ? themeCategoryFilter : '默认',
      content: '/* SillyTavern 自定义主题 CSS */\n:root {\n  --main-bg: #1e1e2e;\n}\n',
      css: '/* SillyTavern 自定义主题 CSS */\n:root {\n  --main-bg: #1e1e2e;\n}\n',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (setEditingTheme) {
      setEditingTheme(newTheme);
    } else {
      updateAppData((prev: any) => ({ ...prev, themes: [...(prev.themes || []), newTheme] }));
      showToast('已新建主题', 'success');
    }
  };

  return (
        <div className="max-w-7xl mx-auto space-y-4">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={localFileInputRef}
                  multiple
                  accept=".docx,.txt,.json,.css"
                  className="hidden"
                  onChange={handleLocalFileChange}
                />

                <div className="space-y-3 md:space-y-4 mb-6">
                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <div className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Palette className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">ST 主题库</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.css / .json / .txt / .docx
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              管理与导入酒馆界面的自定义主题 CSS 样式表、配置文档与色彩方案
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
                      type="button"
                      onClick={triggerUpload}
                      className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
                      title="导入 ST 主题文档 (.css, .json, .txt, .docx)"
                    >
                      <Upload className="w-3 h-3" />
                      <span>导入主题文档</span>
                    </button>
          <button
                      type="button"
                      onClick={handleCreateNewTheme}
                      className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新建主题</span>
                    </button>
        </div>
      </div>

                <div className="space-y-2.5 mb-6">
                  <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={themeSearchQuery}
                    onChange={(e: any) => setThemeSearchQuery(e.target.value)}
                    placeholder="搜索 ST 主题名称、作者、类型、分类..."
                    className="w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                  />
                </div>

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', '整体美化包', '自定义 CSS 特效', '气泡样式', '全屏背景壁纸', ...(appData.themeCategories || [])]))}
                      currentGroup={themeCategoryFilter}
                      onSelectGroup={setThemeCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={themeTagsFilter}
                      onChange={setthemeTagsFilter}
                    />
                    <CustomSelect
                      value={themeSortOrder}
                      onChange={(val) => setThemeSortOrder(val)}
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
                        setThemeBatchMode((prev: any) => {
                          if (prev) setSelectedThemeIds([]);
                          return !prev;
                        });
                      }}
                      title={themeBatchMode ? '退出批量选择' : '开启多选模式'}
                      className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                        themeBatchMode
                          ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                          : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span className="leading-none">{themeBatchMode ? '完成' : '选择'}</span>
                    </button>
                  </div>

                  {/* Group Navigation Bar & Actions */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 w-full">
                    <GroupCategoryBar 
                      groups={Array.from(new Set(['默认', '整体美化包', '自定义 CSS 特效', '气泡样式', '全屏背景壁纸', ...(appData.themeCategories || [])]))} 
                      currentGroup={themeCategoryFilter} 
                      onSelectGroup={setThemeCategoryFilter} 
                      getCount={(g) => appData.themes.filter((c: any) => (c.category || '默认') === g).length} 
                      totalCount={appData.themes?.length || 0} 
                      allGroupName="全部分组" onDeleteGroup={(g) => { setManagingThemeGroup(g); /* trigger delete modal later via App.tsx logic */ }} />
                  </div>
                </div>
                </div>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {themeBatchMode && (
                  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
                    <div className="batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]">
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedThemeIds.length} 项
                        </span>
                        <span role="button" onClick={() => {
                            setThemeBatchMode(false);
                            setSelectedThemeIds([]);
                          }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
                      </div>
                      
                                  {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              {/* 全选 / 取消 */}
              <button
                type="button"
                onClick={() => {
                  if (selectedThemeIds.length === filteredThemes.length && filteredThemes.length > 0) {
                    setSelectedThemeIds([]);
                  } else {
                    setSelectedThemeIds(filteredThemes.map((c: any) => c.id));
                  }
                }}
                className="batch-btn"
              >
                {selectedThemeIds.length === filteredThemes.length && filteredThemes.length > 0 ? '取消' : '全选'}
              </button>
              {/* 反选 */}
              <button
                type="button"
                onClick={() => {
                  const currentSet = new Set(selectedThemeIds);
                  const inversed = filteredThemes.filter((c: any) => !currentSet.has(c.id)).map((c: any) => c.id);
                  setSelectedThemeIds(inversed);
                }}
                className="batch-btn"
              >
                反选
              </button>
              {/* 移动 */}
              <button
                type="button"
                disabled={selectedThemeIds.length === 0}
                onClick={() => setShowThemeBatchMoveModal(true)}
                className="batch-btn batch-btn-primary"
              >
                移动
              </button>
              {/* 标签 */}
              <button
                type="button"
                disabled={selectedThemeIds.length === 0}
                onClick={() => setShowBatchTagModal(true)}
                className="batch-btn batch-btn-primary"
              >
                标签
              </button>
              {/* 删除 */}
              <button
                type="button"
                disabled={selectedThemeIds.length === 0}
                onClick={handleBatchDeleteThemes}
                className="batch-btn batch-btn-danger"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

                {/* Gallery List of ST Themes ("图集形式") */}
                {filteredThemes.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {themeSearchQuery || themeCategoryFilter !== '全部分组'
                        ? '未找到匹配的 ST 主题'
                        : '暂无 ST 主题'}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      点击右上角的 “+” 按钮，上传并导入 ST 主题文档 (.docx, .txt, .json, .css)
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                    {sortItemList(
                      filteredThemes,
                      themeSortOrder,
                      (item: any) => item.name || '',
                      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
                    ).map((item: any) => {
                      const isSelected = selectedThemeIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (themeBatchMode) {
                              if (isSelected) {
                                setSelectedThemeIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedThemeIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              setEditingTheme({ ...item });
                              setThemeDetailTab('info');
                              setCodeSearchQuery('');
                            }
                          }}
                          className={`group bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg flex flex-col relative ${
                            isSelected
                              ? 'border-rose-500 ring-2 ring-rose-500/30 dark:ring-rose-500/30'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
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
                                  {item.fileType || '主题'}
                                </span>
                              </div>
                            )}

                            {/* Batch Selection Checkbox */}
                            {themeBatchMode && (
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

                          {/* 3-Line Layout Header */}
                          <div className="p-3 space-y-1.5 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex flex-col h-full justify-between">
                            {/* Line 1: Name, Version */}
                            <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1" title={item.name}>
                                {item.name}
                                </h3>
                                {(item.version || item.fileType) && (
                                    <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 rounded flex-shrink-0">
                                        v{item.version || item.fileType}
                                    </span>
                                )}
                            </div>
                            
                            {/* Line 2: Group, Tags & other meta */}
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[60px] flex-shrink-0">
                                {item.category || '默认'}
                                </span>
                                {item.customTags && item.customTags.length > 0 && (
                                    <div className="flex-1 min-w-0">
                                        <TagEditor 
                                            customTags={item.customTags || []} 
                                            onChange={(newTags) => {
                                                updateAppData((prev: any) => ({
                                                    ...prev,
                                                    themes: (prev.themes || []).map((t: any) => t.id === item.id ? { ...t, customTags: newTags } : t)
                                                }));
                                            }}
                                            availableTags={appData.themesTags || []}
                                            maxDisplay={1}
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
                            <div className="flex items-center gap-1.5 pt-1 mt-auto">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // add tag logic
                                        const newTag = prompt('输入新标签：');
                                        if (newTag && newTag.trim()) {
                                            const tags = item.customTags || [];
                                            if (!tags.includes(newTag.trim())) {
                                                 updateAppData((prev: any) => {
                                                    const updatedThemes = (prev.themes || []).map((t: any) => t.id === item.id ? { ...t, customTags: [...tags, newTag.trim()] } : t);
                                                    const globalTags = prev.themesTags || [];
                                                    return {
                                                        ...prev,
                                                        themes: updatedThemes,
                                                        themesTags: Array.from(new Set([...globalTags, newTag.trim()]))
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
                                        downloadAnchorNode.setAttribute("download", `${item.name}.json`);
                                        document.body.appendChild(downloadAnchorNode);
                                        downloadAnchorNode.click();
                                        downloadAnchorNode.remove();
                                        showToast('已导出 JSON', 'success');
                                    }}
                                    className="px-2 py-1 text-[9px] rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors ml-auto"
                                >
                                    导出 JSON
                                </button>
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
                  availableTags={appData.themesTags || []}
                  selectedCount={selectedThemeIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.themes || [];
                      const newList = list.map((item: any) => {
                        if (selectedThemeIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.themesTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, themes: newList, themesTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedThemeIds === 'function') {
                       props.setSelectedThemeIds([]);
                    }
                    showToast(`成功为 ${selectedThemeIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>
    );
};


