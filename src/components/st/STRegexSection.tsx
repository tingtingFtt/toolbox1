import { ManagementSearch, ManagementHeader, ManagementToolbarFrame, ManagementBatchBar, ManagementGrid, ManagementBatchOverlay } from '../ui/ManagementChrome';
import { ActionButton } from '../ui/ActionButton';
import { DetailPanel, DetailHeader, DetailTabs, detailFooterClass, detailIconButtonClass } from '../ui/DetailChrome';
import { NewGroupModal, BottomSheetModal, UnifiedModal, DeleteConfirmationModal } from '../ui/UnifiedModal';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import {
  Code2,
  Sparkles, Plus, Search, Trash2, Edit3, FolderPlus, ArrowRightLeft,
  Download, Upload, Copy, Check, SlidersHorizontal, ArrowUpDown, X,
  ExternalLink, Play, CheckSquare, Square, RefreshCw, Layers, ArrowLeft,
  ChevronRight, History, CheckCircle2, RotateCcw
, Tag } from 'lucide-react';
import { AppData, STRegexEntry, STRegexRule } from '../../types';
import { normalizeStRegexRules, syncStRegexBackToCards, normalizeResourceName, triggerFileDownload } from '../../utils';
import { compareRegexScripts } from '../../utils/diffEngine';
import { sessionStore } from '../../utils/sessionStore';
import { cleanPresetResource, bindPresetResourceItems, presetResourceId, resourceSource } from '../../utils/presetResources';
import { ResourceSourceControls, ResourceSourceBadge, ResourceSourceFilter } from './ResourceSourceControls';

interface STRegexSectionProps {
  appData: AppData;
  updateAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  sortItemList: <T>(items: T[], sortOrder: any, getName: (item: T) => string, getCreatedAt?: (item: T) => number) => T[];
  onOpenCardDetail?: (cardId: string) => void;
  onOpenPresetDetail?: (presetId: string) => void;
  jumpTargetId?: string | null;
  onClearJumpTarget?: () => void;
}

