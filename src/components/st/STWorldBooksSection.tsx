import { NewGroupModal, BottomSheetModal, UnifiedModal, DeleteConfirmationModal } from '../ui/UnifiedModal';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import {
  BookOpen, Plus, Search, Trash2, Edit3, FolderPlus, ArrowRightLeft,
  Download, Upload, Copy, Check, SlidersHorizontal, ArrowUpDown, X,
  Maximize2, Minimize2, Sparkles, ExternalLink, Hash, CheckSquare,
  Square, Eye, RefreshCw, History, RotateCcw
, Tag } from 'lucide-react';
import { AppData, STWorldBookEntry, STWorldBookRule, CardEntry } from '../../types';
import { estimateTokens, normalizeResourceName, triggerFileDownload } from '../../utils';
import { normalizeStWorldBookEntries, syncStWorldBookBackToCards } from '../../utils';
import { compareWorldBooks } from '../../utils/diffEngine';
import { sessionStore } from '../../utils/sessionStore';

interface STWorldBooksSectionProps {
  appData: AppData;
  updateAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  sortItemList: <T>(items: T[], sortOrder: any, getName: (item: T) => string, getCreatedAt?: (item: T) => number) => T[];
  onOpenCardDetail?: (cardId: string) => void;
  jumpTargetId?: string | null;
  onClearJumpTarget?: () => void;
}

