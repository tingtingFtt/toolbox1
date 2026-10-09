import React, { useState, useMemo } from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import {
  X, Plus, Trash2, Edit3, Tag, ArrowUp, ArrowDown, Folder, Check, CheckSquare, Search,
  Layers, AlertTriangle, Shield
} from 'lucide-react';
import { DeleteConfirmationModal } from './UnifiedModal';
import { isFixedSystemTag } from '../../utils/tagUtils';

export interface GroupTagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;

  // Groups
  groups: string[];
  onAddGroup: (name: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onDeleteGroup: (name: string, deleteItems: boolean) => void;
  onDeleteMultipleGroups?: (names: string[], deleteItems: boolean) => void;
  fixedGroups?: string[];
  fixedTags?: string[];
  onReorderGroups?: (newGroups: string[]) => void;
  onReorderTags?: (newTags: string[]) => void;

  // Tags
  tags: string[];
  onAddTag: (name: string) => void;
  onRenameTag: (oldName: string, newName: string) => void;
  onDeleteTag: (name: string) => void;
  onDeleteMultipleTags?: (names: string[]) => void;

  // Items to show counts per group / tag
  items?: any[];
  groupField?: string;
  onBatchChangeGroup?: (itemIds: string[], targetGroup: string) => void;
}

export const GroupTagManager: React.FC<GroupTagManagerProps> = ({
  isOpen,
  onClose,
  title,
  groups,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  onDeleteMultipleGroups,
  tags,
  onAddTag,
  onRenameTag,
  onDeleteTag,
  onDeleteMultipleTags,
  fixedGroups = [],
  fixedTags = [],
  onReorderGroups,
  onReorderTags,
  items = [],
  groupField = 'category',
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'tags'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState('');

  // Batch management states for groups and tags
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedListItems, setSelectedListItems] = useState<string[]>([]);
  const [deleteGroupWithItems, setDeleteGroupWithItems] = useState(false);

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
    onConfirm: () => {},
  });

  // Drag and drop states
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [dragTimer, setDragTimer] = useState<any>(null);

  const handleReorder = (fromItem: string, toItem: string) => {
    if (fromItem === toItem) return;
    const isGroups = activeTab === 'groups';
    const list = isGroups ? [...groups] : [...tags];
    const fromIndex = list.indexOf(fromItem);
    const toIndex = list.indexOf(toItem);
    if (fromIndex >= 0 && toIndex >= 0) {
      list.splice(fromIndex, 1);
      list.splice(toIndex, 0, fromItem);
      if (isGroups && onReorderGroups) onReorderGroups(list);
      else if (!isGroups && onReorderTags) onReorderTags(list);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: string) => {
    if (isBatchMode || editingItem) {
      e.preventDefault();
      return;
    }
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, item: string) => {
    e.preventDefault();
    if (item !== dragOverItem) setDragOverItem(item);
  };
  const handleDrop = (e: React.DragEvent, item: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== item) {
      handleReorder(draggedItem, item);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleTouchStart = (e: React.TouchEvent, item: string) => {
    if (isBatchMode || editingItem) return;
    const timer = setTimeout(() => {
      setDraggedItem(item);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400); // 400ms long press
    setDragTimer(timer);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedItem) {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropTarget = target?.closest('[data-drag-id]');
      if (dropTarget) {
        const id = dropTarget.getAttribute('data-drag-id');
        if (id && id !== dragOverItem) {
          setDragOverItem(id);
        }
      }
    } else if (dragTimer) {
      clearTimeout(dragTimer);
      setDragTimer(null);
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragTimer) {
      clearTimeout(dragTimer);
      setDragTimer(null);
    }
    if (draggedItem && dragOverItem && draggedItem !== dragOverItem) {
      handleReorder(draggedItem, dragOverItem);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  if (!isOpen) return null;

  // Calculate items count per group and per tag
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of groups) counts[g] = 0;
    for (const item of items) {
      const g = item[groupField] || (groupField === 'group' ? item.category : item.group) || '默认';
      counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }, [groups, items, groupField]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tags) counts[t] = 0;
    for (const item of items) {
      const itemTags = Array.isArray(item.customTags) ? item.customTags : (Array.isArray(item.tags) ? item.tags : []);
      for (const t of itemTags) {
        if (typeof t === 'string') {
          counts[t] = (counts[t] || 0) + 1;
        }
      }
    }
    return counts;
  }, [tags, items]);

  const handleAdd = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    if (activeTab === 'groups') {
      if (groups.includes(trimmed)) {
        alert('该分组名称已存在');
        return;
      }
      onAddGroup(trimmed);
    } else {
      if (tags.includes(trimmed)) {
        alert('该标签名称已存在');
        return;
      }
      onAddTag(trimmed);
    }
    setNewItemName('');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const trimmed = editInputValue.trim();
    if (!trimmed || trimmed === editingItem) {
      setEditingItem(null);
      return;
    }

    if (activeTab === 'groups') {
      if (groups.includes(trimmed)) {
        alert('该分组名称已存在');
        return;
      }
      onRenameGroup(editingItem, trimmed);
    } else {
      if (tags.includes(trimmed)) {
        alert('该标签名称已存在');
        return;
      }
      onRenameTag(editingItem, trimmed);
    }
    setEditingItem(null);
  };

  const requestSingleDelete = (item: string) => {
    if (activeTab === 'groups') {
      setDeleteConfirmConfig({
        isOpen: true,
        message: `确定要删除分组「${item}」吗？${
          deleteGroupWithItems ? '该分组下的所有内容也将被一并彻底删除！' : '该分组下的内容将被安全转移至「默认」分组。'
        }`,
        itemCount: 1,
        onConfirm: () => {
          onDeleteGroup(item, deleteGroupWithItems);
          setDeleteConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          setDeleteGroupWithItems(false);
        },
      });
    } else {
      setDeleteConfirmConfig({
        isOpen: true,
        message: `确定要删除标签「${item}」吗？所有使用该标签的项目将自动移除此标签。`,
        itemCount: 1,
        onConfirm: () => {
          onDeleteTag(item);
          setDeleteConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  const requestBatchDelete = () => {
    if (selectedListItems.length === 0) return;
    const isGroup = activeTab === 'groups';
    setDeleteConfirmConfig({
      isOpen: true,
      message: `确定要批量删除选中的 ${selectedListItems.length} 个${isGroup ? '分组' : '标签'}吗？\n\n${
        isGroup && deleteGroupWithItems
          ? '⚠️ 警告：选中分组下的所有内容也将被一并彻底删除！'
          : isGroup
          ? '分组下的内容将被安全转移至「默认」分组。'
          : '所有使用这些标签的项目将自动移除对应标签。'
      }`,
      itemCount: selectedListItems.length,
      onConfirm: () => {
        if (isGroup) {
          if (onDeleteMultipleGroups) {
            onDeleteMultipleGroups(selectedListItems, deleteGroupWithItems);
          } else {
            selectedListItems.forEach((name) => onDeleteGroup(name, deleteGroupWithItems));
          }
        } else {
          if (onDeleteMultipleTags) {
            onDeleteMultipleTags(selectedListItems);
          } else {
            selectedListItems.forEach((name) => onDeleteTag(name));
          }
        }
        setSelectedListItems([]);
        setIsBatchMode(false);
        setDeleteConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        setDeleteGroupWithItems(false);
      },
    });
  };

  const isItemFixed = (item: string) => {
    if (activeTab === 'groups') {
      return item === '默认' || fixedGroups.includes(item);
    } else {
      return isFixedSystemTag(item) || fixedTags.includes(item);
    }
  };

  const rawList = activeTab === 'groups' ? groups : tags;
  const filteredList = rawList.filter((item) =>
    !searchQuery.trim() || item.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const selectableItems = filteredList.filter((item) => !isItemFixed(item));

  const handleToggleSelectAll = () => {
    if (selectedListItems.length === selectableItems.length && selectableItems.length > 0) {
      setSelectedListItems([]);
    } else {
      setSelectedListItems(selectableItems);
    }
  };

  const handleToggleItem = (item: string) => {
    if (isItemFixed(item)) return;
    setSelectedListItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card group-tag-manager-modal relative z-10 w-full max-w-lg bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#18181b] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 h-[620px] max-h-[90vh] text-[11px]"
        data-design-id="group-tag-manager-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <h3 className="font-bold text-[12px] text-zinc-900 dark:text-zinc-100">
              {title} · 分组与标签管理
            </h3>
          </div>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* Tabs: 分组管理 / 标签管理 */}
        <div className="tab-nav-bar flex border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 px-2">
          <BaseButton
            onClick={() => {
              setActiveTab('groups');
              setSelectedListItems([]);
              setEditingItem(null);
            }}
            className={`flex-1 py-1.5 text-[11px] font-semibold border-b transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'groups'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>分组管理 ({groups.length})</span>
          </BaseButton>
          <BaseButton
            onClick={() => {
              setActiveTab('tags');
              setSelectedListItems([]);
              setEditingItem(null);
            }}
            className={`flex-1 py-1.5 text-[11px] font-semibold border-b transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'tags'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>标签管理 ({tags.length})</span>
          </BaseButton>
        </div>

        {/* New Item Input & Batch Mode Toggle */}
        <div className="p-2.5 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <BaseInput
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder={`新建${activeTab === 'groups' ? '分组' : '标签'}名称...`}
              className="flex-1 min-w-[140px] px-3 py-1.5 text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <BaseButton
                onClick={handleAdd}
                disabled={!newItemName.trim()}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[11px] font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1 transition-all shadow-xs whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建</span>
              </BaseButton>
              <BaseButton
                onClick={() => {
                  setIsBatchMode((prev) => !prev);
                  setSelectedListItems([]);
                }}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-[11px] font-semibold rounded-lg border flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
                  isBatchMode
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{isBatchMode ? '退出批量' : '批量管理'}</span>
              </BaseButton>
            </div>
          </div>

          {/* Search bar when list is large */}
          {rawList.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <BaseInput
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`搜索${activeTab === 'groups' ? '分组' : '标签'}...`}
                className="w-full pl-8 pr-3 py-1 text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}
        </div>

        {/* Batch Management Toolbar */}
        {isBatchMode && (
          <div className="px-4 py-2 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between text-[11px] bg-zinc-100/60 dark:bg-zinc-800/40">
            <BaseButton
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors cursor-pointer"
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  selectedListItems.length > 0 && selectedListItems.length === selectableItems.length
                    ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                    : selectedListItems.length > 0
                    ? 'bg-zinc-200 dark:bg-zinc-700 border-zinc-400'
                    : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                }`}
              >
                {selectedListItems.length > 0 && <Check className="w-3 h-3" />}
              </div>
              <span>
                {selectedListItems.length === selectableItems.length && selectableItems.length > 0
                  ? '取消全选'
                  : '全选'}
              </span>
            </BaseButton>

            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              已选中 <strong className="text-zinc-900 dark:text-zinc-100">{selectedListItems.length}</strong> / {selectableItems.length} 项
            </span>
          </div>
        )}

        {/* List of Groups / Tags */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredList.map((item) => {
            const isFixed = isItemFixed(item);
            const currentIndex = filteredList.indexOf(item);
            const isSelected = selectedListItems.includes(item);
            const count = activeTab === 'groups' ? (groupCounts[item] || 0) : (tagCounts[item] || 0);

            return (
              <div
                key={item}
                data-drag-id={item}
                draggable={!isBatchMode && !editingItem}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleDragOver(e, item)}
                onDrop={(e) => handleDrop(e, item)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, item)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onClick={() => {
                  if (isBatchMode && !isFixed) handleToggleItem(item);
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 border rounded-lg transition-all min-h-[34px] ${
                  isBatchMode && !isFixed ? 'cursor-pointer' : ''
                } ${
                  draggedItem === item ? 'opacity-50 scale-95 border-amber-500' : ''
                } ${
                  dragOverItem === item && draggedItem !== item ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-md transform -translate-y-0.5' : ''
                } ${
                  isSelected
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100/80 dark:bg-zinc-800/80'
                    : 'border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {editingItem === item && !isBatchMode ? (
                  <div className="flex-1 flex gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                    <BaseInput
                      type="text"
                      value={editInputValue}
                      onChange={(e) => setEditInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingItem(null);
                      }}
                      autoFocus
                      className="flex-1 px-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none"
                    />
                    <BaseButton
                      onClick={handleSaveEdit}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 hover:underline"
                    >
                      保存
                    </BaseButton>
                    <BaseButton
                      onClick={() => setEditingItem(null)}
                      className="text-xs text-zinc-500 px-2 hover:underline"
                    >
                      取消
                    </BaseButton>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pointer-events-none">
                    {isBatchMode && !isFixed && (
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors pointer-events-auto ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                            : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    )}

                    {activeTab === 'groups' ? (
                      <Folder className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <Tag className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}

                    <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {activeTab === 'groups' && item === '默认' ? '未分组 (默认)' : item}
                    </span>

                    {isFixed ? (
                      <span className="text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded shrink-0 border border-amber-300 dark:border-amber-700/60 flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        {activeTab === 'groups' ? (item === '默认' ? '系统默认/未分组' : '固定分组') : '固定系统标签'}
                      </span>
                    ) : null}
                    <span className="text-[9px] text-zinc-400 shrink-0">
                        ({count} 项)
                    </span>
                  </div>
                )}

                {/* Single item actions when not in batch mode */}
                
                  <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    {(!isBatchMode && ((activeTab === 'groups' && onReorderGroups) || (activeTab === 'tags' && onReorderTags))) && (
                      <>
                        <BaseButton
                          disabled={currentIndex === 0}
                          onClick={() => {
                            const list = activeTab === 'groups' ? [...groups] : [...tags];
                            const idx = list.indexOf(item);
                            if (idx > 0) {
                              [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                              if (activeTab === 'groups' && onReorderGroups) onReorderGroups(list);
                              if (activeTab === 'tags' && onReorderTags) onReorderTags(list);
                            }
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="上移"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </BaseButton>
                        <BaseButton
                          disabled={currentIndex === filteredList.length - 1}
                          onClick={() => {
                            const list = activeTab === 'groups' ? [...groups] : [...tags];
                            const idx = list.indexOf(item);
                            if (idx < list.length - 1) {
                              [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                              if (activeTab === 'groups' && onReorderGroups) onReorderGroups(list);
                              if (activeTab === 'tags' && onReorderTags) onReorderTags(list);
                            }
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="下移"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </BaseButton>
                      </>
                    )}
                    {!isFixed && editingItem !== item && !isBatchMode && (
                      <>
                        <BaseButton
                          onClick={() => {
                            setEditingItem(item);
                            setEditInputValue(item);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="重命名"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </BaseButton>
                        <BaseButton
                          onClick={() => requestSingleDelete(item)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </BaseButton>
                      </>
                    )}
                  </div>

              </div>
            );
          })}

          {filteredList.length === 0 && (
            <div className="text-center py-12 text-xs text-zinc-400">
              {searchQuery ? '没有找到匹配的项' : `暂无自定义${activeTab === 'groups' ? '分组' : '标签'}`}
            </div>
          )}
        </div>

        {/* Batch Delete Action Bar at Bottom */}
        {isBatchMode && selectedListItems.length > 0 && (
          <div className="p-3.5 border-t border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 space-y-2">
            {activeTab === 'groups' && (
              <label className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteGroupWithItems}
                  onChange={(e) => setDeleteGroupWithItems(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                />
                <span>同时彻底删除选中分组下的所有项目（默认将项目移至「默认」分组）</span>
              </label>
            )}
            <BaseButton
              type="button"
              onClick={requestBatchDelete}
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>批量删除已选 {selectedListItems.length} 个{activeTab === 'groups' ? '分组' : '标签'}</span>
            </BaseButton>
          </div>
        )}
      </div>

      {/* 3-Step Delete Confirmation Modal */}
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
};
