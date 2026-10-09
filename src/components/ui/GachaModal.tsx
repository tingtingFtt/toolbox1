import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { CustomSelect } from './CustomSelect';
import {
  Dices,
  Sparkles,
  X,
  RotateCcw,
  ExternalLink,
  Copy,
  Layers,
  Tag,
  User,
  Quote,
  Check,
  History,
  Filter,
  ArrowLeft,
  BookOpen
} from 'lucide-react';
import { AppData, CardEntry } from '../../types';
import {
  getCardDisplayName,
  getCardCreator,
  getCardDescription,
  getCardGreeting,
  getCardTags
} from '../../utils';

interface GachaModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onOpenCardDetail: (cardId: string) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  initialCard?: CardEntry | null;
}

export const GachaModal: React.FC<GachaModalProps> = ({
  isOpen,
  onClose,
  appData,
  onOpenCardDetail,
  showToast,
  initialCard
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('全部');
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentDrawnCard, setCurrentDrawnCard] = useState<CardEntry | null>(null);
  const [multiDrawnCards, setMultiDrawnCards] = useState<CardEntry[]>([]);
  const [drawMode, setDrawMode] = useState<'single' | 'multi'>('single');
  const [drawHistory, setDrawHistory] = useState<CardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'stage' | 'history'>('stage');
  const [poolType, setPoolType] = useState<'st' | 'normal'>('st');
  const [copiedGreeting, setCopiedGreeting] = useState(false);

  // Available groups for pool selection
  const activePoolCards = useMemo<CardEntry[]>(() => {
    if (poolType === 'normal') {
      const list: CardEntry[] = [];
      (appData.normalCards || []).forEach(nc => {
        list.push({
          id: nc.id,
          name: nc.charName || nc.fileName || '未知角色',
          category: nc.category || '普通卡',
          group: nc.category || '普通卡',
          coverImage: nc.coverImage || null,
          description: nc.description || nc.content || '',
          version: '1.0',
          createdAt: nc.createdAt || Date.now(),
          updatedAt: nc.updatedAt || Date.now(),
          rawData: {
            data: {
              name: nc.charName || nc.fileName || '未知角色',
              description: nc.description || nc.content || '',
              first_mes: nc.firstMes || '你好！',
              creator: nc.creator || nc.author || '未知作者',
              tags: nc.tags || [],
              personality: nc.personality || '',
              scenario: nc.scenario || '',
            }
          }
        } as unknown as CardEntry);
      });
      return list;
    } else {
      return [...(appData.cards || [])];
    }
  }, [poolType, appData.cards, appData.normalCards]);

  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    activePoolCards.forEach((c) => {
      if (c.group) groups.add(c.group);
      if (c.category) groups.add(c.category);
    });
    
    if (poolType === 'st') {
      (appData.cardCategories || []).forEach((g: string) => groups.add(g));
    } else {
      (appData.normalCardCategories || []).forEach((g: string) => groups.add(g));
    }
    
    return ['全部', ...Array.from(groups)];
  }, [activePoolCards, poolType, appData.cardCategories, appData.normalCardCategories]);

  // Filtered pool based on selected group
  const cardPool = useMemo(() => {
    if (selectedGroup === '全部') return activePoolCards;
    return activePoolCards.filter((c) => (c.group || c.category || '默认') === selectedGroup);
  }, [activePoolCards, selectedGroup]);

  // Esc key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

