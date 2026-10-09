import { CardEntry, STWorldBookEntry, ScriptEntry, STRegexEntry, AppData } from '../types';
import { findMatchingCardAndVersion, CardMatchDetail } from './diffEngine';
import { extractBundledAssets } from '../utils';
import { DuplicateAction } from '../components/modals/DuplicateConfirmModal';
import { 
  recordTavernCardFingerprint, 
  getCardFingerprintHash 
} from './tavernLedger';

export interface CardProcessResult {
  currentCards: CardEntry[];
  currentWorldBooks: STWorldBookEntry[];
  currentScripts: ScriptEntry[];
  currentRegexes: STRegexEntry[];
  currentTags: string[];
  stats: {
    added: number;
    updatedVersion: number;
    distinctCard: number;
    overwritten: number;
    skipped: number;
    failed: number;
  };
}

export type DuplicatePromptHandler = (
  incomingCard: CardEntry,
  matchDetail: CardMatchDetail,
  remainingCount: number,
  context?: {
    isTavernSource?: boolean;
    isLocalConflict?: boolean;
    folderImportCount?: number;
  }
) => Promise<{ action: DuplicateAction; applyToAll: boolean }>;

/**
 * Process a list of CardEntry items (from file upload or SillyTavern network/folder pull)
 * with robust 2-tier duplicate screening:
 * - Tier 1: Character name & Preliminary metadata filter
 * - Tier 2: Deep content Hash / SHA-256 finger-printing & Version history diffing
 * 
 * Rules:
 * - Tavern subsequent imports (folder importCount > 0): Silently skip 100% identical Tavern cards.
 * - Tavern vs Local conflicts: Always prompt user for confirmation.
 * - Tavern 1st folder import (folder importCount === 0): Prompt user on internal/local duplicates and record immutable fingerprints.
 * - Local imports: Maintain standard rule - preserve history by defaulting duplicate to a new version snapshot.
 */
