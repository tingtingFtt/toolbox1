import { useState, useCallback } from 'react';
import { AppData, CardEntry, BatchImportProgressState, StagedDuplicateCard, ItemVersion } from '../types';
import { DuplicateAction } from '../components/modals/DuplicateConfirmModal';
import { parseCardFile, extractBundledAssets } from '../utils';
import { findMatchingCardAndVersion, CardMatchDetail } from '../utils/diffEngine';
import { createImportAbortController, abortActiveImport, isImportAborted } from '../utils/importCancellation';

export function useImportEngine(
  appData: AppData,
  updateAppData: any,
  currentGroup: string,
  setBatchImportProgress: any,
  showToast: any,
  askChoiceAsync: any,
  setStagedDuplicates: any,
  setShowStagingVaultModal: any,
  autoAssociateAllAssets: any,
  promptDuplicateAction: any
) {
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    let successCount = 0;
    let updatedVersionCount = 0;
    let distinctCardCount = 0;
    let overwrittenCount = 0;
    let stagedDuplicateCount = 0;
    let skippedCount = 0;
    let failCount = 0;
    
    const total = fileArr.length;
    const isBulk = total > 1;
    const groupForNewCards = currentGroup !== '全部分组' ? currentGroup : '默认';

    createImportAbortController();

    // Initialize Batch Import Progress Modal / Floating Ball
    setBatchImportProgress({
      isActive: true,
      isMinimized: false,
      total,
      current: 0,
      currentName: '正在启动导入引擎...',
      currentPhase: 'parsing',
      startTime: Date.now(),
      stats: {
        added: 0,
        updatedVersion: 0,
        distinctCard: 0,
        overwritten: 0,
        skipped: 0,
        stagedDuplicates: 0,
        failed: 0
      },
      stagedCards: [],
      isCompleted: false,
      onCancelImport: () => {
        abortActiveImport();
      }
    });

    let currentCards = [...(appData.cards || [])];
    let currentWorldBooks = [...(appData.stWorldBooks || [])];
    let currentScripts = [...(appData.scripts || [])];
    let currentRegexes = [...(appData.stRegexScripts || [])];
    let currentTags = [...(appData.cardTags || [])];
    const newStagedDuplicates: any[] = [];

    let batchDuplicateAction: DuplicateAction | null = null;

    for (let i = 0; i < fileArr.length; i++) {
      if (isImportAborted()) {
        showToast('已终止导入，未写入后续卡片', 'info');
        setBatchImportProgress(null);
        return;
      }

      const file = fileArr[i];
      
      // Update progress state before each file
      setBatchImportProgress((prev: BatchImportProgressState | null) => prev ? {
        ...prev,
        current: i,
        currentName: file.name,
        currentPhase: 'diffing',
        stats: {
          added: successCount,
          updatedVersion: updatedVersionCount,
          distinctCard: distinctCardCount,
          overwritten: overwrittenCount,
          skipped: skippedCount,
          stagedDuplicates: stagedDuplicateCount,
          failed: failCount
        }
      } : null);

      // Yield event loop to ensure smooth floating ball animation
      await new Promise(resolve => setTimeout(resolve, 0));

      try {
        const card = await parseCardFile(file);
        card.group = groupForNewCards;

        // Ensure proper local tagging (固定标签: '本地')
        const existingCustomTags = (card.customTags || []).filter(t => t !== '酒馆' && t !== '酒馆同步');
        card.customTags = Array.from(new Set([...existingCustomTags, '本地']));

        // Auto import embedded custom tags to app's cardTags
        if (card.customTags && card.customTags.length > 0) {
          currentTags = Array.from(new Set([...currentTags, ...(card.customTags || [])]));
        }

        // Two-Stage Duplicate Detection:
        // Stage 1: Preliminary filter by filename / character name
        // Stage 2: 64-bit Hash finger-printing and historical version diffing
        const matchDetail = findMatchingCardAndVersion(card, currentCards);

        if (!matchDetail) {
          // No duplicate found -> Fresh new unique card
          const extracted = extractBundledAssets(
            card,
            {
              ...appData,
              cards: currentCards,
              stWorldBooks: currentWorldBooks,
              scripts: currentScripts,
              stRegexScripts: currentRegexes,
            },
            {
              forceNewVersion: false,
              matchedCard: null,
              cardVersionLabel: 'v1',
              versionSummary: '初始导入版本'
            }
          );

          if (extracted.boundWbIds.length > 0) {
            card.boundWorldBooks = extracted.boundWbIds;
          }
          if (extracted.boundScriptIds.length > 0) {
            card.boundScripts = extracted.boundScriptIds;
          }
          if (extracted.boundRegexIds.length > 0) {
            card.boundRegexes = extracted.boundRegexIds;
          }

          // Merge companion assets
          extracted.newWorldBooks.forEach((w: any) => {
            const idx = currentWorldBooks.findIndex(x => x.id === w.id);
            if (idx > -1) currentWorldBooks[idx] = w;
            else currentWorldBooks.push(w);
          });
          extracted.newScripts.forEach((s: any) => {
            const idx = currentScripts.findIndex(x => x.id === s.id);
            if (idx > -1) currentScripts[idx] = s;
            else currentScripts.push(s);
          });
          extracted.newRegexes.forEach((r: any) => {
            const idx = currentRegexes.findIndex(x => x.id === r.id);
            if (idx > -1) currentRegexes[idx] = r;
            else currentRegexes.push(r);
          });

          card.activeVersionNumber = 1;
          card.activeVersionLabel = 'v1';
          card.importedAt = Date.now();
          card.currentVersionSummary = '初始导入版本';
          currentCards.push(card);
          successCount++;
        } else {
          // Duplicate / matching card detected -> Stage into Staging Vault (暂存处)
          // Non-duplicate cards will continue importing smoothly, and user can decide staged cards when all finish
          const stagedItem: StagedDuplicateCard = {
            id: 'staged_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            incomingCard: card,
            matchedCard: matchDetail.matchedCard,
            matchDetail,
            stagedAt: Date.now(),
            fileSource: 'local',
            userDecision: 'new_version'
          };
          newStagedDuplicates.push(stagedItem);
          stagedDuplicateCount++;
        }
      } catch (err: any) {
        failCount++;
        showToast(`文件 "${file.name}" 解析失败: ${err.message}`, 'error');
      }
    }

    if (isImportAborted()) {
      showToast('已终止导入，未写入后续卡片', 'info');
      setBatchImportProgress(null);
      return;
    }

    // Update state atomically and run auto-association
    updateAppData((prev: any) => {
      const existingStaged = prev.stagedDuplicateCards || [];
      const updatedStaged = [...existingStaged, ...newStagedDuplicates];
      const synced = autoAssociateAllAssets({
        ...prev,
        cards: currentCards,
        stWorldBooks: currentWorldBooks,
        scripts: currentScripts,
        stRegexScripts: currentRegexes,
        cardTags: Array.from(new Set(currentTags)),
        stagedDuplicateCards: updatedStaged
      });
      return synced;
    });

    // Complete Progress Modal
    setBatchImportProgress((prev: BatchImportProgressState | null) => prev ? {
      ...prev,
      current: total,
      currentName: '导入完成，正在准备决策暂存...',
      currentPhase: 'complete',
      stats: {
        added: successCount,
        updatedVersion: updatedVersionCount,
        distinctCard: distinctCardCount,
        overwritten: overwrittenCount,
        skipped: skippedCount,
        stagedDuplicates: stagedDuplicateCount,
        failed: failCount
      },
      isCompleted: true
    } : null);

    const summaryParts: string[] = [];
    if (successCount > 0) summaryParts.push(`已入库 ${successCount} 张新卡`);
    if (stagedDuplicateCount > 0) summaryParts.push(`已放入暂存处 ${stagedDuplicateCount} 张重复卡面`);
    if (failCount > 0) summaryParts.push(`失败 ${failCount} 张`);

    showToast(`角色卡导入完成：${summaryParts.join('，') || '未发现变动'}`, 'success');

    // If duplicate cards were staged, automatically open the Staging Vault for user decision
    if (newStagedDuplicates.length > 0) {
      setTimeout(() => {
        setShowStagingVaultModal?.(true);
      }, 300);
    }
  };

  return { handleFileUpload };
}
