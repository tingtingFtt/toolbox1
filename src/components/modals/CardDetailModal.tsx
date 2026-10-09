// @ts-nocheck
import React, { useState, useRef, useMemo } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { BaseCard } from '../ui/BaseCard';
import { CustomSelect } from '../ui/CustomSelect';
import { AppData, CardEntry } from '../../types';
import { getCardDisplayName, getCardCreator, getCardDescription, getCardPersonality, getCardGreeting, getCardAlternateGreetings, getCardWorldBook, getCardRegex, getCardTags, getPureVersionLabel, estimateTokens, normalizeAssociationName } from '../../utils';
import { TagEditor } from '../ui/TagEditor';
import { Search, Plus, Trash2, FolderPlus, Edit3, Download, Upload, Home, Maximize2, ChevronDown, ChevronUp, Check, ImageIcon, Tag, Folder, CheckSquare, Square, MoreHorizontal, RefreshCw, FileText, CheckCircle2, Circle, ArrowRightLeft, Move, Copy, Sliders, ZoomIn, FileCode, Save, Dices, QrCode, ArrowUpDown, Sparkles, Link2, HardDrive, Layers, ExternalLink, Palette, AlertCircle, AlertTriangle, Info, Settings, History, RotateCcw, ArrowLeft, Book, BookOpen, Eye, X, Code2, Cpu } from 'lucide-react';
import { BatchAIRefineModal } from './BatchAIRefineModal';

export interface CardDetailModalProps {
  setDeleteAssociatedAssetsWithVersion?: any;
  handleChangeBoundAssetVersion?: any;
  coverUploadInputRef?: any;
  updateCardInputRef?: any;
  setShowAddAltGreetingModal?: any;
  setNewAltGreetingInputText?: any;
  cardWorldBookSearchQuery?: any;
  setCardWorldBookSearchQuery?: any;
  setCardRegexSearchQuery?: any;

  setFullscreenData?: any;
  setEditingCardRegex?: any;
  setCurrentPage?: any;
  cardRegexSearchQuery?: any;
  authorNoteInputRef?: any;
  setAuthorNoteBatchMode?: any;
  setSelectedAuthorNoteIndices?: any;
  authorNoteBatchMode?: any;
  selectedAuthorNoteIndices?: any;
  processImageFile?: any;
  memoryInputRef?: any;
  setMemoryBatchMode?: any;
  setSelectedMemoryIndices?: any;
  memoryBatchMode?: any;
  selectedMemoryIndices?: any;

  appData: AppData;
  updateAppData: any;
  showToast: any;
  detailCardId: string | null;
  displayDetailCard: any;
  activeLiveCardData: any;
  handleCancelCardEdit: () => void;
  previewVersionId: string | null;
  setPreviewVersionId: any;
  detailTab: string;
  setDetailTab: any;
  handleConfirmDeleteVersion: () => void;
  customGreetingUsername: string;
  setCustomGreetingUsername: any;
  applyCustomGreetingUsername: any;
  restoreCustomGreetingUsername: any;
  confirmAsync: any;
  setVersionToDelete: any;
  jumpTargetId: any;
  setJumpTargetId: any;
  handleOpenBindAssetModal: any;
  handleUnbindAsset: any;
  addManualQr: any;
  saveEditedQrItem: any;
  deleteCardQrItem: any;
  saveCardRegexList: any;
  saveCardWorldBook: any;
  importQrJsonText: any;
  handleDrawRandomCard: any;
  downloadJsonFile: any;
  formatDateForFileName: any;
  handleBatchExportCards: any;
  askChoiceAsync: any;
  requestDelete: any;
  associationPrimary: any;
  setAssociationPrimary: any;
  handleAddCardAssociation: any;
  openAssociatedCard: any;
  handleRemoveCardAssociation: any;
  normalizeQrDocument: any;
  qrSearchQuery: any;
  setQrSearchQuery: any;
  setCardSectionImportModal: any;
  setEditingQrItem: any;
  deleteCardsAndCascadeAssets: any;
  setDetailCardId: any;
  originalDetailCardRef: any;
  setAssociationTargetId: any;
  setAssociationNote: any;
  associationTargetId: any;
  associationNote: any;
  getAssociationCandidates: any;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  setDeleteAssociatedAssetsWithVersion,
  handleChangeBoundAssetVersion,
  coverUploadInputRef,
  updateCardInputRef,
  setShowAddAltGreetingModal,
  setNewAltGreetingInputText,
  cardWorldBookSearchQuery = '',
  setCardWorldBookSearchQuery,
  setCardRegexSearchQuery,

  setFullscreenData,
  setEditingCardRegex,
  setCurrentPage,
  cardRegexSearchQuery = '',
  authorNoteInputRef,
  setAuthorNoteBatchMode,
  setSelectedAuthorNoteIndices,
  authorNoteBatchMode,
  selectedAuthorNoteIndices,
  processImageFile,
  memoryInputRef,
  setMemoryBatchMode,
  setSelectedMemoryIndices,
  memoryBatchMode,
  selectedMemoryIndices,