export const STRegexSection = React.memo<STRegexSectionProps>(({
  appData,
  updateAppData,
  showToast,
  sortItemList,
  onOpenCardDetail,
  onOpenPresetDetail,
  jumpTargetId,
  onClearJumpTarget,
}) => {
  const [searchQuery, setSearchQuery] = useState(() => sessionStore.stRegex.searchQuery);
  const [sourceFilter, setSourceFilter] = useState<ResourceSourceFilter>('all');
  const [tagFilter, setTagFilter] = useState<string[]>(() => sessionStore.stRegex.tagFilter);
  const [categoryFilter, setCategoryFilter] = useState(() => sessionStore.stRegex.categoryFilter);
  const [sortOrder, setSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>(() => sessionStore.stRegex.sortOrder);

  useEffect(() => {
    sessionStore.stRegex.searchQuery = searchQuery;
  }, [searchQuery]);
  useEffect(() => {
    sessionStore.stRegex.tagFilter = tagFilter;
  }, [tagFilter]);
  useEffect(() => {
    sessionStore.stRegex.categoryFilter = categoryFilter;
  }, [categoryFilter]);
  useEffect(() => {
    sessionStore.stRegex.sortOrder = sortOrder;
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

  // Detail / Inspector Modal
  const [activeRegex, setActiveRegex] = useState<STRegexEntry | null>(null);
  const [selectedSubRuleIndex, setSelectedSubRuleIndex] = useState<number | null>(null);

  useEffect(() => {
    if (jumpTargetId && appData.stRegexScripts) {
      const target = appData.stRegexScripts.find(r => r.id === jumpTargetId || r.sourceResources?.some(resource => presetResourceId(r.sourcePresetId!, 'regex', resource.key) === jumpTargetId));
      const childIndex = target?.sourceResources?.findIndex(resource => presetResourceId(target.sourcePresetId!, 'regex', resource.key) === jumpTargetId) ?? -1;
      if (target) {
        setActiveRegex(target);
        setRawJsonDraft(JSON.stringify(target.jsonData || target.rules || [], null, 2));
        setSelectedSubRuleIndex(null);
        setDetailTab('rules');
        setSourceFilter(resourceSource(target));
        setCategoryFilter('全部分组');
        setTagFilter([]);
        setSearchQuery('');
        setSelectedSubRuleIndex(childIndex >= 0 ? childIndex : null);
        if (onClearJumpTarget) onClearJumpTarget();
      }
    }
  }, [jumpTargetId, appData.stRegexScripts, onClearJumpTarget]);

  useEffect(() => {
    if (!activeRegex?.sourcePresetId) return;
    const fresh = appData.stRegexScripts?.find(item => item.id === activeRegex.id);
    setActiveRegex(fresh || null);
    if (fresh) setRawJsonDraft(JSON.stringify(fresh.jsonData, null, 2));
  }, [appData.stRegexScripts]);

  const [detailTab, setDetailTab] = useState<'info' | 'rules' | 'tester' | 'json' | 'versions'>('info');
  const [testInputText, setTestInputText] = useState('【系统提示】这里是一段用于测试酒馆正则替换的示例文本。<thought>这是思考内容</thought>');
  const [subRuleTestInput, setSubRuleTestInput] = useState('');
  const [rawJsonDraft, setRawJsonDraft] = useState('');

  // Add / Edit Rule Modal
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState<STRegexRule>({
    scriptName: '',
    findRegex: '',
    replaceString: '',
    disabled: false,
    trimStrings: [],
  });

  // Add / Group / Move Modals
  const [showAddRegexModal, setShowAddRegexModal] = useState(false);
  const [newRegexForm, setNewRegexForm] = useState({
    scriptName: '',
    author: '',
    description: '',
    findRegex: '',
    replaceString: '',
  });

  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchTargetCategory, setBatchTargetCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawRegexList = appData.stRegexScripts || [];
  const activeVersionCount = activeRegex?.sourcePresetId
    ? (appData.presets?.find(preset => preset.id === activeRegex.sourcePresetId)?.versions?.length || 0) + 1
    : (activeRegex?.versions?.length || 0) + 1;
  const categories = Array.from(
    new Set(['默认', ...(appData.stRegexCategories || []), ...rawRegexList.map((p: any) => p.category || '默认')])
  );

  const customTags = appData.stRegexTags || [];
  const builtInTags: string[] = [];
  const filtered = useMemo(() => {
    return rawRegexList.filter((item: any) => {
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
        item.scriptName.toLowerCase().includes(q) ||
        (item.author && item.author.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.sourceCardName && item.sourceCardName.toLowerCase().includes(q)) ||
        ((item as any).sourcePresetName && (item as any).sourcePresetName.toLowerCase().includes(q)) ||
        (item.findRegex && item.findRegex.toLowerCase().includes(q)) ||
        (item.replaceString && item.replaceString.toLowerCase().includes(q)) ||
        (item.rules && item.rules.some((r: any) => r.findRegex.toLowerCase().includes(q) || r.scriptName?.toLowerCase().includes(q)))
      );
    });
  }, [rawRegexList, categoryFilter, tagFilter, searchQuery, sourceFilter]);

  const sorted = useMemo(() => {
    return sortItemList(
      filtered,
      sortOrder,
      (item: any) => item.scriptName || '',
      (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
    );
  }, [filtered, sortOrder, sortItemList]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let curRegexes = [...(appData.stRegexScripts || [])];
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

        const rules = normalizeStRegexRules(json);
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const scriptName = (
          json.scriptName || json.script_name || json.name || json.title || cleanName || '未命名正则'
        ).trim();
        const author = (json.author || json.creator || '').trim();
        const description = (json.description || json.summary || '').trim();

        const firstRule = rules[0] || { findRegex: '', replaceString: '' };

        const newEntry: STRegexEntry = {
          id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + i,
          scriptName,
          fileName: file.name,
          author,
          category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
          description,
          findRegex: firstRule.findRegex,
          replaceString: firstRule.replaceString,
          disabled: false,
          rules,
          jsonData: json,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const normName = normalizeResourceName(scriptName);
        const existingSameName = curRegexes.filter(r => {
          if (r.sourcePresetId || r.sourceCardId) return false;
          if ((r.scriptName || '').trim().toLowerCase() === scriptName.toLowerCase()) return true;
          const normExt = normalizeResourceName(r.scriptName);
          if (normExt && normName && (normExt === normName || normExt.includes(normName) || normName.includes(normExt))) return true;
          return false;
        });

        if (existingSameName.length === 0) {
          curRegexes.push(newEntry);
          addedCount++;
        } else {
          let matchedRegex: STRegexEntry | null = null;
          let bestDiff: any = { status: 'completely_different', similarity: 0, summary: '' };

          for (const extRegex of existingSameName) {
            const diff = compareRegexScripts(rules, json, firstRule.findRegex, firstRule.replaceString, extRegex);
            if (diff.status === 'identical') {
              matchedRegex = extRegex;
              bestDiff = diff;
              break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedRegex = extRegex;
              bestDiff = diff;
            }
          }

          if (bestDiff.status === 'identical' && matchedRegex) {
            skippedCount++;
          } else if (bestDiff.status === 'partially_different' && matchedRegex) {
            const updatedRegex: STRegexEntry = {
              ...matchedRegex,
              rules,
              jsonData: json,
              fileName: file.name,
              findRegex: firstRule.findRegex,
              replaceString: firstRule.replaceString,
              updatedAt: Date.now(),
              customTags: Array.from(new Set([...(matchedRegex.customTags || []), '已更新'])),
              versions: matchedRegex.versions || []
            };

            const idx = curRegexes.findIndex(r => r.id === matchedRegex!.id);
            if (idx > -1) curRegexes[idx] = updatedRegex;
            versionCount++;
          } else {
            // Completely different regex script
            newEntry.customTags = Array.from(new Set([...(newEntry.customTags || []), '同名变体']));
            curRegexes.push(newEntry);
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
        stRegexScripts: curRegexes,
      }));
      const parts: string[] = [];
      if (addedCount > 0) parts.push(`新增 ${addedCount} 个`);
      if (versionCount > 0) parts.push(`版本更新 ${versionCount} 个`);
      if (distinctCount > 0) parts.push(`同名独立变体 ${distinctCount} 个`);
      if (skippedCount > 0) parts.push(`跳过完全重复 ${skippedCount} 个`);
      showToast(`正则脚本导入完成：${parts.join('，')}`, 'success');
    } else if (skippedCount > 0) {
      showToast(`已跳过 ${skippedCount} 个内容完全一致的重复正则脚本`, 'info');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateManualRegex = () => {
    if (!newRegexForm.scriptName.trim()) {
      showToast('请填写正则名称', 'error');
      return;
    }
    const rule: STRegexRule = {
      scriptName: newRegexForm.scriptName.trim(),
      findRegex: newRegexForm.findRegex,
      replaceString: newRegexForm.replaceString,
      disabled: false,
    };

    const newEntry: STRegexEntry = {
      id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      scriptName: newRegexForm.scriptName.trim(),
      author: newRegexForm.author.trim(),
      description: newRegexForm.description.trim(),
      category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
      findRegex: newRegexForm.findRegex,
      replaceString: newRegexForm.replaceString,
      disabled: false,
      rules: [rule],
      jsonData: [rule],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    updateAppData((prev) => ({
      ...prev,
      stRegexScripts: [...(prev.stRegexScripts || []), newEntry],
    }));

    setNewRegexForm({ scriptName: '', author: '', description: '', findRegex: '', replaceString: '' });
    setShowAddRegexModal(false);
    showToast('ST 正则脚本创建成功！', 'success');
  };

  const handleOpenDetail = (rx: STRegexEntry) => {
    setActiveRegex(rx);
    setSelectedSubRuleIndex(null);
    setDetailTab('info');
    setRawJsonDraft(JSON.stringify(rx.jsonData || rx.rules || [rx], null, 2));
  };

  const handleSaveActiveRegex = (updatedRx: STRegexEntry) => {
    if (updatedRx.sourceResources) {
      updatedRx = { ...updatedRx, jsonData: (updatedRx.rules || []).map(cleanPresetResource) };
    }
    updateAppData((prev) => {
      let updatedCards = prev.cards || [];
      if (updatedRx.sourceCardId) {
        updatedCards = syncStRegexBackToCards(updatedRx, updatedCards);
      }


      return {
        ...prev,
        cards: updatedCards,
        stRegexScripts: (prev.stRegexScripts || []).map((r: any) => (r.id === updatedRx.id ? updatedRx : r)),
      };
    });
    setActiveRegex(updatedRx.sourcePresetId && updatedRx.rules?.length === 0 ? null : updatedRx);
    setRawJsonDraft(JSON.stringify(updatedRx.jsonData || {}, null, 2));
    showToast(
      updatedRx.sourceCardId
        ? '正则已保存并同步回对应角色卡！'
        : (updatedRx as any).sourcePresetId
          ? '正则已保存并同步回对应预设！'
          : '正则已保存！',
      'success'
    );
  };

  const handleRestoreVersion = (ver: any) => {
    if (!activeRegex) return;
    requestDelete(`确定要将当前正则还原到版本「${ver.versionLabel || `v${ver.versionNumber}`}」吗？当前未保存内容将作为新版本存入历史记录。`, 1, () => {
      const currentSnapshot = {
        versionId: 'ver_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        versionNumber: (activeRegex.versions?.length || 0) + 1,
        versionLabel: activeRegex.activeVersionLabel || `v${activeVersionCount}`,
        updatedAt: Date.now(),
        changeSummary: '还原版本前自动保存当前快照',
        data: {
          scriptName: activeRegex.scriptName,
          rules: activeRegex.rules ? JSON.parse(JSON.stringify(activeRegex.rules)) : [],
          findRegex: activeRegex.findRegex,
          replaceString: activeRegex.replaceString,
          jsonData: activeRegex.jsonData,
          description: activeRegex.description,
        }
      };

      const restoredData = ver.data || {};
      const updated: STRegexEntry = {
        ...activeRegex,
        scriptName: restoredData.scriptName || activeRegex.scriptName,
        rules: restoredData.rules || activeRegex.rules,
        findRegex: restoredData.findRegex || activeRegex.findRegex,
        replaceString: restoredData.replaceString || activeRegex.replaceString,
        jsonData: restoredData.jsonData || activeRegex.jsonData,
        description: restoredData.description !== undefined ? restoredData.description : activeRegex.description,
        activeVersionLabel: ver.versionLabel || `v${ver.versionNumber}`,
        activeVersionNumber: ver.versionNumber,
        activeVersionId: ver.versionId,
        currentVersionSummary: `已还原至 ${ver.versionLabel || `v${ver.versionNumber}`}`,
        updatedAt: Date.now(),
        versions: [currentSnapshot, ...(activeRegex.versions || []).filter((v: any) => v.versionId !== ver.versionId)],
      };

      handleSaveActiveRegex(updated);
      setSelectedSubRuleIndex(null);
      showToast(`已成功恢复至历史版本 ${ver.versionLabel || `v${ver.versionNumber}`}`, 'success');
    });
  };

  const runSubRuleTest = (rule: STRegexRule, input: string) => {
    if (!rule || !rule.findRegex || !input) return input;
    try {
      let pattern = rule.findRegex;
      let flags = 'g';
      if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
        const lastSlash = pattern.lastIndexOf('/');
        flags = pattern.substring(lastSlash + 1) || 'g';
        pattern = pattern.substring(1, lastSlash);
      }
      const re = new RegExp(pattern, flags);
      return input.replace(re, rule.replaceString || '');
    } catch (err: any) {
      return `[正则错误] ${err.message}`;
    }
  };

  const handleExportRegex = (rx: STRegexEntry) => {
    const payload = rx.jsonData || rx.rules || [{
      scriptName: rx.scriptName,
      findRegex: rx.findRegex,
      replaceString: rx.replaceString,
      disabled: rx.disabled,
    }];
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerFileDownload(blob, `${rx.scriptName || 'ST正则'}.json`);
    showToast('已导出正则 JSON 文件', 'success');
  };

  const handleDeleteRegex = (id: string) => {
    requestDelete('确定要删除此正则脚本吗？', 1, () => {
      updateAppData((prev) => ({
        ...prev,
        stRegexScripts: (prev.stRegexScripts || []).filter((r: any) => r.id !== id),
      }));
      if (activeRegex?.id === id) setActiveRegex(null);
      showToast('正则脚本已删除', 'info');
    });
  };

  const handleBatchDelete = () => {
    if (!selectedIds.length) return;
    requestDelete(`确定要删除选中的 ${selectedIds.length} 个正则脚本吗？`, selectedIds.length, () => {
      updateAppData((prev) => ({
        ...prev,
        stRegexScripts: (prev.stRegexScripts || []).filter((r: any) => !selectedIds.includes(r.id)),
      }));
      setSelectedIds([]);
      setBatchMode(false);
      showToast(`已批量删除 ${selectedIds.length} 个正则脚本`, 'info');
    });
  };

  const handleBatchMove = () => {
    if (!selectedIds.length || !batchTargetCategory) return;
    updateAppData((prev) => ({
      ...prev,
      stRegexScripts: (prev.stRegexScripts || []).map((r: any) => (selectedIds.includes(r.id) ? { ...r, category: batchTargetCategory } : r)),
    }));
    setSelectedIds([]);
    setShowBatchMoveModal(false);
    setBatchMode(false);
    showToast(`已将 ${selectedIds.length} 个正则脚本移动到「${batchTargetCategory}」`, 'success');
  };

  const handleAddCategory = (customName?: string) => {
    const trimmed = (customName !== undefined ? customName : newGroupName).trim();
    if (!trimmed) {
      showToast('分组名称不能为空', 'error');
      return;
    }
    const curCats = appData.stRegexCategories || ['默认'];
    if (curCats.includes(trimmed)) {
      showToast('该分组已存在', 'error');
      return;
    }
    updateAppData((prev) => ({
      ...prev,
      stRegexCategories: [...curCats, trimmed],
    }));
    setCategoryFilter(trimmed);
    setNewGroupName('');
    setShowNewGroupModal(false);
    showToast(`成功新建分组: ${trimmed}`, 'success');
  };

  // Rule operations in activeRegex
  const handleToggleRule = (idx: number) => {
    if (!activeRegex) return;
    const rules = [...(activeRegex.rules || [])];
    rules[idx] = { ...rules[idx], disabled: !rules[idx].disabled };
    const updated: STRegexEntry = { ...activeRegex, rules, updatedAt: Date.now() };
    handleSaveActiveRegex(updated);
  };

  const handleDeleteRule = (idx: number) => {
    if (!activeRegex) return;
    requestDelete('确定要删除此条正则规则吗？', 1, () => {
      const rules = (activeRegex.rules || []).filter((_, i) => i !== idx);
      const updated: STRegexEntry = { ...activeRegex, rules, updatedAt: Date.now() };
      handleSaveActiveRegex(updated);
      if (selectedSubRuleIndex === idx) {
        setSelectedSubRuleIndex(null);
      } else if (selectedSubRuleIndex !== null && selectedSubRuleIndex > idx) {
        setSelectedSubRuleIndex(selectedSubRuleIndex - 1);
      }
      showToast('正则规则已删除', 'info');
    });
  };

  const handleSaveRuleForm = () => {
    if (!activeRegex) return;
    if (!ruleForm.findRegex.trim()) {
      showToast('查找正则不能为空', 'error');
      return;
    }
    const rules = [...(activeRegex.rules || [])];
    if (editingRuleIndex !== null) {
      rules[editingRuleIndex] = ruleForm;
    } else {
      rules.push(ruleForm);
    }
    const first = rules[0] || { findRegex: '', replaceString: '' };
    const updated: STRegexEntry = {
      ...activeRegex,
      rules,
      findRegex: first.findRegex,
      replaceString: first.replaceString,
      updatedAt: Date.now(),
    };
    handleSaveActiveRegex(updated);
    setShowRuleModal(false);
    setEditingRuleIndex(null);
  };

  const handleApplyRawJson = () => {
    if (!activeRegex) return;
    try {
      const parsed = JSON.parse(rawJsonDraft);
      const rules = activeRegex.sourceResources
        ? bindPresetResourceItems(normalizeStRegexRules(parsed), activeRegex.rules || [])
        : normalizeStRegexRules(parsed);
      const first = rules[0] || { findRegex: '', replaceString: '' };
      const updated: STRegexEntry = {
        ...activeRegex,
        rules,
        findRegex: first.findRegex,
        replaceString: first.replaceString,
        jsonData: parsed,
        updatedAt: Date.now(),
      };
      handleSaveActiveRegex(updated);
      showToast('正则 JSON 数据已更新！', 'success');
    } catch (e: any) {
      showToast(`JSON 解析错误: ${e.message}`, 'error');
    }
  };

  // Live Test Calculation
  const runLiveTest = () => {
    if (!activeRegex || !activeRegex.rules) return testInputText;
    let result = testInputText;
    for (const rule of activeRegex.rules) {
      if (rule.disabled) continue;
      if (!rule.findRegex) continue;
      try {
        let pattern = rule.findRegex;
        let flags = 'g';
        if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
          const lastSlash = pattern.lastIndexOf('/');
          flags = pattern.substring(lastSlash + 1) || 'g';
          pattern = pattern.substring(1, lastSlash);
        }
        const re = new RegExp(pattern, flags);
        result = result.replace(re, rule.replaceString || '');
      } catch (err) {
        // Regex syntax error in test
      }
    }
    return result;
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
                  <ManagementHeader
        icon={<>
            <Sparkles className="w-4 h-4" />
          </>}
        title={<>ST 正则脚本管理</>}
        badge={<>
                格式：.json (ST 正则配置)
              </>}
        description={<>
              管理酒馆正则替换脚本 (Regex Scripts)，支持多规则合并管理、单条详细页面编辑、沙盒测试与版本历史追溯
            </>}
        actions={<>
          <ActionButton onClick={() => fileInputRef.current?.click()} title="导入正则 (.json)" action="import" context="toolbar" tone="primary">
            <Upload className="w-3 h-3" />
            <span>导入正则 (JSON)</span>
          </ActionButton>
          <ActionButton onClick={() => setShowAddRegexModal(true)} action="create" context="toolbar">
            <Plus className="w-3 h-3" />
            新建正则
          </ActionButton>
        </>}
      />

      <ManagementToolbarFrame>
        <ResourceSourceControls items={rawRegexList} value={sourceFilter} onChange={value => { setSourceFilter(value); setCategoryFilter('全部分组'); setTagFilter([]); }} />
        {/* Search Input */}
        <ManagementSearch type="text" placeholder="搜索正则名称、匹配模式、替换词或所属角色…" value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} />

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <CategoryFilterDropdown 
            groups={Array.from(new Set(['默认', ...(appData.stRegexCategories || [])]))}
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
            groups={Array.from(new Set(['默认', ...(appData.stRegexCategories || [])]))}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            getCount={(g) => (appData.stRegexScripts || []).filter((p: any) => (p.category || '默认') === g).length}
            totalCount={appData.stRegexScripts?.length || 0}
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

      {/* Regex Grid */}
      </div>
      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Sparkles className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">暂无 ST 正则</h3>
          <p className="text-[10px] text-zinc-400 mt-1 max-w-sm">
            点击「导入正则」上传酒馆 JSON 正则文件，或在 ST 角色卡中内置正则将自动联动展示
          </p>
        </div>
      ) : (
        <ManagementGrid className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleSorted.map((rx) => {
            const isSelected = selectedIds.includes(rx.id);
            const rulesCount = rx.rules?.length || 1;
            const activeVerLabel = rx.activeVersionLabel || `v${(rx.versions?.length || 0) + 1}`;
            return (
              <div
                key={rx.id}
                onClick={() => {
                  if (batchMode) {
                    setSelectedIds((prev) =>
                      prev.includes(rx.id) ? prev.filter((id) => id !== rx.id) : [...prev, rx.id]
                    );
                  } else {
                    handleOpenDetail(rx);
                  }
                }}
                className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-sm transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-rose-500/50 dark:hover:border-rose-500/50'
                }`}
              >
                <div className="flex flex-col flex-1">
                {/* Line 1: Name, Version */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {batchMode && (
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900'
                          : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  )}
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1" title={rx.scriptName}>
                    {rx.scriptName}
                  </h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
                    {activeVerLabel}
                  </span>
                </div>

                {/* Character Linkage Badge */}
                <ResourceSourceBadge item={rx} onOpenPreset={onOpenPresetDetail} onOpenCard={onOpenCardDetail} />

                {/* Line 2: Tags & Metadata */}
                <div className="flex items-center gap-2 min-w-0 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[60px] flex-shrink-0">
                    {rx.category || '默认'}
                  </span>
                  {rx.customTags && rx.customTags.length > 0 && (
                      <div className="flex-1 min-w-0">
                          <TagEditor 
                              customTags={rx.customTags || []} 
                              onChange={(newTags) => {
                                  updateAppData((prev: any) => ({
                                      ...prev,
                                      stRegexScripts: (prev.stRegexScripts || []).map((t: any) => t.id === rx.id ? { ...t, customTags: newTags } : t)
                                  }));
                              }}
                              availableTags={appData.stRegexTags || []}
                              maxDisplay={1}
                          />
                      </div>
                  )}
                </div>

                {rx.description && (
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-300 line-clamp-2 mt-1 mb-2">
                    {rx.description}
                  </p>
                )}

                  {/* Rule Preview */}
                  <div className="space-y-1 mb-3">
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-[10px] font-mono">
                      <div className="text-rose-600 dark:text-rose-400 truncate">
                        <span className="text-zinc-400 select-none">找: </span>
                        {rx.findRegex || rx.rules?.[0]?.findRegex || '(空)'}
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                        <span className="text-zinc-400 select-none">换: </span>
                        {rx.replaceString || rx.rules?.[0]?.replaceString || '(留空)'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                      {rulesCount} 条替换规则
                    </span>
                    {(rx.versions?.length || 0) > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 text-[10px] font-medium">
                        {(rx.versions?.length || 0) + 1} 个历史版本
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px]">
                  <span className="text-[10px] text-zinc-400">
                    {new Date(rx.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  {!batchMode && (
                    <div className="flex items-center gap-1" onClick={(e: any) => e.stopPropagation()}>
                      {rx.sourceCardId && onOpenCardDetail && (
                        <button
                          onClick={() => onOpenCardDetail(rx.sourceCardId!)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="跳转查看角色卡"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleExportRegex(rx)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="导出 JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRegex(rx.id)}
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

      {/* Detail / Inspector Modal */}
      {activeRegex && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveRegex(null)} role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-transparent transition-opacity"
            aria-label="关闭遮罩"
          />
          <DetailPanel onClick={(e) => e.stopPropagation()} className="st-regex-detail">
            
            <DetailHeader
              designPrefix="regex-detail" title={activeRegex.scriptName}
              version={activeRegex.activeVersionLabel || `v${activeVersionCount}`}
              badge={activeRegex.category || '默认'}
              onClose={() => { setActiveRegex(null); setSelectedSubRuleIndex(null); }}
              actions={<button type="button" title="导出正则 JSON" aria-label="导出正则 JSON" className={detailIconButtonClass} onClick={() => handleExportRegex(activeRegex)}><Download className="w-4 h-4" /></button>}
              tags={<TagEditor
                customTags={activeRegex.customTags || []} availableTags={appData.stRegexTags || []} maxDisplay={3}
                onChange={(newTags) => {
                  const updated = { ...activeRegex, customTags: newTags };
                  setActiveRegex(updated);
                  updateAppData((prev) => ({ ...prev,
                    stRegexScripts: (prev.stRegexScripts || []).map(item => item.id === updated.id ? updated : item),
                    stRegexTags: Array.from(new Set([...(prev.stRegexTags || []), ...newTags])),
                  }));
                }}
              />}
            />
            <DetailTabs
              designPrefix="regex-detail" label="正则详情页签" activeTab={detailTab}
              onChange={(next) => { setSelectedSubRuleIndex(null); setDetailTab(next); }}
              tabs={[
                { id: 'info' as const, name: '基本属性' }, { id: 'rules' as const, name: `条目列表 (${(activeRegex.rules || []).length})` },
                { id: 'tester' as const, name: '实时沙盒测试' }, { id: 'json' as const, name: 'JSON 原始数据' },
                { id: 'versions' as const, name: `版本历史 (${activeVersionCount})` },
              ]}
              actions={detailTab === 'rules' && selectedSubRuleIndex === null ? <button type="button" onClick={() => {
                setEditingRuleIndex(null);
                setRuleForm({ scriptName: `规则 #${(activeRegex.rules || []).length + 1}`, findRegex: '', replaceString: '', disabled: false });
                setShowRuleModal(true);
              }} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[var(--accent)] bg-[var(--btn-primary-bg)] whitespace-nowrap cursor-pointer"><Plus className="w-3 h-3" />添加子规则</button> : null}
            />

            {/* Sub-entry Drilldown View: 新起一页具体条目详情 */}
            {selectedSubRuleIndex !== null && activeRegex.rules && activeRegex.rules[selectedSubRuleIndex] ? (
              (() => {
                const curRule = activeRegex.rules[selectedSubRuleIndex];
                const totalRules = activeRegex.rules.length;
                return (
                  <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
                    {/* Sub-Page Top Navigation Bar */}
                    <div className="detail-subnav px-3 sm:px-4 py-2 border-b border-[var(--line)] bg-[var(--modal-bar-bg)] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedSubRuleIndex(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 shadow-xs cursor-pointer transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          返回规则条目列表
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-mono text-[10px]">
                            #{selectedSubRuleIndex + 1}
                          </span>
                          <span className="truncate max-w-md">{curRule.scriptName || '未命名规则'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Prev / Next Rule Navigation */}
                        <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
                          <button
                            disabled={selectedSubRuleIndex <= 0}
                            onClick={() => setSelectedSubRuleIndex(selectedSubRuleIndex - 1)}
                            className="px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="上一条规则"
                          >
                            上一条
                          </button>
                          <span className="px-2 text-[10px] text-zinc-400 font-mono border-x border-zinc-200 dark:border-zinc-700">
                            {selectedSubRuleIndex + 1} / {totalRules}
                          </span>
                          <button
                            disabled={selectedSubRuleIndex >= totalRules - 1}
                            onClick={() => setSelectedSubRuleIndex(selectedSubRuleIndex + 1)}
                            className="px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="下一条规则"
                          >
                            下一条
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleRule(selectedSubRuleIndex)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                            !curRule.disabled
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {!curRule.disabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          {!curRule.disabled ? '规则生效中' : '规则已禁用'}
                        </button>

                        <button
                          onClick={() => handleDeleteRule(selectedSubRuleIndex)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                          删除条目
                        </button>
                      </div>
                    </div>

                    {/* Sub-Rule Detail Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Rule Basic Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            子规则条目名称
                          </label>
                          <input
                            type="text"
                            value={curRule.scriptName || ''}
                            onChange={(e) => {
                              const newRules = [...(activeRegex.rules || [])];
                              newRules[selectedSubRuleIndex] = { ...curRule, scriptName: e.target.value };
                              setActiveRegex({ ...activeRegex, rules: newRules });
                            }}
                            placeholder="例如：去除思考标签、净化特殊标点"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            生效位置 (Placement)
                          </label>
                          <CustomSelect
                            value={(curRule as any).placement?.[0] !== undefined ? (curRule as any).placement[0] : 1}
                            onChange={(val) => {
                              const newRules = [...(activeRegex.rules || [])];
                              newRules[selectedSubRuleIndex] = {
                                ...curRule,
                                placement: [parseInt(val)]
                              } as any;
                              setActiveRegex({ ...activeRegex, rules: newRules });
                            }}
                            options={[
                              { value: 1, label: 'AI 输出 (User Output / Display)' },
                              { value: 2, label: '用户输入 (User Input / Prompt)' },
                              { value: 3, label: '全文 Prompt (World / System)' },
                              { value: 0, label: '全部位置 (Global All)' },
                            ]}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-between"
                          />
                        </div>
                      </div>

                      {/* Pattern & Replace Box */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Find Regex Input */}
                        <div className="space-y-2 flex flex-col">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                              <Code2 className="w-4 h-4" />
                              查找正则表达式 (Find Pattern)
                            </label>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(curRule.findRegex || '');
                                showToast('已复制正则表达式', 'success');
                              }}
                              className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> 复制正则
                            </button>
                          </div>
                          <textarea
                            rows={5}
                            value={curRule.findRegex || ''}
                            onChange={(e) => {
                              const newRules = [...(activeRegex.rules || [])];
                              newRules[selectedSubRuleIndex] = { ...curRule, findRegex: e.target.value };
                              setActiveRegex({ ...activeRegex, rules: newRules });
                            }}
                            placeholder="例如：/<thought>[\s\S]*?<\/thought>/g 或 普通正则"
                            className="w-full p-3 text-xs font-mono rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        {/* Replace String Input */}
                        <div className="space-y-2 flex flex-col">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" />
                              替换目标内容 (Replace String)
                            </label>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(curRule.replaceString || '');
                                showToast('已复制替换内容', 'success');
                              }}
                              className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> 复制内容
                            </button>
                          </div>
                          <textarea
                            rows={5}
                            value={curRule.replaceString || ''}
                            onChange={(e) => {
                              const newRules = [...(activeRegex.rules || [])];
                              newRules[selectedSubRuleIndex] = { ...curRule, replaceString: e.target.value };
                              setActiveRegex({ ...activeRegex, rules: newRules });
                            }}
                            placeholder="留空表示直接删除匹配项，或输入替换模板如 $1"
                            className="w-full p-3 text-xs font-mono rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Single Rule Instant Live Sandbox */}
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Play className="w-3.5 h-3.5 text-rose-500" />
                            单条规则实时沙盒测试
                          </h4>
                          <button
                            onClick={() => setSubRuleTestInput('【测试数据】这是一段待处理文本 <thought>内部思考过程</thought> 结束。')}
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            填入示例内容
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1">输入测试样本：</span>
                            <textarea
                              rows={3}
                              value={subRuleTestInput}
                              onChange={(e) => setSubRuleTestInput(e.target.value)}
                              placeholder="输入待测试文本…"
                              className="w-full p-2.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block mb-1">单条执行结果：</span>
                            <div className="p-2.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-900 text-emerald-300 min-h-[76px] whitespace-pre-wrap">
                              {runSubRuleTest(curRule, subRuleTestInput || '请输入测试样本')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trim Strings Editor */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Trim 过滤移除字符串列表 (Trim Strings)
                        </label>
                        <input
                          type="text"
                          value={(curRule.trimStrings || []).join(', ')}
                          onChange={(e) => {
                            const trims = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            const newRules = [...(activeRegex.rules || [])];
                            newRules[selectedSubRuleIndex] = { ...curRule, trimStrings: trims };
                            setActiveRegex({ ...activeRegex, rules: newRules });
                          }}
                          placeholder="用逗号隔开多个需剥离字符串"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    {/* Sub-Page Footer */}
                    <div data-design-id="regex-detail-footer" className={detailFooterClass}>
                      <button
                        onClick={() => setSelectedSubRuleIndex(null)}
                        className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      >
                        返回条目列表
                      </button>
                      <button
                        onClick={() => handleSaveActiveRegex(activeRegex)}
                        className="px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                      >
                        保存当前条目修改
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                {/* Modal Body */}
                <div className="file-detail-body p-3 sm:p-6 flex-1 overflow-y-auto">
                  <p className="mb-3 text-[10px] text-[var(--dim)]">{(activeRegex.rules || []).length} 个规则 · {activeVersionCount} 个版本</p>
                  <div className="mb-3"><ResourceSourceBadge item={activeRegex} onOpenPreset={onOpenPresetDetail} onOpenCard={onOpenCardDetail} /></div>
                  {/* TAB 1: RULES LIST */}
                  {detailTab === 'rules' && (
                    <div className="space-y-4">
                      {/* Character Link Banner */}
                      {activeRegex.isBuiltIn && activeRegex.sourceCardName && (
                        <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-rose-950 dark:text-rose-200">
                                关联角色卡：{activeRegex.sourceCardName}
                              </span>
                              <p className="text-[11px] text-rose-700/90 dark:text-rose-400">
                                该角色卡导入的所有正则规则已集中合并于本文件页面内，点击任意规则即可新起详情页进行修改。
                              </p>
                            </div>
                          </div>
                          {activeRegex.sourceCardId && onOpenCardDetail && (
                            <button
                              onClick={() => {
                                setActiveRegex(null);
                                onOpenCardDetail(activeRegex.sourceCardId!);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs whitespace-nowrap cursor-pointer"
                            >
                              前往角色卡
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-zinc-500 pb-1">
                        <span>共 {(activeRegex.rules || []).length} 条子规则条目</span>
                        <span className="text-[11px]">点击条目卡片即可新起一页查看/修改完整详情</span>
                      </div>

                      {/* Rule Cards */}
                      <div className="grid grid-cols-1 gap-3">
                        {(activeRegex.rules || []).map((rule, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedSubRuleIndex(idx)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                              !rule.disabled
                                ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-rose-500/60'
                                : 'bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/50 opacity-70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <span className="px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[8.5px] sm:text-[10px] text-zinc-600 dark:text-zinc-400 font-bold">
                                  #{idx + 1}
                                </span>
                                <span className="text-[10.5px] sm:text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                  {rule.scriptName || `规则 #${idx + 1}`}
                                </span>
                                {!rule.disabled ? (
                                  <span className="px-1.5 sm:px-2 py-0.2 sm:py-0.5 text-[8px] sm:text-[9px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    生效中
                                  </span>
                                ) : (
                                  <span className="px-1.5 sm:px-2 py-0.2 sm:py-0.5 text-[8px] sm:text-[9px] font-bold rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                    已禁用
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleToggleRule(idx)}
                                  className="p-1 sm:p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                  title={!rule.disabled ? '禁用此规则' : '启用此规则'}
                                >
                                  {!rule.disabled ? (
                                    <CheckSquare className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-rose-500" />
                                  ) : (
                                    <Square className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-zinc-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setSelectedSubRuleIndex(idx)}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8.5px] sm:text-[11px] font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center gap-0.5 sm:gap-1 cursor-pointer"
                                >
                                  详情 <ChevronRight className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRule(idx)}
                                  className="p-1 sm:p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                  title="删除规则"
                                >
                                  <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 overflow-hidden">
                                <span className="text-[10px] text-zinc-400 block mb-0.5 font-sans">查找正则 (Find):</span>
                                <div className="text-rose-600 dark:text-rose-400 truncate font-semibold">{rule.findRegex || '(空)'}</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 overflow-hidden">
                                <span className="text-[10px] text-zinc-400 block mb-0.5 font-sans">替换内容 (Replace):</span>
                                <div className="text-emerald-600 dark:text-emerald-400 truncate font-semibold">{rule.replaceString || '(留空删除匹配内容)'}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LIVE TESTER */}
                  {detailTab === 'tester' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                          <span>输入测试文本</span>
                          <button
                            onClick={() => setTestInputText('【系统提示】这里是一段用于测试酒馆正则替换的示例文本。<thought>这是思考内容</thought>')}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            重置示例
                          </button>
                        </label>
                        <textarea
                          rows={12}
                          value={testInputText}
                          onChange={(e: any) => setTestInputText(e.target.value)}
                          placeholder="在此粘贴待测试文本…"
                          className="w-full flex-1 p-3 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                          <span>综合替换执行结果</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(runLiveTest());
                              showToast('已复制替换结果', 'success');
                            }}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            复制结果
                          </button>
                        </label>
                        <div className="w-full flex-1 p-3 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-900 text-zinc-100 overflow-y-auto whitespace-pre-wrap">
                          {runLiveTest()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: JSON RAW DATA */}
                  {detailTab === 'json' && (
                    <div className="space-y-3 flex-1 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          SillyTavern 正则 JSON 结构
                        </span>
                        <button
                          onClick={handleApplyRawJson}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                        >
                          应用 JSON 变更
                        </button>
                      </div>
                      <textarea
                        value={rawJsonDraft}
                        onChange={(e: any) => setRawJsonDraft(e.target.value)}
                        className="w-full flex-1 min-h-[400px] p-3 text-xs font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500 whitespace-pre-wrap break-all overflow-y-auto overflow-x-hidden"
                      />
                    </div>
                  )}

                  {/* TAB 4: INFO */}
                  {detailTab === 'info' && (
                    <div className="space-y-4 text-xs max-w-2xl">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          正则脚本名称
                        </label>
                        <input
                          type="text"
                          value={activeRegex.scriptName}
                            readOnly={!!activeRegex.sourcePresetId}
                          onChange={(e: any) => setActiveRegex({ ...activeRegex, scriptName: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">作者</label>
                          <input
                            type="text"
                            value={activeRegex.author || ''}
                            onChange={(e: any) => setActiveRegex({ ...activeRegex, author: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">所属分组</label>
                          <CustomSelect
                            value={activeRegex.category || '默认'}
                            onChange={(val) => setActiveRegex({ ...activeRegex, category: val })}
                            options={categories.map((c) => ({ value: c, label: c }))}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-between"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">描述说明</label>
                        <textarea
                          rows={4}
                          value={activeRegex.description || ''}
                          onChange={(e: any) => setActiveRegex({ ...activeRegex, description: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 5: VERSIONS */}
                  {detailTab === 'versions' && activeRegex.sourcePresetId && (
                    <div className="space-y-3"><p>此集合随所属预设统一记录版本，恢复时同时更新全部内嵌资源。</p><ResourceSourceBadge item={activeRegex} onOpenPreset={onOpenPresetDetail} /></div>
                  )}
                  {detailTab === 'versions' && !activeRegex.sourcePresetId && (
                    <div className="space-y-6">
                      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-amber-500" />
                            正则脚本版本归档时间线
                          </h3>
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-amber-100/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                            共 {activeVersionCount} 个版本
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          重复导入同名角色卡或更新正则脚本时，旧版本将自动封存归档于此。您可以随时还原历史版本。
                        </p>
                      </div>

                      {/* Current Active Version Card */}
                      <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-3">
                        <div className="flex flex-col gap-2">
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              {activeRegex.activeVersionLabel || `v${activeVersionCount}`} (当前正在使用)
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 pl-1">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {activeRegex.scriptName}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                              最近更新: {new Date(activeRegex.updatedAt || activeRegex.createdAt || Date.now()).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {activeRegex.currentVersionSummary && (
                          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                            {activeRegex.currentVersionSummary}
                          </p>
                        )}

                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          包含 {(activeRegex.rules || []).length} 条子规则
                        </div>
                      </div>

                      {/* History Snapshots List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          历史封存版本 (Snapshot History)
                        </h4>

                        {(!activeRegex.versions || activeRegex.versions.length === 0) ? (
                          <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                            <p className="text-xs text-zinc-400">暂无历史封存版本，导入更新卡片时将自动在此归档。</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {activeRegex.versions.map((ver: any, index: number) => {
                              const verLabel = ver.versionLabel || `v${ver.versionNumber || activeRegex.versions!.length - index}`;
                              const snapRules = ver.data?.rules || [];
                              return (
                                <div
                                  key={ver.versionId || index}
                                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                                >
                                  <div className="space-y-1.5 min-w-0">
                                    <div className="flex flex-col items-start gap-1">
                                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300/40">
                                        {verLabel}
                                      </span>
                                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {ver.data?.scriptName || activeRegex.scriptName}
                                      </span>
                                      <span className="text-[10px] text-zinc-400">
                                        封存时间: {new Date(ver.updatedAt || Date.now()).toLocaleString()}
                                      </span>
                                    </div>

                                    {ver.changeSummary && (
                                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                                        {ver.changeSummary}
                                      </p>
                                    )}

                                    <div className="text-[11px] text-zinc-500 font-mono">
                                      共 {snapRules.length} 条子规则
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleRestoreVersion(ver)}
                                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                                    恢复此版本
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div data-design-id="regex-detail-footer" className={`${detailFooterClass} justify-end`}>
                  <button
                    onClick={() => {
                      setActiveRegex(null);
                      setSelectedSubRuleIndex(null);
                    }}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    关闭
                  </button>
                  <button
                    onClick={() => handleSaveActiveRegex(activeRegex)}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                  >
                    保存全部修改
                  </button>
                </div>
              </>
            )}
          </DetailPanel>
        </div>
      )}

      {/* Add / Edit Rule Modal */}
      <BottomSheetModal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            {editingRuleIndex !== null ? '编辑正则子规则' : '添加新正则子规则'}
          </span>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setShowRuleModal(false)}
              className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              onClick={handleSaveRuleForm}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              保存子规则
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">规则名称</label>
            <input
              type="text"
              value={ruleForm.scriptName || ''}
              onChange={(e) => setRuleForm({ ...ruleForm, scriptName: e.target.value })}
              placeholder="例如：去除思考标签"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              查找正则表达式 (Find) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ruleForm.findRegex || ''}
              onChange={(e) => setRuleForm({ ...ruleForm, findRegex: e.target.value })}
              placeholder="例如：/<thought>[\s\S]*?<\/thought>/g"
              className="w-full px-3 py-2 font-mono text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              替换文本 (Replace)
            </label>
            <input
              type="text"
              value={ruleForm.replaceString || ''}
              onChange={(e) => setRuleForm({ ...ruleForm, replaceString: e.target.value })}
              placeholder="留空表示直接删除匹配项"
              className="w-full px-3 py-2 font-mono text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
        </div>
      </BottomSheetModal>

      {/* New Regex Modal */}
      <UnifiedModal
        isOpen={showAddRegexModal}
        onClose={() => setShowAddRegexModal(false)}
        title="新建 ST 正则脚本"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setShowAddRegexModal(false)}
              className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              onClick={handleCreateManualRegex}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              立即创建
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              正则名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newRegexForm.scriptName}
              onChange={(e) => setNewRegexForm({ ...newRegexForm, scriptName: e.target.value })}
              placeholder="例如：思考内容过滤器"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">作者</label>
            <input
              type="text"
              value={newRegexForm.author}
              onChange={(e) => setNewRegexForm({ ...newRegexForm, author: e.target.value })}
              placeholder="作者名称"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">查找正则 (Find)</label>
            <input
              type="text"
              value={newRegexForm.findRegex}
              onChange={(e) => setNewRegexForm({ ...newRegexForm, findRegex: e.target.value })}
              placeholder="例如：/<thought>[\s\S]*?<\/thought>/g"
              className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">替换内容 (Replace)</label>
            <input
              type="text"
              value={newRegexForm.replaceString}
              onChange={(e) => setNewRegexForm({ ...newRegexForm, replaceString: e.target.value })}
              placeholder="留空表示直接删除匹配项"
              className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
        </div>
      </UnifiedModal>

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        onConfirm={(name) => handleAddCategory(name)}
      />

      {/* Batch Move Modal */}
      <UnifiedModal
        isOpen={showBatchMoveModal}
        onClose={() => setShowBatchMoveModal(false)}
        title={`移动 ${selectedIds.length} 项到新分组`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setShowBatchMoveModal(false)}
              className="px-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              onClick={handleBatchMove}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              确定移动
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <label className="block font-bold text-zinc-700 dark:text-zinc-300">目标分组</label>
          <CustomSelect
            value={batchTargetCategory}
            onChange={(val) => setBatchTargetCategory(val)}
            placeholder="请选择分组"
            options={[
              { value: '', label: '请选择分组' },
              ...categories.map((c) => ({ value: c, label: c }))
            ]}
            className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-between"
          />
        </div>
      </UnifiedModal>

      {/* Add / Edit Single Rule Modal (Bottom Sheet) */}
      <BottomSheetModal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-500" />
            {editingRuleIndex !== null ? '编辑正则规则' : '添加正则规则'}
          </span>
        }
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowRuleModal(false)}
              className="px-4 py-2 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveRuleForm}
              className="px-4 py-2 text-[10px] font-semibold rounded bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs"
            >
              保存规则
            </button>
          </>
        }
      >
        <div className="space-y-4 text-[10px]">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              匹配正则表达式 (Regex String) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="例如：/“([^”]+)”/g 或 \*([^*]+)\*"
              value={ruleForm.findRegex}
              onChange={(e: any) => setRuleForm({ ...ruleForm, findRegex: e.target.value })}
              className="w-full px-3 py-2 font-mono rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              替换为 (Replace String)
            </label>
            <input
              type="text"
              placeholder="例如：「」 或 <em></em>"
              value={ruleForm.replaceString}
              onChange={(e: any) => setRuleForm({ ...ruleForm, replaceString: e.target.value })}
              className="w-full px-3 py-2 font-mono rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">规则名称 / 备注</label>
            <input
              type="text"
              placeholder="例如：将直角引号替换为弯引号"
              value={ruleForm.scriptName}
              onChange={(e: any) => setRuleForm({ ...ruleForm, scriptName: e.target.value })}
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>
      </BottomSheetModal>

      <BatchTagModal
        isOpen={showBatchTagModal}
        onClose={() => setShowBatchTagModal(false)}
        availableTags={appData.stRegexTags || []}
        selectedCount={selectedIds.length}
        onApply={(tagsToAdd) => {
          updateAppData((prev: any) => {
            const list = prev.stRegexScripts || [];
            const newList = list.map((item: any) => {
              if (selectedIds.includes(item.id)) {
                const existingTags = item.customTags || [];
                const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                return { ...item, customTags: newTags };
              }
              return item;
            });
            
            const globalTags = prev.stRegexTags || [];
            const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
            
            return { ...prev, stRegexScripts: newList, stRegexTags: updatedGlobalTags };
          });
          setShowBatchTagModal(false);
          setSelectedIds([]);
          showToast(`成功为 ${selectedIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmConfig.isOpen}
        onClose={() => setDeleteConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmConfig.onConfirm}
        message={deleteConfirmConfig.message}
        itemCount={deleteConfirmConfig.itemCount}
      />
    </div>
  );
}, (prev, next) => {
  return prev.appData === next.appData &&
         prev.jumpTargetId === next.jumpTargetId;
});



