import { ManagementPagination } from '../ui/ManagementPagination';
import { useCardCover } from '../../hooks/useCardPayload';
import { ManagementSearch, ManagementBatchBar, ManagementHeader, ManagementToolbarFrame, ManagementBatchOverlay, ManagementGrid } from '../ui/ManagementChrome';
import { managementViewClass } from '../ui/ManagementListItem';
import { ActionButton } from '../ui/ActionButton';
import React, { useMemo, useCallback, useState } from 'react';
import { 
  AlertCircle, ArrowRight, ArrowUpDown, Check, CheckCircle2, CheckSquare, 
  Circle, History, Image as ImageIcon, Layers, Search, Trash2, Upload, Sparkles, X 
} from 'lucide-react';
import { AppData, CardEntry } from '../../types';
import { getPureVersionLabel } from '../../utils';
import { BatchTagModal } from '../ui/BatchTagModal';
import { BatchAIRefineModal } from '../modals/BatchAIRefineModal';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { CustomSelect } from '../ui/CustomSelect';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { ViewModeDropdown } from '../ui/ViewModeDropdown';

interface STCardsSectionProps {
  cardViewMode: 'grid-3' | 'grid-4' | 'grid-5' | 'list';
  setCardViewMode: (mode: 'grid-3' | 'grid-4' | 'grid-5' | 'list') => void;
  appData: AppData;
  updateAppData: (data: AppData | ((prev: AppData) => AppData)) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  cardSortOrder: any;
  setCardSortOrder: (order: any) => void;
  currentGroup: string;
  setCurrentGroup: (g: string) => void;
  cardTagFilter: string[];
  setCardTagFilter: (tags: string[]) => void;
  selectedCardIds: string[];
  setSelectedCardIds: React.Dispatch<React.SetStateAction<string[]>>;
  batchMode: boolean;
  setBatchMode: React.Dispatch<React.SetStateAction<boolean>>;
  setDetailCardId: (id: string | null) => void;
  setDetailTab: (tab: any) => void;
  setManagingGroup?: (group: string | null) => void;
  setRenameGroupInput?: (name: string) => void;
  setShowBatchMoveModal: (show: boolean) => void;
  setShowNewGroupModal?: (show: boolean) => void;
  uploadFileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (files: FileList | File[]) => void;
  handleDeleteCard: (cardId: string) => void;
  handleBatchDeleteCards: () => void;
  handleBatchExportCards: () => void;
  exportAsPng?: (card: CardEntry) => void;
  exportAsJson: (card: CardEntry) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  sortItemList: <T>(items: T[], sortOrder: any, getName: (item: T) => string, getCreatedAt?: (item: T) => number) => T[];
  getCardDisplayName: (card: CardEntry) => string;
  getCardDescription: (card: CardEntry) => string;
  getCardCreator: (card: CardEntry) => string;
  getCardTags: (card: CardEntry) => string[];
  cardVisibleCount: number;
  setCardVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  CARD_PAGE_SIZE: number;
  cardLoadMoreRef: React.RefObject<HTMLDivElement>;
  filteredCards: CardEntry[];
  visibleFilteredCards: CardEntry[];
  onOpenStagingVault?: () => void;
}

// Highly optimized Memoized List Item
interface CardListItemProps {
  card: CardEntry;
  name: string;
  author: string;
  desc: string;
  getCardTags: (card: CardEntry) => string[];
  isSelected: boolean;
  batchMode: boolean;
  sameNameCount: number;
  onSelect: (id: string) => void;
  onOpenDetail: (id: string, tab?: string) => void;
}

