import { managementViewClass } from '../ui/ManagementListItem';
import { ManagementSearch, ManagementBatchBar, ManagementHeader, ManagementToolbarFrame, ManagementBatchOverlay, ManagementGrid } from '../ui/ManagementChrome';
import { ActionButton } from '../ui/ActionButton';
import React, { useRef, useState, useMemo } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { NormalCardAIRefineModal } from '../modals/NormalCardAIRefineModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { ViewModeDropdown, ViewMode } from '../ui/ViewModeDropdown';
import { BaseButton } from '../ui/BaseButton';
import { BaseCard } from '../ui/BaseCard';
import { BaseInput } from '../ui/BaseInput';
import {
  Search,
  Plus,
  Trash2,
  Smartphone,
  Download,
  Settings,
  RefreshCw,
  X,
  MessageSquare,
  Phone,
  Map,
  Globe,
  Maximize2,
  Copy,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  Home,
  Book,
  FileJson,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  Link as LinkIcon,
  Edit3,
  Upload,
  User,
  LayoutGrid,
  List,
  Users,
  Sparkles,
  Layers,
  ArrowUpDown,
  CheckSquare,
  Circle
} from 'lucide-react';
import { AppData, NormalCardEntry } from '../../types';
import { parseNormalCardFile } from '../../utils';

