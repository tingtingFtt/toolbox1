import React, { useMemo } from 'react';
import { Smartphone, Plus, Settings, ExternalLink, ArrowRightLeft, Trash2, Edit, Upload, Search, CheckCircle2, Circle, X, CheckSquare } from 'lucide-react';
import { BaseCard } from '../../components/ui/BaseCard';
import { BaseButton } from '../../components/ui/BaseButton';
import { BaseInput } from '../../components/ui/BaseInput';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { BaseBadge } from '../../components/ui/BaseBadge';

//  // If it doesn't exist, we'll remove it or import correctly
// Actually it's in ui, so  wait, the structure is src/components/ui. So from src/components/mobile it is ../ui/DeleteConfirmationModal.

import { DeleteConfirmationModal } from '../ui/UnifiedModal';
import { AppData, PhoneLink } from '../../types';

export const MobileLinksSection = ({
  appData,
  updateAppData,
  showToast,
  phoneFileInputRef,
  handleFileUploadPhoneLink,
  setShowAddPhoneModal,
  setEditingPhoneLink,
  phoneSearchQuery,
  setPhoneSearchQuery,
  phoneBatchMode,
  setPhoneBatchMode,
}: any) => {
  const [phoneSortOrder, setPhoneSortOrder] = React.useState<any>('time-desc');
  const [phoneCategoryFilter, setPhoneCategoryFilter] = React.useState('全部分组');
  const [selectedPhoneIds, setSelectedPhoneIds] = React.useState<string[]>([]);
  const [showPhoneLinkBatchMoveModal, setShowPhoneLinkBatchMoveModal] = React.useState(false);
  
  const handleBatchDeletePhoneLinks = () => {
    if (confirm(`确定删除这 ${selectedPhoneIds.length} 个链接吗？`)) {
      updateAppData((prev: AppData) => ({
        ...prev,
        phoneLinks: (prev.phoneLinks || []).filter((l: any) => !selectedPhoneIds.includes(l.id))
      }));
      setSelectedPhoneIds([]);
      setPhoneBatchMode(false);
      showToast('批量删除成功', 'success');
    }
  };
  const phoneLinks = appData.phoneLinks || [];
  
  const phoneLinkCategories = useMemo(() => Array.from(
    new Set(['全部分组', '默认', ...(appData.phoneLinkCategories || []), ...phoneLinks.map((t: any) => t.category || '默认')])
  ), [appData.phoneLinkCategories, phoneLinks]);

  const filteredPhoneLinks = useMemo(() => {
    return phoneLinks.filter((item: any) => {
      if (phoneCategoryFilter !== '全部分组' && item.category !== phoneCategoryFilter && !(phoneCategoryFilter === '默认' && !item.category)) {
        return false;
      }
      return true;
    }).sort((a: any, b: any) => {
      if (phoneSortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (phoneSortOrder === 'name-desc') return b.name.localeCompare(a.name);
      if (phoneSortOrder === 'time-asc') return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt; // time-desc is default
    });
  }, [phoneLinks, phoneCategoryFilter, phoneSortOrder]);

  return (

              <div className="max-w-7xl mx-auto space-y-4">
                <input
                  type="file"
                  ref={phoneFileInputRef}
                  accept=".json"
                  onChange={handleFileUploadPhoneLink}
                  className="hidden"
                />

                {/* Sub-interface Header Banner with Formats & Action Buttons */}
                            <div data-design-id="st-mobile-header-banner" className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">小手机链接</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.json / 网页直连
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              收藏并管理各类小手机网页端地址、快捷启动与联系配置
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
                      type="button"
                      onClick={() => setShowAddPhoneModal(true)}
                      className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
                      title="新建小手机链接"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新建小手机链接</span>
                    </button>
          <button
                      type="button"
                      onClick={() => phoneFileInputRef.current?.click()}
                      className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap"
                      title="导入小手机链接配置 (.json)"
                    >
                      <Upload className="w-3 h-3" />
                      <span>导入链接</span>
                    </button>
        </div>
      </div>

                {/* Search Bar & Batch Mode Controls */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2" />
                    <BaseInput
                      type="text"
                      value={phoneSearchQuery}
                      onChange={(e) => setPhoneSearchQuery(e.target.value)}
                      placeholder="搜索小手机名称、链接、联系方式或描述..."
                      className="w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneBatchMode((prev: any) => {
                          if (prev) setSelectedPhoneIds([]);
                          return !prev;
                        });
                      }}
                      title={phoneBatchMode ? '退出批量选择' : '开启多选模式'}
                      className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                        phoneBatchMode
                          ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                          : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span className="leading-none">{phoneBatchMode ? '完成' : '选择'}</span>
                    </button>
                  </div>
                </div>

                {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
                {phoneBatchMode && (
                  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
                    <div className="batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]">
                      {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                          已选 {selectedPhoneIds.length} 项
                        </span>
                        <span
                          role="button"
                          onClick={() => {
                            setPhoneBatchMode(false);
                            setSelectedPhoneIds([]);
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
                            const allIds = filteredPhoneLinks.map((item: any) => item.id);
                            if (selectedPhoneIds.length === allIds.length && allIds.length > 0) {
                              setSelectedPhoneIds([]);
                            } else {
                              setSelectedPhoneIds(allIds);
                            }
                          }}
                          className="batch-btn"
                        >
                          {selectedPhoneIds.length === filteredPhoneLinks.length && filteredPhoneLinks.length > 0
                            ? '取消'
                            : '全选'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const currentSet = new Set(selectedPhoneIds);
                            const inversed = filteredPhoneLinks
                              .filter((item: any) => !currentSet.has(item.id))
                              .map((item: any) => item.id);
                            setSelectedPhoneIds(inversed);
                          }}
                          className="batch-btn"
                        >
                          反选
                        </button>

                        <button
                          type="button"
                          disabled={selectedPhoneIds.length === 0}
                          onClick={handleBatchDeletePhoneLinks}
                          className="batch-btn batch-btn-danger"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* List of Mobile Links */}
                {filteredPhoneLinks.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {phoneSearchQuery ? '未找到匹配的小手机链接' : '暂无小手机链接'}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        点击下方按钮添加常用的小手机在线入口或配置链接
                      </p>
                    </div>
                    <div className="pt-1">
                      <BaseButton
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAddPhoneModal(true)}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>新建小手机链接</span>
                      </BaseButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredPhoneLinks.map((item: any) => {
                      const isSelected = selectedPhoneIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (phoneBatchMode) {
                              if (isSelected) {
                                setSelectedPhoneIds((p) => p.filter((id) => id !== item.id));
                              } else {
                                setSelectedPhoneIds((p) => [...p, item.id]);
                              }
                            } else {
                              setEditingPhoneLink({ ...item });
                            }
                          }}
                          className={`sub-block-card p-3.5 sm:p-4 bg-[var(--card-solid-bg,#EADAC7)] border-none rounded-none cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-b-2 border-b-[var(--accent)] ring-1 ring-[var(--line-focus)]'
                              : ''
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center flex-shrink-0 text-zinc-600 dark:text-zinc-400 mt-0.5 sm:mt-0">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-full" title={item.name}>
                                  {item.name}
                                </h3>
                                {item.contact && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                    联系方式: {item.contact}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-blue-600 dark:text-blue-400 truncate font-mono hover:underline" title={item.url}>
                                {item.url}
                              </p>
                              {item.description && (
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate" title={item.description}>
                                  {item.description}
                                </p>
                              )}
                            </div>
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
                            <div className="flex-shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {item.url && (
                                <a
                                  href={item.url.startsWith('http://') || item.url.startsWith('https://') ? item.url : `https://${item.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 text-[10px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 inline-flex items-center gap-1 transition-colors"
                                  title="在浏览器新标签打开"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>打开</span>
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingPhoneLink({ ...item })}
                                className="px-2 py-1 text-[10px] font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`确定删除小手机链接「${item.name}」吗？`)) {
                                    updateAppData({
                                      ...appData,
                                      phoneLinks: (appData.phoneLinks || []).filter((l: any) => l.id !== item.id)
                                    });
                                    showToast('已删除小手机链接', 'info');
                                  }
                                }}
                                className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 transition-colors"
                                title="删除链接"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

  );
};


