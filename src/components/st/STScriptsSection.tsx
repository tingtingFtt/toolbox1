import { NewGroupModal, BottomSheetModal, UnifiedModal, DeleteConfirmationModal } from '../ui/UnifiedModal';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import {
  FileCode, Plus, Search, Trash2, Edit3, FolderPlus, ArrowRightLeft,
  Download, Upload, Copy, Check, SlidersHorizontal, ArrowUpDown, X,
  Layers, Maximize2, Minimize2, Sparkles, ExternalLink, ArrowLeft, History,
  CheckSquare, Square, Code, ListFilter, RotateCcw
, Tag } from 'lucide-react';
import { AppData, ScriptEntry, ScriptItemRule } from '../../types';
import { normalizeResourceName, triggerFileDownload } from '../../utils';
import { compareScripts } from '../../utils/diffEngine';
import { sessionStore } from '../../utils/sessionStore';
import { cleanPresetResource, bindPresetResourceItems, presetResourceId, resourceSource } from '../../utils/presetResources';
import { ResourceSourceControls, ResourceSourceBadge, ResourceSourceFilter } from './ResourceSourceControls';

interface STScriptsSectionProps {
  appData: AppData;
  updateAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  sortItemList: <T>(items: T[], sortOrder: any, getName: (item: T) => string, getCreatedAt?: (item: T) => number) => T[];
  onOpenCardDetail?: (cardId: string) => void;
  onOpenPresetDetail?: (presetId: string) => void;
  jumpTargetId?: string | null;
  onClearJumpTarget?: () => void;
}