const MemoizedCardListItem = React.memo<CardListItemProps>(({
  card,
  name,
  author,
  desc,
  getCardTags,
  isSelected,
  batchMode,
  sameNameCount,
  onSelect,
  onOpenDetail
}) => {
  const cover = useCardCover(card);
  const allTags = getCardTags(card);
  const tags = allTags.slice(0, 3);
  const allTagsCount = allTags.length;

  return (
    <div
      onClick={() => {
        if (batchMode) onSelect(card.id);
        else onOpenDetail(card.id, 'overview');
      }}
      className={`sub-block-card group flex items-center gap-3 p-2 bg-[var(--card-solid-bg)] border-none rounded-none cursor-pointer transition-all relative ${
        isSelected
          ? 'ring-2 ring-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))]'
          : 'hover:brightness-95'
      }`}
    >
      {batchMode && (
        <div className="flex-shrink-0 mr-1">
          {isSelected ? (
            <div className="w-4.5 h-4.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs transition-transform scale-105">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          ) : (
            <div className="w-4.5 h-4.5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-500 transition-colors" />
          )}
        </div>
      )}
      <div className="w-12 h-16 bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden flex items-center justify-center rounded-none flex-shrink-0">
        {cover ? (
          <img 
            src={cover || undefined}
            alt={name} 
            loading="lazy" 
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <ImageIcon className="w-5 h-5 text-zinc-400 opacity-60" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{name}</h4>
          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] font-bold tracking-wider">
            {getPureVersionLabel((card as any).activeVersionLabel, (card.versions?.length || 0) + 1)}
          </span>
          {sameNameCount > 1 && (
            <span className="px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold flex items-center gap-0.5">
              <Layers className="w-2.5 h-2.5" /> {sameNameCount}卡面
            </span>
          )}
        </div>
        {author && <p className="text-[10px] text-zinc-500 truncate mb-1">by {author}</p>}
        {desc && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{desc}</p>}
      </div>
      <div className="flex-shrink-0 ml-4 hidden md:flex items-center gap-1.5">
        {tags.map((t, idx) => (
          <span key={idx} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[9px] rounded-md truncate max-w-[60px]">{t}</span>
        ))}
        {allTagsCount > 3 && (
          <span className="text-[9px] text-zinc-400">+{allTagsCount - 3}</span>
        )}
      </div>
    </div>
  );
});

// Highly optimized Memoized Grid Item
interface CardGridItemProps {
  card: CardEntry;
  name: string;
  author: string;
  getCardTags: (card: CardEntry) => string[];
  cardViewMode: 'grid-3' | 'grid-4' | 'grid-5';
  isSelected: boolean;
  batchMode: boolean;
  sameNameCount: number;
  onSelect: (id: string) => void;
  onOpenDetail: (id: string, tab?: string) => void;
  onExport: (card: CardEntry) => void;
  onDelete: (id: string) => void;
}

const MemoizedCardGridItem = React.memo<CardGridItemProps>(({
  card,
  name,
  author,
  getCardTags,
  cardViewMode,
  isSelected,
  batchMode,
  sameNameCount,
  onSelect,
  onOpenDetail,
  onExport,
  onDelete
}) => {
  const cover = useCardCover(card);
  const allTags = getCardTags(card);
  const tags = allTags.slice(0, 3);
  const activeVerLabel = getPureVersionLabel((card as any).activeVersionLabel, (card.versions?.length || 0) + 1);
  const hasVersions = (card.versionCount ?? card.versions?.length ?? 0) > 0;

  return (
    <div
      onClick={() => {
        if (batchMode) onSelect(card.id);
        else onOpenDetail(card.id, 'overview');
      }}
      className={`sub-block-card group bg-[var(--card-solid-bg)] border-none rounded-none overflow-hidden cursor-pointer transition-all flex flex-col relative ${
        isSelected
          ? 'ring-2 ring-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))]'
          : 'hover:brightness-95'
      }`}
    >
      {/* Card Cover Image */}
      <div className="aspect-[2/3] w-full bg-black/5 dark:bg-white/5 border-none relative overflow-hidden flex items-center justify-center">
        {cover ? (
          <img 
            src={cover || undefined}
            alt={name} 
            loading="lazy" 
            decoding="async"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="text-[10px] text-zinc-400 flex flex-col items-center gap-0.5">
            <ImageIcon className="w-5 h-5 opacity-40" />
            <span>无封面</span>
          </div>
        )}
        
        {/* Version & Overlay Badges */}
        {cardViewMode === 'grid-3' && (
          <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
            <span
              onClick={(e) => {
                if (hasVersions) {
                  e.stopPropagation();
                  onOpenDetail(card.id, 'versions');
                }
              }}
              title={hasVersions ? `当前生效版本: ${activeVerLabel} (共有 ${card.versions!.length + 1} 个版本，点击查看历史)` : `当前生效版本: ${activeVerLabel}`}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${
                hasVersions
                  ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-xs transition-colors flex items-center gap-0.5'
                  : 'bg-black/70 text-white'
              }`}
            >
              {hasVersions && <History className="w-2.5 h-2.5" />}
              {activeVerLabel}
            </span>
            {sameNameCount > 1 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail(card.id, 'links');
                }}
                title={`检测到同名不同卡面 (共 ${sameNameCount} 张变体)，点击查看关联`}
                className="px-1.5 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[8px] font-bold flex items-center gap-0.5 shadow-xs transition-colors"
              >
                <Layers className="w-2.5 h-2.5" />
                {sameNameCount}卡面
              </span>
            )}
          </div>
        )}

        {/* Batch Selection Checkbox */}
        {batchMode && (
          <div className="absolute top-1.5 left-1.5 z-10">
            {isSelected ? (
              <div className="w-4.5 h-4.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md ring-1.5 ring-white dark:ring-zinc-900 transition-transform scale-105">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            ) : (
              <div className="w-4.5 h-4.5 rounded-full bg-black/40 backdrop-blur-xs border-1.5 border-white/80 hover:border-white transition-colors shadow-xs" />
            )}
          </div>
        )}
      </div>

      {/* Card Info Details */}
      {cardViewMode === 'grid-3' && (
        <div className="p-2 flex-1 flex flex-col justify-between space-y-1">
          <div>
            <div className="flex items-center justify-between gap-1.5 w-full">
              <h3 className="text-[10px] font-bold truncate text-[var(--text-serif,#1A232D)] leading-tight flex-1 min-w-0" title={name}>
                {name}
              </h3>
              <span 
                className="px-1.5 py-0.5 text-[9px] bg-black/6 dark:bg-white/10 text-[var(--dim,#647382)] rounded-none flex-shrink-0 leading-none whitespace-nowrap font-medium"
                title={`分组: ${card.group || '默认'}`}
              >
                {card.group || '默认'}
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#647382)] truncate mt-0.5">
              by {author}
            </p>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t: string, idx: number) => (
                <span key={idx} className="px-1 py-0.5 text-[8px] bg-black/5 dark:bg-white/10 text-[var(--dim,#647382)] rounded-none leading-none whitespace-nowrap">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Action buttons */}
      {!batchMode && cardViewMode === 'grid-3' && (
        <div className="p-2 pt-0 flex gap-1 border-t border-[var(--line-soft,rgba(96,126,149,0.12))]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(card.id, 'overview');
            }}
            className="flex-1 py-1 text-[10px] font-medium rounded-none hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text,#3E3A39)] cursor-pointer transition-colors"
          >
            查看
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExport(card);
            }}
            className="flex-1 py-1 text-[10px] font-medium rounded-none hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text,#3E3A39)] cursor-pointer transition-colors"
          >
            导出
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card.id);
            }}
            className="px-2 py-1 text-[10px] font-medium rounded-none hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
});

export const STCardsSection = React.memo<STCardsSectionProps>(({
  cardViewMode,
  setCardViewMode,
  appData,
  updateAppData,
  searchQuery,
  setSearchQuery,
  cardSortOrder,
  setCardSortOrder,
  currentGroup,
  setCurrentGroup,
  cardTagFilter,
  setCardTagFilter,
  selectedCardIds,
  setSelectedCardIds,
  batchMode,
  setBatchMode,
  setDetailCardId,
  setDetailTab,
  setShowBatchMoveModal,
  uploadFileInputRef,
  handleFileUpload,
  handleDeleteCard,
  handleBatchDeleteCards,
  handleBatchExportCards,
  exportAsPng,
  exportAsJson,
  showToast,
  getCardDisplayName,
  getCardDescription,
  getCardCreator,
  getCardTags,
  cardVisibleCount,
  setCardVisibleCount,
  CARD_PAGE_SIZE,
  cardLoadMoreRef,
  filteredCards,
  visibleFilteredCards,
  onOpenStagingVault,
}) => {
  const [showBatchTagModal, setShowBatchTagModal] = React.useState(false);
  const [showBatchAIRefineModal, setShowBatchAIRefineModal] = useState(false);

  const customTags = appData.cardTags || [];
  
  // Memoize built-in tags to prevent scanning all card tags on every single render
  const builtInTags = useMemo(() => {
    return Array.from(new Set(appData.cards.flatMap(c => getCardTags(c))));
  }, [appData.cards, getCardTags]);

  const stagedCount = appData.stagedDuplicateCards?.length || 0;

  // Pre-calculate O(1) sameName count map to eliminate O(N*M) heavy nested filter in card list
  const sameNameCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of appData.cards) {
      const name = getCardDisplayName(c).trim().toLowerCase();
      if (name) {
        map.set(name, (map.get(name) || 0) + 1);
      }
    }
    return map;
  }, [appData.cards, getCardDisplayName]);

  // Pre-calculate O(1) group count map
  const groupCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of appData.cards) {
      const rawG = c.group ? c.group.trim() : '';
      const g = (!rawG || rawG === '默认' || rawG === '未分组') ? '默认' : rawG;
      map.set(g, (map.get(g) || 0) + 1);
    }
    return map;
  }, [appData.cards]);

  // Set-based lookup for O(1) selection check
  const selectedCardSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);

  const handleCardSelect = useCallback((id: string) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  }, [setSelectedCardIds]);

  const handleOpenDetail = useCallback((id: string, tab: string = 'overview') => {
    setDetailCardId(id);
    setDetailTab(tab);
  }, [setDetailCardId, setDetailTab]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 w-full">
      {/* 批量操作悬浮卡片：纯悬浮覆盖层，点击选择直接悬浮浮于页面之上，不向下挤压页面内容 */}
      {batchMode && (
        <ManagementBatchOverlay >
          <ManagementBatchBar>
            {/* 第一行：左侧文字计数（字体比按键字体小一号，呈灰黑色），右侧叉号退出按钮 */}
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                已选 {selectedCardIds.length} 项
              </span>
              <ActionButton onClick={() => {
                  setBatchMode(false);
                  setSelectedCardIds([]);
                }} aria-label="关闭选择" action="close" context="icon"><X className="w-3.5 h-3.5" /></ActionButton>
            </div>

                        {/* 第二行：操作按键，按键之间的左右间距与上下间距压缩紧凑 */}
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              {/* 全选 / 取消 */}
              <ActionButton type="button" onClick={() => {
                  if (selectedCardIds.length === filteredCards.length && filteredCards.length > 0) {
                    setSelectedCardIds([]);
                  } else {
                    setSelectedCardIds(filteredCards.map((c: any) => c.id));
                  }
                }} action="select" context="batch">
                {selectedCardIds.length === filteredCards.length && filteredCards.length > 0 ? '取消' : '全选'}
              </ActionButton>
              {/* 反选 */}
              <ActionButton type="button" onClick={() => {
                  const currentSet = new Set(selectedCardIds);
                  const inversed = filteredCards.filter((c: any) => !currentSet.has(c.id)).map((c: any) => c.id);
                  setSelectedCardIds(inversed);
                }} action="invert" context="batch">
                反选
              </ActionButton>
              {/* 移动 */}
              <ActionButton type="button" disabled={selectedCardIds.length === 0} onClick={() => setShowBatchMoveModal(true)} action="move" context="batch" tone="primary">
                移动
              </ActionButton>
              {/* 标签 */}
              <ActionButton type="button" disabled={selectedCardIds.length === 0} onClick={() => setShowBatchTagModal(true)} action="tag" context="batch" tone="primary">
                标签
              </ActionButton>
              {/* 导出 */}
              <ActionButton type="button" disabled={selectedCardIds.length === 0} onClick={handleBatchExportCards} action="export" context="batch" tone="primary">
                导出
              </ActionButton>
              {/* AI精修 */}
              <ActionButton type="button" disabled={selectedCardIds.length === 0} onClick={() => setShowBatchAIRefineModal(true)} action="custom" context="batch" tone="primary">
                AI精修
              </ActionButton>
              {/* 删除 */}
              <ActionButton type="button" disabled={selectedCardIds.length === 0} onClick={handleBatchDeleteCards} action="delete" context="batch" tone="danger">
                删除
              </ActionButton>
            </div>
          </ManagementBatchBar>
        </ManagementBatchOverlay>
      )}

      {/* Sub-interface Header Banner with Formats & Action Buttons (压缩简介高度) */}
                  <ManagementHeader data-design-id="st-cards-header-banner"
        icon={<>
            <Sparkles className="w-4 h-4" />
          </>}
        title={<>酒馆角色卡</>}
        badge={<>
                格式：.png / .json / .webp
              </>}
        description={<>
              管理与编辑 SillyTavern 格式角色卡，支持多选批量上传、深度解析与版本控制
            </>}
        actions={<>
          <ActionButton type="button" onClick={() => uploadFileInputRef.current?.click()} title="导入酒馆角色卡 (.png, .json, .webp)" action="import" context="toolbar" tone="primary">
            <Upload className="w-3 h-3" />
            <span>导入角色卡</span>
          </ActionButton>
          {stagedCount > 0 && (
            <ActionButton type="button" onClick={onOpenStagingVault} title="暂存待决策角色卡" action="custom" context="toolbar" tone="primary">
              <AlertCircle className="w-3 h-3" />
              <span>暂存处 ({stagedCount})</span>
            </ActionButton>
          )}
        </>}
      />
      {/* Staging Vault Notice Banner (if any duplicate cards are staged) */}
      {stagedCount > 0 && (
        <div className="flex items-center justify-between p-3.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-200 text-xs shadow-sm backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">暂存处中有 {stagedCount} 张待决策角色卡</span>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-300/80 ml-2 hidden sm:inline">
                本地导入时检测到与现有角色重名或内容一致的卡片，已放入暂存处供您多选导入或放弃。
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenStagingVault}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0 cursor-pointer"
          >
            <span>前往查看与处理</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag and Drop Upload Zone: 虚线框，纯色背景 */}
      <div
        onClick={() => uploadFileInputRef.current?.click()}
        onDragOver={(e: any) => e.preventDefault()}
        onDrop={(e: any) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-[var(--line-focus,rgba(96,126,149,0.5))] rounded-none py-3.5 px-5 text-center cursor-pointer transition-all bg-[var(--card-solid-bg,#E8EAEB)] hover:brightness-95 mb-4"
        style={{ backgroundColor: 'var(--card-solid-bg, #E8EAEB)' }}
      >
        <p className="text-xs font-semibold text-[var(--text,#3E3A39)]">
          拖放角色卡文件到此处，或点击上传文件
        </p>
        <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5">
          支持 .png / .json / .webp 格式 SillyTavern 角色卡，支持多选批量上传
        </p>
      </div>

      {/* Toolbar & Search Bar */}
      <ManagementToolbarFrame>
        <ManagementSearch type="text" value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} placeholder="搜索角色名字、作者、标签或性格描述..." />

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <CategoryFilterDropdown 
            groups={appData.groups}
            currentGroup={currentGroup}
            onSelectGroup={setCurrentGroup}
            allGroupName="全部分组"
          />
          <TagFilterDropdown
            builtInTags={builtInTags}
            customTags={customTags}
            selectedTags={cardTagFilter}
            onChange={setCardTagFilter}
          />
          <CustomSelect
            value={cardSortOrder}
            onChange={(val: any) => setCardSortOrder(val)}
            options={[
              { value: 'default', label: '默认排序' },
              { value: 'az', label: '名称 A-Z' },
              { value: 'za', label: '名称 Z-A' },
              { value: 'newest', label: '最新添加' },
              { value: 'oldest', label: '最早添加' },
            ]}
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            className="h-[30px] px-2.5 rounded-lg bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer active:bg-black/10 dark:active:bg-white/15"
          />
          <ViewModeDropdown viewMode={cardViewMode} setViewMode={setCardViewMode} />
          
          <button
            type="button"
            onClick={() => {
              setBatchMode((prev) => {
                if (prev) setSelectedCardIds([]);
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
        <div className="group-category-container bg-[var(--group-card-bg)] border-none rounded-none p-2 w-full transition-colors shadow-none">
          <GroupCategoryBar 
            groups={appData.groups} 
            currentGroup={currentGroup} 
            onSelectGroup={setCurrentGroup} 
            getCount={(g: string) => (g === '未分组' || g === '默认') ? (groupCountMap.get('默认') || 0) : (groupCountMap.get(g) || 0)} 
            totalCount={appData.cards.length} 
            allGroupName="全部分组"
          />
        </div>
      </ManagementToolbarFrame>

      {/* Cards Grid Display */}
      {filteredCards.length === 0 ? (
        <div className="sub-block-card text-center py-20 bg-[var(--card-solid-bg)] border-none rounded-none p-8 transition-colors">
          <p className="text-xs text-[var(--faint,#a1a1aa)]">
            {searchQuery ? '未查找到匹配的角色卡' : '该分组下暂无角色卡，拖放文件到上方框内进行上传'}
          </p>
        </div>
      ) : (
        <ManagementGrid viewMode={cardViewMode} className={`${managementViewClass(cardViewMode)} gap-2 sm:gap-2.5 md:gap-3`}>
          {visibleFilteredCards.map((card) => {
            const name = getCardDisplayName(card);
            const author = getCardCreator(card);
            const desc = getCardDescription(card);
            const isSelected = selectedCardSet.has(card.id);
            const charNameLower = (name || '').trim().toLowerCase();
            const sameNameCount = sameNameCountMap.get(charNameLower) || 1;

            if (cardViewMode === 'list') {
              return (
                <MemoizedCardListItem
                  key={card.id}
                  card={card}
                  name={name}
                  author={author}
                  desc={desc}
                  getCardTags={getCardTags}
                  isSelected={isSelected}
                  batchMode={batchMode}
                  sameNameCount={sameNameCount}
                  onSelect={handleCardSelect}
                  onOpenDetail={handleOpenDetail}
                />
              );
            }

            return (
              <MemoizedCardGridItem
                key={card.id}
                card={card}
                name={name}
                author={author}
                getCardTags={getCardTags}
                cardViewMode={cardViewMode}
                isSelected={isSelected}
                batchMode={batchMode}
                sameNameCount={sameNameCount}
                onSelect={handleCardSelect}
                onOpenDetail={handleOpenDetail}
                onExport={exportAsPng || exportAsJson}
                onDelete={handleDeleteCard}
              />
            );
          })}
        </ManagementGrid>
      )}

      <ManagementPagination total={filteredCards.length} page={Math.ceil(cardVisibleCount / CARD_PAGE_SIZE) - 1} pageSize={CARD_PAGE_SIZE} onPageChange={page => setCardVisibleCount((page + 1) * CARD_PAGE_SIZE)} unit="张" label="角色卡分页" />

      <BatchTagModal
        isOpen={showBatchTagModal}
        onClose={() => setShowBatchTagModal(false)}
        availableTags={appData.cardsTags || []}
        selectedCount={selectedCardIds.length}
        onApply={(tagsToAdd: string[]) => {
          updateAppData((prev: any) => {
            const list = prev.cards || [];
            const selectedSet = new Set(selectedCardIds);
            const newList = list.map((item: any) => {
              if (selectedSet.has(item.id)) {
                const existingTags = item.customTags || [];
                const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
                return { ...item, customTags: newTags };
              }
              return item;
            });
            
            const globalTags = prev.cardsTags || [];
            const updatedGlobalTags = Array.from(new Set([...globalTags, ...tagsToAdd]));
            
            return { ...prev, cards: newList, cardsTags: updatedGlobalTags };
          });
          setShowBatchTagModal(false);
          setSelectedCardIds([]);
          showToast(`成功为 ${selectedCardIds.length} 个项目添加 ${tagsToAdd.length} 个标签`, 'success');
        }}
      />

      {/* Batch AI Refine Modal */}
      <BatchAIRefineModal
        isOpen={showBatchAIRefineModal}
        onClose={() => setShowBatchAIRefineModal(false)}
        selectedCardIds={selectedCardIds}
        appData={appData}
        updateAppData={updateAppData}
        showToast={showToast}
      />
    </div>
  );
}, (prev, next) => {
  return prev.cardViewMode === next.cardViewMode &&
         prev.appData === next.appData &&
         prev.searchQuery === next.searchQuery &&
         prev.cardSortOrder === next.cardSortOrder &&
         prev.currentGroup === next.currentGroup &&
         prev.cardTagFilter === next.cardTagFilter &&
         prev.selectedCardIds === next.selectedCardIds &&
         prev.batchMode === next.batchMode &&
         prev.cardVisibleCount === next.cardVisibleCount &&
         prev.filteredCards === next.filteredCards &&
         prev.visibleFilteredCards === next.visibleFilteredCards;
});

