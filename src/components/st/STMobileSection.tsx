import React from 'react';
import { BatchTagModal } from '../ui/BatchTagModal';
import { Upload, Search, Plus, Trash2, Smartphone, Download, Settings, RefreshCw, X, MessageSquare, Phone, Map, Globe, Maximize2, Copy, FileText, CheckCircle2, AlertCircle, Info, Home, Book, FileJson, Image as ImageIcon, Music, Video, Archive, Link as LinkIcon, Edit3 } from 'lucide-react';
import { AppData, PhoneLink, ThemeEntry, PresetEntry, NormalCardEntry, ApiEntry, FontEntry, ExtraStoryEntry, StickerPackEntry, WorldBookEntry, ChatMemeEntry } from '../../types';
import { formatBytes, generateId, downloadJson, extractZip, createZip } from '../../utils';

export const STMobileSection = (props: any) => {
    const {
        appData, updateAppData, showToast, 
        Circle, phoneBatchMode, setPhoneSearchQuery, setPhoneBatchMode, filteredPhoneLinks, setEditingPhoneLink, selectedPhoneIds, phoneSearchQuery, handleBatchDeletePhoneLinks, setSelectedPhoneIds,
        // Auto-filled props will go here
    } = props;

    const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);

    return (
              <div className="max-w-7xl mx-auto space-y-5">
                {/* Search Bar & Batch Mode Controls */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={phoneSearchQuery}
                      onChange={(e: any) => setPhoneSearchQuery(e.target.value)}
                      placeholder="搜索小手机名称、链接、联系方式或描述..."
                      className="w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full justify-center pb-1">
                    <label className="px-3.5 py-2 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                      <input type="file" multiple accept=".json" className="hidden" onChange={(e) => {
                        if (e.target.files) props.handleFileUploadPhoneLink(e.target.files);
                        e.target.value = '';
                      }} />
                      <Upload className="w-3.5 h-3.5" /> 导入
                    </label>
                    <button
                      onClick={() => {
                        const newLink = {
                          id: 'phone_' + Date.now(),
                          name: '新建小手机链接',
                          url: '',
                          icon: '',
                          description: '',
                          createdAt: Date.now(),
                        };
                        props.updateAppData({ phoneLinks: [newLink, ...(props.appData.phoneLinks || [])] });
                      }}
                      className="px-3.5 py-2 text-[10px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" /> 新建
                    </button>

                    <button
                      onClick={() => {
                        setPhoneBatchMode(!phoneBatchMode);
                        setSelectedPhoneIds([]);
                      }}
                      className={`px-3.5 py-2 text-[10px] font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                        phoneBatchMode
                          ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {phoneBatchMode ? '退出选择' : '选择'}
                    </button>

                    {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                    {phoneBatchMode && (
                      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
                        <div className="batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]">
                          {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                              已选 {selectedPhoneIds.length} 项
                            </span>
                            <span role="button" onClick={() => {
                                setPhoneBatchMode(false);
                                setSelectedPhoneIds([]);
                              }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
                          </div>
                          
                                      {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              {/* 全选 / 取消 */}
              <button
                type="button"
                onClick={() => {
                  if (selectedPhoneIds.length === filteredPhoneLinks.length && filteredPhoneLinks.length > 0) {
                    setSelectedPhoneIds([]);
                  } else {
                    setSelectedPhoneIds(filteredPhoneLinks.map((c: any) => c.id));
                  }
                }}
                className="batch-btn"
              >
                {selectedPhoneIds.length === filteredPhoneLinks.length && filteredPhoneLinks.length > 0 ? '取消' : '全选'}
              </button>
              {/* 反选 */}
              <button
                type="button"
                onClick={() => {
                  const currentSet = new Set(selectedPhoneIds);
                  const inversed = filteredPhoneLinks.filter((c: any) => !currentSet.has(c.id)).map((c: any) => c.id);
                  setSelectedPhoneIds(inversed);
                }}
                className="batch-btn"
              >
                反选
              </button>
              {/* 标签 */}
              <button
                type="button"
                disabled={selectedPhoneIds.length === 0}
                onClick={() => setShowBatchTagModal(true)}
                className="batch-btn batch-btn-primary"
              >
                标签
              </button>
              {/* 删除 */}
              <button
                type="button"
                disabled={selectedPhoneIds.length === 0}
                onClick={handleBatchDeletePhoneLinks}
                className="batch-btn batch-btn-danger"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
                  </div>
                </div>

                {/* List of Mobile Links */}
                {filteredPhoneLinks.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {phoneSearchQuery ? '未找到匹配的小手机链接' : '暂无小手机链接'}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      点击右上角的 “+” 按钮，添加新的小手机链接
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPhoneLinks.map((item: any) => {
                      const isSelected = selectedPhoneIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (phoneBatchMode) {
                              if (isSelected) {
                                setSelectedPhoneIds((p: any) => p.filter((id: string) => id !== item.id));
                              } else {
                                setSelectedPhoneIds((p: any) => [...p, item.id]);
                              }
                            } else {
                              setEditingPhoneLink({ ...item });
                            }
                          }}
                          className={`p-4 bg-white dark:bg-zinc-900 border rounded-xl cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-4 ${
                            isSelected
                              ? 'border-rose-500 ring-2 ring-rose-500/30 dark:ring-rose-500/30'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {/* Name on Line 1, Link on Line 2 */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={item.name}>
                              {item.name}
                            </h3>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono" title={item.url}>
                              {item.url}
                            </p>
                          </div>

                          {phoneBatchMode ? (
                            <div className="flex-shrink-0">
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                              ) : (
                                <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                              )}
                            </div>
                          ) : (
                            <div className="flex-shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                              <span>编辑 / 查看</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              

                <BatchTagModal
                  isOpen={showBatchTagModal}
                  onClose={() => setShowBatchTagModal(false)}
                  availableTags={appData.phonesTags || []}
                  selectedCount={selectedPhoneIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.phones || [];
                      const newList = list.map((item: any) => {
                        if (selectedPhoneIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.phonesTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, phones: newList, phonesTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    if (typeof props.setSelectedPhoneIds === 'function') {
                       props.setSelectedPhoneIds([]);
                    }
                    showToast(`成功为 ${selectedPhoneIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

              </div>

    );
};
