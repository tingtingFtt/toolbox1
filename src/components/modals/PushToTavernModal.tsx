import React, { useState, useMemo } from 'react';
import { CustomSelect } from '../ui/CustomSelect';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { BaseCard } from '../ui/BaseCard';
import {
  X,
  Send,
  Download,
  Search,
  CheckSquare,
  Square,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Tag,
  Sparkles,
  ShieldAlert,
  Check,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { CardEntry, AppData } from '../../types';
import { getCardDisplayName, getCardCreator, generateCardPngBlob } from '../../utils';
import { pushCardToSillyTavern, packageCardsForSillyTavern } from '../../utils/sillyTavernApi';
import { compareCards } from '../../utils/diffEngine';
import { isFixedSystemTag, isTavernCard } from '../../utils/tagUtils';

interface PushToTavernModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  updateAppData?: React.Dispatch<React.SetStateAction<AppData>>;
  serverUrl: string;
  apiKey?: string;
  isOnline: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PushToTavernModal: React.FC<PushToTavernModalProps> = ({
  isOpen,
  onClose,
  appData,
  updateAppData,
  serverUrl,
  apiKey,
  isOnline,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [onlyShowPushable, setOnlyShowPushable] = useState(true);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState<{ current: number; total: number; cardName: string } | null>(null);

  const cards = appData.cards || [];

  // Evaluate Tavern Push Eligibility for all cards
  const pushEligibilityMap = useMemo(() => {
    const map = new Map<string, { canPush: boolean; reason?: string }>();

    // Separate tavern cards in current vault
    const tavernCardsInVault = cards.filter(c => isTavernCard(c));

    for (const card of cards) {
      // Rule 1: A card that already has Tavern tag cannot be pushed/imported to Tavern
      if (isTavernCard(card)) {
        map.set(card.id, {
          canPush: false,
          reason: '已带有酒馆标签（已在酒馆或来自酒馆），不可重复导入'
        });
        continue;
      }

      // Rule 2: If a local card or its version matches an existing Tavern card, cannot import
      const sameNameTavernCards = tavernCardsInVault.filter(
        tc => (tc.name || '').trim().toLowerCase() === (card.name || '').trim().toLowerCase()
      );

      let hasIdenticalMatch = false;
      let matchedReason = '';

      if (sameNameTavernCards.length > 0) {
        for (const tc of sameNameTavernCards) {
          const diff = compareCards(card, tc);
          if (diff.status === 'identical') {
            hasIdenticalMatch = true;
            matchedReason = `当前卡面版本与酒馆卡 [${tc.name}] 完全一致，不可重复导入`;
            break;
          }
          if (tc.versions && tc.versions.length > 0) {
            for (const ver of tc.versions) {
              if (ver.data && compareCards(card, ver.data).status === 'identical') {
                hasIdenticalMatch = true;
                matchedReason = `内容与酒馆卡 [${tc.name}] 的历史版本 (${ver.versionLabel || 'v' + ver.versionNumber}) 完全一致，无需导入`;
                break;
              }
            }
          }
          if (hasIdenticalMatch) break;
        }
      }

      if (hasIdenticalMatch) {
        map.set(card.id, {
          canPush: false,
          reason: matchedReason
        });
        continue;
      }

      // Eligible to push
      map.set(card.id, { canPush: true });
    }

    return map;
  }, [cards]);

  const groups = useMemo(() => {
    const s = new Set<string>();
    cards.forEach(c => {
      if (c.group) s.add(c.group);
    });
    return Array.from(s);
  }, [cards]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    cards.forEach(c => {
      (c.customTags || []).forEach(t => t && s.add(t));
    });
    return Array.from(s);
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const eligibility = pushEligibilityMap.get(card.id);
      if (onlyShowPushable && !eligibility?.canPush) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      const nameMatch = !q || (card.name || '').toLowerCase().includes(q) ||
        (card.author || '').toLowerCase().includes(q) ||
        (card.customTags || []).some(t => t.toLowerCase().includes(q));
      const groupMatch = selectedGroup === 'all' || card.group === selectedGroup;
      const tagMatch = selectedTag === 'all' || (card.customTags || []).includes(selectedTag);
      return nameMatch && groupMatch && tagMatch;
    });
  }, [cards, searchQuery, selectedGroup, selectedTag, onlyShowPushable, pushEligibilityMap]);

  const [showFolderFallback, setShowFolderFallback] = useState(false);
  const [lastErrorMsg, setLastErrorMsg] = useState('');

  if (!isOpen) return null;

  const pushableFilteredCards = filteredCards.filter(c => pushEligibilityMap.get(c.id)?.canPush);


  
  const handlePushToFolder = async () => {
    if (selectedCardIds.size === 0) {
      showToast?.('请先勾选需要推送的角色卡', 'error');
      return;
    }
    const selectedCards = cards.filter(c => selectedCardIds.has(c.id));
    
    try {
      if (!('showDirectoryPicker' in window)) {
         showToast?.('当前浏览器不支持文件夹选择，请使用导出为 ZIP', 'error');
         return;
      }
      
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setIsPushing(true);
      setShowFolderFallback(false);
      let successCount = 0;
      let failCount = 0;
      const successfulCardIds = new Set<string>();

      for (let i = 0; i < selectedCards.length; i++) {
        const card = selectedCards[i];
        setPushProgress({ current: i + 1, total: selectedCards.length, cardName: card.name });
        try {
           const pngBlob = await generateCardPngBlob(card, appData);
           const safeName = (getCardDisplayName(card) || 'Untitled').replace(/[\\/:*?"<>|]/g, '_');
           const fileHandle = await dirHandle.getFileHandle(`${safeName}.png`, { create: true });
           const writable = await fileHandle.createWritable();
           await writable.write(pngBlob);
           await writable.close();
           successCount++;
           successfulCardIds.add(card.id);
        } catch(e) {
           console.error(e);
           failCount++;
        }
      }
      
      if (updateAppData && successfulCardIds.size > 0) {
        updateAppData(prev => ({
          ...prev,
          cards: (prev.cards || []).map(c => {
            if (successfulCardIds.has(c.id)) {
              const curTags = c.customTags || [];
              const nextTags = Array.from(new Set([
                ...curTags.filter(t => t !== '本地' && t !== '本地导入'),
                '酒馆'
              ]));
              return {
                ...c,
                customTags: nextTags,
                source: 'tavern'
              };
            }
            return c;
          })
        }));
      }

      setIsPushing(false);
      setPushProgress(null);
      if (successCount > 0) {
        showToast?.(`已成功推入 ${successCount} 张角色卡至本地文件夹，并自动打上【酒馆】标签${failCount > 0 ? ` (${failCount} 张失败)` : ''}`, 'success');
        onClose();
      } else {
        showToast?.('推入文件夹失败', 'error');
      }
      
    } catch (e: any) {
      setIsPushing(false);
      setPushProgress(null);
      if (e.name !== 'AbortError') {
         showToast?.(`文件夹推入失败: ${e.message}`, 'error');
      }
    }
  };

  const handleToggleSelectAll = () => {
    const pushableIds = pushableFilteredCards.map(c => c.id);
    const allPushableSelected = pushableIds.length > 0 && pushableIds.every(id => selectedCardIds.has(id));

    if (allPushableSelected) {
      const next = new Set(selectedCardIds);
      pushableIds.forEach(id => next.delete(id));
      setSelectedCardIds(next);
    } else {
      const next = new Set(selectedCardIds);
      pushableIds.forEach(id => next.add(id));
      setSelectedCardIds(next);
    }
  };

  const handleSelectLocalOnlyCards = () => {
    const eligibleCards = cards.filter(c => pushEligibilityMap.get(c.id)?.canPush);
    setSelectedCardIds(new Set(eligibleCards.map(c => c.id)));
    if (eligibleCards.length > 0) {
      showToast?.(`已智能勾选 ${eligibleCards.length} 张待导入酒馆的本地角色卡`, 'info');
    } else {
      showToast?.('当前暂无可导入酒馆的本地角色卡', 'info');
    }
  };

  const handleToggleCard = (card: CardEntry) => {
    const eligibility = pushEligibilityMap.get(card.id);
    if (!eligibility?.canPush) {
      showToast?.(eligibility?.reason || '该角色卡无法导入酒馆', 'error');
      return;
    }

    const next = new Set(selectedCardIds);
    if (next.has(card.id)) {
      next.delete(card.id);
    } else {
      next.add(card.id);
    }
    setSelectedCardIds(next);
  };

  const handlePushOnline = async () => {
    if (selectedCardIds.size === 0) {
      showToast?.('请先勾选需要推送的本地角色卡', 'error');
      return;
    }

    const selectedCards = cards.filter(c => selectedCardIds.has(c.id));
    setIsPushing(true);
    let successCount = 0;
    let failCount = 0;
    let lastError = '';
    const successfulCardIds = new Set<string>();

    for (let i = 0; i < selectedCards.length; i++) {
      const card = selectedCards[i];
      setPushProgress({ current: i + 1, total: selectedCards.length, cardName: card.name });
      const res = await pushCardToSillyTavern(serverUrl, card, appData, apiKey);
      if (res.success) {
        successCount++;
        successfulCardIds.add(card.id);
      } else {
        failCount++;
        lastError = res.message;
      }
    }

    // Rule: Local card or version imported to Tavern must be stamped with '酒馆' tag
    if (updateAppData && successfulCardIds.size > 0) {
      updateAppData(prev => ({
        ...prev,
        cards: (prev.cards || []).map(c => {
          if (successfulCardIds.has(c.id)) {
            const curTags = c.customTags || [];
            const nextTags = Array.from(new Set([
              ...curTags.filter(t => t !== '本地' && t !== '本地导入'),
              '酒馆'
            ]));
            return {
              ...c,
              customTags: nextTags,
              source: 'tavern'
            };
          }
          return c;
        })
      }));
    }

    setIsPushing(false);
    setPushProgress(null);

    if (successCount > 0) {
      showToast?.(`已成功推送 ${successCount} 张角色卡至酒馆，并已自动打上【酒馆】标签${failCount > 0 ? ` (${failCount} 张失败: ${lastError})` : ''}`, 'success');
      onClose();
    } else {
      setLastErrorMsg(lastError || '请检查酒馆服务连接与跨域设置');
      setShowFolderFallback(true);
    }
  };

  const handleExportZip = async () => {
    if (selectedCardIds.size === 0) {
      showToast?.('请先勾选需要导出的角色卡', 'error');
      return;
    }
    const selectedCards = cards.filter(c => selectedCardIds.has(c.id));
    try {
      await packageCardsForSillyTavern(selectedCards, appData);
      showToast?.(`已成功导出 ${selectedCards.length} 张角色卡为酒馆格式压缩包`, 'success');
    } catch (e: any) {
      showToast?.(`导出失败: ${e.message}`, 'error');
    }
  };

  return (
    <div data-design-id="push-tavern-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div data-design-id="push-tavern-modal-panel" className="modal-panel modal-card bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {showFolderFallback && (
          <div className="absolute inset-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-6 rounded-2xl animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 sm:p-6 shadow-xl max-w-sm w-full flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">网络推入失败</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2" title={lastErrorMsg}>{lastErrorMsg}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-3 font-medium">您可以选择使用本地文件夹推入，直接将角色卡写入酒馆目录。</p>
              </div>
              <div className="flex w-full gap-2 pt-2">
                <BaseButton variant="secondary" className="flex-1" onClick={() => setShowFolderFallback(false)}>
                  取消
                </BaseButton>
                <BaseButton variant="primary" className="flex-1 flex items-center justify-center gap-1.5" onClick={handlePushToFolder}>
                  <FolderArchive className="w-4 h-4" />
                  <span>选择文件夹</span>
                </BaseButton>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div data-design-id="push-tavern-header" className="px-4 sm:px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1 rounded-lg bg-[var(--btn-primary-bg,rgba(217,119,6,0.1))] text-[var(--accent,#D97706)] shrink-0">
              <Send className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 leading-none truncate">
                推送本地角色卡至酒馆
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 leading-none">
                  严格防重导入限制
                </span>
                <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400">
                  目标: <span className="font-mono text-[var(--accent,#D97706)]">{serverUrl}</span>
                  {isOnline ? (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">● 在线可用</span>
                  ) : (
                    <span className="ml-1 text-zinc-400 font-medium">○ 离线 (可导出压缩包)</span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
        </div>

        {/* Filter & Search Bar */}
        <div data-design-id="push-tavern-filter-bar" className="p-2 sm:p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-1.5 bg-zinc-50/50 dark:bg-zinc-900">
          {/* Row 1: Search Bar (Full width) */}
          <div className="relative w-full">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              data-design-id="push-tavern-search-input"
              type="text"
              placeholder="搜索角色名、作者或标签..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-6.5 pr-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-[11px] outline-none focus:border-[var(--accent)] h-6 min-h-0 max-h-6 py-0 leading-none"
            />
          </div>

          {/* Row 2: 3 Filter Controls in ONE row, compact width for selects */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full">
            <CustomSelect
              value={selectedGroup}
              onChange={setSelectedGroup}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 text-[11px] text-zinc-700 dark:text-zinc-300 outline-none w-[90px] sm:w-[110px] shrink-0 !h-6 !min-h-0 !max-h-6 flex items-center justify-center gap-0.5 truncate py-0 leading-none"
              options={[{value: 'all', label: '全部分组'}, ...groups.map(g => ({value: g, label: g}))]}
            />

            <CustomSelect
              value={selectedTag}
              onChange={setSelectedTag}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 text-[11px] text-zinc-700 dark:text-zinc-300 outline-none w-[90px] sm:w-[110px] shrink-0 !h-6 !min-h-0 !max-h-6 flex items-center justify-center gap-0.5 truncate py-0 leading-none"
              options={[{value: 'all', label: '全部标签'}, ...allTags.map(t => ({value: t, label: t}))]}
            />

            <button
              data-design-id="push-tavern-filter-pushable-btn"
              type="button"
              onClick={() => setOnlyShowPushable(!onlyShowPushable)}
              className={`flex-1 min-w-0 px-2 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer !h-6 !min-h-0 !max-h-6 py-0 leading-none whitespace-nowrap truncate ${
                onlyShowPushable
                  ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold'
                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">{onlyShowPushable ? '只看可导入' : '查看全部卡片'}</span>
            </button>
          </div>

          {/* Row 3: Selection and stats toolbar */}
          <div className="flex items-center justify-between gap-2 pt-0.5 mt-0.5 border-t border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-1.5">
              <button
                data-design-id="push-tavern-smart-select-btn"
                type="button"
                onClick={handleSelectLocalOnlyCards}
                className="px-2 py-0 rounded-md border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[9.5px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 cursor-pointer h-5 min-h-0 max-h-5 leading-none transition-colors"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>智能选待导卡</span>
              </button>

              <button
                data-design-id="push-tavern-select-all-btn"
                type="button"
                onClick={handleToggleSelectAll}
                disabled={pushableFilteredCards.length === 0}
                className="px-2 py-0 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[9.5px] font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer disabled:opacity-40 h-5 min-h-0 max-h-5 leading-none transition-colors"
              >
                {pushableFilteredCards.length > 0 && pushableFilteredCards.every(c => selectedCardIds.has(c.id)) ? (
                  <CheckSquare className="w-2.5 h-2.5 text-[var(--accent)] shrink-0" />
                ) : (
                  <Square className="w-2.5 h-2.5 shrink-0" />
                )}
                <span>全选可导卡</span>
              </button>
            </div>
            <span className="text-[9.5px] text-zinc-500 font-medium">已选 {selectedCardIds.size} 项</span>
          </div>
        </div>

        {/* Card List Grid */}
        <div data-design-id="push-tavern-card-grid" className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {filteredCards.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
              <span>{onlyShowPushable ? '没有检测到可导入酒馆的本地角色卡（酒馆标签卡及版本一致卡已自动排除）' : '没有找到符合条件的角色卡'}</span>
              {onlyShowPushable && (
                <BaseButton
                  designId="push-tavern-show-all-empty-btn"
                  type="button"
                  onClick={() => setOnlyShowPushable(false)}
                  className="mt-1 text-xs text-blue-600 dark:text-blue-400 underline cursor-pointer"
                >
                  点击查看全部角色卡状态
                </BaseButton>
              )}
            </div>
          ) : (
            filteredCards.map(card => {
              const eligibility = pushEligibilityMap.get(card.id) || { canPush: true };
              const isSelected = selectedCardIds.has(card.id);
              const name = getCardDisplayName(card);
              const creator = getCardCreator(card);

              return (
                <BaseCard
                  key={card.id}
                  designId="push-tavern-card-item"
                  nested
                  onClick={() => handleToggleCard(card)}
                  className={`relative p-2.5 flex flex-col justify-between group ${
                    !eligibility.canPush
                      ? 'opacity-60 bg-zinc-100/50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
                      : isSelected
                      ? 'border-[var(--accent,#D97706)] bg-[var(--accent,#D97706)]/5 shadow-xs cursor-pointer'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer'
                  }`}
                  title={!eligibility.canPush ? eligibility.reason : undefined}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-12 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {card.coverImage ? (
                        <img src={card.coverImage} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {name}
                      </h4>
                      {creator && <p className="text-[10px] text-zinc-400 truncate mt-0.5">{creator}</p>}
                      
                      {card.group && (
                        <span className="inline-block mt-0.5 px-1 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded text-[8.5px] truncate max-w-full leading-tight">
                          {card.group}
                        </span>
                      )}

                      {/* Status / Tags */}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {!eligibility.canPush ? (
                          <span className="px-1 py-0.2 rounded text-[8px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900/60 leading-tight">
                            {eligibility.reason?.includes('标签') ? '已在酒馆' : '版本一致'}
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 rounded text-[8px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900/60 leading-tight">
                            可导入酒馆
                          </span>
                        )}

                        {card.customTags && card.customTags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className={`px-1 py-0.2 rounded text-[8px] truncate max-w-[60px] leading-tight ${
                              tag.includes('酒馆')
                                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-medium'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    {!eligibility.canPush ? (
                      <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                        ✕
                      </div>
                    ) : isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--accent,#D97706)] fill-current bg-white dark:bg-zinc-900 rounded-full" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400" />
                    )}
                  </div>
                </BaseCard>
              );
            })
          )}
        </div>

        {/* Progress Bar during pushing */}
        {isPushing && pushProgress && (
          <div data-design-id="push-tavern-progress" className="p-3 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800/50 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              <span>正在推送 ({pushProgress.current}/{pushProgress.total}): {pushProgress.cardName}</span>
            </div>
            <div className="w-24 bg-amber-200 dark:bg-amber-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full transition-all duration-200"
                style={{ width: `${(pushProgress.current / pushProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div data-design-id="push-tavern-footer" className="py-2 sm:py-2.5 px-3 sm:px-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:gap-y-1.5 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="text-[10px] sm:text-[10.5px] text-zinc-500 leading-tight">
            已勾选 <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedCardIds.size}</span> 张本地卡片（推送成功后将自动打上「酒馆」固定标签，正常导出不改动标签）
          </div>

          <div className="flex items-center gap-1.5">
            <button
              data-design-id="push-tavern-export-zip-btn"
              type="button"
              onClick={handleExportZip}
              disabled={selectedCardIds.size === 0 || isPushing}
              className="px-3.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 hover:bg-[var(--btn-primary-bg,var(--accent,#D97706))] hover:text-white hover:border-transparent dark:hover:bg-[var(--btn-primary-bg,var(--accent,#D97706))] dark:hover:text-white dark:hover:border-transparent active:scale-[0.98] text-[11px] font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-100 disabled:hover:text-white dark:disabled:hover:text-zinc-900 cursor-pointer h-7 min-h-0 max-h-7 py-0 leading-none"
            >
              <Download className="w-3 h-3 shrink-0" />
              <span>导出酒馆卡包 (.zip)</span>
            </button>

            <button
              data-design-id="push-tavern-confirm-push-btn"
              type="button"
              onClick={handlePushOnline}
              disabled={selectedCardIds.size === 0 || isPushing}
              className="px-3.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 hover:bg-[var(--btn-primary-bg,var(--accent,#D97706))] hover:text-white hover:border-transparent dark:hover:bg-[var(--btn-primary-bg,var(--accent,#D97706))] dark:hover:text-white dark:hover:border-transparent active:scale-[0.98] text-[11px] font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-100 disabled:hover:text-white dark:disabled:hover:text-zinc-900 cursor-pointer h-7 min-h-0 max-h-7 py-0 leading-none"
            >
              {isPushing ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Send className="w-3 h-3 shrink-0" />}
              <span>{isPushing ? '正在推送到酒馆...' : '立即推送到酒馆'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