  appData,
  updateAppData,
  showToast,
  detailCardId,
  displayDetailCard,
  activeLiveCardData,
  handleCancelCardEdit,
  previewVersionId,
  setPreviewVersionId,
  detailTab,
  setDetailTab,
  handleConfirmDeleteVersion,
  customGreetingUsername,
  setCustomGreetingUsername,
  applyCustomGreetingUsername,
  restoreCustomGreetingUsername,
  confirmAsync,
  setVersionToDelete,
  jumpTargetId,
  setJumpTargetId,
  handleOpenBindAssetModal,
  handleUnbindAsset,
  addManualQr,
  saveEditedQrItem,
  deleteCardQrItem,
  saveCardRegexList,
  saveCardWorldBook,
  importQrJsonText,
  handleDrawRandomCard,
  downloadJsonFile,
  formatDateForFileName,
  handleBatchExportCards,
  askChoiceAsync,
  requestDelete,
  associationPrimary,
  setAssociationPrimary,
  handleAddCardAssociation,
  openAssociatedCard,
  handleRemoveCardAssociation,
  normalizeQrDocument,
  qrSearchQuery = '',
  setQrSearchQuery,
  setCardSectionImportModal,
  setEditingQrItem,
  deleteCardsAndCascadeAssets,
  setDetailCardId,
  originalDetailCardRef,
  setAssociationTargetId,
  setAssociationNote,
  associationTargetId,
  associationNote,
  getAssociationCandidates,
}) => {
  const [editingMainGreeting, setEditingMainGreeting] = useState(false);
  const [editingAltGreetingIndex, setEditingAltGreetingIndex] = useState<number | null>(null);
  const [showAIRefineModal, setShowAIRefineModal] = useState(false);

  return (
    <>
{detailCardId && displayDetailCard && activeLiveCardData && (
        <div data-design-id="card-detail-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-transparent transition-opacity"
            onClick={handleCancelCardEdit}
            aria-label="关闭遮罩"
          />
          {/* Requirement 1: Fixed Modal Dimensions so no matter which tab is clicked, modal NEVER changes size */}
          <div data-design-id="card-detail-modal-panel" className="file-detail-modal modal-panel modal-card relative z-10 w-full h-full bg-[var(--modal-solid-bg,#E8EAEB)] text-[var(--text,#2B3540)] flex flex-col overflow-hidden transition-none rounded-none border-0 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            
  {previewVersionId && (
    <div data-design-id="card-detail-preview-banner" className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
      <Eye className="w-3.5 h-3.5" />
      您当前正在预览历史版本：{displayDetailCard.versions?.find((v:any) => v.versionId === previewVersionId)?.versionLabel}。所有修改均不生效，点击 <BaseButton size="xs" designId="card-detail-exit-preview-btn" className="underline cursor-pointer" onClick={() => setPreviewVersionId(null)}>退出预览</BaseButton> 即可恢复。
    </div>
  )}
  <div data-design-id="card-detail-header" className="px-3 sm:px-4 py-1 border-0 flex flex-col gap-0 flex-shrink-0 bg-[var(--modal-bar-bg,#DFE5EA)] dark:bg-[var(--modal-bar-bg,#172029)] transition-colors">
    {/* Row 1: Title, Version, and Close X */}
    <div className="flex items-center justify-between gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <h2 className="!text-[18px] font-bold truncate text-[var(--text-serif,#1A232D)] flex items-center gap-1.5 leading-tight">
          {getCardDisplayName(displayDetailCard)}
          <span className="px-1.5 py-0 text-[9px] font-bold rounded-none bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] border border-[var(--line-focus,rgba(96,126,149,0.4))] whitespace-nowrap shrink-0">
            {getPureVersionLabel((displayDetailCard as any).activeVersionLabel, (displayDetailCard.versions?.length || 0) + 1)}
          </span>
          <span className="px-1.5 py-0 text-[9px] font-bold rounded-none bg-[var(--btn-bg,rgba(226,208,188,0.45))] text-[var(--dim,#647382)] border border-[var(--line-soft,rgba(96,126,149,0.2))] whitespace-nowrap shrink-0">
            {displayDetailCard.source === 'tavern' ? '酒馆导入' : '本地导入'}
          </span>
        </h2>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
        <span role="button" onClick={handleCancelCardEdit} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer flex items-center justify-center shrink-0" title="关闭 (Esc)"><X className="w-4 h-4" /></span>
      </div>
    </div>

    {/* Row 2: Tag Editor */}
    <div className="flex items-center justify-between gap-2 min-w-0 text-[10px] text-[var(--dim,#647382)]">
      <div className="flex items-center min-w-0 flex-1 overflow-hidden py-0">
        <TagEditor
          customTags={displayDetailCard.customTags || []}
          availableTags={appData.cardTags || []}
          maxDisplay={3}
          onChange={(newTags) => {
            const updated = { ...displayDetailCard, customTags: newTags };
            updateAppData((prev) => {
              const newGlobalTags = Array.from(new Set([...(prev.cardTags || []), ...newTags]));
              return {
                ...prev,
                cardTags: newGlobalTags,
                cards: prev.cards.map(c => c.id === updated.id ? updated : c)
              };
            });
          }}
        />
      </div>
    </div>
  </div>

            {/* Modal Navigation Tabs */}
            <div data-design-id="card-detail-tabbar" className="tab-nav-bar flex items-center justify-between border-b border-[var(--line,rgba(96,126,149,0.2))] px-3 sm:px-4 flex-shrink-0 gap-2 overflow-x-auto scrollbar-none bg-[var(--detail-tabbar-gradient,linear-gradient(90deg,#DCE4EA_0%,#EAE2D7_50%,#DCE4EA_100%))] transition-colors">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {[
                  { id: 'overview', name: '概览' },
                  { id: 'versions', name: `版本历史${(displayDetailCard.versions?.length || 0) > 0 ? ` (${(displayDetailCard.versions?.length || 0) + 1})` : ''}` },
                  { id: 'links', name: '外部关联' },
                  { id: 'greetings', name: '开场白' },
                  { id: 'worldbook', name: '世界书' },
                  { id: 'regex', name: '正则' },
                  { id: 'qr', name: 'QR' },
                  { id: 'raw', name: '原始数据' },
                  { id: 'extras', name: '其他' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    data-design-id={`card-detail-tab-${tab.id}`}
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`!py-0 h-[28px] px-2 sm:px-3 !text-[12px] !leading-none flex items-center justify-center transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      detailTab === tab.id
                        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                        : 'border-b-transparent text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-blue-400 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body: Scrollable Vertical Area within Fixed Height */}
            <div key={detailTab} className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* TAB: 版本历史 (Versions) */}
              {detailTab === 'versions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <History className="w-4 h-4 text-amber-500" />
                        <span>角色卡版本记录与历史追溯</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                          共 {(displayDetailCard.versions?.length || 0) + 1} 个版本
                        </span>
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        在数据目录重新扫描或导入同名卡片时，旧版本将自动封存归档于此。您可以随时点击时间线中的版本，实时预览和恢复该版本的历史设定。
                      </p>
                    </div>
                  </div>

                  {/* Current Active Version Card */}
                  <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-3">
                    <div className="flex flex-col gap-2">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          当前生效版本 ({(displayDetailCard as any).activeVersionLabel || `V${(displayDetailCard.versions?.length || 0) + 1}`})
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pl-1">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {displayDetailCard.name || displayDetailCard.fileName || 'current_card'}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                          最近更新: {new Date(displayDetailCard.updatedAt || displayDetailCard.createdAt || Date.now()).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-zinc-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <div>
                        <span className="text-zinc-400 text-[10px] block">作者 / 规范:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{displayDetailCard.author || '未知'} ({displayDetailCard.version})</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 text-[10px] block">角色描述字数:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {((displayDetailCard.rawData?.data?.description || displayDetailCard.rawData?.description || '') as string).length} 字
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* History Versions List */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 px-1">
                      历史归档版本时间线
                    </div>
                    
                    {(() => {
                      const detailCard = displayDetailCard as any;
                      const currentVerNum = detailCard.activeVersionNumber || (detailCard.versions?.length || 0) + 1;
                      const allVersions = [
                        {
                          isCurrent: true,
                          versionId: detailCard.activeVersionId || 'current',
                          versionNumber: currentVerNum,
                          versionLabel: detailCard.activeVersionLabel || `V${currentVerNum}`,
                          importedAt: detailCard.importedAt || detailCard.createdAt || detailCard.updatedAt || Date.now(),
                          changeSummary: detailCard.currentVersionSummary || '当前生效版本',
                          fileName: detailCard.fileName,
                          data: {
                            name: detailCard.name,
                            charName: detailCard.charName,
                            fileName: detailCard.fileName,
                            fileType: detailCard.fileType,
                            version: detailCard.version,
                            author: detailCard.author,
                            rawData: detailCard.rawData,
                            coverImage: detailCard.coverImage,
                            editHistory: detailCard.editHistory,
                            customTags: detailCard.customTags,
                            boundWorldBooks: detailCard.boundWorldBooks ? [...detailCard.boundWorldBooks] : [],
                            boundRegexes: detailCard.boundRegexes ? [...detailCard.boundRegexes] : [],
                            boundScripts: detailCard.boundScripts ? [...detailCard.boundScripts] : [],
                            content: detailCard.content
                          }
                        },
                        ...(detailCard.versions || []).map((v: any, index: number) => ({
                          ...v,
                          isCurrent: false,
                          versionLabel: v.versionLabel || `V${v.versionNumber || ((detailCard.versions?.length || 0) - index)}`,
                          importedAt: v.importedAt || v.updatedAt || Date.now()
                        }))
                      ];
                      
                      // Sort by versionNumber descending
                      allVersions.sort((a: any, b: any) => b.versionNumber - a.versionNumber);

                      return allVersions.map((ver: any, index: number) => {
                        const verData = ver.data || {};
                        const wbCount = (verData.boundWorldBooks || []).length;
                        const rxCount = (verData.boundRegexes || []).length;
                        const scrCount = (verData.boundScripts || []).length;
                        const verImg = verData.coverImage || ver.coverImage || (ver.isCurrent ? detailCard.coverImage : null);

                        return (
                          <div
                            key={ver.versionId || index}
                            className={`p-4 rounded-2xl border transition-all shadow-2xs ${ver.isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/20' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-800/80'}`}
                          >
                            <div className="flex flex-col gap-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg ${ver.isCurrent ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'}`}>
                                  {ver.versionLabel} {ver.isCurrent && "(当前生效)"}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                  记录时间: {new Date(ver.importedAt).toLocaleString()}
                                </span>
                              </div>
                              <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                                {ver.changeSummary || '初始导入版本'}
                              </span>
                            </div>

                            {/* Bound Assets Info for this version */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="text-zinc-400">绑定系统资产:</span>
                              {wbCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                                  <BookOpen className="w-3 h-3" /> 世界书 ({wbCount})
                                </span>
                              )}
                              {rxCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                                  <Cpu className="w-3 h-3" /> 正则 ({rxCount})
                                </span>
                              )}
                              {scrCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                                  <Code2 className="w-3 h-3" /> 脚本 ({scrCount})
                                </span>
                              )}
                              {wbCount === 0 && rxCount === 0 && scrCount === 0 && (
                                <span className="text-zinc-400 italic">无绑定外部系统资产</span>
                              )}
                            </div>

                            {/* Actions footer */}
                            <div className="mt-3 pt-2.5 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/50">
                              {!ver.isCurrent && (
                                <div className="flex items-center gap-1.5">
                                  <BaseButton size="xs"
                                    type="button"
                                    onClick={() => {
                                      setVersionToDelete({
                                        cardId: detailCard.id,
                                        cardName: getCardDisplayName(detailCard),
                                        versionId: ver.versionId,
                                        versionLabel: ver.versionLabel || `V${ver.versionNumber}`,
                                        importedAt: ver.importedAt,
                                        data: ver.data,
                                        changeSummary: ver.changeSummary
                                      });
                                      setDeleteAssociatedAssetsWithVersion(true);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-1 transition-colors"
                                    title="单独删除此历史版本"
                                  >
                                    <Trash2 className="w-3 h-3" /> 删除版本
                                  </BaseButton>

                                  <BaseButton size="xs"
                                    type="button"
                                    onClick={() => {
                                      // Perform the swap logic
                                      const currentSnapshot = {
                                        versionId: detailCard.activeVersionId || `ver_${detailCard.id}_${currentVerNum}_${Date.now()}`,
                                        versionNumber: currentVerNum,
                                        versionLabel: detailCard.activeVersionLabel || `V${currentVerNum}`,
                                        updatedAt: detailCard.updatedAt || Date.now(),
                                        importedAt: detailCard.importedAt || detailCard.createdAt || detailCard.updatedAt || Date.now(),
                                        fileName: detailCard.fileName,
                                        changeSummary: detailCard.currentVersionSummary || '自动归档 (切换版本前)',
                                        data: {
                                          name: detailCard.name,
                                          charName: detailCard.charName,
                                          fileName: detailCard.fileName,
                                          fileType: detailCard.fileType,
                                          version: detailCard.version,
                                          author: detailCard.author,
                                          rawData: detailCard.rawData,
                                          coverImage: detailCard.coverImage,
                                          editHistory: detailCard.editHistory,
                                          customTags: detailCard.customTags,
                                          boundWorldBooks: detailCard.boundWorldBooks ? [...detailCard.boundWorldBooks] : [],
                                          boundRegexes: detailCard.boundRegexes ? [...detailCard.boundRegexes] : [],
                                          boundScripts: detailCard.boundScripts ? [...detailCard.boundScripts] : [],
                                          content: detailCard.content
                                        }
                                      };

                                      const newVersions = (detailCard.versions || []).filter((v: any) => v.versionId !== ver.versionId);
                                      newVersions.unshift(currentSnapshot);

                                      const restoredCard = {
                                        ...detailCard,
                                        ...ver.data,
                                        boundWorldBooks: ver.data?.boundWorldBooks ? [...ver.data.boundWorldBooks] : [],
                                        boundRegexes: ver.data?.boundRegexes ? [...ver.data.boundRegexes] : [],
                                        boundScripts: ver.data?.boundScripts ? [...ver.data.boundScripts] : [],
                                        activeVersionNumber: ver.versionNumber,
                                        activeVersionLabel: ver.versionLabel,
                                        activeVersionId: ver.versionId,
                                        currentVersionSummary: ver.changeSummary || '历史归档记录',
                                        updatedAt: Date.now(),
                                        importedAt: ver.importedAt || ver.updatedAt || Date.now(),
                                        versions: newVersions
                                      };

                                      updateAppData((prev: any) => {
                                        const idx = (prev.cards || []).findIndex((c: any) => c.id === detailCard.id);
                                        if (idx > -1) {
                                          const newCards = [...(prev.cards || [])];
                                          newCards[idx] = restoredCard;
                                          return { ...prev, cards: newCards };
                                        }
                                        return prev;
                                      });
                                      originalDetailCardRef.current = JSON.parse(JSON.stringify(restoredCard));
                                      if (previewVersionId) setPreviewVersionId(null);
    setCustomGreetingUsername('');
                                      showToast(`已直接切换并保存至版本 ${getPureVersionLabel(ver.versionLabel, ver.versionNumber)}`, 'success');
                                    }}
                                    className="px-3 py-1 text-[10px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-xs transition-colors"
                                  >
                                    <RefreshCw className="w-3 h-3" /> 切换至此版本
                                  </BaseButton>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
                            
              {/* TAB: 外部关联 (Links) */}
              {detailTab === 'links' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-blue-500" />
                        卡面互联与外部资产关联
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        展示当前角色卡（{(displayDetailCard as any).activeVersionLabel || '当前版本'}）绑定的系统资产（世界书、正则、脚本）以及同名卡面变体与自定义关联。
                      </p>
                    </div>
                  </div>

                  {/* Section 1: 当前版本绑定的系统资产 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                          当前版本绑定的系统资产
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          绑定于角色卡 {(displayDetailCard as any).activeVersionLabel || 'V1'}。可自由指定绑定的资产具体版本快照，换绑或解绑均需安全确认。
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <BaseButton size="xs"
                          type="button"
                          onClick={() => handleOpenBindAssetModal('worldbook')}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3" /> + 绑定世界书
                        </BaseButton>
                        <BaseButton size="xs"
                          type="button"
                          onClick={() => handleOpenBindAssetModal('regex')}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Cpu className="w-3 h-3" /> + 绑定正则
                        </BaseButton>
                        <BaseButton size="xs"
                          type="button"
                          onClick={() => handleOpenBindAssetModal('script')}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Code2 className="w-3 h-3" /> + 绑定脚本
                        </BaseButton>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Worldbooks */}
                      {(displayDetailCard.boundWorldBooks || []).map((wbId: string) => {
                        const wb = appData.stWorldBooks?.find((w: any) => w.id === wbId);
                        if (!wb) return null;
                        const boundVerId = displayDetailCard.boundAssetVersions?.[wbId] || 'latest';
                        const hasVersions = wb.versions && wb.versions.length > 0;
                        const currentVerLabel = boundVerId === 'latest'
                          ? `最新版 (${wb.activeVersionLabel || 'v1'})`
                          : (wb.versions?.find((v: any) => v.versionId === boundVerId)?.versionLabel || boundVerId);

                        return (
                          <div key={wbId} className="flex flex-col justify-between p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-200 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{wb.name}</span>
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex-shrink-0">
                                        ST 世界书
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{wb.entries?.length || 0} 条目 · {wb.description || '无描述'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Version Binding Selector */}
                              <div className="mt-3 pt-2.5 border-t border-amber-100 dark:border-amber-900/30">
                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                  <span className="text-zinc-500 font-medium flex items-center gap-1 flex-shrink-0">
                                    <History className="w-3 h-3 text-amber-600" /> 绑定版本：
                                  </span>
                                  <CustomSelect
                                    value={boundVerId}
                                    onChange={(newVerId) => {
                                      const newVerLabel = newVerId === 'latest'
                                        ? `最新版 (${wb.activeVersionLabel || 'v1'})`
                                        : (wb.versions?.find((v: any) => v.versionId === newVerId)?.versionLabel || newVerId);
                                      handleChangeBoundAssetVersion(wbId, wb.name, currentVerLabel, newVerId, newVerLabel);
                                    }}
                                    options={[
                                      { value: 'latest', label: `最新版 (${wb.activeVersionLabel || 'v1'}) - 同步更新` },
                                      ...(wb.versions || []).map((ver: any) => ({
                                        value: ver.versionId,
                                        label: `锁定 ${ver.versionLabel || `v${ver.versionNumber}`} (${ver.changeSummary || new Date(ver.updatedAt).toLocaleDateString()})`,
                                      })),
                                    ]}
                                    className="px-2 py-0.8 text-[10px] bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800/60 rounded-md text-zinc-800 dark:text-zinc-200 focus:outline-none max-w-[200px] flex items-center justify-between"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none mt-3 pt-2.5 border-t border-amber-100 dark:border-amber-900/30">
                              <div className="flex items-center gap-2 shrink-0">
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => setDetailTab('worldbook')}
                                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-medium flex items-center gap-0.5 whitespace-nowrap shrink-0"
                                >
                                  查看条目 →
                                </BaseButton>
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => {
                                    setDetailCardId(null);
                                    setJumpTargetId(wbId);
                                    setCurrentPage('st-worldbooks');
                                  }}
                                  className="px-2 py-0.8 text-[9px] font-medium rounded border border-amber-300 dark:border-amber-700 bg-amber-100/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title="跳转至 ST 世界书分界面查看与管理此文件"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" /> 跳转分界面
                                </BaseButton>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 ml-auto">
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => handleOpenBindAssetModal('worldbook', wbId)}
                                  className="px-2 py-0.8 text-[9px] font-medium rounded border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title="换绑为其他世界书"
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" /> 换绑
                                </BaseButton>
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => handleUnbindAsset('worldbook', wbId, wb.name)}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8px] sm:text-[9px] font-medium rounded border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title="解除与此世界书的绑定"
                                >
                                  <Trash2 className="w-2.5 h-2.5" /> 解绑
                                </BaseButton>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Regexes */}
                      {(displayDetailCard.boundRegexes || []).map((rId: string) => {
                        const rx = appData.stRegexScripts?.find((r: any) => r.id === rId);
                        if (!rx) return null;
                        const boundVerId = displayDetailCard.boundAssetVersions?.[rId] || 'latest';
                        const currentVerLabel = boundVerId === 'latest'
                          ? `最新版 (${rx.activeVersionLabel || 'v1'})`
                          : (rx.versions?.find((v: any) => v.versionId === boundVerId)?.versionLabel || boundVerId);

                        return (
                          <div key={rId} className="flex flex-col justify-between p-3.5 rounded-xl border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/10">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/60 dark:text-purple-200 flex items-center justify-center flex-shrink-0">
                                    <Cpu className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{rx.scriptName}</span>
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 flex-shrink-0">
                                        ST 正则
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{rx.rules?.length || 1} 规则 · {rx.description || '正则脚本'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Version Binding Selector */}
                              <div className="mt-3 pt-2.5 border-t border-purple-100 dark:border-purple-900/30">
                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                  <span className="text-zinc-500 font-medium flex items-center gap-1 flex-shrink-0">
                                    <History className="w-3 h-3 text-purple-600" /> 绑定版本：
                                  </span>
                                  <CustomSelect
                                    value={boundVerId}
                                    onChange={(newVerId) => {
                                      const newVerLabel = newVerId === 'latest'
                                        ? `最新版 (${rx.activeVersionLabel || 'v1'})`
                                        : (rx.versions?.find((v: any) => v.versionId === newVerId)?.versionLabel || newVerId);
                                      handleChangeBoundAssetVersion(rId, rx.scriptName, currentVerLabel, newVerId, newVerLabel);
                                    }}
                                    options={[
                                      { value: 'latest', label: `最新版 (${rx.activeVersionLabel || 'v1'}) - 同步更新` },
                                      ...(rx.versions || []).map((ver: any) => ({
                                        value: ver.versionId,
                                        label: `锁定 ${ver.versionLabel || `v${ver.versionNumber}`} (${ver.changeSummary || new Date(ver.updatedAt).toLocaleDateString()})`,
                                      })),
                                    ]}
                                    className="px-2 py-0.8 text-[10px] bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800/60 rounded-md text-zinc-800 dark:text-zinc-200 focus:outline-none max-w-[200px] flex items-center justify-between"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none mt-3 pt-2.5 border-t border-purple-100 dark:border-purple-900/30">
                              <div className="flex items-center gap-2 shrink-0">
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => setDetailTab('regex')}
                                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-0.5 whitespace-nowrap shrink-0"
                                >
                                  查看正则 →
                                </BaseButton>
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => {
                                    setDetailCardId(null);
                                    setJumpTargetId(rId);
                                    setCurrentPage('st-regex');
                                  }}
                                  className="px-2 py-0.8 text-[9px] font-medium rounded border border-purple-300 dark:border-purple-700 bg-purple-100/60 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title="跳转至 ST 正则分界面查看与管理此文件"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" /> 跳转分界面
                                </BaseButton>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 ml-auto">
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => handleOpenBindAssetModal('regex', rId)}
                                  className="px-2 py-0.8 text-[9px] font-medium rounded border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title="换绑为其他正则脚本"
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" /> 换绑
                                </BaseButton>
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => handleUnbindAsset('regex', rId, rx.scriptName)}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8px] sm:text-[9px] font-medium rounded border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title="解除与此正则脚本的绑定"
                                >
                                  <Trash2 className="w-2.5 h-2.5" /> 解绑
                                </BaseButton>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Scripts */}
                      {(displayDetailCard.boundScripts || []).map((sId: string) => {
                        const scr = appData.scripts?.find((s: any) => s.id === sId);
                        if (!scr) return null;
                        const boundVerId = displayDetailCard.boundAssetVersions?.[sId] || 'latest';
                        const currentVerLabel = boundVerId === 'latest'
                          ? `最新版 (${scr.activeVersionLabel || 'v1'})`
                          : (scr.versions?.find((v: any) => v.versionId === boundVerId)?.versionLabel || boundVerId);

                        return (
                          <div key={sId} className="flex flex-col justify-between p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <Code2 className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{scr.name}</span>
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex-shrink-0">
                                        扩展脚本
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{scr.description || '扩展脚本'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Version Binding Selector */}
                              <div className="mt-3 pt-2.5 border-t border-emerald-100 dark:border-emerald-900/30">
                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                  <span className="text-zinc-500 font-medium flex items-center gap-1 flex-shrink-0">
                                    <History className="w-3 h-3 text-emerald-600" /> 绑定版本：
                                  </span>
                                  <CustomSelect
                                    value={boundVerId}
                                    onChange={(newVerId) => {
                                      const newVerLabel = newVerId === 'latest'
                                        ? `最新版 (${scr.activeVersionLabel || 'v1'})`
                                        : (scr.versions?.find((v: any) => v.versionId === newVerId)?.versionLabel || newVerId);
                                      handleChangeBoundAssetVersion(sId, scr.name, currentVerLabel, newVerId, newVerLabel);
                                    }}
                                    options={[
                                      { value: 'latest', label: `最新版 (${scr.activeVersionLabel || 'v1'}) - 同步更新` },
                                      ...(scr.versions || []).map((ver: any) => ({
                                        value: ver.versionId,
                                        label: `锁定 ${ver.versionLabel || `v${ver.versionNumber}`} (${ver.changeSummary || new Date(ver.updatedAt).toLocaleDateString()})`,
                                      })),
                                    ]}
                                    className="px-2 py-0.8 text-[10px] bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800/60 rounded-md text-zinc-800 dark:text-zinc-200 focus:outline-none max-w-[200px] flex items-center justify-between"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none mt-3 pt-2.5 border-t border-emerald-100 dark:border-emerald-900/30">
                              <BaseButton size="xs"
                                type="button"
                                onClick={() => {
                                  setDetailCardId(null);
                                  setJumpTargetId(sId);
                                  setCurrentPage('st-scripts');
                                }}
                                className="px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8px] sm:text-[9px] font-medium rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                title="跳转至酒馆脚本分界面查看与管理此文件"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> 跳转分界面
                              </BaseButton>

                              <div className="flex items-center gap-2 shrink-0 ml-auto">
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => handleOpenBindAssetModal('script', sId)}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8px] sm:text-[9px] font-medium rounded border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title="换绑为其他扩展脚本"
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" /> 换绑
                                </BaseButton>
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => handleUnbindAsset('script', sId, scr.name)}
                                  className="px-1.5 sm:px-2 py-0.5 sm:py-0.8 text-[8px] sm:text-[9px] font-medium rounded border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                                  title="解除与此扩展脚本的绑定"
                                >
                                  <Trash2 className="w-2.5 h-2.5" /> 解绑
                                </BaseButton>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(!displayDetailCard.boundWorldBooks?.length && !displayDetailCard.boundScripts?.length && !displayDetailCard.boundRegexes?.length) && (
                      <div className="p-6 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                        <p className="text-xs text-zinc-500 font-medium">当前版本暂未绑定任何外部系统资产</p>
                        <p className="text-[10px] text-zinc-400">
                          点击上方按钮可为角色卡绑定已有的 ST 世界书、正则脚本或扩展脚本，或选择绑定具体版本快照。
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Section 2: 同名独立卡面 (Alternate Faces) */}
                  {(() => {
                    const normName = normalizeAssociationName(getCardDisplayName(displayDetailCard));
                    const alternateFaces = (appData.cards || []).filter(c => c.id !== displayDetailCard.id && normalizeAssociationName(getCardDisplayName(c)) === normName);
                    
                    return (
                      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            同名独立卡面变体 ({alternateFaces.length})
                          </div>
                          <span className="text-[10px] text-zinc-400">库中同名但不同 ID 的独立卡片</span>
                        </div>

                        {alternateFaces.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {alternateFaces.map(altCard => (
                              <div
                                key={altCard.id}
                                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
                                onClick={() => setDetailCardId(altCard.id)}
                              >
                                <div className="w-10 h-14 rounded-lg bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  {altCard.coverImage ? (
                                    <img src={altCard.coverImage} alt={altCard.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[9px] text-zinc-400">无封面</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{getCardDisplayName(altCard)}</div>
                                  <div className="text-[10px] text-zinc-400 truncate">作者: {getCardCreator(altCard)}</div>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                                      {(altCard as any).activeVersionLabel || 'V1'}
                                    </span>
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400">点击切换查看</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-zinc-400 italic">暂无同名的其他独立角色卡。</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Section 3: 关联角色卡 (Manual Associations) */}
                  <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-amber-500" /> 关联角色卡
                        </h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">可建立主体相同且作者相同的角色卡间关联关系</p>
                      </div>
                    </div>

                    {getAssociationCandidates(displayDetailCard).length > 0 ? (
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
                        <CustomSelect
                          value={associationTargetId}
                          onChange={(val) => setAssociationTargetId(val)}
                          placeholder="-- 选择要关联的角色卡 --"
                          options={[
                            { value: '', label: '-- 选择要关联的角色卡 --' },
                            ...getAssociationCandidates(displayDetailCard).map((card) => ({
                              value: card.id,
                              label: `${getCardDisplayName(card)} (${(card as any).activeVersionLabel || 'V1'}) - ${getCardCreator(card)}`,
                            })),
                          ]}
                          className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none flex items-center justify-between"
                        />

                        <BaseInput
                          type="text"
                          value={associationNote}
                          onChange={(e) => setAssociationNote(e.target.value)}
                          placeholder="关联备注（如：主线分歧 / 皮肤差分 / 阶段二）"
                          className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />

                        <BaseButton size="xs"
                          type="button"
                          onClick={handleAddCardAssociation}
                          className="w-full py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
                        >
                          添加关联
                        </BaseButton>
                      </div>
                    ) : null}

                    {/* Established associations list */}
                    <div className="space-y-2">
                      {(displayDetailCard.associations || []).map((assoc) => {
                        const targetCard = appData.cards.find((c) => c.id === assoc.cardId);
                        if (!targetCard) return null;
                        return (
                          <div
                            key={assoc.cardId}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                          >
                            <div
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                              onClick={() => setDetailCardId(targetCard.id)}
                            >
                              <div className="w-8 h-10 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {targetCard.coverImage ? (
                                  <img src={targetCard.coverImage} alt={targetCard.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px] text-zinc-400">无图</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                  {getCardDisplayName(targetCard)}
                                </div>
                                <div className="text-[9px] text-zinc-400 truncate">
                                  {assoc.note || '已关联卡片'}
                                </div>
                              </div>
                            </div>
                            <BaseButton size="xs"
                              type="button"
                              onClick={() => handleRemoveCardAssociation(assoc.cardId)}
                              className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                              title="解除关联"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </BaseButton>
                          </div>
                        );
                      })}
                      {(!displayDetailCard.associations || displayDetailCard.associations.length === 0) && (
                        <p className="text-[10px] text-zinc-400 italic">暂无手动关联的角色卡。</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1: 概览 (Overview) */}
              {detailTab === 'overview' && (
                <div data-design-id="card-detail-overview-grid" className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Cover & Export / Update Options */}
                  <div data-design-id="card-detail-left-col" className="md:col-span-4 space-y-4">
                    {/* Version Quick Banner */}
                    <div data-design-id="card-detail-version-banner" className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex-shrink-0">
                          {(displayDetailCard as any).activeVersionLabel || `V${(displayDetailCard.versions?.length || 0) + 1}`}
                        </span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
                          共 {(displayDetailCard.versions?.length || 0) + 1} 个历史版本
                        </span>
                      </div>
                      <BaseButton size="xs"
                        type="button"
                        onClick={() => setDetailTab('versions')}
                        className="!py-0 !px-1 !h-auto !text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex-shrink-0"
                      >
                        版本追溯 →
                      </BaseButton>
                    </div>

                    {/* Cover Main Box */}
                    <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 relative flex items-center justify-center">
                      {displayDetailCard.coverImage ? (
                        <img src={displayDetailCard.coverImage} alt="Cover" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-zinc-400">无封面</span>
                      )}
                    </div>

                    {/* Change / Add Cover Button */}
                    <BaseButton size="xs"
                      onClick={() => coverUploadInputRef.current?.click()}
                      className="w-full py-2 text-[10px] font-medium rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 text-zinc-600 dark:text-zinc-400 transition-colors"
                    >
                      点击替换/更新封面图
                    </BaseButton>
                    <input
                      type="file"
                      ref={coverUploadInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const original = await fileToDataURL(file);
                          const updatedCards = appData.cards.map((c) =>
                            c.id === displayDetailCard.id ? { ...c, coverImage: original } : c
                          );
                          updateAppData({ ...appData, cards: updatedCards });
                          showToast('封面更新成功', 'success');
                        }
                        e.target.value = '';
                      }}
                    />

                    {/* Export & Update Section (Requirement 6: Add Update Character Card button) */}
                    <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="text-[8.5px] font-bold text-zinc-500 uppercase tracking-wider">导出与覆盖更新</div>
                      <div className="grid grid-cols-2 gap-2">
                        <BaseButton size="xs"
                          onClick={() => exportAsJson(displayDetailCard)}
                          className="!py-1 !px-2 !h-[26px] !text-[10px] font-medium rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                        >
                          导出 JSON
                        </BaseButton>
                        <BaseButton size="xs"
                          onClick={() => exportAsPng(displayDetailCard)}
                          className="!py-1 !px-2 !h-[26px] !text-[10px] font-medium rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                        >
                          导出 PNG
                        </BaseButton>
                      </div>

                      {/* Requirement 6: "在概览里导出png的右侧新加一个更新角色卡，点击之后可以任选png/json格式更新，更新后覆盖先前的" */}
                      <div className="grid grid-cols-2 gap-2">
                        <BaseButton size="xs"
                          type="button"
                          onClick={() => updateCardInputRef.current?.click()}
                          className="w-full !py-1 !px-2 !h-[26px] !text-[10px] font-bold rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> 覆盖更新
                        </BaseButton>
                        <BaseButton size="xs"
                          type="button"
                          onClick={() => setShowAIRefineModal(true)}
                          className="w-full !py-1 !px-2 !h-[26px] !text-[10px] font-bold rounded-md border border-[var(--line-focus,rgba(96,126,149,0.4))] bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] hover:bg-[var(--accent,#607E95)] hover:text-white flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all active:scale-95"
                        >
                          <Sparkles className="w-2.5 h-2.5" /> AI精修
                        </BaseButton>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Editable Information */}
                  <div className="md:col-span-8 space-y-4">
                    {/* Name Field */}
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                        角色名称
                      </label>
                      <BaseInput
                        type="text"
                        defaultValue={getCardDisplayName(displayDetailCard)}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val && val !== getCardDisplayName(displayDetailCard)) {
                            const updatedCards = appData.cards.map((c) =>
                              c.id === displayDetailCard.id
                                ? {
                                    ...c,
                                    name: val,
                                    editHistory: { ...c.editHistory, name: val },
                                    edited: true,
                                  }
                                : c
                            );
                            updateAppData({ ...appData, cards: updatedCards });
                          }
                        }}
                        className="w-full px-3 py-2 text-[13px] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                    </div>

                    {/* Author Field */}
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                        角色作者
                      </label>
                      <BaseInput
                        type="text"
                        id="authorInputVal"
                        defaultValue={getCardCreator(displayDetailCard)}
                        className="w-full px-3 py-2 text-[13px] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                    </div>

                    {/* Group Selection Field */}
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                        所属分组
                      </label>
                      <CustomSelect
                        value={displayDetailCard.group || '默认'}
                        onChange={(newGrp) => {
                          const updatedCards = appData.cards.map((c) =>
                            c.id === displayDetailCard.id ? { ...c, group: newGrp } : c
                          );
                          updateAppData({ ...appData, cards: updatedCards });
                          showToast(`所属分组已更新为 "${newGrp}"`, 'success');
                        }}
                        options={appData.groups.map((g) => ({ value: g, label: g }))}
                        className="w-full px-3 py-2 text-[13px] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 flex items-center justify-between"
                      />
                    </div>

                    {/* Description Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                          角色描述 (Description)
                          <span className="text-[9px] font-normal text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            估算 ~{estimateTokens(getCardDescription(displayDetailCard))} tokens
                          </span>
                        </label>
                        <BaseButton size="xs"
                          onClick={() =>
                            setFullscreenData({
                              title: '角色描述',
                              content: getCardDescription(displayDetailCard),
                              type: 'text',
                            })
                          }
                          className="!py-0 !px-1 !h-auto !text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                        >
                          <Maximize2 className="w-2.5 h-2.5" /> 放大查看
                        </BaseButton>
                      </div>
                      <textarea
                        rows={6}
                        defaultValue={getCardDescription(displayDetailCard)}
                        onBlur={(e) => {
                          const val = e.target.value;
                          const updatedCards = appData.cards.map((c) =>
                            c.id === displayDetailCard.id
                              ? {
                                  ...c,
                                  editHistory: { ...c.editHistory, description: val },
                                  edited: true,
                                }
                              : c
                          );
                          updateAppData({ ...appData, cards: updatedCards });
                        }}
                        className="w-full px-3 py-2 text-[13px] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 开场白 (Greetings - Editable) */}
              {detailTab === 'greetings' && (
                <div className="space-y-6">
                  {/* 自定义用户名：只替换界面中的 {{user}}，导出仍保留 {{user}} */}
                  <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">自定义用户名</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">仅用于当前角色卡的开场白预览，不会修改或导出原始 {'{{user}}'} 占位符</div>
                      </div>
                      <BaseInput
                        type="text"
                        value={customGreetingUsername}
                        onChange={(e) => setCustomGreetingUsername(e.target.value)}
                        placeholder="例如：小明"
                        className="w-36 shrink-0 px-3 py-2 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                    </div>
                  </div>

                  {/* Main Greeting (主开场白) */}
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          主开场白 (支持编辑)
                          <span className="text-[9px] font-normal text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            估算 ~{estimateTokens(getCardGreeting(displayDetailCard))} tokens
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-start gap-2">
                        <BaseButton size="xs"
                          type="button"
                          onClick={() => downloadJsonFile(`${getCardDisplayName(displayDetailCard)}_st开场白.json`, {
                            first_mes: getCardGreeting(displayDetailCard),
                            alternate_greetings: getCardAlternateGreetings(displayDetailCard),
                          })}
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1"
                        >
                          <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> 导出 JSON
                        </BaseButton>
                        <BaseButton size="xs"
                          onClick={() => setFullscreenData({ title: '主开场白', content: applyCustomGreetingUsername(getCardGreeting(displayDetailCard)), type: 'text' })}
                          className="px-2.5 py-1 text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-lg flex items-center gap-1"
                        >
                          <Maximize2 className="w-2.5 h-2.5" /> 放大查看
                        </BaseButton>
                        {editingMainGreeting ? (
                          <BaseButton size="xs"
                            onClick={() => setEditingMainGreeting(false)}
                            className="px-2.5 py-1 text-[10px] text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> 完成编辑
                          </BaseButton>
                        ) : (
                          <BaseButton size="xs"
                            onClick={() => setEditingMainGreeting(true)}
                            className="px-2.5 py-1 text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-lg flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" /> 编辑内容
                          </BaseButton>
                        )}
                      </div>
                    </div>
                    {editingMainGreeting ? (
                      <textarea
                        key={`main-greeting-edit-${displayDetailCard.id}-${customGreetingUsername}`}
                        rows={5}
                        autoFocus
                        defaultValue={applyCustomGreetingUsername(getCardGreeting(displayDetailCard))}
                        onBlur={(e) => {
                          const val = restoreCustomGreetingUsername(e.target.value);
                          const updatedCards = appData.cards.map((c) =>
                            c.id === displayDetailCard.id
                              ? { ...c, editHistory: { ...c.editHistory, first_mes: val }, edited: true }
                              : c
                          );
                          updateAppData({ ...appData, cards: updatedCards });
                          showToast('主开场白已更新', 'success');
                        }}
                        placeholder="请输入主开场白内容..."
                        className="w-full p-3 text-[13px] leading-relaxed bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100 resize-none"
                      />
                    ) : (
                      <div className="w-full p-3 text-[13px] leading-relaxed bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words font-mono min-h-[5rem] max-h-64 overflow-y-auto overflow-x-hidden custom-gradient-bg select-text">
                        {applyCustomGreetingUsername(getCardGreeting(displayDetailCard)) || <span className="text-zinc-400 italic">（空）</span>}
                      </div>
                    )}
                  </div>

                  {/* Alternate Greetings List (备用开场白) */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                        备用开场白 ({getCardAlternateGreetings(displayDetailCard).length})
                      </div>
                      <div className="flex items-center justify-start gap-2">
                        <span className="text-[9px] font-normal text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-1 rounded">
                          总计 ~{getCardAlternateGreetings(displayDetailCard).reduce((sum, g) => sum + estimateTokens(g), 0)} tokens
                        </span>
                        <BaseButton size="xs"
                          onClick={() => {
                            setShowAddAltGreetingModal(true);
                            setNewAltGreetingInputText('');
                          }}
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-bold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 flex items-center gap-1"
                        >
                          <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> 添加备用开场白
                        </BaseButton>
                      </div>
                    </div>

                    {getCardAlternateGreetings(displayDetailCard).length === 0 ? (
                      <p className="text-[10px] text-zinc-400 italic py-2">暂无备用开场白</p>
                    ) : (
                      getCardAlternateGreetings(displayDetailCard).map((altGreeting, idx) => (
                        <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5">
                              备用 #{idx + 1}
                              <span className="text-[9px] font-normal text-zinc-400">
                                (~{estimateTokens(altGreeting)} tokens)
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              <BaseButton size="xs"
                                onClick={() =>
                                  setFullscreenData({
                                    title: `备用开场白 #${idx + 1}`,
                                    content: applyCustomGreetingUsername(altGreeting),
                                    type: 'text',
                                  })
                                }
                                className="text-[8.5px] sm:text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                              >
                                <Maximize2 className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> 放大
                              </BaseButton>
                              {editingAltGreetingIndex === idx ? (
                                <BaseButton size="xs"
                                  onClick={() => setEditingAltGreetingIndex(null)}
                                  className="text-[10px] text-emerald-600 dark:text-emerald-400 p-1 flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </BaseButton>
                              ) : (
                                <BaseButton size="xs"
                                  onClick={() => setEditingAltGreetingIndex(idx)}
                                  className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 flex items-center gap-1"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </BaseButton>
                              )}
                              <BaseButton size="xs"
                                onClick={() => {
                                  const currentAlts = getCardAlternateGreetings(displayDetailCard);
                                  const updatedAlts = currentAlts.filter((_: any, i: number) => i !== idx);
                                  const updatedCards = appData.cards.map((c) =>
                                    c.id === displayDetailCard.id
                                      ? { ...c, editHistory: { ...c.editHistory, alternate_greetings: updatedAlts }, edited: true }
                                      : c
                                  );
                                  updateAppData({ ...appData, cards: updatedCards });
                                  showToast('已删除备用开场白', 'info');
                                }}
                                className="text-[10px] text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </BaseButton>
                            </div>
                          </div>
                          {editingAltGreetingIndex === idx ? (
                            <textarea
                              key={`alt-greeting-edit-${displayDetailCard.id}-${idx}-${customGreetingUsername}`}
                              rows={3}
                              autoFocus
                              defaultValue={applyCustomGreetingUsername(altGreeting)}
                              onBlur={(e) => {
                                const val = restoreCustomGreetingUsername(e.target.value);
                                const currentAlts = [...getCardAlternateGreetings(displayDetailCard)];
                                currentAlts[idx] = val;
                                const updatedCards = appData.cards.map((c) =>
                                  c.id === displayDetailCard.id
                                    ? { ...c, editHistory: { ...c.editHistory, alternate_greetings: currentAlts }, edited: true }
                                    : c
                                );
                                updateAppData({ ...appData, cards: updatedCards });
                                showToast('备用开场白已更新', 'success');
                              }}
                              placeholder="输入备用开场白内容..."
                              className="w-full p-2.5 text-[13px] leading-relaxed bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100 resize-none"
                            />
                          ) : (
                            <div className="w-full p-2.5 text-[13px] leading-relaxed bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words font-mono min-h-[4rem] max-h-64 overflow-y-auto overflow-x-hidden custom-gradient-bg select-text">
                              {applyCustomGreetingUsername(altGreeting) || <span className="text-zinc-400 italic">（空）</span>}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: 世界书 (WorldBook - View Only) */}
              {detailTab === 'worldbook' && (() => {
                const currentWb = getCardWorldBook(displayDetailCard) || { entries: [] };
                const allEntries = currentWb.entries || [];
                
                const filteredEntries = allEntries.filter((entry: any) => {
                  if (!cardWorldBookSearchQuery.trim()) return true;
                  const q = cardWorldBookSearchQuery.trim().toLowerCase();
                  const comment = (entry.comment || entry.name || '').toLowerCase();
                  const content = (entry.content || '').toLowerCase();
                  const keys = Array.isArray(entry.keys || entry.key)
                    ? (entry.keys || entry.key).join(' ').toLowerCase()
                    : String(entry.keys || entry.key || '').toLowerCase();
                  return comment.includes(q) || content.includes(q) || keys.includes(q);
                });

                const totalWbTokens = allEntries.reduce(
                  (sum: number, entry: any) => sum + estimateTokens(entry.content || '') + estimateTokens(Array.isArray(entry.keys) ? entry.keys.join(', ') : entry.keys || ''),
                  0
                );

                return (
                  <div className="space-y-4">
                    {/* Read-only Summary Card */}
                    <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {currentWb.name || `${getCardDisplayName(displayDetailCard)} 的世界书`}
                              </span>
                              <span className="text-[9px] font-normal text-amber-800 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-900/50 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                                总计 ~{totalWbTokens} tokens
                              </span>
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 whitespace-nowrap flex-shrink-0">
                                只读查看
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                              {currentWb.description || '当前角色卡绑定的世界书条目集合，提供只读检索、条目详情与正文复制。'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0 sm:w-auto pb-1 sm:pb-0 ml-auto">
                          <BaseButton size="xs"
                            type="button"
                            onClick={() =>
                              setFullscreenData({
                                title: `世界书原始代码/JSON - ${currentWb.name || getCardDisplayName(displayDetailCard)}`,
                                content: JSON.stringify(currentWb, null, 2),
                                type: 'json',
                              })
                            }
                            className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-medium rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
                            title="在手机或全屏中查看完整的原始世界书JSON代码"
                          >
                            <Code2 className="w-3 h-3" /> 查看原始代码
                          </BaseButton>
                          <BaseButton size="xs"
                            type="button"
                            onClick={() => downloadJsonFile(`${getCardDisplayName(displayDetailCard)}_worldbook.json`, currentWb)}
                            className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-medium rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            <Download className="w-3 h-3" /> 导出 JSON
                          </BaseButton>
                          {displayDetailCard.boundWorldBooks?.[0] && (
                            <BaseButton size="xs"
                              type="button"
                              onClick={() => {
                                const targetId = displayDetailCard.boundWorldBooks![0];
                                setDetailCardId(null);
                                setJumpTargetId(targetId);
                                setCurrentPage('st-worldbooks');
                              }}
                              className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                              title="跳转至 ST 世界书界面进行全面管理与编辑"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> 前往世界书管理
                            </BaseButton>
                          )}
                        </div>
                      </div>

                      {/* Search & Counter Filter */}
                      <div className="pt-1.5 border-t border-amber-200/50 dark:border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <BaseInput
                            type="search"
                            value={cardWorldBookSearchQuery}
                            onChange={(e) => setCardWorldBookSearchQuery(e.target.value)}
                            placeholder="按条目标题、触发关键词或正文搜索..."
                            className="w-full pl-8 pr-3 py-1.5 text-[10px] bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800/60 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap flex-shrink-0">
                          显示 {filteredEntries.length} / {allEntries.length} 条条目
                        </span>
                      </div>
                    </div>

                    {/* Entries List */}
                    {filteredEntries.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
                        <BookOpen className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
                        <p className="text-xs text-zinc-500 font-medium">
                          {allEntries.length === 0 ? '此角色卡暂无绑定的世界书条目' : '未找到匹配搜索条件的世界书条目'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredEntries.map((entry: any) => {
                          const entryIndex = allEntries.indexOf(entry);
                          const entryTokens = estimateTokens(entry.content || '') + estimateTokens(Array.isArray(entry.keys) ? entry.keys.join(', ') : entry.keys || '');
                          const rawKeys = Array.isArray(entry.key || entry.keys)
                            ? (entry.key || entry.keys)
                            : typeof (entry.key || entry.keys) === 'string'
                            ? (entry.key || entry.keys).split(',').map((k: string) => k.trim()).filter(Boolean)
                            : [];
                          const isConstant = entry.constant === true || entry.always_active === true;
                          const isSelective = entry.selective === true;

                          return (
                            <div
                              key={entry.id || entryIndex}
                              className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs space-y-2 hover:border-amber-300 dark:hover:border-amber-800/70 transition-all"
                            >
                              {/* Entry Header & Keywords */}
                              <div className="flex flex-col gap-1.5 pb-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
                                <div className="flex flex-row items-center justify-between gap-2.5 w-full">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                                      #{entryIndex + 1}
                                    </span>
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 break-words">
                                      {entry.comment || entry.name || `条目 #${entryIndex + 1}`}
                                    </span>
                                    <span className="text-[9px] text-zinc-400 font-mono whitespace-nowrap shrink-0 ml-1">
                                      ~{entryTokens} tokens
                                    </span>
                                    {isConstant && (
                                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 whitespace-nowrap flex-shrink-0">
                                        常驻激活
                                      </span>
                                    )}
                                    {isSelective && (
                                      <span className="px-1.5 py-0.5 text-[8px] font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 whitespace-nowrap flex-shrink-0">
                                        选择性触发
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0 ml-auto pb-0.5 sm:pb-0">
                                    <BaseButton size="xs"
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(entry.content || '');
                                        showToast('已复制条目正文', 'success');
                                      }}
                                      className="px-2 py-0.5 text-[9px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                                      title="复制条目正文内容"
                                    >
                                      <Copy className="w-2.5 h-2.5" /> 复制
                                    </BaseButton>
                                    <BaseButton size="xs"
                                      type="button"
                                      onClick={() =>
                                        setFullscreenData({
                                          title: entry.comment || entry.name || `条目 #${entryIndex + 1}`,
                                          content: entry.content || '',
                                          type: 'text',
                                        })
                                      }
                                      className="px-2 py-0.5 text-[9px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                                      title="查看全屏详情"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> 查看
                                    </BaseButton>
                                  </div>
                                </div>
                                {/* Trigger Keywords Display */}
                                <div className="mt-0.5">
                                  {rawKeys.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                      <span className="text-[9px] font-semibold text-zinc-400">标签：</span>
                                      {rawKeys.map((k: string, kidx: number) => (
                                        <span
                                          key={kidx}
                                          className="px-1 sm:px-1.5 py-0.2 sm:py-0.5 text-[8px] sm:text-[9px] font-medium rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60"
                                        >
                                          {k}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-zinc-400 italic">
                                      {isConstant ? '常驻生效' : '无标签'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Read-Only Content Box */}
                              <div>
                                <div className="text-[10px] font-semibold text-zinc-400 mb-1">条目正文：</div>
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200 font-mono max-h-48 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words custom-gradient-bg select-text">
                                  {entry.content || <span className="text-zinc-400 italic">（内容为空）</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 4: 正则 (Regex - Editable) */}
              {detailTab === 'regex' && (
                <div className="space-y-4">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <BaseInput
                      type="search"
                      value={cardRegexSearchQuery}
                      onChange={(e) => setCardRegexSearchQuery(e.target.value)}
                      placeholder="搜索正则脚本名称、查找或替换内容..."
                      className="w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                      正则脚本 ({getCardRegex(displayDetailCard)?.length || 0})
                    </div>
                    <div className="flex items-center justify-start gap-2 flex-wrap">
                      <BaseButton size="xs"
                        type="button"
                        onClick={() =>
                          setFullscreenData({
                            title: `正则脚本原始数据/JSON - ${getCardDisplayName(displayDetailCard)}`,
                            content: JSON.stringify(getCardRegex(displayDetailCard) || [], null, 2),
                            type: 'json',
                          })
                        }
                        className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 cursor-pointer"
                        title="在手机或全屏中查看完整的正则脚本原始代码"
                      >
                        <Code2 className="w-3.5 h-3.5" /> 查看原始代码
                      </BaseButton>
                      <BaseButton size="xs"
                        type="button"
                        onClick={() => downloadJsonFile(`${getCardDisplayName(displayDetailCard)}_regex.json`, getCardRegex(displayDetailCard) || [])}
                        className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                      >
                        <Download className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> 导出 JSON
                      </BaseButton>
                      <BaseButton size="xs"
                        type="button"
                        onClick={() => setCardSectionImportModal('regex')}
                        className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                      >
                        <Upload className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> 导入
                      </BaseButton>
                      <BaseButton size="xs"
                        type="button"
                        onClick={() => {
                          const currentRegex = [...(getCardRegex(displayDetailCard) || [])];
                          currentRegex.push({
                            scriptName: '新正则脚本', script_name: '新正则脚本', name: '新正则脚本',
                            findRegex: '', find_regex: '', pattern: '',
                            replaceString: '', replace_string: '', replacement: '',
                            disabled: false,
                          });
                          saveCardRegexList(currentRegex);
                          setEditingCardRegex({ index: currentRegex.length - 1, scriptName: '新正则脚本', findRegex: '', replaceString: '' });
                        }}
                        className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-bold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                      >
                        <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> 添加正则脚本
                      </BaseButton>
                      {displayDetailCard.boundRegexes?.[0] && (
                        <BaseButton size="xs"
                          type="button"
                          onClick={() => {
                            const targetId = displayDetailCard.boundRegexes![0];
                            setDetailCardId(null);
                            setJumpTargetId(targetId);
                            setCurrentPage('st-regex');
                          }}
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-1 transition-colors whitespace-nowrap flex-shrink-0"
                          title="跳转至 ST 正则界面进行全面管理与编辑"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> 前往正则管理
                        </BaseButton>
                      )}
                    </div>
                  </div>

                  {(!getCardRegex(displayDetailCard) || getCardRegex(displayDetailCard).length === 0) ? (
                    <div className="text-center py-8 space-y-3 bg-zinc-50 dark:bg-zinc-800/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <p className="text-[10px] text-zinc-400">此角色卡暂无正则脚本</p>
                      <BaseButton size="xs"
                        onClick={() => setCardSectionImportModal('regex')}
                        className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[8.5px] sm:text-[10px] font-bold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Upload className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> 上传正则脚本文件
                      </BaseButton>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getCardRegex(displayDetailCard).map((rx: any, i: number) => {
                        const scriptName = (typeof rx?.scriptName === 'string' ? rx.scriptName : typeof rx?.script_name === 'string' ? rx.script_name : typeof rx?.name === 'string' ? rx.name : typeof rx?.title === 'string' ? rx.title : `正则 #${i + 1}`).trim();
                        const findRegex = (typeof rx?.findRegex === 'string' ? rx.findRegex : typeof rx?.find_regex === 'string' ? rx.find_regex : typeof rx?.pattern === 'string' ? rx.pattern : typeof rx?.find === 'string' ? rx.find : typeof rx?.regex === 'string' ? rx.regex : '') || '';
                        const replaceString = (typeof rx?.replaceString === 'string' ? rx.replaceString : typeof rx?.replace_string === 'string' ? rx.replace_string : typeof rx?.replacement === 'string' ? rx.replacement : typeof rx?.replace === 'string' ? rx.replace : '') || '';
                        const regexQuery = cardRegexSearchQuery.trim().toLowerCase();
                        if (regexQuery && !`${scriptName} ${findRegex} ${replaceString}`.toLowerCase().includes(regexQuery)) return null;
                        return (
                          <div key={i} className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1 text-left">
                                <div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{scriptName}</div>
                                <div className="text-[10px] text-zinc-400 mt-1 truncate">查找：{findRegex || '（空）'}</div>
                                <div className="text-[10px] text-zinc-400 truncate">替换：{replaceString || '（空）'}</div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() =>
                                    setFullscreenData({
                                      title: `正则详情 - ${scriptName}`,
                                      content: JSON.stringify(rx, null, 2),
                                      type: 'json',
                                    })
                                  }
                                  className="p-1 text-zinc-400 hover:text-blue-500"
                                  title="查看正则源码"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </BaseButton>
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => {
                                    const rxList = JSON.parse(JSON.stringify(getCardRegex(displayDetailCard)));
                                    rxList.splice(i, 1);
                                    saveCardRegexList(rxList);
                                    showToast('正则脚本已删除', 'info');
                                  }}
                                  className="p-1 text-zinc-400 hover:text-rose-500"
                                  title="删除"
                                ><Trash2 className="w-3.5 h-3.5" /></BaseButton>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: 原始数据 (Raw Data) */}
              {detailTab === 'raw' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">完整 JSON 原始数据</span>
                    <BaseButton size="xs"
                      onClick={() =>
                        setFullscreenData({
                          title: '原始 JSON 数据',
                          content: JSON.stringify(activeLiveCardData, null, 2),
                          type: 'json',
                        })
                      }
                      className="text-[8.5px] sm:text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                    >
                      <Maximize2 className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> 放大查看
                    </BaseButton>
                  </div>
                  <pre className="p-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 text-[13px] font-mono rounded-lg overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all max-h-96">
                    {JSON.stringify(activeLiveCardData, null, 2)}
                  </pre>
                </div>
              )}

              {/* TAB 6: 其他 (Extras) */}
              {detailTab === 'extras' && (
                <div className="space-y-6">
                  {/* Source Field (来源: QQ号/群、社区链接等，选填) */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl space-y-1.5">
                    <label className="block text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                      来源 / 出处（QQ号/群、Discord、社区链接等，选填）
                    </label>
                    <BaseInput
                      type="text"
                      defaultValue={displayDetailCard.source || ''}
                      onBlur={(e) => {
                        const val = e.target.value;
                        const updatedCards = appData.cards.map((c) =>
                          c.id === displayDetailCard.id ? { ...c, source: val } : c
                        );
                        updateAppData({ ...appData, cards: updatedCards });
                        showToast('来源信息已保存', 'success');
                      }}
                      placeholder="例如: QQ群: 12345678 / https://t.me/..."
                      className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  {/* Section 1: 作者的话 */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                        作者的话（截图） ({displayDetailCard.screenshots?.authorsNote?.length || 0})
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <BaseButton size="xs"
                          onClick={() => authorNoteInputRef.current?.click()}
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-1"
                        >
                          <Upload className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> 上传截图
                        </BaseButton>

                        {(displayDetailCard.screenshots?.authorsNote?.length || 0) > 0 && (
                          <BaseButton size="xs"
                            onClick={() => {
                              setAuthorNoteBatchMode((p) => !p);
                              setSelectedAuthorNoteIndices([]);
                            }}
                            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded border transition-colors ${
                              authorNoteBatchMode
                                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {authorNoteBatchMode ? '退出批量' : '批量删除截图'}
                          </BaseButton>
                        )}

                        {authorNoteBatchMode && (displayDetailCard.screenshots?.authorsNote?.length || 0) > 0 && (
                          <>
                            <BaseButton size="xs"
                              onClick={() => {
                                const allCount = displayDetailCard.screenshots?.authorsNote?.length || 0;
                                if (selectedAuthorNoteIndices.length === allCount) {
                                  setSelectedAuthorNoteIndices([]);
                                } else {
                                  setSelectedAuthorNoteIndices(Array.from({ length: allCount }, (_: any, i: number) => i));
                                }
                              }}
                              className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              {selectedAuthorNoteIndices.length === (displayDetailCard.screenshots?.authorsNote?.length || 0)
                                ? '取消全选'
                                : '全选'}
                            </BaseButton>

                            {selectedAuthorNoteIndices.length > 0 && (
                              <BaseButton size="xs"
                                onClick={() => {
                                  if (!confirm(`确定要删除选中的 ${selectedAuthorNoteIndices.length} 张“作者的话”截图吗？`)) return;
                                  const updatedNotes = (displayDetailCard.screenshots?.authorsNote || []).filter(
                                    (_: any, idx: number) => !selectedAuthorNoteIndices.includes(idx)
                                  );
                                  const updatedCards = appData.cards.map((c) =>
                                    c.id === displayDetailCard.id
                                      ? {
                                          ...c,
                                          screenshots: {
                                            authorsNote: updatedNotes,
                                            favoriteScenes: c.screenshots?.favoriteScenes || [],
                                          },
                                        }
                                      : c
                                  );
                                  updateAppData({ ...appData, cards: updatedCards });
                                  setSelectedAuthorNoteIndices([]);
                                  setAuthorNoteBatchMode(false);
                                  showToast('已批量删除选中的截图', 'info');
                                }}
                                className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> 删除选中 ({selectedAuthorNoteIndices.length})
                              </BaseButton>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={authorNoteInputRef}
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []) as File[];
                        if (files.length === 0) return;
                        const newScreenshots: string[] = [];
                        for (const f of files) {
                          const scaled = await processImageFile(f, 800, 800);
                          newScreenshots.push(scaled);
                          await new Promise((resolve) => setTimeout(resolve, 0));
                        }
                        const existing = displayDetailCard.screenshots?.authorsNote || [];
                        const updatedCards = appData.cards.map((c) =>
                          c.id === displayDetailCard.id
                            ? {
                                ...c,
                                screenshots: {
                                  authorsNote: [...existing, ...newScreenshots],
                                  favoriteScenes: c.screenshots?.favoriteScenes || [],
                                },
                              }
                            : c
                        );
                        updateAppData({ ...appData, cards: updatedCards });
                        showToast(`已添加 ${files.length} 张“作者的话”截图`, 'success');
                        e.target.value = '';
                      }}
                    />

                    {/* Screenshots Grid for Author's Notes */}
                    {(!displayDetailCard.screenshots?.authorsNote || displayDetailCard.screenshots.authorsNote.length === 0) ? (
                      <p className="text-[10px] text-zinc-400 italic">暂无“作者的话”截图</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {displayDetailCard.screenshots.authorsNote.map((imgSrc: any, idx: number) => {
                          const isSelected = selectedAuthorNoteIndices.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (authorNoteBatchMode) {
                                  if (isSelected) setSelectedAuthorNoteIndices((p) => p.filter((i) => i !== idx));
                                  else setSelectedAuthorNoteIndices((p) => [...p, idx]);
                                } else {
                                  setFullscreenData({ title: `作者的话截图 #${idx + 1}`, content: imgSrc, type: 'text' });
                                }
                              }}
                              className={`aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border relative group cursor-pointer transition-all ${
                                isSelected ? 'ring-2 ring-rose-500 border-transparent shadow-md' : 'border-zinc-200 dark:border-zinc-800'
                              }`}
                            >
                              <img src={imgSrc} alt="Author Note" className="w-full h-full object-cover" />

                              {/* Single Delete Button */}
                              {!authorNoteBatchMode && (
                                <span role="button" onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedNotes = displayDetailCard.screenshots!.authorsNote.filter((_: any, i: number) => i !== idx);
                                    const updatedCards = appData.cards.map((c) =>
                                      c.id === displayDetailCard.id
                                        ? { ...c, screenshots: { ...c.screenshots, authorsNote: updatedNotes, favoriteScenes: c.screenshots?.favoriteScenes || [] } }
                                        : c
                                    );
                                    updateAppData({ ...appData, cards: updatedCards });
                                    showToast('照片已删除', 'success');
                                  }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3 h-3" /></span>
                              )}

                              {/* Batch Selection Checkbox */}
                              {authorNoteBatchMode && (
                                <div className="absolute top-1 left-1 bg-black/40 rounded-full p-0.5">
                                  {isSelected ? (
                                    <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-white/80 drop-shadow" />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: 回忆 */}
                  <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                        回忆（截图） ({displayDetailCard.screenshots?.favoriteScenes?.length || 0})
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <BaseButton size="xs"
                          onClick={() => memoryInputRef.current?.click()}
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-1"
                        >
                          <Upload className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> 上传截图
                        </BaseButton>

                        {(displayDetailCard.screenshots?.favoriteScenes?.length || 0) > 0 && (
                          <BaseButton size="xs"
                            onClick={() => {
                              setMemoryBatchMode((p) => !p);
                              setSelectedMemoryIndices([]);
                            }}
                            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded border transition-colors ${
                              memoryBatchMode
                                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {memoryBatchMode ? '退出批量' : '批量删除截图'}
                          </BaseButton>
                        )}

                        {memoryBatchMode && (displayDetailCard.screenshots?.favoriteScenes?.length || 0) > 0 && (
                          <>
                            <BaseButton size="xs"
                              onClick={() => {
                                const allCount = displayDetailCard.screenshots?.favoriteScenes?.length || 0;
                                if (selectedMemoryIndices.length === allCount) {
                                  setSelectedMemoryIndices([]);
                                } else {
                                  setSelectedMemoryIndices(Array.from({ length: allCount }, (_: any, i: number) => i));
                                }
                              }}
                              className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-medium rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              {selectedMemoryIndices.length === (displayDetailCard.screenshots?.favoriteScenes?.length || 0)
                                ? '取消全选'
                                : '全选'}
                            </BaseButton>

                            {selectedMemoryIndices.length > 0 && (
                              <BaseButton size="xs"
                                onClick={() => {
                                  if (!confirm(`确定要删除选中的 ${selectedMemoryIndices.length} 张“回忆”截图吗？`)) return;
                                  const updatedScenes = (displayDetailCard.screenshots?.favoriteScenes || []).filter(
                                    (_: any, idx: number) => !selectedMemoryIndices.includes(idx)
                                  );
                                  const updatedCards = appData.cards.map((c) =>
                                    c.id === displayDetailCard.id
                                      ? { ...c, screenshots: { authorsNote: c.screenshots?.authorsNote || [], favoriteScenes: updatedScenes } }
                                      : c
                                  );
                                  updateAppData({ ...appData, cards: updatedCards });
                                  setSelectedMemoryIndices([]);
                                  setMemoryBatchMode(false);
                                  showToast('已批量删除选中的截图', 'info');
                                }}
                                className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[8.5px] sm:text-[10px] font-bold rounded bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> 删除选中 ({selectedMemoryIndices.length})
                              </BaseButton>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={memoryInputRef}
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []) as File[];
                        if (files.length === 0) return;
                        const newScreenshots: string[] = [];
                        for (const f of files) {
                          const scaled = await processImageFile(f, 800, 800);
                          newScreenshots.push(scaled);
                          await new Promise((resolve) => setTimeout(resolve, 0));
                        }
                        const existing = displayDetailCard.screenshots?.favoriteScenes || [];
                        const updatedCards = appData.cards.map((c) =>
                          c.id === displayDetailCard.id
                            ? {
                                ...c,
                                screenshots: {
                                  authorsNote: c.screenshots?.authorsNote || [],
                                  favoriteScenes: [...existing, ...newScreenshots],
                                },
                              }
                            : c
                        );
                        updateAppData({ ...appData, cards: updatedCards });
                        showToast(`已添加 ${files.length} 张“回忆”截图`, 'success');
                        e.target.value = '';
                      }}
                    />

                    {/* Screenshots Grid for Memories */}
                    {(!displayDetailCard.screenshots?.favoriteScenes || displayDetailCard.screenshots.favoriteScenes.length === 0) ? (
                      <p className="text-[10px] text-zinc-400 italic">暂无“回忆”截图</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {displayDetailCard.screenshots.favoriteScenes.map((imgSrc: any, idx: number) => {
                          const isSelected = selectedMemoryIndices.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (memoryBatchMode) {
                                  if (isSelected) setSelectedMemoryIndices((p) => p.filter((i) => i !== idx));
                                  else setSelectedMemoryIndices((p) => [...p, idx]);
                                } else {
                                  setFullscreenData({ title: `回忆截图 #${idx + 1}`, content: imgSrc, type: 'text' });
                                }
                              }}
                              className={`aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border relative group cursor-pointer transition-all ${
                                isSelected ? 'ring-2 ring-rose-500 border-transparent shadow-md' : 'border-zinc-200 dark:border-zinc-800'
                              }`}
                            >
                              <img src={imgSrc} alt="Memory Scene" className="w-full h-full object-cover" />

                              {/* Single Delete Button */}
                              {!memoryBatchMode && (
                                <span role="button" onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedScenes = displayDetailCard.screenshots!.favoriteScenes.filter((_: any, i: number) => i !== idx);
                                    const updatedCards = appData.cards.map((c) =>
                                      c.id === displayDetailCard.id
                                        ? { ...c, screenshots: { authorsNote: c.screenshots?.authorsNote || [], favoriteScenes: updatedScenes } }
                                        : c
                                    );
                                    updateAppData({ ...appData, cards: updatedCards });
                                    showToast('截图已删除', 'success');
                                  }} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3 h-3" /></span>
                              )}

                              {/* Batch Selection Checkbox */}
                              {memoryBatchMode && (
                                <div className="absolute top-1 left-1 bg-black/40 rounded-full p-0.5">
                                  {isSelected ? (
                                    <CheckCircle2 className="w-5 h-5 text-rose-500 fill-white" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-white/80 drop-shadow" />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>


                  {/* Section: 绑定的系统资产 (Worldbook/Script/Regex) */}
                  <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" /> 绑定的系统资产
                        </h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">当导出为 PNG/JSON 时，将自动打包这些资产</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Worldbooks */}
                      {(displayDetailCard.boundWorldBooks || []).map(wbId => {
                        const wb = appData.stWorldBooks?.find(w => w.id === wbId);
                        if (!wb) return null;
                        return (
                          <div key={wbId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">世界书: {wb.name}</div>
                                <div className="text-[10px] text-zinc-400 truncate">{(wb.entries || []).length} 条目 · {wb.activeVersionLabel || 'v1'}</div>
                              </div>
                            </div>
                            <BaseButton size="xs"
                              type="button"
                              onClick={() => {
                                setDetailCardId(null);
                                setJumpTargetId(wbId);
                                setCurrentPage('st-worldbooks');
                              }}
                              className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                              title="跳转至 ST 世界书分界面查看与管理此文件"
                            >
                              <ExternalLink className="w-3 h-3" /> 跳转分界面
                            </BaseButton>
                          </div>
                        );
                      })}
                      {/* Scripts */}
                      {(displayDetailCard.boundScripts || []).map(sId => {
                        const s = appData.scripts?.find(scr => scr.id === sId);
                        if (!s) return null;
                        return (
                          <div key={sId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                                <Code2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">脚本: {s.name}</div>
                                <div className="text-[10px] text-zinc-400 truncate">{s.activeVersionLabel || 'v1'}</div>
                              </div>
                            </div>
                            <BaseButton size="xs"
                              type="button"
                              onClick={() => {
                                setDetailCardId(null);
                                setJumpTargetId(sId);
                                setCurrentPage('st-scripts');
                              }}
                              className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                              title="跳转至酒馆脚本分界面查看与管理此文件"
                            >
                              <ExternalLink className="w-3 h-3" /> 跳转分界面
                            </BaseButton>
                          </div>
                        );
                      })}
                      {/* Regexes */}
                      {(displayDetailCard.boundRegexes || []).map(rId => {
                        const r = appData.stRegexScripts?.find(rx => rx.id === rId);
                        if (!r) return null;
                        return (
                          <div key={rId} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                                <Cpu className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">正则: {r.scriptName}</div>
                                <div className="text-[10px] text-zinc-400 truncate">{(r.rules || []).length} 规则 · {r.activeVersionLabel || 'v1'}</div>
                              </div>
                            </div>
                            <BaseButton size="xs"
                              type="button"
                              onClick={() => {
                                setDetailCardId(null);
                                setJumpTargetId(rId);
                                setCurrentPage('st-regex');
                              }}
                              className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/60 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                              title="跳转至 ST 正则分界面查看与管理此文件"
                            >
                              <ExternalLink className="w-3 h-3" /> 跳转分界面
                            </BaseButton>
                          </div>
                        );
                      })}
                      {(!displayDetailCard.boundWorldBooks?.length && !displayDetailCard.boundScripts?.length && !displayDetailCard.boundRegexes?.length) && (
                        <p className="text-[10px] text-zinc-400 italic">暂无绑定的系统资产。</p>
                      )}
                    </div>
                  </div>

                  {/* Section 3: 关联角色卡 */}
                  <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5" /> 关联角色卡
                        </h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">仅显示“角色名 + 作者”都完全相同的角色卡</p>
                      </div>
                    </div>

                    {getAssociationCandidates(displayDetailCard).length > 0 ? (
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
                        <CustomSelect
                          value={associationTargetId}
                          onChange={(val) => setAssociationTargetId(val)}
                          placeholder="选择要关联的角色卡…"
                          options={[
                            { value: '', label: '选择要关联的角色卡…' },
                            ...getAssociationCandidates(displayDetailCard).map((card) => ({
                              value: card.id,
                              label: `${getCardDisplayName(card)} · 作者：${getCardCreator(card)}`,
                            })),
                          ]}
                          className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none flex items-center justify-between"
                        />

                        <div className="flex flex-col sm:flex-row gap-2">
                          <BaseInput
                            type="text"
                            value={associationNote}
                            onChange={(e) => setAssociationNote(e.target.value)}
                            placeholder="描述 / 备注（可选）"
                            className="flex-1 px-3 py-2 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none"
                          />
                          <label className="flex items-center gap-1.5 px-2.5 py-2 text-[10px] text-zinc-700 dark:text-zinc-300 whitespace-nowrap cursor-pointer">
                            <input
                              type="checkbox"
                              checked={associationPrimary}
                              onChange={(e) => setAssociationPrimary(e.target.checked)}
                              className="w-3.5 h-3.5"
                            />
                            将关联卡设为主卡
                          </label>
                          <BaseButton size="xs"
                            type="button"
                            onClick={handleAddCardAssociation}
                            className="px-3 py-2 text-[10px] font-bold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 whitespace-nowrap"
                          >
                            添加关联
                          </BaseButton>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-400 italic">没有找到作者和角色名都相同、且尚未关联的角色卡。</p>
                    )}

                    {(displayDetailCard.associations || []).length > 0 ? (
                      <div className="space-y-2">
                        {(displayDetailCard.associations || []).map((association) => {
                          const relatedCard = appData.cards.find((c) => c.id === association.cardId);
                          if (!relatedCard) return null;
                          return (
                            <div key={association.cardId} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                              <div className="w-9 h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                                {relatedCard.coverImage ? (
                                  <img src={relatedCard.coverImage} alt="" className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-400"><FileText className="w-4 h-4" /></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{getCardDisplayName(relatedCard)}</span>
                                  {association.isPrimary && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">主卡</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-0.5 truncate">作者：{getCardCreator(relatedCard)}</div>
                                {association.note && association.noteOwnerId === displayDetailCard.id && (
                                  <div className="text-[10px] text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">备注：{association.note}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <BaseButton size="xs"
                                  type="button"
                                  onClick={() => openAssociatedCard(relatedCard.id)}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                  title="跳转到此角色卡"
                                >跳转</BaseButton>
                                <span role="button" onClick={() => handleRemoveCardAssociation(relatedCard.id)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-400 italic">暂无已关联角色卡。</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: QR (JSON) */}
              {detailTab === 'qr' && (() => {
                const qrDoc = displayDetailCard.qrData && typeof displayDetailCard.qrData === 'object'
                  ? normalizeQrDocument(displayDetailCard.qrData)
                  : { version: 2, name: '', qrList: [], idIndex: 0 };
                const visibleQr = (qrDoc.qrList || []).filter((item: any) => {
                  if (!qrSearchQuery.trim()) return true;
                  const q = qrSearchQuery.trim().toLowerCase();
                  return `${qrDoc.name || ''} ${item.label || ''} ${item.title || ''} ${item.message || ''}`.toLowerCase().includes(q);
                });
                return (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <BaseInput
                          type="search"
                          value={qrSearchQuery}
                          onChange={(e) => setQrSearchQuery(e.target.value)}
                          placeholder="搜索 QR 总名称..."
                          className="w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                        />
                      </div>
                      <div className="flex items-center justify-start gap-2 flex-wrap">
                        <BaseButton size="xs" type="button" onClick={() => setCardSectionImportModal('qr')} className="px-2 sm:px-3 py-1 sm:py-2 text-[8.5px] sm:text-[10px] font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" /> 导入
                        </BaseButton>
                        <BaseButton size="xs" type="button" onClick={addManualQr} className="px-2 sm:px-3 py-1 sm:py-2 text-[8.5px] sm:text-[10px] font-bold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" /> 增加 QR
                        </BaseButton>
                        <BaseButton size="xs" type="button" onClick={() => downloadJsonFile(`${qrDoc.name || getCardDisplayName(displayDetailCard)}_qr.json`, qrDoc)} className="px-2 sm:px-3 py-1 sm:py-2 text-[8.5px] sm:text-[10px] font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> 导出 JSON
                        </BaseButton>
                      </div>
                    </div>

                    {qrDoc.name && (
                      <div className="px-3 py-2 text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">QR 总名称：<span className="font-semibold text-zinc-800 dark:text-zinc-200">{qrDoc.name}</span></div>
                    )}

                    {visibleQr.length > 0 ? (
                      <div className="space-y-3">
                        {visibleQr.map((item: any, i: number) => (
                          <div key={`${item.id ?? i}-${i}`} className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{item.label || item.title || `QR #${i + 1}`}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">顺序 {i + 1} · ID {item.id ?? '-'}</div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300">{item.preventAutoExecute ? '手动' : '自动'}</span>
                                <BaseButton size="xs" type="button" onClick={() => setEditingQrItem({ index: qrDoc.qrList.indexOf(item), item: JSON.parse(JSON.stringify(item)) })} className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">编辑</BaseButton>
                                <BaseButton size="xs" type="button" onClick={() => deleteCardQrItem(qrDoc.qrList.indexOf(item))} className="px-2 py-1 text-[10px] font-semibold rounded-lg border border-red-200 text-red-600 dark:border-red-900/60 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">删除</BaseButton>
                              </div>
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">消息：{item.message || '（空）'}</div>
                            <pre className="p-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 text-[13px] font-mono rounded-lg overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all max-h-44 leading-relaxed">{JSON.stringify(item, null, 2)}</pre>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-[10px] text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">暂无 QR 条目</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Bottom Sticky Footer Bar: 顶栏和底栏颜色一致，按键缩小 */}
            <div data-design-id="card-detail-footer" className="px-3 sm:px-4 py-1.5 border-t border-[var(--line,rgba(96,126,149,0.2))] flex flex-wrap items-center justify-between gap-2 flex-shrink-0 bg-[var(--modal-bar-bg,#DFE5EA)] dark:bg-[var(--modal-bar-bg,#172029)] transition-colors">
              <BaseButton size="xs"
                type="button"
                onClick={() => {
                  requestDelete(`确定要删除角色卡 “${getCardDisplayName(displayDetailCard)}” 吗？其专属绑定的世界书、脚本、正则等资源也将同步删除。`, 1, () => {
                    const { updatedAppData, deletedCounts } = deleteCardsAndCascadeAssets([displayDetailCard.id], appData);
                    updateAppData(updatedAppData);
                    setDetailCardId(null);
                    const extraParts: string[] = [];
                    if (deletedCounts.worldbooks > 0) extraParts.push(`${deletedCounts.worldbooks} 个世界书`);
                    if (deletedCounts.scripts > 0) extraParts.push(`${deletedCounts.scripts} 个脚本`);
                    if (deletedCounts.regexes > 0) extraParts.push(`${deletedCounts.regexes} 个正则`);
                    const extraStr = extraParts.length > 0 ? `，并同步清理了其绑定的 ${extraParts.join('、')}` : '';
                    showToast(`已彻底删除该角色卡${extraStr}`, 'info');
                  });
                }}
                className="px-2 py-0.5 !text-[10px] font-semibold rounded-none bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1 whitespace-nowrap shrink-0 border-0 border-b-2 border-b-rose-800 cursor-pointer transition-all active:scale-95 min-h-[32px] max-h-[36px] !py-1 leading-none"
              >
                <Trash2 className="w-2.5 h-2.5" /> 删除角色卡
              </BaseButton>

              <div className="flex flex-wrap items-center gap-2">
                <BaseButton size="xs"
                  type="button"
                  designId="card-detail-ai-refine-footer-btn"
                  onClick={() => setShowAIRefineModal(true)}
                  className="px-2.5 py-0.5 !text-[10px] font-bold rounded-none bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] hover:bg-[var(--accent,#607E95)] hover:text-white flex items-center gap-1 whitespace-nowrap shrink-0 border border-[var(--line-focus,rgba(96,126,149,0.4))] cursor-pointer transition-all active:scale-95 min-h-[32px] max-h-[36px] !py-1 leading-none"
                  title="使用 AI 精修当前角色卡规范与格式"
                >
                  <Sparkles className="w-2.5 h-2.5" /> AI精修
                </BaseButton>

                <BaseButton size="xs"
                  type="button"
                  onClick={() => {
                    const authorInputEl = document.getElementById('authorInputVal') as HTMLInputElement;
                    const newAuthor = authorInputEl?.value.trim() || '';
                    const updatedCards = appData.cards.map((c) =>
                      c.id === displayDetailCard.id
                        ? {
                            ...c,
                            author: newAuthor,
                            authorManual: true,
                            editHistory: { ...c.editHistory, author: newAuthor },
                            edited: true,
                          }
                        : c
                    );
                    updateAppData({ ...appData, cards: updatedCards });
                    originalDetailCardRef.current = updatedCards.find((c) => c.id === displayDetailCard.id) || null;
                    showToast('角色卡详情与修改已成功保存！', 'success');
                  }}
                  className="px-2.5 py-0.5 !text-[10px] font-bold rounded-none bg-[var(--accent,#607E95)] text-white hover:brightness-105 flex items-center gap-1 whitespace-nowrap shrink-0 border-0 border-b-2 border-b-[var(--accent-hover,#486175)] cursor-pointer transition-all active:scale-95 min-h-[32px] max-h-[36px] !py-1 leading-none"
                >
                  <Save className="w-2.5 h-2.5" /> 保存修改
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Refine Modal for Single Character Card */}
      {showAIRefineModal && displayDetailCard && (
        <BatchAIRefineModal
          isOpen={showAIRefineModal}
          onClose={() => setShowAIRefineModal(false)}
          selectedCardIds={[displayDetailCard.id]}
          appData={appData}
          updateAppData={updateAppData}
          showToast={showToast}
        />
      )}

    </>
  );
};