export async function processCardImportList(
  incomingCards: CardEntry[],
  currentAppData: AppData,
  promptDuplicateAction: DuplicatePromptHandler,
  options?: {
    defaultGroup?: string;
    sourceTag?: string;
    isTavernSource?: boolean;
    folderImportCount?: number;
    folderId?: string;
  }
): Promise<CardProcessResult> {
  const groupForNewCards = options?.defaultGroup || '默认';
  const defaultTag = options?.sourceTag || (options?.isTavernSource ? '酒馆' : undefined);
  const isTavern = !!options?.isTavernSource;
  const folderImportCount = options?.folderImportCount !== undefined ? options.folderImportCount : (isTavern ? 1 : 0);
  const folderId = options?.folderId;

  let currentCards = [...(currentAppData.cards || [])];
  let currentWorldBooks = [...(currentAppData.stWorldBooks || [])];
  let currentScripts = [...(currentAppData.scripts || [])];
  let currentRegexes = [...(currentAppData.stRegexScripts || [])];
  let currentTags = [...(currentAppData.cardTags || [])];

  const stats = {
    added: 0,
    updatedVersion: 0,
    distinctCard: 0,
    overwritten: 0,
    skipped: 0,
    failed: 0,
  };

  let batchDuplicateAction: DuplicateAction | null = null;
  let lastYieldTime = Date.now();

  for (let i = 0; i < incomingCards.length; i++) {
    const card = incomingCards[i];

    // Yield control to UI thread periodically to ensure smooth rendering and avoid freezing
    if (Date.now() - lastYieldTime > 16) {
      await new Promise(resolve => setTimeout(resolve, 0));
      lastYieldTime = Date.now();
    }

    try {
      if (!card.group) {
        card.group = groupForNewCards;
      }
      if (defaultTag && (!card.customTags || !card.customTags.includes(defaultTag))) {
        card.customTags = Array.from(new Set([...(card.customTags || []), defaultTag]));
      }
      if (isTavern) {
        card.customTags = Array.from(new Set([...(card.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆']));
        card.source = card.source || 'tavern-folder';
      } else {
        card.customTags = Array.from(new Set([...(card.customTags || []).filter(t => t !== '酒馆'), '本地']));
        card.source = card.source || 'local';
      }

      // Auto collect embedded custom tags
      if (card.customTags && card.customTags.length > 0) {
        currentTags = Array.from(new Set([...currentTags, ...(card.customTags || [])]));
      }

      // Two-Tier Duplicate Detection:
      // Tier 1: Preliminary filter by character name / filename
      // Tier 2: Content Hash finger-printing and historical version diffing
      const matchDetail = findMatchingCardAndVersion(card, currentCards);

      if (!matchDetail) {
        // No duplicate found -> Fresh new unique card
        const extracted = extractBundledAssets(
          card,
          {
            ...currentAppData,
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
        stats.added++;

        if (isTavern) {
          recordTavernCardFingerprint(card, 'new_added', folderId);
        }
      } else {
        const matchedCard = matchDetail.matchedCard;
        const isMatchedTavernCard = (matchedCard.customTags || []).includes('酒馆') || matchedCard.source === 'tavern' || matchedCard.source === 'tavern-folder' || matchedCard.source === 'tavern-network';
        const isMatchedLocalCard = (matchedCard.customTags || []).includes('本地') || matchedCard.source === 'local' || matchedCard.source === 'local-file';

        // -------------------------------------------------------------
        // RULE CHECKING:
        // -------------------------------------------------------------
        // 1. Subsequent Tavern import (folderImportCount > 0):
        //    If exact hash match with existing Tavern card -> SILENTLY SKIP
        if (isTavern && folderImportCount > 0 && isMatchedTavernCard && matchDetail.isExactHashMatch) {
          stats.skipped++;
          continue;
        }

        // 2. Determine Action:
        let chosenAction: DuplicateAction;

        if (batchDuplicateAction) {
          chosenAction = batchDuplicateAction;
        } else {
          // Prompt user when duplicate/matching card is detected
          const remaining = incomingCards.length - 1 - i;
          const res = await promptDuplicateAction(card, matchDetail, remaining, {
            isTavernSource: isTavern,
            isLocalConflict: isMatchedLocalCard,
            folderImportCount
          });
          chosenAction = res.action;
          if (res.applyToAll) {
            batchDuplicateAction = res.action;
          }
        }

        if (chosenAction === 'skip') {
          stats.skipped++;
          if (isTavern) {
            recordTavernCardFingerprint(card, 'skipped', folderId);
          }
          continue;
        } else if (chosenAction === 'new_version') {
          // Upgrade as New Version Snapshot
          const currentVersions = matchedCard.versions || [];
          const verNum = currentVersions.length + 1;
          const nextVerNum = verNum + 1;
          const nextVerLabel = `v${nextVerNum}`;

          const prevSnapshot = {
            versionId: `ver_${matchedCard.id}_${verNum}_${Date.now()}`,
            versionNumber: verNum,
            versionLabel: matchedCard.activeVersionLabel || `v${verNum}`,
            updatedAt: matchedCard.updatedAt || matchedCard.createdAt || Date.now(),
            importedAt: (matchedCard as any).importedAt || matchedCard.createdAt || Date.now(),
            fileName: matchedCard.fileName,
            changeSummary: matchedCard.currentVersionSummary || `系统快照 (升级至 ${nextVerLabel} 前)`,
            data: {
              name: matchedCard.name,
              fileName: matchedCard.fileName,
              fileType: matchedCard.fileType,
              version: matchedCard.version,
              author: matchedCard.author,
              rawData: JSON.parse(JSON.stringify(matchedCard.rawData || {})),
              coverImage: matchedCard.coverImage,
              editHistory: matchedCard.editHistory ? JSON.parse(JSON.stringify(matchedCard.editHistory)) : undefined,
              customTags: matchedCard.customTags ? [...matchedCard.customTags] : [],
              boundWorldBooks: matchedCard.boundWorldBooks ? [...matchedCard.boundWorldBooks] : [],
              boundRegexes: matchedCard.boundRegexes ? [...matchedCard.boundRegexes] : [],
              boundScripts: matchedCard.boundScripts ? [...matchedCard.boundScripts] : []
            }
          };

          const extracted = extractBundledAssets(
            card,
            {
              ...currentAppData,
              cards: currentCards,
              stWorldBooks: currentWorldBooks,
              scripts: currentScripts,
              stRegexScripts: currentRegexes,
            },
            {
              forceNewVersion: true,
              matchedCard: matchedCard,
              cardVersionLabel: nextVerLabel,
              versionSummary: matchDetail.summary || `随角色卡 [${matchedCard.name}] ${nextVerLabel} 导入更新`
            }
          );

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

          const mergedTags = isTavern
            ? Array.from(new Set([...(matchedCard.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆', '已更新']))
            : Array.from(new Set([...(matchedCard.customTags || []).filter(t => t !== '酒馆'), '本地', '已更新']));

          const updatedCard: CardEntry = {
            ...matchedCard,
            rawData: card.rawData,
            fileName: card.fileName || matchedCard.fileName,
            fileType: card.fileType,
            version: card.version,
            author: card.author || matchedCard.author,
            coverImage: card.coverImage || matchedCard.coverImage,
            updatedAt: Date.now(),
            importedAt: Date.now(),
            source: isTavern ? 'tavern-folder' : 'local',
            activeVersionNumber: nextVerNum,
            activeVersionLabel: nextVerLabel,
            boundWorldBooks: extracted.boundWbIds.length > 0 ? extracted.boundWbIds : (matchedCard.boundWorldBooks || []),
            boundScripts: extracted.boundScriptIds.length > 0 ? extracted.boundScriptIds : (matchedCard.boundScripts || []),
            boundRegexes: extracted.boundRegexIds.length > 0 ? extracted.boundRegexIds : (matchedCard.boundRegexes || []),
            currentVersionSummary: matchDetail.isExactHashMatch 
              ? `导入重复文件 (与 ${matchDetail.matchedVersionLabel} 完全相同)`
              : (matchDetail.summary || `升级至新版本 (来源于 ${card.fileName || card.name})`),
            customTags: mergedTags,
            versions: [prevSnapshot, ...currentVersions]
          };

          const idx = currentCards.findIndex(c => c.id === matchedCard.id);
          if (idx > -1) {
            currentCards[idx] = updatedCard;
          } else {
            currentCards.push(updatedCard);
          }
          stats.updatedVersion++;

          if (isTavern) {
            recordTavernCardFingerprint(updatedCard, 'new_version', folderId);
          }
        } else if (chosenAction === 'overwrite') {
          // Overwrite active version in place
          const extracted = extractBundledAssets(
            card,
            {
              ...currentAppData,
              cards: currentCards,
              stWorldBooks: currentWorldBooks,
              scripts: currentScripts,
              stRegexScripts: currentRegexes,
            },
            {
              forceNewVersion: false,
              matchedCard: matchedCard,
              cardVersionLabel: matchedCard.activeVersionLabel || 'v1',
              versionSummary: `直接覆盖当前版本 (来源于 ${card.fileName || card.name})`
            }
          );

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

          const mergedTags = isTavern
            ? Array.from(new Set([...(matchedCard.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆']))
            : Array.from(new Set([...(matchedCard.customTags || []).filter(t => t !== '酒馆'), '本地']));

          const updatedCard: CardEntry = {
            ...matchedCard,
            rawData: card.rawData,
            fileName: card.fileName || matchedCard.fileName,
            fileType: card.fileType,
            version: card.version,
            author: card.author || matchedCard.author,
            coverImage: card.coverImage || matchedCard.coverImage,
            updatedAt: Date.now(),
            source: isTavern ? 'tavern-folder' : 'local',
            boundWorldBooks: extracted.boundWbIds.length > 0 ? extracted.boundWbIds : (matchedCard.boundWorldBooks || []),
            boundScripts: extracted.boundScriptIds.length > 0 ? extracted.boundScriptIds : (matchedCard.boundScripts || []),
            boundRegexes: extracted.boundRegexIds.length > 0 ? extracted.boundRegexIds : (matchedCard.boundRegexes || []),
            currentVersionSummary: `覆盖更新于 ${new Date().toLocaleDateString()}`,
            customTags: mergedTags
          };

          const idx = currentCards.findIndex(c => c.id === matchedCard.id);
          if (idx > -1) {
            currentCards[idx] = updatedCard;
          } else {
            currentCards.push(updatedCard);
          }
          stats.overwritten++;

          if (isTavern) {
            recordTavernCardFingerprint(updatedCard, 'overwrite', folderId);
          }
        } else if (chosenAction === 'distinct_face') {
          // Save as distinct card with bidirectional association
          const distinctCardId = 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
          const distinctTags = isTavern
            ? Array.from(new Set([...(card.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆', '同名卡面']))
            : Array.from(new Set([...(card.customTags || []).filter(t => t !== '酒馆'), '本地', '同名卡面']));

          const distinctCard: CardEntry = {
            ...card,
            id: distinctCardId,
            customTags: distinctTags,
            source: isTavern ? 'tavern-folder' : 'local',
            associations: [
              ...(card.associations || []),
              {
                cardId: matchedCard.id,
                note: `同名卡面变体 (${matchedCard.fileName || '原卡面'})`,
                createdAt: Date.now()
              }
            ]
          };

          // Update existing card's association list
          const updatedMatchedCard: CardEntry = {
            ...matchedCard,
            associations: [
              ...(matchedCard.associations || []),
              {
                cardId: distinctCardId,
                note: `同名卡面变体 (${distinctCard.fileName || '新卡面'})`,
                createdAt: Date.now()
              }
            ]
          };

          const idx = currentCards.findIndex(c => c.id === matchedCard.id);
          if (idx > -1) {
            currentCards[idx] = updatedMatchedCard;
          }
          currentCards.push(distinctCard);
          stats.distinctCard++;

          if (isTavern) {
            recordTavernCardFingerprint(distinctCard, 'distinct_face', folderId);
          }
        }
      }
    } catch (err: any) {
      stats.failed++;
      console.error(`导入卡片 "${card.name || card.fileName}" 失败:`, err);
    }
  }

  return {
    currentCards,
    currentWorldBooks,
    currentScripts,
    currentRegexes,
    currentTags,
    stats,
  };
}
