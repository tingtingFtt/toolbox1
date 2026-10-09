import { ManagementSearch, ManagementHeader, ManagementToolbarFrame, ManagementBatchBar, ManagementGrid, ManagementBatchOverlay } from '../ui/ManagementChrome';
import { DetailHeader, DetailPanel, DetailBody, DetailFooter } from '../ui/DetailChrome';
import { ActionButton } from '../ui/ActionButton';
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
                  <ManagementHeader data-design-id="st-plugins-header-banner"
        icon={<>
            <Link2 className="w-4 h-4" />
          </>}
        title={<>ST 插件管理</>}
        badge={<>
                格式：.js / .json / .zip / .txt
              </>}
        description={<>
              收录并管理酒馆第三方扩展插件、功能模块、本地脚本包与在线发布地址
            </>}
        actions={<>
          <ActionButton onClick={() => pluginFileInputRef.current?.click()} title="导入插件文件 (.js, .json, .zip, .txt)" action="import" context="toolbar" tone="primary">
            <Upload className="w-3 h-3" />
            <span>导入插件文件</span>
          </ActionButton>
          <ActionButton onClick={() => setShowAddModal(true)} action="create" context="toolbar">
            <Plus className="w-3 h-3" />
            <span>添加插件</span>
          </ActionButton>
        </>}
      />

      <ManagementToolbarFrame>
        {/* Search Input */}
        <ManagementSearch type="text" placeholder="搜索插件名称、作者、链接或描述…" value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} />

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
      </ManagementToolbarFrame>

      {/* Batch Actions Bar */}
      {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
      {batchMode && (
        <ManagementBatchOverlay >
          <ManagementBatchBar>
            {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                已选 {selectedIds.length} 项
              </span>
              <ActionButton onClick={() => {
                  setBatchMode(false);
                  setSelectedIds([]);
                }} aria-label="关闭选择" action="close" context="icon"><X className="w-3.5 h-3.5" /></ActionButton>
            </div>
            
                        {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              {/* 全选 / 取消 */}
              <ActionButton type="button" onClick={() => {
                  if (selectedIds.length === sorted.length && sorted.length > 0) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(sorted.map((c: any) => c.id));
                  }
                }} action="select" context="batch">
                {selectedIds.length === sorted.length && sorted.length > 0 ? '取消' : '全选'}
              </ActionButton>
              {/* 反选 */}
              <ActionButton type="button" onClick={() => {
                  const currentSet = new Set(selectedIds);
                  const inversed = sorted.filter((c: any) => !currentSet.has(c.id)).map((c: any) => c.id);
                  setSelectedIds(inversed);
                }} action="invert" context="batch">
                反选
              </ActionButton>
              {/* 移动 */}
              <ActionButton type="button" disabled={selectedIds.length === 0} onClick={() => setShowBatchMoveModal(true)} action="move" context="batch" tone="primary">
                移动
              </ActionButton>
              {/* 标签 */}
              <ActionButton type="button" disabled={selectedIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="tag" context="batch" tone="primary">
                标签
              </ActionButton>
              {/* 删除 */}
              <ActionButton type="button" disabled={selectedIds.length === 0} onClick={handleBatchDelete} action="delete" context="batch" tone="danger">
                删除
              </ActionButton>
            </div>
          </ManagementBatchBar>
        </ManagementBatchOverlay>
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
        <ManagementGrid className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </ManagementGrid>
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
          <DetailPanel onClick={(e) => e.stopPropagation()}>
            {/* Modal Top Bar (3-Line Layout) */}
            <DetailHeader designPrefix="stplugins-detail" title={editingPlugin.name} version="v1.0" badge={editingPlugin.category || '默认'} onClose={() => setEditingPlugin(null)} tags={<div className="flex items-center gap-2"><TagEditor
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
                /><span className="text-[10px] text-zinc-500">
                  作者: {editingPlugin.author || '未知'}
                </span></div>} actions={<><ActionButton onClick={() => {
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
                    }} action="tag" context="toolbar">
                    + 标签
                  </ActionButton></>} />

            {/* Scrollable Form Content */}
            <DetailBody className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
            </DetailBody>
            
            {/* Footer Actions */}
            <DetailFooter  className="justify-end">
              <ActionButton type="button" onClick={() => setEditingPlugin(null)} action="cancel" context="detail">
                取消
              </ActionButton>
              <ActionButton type="button" onClick={handleUpdatePlugin} action="save" context="detail">
                保存修改
              </ActionButton>
            </DetailFooter>
          </DetailPanel>
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



