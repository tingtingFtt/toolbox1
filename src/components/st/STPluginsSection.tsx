import { NewGroupModal, BottomSheetModal, UnifiedModal, DeleteConfirmationModal } from '../ui/UnifiedModal';
import React, { useState, useRef } from 'react';
import { BaseCard } from '../ui/BaseCard';
import { BaseButton } from '../ui/BaseButton';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { CheckSquare,  Plus, Search, Trash2, Edit3, Link2, FolderPlus, ArrowRightLeft, ExternalLink, Copy, Check, SlidersHorizontal, ArrowUpDown, X, Upload, Tag } from 'lucide-react';
import { AppData, PluginEntry } from '../../types';
import { sessionStore } from '../../utils/sessionStore';

interface STPluginsSectionProps {
  appData: AppData;
  updateAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  sortItemList: <T>(items: T[], sortOrder: any, getName: (item: T) => string, getCreatedAt?: (item: T) => number) => T[];
}

export const STPluginsSection = React.memo<STPluginsSectionProps>(({
  appData,
  updateAppData,
  showToast,
  sortItemList,
}) => {
  const pluginFileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState(() => sessionStore.stPlugins.searchQuery);
  const [tagFilter, setTagFilter] = useState<string[]>(() => sessionStore.stPlugins.tagFilter);
  const [categoryFilter, setCategoryFilter] = useState(() => sessionStore.stPlugins.categoryFilter);
  const [sortOrder, setSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>(() => sessionStore.stPlugins.sortOrder);

  React.useEffect(() => {
    sessionStore.stPlugins.searchQuery = searchQuery;
  }, [searchQuery]);
  React.useEffect(() => {
    sessionStore.stPlugins.tagFilter = tagFilter;
  }, [tagFilter]);
  React.useEffect(() => {
    sessionStore.stPlugins.categoryFilter = categoryFilter;
  }, [categoryFilter]);
  React.useEffect(() => {
    sessionStore.stPlugins.sortOrder = sortOrder;
  }, [sortOrder]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handlePluginFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      let newEntries: PluginEntry[] = [];
      let promises: Promise<void>[] = [];
      for (const file of files) {
        promises.push(
          file.text().then(text => {
            try {
              const parsed = JSON.parse(text);
              newEntries.push({
                id: 'plg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
                url: parsed.url || '',
                author: parsed.author || '',
                contact: parsed.contact || '',
                source: parsed.source || '第三方导入',
                description: parsed.description || text.slice(0, 200),
                category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
                customTags: parsed.tags || parsed.customTags || [],
                createdAt: Date.now()
              });
            } catch {
              newEntries.push({
                id: 'plg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                name: file.name.replace(/\.[^/.]+$/, ''),
                url: '',
                author: '',
                contact: '',
                source: '文件导入',
                description: text.slice(0, 200),
                category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
                customTags: [],
                createdAt: Date.now()
              });
            }
          }).catch(() => {})
        );
      }
      Promise.all(promises).then(() => {
        if (newEntries.length > 0) {
          updateAppData(prev => ({
            ...prev,
            plugins: [...(prev.plugins || []), ...newEntries]
          }));
          showToast(`成功导入 ${newEntries.length} 个插件文件`, 'success');
        }
      });
      e.target.value = '';
    }
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<PluginEntry | null>(null);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchTargetCategory, setBatchTargetCategory] = useState('');

  // Form State
  const [pluginForm, setPluginForm] = useState({
    name: '',
    url: '',
    author: '',
    contact: '',
    source: '',
    description: '',
  });

  const rawPlugins = appData.plugins || [];
  const categories = Array.from(new Set(['默认', ...(appData.pluginCategories || []), ...rawPlugins.map((p: any) => p.category || '默认')]));

  
  const customTags = appData.pluginTags || [];
  const builtInTags: string[] = [];
  const filtered = rawPlugins.filter((item: any) => {
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
      (item.url && item.url.toLowerCase().includes(q)) ||
      (item.author && item.author.toLowerCase().includes(q)) ||
      (item.contact && item.contact.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const sorted = sortItemList(
    filtered,
    sortOrder,
    (item: any) => item.name || '',
    (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
  );

  const handleCreatePlugin = () => {
    if (!pluginForm.name.trim()) {
      showToast('请填写插件名称', 'error');
      return;
    }
    if (!pluginForm.url.trim()) {
      showToast('请填写插件地址', 'error');
      return;
    }
    const newPlugin: PluginEntry = {
      id: 'plugin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: 'plugin',
      name: pluginForm.name.trim(),
      url: pluginForm.url.trim(),
      author: pluginForm.author.trim(),
      contact: pluginForm.contact.trim(),
      source: pluginForm.source.trim(),
      description: pluginForm.description.trim(),
      category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateAppData((prev) => ({
      ...prev,
      plugins: [...(prev.plugins || []), newPlugin],
    }));
    setPluginForm({ name: '', url: '', author: '', contact: '', source: '', description: '' });
    setShowAddModal(false);
    showToast('插件添加成功！', 'success');
  };

  const handleUpdatePlugin = () => {
    if (!editingPlugin) return;
    if (!editingPlugin.name.trim()) {
      showToast('请填写插件名称', 'error');
      return;
    }
    updateAppData((prev) => ({
      ...prev,
      plugins: (prev.plugins || []).map((p: any) => (p.id === editingPlugin.id ? { ...editingPlugin, updatedAt: Date.now() } : p)),
    }));
    setEditingPlugin(null);
    showToast('插件信息已更新', 'success');
  };

  const handleDeletePlugin = (id: string) => {
    requestDelete('确定要删除此插件吗？', 1, () => {
      updateAppData((prev) => ({
        ...prev,
        plugins: (prev.plugins || []).filter((p: any) => p.id !== id),
      }));
      showToast('插件已删除', 'info');
    });
  };

  const handleBatchDelete = () => {
    if (!selectedIds.length) return;
    requestDelete(`确定要删除选中的 ${selectedIds.length} 个插件吗？`, selectedIds.length, () => {
      updateAppData((prev) => ({
        ...prev,
        plugins: (prev.plugins || []).filter((p: any) => !selectedIds.includes(p.id)),
      }));
      setSelectedIds([]);
      setBatchMode(false);
      showToast(`已批量删除 ${selectedIds.length} 个插件`, 'info');
    });
  };

  const handleBatchMove = () => {
    if (!selectedIds.length || !batchTargetCategory) return;
    updateAppData((prev) => ({
      ...prev,
      plugins: (prev.plugins || []).map((p: any) => (selectedIds.includes(p.id) ? { ...p, category: batchTargetCategory } : p)),
    }));
    setSelectedIds([]);
    setShowBatchMoveModal(false);
    setBatchMode(false);
    showToast(`已将 ${selectedIds.length} 个插件移动到「${batchTargetCategory}」`, 'success');
  };

  const handleAddCategory = (customName?: string) => {
    const trimmed = (customName !== undefined ? customName : newGroupName).trim();
    if (!trimmed) {
      showToast('分组名称不能为空', 'error');
      return;
    }
    const curCats = appData.pluginCategories || ['默认'];
    if (curCats.includes(trimmed)) {
      showToast('该分组已存在', 'error');
      return;
    }
    updateAppData((prev) => ({
      ...prev,
      pluginCategories: [...curCats, trimmed],
    }));
    setCategoryFilter(trimmed);
    setNewGroupName('');
    setShowNewGroupModal(false);
    showToast(`成功新建分组: ${trimmed}`, 'success');
  };

  const handleCopyUrl = (url?: string, id?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
    showToast('插件链接已复制到剪贴板', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-5 ">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={pluginFileInputRef}
        multiple
        accept=".js,.json,.zip,.txt"
        className="hidden"
        onChange={handlePluginFileUpload}
      />

      {/* Top Header & Actions */}
                  <div data-design-id="st-plugins-header-banner" className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">ST 插件管理</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.js / .json / .zip / .txt
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              收录并管理酒馆第三方扩展插件、功能模块、本地脚本包与在线发布地址
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={() => pluginFileInputRef.current?.click()}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
            title="导入插件文件 (.js, .json, .zip, .txt)"
          >
            <Upload className="w-3 h-3" />
            <span>导入插件文件</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span>添加插件</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5 mb-6">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索插件名称、作者、链接或描述…"
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark: focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <CategoryFilterDropdown 
            groups={categories}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            allGroupName="全部分组"
          />
          <TagFilterDropdown
            builtInTags={builtInTags}
            customTags={customTags}
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
            groups={Array.from(new Set(['默认', ...(appData.pluginCategories || [])]))} 
            currentGroup={categoryFilter} 
            onSelectGroup={setCategoryFilter} 
            getCount={(g) => (appData.plugins || []).filter((c: any) => (c.category || '默认') === g).length} 
            totalCount={appData.plugins?.length || 0} 
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

      {/* Plugins Grid */}
      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Link2 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">暂无 ST 插件</h3>
          <p className="text-[10px] text-zinc-400 mt-1 max-w-sm">
            点击右上角「添加插件」录入酒馆在线扩展链接或插件库
          </p>
        </div>
      ) : (
        <div className="resource-card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((plugin: any) => {
            const isSelected = selectedIds.includes(plugin.id);
            return (
              <div
                key={plugin.id}
                onClick={() => {
                  if (batchMode) {
                    setSelectedIds((prev: any) =>
                      prev.includes(plugin.id) ? prev.filter((id: string) => id !== plugin.id) : [...prev, plugin.id]
                    );
                  }
                }}
                className={`bg-white dark:bg-zinc-900 border rounded-xl p-3 shadow-sm transition-all flex flex-col h-full justify-between ${
                  batchMode ? 'cursor-pointer' : ''
                } ${
                  isSelected
                    ? 'border-zinc-500 ring-2 ring-zinc-500/20 bg-zinc-100/50 dark:bg-zinc-800/50'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Line 1: Name, Version, Group */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {batchMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 flex-shrink-0"
                    />
                  )}
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1" title={plugin.name}>
                    {plugin.name}
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[60px] flex-shrink-0">
                    {plugin.category || '默认'}
                  </span>
                </div>

                {/* Line 2: Tags & Metadata */}
                <div className="flex items-center gap-2 min-w-0 mt-1">
                    {plugin.customTags && plugin.customTags.length > 0 && (
                        <div className="flex-1 min-w-0">
                            <TagEditor 
                                customTags={plugin.customTags || []} 
                                onChange={(newTags) => {
                                    updateAppData((prev: any) => ({
                                        ...prev,
                                        plugins: (prev.plugins || []).map((t: any) => t.id === plugin.id ? { ...t, customTags: newTags } : t)
                                    }));
                                }}
                                availableTags={appData.pluginTags || []}
                                maxDisplay={1}
                            />
                        </div>
                    )}
                    {plugin.author && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex-shrink-0 max-w-[80px]">
                            作者：{plugin.author}
                        </span>
                    )}
                </div>

                {/* Description & Link */}
                <div className="flex-1 mt-1 flex flex-col justify-center">
                    {plugin.description && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">
                            {plugin.description}
                        </p>
                    )}
                    {plugin.url && (
                        <div className="p-1.5 mt-auto rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-2">
                        <span className="text-[9px] text-zinc-600 dark:text-zinc-400 truncate font-mono">
                            {plugin.url}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                            type="button"
                            onClick={(e: any) => {
                                e.stopPropagation();
                                handleCopyUrl(plugin.url, plugin.id);
                            }}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
                            title="复制链接"
                            >
                            {copiedId === plugin.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <a
                            href={plugin.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e: any) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
                            title="打开链接"
                            >
                            <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        </div>
                    )}
                </div>

                {/* Line 3: Actions */}
                <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px]">
                  <span className="text-[9px] text-zinc-400">
                    {new Date(plugin.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  {!batchMode && (
                    <div className="flex items-center gap-1.5" onClick={(e: any) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const newTag = prompt('输入新标签：');
                                if (newTag && newTag.trim()) {
                                    const tags = plugin.customTags || [];
                                    if (!tags.includes(newTag.trim())) {
                                         updateAppData((prev: any) => {
                                            const updated = (prev.plugins || []).map((t: any) => t.id === plugin.id ? { ...t, customTags: [...tags, newTag.trim()] } : t);
                                            const globalTags = prev.pluginTags || [];
                                            return {
                                                ...prev,
                                                plugins: updated,
                                                pluginTags: Array.from(new Set([...globalTags, newTag.trim()]))
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
                        onClick={() => setEditingPlugin(plugin)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlugin(plugin.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Plugin Modal (Bottom Sheet with solid background) */}
      <BottomSheetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-500" />
            添加 ST 插件
          </span>
        }
        subtitle="收藏并管理酒馆扩展插件、功能模块与在线地址"
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreatePlugin}
              className="px-4 py-2 text-[10px] font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              确认添加
            </button>
          </>
        }
      >
        <div className="space-y-4 text-[10px]">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              插件名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="例如：SillyTavern-Extras / 角色记忆增强"
              value={pluginForm.name}
              onChange={(e: any) => setPluginForm({ ...pluginForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              插件地址 (URL) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="https://github.com/..."
              value={pluginForm.url}
              onChange={(e: any) => setPluginForm({ ...pluginForm, url: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">作者</label>
              <input
                type="text"
                placeholder="作者姓名/组织"
                value={pluginForm.author}
                onChange={(e: any) => setPluginForm({ ...pluginForm, author: e.target.value })}
                className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">联系/来源</label>
              <input
                type="text"
                placeholder="QQ群/发布贴/论坛"
                value={pluginForm.contact}
                onChange={(e: any) => setPluginForm({ ...pluginForm, contact: e.target.value })}
                className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">插件描述</label>
            <textarea
              rows={3}
              placeholder="说明插件功能、安装方法或配置要点…"
              value={pluginForm.description}
              onChange={(e: any) => setPluginForm({ ...pluginForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
            />
          </div>
        </div>
      </BottomSheetModal>

      {/* Edit Plugin Modal (Fixed full-screen modal) */}
      {editingPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setEditingPlugin(null)} role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-transparent transition-opacity"
            aria-label="关闭遮罩"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="file-detail-modal modal-panel modal-card relative z-10 w-full h-full bg-[#fafafa] dark:bg-[#09090b] flex flex-col overflow-hidden rounded-none border-0 shadow-2xl"
          >
            {/* Modal Top Bar (3-Line Layout) */}
            <div className="p-4 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex flex-col gap-2 flex-shrink-0">
              {/* Line 1: Name, Version */}
              <div className="flex items-center gap-3 min-w-0">
                <Link2 className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1">
                  {editingPlugin.name}
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 whitespace-nowrap">
                  v1.0
                </span>
                <span role="button" onClick={() => setEditingPlugin(null)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
              </div>

              {/* Line 2: Tags & Metadata */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap pl-8">
                <span className="px-2 py-0.5 text-[9px] font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {editingPlugin.category || '默认'}
                </span>
                <TagEditor
                  customTags={editingPlugin.customTags || []}
                  availableTags={appData.pluginTags || []}
                  maxDisplay={1}
                  hideAddButton={true}
                  onChange={(newTags) => {
                    const updated = { ...editingPlugin, customTags: newTags };
                    setEditingPlugin(updated);
                    updateAppData((prev: any) => ({
                      ...prev,
                      plugins: (prev.plugins || []).map((p: any) => (p.id === updated.id ? updated : p)),
                    }));
                  }}
                />
                <span className="text-[10px] text-zinc-500">
                  作者: {editingPlugin.author || '未知'}
                </span>
              </div>

              {/* Line 3: Actions */}
              <div className="flex items-center gap-2 flex-wrap justify-between pl-8">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                        const newTag = prompt('输入新标签：');
                        if (newTag && newTag.trim()) {
                            const tags = editingPlugin.customTags || [];
                            if (!tags.includes(newTag.trim())) {
                                const updated = { ...editingPlugin, customTags: [...tags, newTag.trim()] };
                                setEditingPlugin(updated);
                                updateAppData((prev: any) => {
                                   const newList = (prev.plugins || []).map((i: any) => i.id === updated.id ? updated : i);
                                   const globalTags = prev.pluginTags || [];
                                   return { 
                                       ...prev, 
                                       plugins: newList,
                                       pluginTags: Array.from(new Set([...globalTags, newTag.trim()]))
                                   };
                                });
                            }
                        }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-500 text-zinc-600 dark:text-zinc-400 hover:text-amber-700 dark:hover:text-amber-300 whitespace-nowrap shrink-0 transition-colors"
                  >
                    + 标签
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-4 text-[10px]">
                {/* 基础属性 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <Edit3 className="w-4 h-4 text-indigo-500" />
                    基础属性
                  </h4>
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                插件名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingPlugin.name}
                onChange={(e: any) => setEditingPlugin({ ...editingPlugin, name: e.target.value })}
                className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                插件地址 (URL)
              </label>
              <input
                type="text"
                value={editingPlugin.url || ''}
                onChange={(e: any) => setEditingPlugin({ ...editingPlugin, url: e.target.value })}
                className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">作者</label>
                <input
                  type="text"
                  value={editingPlugin.author || ''}
                  onChange={(e: any) => setEditingPlugin({ ...editingPlugin, author: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">所属分组</label>
                <CustomSelect
                  value={editingPlugin.category || '默认'}
                  onChange={(val) => setEditingPlugin({ ...editingPlugin, category: val })}
                  options={categories.map((c) => ({ value: c, label: c }))}
                  className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs flex items-center justify-between"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">插件描述</label>
              <textarea
                rows={3}
                value={editingPlugin.description || ''}
                onChange={(e: any) => setEditingPlugin({ ...editingPlugin, description: e.target.value })}
                className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
              />
            </div>
            </div>
            </div>
            </div>
            
            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 flex-shrink-0 bg-zinc-100 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setEditingPlugin(null)}
                className="px-4 py-2 text-[10px] font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleUpdatePlugin}
                className="px-4 py-2 text-[10px] font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        onConfirm={(name) => handleAddCategory(name)}
        title="新建插件分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* Batch Move Modal */}
      <BottomSheetModal
        isOpen={showBatchMoveModal}
        onClose={() => setShowBatchMoveModal(false)}
        title={
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-500" />
            移动选中的 {selectedIds.length} 个插件
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
                  availableTags={appData.pluginTags || []}
                  selectedCount={selectedIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.plugins || [];
                      const newList = list.map((item: any) => {
                        if (selectedIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.pluginTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, plugins: newList, pluginTags: updatedGlobalTags };
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
  return prev.appData === next.appData;
});



