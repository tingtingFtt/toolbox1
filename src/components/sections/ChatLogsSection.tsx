import { ManagementSearch, ManagementHeader, ManagementToolbarFrame, ManagementBatchBar, ManagementGrid, ManagementBatchOverlay } from '../ui/ManagementChrome';
import { DetailTabBar, DetailTabButton, DetailPanel, DetailHeader, DetailBody, DetailFooter } from '../ui/DetailChrome';
import { ActionButton } from '../ui/ActionButton';
import { NewGroupModal, BottomSheetModal, UnifiedModal, DeleteConfirmationModal } from '../ui/UnifiedModal';
import React, { useState, useRef } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { BaseInput } from '../ui/BaseInput';
import { BaseButton } from '../ui/BaseButton';
import { BaseCard } from '../ui/BaseCard';
import { CheckSquare, 
  MessageSquare, Plus, Search, Trash2, Edit3, FolderPlus, ArrowRightLeft,
  Download, Upload, Copy, Check, SlidersHorizontal, ArrowUpDown, X,
  ExternalLink, Sparkles, User, Bot, Clock, Hash
} from 'lucide-react';
import { AppData, ChatLogEntry, ChatMessage } from '../../types';
import { estimateTokens, triggerFileDownload } from '../../utils';
import { sessionStore } from '../../utils/sessionStore';

interface ChatLogsSectionProps {
  appData: AppData;
  updateAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  sortItemList: <T>(items: T[], sortOrder: any, getName: (item: T) => string, getCreatedAt?: (item: T) => number) => T[];
  onOpenCardDetail?: (cardId: string) => void;
}