export const STWorldBooksSection = React.memo<STWorldBooksSectionProps>(({
  appData,
  updateAppData,
  showToast,
  sortItemList,
  onOpenCardDetail,
  jumpTargetId,
  onClearJumpTarget,
}) => {
  const [searchQuery, setSearchQuery] = useState(() => sessionStore.stWorldBooks.searchQuery);
  const [tagFilter, setTagFilter] = useState<string[]>(() => sessionStore.stWorldBooks.tagFilter);
  const [categoryFilter, setCategoryFilter] = useState(() => sessionStore.stWorldBooks.categoryFilter);
  const [sortOrder, setSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>(() => sessionStore.stWorldBooks.sortOrder);

  useEffect(() => {
    sessionStore.stWorldBooks.searchQuery = searchQuery;
  }, [searchQuery]);
  useEffect(() => {
    sessionStore.stWorldBooks.tagFilter = tagFilter;
  }, [tagFilter]);
  useEffect(() => {
    sessionStore.stWorldBooks.categoryFilter = categoryFilter;
  }, [categoryFilter]);
  useEffect(() => {
    sessionStore.stWorldBooks.sortOrder = sortOrder;
  }, [sortOrder]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);

  // 3-step Delete Confirmation State
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{
    isOpen: boolean;
    message: string;
    itemCount: number;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    itemCount: 1,
    onConfirm: () => {}
  });

  const requestDelete = (message: string, itemCount: number, onConfirm: () => void) => {
    setDeleteConfirmConfig({
      isOpen: true,
      message,
      itemCount,
      onConfirm
    });
  };

  // Detail Modal State
  const [activeWb, setActiveWb] = useState<STWorldBookEntry | null>(null);

  useEffect(() => {
    if (jumpTargetId && appData.stWorldBooks) {
      const target = appData.stWorldBooks.find(r => r.id === jumpTargetId);
      if (target) {
        setActiveWb(target);
        if (onClearJumpTarget) onClearJumpTarget();
      }
    }
  }, [jumpTargetId, appData.stWorldBooks, onClearJumpTarget]);

  const [detailTab, setDetailTab] = useState<'entries' | 'json' | 'settings' | 'versions'>('settings');
  const [entrySearchQuery, setEntrySearchQuery] = useState('');
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null);
  const [entryForm, setEntryForm] = useState<STWorldBookRule>({
    keys: [],
    secondary_keys: [],
    comment: '',
    content: '',
    constant: false,
    selective: true,
    insertion_order: 100,
    enabled: true,
    position: 'before_char',
  });
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [rawJsonDraft, setRawJsonDraft] = useState('');

  // Add / Group / Move Modals
  const [showAddWbModal, setShowAddWbModal] = useState(false);
  const [newWbForm, setNewWbForm] = useState({
    name: '',
    author: '',
    description: '',
  });

  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchTargetCategory, setBatchTargetCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawWorldBooks = appData.stWorldBooks || [];
  const categories = Array.from(
    new Set(['默认', ...(appData.stWorldBookCategories || []), ...rawWorldBooks.map((p: any) => p.category || '默认')])
  );

  
  const customTags = appData.stWorldBookTags || [];
  const builtInTags: string[] = [];
  const filtered = useMemo(() => {
    return rawWorldBooks.filter((item: any) => {
      if (categoryFilter !== '全部分组' && (item.category || '默认') !== categoryFilter) {
        return false;
      }
      if (tagFilter.length > 0) {
        const allTags = [...(item.customTags || [])];
        if (!tagFilter.every(t => allTags.includes(t))) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
    
      return (
        item.name.toLowerCase().includes(q) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.sourceCardName && item.sourceCardName.toLowerCase().includes(q)) ||
        (item.entries && (Array.isArray(item.entries) ? item.entries : (Object.values(item.entries || {}) as any[])).some((e: any) => {
          const kStr = Array.isArray(e.keys) ? e.keys.join(',') : String(e.keys || '');
          return kStr.toLowerCase().includes(q) || (e.comment && e.comment.toLowerCase().includes(q)) || (e.content && e.content.toLowerCase().includes(q));
        }))
      );
    });
  }, [rawWorldBooks, categoryFilter, tagFilter, searchQuery]);

  const sorted = useMemo(() => {
    return sortItemList(
      filtered,
      sortOrder,
      (item: any) => item.name || '',
      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
    );
  }, [filtered, sortOrder, sortItemList]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let curWbs = [...(appData.stWorldBooks || [])];
    let addedCount = 0;
    let versionCount = 0;
    let distinctCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error('无效的 JSON 文件');
        }

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const name = (json.name || json.title || cleanName || '未命名世界书').trim();
        const author = (json.author || json.creator || '').trim();
        const description = (json.description || json.summary || '').trim();

        const entries = normalizeStWorldBookEntries(json);

        const newEntry: STWorldBookEntry = {
          id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + i,
          name,
          fileName: file.name,
          author,
          category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
          description,
          entries,
          jsonData: json,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const normName = normalizeResourceName(name);
        const existingSameName = curWbs.filter(w => {
          if ((w.name || '').trim().toLowerCase() === name.toLowerCase()) return true;
          const normExt = normalizeResourceName(w.name);
          if (normExt && normName && (normExt === normName || normExt.includes(normName) || normName.includes(normExt))) return true;
          return false;
        });

        if (existingSameName.length === 0) {
          curWbs.push(newEntry);
          addedCount++;
        } else {
          let matchedWb: STWorldBookEntry | null = null;
          let bestDiff: any = { status: 'completely_different', similarity: 0, summary: '' };

          for (const extWb of existingSameName) {
            const diff = compareWorldBooks(entries, json, extWb);
            if (diff.status === 'identical') {
              matchedWb = extWb;
              bestDiff = diff;
              break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedWb = extWb;
              bestDiff = diff;
            }
          }

          if (bestDiff.status === 'identical' && matchedWb) {
            skippedCount++;
          } else if (bestDiff.status === 'partially_different' && matchedWb) {
            const updatedWb: STWorldBookEntry = {
              ...matchedWb,
              entries,
              jsonData: json,
              fileName: file.name,
              updatedAt: Date.now(),
              customTags: Array.from(new Set([...(matchedWb.customTags || []), '已更新'])),
              versions: matchedWb.versions || []
            };

            const idx = curWbs.findIndex(w => w.id === matchedWb!.id);
            if (idx > -1) curWbs[idx] = updatedWb;
            versionCount++;
          } else {
            // Completely different world book
            newEntry.customTags = Array.from(new Set([...(newEntry.customTags || []), '同名变体']));
            curWbs.push(newEntry);
            distinctCount++;
          }
        }
      } catch (err: any) {
        showToast(`读取文件 "${file.name}" 失败: ${err.message}`, 'error');
      }
    }

    if (addedCount > 0 || versionCount > 0 || distinctCount > 0) {
      updateAppData((prev) => ({
        ...prev,
        stWorldBooks: curWbs,
      }));
      const parts: string[] = [];
      if (addedCount > 0) parts.push(`新增 ${addedCount} 个`);
      if (versionCount > 0) parts.push(`版本更新 ${versionCount} 个`);
      if (distinctCount > 0) parts.push(`同名独立变体 ${distinctCount} 个`);
      if (skippedCount > 0) parts.push(`跳过完全重复 ${skippedCount} 个`);
      showToast(`世界书导入完成：${parts.join('，')}`, 'success');
    } else if (skippedCount > 0) {
      showToast(`已跳过 ${skippedCount} 个内容完全一致的重复世界书`, 'info');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateManualWb = () => {
    if (!newWbForm.name.trim()) {
      showToast('请填写世界书名称', 'error');
      return;
    }
    const newEntry: STWorldBookEntry = {
      id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: newWbForm.name.trim(),
      author: newWbForm.author.trim(),
      description: newWbForm.description.trim(),
      category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
      entries: [],
      jsonData: {
        name: newWbForm.name.trim(),
        description: newWbForm.description.trim(),
        entries: {},
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    updateAppData((prev) => ({
      ...prev,
      stWorldBooks: [...(prev.stWorldBooks || []), newEntry],
    }));

    setNewWbForm({ name: '', author: '', description: '' });
    setShowAddWbModal(false);
    showToast('ST 世界书创建成功！', 'success');
  };

  const handleOpenDetail = (wb: STWorldBookEntry) => {
    setActiveWb(wb);
    setDetailTab('settings');
    setRawJsonDraft(JSON.stringify(wb.jsonData || { entries: wb.entries }, null, 2));
  };

  const handleSaveActiveWb = (updatedWb: STWorldBookEntry) => {
    updateAppData((prev) => {
      let updatedCards = prev.cards || [];
      if (updatedWb.sourceCardId) {
        updatedCards = syncStWorldBookBackToCards(updatedWb, updatedCards);
      }
      return {
        ...prev,
        cards: updatedCards,
        stWorldBooks: (prev.stWorldBooks || []).map((w) => (w.id === updatedWb.id ? updatedWb : w)),
      };
    });
    setActiveWb(updatedWb);
    showToast(updatedWb.sourceCardId ? '世界书已保存并同步回对应角色卡！' : '世界书已保存！', 'success');
  };

  const handleExportWb = (wb: STWorldBookEntry) => {
    const payload = wb.jsonData || {
      name: wb.name,
      description: wb.description,
      entries: (Array.isArray(wb.entries) ? wb.entries : (Object.values(wb.entries || {}) as any[])).reduce((acc: any, item, idx) => {
        acc[idx] = item;
        return acc;
      }, {}),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerFileDownload(blob, `${wb.name || 'ST世界书'}.json`);
    showToast('已导出世界书 JSON 文件', 'success');
  };

  const handleDeleteWb = (id: string) => {
    requestDelete('确定要删除此世界书吗？', 1, () => {
      updateAppData((prev) => ({
        ...prev,
        stWorldBooks: (prev.stWorldBooks || []).filter((w) => w.id !== id),
      }));
      if (activeWb?.id === id) setActiveWb(null);
      showToast('世界书已删除', 'info');
    });
  };

  const handleBatchDelete = () => {
    if (!selectedIds.length) return;
    requestDelete(`确定要删除选中的 ${selectedIds.length} 个世界书吗？`, selectedIds.length, () => {
      updateAppData((prev) => ({
        ...prev,
        stWorldBooks: (prev.stWorldBooks || []).filter((w) => !selectedIds.includes(w.id)),
      }));
      setSelectedIds([]);
      setBatchMode(false);
      showToast(`已批量删除 ${selectedIds.length} 个世界书`, 'info');
    });
  };

  const handleBatchMove = () => {
    if (!selectedIds.length || !batchTargetCategory) return;
    updateAppData((prev) => ({
      ...prev,
      stWorldBooks: (prev.stWorldBooks || []).map((w) => (selectedIds.includes(w.id) ? { ...w, category: batchTargetCategory } : w)),
    }));
    setSelectedIds([]);
    setShowBatchMoveModal(false);
    setBatchMode(false);
    showToast(`已将 ${selectedIds.length} 个世界书移动到「${batchTargetCategory}」`, 'success');
  };

  const handleAddCategory = (customName?: string) => {
    const trimmed = (customName !== undefined ? customName : newGroupName).trim();
    if (!trimmed) {
      showToast('分组名称不能为空', 'error');
      return;
    }
    const curCats = appData.stWorldBookCategories || ['默认'];
    if (curCats.includes(trimmed)) {
      showToast('该分组已存在', 'error');
      return;
    }
    updateAppData((prev) => ({
      ...prev,
      stWorldBookCategories: [...curCats, trimmed],
    }));
    setCategoryFilter(trimmed);
    setNewGroupName('');
    setShowNewGroupModal(false);
    showToast(`成功新建分组: ${trimmed}`, 'success');
  };

  // Entry Operations within activeWb
  const handleToggleEntry = (idx: number) => {
    if (!activeWb) return;
    const entries = [...(Array.isArray(activeWb.entries) ? activeWb.entries : (Object.values(activeWb.entries || {}) as any[]))];
    entries[idx] = { ...entries[idx], enabled: !entries[idx].enabled };
    const updated: STWorldBookEntry = { ...activeWb, entries, updatedAt: Date.now() };
    handleSaveActiveWb(updated);
  };

  const handleDeleteEntry = (idx: number) => {
    if (!activeWb) return;
    requestDelete('确定要删除此条目吗？', 1, () => {
      const entries = (Array.isArray(activeWb.entries) ? activeWb.entries : (Object.values(activeWb.entries || {}) as any[])).filter((_, i) => i !== idx);
      const updated: STWorldBookEntry = { ...activeWb, entries, updatedAt: Date.now() };
      handleSaveActiveWb(updated);
      showToast('条目已删除', 'info');
    });
  };

  const handleSaveEntryForm = () => {
    if (!activeWb) return;
    const entries = [...(Array.isArray(activeWb.entries) ? activeWb.entries : (Object.values(activeWb.entries || {}) as any[]))];
    const keys = Array.isArray(entryForm.keys) ? entryForm.keys : String(entryForm.keys || '').split(',').map((k) => k.trim()).filter(Boolean);
    const secondaryKeys = Array.isArray(entryForm.secondary_keys) ? entryForm.secondary_keys : String(entryForm.secondary_keys || '').split(',').map((k) => k.trim()).filter(Boolean);

    const rule: STWorldBookRule = {
      ...entryForm,
      keys,
      secondary_keys: secondaryKeys,
    };

    if (editingEntryIndex !== null) {
      entries[editingEntryIndex] = rule;
    } else {
      entries.push(rule);
    }

    const updated: STWorldBookEntry = { ...activeWb, entries, updatedAt: Date.now() };
    handleSaveActiveWb(updated);
    setShowAddEntryModal(false);
    setEditingEntryIndex(null);
  };

  const handleApplyRawJson = () => {
    if (!activeWb) return;
    try {
      const parsed = JSON.parse(rawJsonDraft);
      const entries = normalizeStWorldBookEntries(parsed);
      const updated: STWorldBookEntry = {
        ...activeWb,
        entries,
        jsonData: parsed,
        updatedAt: Date.now(),
      };
      handleSaveActiveWb(updated);
      showToast('世界书 JSON 数据已更新！', 'success');
    } catch (e: any) {
      showToast(`JSON 解析错误: ${e.message}`, 'error');
    }
  };

  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, categoryFilter, tagFilter, sortOrder]);

  React.useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, sorted.length));
      }
    }, { rootMargin: '600px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sorted.length]);

  const visibleSorted = sorted.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-5 ">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".json"
        className="hidden"
      />

      <div className="space-y-3 md:space-y-4 mb-6">
      {/* Top Header & Actions */}
                  <div className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">ST 世界书管理</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.json (ST / Lorebook 格式)
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              管理酒馆 World Info (世界书 / Character Book)，支持多词条检索、Token统计与角色卡内置联动
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
            title="导入世界书 (.json)"
          >
            <Upload className="w-3 h-3" />
            <span>导入世界书 (JSON)</span>
          </button>
          <button
            onClick={() => setShowAddWbModal(true)}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            新建世界书
          </button>
        </div>
      </div>

      <div className="space-y-2.5 mb-6">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索世界书名称、词条关键词或描述…"
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-8 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <CategoryFilterDropdown 
            groups={Array.from(new Set(['默认', ...(appData.stWorldBookCategories || [])]))}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            allGroupName="全部分组"
          />
          <TagFilterDropdown
            customTags={appData.stWorldBookTags || []}
            selectedTags={tagFilter}
            onChange={setTagFilter}
          />
          <CustomSelect
            value={sortOrder}
            onChange={(val) => setSortOrder(val)}
            options={[
              { value: 'default', label: '默认排序' },
              { value: 'newest', label: '最新添加' },
              { value: 'oldest', label: '最早添加' },
              { value: 'az', label: '名称 A-Z' },
              { value: 'za', label: '名称 Z-A' },
            ]}
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            className="h-[30px] px-2.5 rounded-lg bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer active:bg-black/10 dark:active:bg-white/15"
          />

          <button
            type="button"
            onClick={() => {
              setBatchMode((prev) => {
                if (prev) setSelectedIds([]);
                return !prev;
              });
            }}
            title={batchMode ? '退出批量选择' : '开启多选模式'}
            className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
              batchMode
                ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="leading-none">{batchMode ? '完成' : '选择'}</span>
          </button>
        </div>

        {/* Group Navigation Bar & Actions */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 w-full">
          <GroupCategoryBar
            groups={Array.from(new Set(['默认', ...(appData.stWorldBookCategories || [])]))}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            getCount={(g) => (appData.stWorldBooks || []).filter((p: any) => (p.category || '默认') === g).length}
            totalCount={appData.stWorldBooks?.length || 0}
            allGroupName="全部分组"
          />
        </div>
      </div>

      {/* Batch Actions Bar */}
      {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
      {batchMode && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
          <div className="batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]">
            {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                已选 {selectedIds.length} 项
              </span>
              <span role="button" onClick={() => {
                  setBatchMode(false);
                  setSelectedIds([]);
                }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
            </div>
            
                        {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              {/* 全选 / 取消 */}
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.length === sorted.length && sorted.length > 0) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(sorted.map((c: any) => c.id));
                  }
                }}
                className="batch-btn"
              >
                {selectedIds.length === sorted.length && sorted.length > 0 ? '取消' : '全选'}
              </button>
              {/* 反选 */}
              <button
                type="button"
                onClick={() => {
                  const currentSet = new Set(selectedIds);
                  const inversed = sorted.filter((c: any) => !currentSet.has(c.id)).map((c: any) => c.id);
                  setSelectedIds(inversed);
                }}
                className="batch-btn"
              >
                反选
              </button>
              {/* 移动 */}
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => setShowBatchMoveModal(true)}
                className="batch-btn batch-btn-primary"
              >
                移动
              </button>
              {/* 标签 */}
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => setShowBatchTagModal(true)}
                className="batch-btn batch-btn-primary"
              >
                标签
              </button>
              {/* 删除 */}
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={handleBatchDelete}
                className="batch-btn batch-btn-danger"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <BookOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">暂无 ST 世界书</h3>
          <p className="text-[10px] text-zinc-400 mt-1 max-w-sm">
            点击「导入世界书」导入酒馆 JSON 世界书，或在 ST 角色卡中内置世界书将自动联动
          </p>
        </div>
      ) : (
        <div className="resource-card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleSorted.map((wb) => {
            const isSelected = selectedIds.includes(wb.id);
            const totalTokens = (Array.isArray(wb.entries) ? wb.entries : (Object.values(wb.entries || {}) as any[])).reduce(
              (sum, e) => sum + estimateTokens(e.content || '') + estimateTokens(Array.isArray(e.keys) ? e.keys.join(', ') : e.keys || ''),
              0
            );
            return (
                <div
                  key={wb.id}
                  onClick={() => {
                    if (batchMode) {
                      setSelectedIds((prev) =>
                        prev.includes(wb.id) ? prev.filter((id) => id !== wb.id) : [...prev, wb.id]
                      );
                    } else {
                      handleOpenDetail(wb);
                    }
                  }}
                  className={`bg-white dark:bg-zinc-900 border rounded-xl p-3 shadow-sm transition-all flex flex-col h-full justify-between cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 dark:hover:border-amber-500/50'
                  }`}
                >
                  {/* Line 1: Name, Version */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {batchMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500 flex-shrink-0"
                      />
                    )}
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1" title={wb.name}>
                      {wb.name}
                    </h3>
                    {wb.versions && wb.versions.length > 0 && (
                        <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 rounded flex-shrink-0">
                            v{wb.versions.length + 1}
                        </span>
                    )}
                  </div>

                  {/* Character Linkage Badge (Optional) */}
                  {wb.isBuiltIn && wb.sourceCardName && (
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[9px] font-medium border border-amber-200 dark:border-amber-800/60">
                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                      <span className="truncate">内置联动角色：{wb.sourceCardName}</span>
                    </div>
                  )}

                  {/* Line 2: Tags & Metadata */}
                  <div className="flex items-center gap-2 min-w-0 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[60px] flex-shrink-0">
                      {wb.category || '默认'}
                    </span>
                    {wb.customTags && wb.customTags.length > 0 && (
                        <div className="flex-1 min-w-0">
                            <TagEditor 
                                customTags={wb.customTags || []} 
                                onChange={(newTags) => {
                                    updateAppData((prev: any) => ({
                                        ...prev,
                                        stWorldBooks: (prev.stWorldBooks || []).map((t: any) => t.id === wb.id ? { ...t, customTags: newTags } : t)
                                    }));
                                }}
                                availableTags={appData.stWorldBookTags || []}
                                maxDisplay={1}
                            />
                        </div>
                    )}
                    {wb.author && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex-shrink-0 max-w-[80px]">
                            作者：{wb.author}
                        </span>
                    )}
                  </div>

                  {/* Description (Optional) */}
                  {wb.description && (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-1 truncate">
                      {wb.description}
                    </p>
                  )}

                  {/* Stats (Tokens, Entries) */}
                  <div className="flex items-center gap-1.5 mt-1.5 mb-2">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-medium text-zinc-600 dark:text-zinc-400">
                      {(Array.isArray(wb.entries) ? wb.entries : (Object.values(wb.entries || {}) as any[])).length} 个词条
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-[9px] font-medium text-amber-700 dark:text-amber-400">
                      ~{totalTokens} Tokens
                    </span>
                  </div>

                  {/* Line 3: Actions */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] mt-auto">
                    <span className="text-[9px] text-zinc-400">
                      {new Date(wb.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                    {!batchMode && (
                      <div className="flex items-center gap-1.5" onClick={(e: any) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const newTag = prompt('输入新标签：');
                                if (newTag && newTag.trim()) {
                                    const tags = wb.customTags || [];
                                    if (!tags.includes(newTag.trim())) {
                                         updateAppData((prev: any) => {
                                            const updated = (prev.stWorldBooks || []).map((t: any) => t.id === wb.id ? { ...t, customTags: [...tags, newTag.trim()] } : t);
                                            const globalTags = prev.stWorldBookTags || [];
                                            return {
                                                ...prev,
                                                stWorldBooks: updated,
                                                stWorldBookTags: Array.from(new Set([...globalTags, newTag.trim()]))
                                            };
                                         });
                                    }
                                }
                            }}
                            className="px-2 py-1 text-[9px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            + 标签
                        </button>
                        <button
                          onClick={() => handleExportWb(wb)}
                          className="px-2 py-1 text-[9px] rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          导出 JSON
                        </button>
                        {wb.sourceCardId && onOpenCardDetail && (
                          <button
                            onClick={() => onOpenCardDetail(wb.sourceCardId!)}
                            className="p-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                            title="跳转查看角色卡"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteWb(wb.id)}
                          className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
            );
          })}
        </div>
      )}

      {/* WorldBook Detail Modal */}
      {activeWb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-transparent transition-opacity"
            onClick={() => setActiveWb(null)}
            aria-label="关闭遮罩"
          />
          <div className="file-detail-modal modal-panel modal-card relative z-10 w-full h-full bg-[#fafafa] dark:bg-[#09090b] flex flex-col overflow-hidden rounded-none border-0 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Top Bar (Clean 2-Row Compact Layout, No Overlap) */}
            <div className="px-3 sm:px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5 flex-shrink-0 bg-zinc-100/80 dark:bg-zinc-900/80">
              {/* Row 1: Title, Version, Category, and Action Buttons + Close X */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {activeWb.name}
                  </h3>
                  {activeWb.versions && activeWb.versions.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 whitespace-nowrap shrink-0">
                      v{activeWb.versions.length + 1}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-nowrap shrink-0">
                    {activeWb.category || '默认'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => handleExportWb(activeWb)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">导出 JSON</span>
                  </button>
                  <span role="button" onClick={() => setActiveWb(null)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
                </div>
              </div>

              {/* Row 2: Metadata stats + Tag Editor */}
              <div className="flex items-center justify-between gap-2 min-w-0 text-[10px] text-zinc-500">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden py-0.5">
                  <span className="whitespace-nowrap shrink-0 text-zinc-500 dark:text-zinc-400">
                    {(Array.isArray(activeWb.entries) ? activeWb.entries : (Object.values(activeWb.entries || {}) as any[])).length} 个词条
                  </span>
                  <TagEditor
                    customTags={activeWb.customTags || []}
                    availableTags={appData.stWorldBookTags || []}
                    maxDisplay={2}
                    onChange={(newTags) => {
                      const updated = { ...activeWb, customTags: newTags };
                      setActiveWb(updated);
                      updateAppData((prev: any) => {
                         const newList = (prev.stWorldBooks || []).map((i: any) => i.id === updated.id ? updated : i);
                         const globalTags = prev.stWorldBookTags || [];
                         return { 
                           ...prev, 
                           stWorldBooks: newList,
                           stWorldBookTags: Array.from(new Set([...globalTags, ...newTags]))
                         };
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="tab-nav-bar flex flex-wrap items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 flex-shrink-0 gap-2 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setDetailTab('settings')}
                  className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors whitespace-nowrap shrink-0 ${
                    detailTab === 'settings'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  基本属性
                </button>
                <button
                  onClick={() => setDetailTab('entries')}
                  className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors whitespace-nowrap shrink-0 ${
                    detailTab === 'entries'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  词条列表 ({(Array.isArray(activeWb.entries) ? activeWb.entries : (Object.values(activeWb.entries || {}) as any[])).length})
                </button>
                <button
                  onClick={() => setDetailTab('json')}
                  className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors whitespace-nowrap shrink-0 ${
                    detailTab === 'json'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  JSON 原始数据
                </button>
                <button
                  onClick={() => setDetailTab('versions')}
                  className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    detailTab === 'versions'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <History className="w-3 h-3" />
                  版本历史 {(activeWb.versions?.length || 0) > 0 ? `(${(activeWb.versions?.length || 0) + 1})` : ''}
                </button>
              </div>

              {detailTab === 'entries' && (
                <button
                  onClick={() => {
                    setEditingEntryIndex(null);
                    setEntryForm({
                      keys: [],
                      secondary_keys: [],
                      comment: '',
                      content: '',
                      constant: false,
                      selective: true,
                      insertion_order: 100,
                      enabled: true,
                      position: 'before_char',
                    });
                    setShowAddEntryModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-[10px] font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 whitespace-nowrap shrink-0 my-1"
                >
                  <Plus className="w-3.5 h-3.5" /> 添加词条
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto">
              {detailTab === 'entries' && (
                <div className="space-y-3">
                  {/* Search within entries */}
                  <div className="relative w-full mb-3">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="在世界书内搜索关键词、备注或条目内容…"
                      value={entrySearchQuery}
                      onChange={(e: any) => setEntrySearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                    />
                  </div>

                  {(Array.isArray(activeWb.entries) ? activeWb.entries : (Object.values(activeWb.entries || {}) as any[]))
                    .filter((entry) => {
                      if (!entrySearchQuery.trim()) return true;
                      const q = entrySearchQuery.toLowerCase();
                      const keys = Array.isArray(entry.keys) ? entry.keys.join(' ') : String(entry.keys || '');
                      return (
                        keys.toLowerCase().includes(q) ||
                        (entry.comment && entry.comment.toLowerCase().includes(q)) ||
                        (entry.content && entry.content.toLowerCase().includes(q))
                      );
                    })
                    .map((entry, idx) => {
                      const keysArr = Array.isArray(entry.keys) ? entry.keys : String(entry.keys || '').split(',').map((k) => k.trim()).filter(Boolean);
                      const tokens = estimateTokens(entry.content || '');
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border transition-all ${
                            entry.enabled !== false
                              ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                              : 'bg-zinc-100 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/50 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <button
                                onClick={() => handleToggleEntry(idx)}
                                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                title={entry.enabled !== false ? '点击禁用' : '点击启用'}
                              >
                                {entry.enabled !== false ? (
                                  <CheckSquare className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-400" />
                                )}
                              </button>
                              <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">
                                {entry.comment || `条目 #${idx + 1}`}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                (顺序: {entry.insertion_order ?? 100})
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                ~{tokens} tok
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingEntryIndex(idx);
                                  setEntryForm({ ...entry });
                                  setShowAddEntryModal(true);
                                }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                                title="编辑条目"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(idx)}
                                className="p-1 text-zinc-400 hover:text-red-500 rounded"
                                title="删除条目"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Keys Tag Chips */}
                          <div className="flex items-center gap-1 flex-wrap mb-2">
                            <span className="text-[8.5px] sm:text-[10px] font-semibold text-zinc-500">主键:</span>
                            {keysArr.length > 0 ? (
                              keysArr.map((k: any, ki: number) => (
                                <span
                                  key={ki}
                                  className="px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[8px] sm:text-[10px] font-mono text-amber-700 dark:text-amber-300"
                                >
                                  {k}
                                </span>
                              ))
                            ) : (
                              <span className="text-[8.5px] sm:text-[10px] text-zinc-400 italic">无主触发词</span>
                            )}
                          </div>

                          {/* Entry Content Box */}
                          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-[10px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-3">
                            {entry.content}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {detailTab === 'json' && (
                <div className="space-y-3 flex-1 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                      SillyTavern JSON 结构
                    </span>
                    <button
                      onClick={handleApplyRawJson}
                      className="px-3 py-1 text-[10px] font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                    >
                      应用 JSON 变更
                    </button>
                  </div>
                  <textarea
                    value={rawJsonDraft}
                    onChange={(e: any) => setRawJsonDraft(e.target.value)}
                    className="w-full flex-1 min-h-[360px] p-3 text-[10px] font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 whitespace-pre-wrap break-all overflow-y-auto overflow-x-hidden"
                  />
                </div>
              )}

              {detailTab === 'settings' && (
                <div className="space-y-4 text-[10px]">
                  {activeWb.isBuiltIn && activeWb.sourceCardName && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2 w-full justify-center pb-1">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="font-semibold text-amber-900 dark:text-amber-200">
                            此世界书内置于角色卡「{activeWb.sourceCardName}」
                          </span>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                            在此编辑保存后会自动同步回角色卡内置世界书数据
                          </p>
                        </div>
                      </div>
                      {activeWb.sourceCardId && onOpenCardDetail && (
                        <button
                          onClick={() => {
                            setActiveWb(null);
                            onOpenCardDetail(activeWb.sourceCardId!);
                          }}
                          className="px-3 py-1.5 text-[10px] font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                        >
                          跳转角色卡
                        </button>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      世界书名称
                    </label>
                    <input
                      type="text"
                      value={activeWb.name}
                      onChange={(e: any) => setActiveWb({ ...activeWb, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">作者</label>
                      <input
                        type="text"
                        value={activeWb.author || ''}
                        onChange={(e: any) => setActiveWb({ ...activeWb, author: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">所属分组</label>
                      <CustomSelect
                        value={activeWb.category || '默认'}
                        onChange={(val) => setActiveWb({ ...activeWb, category: val })}
                        options={categories.map((c) => ({ value: c, label: c }))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-between"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">描述说明</label>
                    <textarea
                      rows={4}
                      value={activeWb.description || ''}
                      onChange={(e: any) => setActiveWb({ ...activeWb, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 resize-none"
                    />
                  </div>
                </div>
              )}

              {detailTab === 'versions' && (
                <div className="space-y-4 p-4 text-[10px]">
                  <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-amber-500" />
                        世界书版本归档时间线
                      </h4>
                      <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-amber-100/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                        共 {(activeWb.versions?.length || 0) + 1} 个版本
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      当扫描到同名新世界书文件或更新时，旧版词条会自动存档。
                    </p>
                  </div>

                  {/* Current Active WorldBook Status */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-1.5">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        当前生效版本 (词条数: {(Array.isArray(activeWb.entries) ? activeWb.entries : (Object.values(activeWb.entries || {}) as any[])).length})
                      </span>
                      <div className="flex items-center justify-between gap-2 pl-2.5">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                          {activeWb.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                          最近更新: {new Date(activeWb.updatedAt || activeWb.createdAt || Date.now()).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* History Versions List */}
                  <div className="space-y-3">
                    {(() => {
                      const detailCard = activeWb as any;
                      const currentVerNum = detailCard.activeVersionNumber || (detailCard.versions?.length || 0) + 1;
                      const allVersions = [
                        {
                          isCurrent: true,
                          versionId: detailCard.activeVersionId || 'current',
                          versionNumber: currentVerNum,
                          versionLabel: detailCard.activeVersionLabel || `V${currentVerNum}`,
                          importedAt: detailCard.importedAt || detailCard.createdAt || detailCard.updatedAt || Date.now(),
                          changeSummary: detailCard.currentVersionSummary || '当前生效版本',
                          data: detailCard
                        },
                        ...(detailCard.versions || []).map((v: any, index: number) => ({
                          ...v,
                          isCurrent: false,
                          versionLabel: v.versionLabel || `V${v.versionNumber || ((detailCard.versions?.length || 0) - index)}`,
                          importedAt: v.importedAt || v.updatedAt || Date.now()
                        }))
                      ];

                      allVersions.sort((a, b) => b.versionNumber - a.versionNumber);
                      return allVersions.map((ver, idx) => (
                        <div
                          key={ver.versionId || idx}
                          onClick={() => {
                            if (ver.isCurrent) return;
                            const currentSnapshot = {
                              versionId: detailCard.activeVersionId || `ver_${detailCard.id}_${Date.now()}`,
                              versionNumber: currentVerNum,
                              versionLabel: detailCard.activeVersionLabel || `V${currentVerNum} (切换前)`,
                              updatedAt: detailCard.updatedAt || Date.now(),
                              importedAt: detailCard.importedAt || detailCard.createdAt || detailCard.updatedAt || Date.now(),
                              fileName: detailCard.name,
                              changeSummary: '自动归档 (切换版本前)',
                              data: {
                                name: detailCard.name,
                                entries: detailCard.entries,
                                jsonData: detailCard.jsonData,
                                description: detailCard.description,
                                author: detailCard.author
                              }
                            };
                            const newVersions = (detailCard.versions || []).filter((v: any) => v.versionId !== ver.versionId);
                            newVersions.unshift(currentSnapshot);
                            const restoredWb = {
                              ...detailCard,
                              ...ver.data,
                              activeVersionNumber: ver.versionNumber,
                              activeVersionLabel: ver.versionLabel || `V${ver.versionNumber || (detailCard.versions!.length - idx)}`,
                              updatedAt: Date.now(),
                              importedAt: ver.importedAt || ver.updatedAt || Date.now(),
                              versions: newVersions
                            };
                            setActiveWb(restoredWb);
                            updateAppData(prev => ({
                              ...prev,
                              stWorldBooks: (prev.stWorldBooks || []).map(w => w.id === detailCard.id ? restoredWb : w)
                            }));
                            showToast(`已切换至 ${ver.versionLabel || '此历史版本'}`, 'success');
                          }}
                          className={`p-3 border rounded-xl space-y-2 cursor-pointer transition-colors ${ver.isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/20' : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 hover:border-amber-400'}`}
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-col items-start gap-0.5">
                              <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${ver.isCurrent ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'}`}>
                                {ver.versionLabel || `历史版本 v${ver.versionNumber || (detailCard.versions!.length - idx)}`}
                                {ver.isCurrent && ' (当前生效)'}
                              </span>
                              <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                                {ver.changeSummary || '初始导入版本'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-400 font-medium text-[10px]">导入时间: {new Date(ver.importedAt).toLocaleString()}</span>
                            </div>
                          </div>
                          {ver.data && (
                            <div className="text-[10px] text-zinc-500 space-y-1">
                              <div>历史词条数量: {(Array.isArray(ver.data.entries) ? ver.data.entries : (Object.values(ver.data.entries || {}) as any[])).length} 条</div>
                              {!ver.isCurrent && (
                                <div className="max-h-24 overflow-y-auto space-y-1 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                  {(Array.isArray(ver.data.entries) ? ver.data.entries : (Object.values(ver.data.entries || {}) as any[])).slice(0, 8).map((e: any, i: number) => (
                                    <div key={i} className="truncate">
                                      • <span className="font-semibold text-zinc-700 dark:text-zinc-300">{Array.isArray(e.keys) ? e.keys.join(', ') : e.keys || e.comment || `条目 ${i+1}`}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setActiveWb(null)}
                className="px-4 py-2 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                关闭
              </button>
              <button
                onClick={() => handleSaveActiveWb(activeWb)}
                className="px-4 py-2 text-[10px] font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                保存全部修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Entry Modal (Bottom Sheet with solid background) */}
      <BottomSheetModal
        isOpen={showAddEntryModal}
        onClose={() => setShowAddEntryModal(false)}
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            {editingEntryIndex !== null ? '编辑世界书词条' : '添加世界书词条'}
          </span>
        }
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddEntryModal(false)}
              className="px-4 py-2 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveEntryForm}
              className="px-4 py-2 text-[10px] font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              保存词条
            </button>
          </>
        }
      >
        <div className="space-y-4 text-[10px]">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              触发关键词 (用英文逗号隔开) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="例如：主角, 帝国, 魔法学院"
              value={Array.isArray(entryForm.keys) ? entryForm.keys.join(', ') : entryForm.keys || ''}
              onChange={(e: any) => setEntryForm({ ...entryForm, keys: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean) })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">次要关键词 (可选)</label>
            <input
              type="text"
              placeholder="例如：身世, 背景"
              value={Array.isArray(entryForm.secondary_keys) ? entryForm.secondary_keys.join(', ') : entryForm.secondary_keys || ''}
              onChange={(e: any) => setEntryForm({ ...entryForm, secondary_keys: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean) })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">备注说明</label>
            <input
              type="text"
              placeholder="词条备注标签"
              value={entryForm.comment || ''}
              onChange={(e: any) => setEntryForm({ ...entryForm, comment: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">插入顺序 (Order)</label>
              <input
                type="number"
                value={entryForm.order || 100}
                onChange={(e: any) => setEntryForm({ ...entryForm, order: parseInt(e.target.value) || 100 })}
                className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">插入位置 (Position)</label>
              <CustomSelect
                value={entryForm.position || 'before_char'}
                onChange={(val) => setEntryForm({ ...entryForm, position: val as any })}
                options={[
                  { value: 'before_char', label: '角色设定之前 (before_char)' },
                  { value: 'after_char', label: '角色设定之后 (after_char)' },
                  { value: 'an', label: '作者注释 (AN)' },
                ]}
                className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs flex items-center justify-between"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              词条设定内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              placeholder="输入要注入给 AI 的详细设定提示词…"
              value={entryForm.content || ''}
              onChange={(e: any) => setEntryForm({ ...entryForm, content: e.target.value })}
              className="w-full p-3 font-mono text-[10px] rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
            />
          </div>
        </div>
      </BottomSheetModal>

      {/* Add New ST WorldBook Modal (Bottom Sheet with solid background) */}
      <BottomSheetModal
        isOpen={showAddWbModal}
        onClose={() => setShowAddWbModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-500" />
            新建 ST 世界书
          </span>
        }
        subtitle="创建一个新的世界书条目集合"
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddWbModal(false)}
              className="px-4 py-2 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreateManualWb}
              className="px-4 py-2 text-[10px] font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              确认创建
            </button>
          </>
        }
      >
        <div className="space-y-4 text-[10px]">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              世界书名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="例如：艾尔登世界观设定 / 现代都市常识"
              value={newWbForm.name}
              onChange={(e: any) => setNewWbForm({ ...newWbForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">描述说明</label>
            <textarea
              rows={3}
              placeholder="简要描述此世界书包含的设定内容…"
              value={newWbForm.description}
              onChange={(e: any) => setNewWbForm({ ...newWbForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
            />
          </div>
        </div>
      </BottomSheetModal>

      {/* Batch Move Modal */}
      <BottomSheetModal
        isOpen={showBatchMoveModal}
        onClose={() => setShowBatchMoveModal(false)}
        title={
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-500" />
            移动选中的 {selectedIds.length} 个世界书
          </span>
        }
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowBatchMoveModal(false)}
              className="px-3 py-1.5 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!batchTargetCategory}
              onClick={handleBatchMove}
              className="px-3 py-1.5 text-[10px] font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 shadow-xs"
            >
              确认移动
            </button>
          </>
        }
      >
        <div className="space-y-3 text-[10px]">
          <label className="block font-semibold text-zinc-700 dark:text-zinc-300">目标分组</label>
          <CustomSelect
            value={batchTargetCategory}
            onChange={(val) => setBatchTargetCategory(val)}
            placeholder="选择目标分组…"
            options={[
              { value: '', label: '选择目标分组…' },
              ...categories.map((c) => ({ value: c, label: c }))
            ]}
            className="w-full px-3 py-2 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-between"
          />
        </div>
      </BottomSheetModal>
    

                <BatchTagModal
                  isOpen={showBatchTagModal}
                  onClose={() => setShowBatchTagModal(false)}
                  availableTags={appData.stWorldBookTags || []}
                  selectedCount={selectedIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.stWorldBooks || [];
                      const newList = list.map((item: any) => {
                        if (selectedIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.stWorldBookTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, stWorldBooks: newList, stWorldBookTags: updatedGlobalTags };
                    });
                    setShowBatchTagModal(false);
                    setSelectedIds([]);
                    showToast(`成功为 ${selectedIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
                  }}
                />

                <DeleteConfirmationModal
                  isOpen={deleteConfirmConfig.isOpen}
                  onClose={() => setDeleteConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
                  onConfirm={deleteConfirmConfig.onConfirm}
                  title="确认删除"
                  message={deleteConfirmConfig.message}
                  itemCount={deleteConfirmConfig.itemCount}
                />

              </div>
  );
}, (prev, next) => {
  return prev.appData === next.appData &&
         prev.jumpTargetId === next.jumpTargetId;
});