export const NormalCardsSection = (props: any) => {
  const {
    appData,
    updateAppData,
    showToast,
    setShowNormalCardBatchMoveModal,
    setNormalCardCategoryFilter,
    MoreHorizontal,
    normalCardsList = [],
    setNormalCardSearchQuery,
    setSelectedNormalCardIds,
    normalCardSortOrder,
    setRenameNormalCardCategoryInput,
    filteredNormalCards = [],
    setManagingNormalCardCategory,
    normalCardBatchMode,
    setNormalCardBatchMode,
    setEditingNormalCard,
    selectedNormalCardIds = [],
    sortItemList,
    normalCardCategoryFilter,
    setShowNewNormalCardGroupModal,
    handleBatchDeleteNormalCards,
    setNormalCardSortOrder,
    normalCardSearchQuery = '',
    normalCardTagsFilter = [],
    setnormalCardTagsFilter,
    normalCardFileInputRef,
    handleNormalCardFileUpload,
    normalCardRoleTab = 'main',
    setNormalCardRoleTab,
  } = props;

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const [showBatchAIRefineModal, setShowBatchAIRefineModal] = useState(false);
  const [normalCardViewMode, setNormalCardViewMode] = useState<ViewMode>('grid-3');
  const customTags = normalCardRoleTab === 'npc' ? (appData.npcCardTags || []) : (appData.normalCardTags || []);
  const builtInTags: string[] = [];

  const selectedCardsForRefine = useMemo(() => {
    return (appData.normalCards || []).filter((c: any) => selectedNormalCardIds.includes(c.id));
  }, [appData.normalCards, selectedNormalCardIds]);

  // Count Main vs NPC
  const mainCardsCount = (appData.normalCards || []).filter((c: any) => !c.isNpc && c.cardRole !== 'npc').length;
  const npcCardsCount = (appData.normalCards || []).filter((c: any) => c.isNpc || c.cardRole === 'npc').length;

  const triggerUpload = () => {
    if (normalCardFileInputRef?.current) {
      normalCardFileInputRef.current.click();
    } else if (localFileInputRef.current) {
      localFileInputRef.current.click();
    }
  };

  const handleDeleteSingleNormalCard = (cardId: string, cardName: string) => {
    if (typeof props.requestDelete === 'function') {
      props.requestDelete(`确定要删除角色卡 "${cardName}" 吗？`, 1, () => {
        const updatedCards = (appData.normalCards || []).filter((c: any) => c.id !== cardId);
        updateAppData((prev: any) => ({ ...prev, normalCards: updatedCards }));
        if (selectedNormalCardIds.includes(cardId)) {
          setSelectedNormalCardIds(selectedNormalCardIds.filter((id: string) => id !== cardId));
        }
        showToast(`已删除角色卡 "${cardName}"`, 'info');
      });
    } else {
      const updatedCards = (appData.normalCards || []).filter((c: any) => c.id !== cardId);
      updateAppData((prev: any) => ({ ...prev, normalCards: updatedCards }));
      if (selectedNormalCardIds.includes(cardId)) {
        setSelectedNormalCardIds(selectedNormalCardIds.filter((id: string) => id !== cardId));
      }
      showToast(`已删除角色卡 "${cardName}"`, 'info');
    }
  };

  const handleLocalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (handleNormalCardFileUpload) {
        handleNormalCardFileUpload(e.target.files);
      } else {
        const files = Array.from(e.target.files);
        const newEntries: NormalCardEntry[] = [];
        for (const file of files) {
          try {
            const entry = await parseNormalCardFile(file);
            if (normalCardCategoryFilter && normalCardCategoryFilter !== '全部分组') {
              entry.category = normalCardCategoryFilter;
            }
            if (normalCardRoleTab === 'npc') {
              entry.isNpc = true;
              entry.cardRole = 'npc';
            }
            newEntries.push(entry);
          } catch (err: any) {
            console.error('Error parsing normal card file:', file.name, err);
          }
        }
        if (newEntries.length > 0) {
          updateAppData((prev: any) => ({ ...prev, normalCards: [...(prev.normalCards || []), ...newEntries] }));
          showToast(`成功导入 ${newEntries.length} 个角色卡文件`, 'success');
        } else {
          showToast('未能成功解析所选角色卡文件', 'error');
        }
      }
      e.target.value = '';
    }
  };

  const handleCreateNewNormalCard = () => {
    const isNpc = normalCardRoleTab === 'npc';
    const newCard: NormalCardEntry = {
      id: 'nc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: isNpc ? '新建 NPC 配角' : '新建角色卡',
      charName: isNpc ? '新建 NPC 配角' : '新建角色卡',
      realName: '',
      gender: '未知',
      creator: 'User',
      category: normalCardCategoryFilter !== '全部分组' ? normalCardCategoryFilter : '默认',
      description: '角色描述设定...',
      firstMes: '你好！',
      scenario: '日常对话场景',
      personality: '性格特点...',
      tags: [],
      isNpc,
      cardRole: isNpc ? 'npc' : 'main',
      createdAt: Date.now()
    };
    if (setEditingNormalCard) {
      setEditingNormalCard(newCard);
    } else {
      updateAppData((prev: any) => ({ ...prev, normalCards: [...(prev.normalCards || []), newCard] }));
      showToast('已新建角色卡', 'success');
    }
  };

  // Helper format label
  const getFormatBadge = (item: any) => {
    const fmt = (item.importFormat || item.fileExtension || '').toLowerCase();
    if (fmt === 'docx' || fmt === 'doc') return { label: 'Word 文档', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200' };
    if (fmt === 'txt') return { label: '纯文本', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200' };
    if (fmt === 'json') return { label: 'JSON 卡片', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200' };
    if (fmt === 'png' || fmt === 'webp') return { label: 'PNG 角色卡', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200' };
    return { label: '人设文档', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200' };
  };

  const handleBatchExportNormalCards = () => {
    if (selectedNormalCardIds.length === 0) return;
    const cardsToExport = (appData.normalCards || []).filter((c: any) => selectedNormalCardIds.includes(c.id));
    if (cardsToExport.length === 0) return;

    if (cardsToExport.length === 1) {
      const card = cardsToExport[0];
      const fileName = `${(card.charName || card.name || card.fileName || 'character').replace(/[\\/:*?"<>|]/g, '_')}.json`;
      const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`已导出角色卡 "${card.charName || card.name || card.fileName}"`, 'success');
    } else {
      const fileName = `NormalCards_Export_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(cardsToExport, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`已批量导出 ${cardsToExport.length} 张普通角色卡`, 'success');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 relative">
      {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
      {normalCardBatchMode && (
        <ManagementBatchOverlay >
          <ManagementBatchBar>
            {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                已选 {selectedNormalCardIds.length} 项
              </span>
              <ActionButton onClick={() => {
                  setNormalCardBatchMode(false);
                  setSelectedNormalCardIds([]);
                }} aria-label="关闭选择" action="close" context="icon"><X className="w-3.5 h-3.5" /></ActionButton>
            </div>

            {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              {/* 全选 / 取消 */}
              <ActionButton type="button" onClick={() => {
                  if (selectedNormalCardIds.length === filteredNormalCards.length && filteredNormalCards.length > 0) {
                    setSelectedNormalCardIds([]);
                  } else {
                    setSelectedNormalCardIds(filteredNormalCards.map((c: any) => c.id));
                  }
                }} action="select" context="batch">
                {selectedNormalCardIds.length === filteredNormalCards.length && filteredNormalCards.length > 0 ? '取消' : '全选'}
              </ActionButton>
              {/* 反选 */}
              <ActionButton type="button" onClick={() => {
                  const currentSet = new Set(selectedNormalCardIds);
                  const inversed = filteredNormalCards.filter((c: any) => !currentSet.has(c.id)).map((c: any) => c.id);
                  setSelectedNormalCardIds(inversed);
                }} action="invert" context="batch">
                反选
              </ActionButton>
              {/* 移动 */}
              <ActionButton type="button" disabled={selectedNormalCardIds.length === 0} onClick={() => setShowNormalCardBatchMoveModal(true)} action="move" context="batch" tone="primary">
                移动
              </ActionButton>
              {/* 标签 */}
              <ActionButton type="button" disabled={selectedNormalCardIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="tag" context="batch" tone="primary">
                标签
              </ActionButton>
              {/* 导出 */}
              <ActionButton type="button" disabled={selectedNormalCardIds.length === 0} onClick={handleBatchExportNormalCards} action="export" context="batch" tone="primary">
                导出
              </ActionButton>
              {/* AI精修 */}
              <ActionButton type="button" disabled={selectedNormalCardIds.length === 0} onClick={() => setShowBatchAIRefineModal(true)} action="custom" context="batch" tone="primary">
                AI精修
              </ActionButton>
              {/* 删除 */}
              <ActionButton type="button" disabled={selectedNormalCardIds.length === 0} onClick={handleBatchDeleteNormalCards} action="delete" context="batch" tone="danger">
                删除
              </ActionButton>
            </div>
          </ManagementBatchBar>
        </ManagementBatchOverlay>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={localFileInputRef}
        multiple
        accept=".png,.webp,.json,.doc,.docx,.txt,.zip"
        className="hidden"
        onChange={handleLocalFileChange}
      />

      <div data-design-id="normal-cards-section-container" className="space-y-3 md:space-y-4 mb-6">
        
        {/* Sub-interface Header Banner */}
                    <ManagementHeader data-design-id="normal-cards-header-banner"
        icon={<>
            <Users className="w-4 h-4" />
          </>}
        title={<>{normalCardRoleTab === 'npc' ? 'NPC 配角管理' : '普通角色卡'}</>}
        badge={<>
                支持格式：.png / .json / .doc / .docx / .txt
              </>}
        description={<>
              
            </>}
        actions={<>
          <ActionButton type="button" onClick={triggerUpload} title="导入角色卡文档 (.png, .json, .doc, .docx, .txt)" action="import" context="toolbar" tone="primary">
              <Upload className="w-3 h-3" />
              <span>导入卡文档</span>
            </ActionButton>
          <ActionButton type="button" onClick={handleCreateNewNormalCard} action="create" context="toolbar">
              <Plus className="w-3 h-3" />
              <span>{normalCardRoleTab === 'npc' ? '新建配角' : '新建角色'}</span>
            </ActionButton>
        </>}
      />

        {/* ══════ NPC 配角与普通角色卡按键切换 (独立于分组和标签，同一套界面样式) ══════ */}
        <div className="flex items-center justify-between p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setNormalCardRoleTab && setNormalCardRoleTab('main')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                normalCardRoleTab === 'main'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>主人设</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                normalCardRoleTab === 'main' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}>
                {mainCardsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setNormalCardRoleTab && setNormalCardRoleTab('npc')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                normalCardRoleTab === 'npc'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>NPC配角</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                normalCardRoleTab === 'npc' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}>
                {npcCardsCount}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500 pr-2">
            <span>当前显示: <strong>{filteredNormalCards.length}</strong></span>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <ManagementToolbarFrame data-design-id="normal-cards-controls-bar">
          <ManagementSearch designId="normal-cards-search-input" type="text" value={normalCardSearchQuery} onChange={(e: any) => setNormalCardSearchQuery(e.target.value)} placeholder="搜索角色卡、真名、作者、内容关键字..." />

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <CategoryFilterDropdown 
              groups={Array.from(new Set(['默认', ...(normalCardRoleTab === 'npc' ? (appData.npcCardCategories || []) : (appData.normalCardCategories || []))]))}
              currentGroup={normalCardCategoryFilter}
              onSelectGroup={setNormalCardCategoryFilter}
              allGroupName="全部分组"
            />
            <TagFilterDropdown
              builtInTags={builtInTags}
              customTags={customTags}
              selectedTags={normalCardTagsFilter}
              onChange={setnormalCardTagsFilter}
            />
            <CustomSelect
              value={normalCardSortOrder}
              onChange={(val) => setNormalCardSortOrder(val)}
              options={[
                { value: 'default', label: '默认排序' },
                { value: 'az', label: '名称 A-Z' },
                { value: 'za', label: '名称 Z-A' },
                { value: 'newest', label: '最新添加' },
                { value: 'oldest', label: '最早添加' },
              ]}
              icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              className="h-[30px] px-2.5 rounded-lg bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer"
            />

            <ViewModeDropdown viewMode={normalCardViewMode} setViewMode={setNormalCardViewMode} />

            <button
              type="button"
              onClick={() => {
                setNormalCardBatchMode((prev: boolean) => {
                  if (prev) setSelectedNormalCardIds([]);
                  return !prev;
                });
              }}
              title={normalCardBatchMode ? '退出批量选择' : '开启多选模式'}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
                normalCardBatchMode
                  ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                  : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="leading-none">{normalCardBatchMode ? '完成' : '选择'}</span>
            </button>
          </div>

          {/* Group Navigation Bar */}
          <BaseCard designId="normal-cards-group-bar" className="group-category-container p-2 w-full bg-[var(--group-card-bg,#E3CDAE)] border-none rounded-none shadow-none">
            <GroupCategoryBar 
              groups={Array.from(new Set(['默认', ...(normalCardRoleTab === 'npc' ? (appData.npcCardCategories || []) : (appData.normalCardCategories || []))]))} 
              currentGroup={normalCardCategoryFilter} 
              onSelectGroup={setNormalCardCategoryFilter} 
              getCount={(g) => (appData.normalCards || []).filter((c: any) => (normalCardRoleTab === 'npc' ? (c.isNpc || c.cardRole === 'npc') : (!c.isNpc && c.cardRole !== 'npc')) && (c.category || '默认') === g).length} 
              totalCount={normalCardRoleTab === 'npc' ? npcCardsCount : mainCardsCount} 
              allGroupName="全部分组"
              onDeleteGroup={(g) => { setManagingNormalCardCategory(g); }}
            />
          </BaseCard>
        </ManagementToolbarFrame>

        <BatchTagModal
          isOpen={showBatchTagModal}
          onClose={() => setShowBatchTagModal(false)}
          availableTags={normalCardRoleTab === 'npc' ? (appData.npcCardTags || []) : (appData.normalCardTags || [])}
          selectedCount={selectedNormalCardIds.length}
          onApply={(tagsToAdd) => {
            updateAppData((prev: any) => {
              const list = prev.normalCards || [];
              const newList = list.map((item: any) => {
                if (selectedNormalCardIds.includes(item.id)) {
                  const existingTags = item.customTags || [];
                  const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                  return { ...item, customTags: newTags, tags: newTags };
                }
                return item;
              });
              
              const isNpcTab = normalCardRoleTab === 'npc';
              const globalTags = isNpcTab ? (prev.npcCardTags || []) : (prev.normalCardTags || []);
              const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
              
              if (isNpcTab) {
                return { ...prev, normalCards: newList, npcCardTags: updatedGlobalTags };
              } else {
                return { ...prev, normalCards: newList, normalCardTags: updatedGlobalTags };
              }
            });
            setShowBatchTagModal(false);
            if (typeof props.setSelectedNormalCardIds === 'function') {
              props.setSelectedNormalCardIds([]);
            }
            showToast(`成功为 ${selectedNormalCardIds.length} 个角色卡添加 ${tagsToAdd.length} 个标签`, 'success');
          }}
        />

        {showBatchAIRefineModal && selectedCardsForRefine.length > 0 && (
          <NormalCardAIRefineModal
            isOpen={showBatchAIRefineModal}
            onClose={() => setShowBatchAIRefineModal(false)}
            card={selectedCardsForRefine[0]}
            cards={selectedCardsForRefine}
            appData={appData}
            updateAppData={updateAppData}
            showToast={showToast}
            onApplyResult={(updatedCard) => {
              updateAppData((prev: any) => ({
                ...prev,
                normalCards: (prev.normalCards || []).map((c: any) =>
                  c.id === updatedCard.id ? updatedCard : c
                ),
              }));
            }}
          />
        )}

        {/* Cards Display Grid / List */}
        {filteredNormalCards.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
            <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {normalCardSearchQuery
                ? '未找到匹配的角色卡'
                : normalCardRoleTab === 'npc'
                ? '暂无 NPC 配角，点击顶部“新建 NPC 配角”或在精修/编辑时将角色卡标记为配角'
                : '暂无普通角色卡，点击顶部“导入角色卡文档”上传 .png / .json / .doc / .docx / .txt 文件'}
            </p>
          </div>
        ) : normalCardViewMode === 'list' ? (
          <div className="flex flex-col gap-2">
            {sortItemList(
              filteredNormalCards,
              normalCardSortOrder,
              (item: any) => item.charName || item.fileName || item.name || '',
              (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
            ).map((item: any) => {
              const isSelected = selectedNormalCardIds.includes(item.id);
              const fmtBadge = getFormatBadge(item);

              return (
                <BaseCard
                  key={item.id}
                  nested
                  designId={`normal-card-list-${item.id}`}
                  onClick={() => {
                    if (normalCardBatchMode) {
                      if (isSelected) {
                        setSelectedNormalCardIds(selectedNormalCardIds.filter((id: string) => id !== item.id));
                      } else {
                        setSelectedNormalCardIds([...selectedNormalCardIds, item.id]);
                      }
                    } else {
                      setEditingNormalCard(item);
                    }
                  }}
                  className={`cursor-pointer flex items-center justify-between gap-3 shadow-xs hover:shadow-sm ${
                    isSelected
                      ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)]'
                      : 'hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {item.coverImage ? (
                      <img
                        src={item.coverImage}
                        alt={item.fileName || item.name}
                        className="w-10 h-12 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 flex-shrink-0">
                        {item.isNpc || item.cardRole === 'npc' ? <Users className="w-5 h-5 text-purple-400" /> : <FileText className="w-5 h-5 text-zinc-400" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={item.fileName || item.name}>
                          {item.charName || item.fileName || item.name}
                        </h3>
                        
                        {/* Format badge without Tavern Card label */}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${fmtBadge.color}`}>
                          {fmtBadge.label}
                        </span>

                        {item.activeVersionLabel && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                            {item.activeVersionLabel}
                          </span>
                        )}

                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                          {item.category || '默认'}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {item.cardRole === 'npc' || item.isNpc
                          ? `NPC 配角 · ${item.relation ? `关系: ${item.relation} · ` : ''}字数: ${(item.content || '').length}`
                          : `作者: ${item.author || item.creator || 'User'} · 字数: ${(item.content || '').length} 字符`}
                      </div>
                    </div>
                  </div>

                  {normalCardBatchMode ? (
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setEditingNormalCard(item)}
                        className="flex items-center justify-center gap-1 px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer leading-tight"
                        title="查看或修改角色卡内容"
                      >
                        <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--accent,#607E95)]" />
                        <span>详情/修改</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleNormalCard(item.id, item.fileName || item.charName || '未命名角色卡')}
                        className="flex items-center justify-center gap-1 px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 transition-colors cursor-pointer leading-tight"
                        title="删除此角色卡"
                      >
                        <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>删除</span>
                      </button>
                    </div>
                  )}
                </BaseCard>
              );
            })}
          </div>
        ) : (
          <ManagementGrid viewMode={normalCardViewMode} className={managementViewClass(normalCardViewMode)}>
            {sortItemList(
              filteredNormalCards,
              normalCardSortOrder,
              (item: any) => item.charName || item.fileName || item.name || '',
              (item: any) => item.importedAt || item.updatedAt || item.createdAt || 0
            ).map((item: any) => {
              const isSelected = selectedNormalCardIds.includes(item.id);
              const fmtBadge = getFormatBadge(item);

              return (
                <BaseCard
                  key={item.id}
                  nested
                  designId={`normal-card-grid-${item.id}`}
                  onClick={() => {
                    if (normalCardBatchMode) {
                      if (isSelected) {
                        setSelectedNormalCardIds(selectedNormalCardIds.filter((id: string) => id !== item.id));
                      } else {
                        setSelectedNormalCardIds([...selectedNormalCardIds, item.id]);
                      }
                    } else {
                      setEditingNormalCard(item);
                    }
                  }}
                  className={`resource-grid-panel min-w-0 cursor-pointer flex flex-col items-stretch gap-2 shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-[var(--accent)] ring-2 ring-[var(--line-focus)]'
                      : 'hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  {/* Thumbnail */}
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.fileName || item.name}
                      className="w-full aspect-[2/3] rounded-xl object-contain border border-zinc-200 dark:border-zinc-700"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-400">
                      {item.isNpc || item.cardRole === 'npc' ? <Users className="w-6 h-6 text-purple-400" /> : <FileText className="w-6 h-6 text-zinc-400" />}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={item.fileName || item.name}>
                        {item.charName || item.fileName || item.name}
                      </h3>
                      <span className={`px-1 py-0.2 rounded text-[8px] font-semibold shrink-0 border ${fmtBadge.color}`}>
                        {fmtBadge.label}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {item.cardRole === 'npc' || item.isNpc
                        ? `NPC 配角 · ${(item.content || '').length} 字符`
                        : `字数: ${(item.content || '').length} 字符`}
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                        {item.category || '默认'}
                      </span>
                      {item.activeVersionLabel && (
                        <span className="px-1.5 py-0.2 rounded text-[8px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                          {item.activeVersionLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {normalCardBatchMode ? (
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white dark:fill-zinc-900" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </div>
                  ) : null}
                </BaseCard>
              );
            })}
          </ManagementGrid>
        )}
      </div>
    </div>
  );
};