// Sync initialCard or draw a card when opened
  useEffect(() => {
    if (isOpen) {
      if (initialCard) {
        setCurrentDrawnCard(initialCard);
        setDrawMode('single');
        setDrawHistory((prev) => {
          if (prev.some((c) => c.id === initialCard.id)) return prev;
          return [initialCard, ...prev].slice(0, 30);
        });
        
        // Auto-detect pool type based on the initial card
        const isNormalCard = initialCard.category === '普通卡' || (appData.normalCards || []).some(nc => nc.id === initialCard.id);
        if (isNormalCard) {
          setPoolType('normal');
        } else {
          setPoolType('st');
        }
      } else if (!currentDrawnCard && cardPool.length > 0) {
        handleSingleDraw();
      }
    }
  }, [isOpen, initialCard]);

  // Single Draw Logic
  const handleSingleDraw = useCallback(() => {
    if (cardPool.length === 0) {
      showToast('当前抽卡池中没有角色卡，请先切换分组或导入卡片', 'error');
      return;
    }

    setDrawMode('single');
    setActiveTab('stage');
    setIsSpinning(true);
    setCopiedGreeting(false);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * cardPool.length);
      const picked = cardPool[randomIndex];
      setCurrentDrawnCard(picked);
      setMultiDrawnCards([]);
      setDrawHistory((prev) => [picked, ...prev.filter((c) => c.id !== picked.id)].slice(0, 30));
      setIsSpinning(false);
    }, 400);
  }, [cardPool, showToast]);

  // 10-Pull Draw Logic
  const handleMultiDraw = useCallback(() => {
    if (cardPool.length === 0) {
      showToast('当前抽卡池中没有角色卡，请先切换分组或导入卡片', 'error');
      return;
    }

    setDrawMode('multi');
    setActiveTab('stage');
    setIsSpinning(true);
    setCopiedGreeting(false);

    setTimeout(() => {
      const drawn: CardEntry[] = [];
      const poolCopy = [...cardPool];
      for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * poolCopy.length);
        drawn.push(poolCopy[randomIndex]);
      }
      setMultiDrawnCards(drawn);
      setCurrentDrawnCard(drawn[0]);
      setDrawHistory((prev) => {
        const newIds = new Set(drawn.map((d) => d.id));
        const filteredOld = prev.filter((c) => !newIds.has(c.id));
        return [...drawn, ...filteredOld].slice(0, 30);
      });
      setIsSpinning(false);
    }, 550);
  }, [cardPool, showToast]);

  const handleCopyGreeting = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedGreeting(true);
    showToast('已复制开场白到剪贴板', 'success');
    setTimeout(() => setCopiedGreeting(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-transparent modal-backdrop animate-in fade-in duration-200"
    >
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div className="modal-panel modal-card relative z-10 w-full max-w-3xl max-h-[94vh] bg-[var(--modal-bg,var(--card-bg,var(--bg-paper,#faf7f2)))] dark:bg-[var(--modal-bg,var(--card-bg,#151518))] border border-[var(--modal-border,var(--line,rgba(217,119,6,0.3)))] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Header - Structured Responsively */}
        <div className="px-3 sm:px-5 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-[var(--btn-secondary-bg,rgba(217,119,6,0.05))] flex-shrink-0 space-y-2.5">
          {/* Row 1: App Title + Close/Return button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--accent,#D97706)] flex items-center justify-center text-white shadow-md shadow-sm flex-shrink-0">
                <Dices className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    命运抽卡 · 随机奇遇
                  </h2>
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--badge-bg,rgba(217,119,6,0.12))] text-[var(--badge-text,var(--accent,#D97706))] text-[9px] font-bold whitespace-nowrap">
                    {cardPool.length} 张卡片
                  </span>
                </div>
              </div>
            </div>

            {/* Back / Close Button - High visibility & Touch friendly */}
            <BaseButton
              type="button"
              size="xs"
              variant="secondary"
              onClick={onClose}
              className="h-[28px] min-h-[28px] max-h-[28px] px-2.5 py-0 rounded-lg text-zinc-700 dark:text-zinc-200 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 flex-shrink-0 cursor-pointer shadow-2xs"
              title="返回/关闭抽卡窗口 (Esc)"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>返回</span>
            </BaseButton>
          </div>

          {/* Row 2: Top Action Row */}
          <div className="flex items-center justify-end gap-2 pt-0.5">
            {/* Pool Type Switcher */}
            <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10px] flex-shrink-0">
              <button
                type="button"
                onClick={() => { setPoolType('st'); setSelectedGroup('全部'); }}
                className={`h-[24px] px-2.5 rounded-md text-[10px] transition-all cursor-pointer flex items-center justify-center ${
                  poolType === 'st'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-2xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
                }`}
              >
                酒馆卡池
              </button>
              <button
                type="button"
                onClick={() => { setPoolType('normal'); setSelectedGroup('全部'); }}
                className={`h-[24px] px-2.5 rounded-md text-[10px] transition-all cursor-pointer flex items-center justify-center ${
                  poolType === 'normal'
                    ? 'bg-white dark:bg-zinc-700 text-amber-600 shadow-2xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
                }`}
              >
                普通卡池
              </button>
            </div>
            
            {/* Tab switch */}
            <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10px] flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('stage')}
                className={`h-[24px] px-2.5 rounded-md text-[10px] transition-all cursor-pointer flex items-center justify-center ${
                  activeTab === 'stage'
                    ? 'bg-white dark:bg-zinc-700 text-[var(--accent,#D97706)] shadow-2xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
                }`}
              >
                抽卡台
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`h-[24px] px-2.5 rounded-md text-[10px] transition-all cursor-pointer flex items-center justify-center ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-zinc-700 text-[var(--accent,#D97706)] shadow-2xs font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
                }`}
              >
                <History className="w-3 h-3 mr-1" />
                历史 ({drawHistory.length})
              </button>
            </div>
          </div>
          
          {/* Row 3: Group Filter */}
          <div className="flex justify-end pt-2">
             <CustomSelect
                value={selectedGroup}
                onChange={(val) => setSelectedGroup(val)}
                options={availableGroups.map((grp) => ({
                  value: grp,
                  label: `分组: ${grp} (${grp === '全部' ? activePoolCards.length : activePoolCards.filter((c) => (c.group || '默认') === grp).length})`
                }))}
                icon={<Filter className="w-3 h-3 text-[var(--accent,#D97706)] flex-shrink-0" />}
                className="px-2.5 py-1 text-[10px] font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xs max-w-[220px] text-zinc-800 dark:text-zinc-200 flex items-center justify-between gap-1.5"
              />
          </div>
        </div>

        {/* Modal Main Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar">
          {activeTab === 'history' ? (
            /* Draw History View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[var(--accent,#D97706)]" />
                  本次抽取记录 ({drawHistory.length})
                </h3>
                {drawHistory.length > 0 && (
                  <BaseButton
                    type="button"
                    onClick={() => setDrawHistory([])}
                    className="text-[10px] text-zinc-400 hover:text-rose-500 transition-colors"
                  >
                    清空历史
                  </BaseButton>
                )}
              </div>

              {drawHistory.length === 0 ? (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  暂无抽取记录，快去掷下命运的骰子吧！
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {drawHistory.map((card, idx) => {
                    const name = getCardDisplayName(card);
                    const author = getCardCreator(card);
                    return (
                      <div
                        key={`${card.id}_${idx}`}
                        onClick={() => {
                          setCurrentDrawnCard(card);
                          setDrawMode('single');
                          setActiveTab('stage');
                        }}
                        className="group p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[var(--line-focus,rgba(217,119,6,0.5))] bg-white dark:bg-zinc-900/60 hover:shadow-md transition-all cursor-pointer flex flex-col"
                      >
                        <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative mb-1.5">
                          {card.coverImage ? (
                            <img
                              src={card.coverImage}
                              alt={name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400">
                              无封面
                            </div>
                          )}
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60  text-[8px] font-bold text-[var(--accent,#D97706)]">
                            #{idx + 1}
                          </div>
                        </div>
                        <div className="text-[10px] font-bold truncate text-zinc-900 dark:text-zinc-100">{name}</div>
                        <div className="text-[8px] text-zinc-400 truncate mt-0.5">{author || '未知作者'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Gacha Stage Area */
            <div>
              {/* Spinning State */}
              {isSpinning ? (
                <div className="py-16 sm:py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--accent,#D97706)] animate-spin flex items-center justify-center shadow-xl shadow-[var(--faint,rgba(217,119,6,0.3))]">
                      <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-[var(--accent,#D97706)] blur-xl opacity-30 animate-pulse pointer-events-none" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-wider">
                      命运卡轮正在旋转…
                    </h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                      正在从「{selectedGroup}」卡池中为您挑选角色
                    </p>
                  </div>
                </div>
              ) : drawMode === 'multi' && multiDrawnCards.length > 0 ? (
                /* Ten-Pull Grid Result */
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--accent,#D97706)] text-white text-[10px] font-bold shadow-xs">
                      十连抽结果
                    </span>
                    <span className="text-[10px] text-zinc-500">点击卡片切换下方详细信息</span>
                  </div>

                  {/* 10-Pull Cards Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {multiDrawnCards.map((card, idx) => {
                      const name = getCardDisplayName(card);
                      const isSelected = currentDrawnCard?.id === card.id;
                      return (
                        <div
                          key={`${card.id}_${idx}`}
                          onClick={() => setCurrentDrawnCard(card)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col relative group ${
                            isSelected
                              ? 'border-[var(--accent,#D97706)] ring-2 ring-[var(--line-focus,rgba(217,119,6,0.5))] bg-[var(--card-inner-bg,rgba(217,119,6,0.05))]'
                              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[var(--line-focus,rgba(217,119,6,0.5))]'
                          }`}
                        >
                          <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative mb-1">
                            {card.coverImage ? (
                              <img
                                src={card.coverImage}
                                alt={name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-400">
                                无封面
                              </div>
                            )}
                            <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/60 text-white text-[8px] font-bold">
                              {idx + 1}
                            </div>
                          </div>
                          <div className="text-[9px] font-bold truncate text-zinc-900 dark:text-zinc-100">{name}</div>
                          <div className="text-[8px] text-zinc-400 truncate">{getCardCreator(card) || '未知'}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Card Inspector for Multi-Pull */}
                  {currentDrawnCard && (
                    <div className="p-3 rounded-xl bg-[var(--card-inner-bg,rgba(217,119,6,0.05))] border border-[var(--line-soft,rgba(217,119,6,0.1))] flex flex-col sm:flex-row items-start gap-3">
                      <div className="w-16 h-22 sm:w-20 sm:h-28 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0 mx-auto sm:mx-0">
                        {currentDrawnCard.coverImage ? (
                          <img src={currentDrawnCard.coverImage} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-400">无封面</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {getCardDisplayName(currentDrawnCard)}
                          </h4>
                          <BaseButton
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenCardDetail(currentDrawnCard.id);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[var(--btn-primary-bg,var(--accent,#D97706))] hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] text-white flex items-center gap-1 transition-colors shadow-xs flex-shrink-0 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            查看完整详情
                          </BaseButton>
                        </div>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {getCardGreeting(currentDrawnCard) || getCardDescription(currentDrawnCard) || '暂无详细介绍'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : currentDrawnCard ? (
                /* Single Draw Card Showcase - Fluid Grid */
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
                  {/* Left Column: Cover Showcase */}
                  <div className="flex-shrink-0 flex flex-col items-center w-40 sm:w-52 md:w-56">
                    <div className="relative group w-full">
                      <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 border-2 border-[var(--line-focus,rgba(217,119,6,0.5))] shadow-xl shadow-[var(--faint,rgba(217,119,6,0.1))] relative">
                        {currentDrawnCard.coverImage ? (
                          <img
                            src={currentDrawnCard.coverImage}
                            alt={getCardDisplayName(currentDrawnCard)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                            <Dices className="w-8 h-8 text-[var(--accent,#D97706)]/50" />
                            <span className="text-[10px]">角色卡暂无封面</span>
                          </div>
                        )}

                        {/* Top Group / Status Badge */}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded-md bg-black/70  text-[var(--accent,#D97706)] text-[8px] font-bold flex items-center gap-1">
                            <Sparkles className="w-2 h-2 text-[var(--accent,#D97706)]" />
                            {currentDrawnCard.group || '默认分组'}
                          </span>
                        </div>
                      </div>

                      {/* Card Ambient Glow Effect */}
                      <div className="absolute -inset-1 rounded-2xl bg-[var(--faint,rgba(217,119,6,0.2))] blur-xl -z-10" />
                    </div>
                  </div>

                  {/* Right Column: Character Details & Actions */}
                  <div className="flex-1 min-w-0 space-y-3 w-full">
                    {/* Title & Author */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {getCardDisplayName(currentDrawnCard)}
                        </h3>
                        {currentDrawnCard.customTags && currentDrawnCard.customTags.includes('同名卡面') && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[8px] font-bold flex items-center gap-0.5">
                            <Layers className="w-2.5 h-2.5" />
                            多卡面
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-zinc-400" />
                          作者: {getCardCreator(currentDrawnCard) || '未知'}
                        </span>
                        {currentDrawnCard.fileName && (
                          <span className="truncate max-w-[160px]">
                            文件: {currentDrawnCard.fileName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {getCardTags(currentDrawnCard).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {getCardTags(currentDrawnCard).slice(0, 6).map((tag, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[8px] sm:text-[9px] font-medium flex items-center gap-0.5"
                          >
                            <Tag className="w-2 h-2 text-zinc-400" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* First Message Snippet */}
                    {getCardGreeting(currentDrawnCard) && (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--card-inner-bg,rgba(217,119,6,0.05))] border border-[var(--line-soft,rgba(217,119,6,0.1))] space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-[var(--badge-text,var(--accent,#D97706))]">
                          <span className="flex items-center gap-1">
                            <Quote className="w-2.5 h-2.5 text-[var(--accent,#D97706)]" />
                            开场白问候语
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyGreeting(getCardGreeting(currentDrawnCard))}
                            className="h-5 px-1.5 py-0 text-[9px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-[var(--accent,#D97706)] hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors flex items-center gap-1 cursor-pointer leading-none"
                            title="复制开场白文本"
                          >
                            {copiedGreeting ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                            <span>{copiedGreeting ? '已复制' : '复制问候语'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-zinc-700 dark:text-zinc-300 line-clamp-3 sm:line-clamp-4 leading-relaxed font-sans whitespace-pre-wrap">
                          {getCardGreeting(currentDrawnCard)}
                        </p>
                      </div>
                    )}

                    {/* Description Snippet */}
                    {getCardDescription(currentDrawnCard) && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <div className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                          <BookOpen className="w-2.5 h-2.5" />
                          设定概要
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                          {getCardDescription(currentDrawnCard)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <BaseButton
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCardDetail(currentDrawnCard.id);
                        }}
                        className="flex-1 min-w-[130px] px-3 py-2 rounded-xl bg-[var(--btn-primary-bg,var(--accent,#D97706))] hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        进入详情与编辑
                      </BaseButton>

                      <BaseButton
                        type="button"
                        onClick={handleSingleDraw}
                        disabled={isSpinning}
                        className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[var(--accent,#D97706)]" />
                        再抽一次
                      </BaseButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-zinc-400 text-xs">
                  卡池暂无可用卡片，请先导入卡片
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Quick Draw Controls */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-zinc-900/90 flex items-center justify-center gap-2 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full justify-center pb-1">
            <BaseButton
              type="button"
              onClick={handleSingleDraw}
              disabled={isSpinning || cardPool.length === 0}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-[var(--line-focus,rgba(217,119,6,0.5))] text-zinc-800 dark:text-zinc-200 text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Dices className="w-3.5 h-3.5 text-[var(--accent,#D97706)]" />
              <span>单抽</span>
            </BaseButton>

            <BaseButton
              type="button"
              onClick={handleMultiDraw}
              disabled={isSpinning || cardPool.length === 0}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[var(--btn-primary-bg,var(--accent,#D97706))] hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 shadow-md shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>十连抽</span>
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
};