export const ChatLogsSection = React.memo<ChatLogsSectionProps>(({
  appData,
  updateAppData,
  showToast,
  sortItemList,
  onOpenCardDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState(() => sessionStore.chatLogs.searchQuery);
  const [tagFilter, setTagFilter] = useState<string[]>(() => sessionStore.chatLogs.tagFilter);
  const [categoryFilter, setCategoryFilter] = useState(() => sessionStore.chatLogs.categoryFilter);
  const [sortOrder, setSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>(() => sessionStore.chatLogs.sortOrder);

  React.useEffect(() => {
    sessionStore.chatLogs.searchQuery = searchQuery;
  }, [searchQuery]);
  React.useEffect(() => {
    sessionStore.chatLogs.tagFilter = tagFilter;
  }, [tagFilter]);
  React.useEffect(() => {
    sessionStore.chatLogs.categoryFilter = categoryFilter;
  }, [categoryFilter]);
  React.useEffect(() => {
    sessionStore.chatLogs.sortOrder = sortOrder;
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

  // Detail / Reader Modal
  const [activeLog, setActiveLog] = useState<ChatLogEntry | null>(() => {
    if (sessionStore.chatLogs.activeLogId && appData.chatLogs) {
      return appData.chatLogs.find(l => l.id === sessionStore.chatLogs.activeLogId) || null;
    }
    return null;
  });

  React.useEffect(() => {
    sessionStore.chatLogs.activeLogId = activeLog ? activeLog.id : null;
  }, [activeLog]);

  const [readerTab, setReaderTab] = useState<'info' | 'viewer' | 'json'>(() => sessionStore.chatLogs.readerTab);

  React.useEffect(() => {
    sessionStore.chatLogs.readerTab = readerTab;
  }, [readerTab]);
  const [rawJsonDraft, setRawJsonDraft] = useState('');

  // Add / Group / Move Modals
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [newLogForm, setNewLogForm] = useState({
    title: '',
    characterName: '',
    userName: 'User',
    summary: '',
    rawContent: '[\n  {\n    "name": "User",\n    "is_user": true,\n    "mes": "你好！",\n    "send_date": "2025-01-01 12:00:00"\n  },\n  {\n    "name": "Assistant",\n    "is_user": false,\n    "mes": "你好！有什么我可以帮你的？",\n    "send_date": "2025-01-01 12:00:05"\n  }\n]',
  });

  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchTargetCategory, setBatchTargetCategory] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawLogs = appData.chatLogs || [];
  const categories = Array.from(
    new Set(['默认', ...(appData.chatLogCategories || []), ...rawLogs.map((p: any) => p.category || '默认')])
  );

  
  const customTags = appData.chatLogTags || [];
  const builtInTags: string[] = [];
  const filtered = rawLogs.filter((item: any) => {
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
      item.title.toLowerCase().includes(q) ||
      (item.characterName && item.characterName.toLowerCase().includes(q)) ||
      (item.userName && item.userName.toLowerCase().includes(q)) ||
      (item.summary && item.summary.toLowerCase().includes(q)) ||
      (item.messages && item.messages.some((m: any) => (m.mes || m.content || '').toLowerCase().includes(q)))
    );
  });

  const sorted = sortItemList(
    filtered,
    sortOrder,
    (item: any) => item.title || '',
    (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
  );

  // Parse JSON or JSONL chat file
  const parseChatFile = (text: string, fileName: string): { title: string; characterName: string; userName: string; messages: ChatMessage[]; rawData: any } => {
    let messages: ChatMessage[] = [];
    let characterName = '';
    let userName = 'User';
    let rawData: any = null;

    // Try parsing as standard JSON
    try {
      const parsed = JSON.parse(text);
      rawData = parsed;
      if (Array.isArray(parsed)) {
        // SillyTavern chat array format
        messages = parsed.map((m: any) => ({
          name: m.name || (m.is_user ? 'User' : 'Assistant'),
          is_user: !!m.is_user,
          is_system: !!m.is_system,
          send_date: m.send_date || m.timestamp || '',
          mes: m.mes || m.content || m.text || '',
          extra: m.extra,
          swipes: m.swipes,
        }));
        const charMsg = messages.find((m: any) => !m.is_user && !m.is_system && m.name);
        if (charMsg && charMsg.name) characterName = charMsg.name;
        const userMsg = messages.find((m: any) => m.is_user && m.name);
        if (userMsg && userMsg.name) userName = userMsg.name;
      } else if (parsed.messages && Array.isArray(parsed.messages)) {
        messages = parsed.messages;
        characterName = parsed.character_name || parsed.characterName || '';
        userName = parsed.user_name || parsed.userName || 'User';
      }
    } catch {
      // Try parsing JSONL (line by line JSON, SillyTavern chat log format)
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const parsedMsgs: ChatMessage[] = [];
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.character_name && !characterName) characterName = item.character_name;
          if (item.user_name && !userName) userName = item.user_name;
          parsedMsgs.push({
            name: item.name || (item.is_user ? 'User' : characterName || 'Assistant'),
            is_user: !!item.is_user,
            is_system: !!item.is_system,
            send_date: item.send_date || item.timestamp || '',
            mes: item.mes || item.content || item.text || '',
            extra: item.extra,
            swipes: item.swipes,
          });
        } catch {
          // ignore non-json line
        }
      }
      if (parsedMsgs.length > 0) {
        messages = parsedMsgs;
        rawData = parsedMsgs;
      }
    }

    const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
    const title = cleanTitle || (characterName ? `与 ${characterName} 的对话` : '未命名聊天记录');

    return { title, characterName, userName, messages, rawData: rawData || messages };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newEntries: ChatLogEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const { title, characterName, userName, messages, rawData } = parseChatFile(text, file.name);

        const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.mes || m.content || ''), 0);

        newEntries.push({
          id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + i,
          title,
          fileName: file.name,
          characterName,
          userName,
          category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
          messageCount: messages.length,
          totalTokens,
          messages,
          jsonData: rawData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } catch (err: any) {
        showToast(`读取聊天文件 "${file.name}" 失败: ${err.message}`, 'error');
      }
    }

    if (newEntries.length > 0) {
      updateAppData((prev) => ({
        ...prev,
        chatLogs: [...(prev.chatLogs || []), ...newEntries],
      }));
      showToast(`成功导入 ${newEntries.length} 份聊天记录 (JSON)`, 'success');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateManualLog = () => {
    if (!newLogForm.title.trim()) {
      showToast('请填写聊天记录标题', 'error');
      return;
    }
    const { messages, rawData } = parseChatFile(newLogForm.rawContent, newLogForm.title);
    const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.mes || m.content || ''), 0);

    const newEntry: ChatLogEntry = {
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: newLogForm.title.trim(),
      characterName: newLogForm.characterName.trim(),
      userName: newLogForm.userName.trim() || 'User',
      summary: newLogForm.summary.trim(),
      category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
      messageCount: messages.length,
      totalTokens,
      messages,
      jsonData: rawData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    updateAppData((prev) => ({
      ...prev,
      chatLogs: [...(prev.chatLogs || []), newEntry],
    }));

    setNewLogForm({
      title: '',
      characterName: '',
      userName: 'User',
      summary: '',
      rawContent: '[\n  {\n    "name": "User",\n    "is_user": true,\n    "mes": "你好！",\n    "send_date": "2025-01-01 12:00:00"\n  },\n  {\n    "name": "Assistant",\n    "is_user": false,\n    "mes": "你好！有什么我可以帮你的？",\n    "send_date": "2025-01-01 12:00:05"\n  }\n]',
    });
    setShowAddLogModal(false);
    showToast('聊天记录创建成功！', 'success');
  };

  const handleOpenDetail = (log: ChatLogEntry) => {
    setActiveLog(log);
    setReaderTab('info');
    setRawJsonDraft(JSON.stringify(log.jsonData || log.messages, null, 2));
  };

  const handleSaveActiveLog = (updatedLog: ChatLogEntry) => {
    updateAppData((prev) => ({
      ...prev,
      chatLogs: (prev.chatLogs || []).map((l) => (l.id === updatedLog.id ? updatedLog : l)),
    }));
    setActiveLog(updatedLog);
    showToast('聊天记录已保存！', 'success');
  };

  const handleExportLog = (log: ChatLogEntry) => {
    const payload = log.jsonData || log.messages;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerFileDownload(blob, `${log.title || 'ST聊天记录'}.json`);
    showToast('已导出聊天记录 JSON 文件', 'success');
  };

  const handleDeleteLog = (id: string) => {
    requestDelete('确定要删除此聊天记录吗？', 1, () => {
      updateAppData((prev) => ({
        ...prev,
        chatLogs: (prev.chatLogs || []).filter((l) => l.id !== id),
      }));
      if (activeLog?.id === id) setActiveLog(null);
      showToast('聊天记录已删除', 'info');
    });
  };

  const handleBatchDelete = () => {
    if (!selectedIds.length) return;
    requestDelete(`确定要删除选中的 ${selectedIds.length} 个聊天记录吗？`, selectedIds.length, () => {
      updateAppData((prev) => ({
        ...prev,
        chatLogs: (prev.chatLogs || []).filter((l) => !selectedIds.includes(l.id)),
      }));
      setSelectedIds([]);
      setBatchMode(false);
      showToast(`已批量删除 ${selectedIds.length} 份聊天记录`, 'info');
    });
  };

  const handleBatchMove = () => {
    if (!selectedIds.length || !batchTargetCategory) return;
    updateAppData((prev) => ({
      ...prev,
      chatLogs: (prev.chatLogs || []).map((l) => (selectedIds.includes(l.id) ? { ...l, category: batchTargetCategory } : l)),
    }));
    setSelectedIds([]);
    setShowBatchMoveModal(false);
    setBatchMode(false);
    showToast(`已将 ${selectedIds.length} 份聊天记录移动到「${batchTargetCategory}」`, 'success');
  };

  const handleAddCategory = (customName?: string) => {
    const trimmed = (customName !== undefined ? customName : newGroupName).trim();
    if (!trimmed) {
      showToast('分组名称不能为空', 'error');
      return;
    }
    const curCats = appData.chatLogCategories || ['默认'];
    if (curCats.includes(trimmed)) {
      showToast('该分组已存在', 'error');
      return;
    }
    updateAppData((prev) => ({
      ...prev,
      chatLogCategories: [...curCats, trimmed],
    }));
    setCategoryFilter(trimmed);
    setNewGroupName('');
    setShowNewGroupModal(false);
    showToast(`成功新建分组: ${trimmed}`, 'success');
  };

  const handleApplyRawJson = () => {
    if (!activeLog) return;
    try {
      const parsed = JSON.parse(rawJsonDraft);
      const { messages } = parseChatFile(rawJsonDraft, activeLog.title);
      const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.mes || m.content || ''), 0);

      const updated: ChatLogEntry = {
        ...activeLog,
        messages,
        messageCount: messages.length,
        totalTokens,
        jsonData: parsed,
        updatedAt: Date.now(),
      };
      handleSaveActiveLog(updated);
      showToast('聊天记录 JSON 数据已更新！', 'success');
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
        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length));
      }
    }, { rootMargin: '600px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visibleSorted = filtered.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-5 ">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".json,.jsonl"
        className="hidden"
      />

      {/* Top Header & Actions */}
                  <ManagementHeader data-design-id="chatlogs-header-banner"
        icon={<>
            <MessageSquare className="w-4 h-4" />
          </>}
        title={<>ST 聊天记录存储</>}
        badge={<>
                格式：.json / .jsonl (ST 对话备份)
              </>}
        description={<>
              管理与备份酒馆聊天对话记录 (JSON/JSONL)，支持对话气泡沉浸式回看、Token 统计与角色卡关联
            </>}
        actions={<>
          <ActionButton type="button" onClick={() => fileInputRef.current?.click()} title="导入聊天记录 (.json, .jsonl)" action="import" context="toolbar" tone="primary">
            <Upload className="w-3 h-3" />
            <span>导入记录 (JSON/JSONL)</span>
          </ActionButton>
          <ActionButton type="button" onClick={() => setShowAddLogModal(true)} action="create" context="toolbar">
            <Plus className="w-3 h-3" />
            <span>新建记录</span>
          </ActionButton>
        </>}
      />

      {/* Toolbar */}
      <ManagementToolbarFrame data-design-id="chatlogs-toolbar">
        <ManagementSearch type="text" placeholder="搜索聊天标题、角色名、用户名或对话内容…" value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} />

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <CategoryFilterDropdown 
            groups={Array.from(new Set(['默认', ...(appData.chatLogCategories || [])]))}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            allGroupName="全部分组"
          />
          <TagFilterDropdown
            builtInTags={[]}
            customTags={appData.chatLogTags || []}
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
              { value: 'newest', label: '最新添加' },
              { value: 'oldest', label: '最早添加' },
            ]}
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            className="h-[30px] px-2.5 rounded-lg bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-medium flex items-center justify-between gap-1.5 transition-all cursor-pointer active:bg-black/10 dark:active:bg-white/15"
          />

          <button
            type="button"
            onClick={() => {
              setBatchMode((prev: any) => {
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

        {/* Group Navigation Bar */}
        <BaseCard className="p-2 w-full">
          <GroupCategoryBar
            groups={Array.from(new Set(['默认', ...(appData.chatLogCategories || [])]))}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            getCount={(g) => (appData.chatLogs || []).filter((p: any) => (p.category || '默认') === g).length}
            totalCount={appData.chatLogs?.length || 0}
            allGroupName="全部分组"
          />
        </BaseCard>
      </ManagementToolbarFrame>

      {/* Batch Actions Bar */}
      {batchMode && (
        <ManagementBatchOverlay >
          <ManagementBatchBar data-design-id="chatlogs-batch-bar">
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                已选 {selectedIds.length} 项
              </span>
              <ActionButton onClick={() => {
                  setBatchMode(false);
                  setSelectedIds([]);
                }} aria-label="关闭选择" action="close" context="icon"><X className="w-3.5 h-3.5" /></ActionButton>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              <ActionButton type="button" onClick={() => {
                  if (selectedIds.length === sorted.length && sorted.length > 0) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(sorted.map((c: any) => c.id));
                  }
                }} action="select" context="batch">
                {selectedIds.length === sorted.length && sorted.length > 0 ? '取消' : '全选'}
              </ActionButton>
              <ActionButton type="button" onClick={() => {
                  const currentSet = new Set(selectedIds);
                  const newSelected = sorted
                    .map((c: any) => c.id)
                    .filter((id: string) => !currentSet.has(id));
                  setSelectedIds(newSelected);
                }} action="invert" context="batch">
                反选
              </ActionButton>
              <ActionButton type="button" disabled={selectedIds.length === 0} onClick={() => setShowBatchMoveModal(true)} action="move" context="batch" tone="primary">
                移动分组
              </ActionButton>
              <ActionButton type="button" disabled={selectedIds.length === 0} onClick={handleBatchDelete} action="delete" context="batch" tone="danger">
                删除
              </ActionButton>
            </div>
          </ManagementBatchBar>
        </ManagementBatchOverlay>
      )}

      {/* Chat Logs Grid */}
      {sorted.length === 0 ? (
        <BaseCard className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">暂无聊天记录</h3>
          <p className="text-[10px] text-zinc-400 mt-1 max-w-sm">
            点击「导入记录」上传酒馆 JSON/JSONL 聊天转储文件，随时回看与存档精彩对话
          </p>
        </BaseCard>
      ) : (
        <ManagementGrid data-design-id="chatlogs-grid" className=" grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((log) => {
            const isSelected = selectedIds.includes(log.id);
            const msgCount = log.messages?.length || log.messageCount || 0;
            const tokens = log.totalTokens || (log.messages || []).reduce((sum, m) => sum + estimateTokens(m.mes || m.content || ''), 0);

            return (
              <BaseCard
                key={log.id}
                designId={`chatlogs-item-${log.id}`}
                nested
                onClick={() => {
                  if (batchMode) {
                    setSelectedIds((prev) =>
                      prev.includes(log.id) ? prev.filter((id) => id !== log.id) : [...prev, log.id]
                    );
                  } else {
                    handleOpenDetail(log);
                  }
                }}
                className={`transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)] bg-zinc-100/50 dark:bg-zinc-800/50'
                    : 'hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {batchMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                        />
                      )}
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={log.title}>
                        {log.title}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {log.category || '默认'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
                    {log.characterName && (
                      <span className="flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200">
                        <Bot className="w-3.5 h-3.5" />
                        {log.characterName}
                      </span>
                    )}
                    {log.userName && (
                      <span className="flex items-center gap-1 text-zinc-500">
                        <User className="w-3.5 h-3.5" />
                        {log.userName}
                      </span>
                    )}
                  </div>

                  {log.summary && (
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-300 line-clamp-2 mb-2">
                      {log.summary}
                    </p>
                  )}

                  {/* Last message snippet preview */}
                  {log.messages && log.messages.length > 0 && (
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {log.messages[log.messages.length - 1].name}:
                      </span>{' '}
                      {log.messages[log.messages.length - 1].mes || log.messages[log.messages.length - 1].content}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                      {msgCount} 条消息
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                      ~{tokens} Tokens
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px]">
                  <span className="text-[10px] text-zinc-400">
                    {new Date(log.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  {!batchMode && (
                    <div className="flex items-center gap-1" onClick={(e: any) => e.stopPropagation()}>
                      {log.sourceCardId && onOpenCardDetail && (
                        <button
                          onClick={() => onOpenCardDetail(log.sourceCardId!)}
                          className="p-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="跳转关联角色卡"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleExportLog(log)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="导出 JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </BaseCard>
            );
          })}
        </ManagementGrid>
      )}

      {/* Chat Reader Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-transparent transition-opacity"
            onClick={() => setActiveLog(null)}
            aria-label="关闭遮罩"
          />
          <DetailPanel onClick={(e) => e.stopPropagation()}>
            {/* Modal Header (Clean 2-Row Compact Layout, No Overlap) */}
            <DetailHeader designPrefix="chatlogs-detail" title={activeLog.title}
              tags={<><div className="flex items-center justify-between gap-2 min-w-0 text-[10px] text-zinc-500">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden py-0.5">
                  <span className="whitespace-nowrap shrink-0 text-zinc-500 dark:text-zinc-400">
                    角色: {activeLog.characterName || '未指定'} · {(activeLog.messages || []).length} 条对话
                  </span>
                  <TagEditor
                    customTags={activeLog.customTags || []}
                    availableTags={appData.chatLogTags || []}
                    maxDisplay={2}
                    onChange={(newTags) => {
                      const updated = { ...activeLog, customTags: newTags };
                      setActiveLog(updated);
                      updateAppData((prev: any) => {
                         const newList = (prev.chatLogs || []).map((i: any) => i.id === updated.id ? updated : i);
                         const globalTags = prev.chatLogTags || [];
                         return { 
                           ...prev, 
                           chatLogs: newList,
                           chatLogTags: Array.from(new Set([...globalTags, ...newTags]))
                         };
                      });
                    }}
                  />
                </div>
              </div></>} actions={<>
                  <ActionButton onClick={() => handleExportLog(activeLog)} aria-label="导出 JSON" action="export" context="icon">
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">导出 JSON</span>
                  </ActionButton>

                </>} onClose={() => setActiveLog(null)} />

            {/* Detail Tabs */}
            <DetailTabBar label="详情导航">
                <DetailTabButton onClick={() => setReaderTab('info')} active={readerTab === 'info'}>
                  基本属性
                </DetailTabButton>
                <DetailTabButton onClick={() => setReaderTab('viewer')} active={readerTab === 'viewer'}>
                  对话气泡回看 ({(activeLog.messages || []).length})
                </DetailTabButton>
                <DetailTabButton onClick={() => setReaderTab('json')} active={readerTab === 'json'}>
                  JSON 原始数据
                </DetailTabButton>
              </DetailTabBar>

            {/* Modal Body */}
            <DetailBody className="p-4 flex-1 overflow-y-auto">
              {readerTab === 'viewer' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {(activeLog.messages || []).map((msg, idx) => {
                    const isUser = !!msg.is_user;
                    const isSystem = !!msg.is_system;
                    const content = msg.mes || msg.content || '';
                    const tokens = estimateTokens(content);

                    if (isSystem) {
                      return (
                        <div key={idx} className="flex justify-center my-3">
                          <div className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-[10px] text-zinc-500 max-w-lg text-center font-mono">
                            {content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Avatar Icon */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                            isUser
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
                          }`}
                        >
                          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        {/* Bubble Message */}
                        <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 text-[10px] text-zinc-400">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              {msg.name || (isUser ? 'User' : 'Assistant')}
                            </span>
                            {msg.send_date && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> {msg.send_date}
                              </span>
                            )}
                            <span className="font-mono">~{tokens} tok</span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-[10px] leading-relaxed whitespace-pre-wrap ${
                              isUser
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-none shadow-sm'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-700/60 shadow-sm'
                            }`}
                          >
                            {content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {readerTab === 'json' && (
                <div className="space-y-3 flex-1 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                      SillyTavern 聊天转储 JSON
                    </span>
                    <button
                      onClick={handleApplyRawJson}
                      className="px-3 py-1 text-[10px] font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shadow-sm"
                    >
                      应用 JSON 变更
                    </button>
                  </div>
                  <textarea
                    value={rawJsonDraft}
                    onChange={(e: any) => setRawJsonDraft(e.target.value)}
                    className="w-full flex-1 min-h-[360px] p-3 text-[10px] font-mono rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 whitespace-pre-wrap break-all overflow-y-auto overflow-x-hidden"
                  />
                </div>
              )}

              {readerTab === 'info' && (
                <div className="space-y-4 text-[10px]">
                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      聊天标题
                    </label>
                    <BaseInput
                      type="text"
                      value={activeLog.title}
                      onChange={(e: any) => setActiveLog({ ...activeLog, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">角色名</label>
                      <BaseInput
                        type="text"
                        value={activeLog.characterName || ''}
                        onChange={(e: any) => setActiveLog({ ...activeLog, characterName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">用户名</label>
                      <BaseInput
                        type="text"
                        value={activeLog.userName || ''}
                        onChange={(e: any) => setActiveLog({ ...activeLog, userName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">所属分组</label>
                      <CustomSelect
                        value={activeLog.category || '默认'}
                        onChange={(val) => setActiveLog({ ...activeLog, category: val })}
                        options={categories.map((c) => ({ value: c, label: c }))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs flex items-center justify-between"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">剧情梗概 / 备忘说明</label>
                    <textarea
                      rows={4}
                      value={activeLog.summary || ''}
                      onChange={(e: any) => setActiveLog({ ...activeLog, summary: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 resize-none"
                    />
                  </div>
                </div>
              )}
            </DetailBody>

            {/* Modal Footer */}
            <DetailFooter  className="justify-end">
              <ActionButton onClick={() => setActiveLog(null)} action="close" context="detail">
                关闭
              </ActionButton>
              <ActionButton onClick={() => handleSaveActiveLog(activeLog)} action="save" context="detail">
                保存全部修改
              </ActionButton>
            </DetailFooter>
          </DetailPanel>
        </div>
      )}

      {/* Add New Chat Log Modal */}
      {/* Add New Chat Log Modal (Bottom Sheet) */}
      <BottomSheetModal
        isOpen={showAddLogModal}
        onClose={() => setShowAddLogModal(false)}
        title={
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            新建聊天记录
          </span>
        }
        subtitle="创建一条空的或填入初步对话的聊天存档"
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddLogModal(false)}
              className="px-4 py-2 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreateManualLog}
              className="px-4 py-2 text-[10px] font-semibold rounded bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shadow-xs"
            >
              确认创建
            </button>
          </>
        }
      >
        <div className="space-y-4 text-[10px]">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              聊天记录标题 <span className="text-red-500">*</span>
            </label>
            <BaseInput
              type="text"
              placeholder="例如：与艾莲娜的首次初遇 / 副本冒险探索记录"
              value={newLogForm.title}
              onChange={(e: any) => setNewLogForm({ ...newLogForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">关联角色 / 对方名字</label>
            <BaseInput
              type="text"
              placeholder="例如：艾莲娜 / 客服助理"
              value={newLogForm.characterName}
              onChange={(e: any) => setNewLogForm({ ...newLogForm, characterName: e.target.value })}
              className="w-full px-3 py-2 rounded"
            />
          </div>
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">备注标签</label>
            <BaseInput
              type="text"
              placeholder="例如：第一卷, 甜度爆表, 完结篇"
              value={newLogForm.summary}
              onChange={(e: any) => setNewLogForm({ ...newLogForm, summary: e.target.value })}
              className="w-full px-3 py-2 rounded"
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
            <ArrowRightLeft className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            移动选中的 {selectedIds.length} 份记录
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
              className="px-3 py-1.5 text-[10px] font-semibold rounded bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-50 shadow-xs"
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
                  availableTags={appData.chatLogTags || []}
                  selectedCount={selectedIds.length}
                  onApply={(tagsToAdd) => {
                    updateAppData((prev: any) => {
                      const list = prev.chatLogs || [];
                      const newList = list.map((item: any) => {
                        if (selectedIds.includes(item.id)) {
                          const existingTags = item.customTags || [];
                          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                          return { ...item, customTags: newTags };
                        }
                        return item;
                      });
                      
                      const globalTags = prev.chatLogTags || [];
                      const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
                      
                      return { ...prev, chatLogs: newList, chatLogTags: updatedGlobalTags };
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


