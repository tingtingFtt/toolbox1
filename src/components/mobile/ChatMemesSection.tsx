import React, { useRef } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { BaseButton } from '../ui/BaseButton';
import { BaseCard } from '../ui/BaseCard';
import { BaseInput } from '../ui/BaseInput';
import { Search, Plus, Tag, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3, Upload, Smile } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes } from '../../utils';

export const ChatMemesSection = (props: any) => {
    const {
        appData,
  chatMemeTagsFilter = [],
  setchatMemeTagsFilter = () => {}, updateAppData, showToast, 
        setChatMemeSortOrder, setRenameChatMemeGroupInput, chatMemeCategoryFilter, selectedChatMemeIds, setChatMemeSearchQuery, setEditingChatMeme, handleDeleteSelectedChatMemes, chatMemeSortOrder, FolderPlus, chatMemesList, setChatMemeCategoryFilter, handleMoveSelectedChatMemes, CheckSquare, setSelectedChatMemeIds, chatMemeGroupPressTimer, filteredChatMemes, Check, chatMemeBatchMode, setChatMemeBatchMode, setShowChatExportModal, setShowNewChatMemeGroupModal, chatMemeSearchQuery, setManagingChatMemeGroup, ArrowUpDown,
        chatMemeFileInputRef,
        handleChatMemeFileUpload
    } = props;

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const customTags = appData.chatMemeTags || [];
  const builtInTags: string[] = [];

  const triggerUpload = () => {
    if (chatMemeFileInputRef?.current) {
      chatMemeFileInputRef.current.click();
    } else if (localFileInputRef.current) {
      localFileInputRef.current.click();
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (handleChatMemeFileUpload) {
        handleChatMemeFileUpload(e.target.files);
      } else {
        const files = Array.from(e.target.files);
        let newEntries: any[] = [];
        let promises: Promise<void>[] = [];
        for (const file of files) {
          promises.push(
            file.text().then(text => {
              newEntries.push({
                id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                title: file.name.replace(/\.[^/.]+$/, ''),
                content: text,
                category: chatMemeCategoryFilter !== '全部分组' ? chatMemeCategoryFilter : '默认',
                createdAt: Date.now()
              });
            }).catch(() => {})
          );
        }
        Promise.all(promises).then(() => {
          if (newEntries.length > 0) {
            updateAppData((prev: any) => ({ ...prev, chatMemes: [...(prev.chatMemes || []), ...newEntries] }));
            showToast(`成功导入 ${newEntries.length} 个聊天梗`, 'success');
          }
        });
      }
      e.target.value = '';
    }
  };

  const handleCreateNewChatMeme = () => {
    const newMeme: ChatMemeEntry = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: '新建聊天梗',
      content: '梗内容或对话名场面...',
      category: chatMemeCategoryFilter !== '全部分组' ? chatMemeCategoryFilter : '默认',
      createdAt: Date.now()
    };
    if (setEditingChatMeme) {
      setEditingChatMeme(newMeme);
    } else {
      updateAppData((prev: any) => ({ ...prev, chatMemes: [...(prev.chatMemes || []), newMeme] }));
      showToast('已新建聊天梗', 'success');
    }
  };

  return (
        <div className="max-w-7xl mx-auto space-y-5">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={localFileInputRef}
                  multiple
                  accept=".docx,.txt,.json"
                  className="hidden"
                  onChange={handleLocalFileChange}
                />

                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <div data-design-id="chatmemes-header-banner" className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Smile className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">聊天梗与名场面</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.docx (Word 语录/名场面) / .txt / .json
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              收录角色聊天名言、发疯文学、经典语录梗与社区流行段子
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
                      type="button"
                      onClick={triggerUpload}
                      className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
                      title="导入聊天梗文档 (.docx, .txt, .json)"
                    >
                      <Upload className="w-3 h-3" />
                      <span>导入聊天梗</span>
                    </button>
          <button
                      type="button"
                      onClick={handleCreateNewChatMeme}
                      className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新建聊天梗</span>
                    </button>
        </div>
      </div>

                {/* 聊天梗：搜索 / 分组 / 选择控制区 */}
                <BaseCard designId="chatmemes-toolbar" className="p-2.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 w-full justify-center pb-1">
                    <div className="relative w-full sm:w-64 flex-shrink-0">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10" />
                      <BaseInput
                        designId="chatmemes-search-input"
                        type="text"
                        value={chatMemeSearchQuery}
                        onChange={(e: any) => setChatMemeSearchQuery(e.target.value)}
                        placeholder="搜索聊天梗..."
                        className="w-full pl-9 pr-3 py-1.5 text-[10px] rounded-lg"
                      />
                    </div>
                    <GroupCategoryBar 
                        groups={Array.from(new Set(['默认', ...(appData.chatMemeCategories || [])]))} 
                        currentGroup={chatMemeCategoryFilter} 
                        onSelectGroup={setChatMemeCategoryFilter} 
                        getCount={(g) => (appData.chatMemes || []).filter((c: any) => (c.category || '默认') === g).length} 
                        totalCount={appData.chatMemes?.length || 0} 
                        allGroupName="全部分组" onDeleteGroup={(g) => { setManagingChatMemeGroup(g); /* trigger delete modal later via App.tsx logic */ }} />
                    <div className="w-full flex items-center justify-start gap-2 flex-wrap">
                    <CategoryFilterDropdown 
                      groups={Array.from(new Set(['默认', ...(appData.chatMemeCategories || [])]))}
                      currentGroup={chatMemeCategoryFilter}
                      onSelectGroup={setChatMemeCategoryFilter}
                      allGroupName="全部分组"
                    />
                    <TagFilterDropdown
                      builtInTags={builtInTags}
                      customTags={customTags}
                      selectedTags={chatMemeTagsFilter}
                      onChange={setchatMemeTagsFilter}
                    />
                    <CustomSelect
                      value={chatMemeSortOrder}
                      onChange={(val) => setChatMemeSortOrder(val)}
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
                setChatMemeBatchMode(!chatMemeBatchMode);
              }}
              title={chatMemeBatchMode ? '退出批量选择' : '开启多选模式'}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                chatMemeBatchMode
                  ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                  : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="leading-none">{chatMemeBatchMode ? '完成' : '选择'}</span>
            </button>
                    </div>
                  </div>
                </BaseCard>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {chatMemeBatchMode && (
                  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
                    <div data-design-id="chatmemes-batch-bar" className="batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]">
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedChatMemeIds.length} 项
                        </span>
                        <span
                          role="button"
                          onClick={() => {
                            setChatMemeBatchMode(false);
                            setSelectedChatMemeIds([]);
                          }}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
                      <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedChatMemeIds.length === filteredChatMemes.length && filteredChatMemes.length > 0) {
                              setSelectedChatMemeIds([]);
                            } else {
                              setSelectedChatMemeIds(filteredChatMemes.map((m: any) => m.id));
                            }
                          }}
                          className="batch-btn"
                        >
                          {selectedChatMemeIds.length === filteredChatMemes.length && filteredChatMemes.length > 0
                            ? '取消'
                            : '全选'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const currentSet = new Set(selectedChatMemeIds);
                            const inversed = filteredChatMemes
                              .filter((m: any) => !currentSet.has(m.id))
                              .map((m: any) => m.id);
                            setSelectedChatMemeIds(inversed);
                          }}
                          className="batch-btn"
                        >
                          反选
                        </button>

                        <div className="inline-block">
                          <CustomSelect
                            value=""
                            onChange={(val) => { if (val) handleMoveSelectedChatMemes(val); }}
                            placeholder="移动到分组"
                            disabled={!selectedChatMemeIds.length}
                            options={[
                              { value: '', label: '移动分组' },
                              ...(appData.chatMemeCategories || ['默认']).map((g: any) => ({ value: g, label: g }))
                            ]}
                            className="h-[24px] px-2 text-[10px] font-medium rounded bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-40"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={!selectedChatMemeIds.length}
                          onClick={() => setShowChatExportModal(true)}
                          className="batch-btn batch-btn-primary"
                        >
                          <Download className="w-3 h-3 inline mr-1" />
                          导出
                        </button>

                        <button
                          type="button"
                          disabled={!selectedChatMemeIds.length}
                          onClick={handleDeleteSelectedChatMemes}
                          className="batch-btn batch-btn-danger"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {filteredChatMemes.length === 0 ? (
                  <BaseCard designId="chatmemes-empty-card" className="min-h-[280px] flex items-center justify-center text-[10px] text-zinc-400">暂无聊天梗</BaseCard>
                ) : (
                  <div data-design-id="chatmemes-grid" className="flex flex-col gap-2">
                    {filteredChatMemes.map((item: any) => (
                      <BaseCard key={item.id} designId={`chatmemes-item-${item.id}`} nested onClick={() => chatMemeBatchMode ? setSelectedChatMemeIds((ids: any) => ids.includes(item.id) ? ids.filter((id: string) => id !== item.id) : [...ids, item.id]) : setEditingChatMeme(item)} className={`relative w-full text-left cursor-pointer transition-colors ${selectedChatMemeIds.includes(item.id) ? 'border-[var(--accent)] ring-1 ring-[var(--line-focus)]' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'}`}>
                        {chatMemeBatchMode && <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedChatMemeIds.includes(item.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-zinc-300 dark:border-zinc-600'}`}>{selectedChatMemeIds.includes(item.id) && <Check className="w-3 h-3 text-white" />}</div>}
                        <div className="pr-8 text-xs text-[var(--text-serif,#3f3f46)] dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">{item.content}</div>
                      </BaseCard>
                    ))}
                  </div>
                )}
              

                <BatchTagModal
                  isOpen={showBatchTagModal}
                  onClose={() => setShowBatchTagModal(false)}
                  availableTags={appData.chatMemeTags || []}
                  selectedCount={selectedChatMemeIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.chatMemes || [];
                      const newList = list.map((item: any) => {
                        if (selectedChatMemeIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.chatMemeTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, chatMemes: newList, chatMemeTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedChatMemeIds === 'function') {
                       props.setSelectedChatMemeIds([]);
                    }
                    showToast(`成功为 ${selectedChatMemeIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>
    );
};