export const STScriptsSection = React.memo<STScriptsSectionProps>(({
  appData,
  updateAppData,
  showToast,
  sortItemList,
  onOpenCardDetail,
  onOpenPresetDetail,
  jumpTargetId,
  onClearJumpTarget,
}) => {
  const [searchQuery, setSearchQuery] = useState(() => sessionStore.stScripts.searchQuery);
  const [sourceFilter, setSourceFilter] = useState<ResourceSourceFilter>('all');
  const [tagFilter, setTagFilter] = useState<string[]>(() => sessionStore.stScripts.tagFilter);
  const [categoryFilter, setCategoryFilter] = useState(() => sessionStore.stScripts.categoryFilter);
  const [sortOrder, setSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>(() => sessionStore.stScripts.sortOrder);

  useEffect(() => {
    sessionStore.stScripts.searchQuery = searchQuery;
  }, [searchQuery]);
  useEffect(() => {
    sessionStore.stScripts.tagFilter = tagFilter;
  }, [tagFilter]);
  useEffect(() => {
    sessionStore.stScripts.categoryFilter = categoryFilter;
  }, [categoryFilter]);
  useEffect(() => {
    sessionStore.stScripts.sortOrder = sortOrder;
  }, [sortOrder]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const customTags = appData.scriptTags || [];
  const builtInTags: string[] = [];

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

  // Modals & Detail
  const [activeScript, setActiveScript] = useState<ScriptEntry | null>(null);
  const [focusedEntryKey, setFocusedEntryKey] = useState<string | null>(null);

  useEffect(() => {
    if (jumpTargetId && appData.scripts) {
      const target = appData.scripts.find(r => r.id === jumpTargetId || r.sourceResources?.some(resource => presetResourceId(r.sourcePresetId!, 'script', resource.key) === jumpTargetId));
      if (target) {
        setFocusedEntryKey(target.sourceResources?.find(resource => presetResourceId(target.sourcePresetId!, 'script', resource.key) === jumpTargetId)?.key || null);
        setActiveScript(target);
        setEditingContent(target.rawContent || JSON.stringify(target.jsonData || {}, null, 2));
        setSelectedSubEntryIndex(null);
        setDetailTab(target.entries?.length ? 'entries' : 'info');
        setSourceFilter(resourceSource(target));
        setCategoryFilter('全部分组');
        setTagFilter([]);
        setSearchQuery('');
        if (onClearJumpTarget) onClearJumpTarget();
      }
    }
  }, [jumpTargetId, appData.scripts, onClearJumpTarget]);

  useEffect(() => {
    if (!activeScript?.sourcePresetId) return;
    const fresh = appData.scripts?.find(item => item.id === activeScript.id);
    setActiveScript(fresh || null);
    if (fresh) setEditingContent(fresh.rawContent || '');
  }, [appData.scripts]);

  const [detailTab, setDetailTab] = useState<'info' | 'entries' | 'code' | 'versions'>('info');
  const [selectedSubEntryIndex, setSelectedSubEntryIndex] = useState<number | null>(null);
  useEffect(() => {
    if (detailTab !== 'entries' || !focusedEntryKey) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-resource-key]')).find(item => item.dataset.resourceKey === focusedEntryKey);
    target?.scrollIntoView({ block: 'nearest' });
  }, [detailTab, activeScript?.id, focusedEntryKey]);

  const [isCodeFullscreen, setIsCodeFullscreen] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [showAddSubEntryModal, setShowAddSubEntryModal] = useState(false);
  const [subEntryForm, setSubEntryForm] = useState<ScriptItemRule>({
    id: '',
    name: '',
    type: 'script',
    content: '',
    description: '',
    enabled: true
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newScriptForm, setNewScriptForm] = useState({
    name: '',
    author: '',
    description: '',
    rawContent: '{\n  "name": "自定义脚本",\n  "version": "1.0",\n  "description": ""\n}',
  });

  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchTargetCategory, setBatchTargetCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawScripts = appData.scripts || [];
  const categories = Array.from(
    new Set(['默认', ...(appData.scriptCategories || []), ...rawScripts.map((p: any) => p.category || '默认')])
  );

  const filtered = useMemo(() => {
    return rawScripts.filter((item: any) => {
      if (sourceFilter !== 'all' && resourceSource(item) !== sourceFilter) return false;
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
        ((item as any).sourcePresetName && (item as any).sourcePresetName.toLowerCase().includes(q)) ||
        (item.fileName && item.fileName.toLowerCase().includes(q)) ||
        item.entries?.some((entry: any) => (entry.name || '').toLowerCase().includes(q) || (entry.content || '').toLowerCase().includes(q))
      );
    });
  }, [rawScripts, categoryFilter, tagFilter, searchQuery, sourceFilter]);

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

    let curScripts = [...(appData.scripts || [])];
    let addedCount = 0;
    let versionCount = 0;
    let distinctCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        let jsonData: any = null;
        try {
          jsonData = JSON.parse(text);
        } catch {
          jsonData = null;
        }

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const name = (jsonData?.name || jsonData?.scriptName || jsonData?.title || cleanName || '未命名脚本').trim();
        const author = (jsonData?.author || jsonData?.creator || '').trim();
        const description = (jsonData?.description || '').trim();

        // Check if file contains array of script rules
        let entries: ScriptItemRule[] | undefined = undefined;
        if (Array.isArray(jsonData)) {
          entries = jsonData.map((item, idx) => ({
            id: item.id || `sub_script_${idx}_${Date.now()}`,
            name: item.name || item.title || `条目 #${idx + 1}`,
            type: item.type || 'script',
            content: typeof item.content === 'string' ? item.content : JSON.stringify(item, null, 2),
            description: item.description || '',
            enabled: item.enabled !== false,
            ...item
          }));
        } else if (jsonData?.entries && Array.isArray(jsonData.entries)) {
          entries = jsonData.entries;
        }

        const newEntry: ScriptEntry = {
          id: 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + i,
          name,
          fileName: file.name,
          author,
          category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
          description,
          entries,
          jsonData: jsonData || { content: text },
          rawContent: text,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          activeVersionNumber: 1,
          activeVersionLabel: 'v1',
          versions: []
        };

        const normName = normalizeResourceName(name);
        const existingSameName = curScripts.filter((s: any) => {
          if (s.sourcePresetId || s.sourceCardId) return false;
          if ((s.name || '').trim().toLowerCase() === name.toLowerCase()) return true;
          const normExt = normalizeResourceName(s.name);
          if (normExt && normName && (normExt === normName || normExt.includes(normName) || normName.includes(normExt))) return true;
          return false;
        });

        if (existingSameName.length === 0) {
          curScripts.push(newEntry);
          addedCount++;
        } else {
          let matchedScript: ScriptEntry | null = null;
          let bestDiff: any = { status: 'completely_different', similarity: 0, summary: '' };

          for (const extScript of existingSameName) {
            const diff = compareScripts(jsonData || text, extScript);
            if (diff.status === 'identical') {
              matchedScript = extScript;
              bestDiff = diff;
              break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedScript = extScript;
              bestDiff = diff;
            }
          }

          if (bestDiff.status === 'identical' && matchedScript) {
            skippedCount++;
          } else if (bestDiff.status === 'partially_different' && matchedScript) {
            const updatedScript: ScriptEntry = {
              ...matchedScript,
              rawContent: text,
              jsonData: jsonData || { content: text },
              entries: entries || matchedScript.entries,
              fileName: file.name,
              updatedAt: Date.now(),
              customTags: Array.from(new Set([...(matchedScript.customTags || []), '已更新'])),
              versions: matchedScript.versions || []
            };

            const idx = curScripts.findIndex((s: any) => s.id === matchedScript!.id);
            if (idx > -1) curScripts[idx] = updatedScript;
            versionCount++;
          } else {
            newEntry.customTags = Array.from(new Set([...(newEntry.customTags || []), '同名变体']));
            curScripts.push(newEntry);
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
        scripts: curScripts,
      }));
      const parts: string[] = [];
      if (addedCount > 0) parts.push(`新增 ${addedCount} 个`);
      if (versionCount > 0) parts.push(`版本更新 ${versionCount} 个`);
      if (distinctCount > 0) parts.push(`同名独立变体 ${distinctCount} 个`);
      if (skippedCount > 0) parts.push(`跳过完全重复 ${skippedCount} 个`);
      showToast(`脚本导入完成：${parts.join('，')}`, 'success');
    } else if (skippedCount > 0) {
      showToast(`已跳过 ${skippedCount} 个内容完全一致的重复脚本`, 'info');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateManualScript = () => {
    if (!newScriptForm.name.trim()) {
      showToast('请填写脚本名称', 'error');
      return;
    }
    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(newScriptForm.rawContent);
    } catch {
      parsedJson = { content: newScriptForm.rawContent };
    }

    const newEntry: ScriptEntry = {
      id: 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: newScriptForm.name.trim(),
      author: newScriptForm.author.trim(),
      description: newScriptForm.description.trim(),
      category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
      jsonData: parsedJson,
      rawContent: newScriptForm.rawContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activeVersionNumber: 1,
      activeVersionLabel: 'v1',
      versions: []
    };

    updateAppData((prev) => ({
      ...prev,
      scripts: [...(prev.scripts || []), newEntry],
    }));

    setNewScriptForm({
      name: '',
      author: '',
      description: '',
      rawContent: '{\n  "name": "自定义脚本",\n  "version": "1.0",\n  "description": ""\n}',
    });
    setShowAddModal(false);
    showToast('脚本创建成功！', 'success');
  };

  const handleOpenDetail = (script: ScriptEntry) => {
    setActiveScript(script);
    setFocusedEntryKey(null);
    setSelectedSubEntryIndex(null);
    setDetailTab(script.entries?.length ? 'entries' : 'info');
    const content = script.rawContent || (script.jsonData ? JSON.stringify(script.jsonData, null, 2) : '');
    setEditingContent(content);
  };

  const handleSaveActiveScript = (scriptOverride?: ScriptEntry) => {
    const target = scriptOverride || activeScript;
    if (!target) return;
    const content = !scriptOverride && detailTab === 'code' ? editingContent : target.rawContent || editingContent;
    let nextJson: any = target.jsonData;
    let entries = target.entries;
    if (target.sourceResources) {
      if (!scriptOverride && detailTab === 'code' && content !== target.rawContent) {
        try {
          const parsed = JSON.parse(content);
          if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item !== 'object' || Array.isArray(item)))
            throw new Error('需要包含脚本对象的 JSON 数组');
          entries = bindPresetResourceItems(parsed, target.entries || []);
        } catch (error: any) {
          showToast(`脚本集合格式错误：${error.message}`, 'error');
          return;
        }
      }
      nextJson = (entries || []).map(cleanPresetResource);
    } else {
      try { nextJson = JSON.parse(content); } catch { /* Independent scripts may contain plain JavaScript. */ }
    }
    const updated: ScriptEntry = {
      ...target,
      entries,
      rawContent: target.sourceResources ? JSON.stringify(nextJson, null, 2) : content,
      jsonData: nextJson,
      updatedAt: Date.now(),
    };

    updateAppData((prev) => {
      return {
        ...prev,
        scripts: (prev.scripts || []).map((s) => (s.id === target.id ? updated : s)),
      };
    });
    setActiveScript(updated);
    setEditingContent(updated.rawContent || content);
    showToast((updated as any).sourcePresetId ? '脚本已保存并同步回对应预设！' : '脚本已保存！', 'success');
  };

  const handleToggleSubEntry = (index: number) => {
    if (!activeScript || !activeScript.entries) return;
    const newEntries = [...activeScript.entries];
    newEntries[index] = {
      ...newEntries[index],
      enabled: !newEntries[index].enabled
    };
    const updated: ScriptEntry = {
      ...activeScript,
      entries: newEntries,
      ...(activeScript.sourceResources ? { jsonData: newEntries.map(cleanPresetResource), rawContent: JSON.stringify(newEntries.map(cleanPresetResource), null, 2) } : {}),
      updatedAt: Date.now()
    };
    setActiveScript(updated);
    updateAppData((prev) => ({
      ...prev,
      scripts: (prev.scripts || []).map((s) => (s.id === activeScript.id ? updated : s))
    }));
    showToast(`已${newEntries[index].enabled ? '启用' : '禁用'}条目`, 'info');
  };

  const handleDeleteSubEntry = (index: number) => {
    if (!activeScript || !activeScript.entries) return;
    requestDelete('确定要删除此脚本子条目吗？', 1, () => {
      const newEntries = activeScript.entries!.filter((_, i) => i !== index);
      const updated: ScriptEntry = {
        ...activeScript,
        entries: newEntries,
        ...(activeScript.sourceResources ? { jsonData: newEntries.map(cleanPresetResource), rawContent: JSON.stringify(newEntries.map(cleanPresetResource), null, 2) } : {}),
        updatedAt: Date.now()
      };
      setActiveScript(updated);
      if (selectedSubEntryIndex === index) {
        setSelectedSubEntryIndex(null);
      } else if (selectedSubEntryIndex !== null && selectedSubEntryIndex > index) {
        setSelectedSubEntryIndex(selectedSubEntryIndex - 1);
      }
      updateAppData((prev) => ({
        ...prev,
        scripts: (prev.scripts || []).map((s) => (s.id === activeScript.id ? updated : s))
      }));
      showToast('条目已删除', 'info');
    });
  };

  const handleSaveSubEntryForm = () => {
    if (!activeScript) return;
    if (!subEntryForm?.name?.trim()) {
      showToast('请输入条目名称', 'error');
      return;
    }
    const currentEntries = activeScript.entries ? [...activeScript.entries] : [];
    if (selectedSubEntryIndex !== null && selectedSubEntryIndex < currentEntries.length) {
      currentEntries[selectedSubEntryIndex] = { ...subEntryForm, name: subEntryForm.name.trim() };
    } else {
      currentEntries.push({
        ...subEntryForm,
        name: subEntryForm.name.trim(),
        id: subEntryForm.id || `sub_script_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      });
    }
    const updated: ScriptEntry = {
      ...activeScript,
      entries: currentEntries,
      ...(activeScript.sourceResources ? { jsonData: currentEntries.map(cleanPresetResource), rawContent: JSON.stringify(currentEntries.map(cleanPresetResource), null, 2) } : {}),
      updatedAt: Date.now()
    };
    setActiveScript(updated);
    updateAppData((prev) => ({
      ...prev,
      scripts: (prev.scripts || []).map((s) => (s.id === activeScript.id ? updated : s))
    }));
    setShowAddSubEntryModal(false);
    showToast('条目已保存', 'success');
  };

  const handleExportScript = (script: ScriptEntry) => {
    const content = script.rawContent || JSON.stringify(script.jsonData || script.entries || {}, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    triggerFileDownload(blob, `${script.name || 'ST脚本'}.json`);
    showToast('已导出脚本 JSON 文件', 'success');
  };

  const handleDeleteScript = (id: string) => {
    requestDelete('确定要删除此脚本吗？', 1, () => {
      updateAppData((prev) => ({
        ...prev,
        scripts: (prev.scripts || []).filter((s) => s.id !== id),
      }));
      if (activeScript?.id === id) setActiveScript(null);
      showToast('脚本已删除', 'info');
    });
  };

  const handleBatchDelete = () => {
    if (!selectedIds.length) return;
    requestDelete(`确定要删除选中的 ${selectedIds.length} 个脚本吗？`, selectedIds.length, () => {
      updateAppData((prev) => ({
        ...prev,
        scripts: (prev.scripts || []).filter((s) => !selectedIds.includes(s.id)),
      }));
      setSelectedIds([]);
      setBatchMode(false);
      showToast(`已批量删除 ${selectedIds.length} 个脚本`, 'info');
    });
  };

  const handleBatchMove = () => {
    if (!selectedIds.length || !batchTargetCategory) return;
    updateAppData((prev) => ({
      ...prev,
      scripts: (prev.scripts || []).map((s) => (selectedIds.includes(s.id) ? { ...s, category: batchTargetCategory } : s)),
    }));
    setSelectedIds([]);
    setShowBatchMoveModal(false);
    setBatchMode(false);
    showToast(`已将 ${selectedIds.length} 个脚本移动到「${batchTargetCategory}」`, 'success');
  };

  const handleAddCategory = (customName?: string) => {
    const trimmed = (customName !== undefined ? customName : newGroupName).trim();
    if (!trimmed) {
      showToast('分组名称不能为空', 'error');
      return;
    }
    const curCats = appData.scriptCategories || ['默认'];
    if (curCats.includes(trimmed)) {
      showToast('该分组已存在', 'error');
      return;
    }
    updateAppData((prev) => ({
      ...prev,
      scriptCategories: [...curCats, trimmed],
    }));
    setCategoryFilter(trimmed);
    setNewGroupName('');
    setShowNewGroupModal(false);
    showToast(`成功新建分组: ${trimmed}`, 'success');
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
        accept=".json,.js"
        className="hidden"
      />

      <div className="space-y-3 md:space-y-4 mb-6">
      {/* Top Header & Actions */}
                  <div className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <FileCode className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">ST 脚本管理</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.json / .js
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              管理酒馆 JSON 脚本、QR 快捷回复以及与角色卡内置绑定的多条目脚本集
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
            title="导入脚本 (.json, .js)"
          >
            <Upload className="w-3 h-3" />
            <span>导入脚本 (JSON)</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            新建脚本
          </button>
        </div>
      </div>

      {/* Batch Action Toolbar */}
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

      <div className="space-y-2.5 mb-6">
        <ResourceSourceControls items={rawScripts} value={sourceFilter} onChange={value => { setSourceFilter(value); setCategoryFilter('全部分组'); setTagFilter([]); }} />
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索脚本名称、作者、描述或关联角色卡…"
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 h-8 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <span role="button" onClick={() => setSearchQuery('')} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <CategoryFilterDropdown 
            groups={Array.from(new Set(['默认', ...(appData.scriptCategories || [])]))}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            allGroupName="全部分组"
          />
          <TagFilterDropdown
            customTags={appData.scriptTags || []}
            selectedTags={tagFilter}
            onChange={setTagFilter}
          />
          <CustomSelect
            value={sortOrder}
            onChange={(val) => setSortOrder(val)}
            options={[
              { value: 'default', label: '默认排序' },
              { value: 'az', label: '名称 A-Z' },
              { value: 'za', label: '名称 Z-A' },
              { value: 'newest', label: '最新创建' },
              { value: 'oldest', label: '最早创建' },
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
            groups={Array.from(new Set(['默认', ...(appData.scriptCategories || [])]))}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            getCount={(g) => (appData.scripts || []).filter((c: any) => (c.category || '默认') === g).length}
            totalCount={appData.scripts?.length || 0}
            allGroupName="全部分组"
          />
        </div>
      </div>
      </div>
      {/* Script List Cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
          <FileCode className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            暂无脚本文件
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm mx-auto mb-4">
            导入酒馆脚本 JSON 文件或点击“新建脚本”创建独立或角色卡绑定的脚本
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> 导入脚本
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> 新建脚本
            </button>
          </div>
        </div>
      ) : (
        <div className="resource-card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleSorted.map((script: ScriptEntry) => {
            const isSelected = selectedIds.includes(script.id);
            const subEntriesCount = script.entries?.length || 0;
            return (
              <div
                key={script.id}
                onClick={() => {
                  if (batchMode) {
                    setSelectedIds((prev) =>
                      prev.includes(script.id) ? prev.filter((id) => id !== script.id) : [...prev, script.id]
                    );
                  } else {
                    handleOpenDetail(script);
                  }
                }}
                className={`bg-white dark:bg-zinc-900 border rounded-xl p-3 flex flex-col h-full justify-between transition-all cursor-pointer shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600/60 ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {/* Line 1: Name, Version */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {batchMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                    />
                  )}
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1" title={script.name}>
                    {script.name}
                  </h3>
                  {script.versions && script.versions.length > 0 && (
                      <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 rounded flex-shrink-0">
                          {script.activeVersionLabel || `v${script.versions.length + 1}`}
                      </span>
                  )}
                </div>

                {/* Built-in Character Card Linkage Tag (Optional) */}
                <ResourceSourceBadge item={script} onOpenPreset={onOpenPresetDetail} onOpenCard={onOpenCardDetail} />

                {/* Line 2: Tags & Metadata */}
                <div className="flex items-center gap-2 min-w-0 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[60px] flex-shrink-0">
                      {script.category || '默认'}
                    </span>
                    {script.customTags && script.customTags.length > 0 && (
                        <div className="flex-1 min-w-0">
                            <TagEditor 
                                customTags={script.customTags || []} 
                                onChange={(newTags) => {
                                    updateAppData((prev: any) => ({
                                        ...prev,
                                        scripts: (prev.scripts || []).map((t: any) => t.id === script.id ? { ...t, customTags: newTags } : t)
                                    }));
                                }}
                                availableTags={appData.scriptTags || []}
                                maxDisplay={1}
                            />
                        </div>
                    )}
                    {script.author && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex-shrink-0 max-w-[80px]">
                            作者：{script.author}
                        </span>
                    )}
                </div>

                {/* Description (Optional) */}
                {script.description && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-1 truncate">
                    {script.description}
                  </p>
                )}

                {/* Code snippet preview */}
                <div className="p-2 mt-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 font-mono text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {script.rawContent || JSON.stringify(script.jsonData || script.entries || {}, null, 2)}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-1.5 mt-1.5 mb-2">
                  {subEntriesCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-medium text-zinc-600 dark:text-zinc-400">
                        {subEntriesCount} 个条目
                      </span>
                  )}
                </div>

                {/* Line 3: Actions */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] mt-auto">
                  <span className="text-[9px] text-zinc-400">
                    {new Date(script.updatedAt || script.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  {!batchMode && (
                    <div className="flex items-center gap-1.5" onClick={(e: any) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const newTag = prompt('输入新标签：');
                                if (newTag && newTag.trim()) {
                                    const tags = script.customTags || [];
                                    if (!tags.includes(newTag.trim())) {
                                         updateAppData((prev: any) => {
                                            const updated = (prev.scripts || []).map((t: any) => t.id === script.id ? { ...t, customTags: [...tags, newTag.trim()] } : t);
                                            const globalTags = prev.scriptTags || [];
                                            return {
                                                ...prev,
                                                scripts: updated,
                                                scriptTags: Array.from(new Set([...globalTags, newTag.trim()]))
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
                        onClick={() => handleExportScript(script)}
                        className="px-2 py-1 text-[9px] rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        导出 JSON
                      </button>
                      {script.sourceCardId && onOpenCardDetail && (
                        <button
                          onClick={() => onOpenCardDetail(script.sourceCardId!)}
                          className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          title="跳转查看角色卡"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteScript(script.id)}
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

      {/* Script Detail Modal */}
      {activeScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveScript(null)} role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-transparent transition-opacity"
            aria-label="关闭遮罩"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="file-detail-modal modal-panel modal-card relative z-10 w-full h-full flex flex-col transition-all mx-auto overflow-hidden bg-[#fafafa] dark:bg-[#09090b] rounded-none border-0 shadow-2xl"
          >
            {/* Modal Top Bar (Clean 2-Row Compact Layout, No Overlap) */}
            <div className="px-3 sm:px-6 py-2 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex flex-col gap-1.5 flex-shrink-0 bg-zinc-100/80 dark:bg-zinc-900/80">
              {/* Row 1: Title, Version, Category, and Action Buttons + Close X */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {activeScript.name}
                  </h3>
                  {activeScript.activeVersionLabel && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 whitespace-nowrap shrink-0">
                      {activeScript.activeVersionLabel}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-nowrap shrink-0">
                    {activeScript.category || '默认'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => handleExportScript(activeScript)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">导出 JSON</span>
                  </button>
                  <button
                    onClick={() => setIsCodeFullscreen(!isCodeFullscreen)}
                    className="p-1 sm:p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 shrink-0 transition-colors"
                    title={isCodeFullscreen ? '退出全屏' : '全屏'}
                  >
                    {isCodeFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <span role="button" onClick={() => setActiveScript(null)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
                </div>
              </div>

              {/* Row 2: Metadata stats + Tag Editor */}
              <div className="flex items-center justify-between gap-2 min-w-0 text-[10px] text-zinc-500">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden py-0.5">
                  {activeScript.author && (
                    <span className="whitespace-nowrap shrink-0 text-zinc-500 dark:text-zinc-400">
                      作者: {activeScript.author}
                    </span>
                  )}
                  <TagEditor
                    customTags={activeScript.customTags || []}
                    availableTags={appData.scriptTags || []}
                    maxDisplay={2}
                    onChange={(newTags) => {
                      const updated = { ...activeScript, customTags: newTags };
                      setActiveScript(updated);
                      updateAppData((prev: any) => {
                         const newList = (prev.scripts || []).map((i: any) => i.id === updated.id ? updated : i);
                         const globalTags = prev.scriptTags || [];
                         return { 
                           ...prev, 
                           scripts: newList,
                           scriptTags: Array.from(new Set([...globalTags, ...newTags]))
                         };
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="tab-nav-bar flex flex-wrap items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 flex-shrink-0 gap-2 overflow-x-auto scrollbar-none bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {[
                  { id: 'info' as const, label: '基本属性', icon: FileCode },
                  { id: 'entries' as const, label: `脚本条目 (${activeScript.entries?.length || 0})`, icon: Layers },
                  { id: 'versions' as const, label: '版本管理', icon: History },
                  { id: 'code' as const, label: '代码编辑', icon: Code },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id)}
                    className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                      detailTab === tab.id
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="file-detail-body flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="mb-3"><ResourceSourceBadge item={activeScript} onOpenPreset={onOpenPresetDetail} onOpenCard={onOpenCardDetail} /></div>
              {/* TAB 1: Info */}
              {detailTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">作者</label>
                      <input
                        type="text"
                        value={activeScript.author || ''}
                        onChange={(e: any) => setActiveScript({ ...activeScript, author: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">所属分组</label>
                      <CustomSelect
                        value={activeScript.category || '默认'}
                        onChange={(val) => setActiveScript({ ...activeScript, category: val })}
                        options={categories.map((c) => ({ value: c, label: c }))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs flex items-center justify-between"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">脚本描述说明</label>
                    <textarea
                      rows={4}
                      value={activeScript.description || ''}
                      onChange={(e: any) => setActiveScript({ ...activeScript, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
                      placeholder="记录脚本功能、触发方式与使用提示…"
                    />
                  </div>
                </div>
              )}

              {detailTab === 'entries' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[var(--dim)]">共 {activeScript.entries?.length || 0} 个脚本条目，编辑后同步到所属预设。</p>
                    <button type="button" className="px-3 py-2 text-xs border-b border-[var(--line)] text-[var(--accent)]" onClick={() => {
                      setSelectedSubEntryIndex(null);
                      setSubEntryForm({ name: '', type: 'script', content: '', enabled: true });
                      setShowAddSubEntryModal(true);
                    }}><Plus className="w-3 h-3 inline mr-1" />添加条目</button>
                  </div>
                  <div className="resource-card-grid grid gap-3">
                    {(activeScript.entries || []).map((entry, index) => (
                      <article key={entry.__presetResourceKey || entry.id || index} data-resource-key={entry.__presetResourceKey} className={`min-w-0 border border-[var(--line)] p-3 space-y-2 ${focusedEntryKey === entry.__presetResourceKey ? 'ring-2 ring-[var(--accent)]' : ''}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="min-w-0 break-words text-xs font-bold">{entry.name || `脚本 #${index + 1}`}</h4>
                          <span className="text-[10px] text-[var(--dim)]">{entry.enabled !== false ? '已启用' : '已禁用'}</span>
                        </div>
                        {entry.__presetSourceFolder && <p className="text-[10px] text-[var(--dim)] break-words">文件夹：{entry.__presetSourceFolder}</p>}
                        <pre className="text-[10px] max-h-24 overflow-auto whitespace-pre-wrap break-words">{entry.content || entry.code || entry.script || ''}</pre>
                        <div className="flex flex-wrap gap-2">
                          <button className="px-2 py-1.5 text-xs border-b border-[var(--line)]" onClick={() => {
                            setSelectedSubEntryIndex(index); setSubEntryForm({ ...entry }); setShowAddSubEntryModal(true);
                          }}><Edit3 className="w-3 h-3 inline mr-1" />编辑条目</button>
                          <button className="px-2 py-1.5 text-xs border-b border-[var(--line)]" onClick={() => handleToggleSubEntry(index)}>{entry.enabled !== false ? '禁用' : '启用'}</button>
                          <button className="px-2 py-1.5 text-xs border-b border-[var(--line)]" onClick={() => handleDeleteSubEntry(index)}>删除条目</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: Code Editor */}
              {detailTab === 'code' && (
                <div className="space-y-2 flex-1 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                      JSON 脚本内容（支持在线编辑与校验）
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(editingContent);
                        showToast('已复制代码到剪贴板', 'success');
                      }}
                      className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <Copy className="w-3.5 h-3.5" /> 复制代码
                    </button>
                  </div>
                  <textarea
                    value={editingContent}
                    onChange={(e: any) => setEditingContent(e.target.value)}
                    className="w-full flex-1 min-h-[360px] p-3 text-[10px] font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-900 text-zinc-100 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* TAB 4: Versions (版本历史) */}
              {detailTab === 'versions' && activeScript.sourcePresetId && (
                <div className="space-y-3"><p>此集合随所属预设统一记录版本，恢复时同时更新全部内嵌资源。</p><ResourceSourceBadge item={activeScript} onOpenPreset={onOpenPresetDetail} /></div>
              )}
              {detailTab === 'versions' && !activeScript.sourcePresetId && (
                <div className="space-y-3">
                  <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-amber-500" />
                        扩展脚本版本归档时间线
                      </h4>
                      <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-amber-100/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                        共 {activeScript.versions?.length || 0} 个版本
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      每次导入或更新相同脚本时会自动生成历史版本快照。
                    </p>
                  </div>

                  {(!activeScript.versions || activeScript.versions.length === 0) ? (
                    <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                      <History className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-400">当前仅有初始版本 (v1)，暂无历史修改快照</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeScript.versions.map((ver, idx) => (
                        <div
                          key={ver.versionId || idx}
                          className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 flex flex-col gap-2"
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-col items-start gap-1">
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                                {ver.versionLabel || `历史版本 v${ver.versionNumber || (activeScript.versions!.length - idx)}`}
                              </span>
                              {ver.changeSummary && (
                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                  {ver.changeSummary}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400">
                                {new Date(ver.updatedAt || ver.importedAt || Date.now()).toLocaleString()}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                if (!ver.data) return;
                                const currentSnap = {
                                  versionId: `scver_${activeScript.id}_${Date.now()}`,
                                  versionNumber: (activeScript.versions?.length || 0) + 1,
                                  versionLabel: activeScript.activeVersionLabel || '当前版本',
                                  updatedAt: activeScript.updatedAt || Date.now(),
                                  changeSummary: '恢复历史版本前的快照',
                                  data: {
                                    name: activeScript.name,
                                    rawContent: activeScript.rawContent,
                                    entries: activeScript.entries ? JSON.parse(JSON.stringify(activeScript.entries)) : undefined,
                                    jsonData: activeScript.jsonData ? JSON.parse(JSON.stringify(activeScript.jsonData)) : undefined
                                  }
                                };

                                const restored: ScriptEntry = {
                                  ...activeScript,
                                  name: ver.data.name || activeScript.name,
                                  rawContent: ver.data.rawContent || activeScript.rawContent,
                                  entries: ver.data.entries || activeScript.entries,
                                  jsonData: ver.data.jsonData || activeScript.jsonData,
                                  activeVersionLabel: ver.versionLabel,
                                  updatedAt: Date.now(),
                                  versions: [currentSnap, ...(activeScript.versions || [])]
                                };

                                setActiveScript(restored);
                                updateAppData((prev) => ({
                                  ...prev,
                                  scripts: (prev.scripts || []).map((s) => (s.id === activeScript.id ? restored : s))
                                }));
                                showToast(`已恢复至版本 ${ver.versionLabel}`, 'success');
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                            >
                              <RotateCcw className="w-3 h-3" /> 还原至此版本
                            </button>
                          </div>

                          {ver.changeSummary && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              变更说明：{ver.changeSummary}
                            </p>
                          )}

                          {ver.data?.entries && (
                            <div className="text-[10px] text-zinc-400">
                              包含 {ver.data.entries.length} 个子条目: {ver.data.entries.slice(0, 3).map((e: any) => e.name).join(', ')}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => handleExportScript(activeScript)}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                <Download className="w-3.5 h-3.5" /> 导出 .json
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveScript(null)}
                  className="px-4 py-2 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  关闭
                </button>
                <button
                  onClick={() => handleSaveActiveScript()}
                  className="px-4 py-2 text-[10px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Sub-Entry Modal */}
      <BottomSheetModal
        isOpen={showAddSubEntryModal}
        onClose={() => setShowAddSubEntryModal(false)}
        title={selectedSubEntryIndex === null ? "添加脚本子条目" : "编辑脚本子条目"}
        subtitle="向当前脚本集合中添加新的子条目或逻辑单元"
        maxWidth="md"
        footer={
          <>
            <button
              onClick={() => setShowAddSubEntryModal(false)}
              className="px-3 py-1.5 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700"
            >
              取消
            </button>
            <button
              onClick={handleSaveSubEntryForm}
              className="px-3 py-1.5 text-[10px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {selectedSubEntryIndex === null ? '确认添加' : '保存条目'}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-[10px]">
          <div>
            <label className="block font-semibold mb-1">条目名称</label>
            <input
              type="text"
              value={subEntryForm.name}
              onChange={(e: any) => setSubEntryForm({ ...subEntryForm, name: e.target.value })}
              placeholder="例如：自动欢迎词 / 动作判断器"
              className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">描述说明</label>
            <input
              type="text"
              value={subEntryForm.description || ''}
              onChange={(e: any) => setSubEntryForm({ ...subEntryForm, description: e.target.value })}
              placeholder="简要说明此条目的功能…"
              className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">脚本内容 / 代码</label>
            <textarea
              rows={5}
              value={subEntryForm.content || ''}
              onChange={(e: any) => setSubEntryForm({ ...subEntryForm, content: e.target.value })}
              placeholder="输入代码或逻辑…"
              className="w-full p-2.5 font-mono text-[10px] rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-900 text-zinc-100"
            />
          </div>
        </div>
      </BottomSheetModal>

      {/* Add New Script Modal (Bottom Sheet with solid background) */}
      <BottomSheetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-500" />
            新建 ST 脚本
          </span>
        }
        subtitle="手动创建或粘贴 JSON 内容配置脚本"
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-[10px] font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreateManualScript}
              className="px-4 py-2 text-[10px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              确认创建
            </button>
          </>
        }
      >
        <div className="space-y-4 text-[10px]">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              脚本名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="例如：自动问候脚本 / Quick Reply 指令集"
              value={newScriptForm.name}
              onChange={(e: any) => setNewScriptForm({ ...newScriptForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">作者</label>
            <input
              type="text"
              placeholder="作者名字"
              value={newScriptForm.author}
              onChange={(e: any) => setNewScriptForm({ ...newScriptForm, author: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">描述说明</label>
            <textarea
              rows={2}
              placeholder="简要说明此脚本用途…"
              value={newScriptForm.description}
              onChange={(e: any) => setNewScriptForm({ ...newScriptForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              脚本 JSON 内容
            </label>
            <textarea
              rows={6}
              value={newScriptForm.rawContent}
              onChange={(e: any) => setNewScriptForm({ ...newScriptForm, rawContent: e.target.value })}
              className="w-full p-3 font-mono text-[10px] rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-900 text-zinc-100 dark:bg-zinc-950 resize-none"
            />
          </div>
        </div>
      </BottomSheetModal>

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        onConfirm={(name) => handleAddCategory(name)}
        title="新建脚本分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* Batch Move Modal */}
      <BottomSheetModal
        isOpen={showBatchMoveModal}
        onClose={() => setShowBatchMoveModal(false)}
        title={
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
            移动选中的 {selectedIds.length} 个脚本
          </span>
        }
        maxWidth="sm"
        footer={
          <>
            <button
              onClick={() => setShowBatchMoveModal(false)}
              className="px-3 py-2 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5"
            >
              取消
            </button>
            <button
              disabled={!batchTargetCategory}
              onClick={handleBatchMove}
              className="px-4 py-2 text-[10px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              确认移动
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
            选择目标分组
          </label>
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
                  availableTags={appData.scriptTags || []}
                  selectedCount={selectedIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.scripts || [];
                      const newList = list.map((item: any) => {
                        if (selectedIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.scriptTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, scripts: newList, scriptTags: updatedGlobalTags };
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

