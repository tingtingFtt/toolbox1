import {
  AppData, CardEntry, STWorldBookEntry, STRegexEntry, PresetEntry, ThemeEntry,
  ChatLogEntry, PluginEntry, ScriptEntry, ItemVersion, StagedDuplicateCard
} from '../types';
import { parseCardFile } from '../utils';
import {
  compareCards, compareWorldBooks, compareRegexScripts, comparePresets, compareThemes,
  DiffResult, generateCardFingerprint, CardMatchDetail, findMatchingCardAndVersion
} from './diffEngine';
import { extractBundledAssets } from '../utils';
import { autoAssociateAllAssets } from './associationEngine';
import {
  getFolderImportCount,
  incrementFolderImportCount,
  recordTavernCardFingerprint
} from './tavernLedger';
import { DuplicateAction } from '../components/modals/DuplicateConfirmModal';
import { DuplicatePromptHandler } from './cardImportProcessor';
import { isImportAborted } from './importCancellation';

export interface SyncStats {
  newAdded: number;
  updatedVersions: number;
  skippedDuplicates: number;
  stagedDuplicates?: number;
  distinctCard?: number;
  overwritten?: number;
  cards: number;
  worlds: number;
  regex: number;
  chats: number;
  presets: number;
  themes: number;
  plugins?: number;
  scripts?: number;
  details: {
    added: string[];
    updated: string[];
    skipped: string[];
    staged?: string[];
  };
}

export interface SyncProgressCallback {
  (progressPercent: number, currentFile: string, stats: SyncStats): void;
}

export interface FileItemInfo {
  file: File;
  relativePath: string;
}

/**
 * Recursively scans a FileSystemDirectoryHandle (Chrome/Edge Native File System Access API)
 */
export async function scanDirectoryHandle(
  dirHandle: any,
  currentPath = ''
): Promise<FileItemInfo[]> {
  const result: FileItemInfo[] = [];

  for await (const entry of dirHandle.values()) {
    if (isImportAborted()) {
      throw new DOMException('用户已终止导入', 'AbortError');
    }
    const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      const nameLower = entry.name.toLowerCase();
      const isValidExt =
        nameLower.endsWith('.png') ||
        nameLower.endsWith('.webp') ||
        nameLower.endsWith('.jpg') ||
        nameLower.endsWith('.jpeg') ||
        nameLower.endsWith('.json') ||
        nameLower.endsWith('.jsonl') ||
        nameLower.endsWith('.yaml') ||
        nameLower.endsWith('.yml') ||
        nameLower.endsWith('.zip') ||
        ((nameLower.endsWith('.js') || nameLower.endsWith('.css')) && (entryPath.toLowerCase().includes('script') || entryPath.toLowerCase().includes('plugin')));

      if (!isValidExt) continue;

      try {
        const file = await entry.getFile();
        result.push({ file, relativePath: entryPath });
      } catch (e) {
        console.warn(`Could not read file ${entryPath}:`, e);
      }
    } else if (entry.kind === 'directory') {
      const dirLower = entry.name.toLowerCase();
      // Avoid traversing build, cache or system directories
      if (
        !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', '.cache', 'coverage', '.vscode', '.git', '.github', 'tmp', 'temp'].includes(dirLower)
      ) {
        const subFiles = await scanDirectoryHandle(entry, entryPath);
        result.push(...subFiles);
      }
    }
  }

  return result;
}

/**
 * Converts standard HTML input FileList to FileItemInfo array,
 * automatically filtering out non-data directories (node_modules, .git, etc.)
 * and unsupported files to ensure fast, reliable parsing in standalone HTML.
 */
export function fileListToFileItems(files: FileList | File[]): FileItemInfo[] {
  const result: FileItemInfo[] = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const path = file.webkitRelativePath || file.name;
    const pathLower = path.toLowerCase();

    // 1. Skip system/build/cache directories
    if (
      pathLower.includes('/node_modules/') ||
      pathLower.startsWith('node_modules/') ||
      pathLower.includes('/.git/') ||
      pathLower.startsWith('.git/') ||
      pathLower.includes('/.github/') ||
      pathLower.startsWith('.github/') ||
      pathLower.includes('/.vscode/') ||
      pathLower.startsWith('.vscode/') ||
      pathLower.includes('/.cache/') ||
      pathLower.startsWith('.cache/') ||
      pathLower.includes('/dist/') ||
      pathLower.startsWith('dist/') ||
      pathLower.includes('/build/') ||
      pathLower.startsWith('build/') ||
      pathLower.includes('/coverage/') ||
      pathLower.startsWith('coverage/') ||
      pathLower.includes('/tmp/') ||
      pathLower.startsWith('tmp/') ||
      pathLower.includes('/temp/') ||
      pathLower.startsWith('temp/')
    ) {
      continue;
    }

    // 2. Only accept valid SillyTavern asset types
    const isValidExt =
      pathLower.endsWith('.png') ||
      pathLower.endsWith('.webp') ||
      pathLower.endsWith('.jpg') ||
      pathLower.endsWith('.jpeg') ||
      pathLower.endsWith('.json') ||
      pathLower.endsWith('.jsonl') ||
      pathLower.endsWith('.yaml') ||
      pathLower.endsWith('.yml') ||
      pathLower.endsWith('.zip') ||
      ((pathLower.endsWith('.js') || pathLower.endsWith('.css')) && (pathLower.includes('script') || pathLower.includes('plugin')));

    if (!isValidExt) {
      continue;
    }

    result.push({ file, relativePath: path });
  }

  return result;
}

/**
 * Recursively extracts files from a DataTransferItemList (drag-and-drop),
 * supporting full folder drop traversal even on standalone HTML (file:// protocol).
 */
export async function dataTransferToFileItems(items: DataTransferItemList | DataTransfer): Promise<FileItemInfo[]> {
  const result: FileItemInfo[] = [];
  const transferItems = (items as any).items || items;
  if (!transferItems || transferItems.length === 0) return result;

  const traverseEntry = async (entry: any, currentPath = ''): Promise<void> => {
    if (isImportAborted()) return;

    if (entry.isFile) {
      try {
        const file: File = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        const nameLower = entry.name.toLowerCase();
        const isValidExt =
          nameLower.endsWith('.png') ||
          nameLower.endsWith('.webp') ||
          nameLower.endsWith('.jpg') ||
          nameLower.endsWith('.jpeg') ||
          nameLower.endsWith('.json') ||
          nameLower.endsWith('.jsonl') ||
          nameLower.endsWith('.yaml') ||
          nameLower.endsWith('.yml') ||
          nameLower.endsWith('.zip') ||
          ((nameLower.endsWith('.js') || nameLower.endsWith('.css')) && (fullPath.toLowerCase().includes('script') || fullPath.toLowerCase().includes('plugin')));

        if (isValidExt) {
          result.push({ file, relativePath: fullPath });
        }
      } catch (err) {
        console.warn(`Failed reading dropped file ${entry.name}:`, err);
      }
    } else if (entry.isDirectory) {
      const dirLower = entry.name.toLowerCase();
      if (
        !entry.name.startsWith('.') &&
        !['node_modules', 'dist', 'build', '.cache', 'coverage', '.vscode', '.git', '.github', 'tmp', 'temp'].includes(dirLower)
      ) {
        const dirReader = entry.createReader();
        const readAllEntries = async (): Promise<any[]> => {
          const entries: any[] = [];
          while (true) {
            if (isImportAborted()) break;
            const batch: any[] = await new Promise((res) => {
              dirReader.readEntries(
                (results: any[]) => res(results || []),
                () => res([])
              );
            });
            if (!batch || batch.length === 0) break;
            entries.push(...batch);
          }
          return entries;
        };

        const subEntries = await readAllEntries();
        const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        for (const sub of subEntries) {
          if (isImportAborted()) break;
          await traverseEntry(sub, nextPath);
        }
      }
    }
  };

  const count = transferItems.length;
  for (let i = 0; i < count; i++) {
    if (isImportAborted()) break;
    const item = transferItems[i];
    if (item.kind === 'file') {
      const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
      if (entry) {
        await traverseEntry(entry);
      } else {
        const file = item.getAsFile ? item.getAsFile() : item;
        if (file) {
          result.push({ file, relativePath: file.name });
        }
      }
    }
  }

  return result;
}

/**
 * Executes high-performance, granular SillyTavern incremental synchronization
 * with two-tier duplicate screening, distinct Plugin/Script module routing,
 * folder lifecycle counts, and permanent ledger integration.
 */
export async function executeSmartSync(
  fileItems: FileItemInfo[],
  currentAppData: AppData,
  onProgress?: SyncProgressCallback,
  options?: {
    folderId?: string;
    folderName?: string;
    isLocalFolder?: boolean;
    isTavernSource?: boolean;
    onDuplicatePrompt?: DuplicatePromptHandler;
    abortSignal?: AbortSignal;
    checkAborted?: () => boolean;
  }
): Promise<{ updatedAppData: AppData; stats: SyncStats; stagedDuplicates: StagedDuplicateCard[] }> {
  const folderId = options?.folderId || options?.folderName || 'tavern_root_folder';
  const folderName = options?.folderName || '酒馆数据目录';
  const isTavernSource = !!options?.isTavernSource;

  const checkCancelled = () => {
    return Boolean(options?.abortSignal?.aborted || options?.checkAborted?.() || isImportAborted());
  };

  if (checkCancelled()) {
    throw new DOMException('用户已终止导入', 'AbortError');
  }

  const stats: SyncStats = {
    newAdded: 0,
    updatedVersions: 0,
    skippedDuplicates: 0,
    stagedDuplicates: 0,
    cards: 0,
    worlds: 0,
    regex: 0,
    chats: 0,
    presets: 0,
    themes: 0,
    plugins: 0,
    scripts: 0,
    details: {
      added: [],
      updated: [],
      skipped: [],
      staged: []
    }
  };

  const folderImportCount = getFolderImportCount(folderId);

  const stagedDuplicatesList: StagedDuplicateCard[] = [];
  const cardsList: CardEntry[] = (currentAppData.cards || []).map(c => ({ ...c }));
  const worldBooksList: STWorldBookEntry[] = (currentAppData.stWorldBooks || []).map(wb => ({ ...wb }));
  const regexList: STRegexEntry[] = (currentAppData.stRegexScripts || []).map(r => ({ ...r }));
  const presetsList: PresetEntry[] = (currentAppData.presets || []).map(p => ({ ...p }));
  const themesList: ThemeEntry[] = (currentAppData.themes || []).map(t => ({ ...t }));
  const chatsList: ChatLogEntry[] = (currentAppData.chatLogs || []).map(ch => ({ ...ch }));
  const pluginsList: PluginEntry[] = (currentAppData.plugins || []).map(pl => ({ ...pl }));
  const scriptsList: ScriptEntry[] = (currentAppData.scripts || []).map(sc => ({ ...sc }));

  const totalFiles = fileItems.length;
  let lastYieldTime = Date.now();

  for (let i = 0; i < totalFiles; i++) {
    if (checkCancelled()) {
      throw new DOMException('用户已终止导入', 'AbortError');
    }

    const { file, relativePath } = fileItems[i];
    const pathLower = relativePath.toLowerCase();

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalFiles) * 100), relativePath, stats);
    }

    // Yield every 25ms to keep UI responsive
    if (Date.now() - lastYieldTime > 25) {
      await new Promise(resolve => setTimeout(resolve, 0));
      lastYieldTime = Date.now();
      if (checkCancelled()) {
        throw new DOMException('用户已终止导入', 'AbortError');
      }
    }

    try {
      const isMatch = (folder: string) => new RegExp(`(^|/)${folder}/`, 'i').test(relativePath);

      // =========================================================================
      // 1. ST Character Cards (with two-tier check & folder lifecycle rules)
      // Supports standard ST characters/ directory, as well as direct card folders
      // =========================================================================
      const isLikelyCard = (
        isMatch('characters') ||
        isMatch('cards') ||
        pathLower.includes('character') ||
        pathLower.includes('card') ||
        ((pathLower.endsWith('.png') || pathLower.endsWith('.webp')) && !isMatch('backgrounds') && !isMatch('themes') && !isMatch('styles'))
      );

      if (
        isLikelyCard &&
        (pathLower.endsWith('.png') || pathLower.endsWith('.webp') || pathLower.endsWith('.json'))
      ) {
        if (checkCancelled()) {
          throw new DOMException('用户已终止导入', 'AbortError');
        }
        const parsedCard = await parseCardFile(file);
        if (checkCancelled()) {
          throw new DOMException('用户已终止导入', 'AbortError');
        }
        if (parsedCard && parsedCard.name) {
          const cardName = parsedCard.name.trim();

          // Stage 1 & 2: Two-tier comparison (初步比对名称关键信息 + 深度哈希比对)
          const matchDetail = findMatchingCardAndVersion(parsedCard, cardsList);

          if (!matchDetail) {
            // Case A: Fresh New Card (全新卡面)
            if (isTavernSource) {
              parsedCard.customTags = Array.from(new Set([...(parsedCard.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆']));
              parsedCard.source = 'tavern-folder';
            } else {
              parsedCard.customTags = Array.from(new Set([...(parsedCard.customTags || []).filter(t => t !== '酒馆'), '本地']));
              parsedCard.source = 'local';
            }
            parsedCard.activeVersionNumber = 1;
            parsedCard.activeVersionLabel = 'v1';
            parsedCard.currentVersionSummary = '初始同步导入版本';
            parsedCard.importedAt = Date.now();

            const extracted = extractBundledAssets(
              parsedCard,
              {
                ...currentAppData,
                cards: cardsList,
                stWorldBooks: worldBooksList,
                scripts: scriptsList,
                stRegexScripts: regexList,
              },
              {
                forceNewVersion: false,
                matchedCard: null,
                cardVersionLabel: 'v1',
                versionSummary: '初始导入版本'
              }
            );

            if (extracted.boundWbIds.length > 0) parsedCard.boundWorldBooks = extracted.boundWbIds;
            if (extracted.boundScriptIds.length > 0) parsedCard.boundScripts = extracted.boundScriptIds;
            if (extracted.boundRegexIds.length > 0) parsedCard.boundRegexes = extracted.boundRegexIds;

            extracted.newWorldBooks.forEach(w => {
              const idx = worldBooksList.findIndex(x => x.id === w.id);
              if (idx > -1) worldBooksList[idx] = w;
              else worldBooksList.push(w);
            });
            extracted.newRegexes.forEach(r => {
              const idx = regexList.findIndex(x => x.id === r.id);
              if (idx > -1) regexList[idx] = r;
              else regexList.push(r);
            });
            extracted.newScripts.forEach(s => {
              const idx = scriptsList.findIndex(x => x.id === s.id);
              if (idx > -1) scriptsList[idx] = s;
              else scriptsList.push(s);
            });

            cardsList.push(parsedCard);
            stats.newAdded++;
            stats.cards++;
            stats.details.added.push(`[角色卡] ${cardName}`);
            if (isTavernSource) {
              recordTavernCardFingerprint(parsedCard, 'new_added', folderId);
            }
          } else {
            // Collision detected - perform two-tier screening
            const targetMatchedCard = matchDetail.matchedCard;
            const isExactHash = matchDetail.isExactHashMatch || matchDetail.status === 'identical';

            if (folderImportCount === 0 || (!isExactHash && matchDetail.status !== 'partially_different')) {
              // First time folder sync OR completely different face -> Put into Staging Vault
              const stagedItem: StagedDuplicateCard = {
                id: 'staged_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
                incomingCard: parsedCard,
                matchedCard: targetMatchedCard,
                matchDetail: {
                  ...matchDetail,
                  matchedCard: targetMatchedCard
                },
                stagedAt: Date.now(),
                fileSource: isTavernSource ? 'tavern' : 'folder',
                userDecision: 'new_version'
              };
              stagedDuplicatesList.push(stagedItem);
              stats.stagedDuplicates = (stats.stagedDuplicates || 0) + 1;
              stats.details.staged = stats.details.staged || [];
              stats.details.staged.push(`[暂存待决] ${cardName}`);
            } else if (isExactHash) {
              // Exact Duplicate: Hash matches completely -> auto skip
              stats.skippedDuplicates++;
              const labelSuffix = matchDetail.matchedVersionLabel ? ` (与 ${matchDetail.matchedVersionLabel} 完全一致)` : '';
              stats.details.skipped.push(`[角色卡·跳过] ${cardName}${labelSuffix}`);
              if (isTavernSource) {
                recordTavernCardFingerprint(parsedCard, 'skipped_identical', folderId);
              }
            } else if (matchDetail.status === 'partially_different') {
              // Same card face with partial updates -> auto upgrade to new version
              const currentVersions = targetMatchedCard.versions || [];
              const verNum = currentVersions.length + 1;
              const nextVerNum = verNum + 1;
              const nextVerLabel = `v${nextVerNum}`;

              const extracted = extractBundledAssets(
                parsedCard,
                {
                  ...currentAppData,
                  cards: cardsList,
                  stWorldBooks: worldBooksList,
                  scripts: scriptsList,
                  stRegexScripts: regexList,
                },
                {
                  forceNewVersion: true,
                  matchedCard: targetMatchedCard,
                  cardVersionLabel: nextVerLabel,
                  versionSummary: matchDetail.summary || `增量同步升级至 ${nextVerLabel}`
                }
              );

              if (extracted.boundWbIds.length > 0) parsedCard.boundWorldBooks = extracted.boundWbIds;
              if (extracted.boundScriptIds.length > 0) parsedCard.boundScripts = extracted.boundScriptIds;
              if (extracted.boundRegexIds.length > 0) parsedCard.boundRegexes = extracted.boundRegexIds;

              extracted.newWorldBooks.forEach(w => {
                const idx = worldBooksList.findIndex(x => x.id === w.id);
                if (idx > -1) worldBooksList[idx] = w;
                else worldBooksList.push(w);
              });
              extracted.newRegexes.forEach(r => {
                const idx = regexList.findIndex(x => x.id === r.id);
                if (idx > -1) regexList[idx] = r;
                else regexList.push(r);
              });
              extracted.newScripts.forEach(s => {
                const idx = scriptsList.findIndex(x => x.id === s.id);
                if (idx > -1) scriptsList[idx] = s;
                else scriptsList.push(s);
              });

              const prevSnapshot: ItemVersion<any> = {
                versionId: `ver_${targetMatchedCard.id}_${verNum}_${Date.now()}`,
                versionNumber: verNum,
                versionLabel: targetMatchedCard.activeVersionLabel || `v${verNum}`,
                updatedAt: targetMatchedCard.updatedAt || targetMatchedCard.createdAt || Date.now(),
                importedAt: (targetMatchedCard as any).importedAt || targetMatchedCard.createdAt || Date.now(),
                fileName: targetMatchedCard.fileName,
                changeSummary: targetMatchedCard.currentVersionSummary || `系统自动快照 (升级至 ${nextVerLabel} 前)`,
                data: {
                  name: targetMatchedCard.name,
                  fileName: targetMatchedCard.fileName,
                  fileType: targetMatchedCard.fileType,
                  version: targetMatchedCard.version,
                  author: targetMatchedCard.author,
                  rawData: JSON.parse(JSON.stringify(targetMatchedCard.rawData || {})),
                  coverImage: targetMatchedCard.coverImage,
                  editHistory: targetMatchedCard.editHistory ? JSON.parse(JSON.stringify(targetMatchedCard.editHistory)) : undefined,
                  customTags: targetMatchedCard.customTags ? [...targetMatchedCard.customTags] : [],
                  boundWorldBooks: targetMatchedCard.boundWorldBooks ? [...targetMatchedCard.boundWorldBooks] : [],
                  boundRegexes: targetMatchedCard.boundRegexes ? [...targetMatchedCard.boundRegexes] : [],
                  boundScripts: targetMatchedCard.boundScripts ? [...targetMatchedCard.boundScripts] : []
                }
              };

              const updatedCustomTags = isTavernSource
                ? Array.from(new Set([...(targetMatchedCard.customTags || []).filter(t => t !== '本地' && t !== '本地导入'), '酒馆', '已更新']))
                : Array.from(new Set([...(targetMatchedCard.customTags || []).filter(t => t !== '酒馆'), '本地', '已更新']));

              const updatedCard: CardEntry = {
                ...targetMatchedCard,
                rawData: parsedCard.rawData,
                fileName: parsedCard.fileName || targetMatchedCard.fileName,
                fileType: parsedCard.fileType,
                version: parsedCard.version,
                author: parsedCard.author || targetMatchedCard.author,
                coverImage: parsedCard.coverImage || targetMatchedCard.coverImage,
                updatedAt: Date.now(),
                importedAt: Date.now(),
                source: isTavernSource ? 'tavern-folder' : 'local',
                activeVersionNumber: nextVerNum,
                activeVersionLabel: nextVerLabel,
                boundWorldBooks: parsedCard.boundWorldBooks || targetMatchedCard.boundWorldBooks || [],
                boundScripts: parsedCard.boundScripts || targetMatchedCard.boundScripts || [],
                boundRegexes: parsedCard.boundRegexes || targetMatchedCard.boundRegexes || [],
                currentVersionSummary: matchDetail.summary || `增量同步升级至 ${nextVerLabel}`,
                customTags: updatedCustomTags,
                versions: [prevSnapshot, ...currentVersions]
              };

              const idx = cardsList.findIndex(c => c.id === targetMatchedCard.id);
              if (idx > -1) cardsList[idx] = updatedCard;

              stats.updatedVersions++;
              stats.cards++;
              stats.details.updated.push(`[角色卡·新版本v${nextVerNum}] ${cardName}`);
              if (isTavernSource) {
                recordTavernCardFingerprint(updatedCard, 'new_version', folderId);
              }
            }
          }
        }
      }
      // =========================================================================
      // 2. World Books (worlds/ or worldinfo/ or containing worldbook/world/世界书) -> STWorldBooksSection
      // =========================================================================
      else if (
        pathLower.endsWith('.json') &&
        (isMatch('worlds') || isMatch('worldinfo') || pathLower.includes('worldbook') || pathLower.includes('lorebook') || pathLower.includes('world') || pathLower.includes('世界书'))
      ) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const wbName = (parsed.name || file.name.replace('.json', '')).trim();
        const wbNameLower = wbName.toLowerCase();
        const entries = parsed.entries || (Array.isArray(parsed) ? parsed : []);

        const existingSameNameWbs = worldBooksList.filter(w => (w.name || '').trim().toLowerCase() === wbNameLower);

        if (existingSameNameWbs.length === 0) {
          const newWb: STWorldBookEntry = {
            id: 'wb_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: wbName,
            fileName: file.name,
            entries: entries,
            jsonData: parsed,
            customTags: ['酒馆'],
            source: 'tavern-folder',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          worldBooksList.push(newWb);
          stats.newAdded++;
          stats.worlds++;
          stats.details.added.push(`[世界书] ${wbName}`);
        } else {
          let matchedWb: STWorldBookEntry | null = null;
          let bestDiff: DiffResult = { status: 'completely_different', similarity: 0, summary: '', changedFields: [] };
          let matchedVersionLabel = '';

          for (const extWb of existingSameNameWbs) {
            const diff = compareWorldBooks(entries, parsed, extWb);
            if (diff.status === 'identical') {
              matchedWb = extWb;
              bestDiff = diff;
              const activeVerNum = (extWb.versions?.length || 0) + 1;
              matchedVersionLabel = `v${activeVerNum}`;
              break;
            }
            if (extWb.versions && extWb.versions.length > 0) {
              let foundHistMatch = false;
              for (const ver of extWb.versions) {
                if (ver.data) {
                  const verEntries = ver.data.entries || ver.data || [];
                  const verJson = ver.data.jsonData || ver.data || {};
                  const histDiff = compareWorldBooks(entries, parsed, { ...extWb, entries: verEntries, jsonData: verJson });
                  if (histDiff.status === 'identical') {
                    matchedWb = extWb;
                    bestDiff = histDiff;
                    matchedVersionLabel = ver.versionLabel || `v${ver.versionNumber}`;
                    foundHistMatch = true;
                    break;
                  }
                }
              }
              if (foundHistMatch) break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedWb = extWb;
              bestDiff = diff;
            }
          }

          if (bestDiff.status === 'identical' && matchedWb) {
            stats.skippedDuplicates++;
            const labelSuffix = matchedVersionLabel ? ` (与 ${matchedVersionLabel} 相同)` : '';
            stats.details.skipped.push(`[世界书·完全一致跳过] ${wbName}${labelSuffix}`);
          } else if (bestDiff.status === 'partially_different' && matchedWb) {
            const updatedWb: STWorldBookEntry = {
              ...matchedWb,
              entries: entries,
              jsonData: parsed,
              fileName: file.name,
              updatedAt: Date.now(),
              customTags: Array.from(new Set([...(matchedWb.customTags || []), '酒馆', '已更新'])),
              versions: matchedWb.versions || []
            };

            const idx = worldBooksList.findIndex(w => w.id === matchedWb!.id);
            if (idx > -1) worldBooksList[idx] = updatedWb;

            stats.updatedVersions++;
            stats.worlds++;
            stats.details.updated.push(`[世界书·更新] ${wbName}`);
          } else {
            const newWb: STWorldBookEntry = {
              id: 'wb_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
              name: wbName,
              fileName: file.name,
              entries: entries,
              jsonData: parsed,
              customTags: ['酒馆', '同名世界书'],
              source: 'tavern-folder',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            worldBooksList.push(newWb);
            stats.newAdded++;
            stats.worlds++;
            stats.details.added.push(`[世界书·同名新世界书] ${wbName}`);
          }
        }
      }

      // =========================================================================
      // 3. ST Regex (regex/ or containing regex/正则) -> STRegexSection
      // =========================================================================
      else if (pathLower.endsWith('.json') && (isMatch('regex') || pathLower.includes('regex') || pathLower.includes('正则'))) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const scriptName = (parsed.scriptName || parsed.name || file.name.replace('.json', '')).trim();
        const scriptNameLower = scriptName.toLowerCase();
        const rules = parsed.rules || (Array.isArray(parsed) ? parsed : [parsed]);

        const existingSameNameRegexes = regexList.filter(r => (r.scriptName || '').trim().toLowerCase() === scriptNameLower);

        if (existingSameNameRegexes.length === 0) {
          const newRegex: STRegexEntry = {
            id: 'regex_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            scriptName: scriptName,
            fileName: file.name,
            findRegex: parsed.findRegex || '',
            replaceString: parsed.replaceString || '',
            rules: rules,
            jsonData: parsed,
            customTags: ['酒馆'],
            source: 'tavern-folder',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          regexList.push(newRegex);
          stats.newAdded++;
          stats.regex++;
          stats.details.added.push(`[正则] ${scriptName}`);
        } else {
          let matchedReg: STRegexEntry | null = null;
          let bestDiff: DiffResult = { status: 'completely_different', similarity: 0, summary: '', changedFields: [] };
          let matchedVersionLabel = '';

          for (const extR of existingSameNameRegexes) {
            const diff = compareRegexScripts(rules, parsed, parsed.findRegex, parsed.replaceString, extR);
            if (diff.status === 'identical') {
              matchedReg = extR;
              bestDiff = diff;
              const activeVerNum = (extR.versions?.length || 0) + 1;
              matchedVersionLabel = `v${activeVerNum}`;
              break;
            }
            if (extR.versions && extR.versions.length > 0) {
              let foundHistMatch = false;
              for (const ver of extR.versions) {
                if (ver.data) {
                  const verRules = ver.data.rules || ver.data || [];
                  const verJson = ver.data.jsonData || ver.data || {};
                  const histDiff = compareRegexScripts(
                    rules,
                    parsed,
                    parsed.findRegex,
                    parsed.replaceString,
                    {
                      ...extR,
                      rules: verRules,
                      jsonData: verJson,
                      findRegex: ver.data.findRegex,
                      replaceString: ver.data.replaceString
                    }
                  );
                  if (histDiff.status === 'identical') {
                    matchedReg = extR;
                    bestDiff = histDiff;
                    matchedVersionLabel = ver.versionLabel || `v${ver.versionNumber}`;
                    foundHistMatch = true;
                    break;
                  }
                }
              }
              if (foundHistMatch) break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedReg = extR;
              bestDiff = diff;
            }
          }

          if (bestDiff.status === 'identical' && matchedReg) {
            stats.skippedDuplicates++;
            const labelSuffix = matchedVersionLabel ? ` (与 ${matchedVersionLabel} 相同)` : '';
            stats.details.skipped.push(`[正则·完全一致跳过] ${scriptName}${labelSuffix}`);
          } else if (bestDiff.status === 'partially_different' && matchedReg) {
            const currentVersions = matchedReg.versions || [];
            const verNum = currentVersions.length + 1;
            const nextVerNum = verNum + 1;
            const nextVerLabel = `v${nextVerNum}`;

            const prevSnapshot: ItemVersion<any> = {
              versionId: `ver_${matchedReg.id}_${verNum}_${Date.now()}`,
              versionNumber: verNum,
              versionLabel: matchedReg.activeVersionLabel || `v${verNum}`,
              updatedAt: matchedReg.updatedAt || matchedReg.createdAt || Date.now(),
              fileName: matchedReg.fileName,
              changeSummary: bestDiff.summary || `正则规则更新`,
              data: {
                scriptName: matchedReg.scriptName,
                fileName: matchedReg.fileName,
                findRegex: matchedReg.findRegex,
                replaceString: matchedReg.replaceString,
                rules: matchedReg.rules,
                jsonData: matchedReg.jsonData
              }
            };

            const updatedRegex: STRegexEntry = {
              ...matchedReg,
              findRegex: parsed.findRegex || matchedReg.findRegex,
              replaceString: parsed.replaceString || matchedReg.replaceString,
              rules: rules,
              jsonData: parsed,
              fileName: file.name,
              updatedAt: Date.now(),
              activeVersionNumber: nextVerNum,
              activeVersionLabel: nextVerLabel,
              customTags: Array.from(new Set([...(matchedReg.customTags || []), '酒馆', '已更新版本'])),
              versions: [prevSnapshot, ...currentVersions]
            };

            const idx = regexList.findIndex(r => r.id === matchedReg!.id);
            if (idx > -1) regexList[idx] = updatedRegex;

            stats.updatedVersions++;
            stats.regex++;
            stats.details.updated.push(`[正则·新版本v${nextVerNum}] ${scriptName}`);
          } else {
            const newRegex: STRegexEntry = {
              id: 'regex_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
              scriptName: scriptName,
              fileName: file.name,
              findRegex: parsed.findRegex || '',
              replaceString: parsed.replaceString || '',
              rules: rules,
              jsonData: parsed,
              customTags: ['酒馆', '同名正则'],
              source: 'tavern-folder',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            regexList.push(newRegex);
            stats.newAdded++;
            stats.regex++;
            stats.details.added.push(`[正则·同名新正则] ${scriptName}`);
          }
        }
      }

      // =========================================================================
      // 4. ST Plugins (plugins/ or extensions/) -> STPluginsSection
      // =========================================================================
      else if (
        (isMatch('plugins') || isMatch('extensions')) &&
        (pathLower.endsWith('.json') || pathLower.endsWith('.js') || pathLower.endsWith('.ts'))
      ) {
        const text = await file.text();
        let pluginName = file.name.replace(/\.[^/.]+$/, '');
        let pluginDesc = '';
        let pluginAuthor = '';
        let pluginUrl = '';
        let parsedData: any = null;

        try {
          if (pathLower.endsWith('.json')) {
            parsedData = JSON.parse(text);
            pluginName = parsedData.name || parsedData.title || pluginName;
            pluginDesc = parsedData.description || '';
            pluginAuthor = parsedData.author || '';
            pluginUrl = parsedData.url || parsedData.homepage || '';
          }
        } catch {
          // Plain script plugin
        }

        const existingPlug = pluginsList.find(p => p.name.trim().toLowerCase() === pluginName.trim().toLowerCase());
        if (!existingPlug) {
          const newPlugin: PluginEntry = {
            id: 'plugin_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            type: 'plugin',
            name: pluginName,
            fileName: file.name,
            author: pluginAuthor,
            url: pluginUrl,
            description: pluginDesc || `从酒馆扩展插件目录同步`,
            source: 'tavern-folder',
            jsonData: parsedData,
            customTags: ['酒馆', '插件'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          pluginsList.push(newPlugin);
          stats.newAdded++;
          stats.plugins = (stats.plugins || 0) + 1;
          stats.details.added.push(`[插件] ${pluginName}`);
        } else {
          stats.skippedDuplicates++;
          stats.details.skipped.push(`[插件·已存在] ${pluginName}`);
        }
      }

      // =========================================================================
      // 5. ST Scripts & Quick Replies (scripts/ or QuickReplies/) -> STScriptsSection
      // =========================================================================
      else if (
        (isMatch('scripts') || isMatch('quickreplies') || isMatch('quick-replies') || pathLower.includes('quickreply')) &&
        (pathLower.endsWith('.json') || pathLower.endsWith('.js') || pathLower.endsWith('.txt'))
      ) {
        const text = await file.text();
        let scriptName = file.name.replace(/\.[^/.]+$/, '');
        let scriptDesc = '';
        let parsedData: any = null;
        let entries: any[] = [];

        try {
          if (pathLower.endsWith('.json')) {
            parsedData = JSON.parse(text);
            scriptName = parsedData.name || scriptName;
            scriptDesc = parsedData.description || '';
            entries = parsedData.entries || (Array.isArray(parsedData) ? parsedData : []);
          }
        } catch {
          // Plain script
        }

        const existingScript = scriptsList.find(s => s.name.trim().toLowerCase() === scriptName.trim().toLowerCase());
        if (!existingScript) {
          const newScript: ScriptEntry = {
            id: 'script_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: scriptName,
            fileName: file.name,
            description: scriptDesc || `从酒馆脚本与快捷回复目录同步`,
            rawContent: text,
            jsonData: parsedData,
            entries: entries,
            source: 'tavern-folder',
            customTags: ['酒馆', '脚本'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          scriptsList.push(newScript);
          stats.newAdded++;
          stats.scripts = (stats.scripts || 0) + 1;
          stats.details.added.push(`[脚本] ${scriptName}`);
        } else {
          stats.skippedDuplicates++;
          stats.details.skipped.push(`[脚本·已存在] ${scriptName}`);
        }
      }

      // =========================================================================
      // 6. ST Presets (instruct/ or context/ or presets/) -> STPresetsSection
      // =========================================================================
      else if (
        (isMatch('instruct') || isMatch('context') || isMatch('presets') || pathLower.includes('preset')) &&
        pathLower.endsWith('.json')
      ) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const presetName = (parsed.name || file.name.replace('.json', '')).trim();
        const presetNameLower = presetName.toLowerCase();

        const existingSameNamePresets = presetsList.filter(p => (p.name || '').trim().toLowerCase() === presetNameLower);

        if (existingSameNamePresets.length === 0) {
          const newPreset: PresetEntry = {
            id: 'preset_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: presetName,
            fileName: file.name,
            jsonData: parsed,
            rawJsonString: text,
            customTags: ['酒馆'],
            source: 'tavern-folder',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          presetsList.push(newPreset);
          stats.newAdded++;
          stats.presets++;
          stats.details.added.push(`[预设] ${presetName}`);
        } else {
          let matchedPreset: PresetEntry | null = null;
          let bestDiff: DiffResult = { status: 'completely_different', similarity: 0, summary: '', changedFields: [] };
          let matchedVersionLabel = '';

          for (const extP of existingSameNamePresets) {
            const diff = comparePresets(parsed, text, extP);
            if (diff.status === 'identical') {
              matchedPreset = extP;
              bestDiff = diff;
              const activeVerNum = (extP.versions?.length || 0) + 1;
              matchedVersionLabel = `v${activeVerNum}`;
              break;
            }
            if (extP.versions && extP.versions.length > 0) {
              let foundHistMatch = false;
              for (const ver of extP.versions) {
                if (ver.data) {
                  const verJson = ver.data.jsonData;
                  const verStr = ver.data.rawJsonString || JSON.stringify(verJson || {});
                  const histDiff = comparePresets(parsed, text, {
                    ...extP,
                    jsonData: verJson,
                    rawJsonString: verStr
                  });
                  if (histDiff.status === 'identical') {
                    matchedPreset = extP;
                    bestDiff = histDiff;
                    matchedVersionLabel = ver.versionLabel || `v${ver.versionNumber}`;
                    foundHistMatch = true;
                    break;
                  }
                }
              }
              if (foundHistMatch) break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedPreset = extP;
              bestDiff = diff;
            }
          }

          if (bestDiff.status === 'identical' && matchedPreset) {
            stats.skippedDuplicates++;
            const labelSuffix = matchedVersionLabel ? ` (与 ${matchedVersionLabel} 相同)` : '';
            stats.details.skipped.push(`[预设·完全一致跳过] ${presetName}${labelSuffix}`);
          } else if (bestDiff.status === 'partially_different' && matchedPreset) {
            const currentVersions = matchedPreset.versions || [];
            const verNum = currentVersions.length + 1;

            const prevSnapshot: ItemVersion<any> = {
              versionId: `ver_${matchedPreset.id}_${verNum}_${Date.now()}`,
              versionNumber: verNum,
              versionLabel: `v${verNum}`,
              updatedAt: matchedPreset.updatedAt || matchedPreset.createdAt || Date.now(),
              fileName: matchedPreset.fileName,
              changeSummary: bestDiff.summary || `预设配置更新`,
              data: {
                name: matchedPreset.name,
                fileName: matchedPreset.fileName,
                jsonData: matchedPreset.jsonData,
                rawJsonString: matchedPreset.rawJsonString
              }
            };

            const updatedPreset: PresetEntry = {
              ...matchedPreset,
              jsonData: parsed,
              rawJsonString: text,
              fileName: file.name,
              updatedAt: Date.now(),
              customTags: Array.from(new Set([...(matchedPreset.customTags || []), '酒馆', '已更新版本'])),
              versions: [prevSnapshot, ...currentVersions]
            };

            const idx = presetsList.findIndex(p => p.id === matchedPreset!.id);
            if (idx > -1) presetsList[idx] = updatedPreset;

            stats.updatedVersions++;
            stats.presets++;
            stats.details.updated.push(`[预设·新版本v${verNum + 1}] ${presetName}`);
          } else {
            const newPreset: PresetEntry = {
              id: 'preset_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
              name: presetName,
              fileName: file.name,
              jsonData: parsed,
              rawJsonString: text,
              customTags: ['酒馆', '同名预设'],
              source: 'tavern-folder',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            presetsList.push(newPreset);
            stats.newAdded++;
            stats.presets++;
            stats.details.added.push(`[预设·同名新预设] ${presetName}`);
          }
        }
      }

      // =========================================================================
      // 7. Themes & Backgrounds (themes/ or backgrounds/) -> STThemesSection
      // =========================================================================
      else if (
        (isMatch('themes') || isMatch('backgrounds') || isMatch('styles')) &&
        (pathLower.endsWith('.json') || pathLower.endsWith('.css'))
      ) {
        const text = await file.text();
        const themeName = file.name.replace(/\.[^/.]+$/, '').trim();
        const themeNameLower = themeName.toLowerCase();

        const existingSameNameThemes = themesList.filter(t => (t.name || '').trim().toLowerCase() === themeNameLower);

        if (existingSameNameThemes.length === 0) {
          const newTheme: ThemeEntry = {
            id: 'theme_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: themeName,
            fileName: file.name,
            content: text,
            customTags: ['酒馆'],
            source: 'tavern-folder',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          themesList.push(newTheme);
          stats.newAdded++;
          stats.themes++;
          stats.details.added.push(`[主题] ${themeName}`);
        } else {
          let matchedTheme: ThemeEntry | null = null;
          let bestDiff: DiffResult = { status: 'completely_different', similarity: 0, summary: '', changedFields: [] };
          let matchedVersionLabel = '';

          for (const extT of existingSameNameThemes) {
            const diff = compareThemes(text, extT);
            if (diff.status === 'identical') {
              matchedTheme = extT;
              bestDiff = diff;
              const activeVerNum = (extT.versions?.length || 0) + 1;
              matchedVersionLabel = `v${activeVerNum}`;
              break;
            }
            if (extT.versions && extT.versions.length > 0) {
              let foundHistMatch = false;
              for (const ver of extT.versions) {
                if (ver.data) {
                  const verContent = ver.data.content || '';
                  const histDiff = compareThemes(text, { ...extT, content: verContent });
                  if (histDiff.status === 'identical') {
                    matchedTheme = extT;
                    bestDiff = histDiff;
                    matchedVersionLabel = ver.versionLabel || `v${ver.versionNumber}`;
                    foundHistMatch = true;
                    break;
                  }
                }
              }
              if (foundHistMatch) break;
            }
            if (diff.status === 'partially_different' && diff.similarity > bestDiff.similarity) {
              matchedTheme = extT;
              bestDiff = diff;
            }
          }

          if (bestDiff.status === 'identical' && matchedTheme) {
            stats.skippedDuplicates++;
            const labelSuffix = matchedVersionLabel ? ` (与 ${matchedVersionLabel} 相同)` : '';
            stats.details.skipped.push(`[主题·完全一致跳过] ${themeName}${labelSuffix}`);
          } else if (bestDiff.status === 'partially_different' && matchedTheme) {
            const currentVersions = matchedTheme.versions || [];
            const verNum = currentVersions.length + 1;
            const prevSnapshot: ItemVersion<any> = {
              versionId: `ver_${matchedTheme.id}_${verNum}_${Date.now()}`,
              versionNumber: verNum,
              versionLabel: `v${verNum}`,
              updatedAt: matchedTheme.updatedAt || matchedTheme.createdAt || Date.now(),
              fileName: matchedTheme.fileName,
              changeSummary: bestDiff.summary || `主题样式更新`,
              data: {
                name: matchedTheme.name,
                fileName: matchedTheme.fileName,
                content: matchedTheme.content,
                jsonData: matchedTheme.jsonData
              }
            };

            const updatedTheme: ThemeEntry = {
              ...matchedTheme,
              content: text,
              fileName: file.name,
              updatedAt: Date.now(),
              customTags: Array.from(new Set([...(matchedTheme.customTags || []), '酒馆', '已更新版本'])),
              versions: [prevSnapshot, ...currentVersions]
            };

            const idx = themesList.findIndex(t => t.id === matchedTheme!.id);
            if (idx > -1) themesList[idx] = updatedTheme;

            stats.updatedVersions++;
            stats.themes++;
            stats.details.updated.push(`[主题·新版本v${verNum + 1}] ${themeName}`);
          } else {
            const newTheme: ThemeEntry = {
              id: 'theme_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
              name: themeName,
              fileName: file.name,
              content: text,
              customTags: ['酒馆', '同名主题'],
              source: 'tavern-folder',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            themesList.push(newTheme);
            stats.newAdded++;
            stats.themes++;
            stats.details.added.push(`[主题·同名新主题] ${themeName}`);
          }
        }
      }

      // =========================================================================
      // 8. Chat Logs (chats/) -> STChatsSection
      // =========================================================================
      else if (isMatch('chats') && pathLower.endsWith('.jsonl')) {
        const parts = relativePath.split('/');
        const folderName = parts.length > 2 ? parts[parts.length - 2] : '未分组';
        const chatTitle = file.name.replace('.jsonl', '').trim();
        const existingChat = chatsList.find(
          c => (c.characterName || '').trim().toLowerCase() === folderName.toLowerCase() &&
               (c.title || '').trim().toLowerCase() === chatTitle.toLowerCase()
        );

        if (!existingChat) {
          const newChat: ChatLogEntry = {
            id: 'chat_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
            title: chatTitle,
            fileName: file.name,
            characterName: folderName,
            customTags: ['酒馆', folderName],
            source: 'tavern-folder',
            messages: [],
            messageCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          chatsList.push(newChat);
          stats.newAdded++;
          stats.chats++;
          stats.details.added.push(`[聊天记录] ${folderName} / ${chatTitle}`);
        } else {
          stats.skippedDuplicates++;
          stats.details.skipped.push(`[聊天记录·已存在] ${folderName} / ${chatTitle}`);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('终止') || checkCancelled()) {
        throw new DOMException('用户已终止导入', 'AbortError');
      }
      console.warn(`Error parsing file ${relativePath}:`, err);
    }
  }

  if (checkCancelled()) {
    throw new DOMException('用户已终止导入', 'AbortError');
  }

  // Increment folder import count upon successful scan
  incrementFolderImportCount(folderId, folderName);

  const existingStaged = currentAppData.stagedDuplicateCards || [];
  const updatedStaged = [...existingStaged, ...stagedDuplicatesList];

  const rawUpdatedAppData: AppData = {
    ...currentAppData,
    cards: cardsList,
    stWorldBooks: worldBooksList,
    stRegexScripts: regexList,
    chatLogs: chatsList,
    presets: presetsList,
    themes: themesList,
    plugins: pluginsList,
    scripts: scriptsList,
    stagedDuplicateCards: updatedStaged
  };

  // Run deep automatic cross-linking and association engine
  const updatedAppData = autoAssociateAllAssets(rawUpdatedAppData);

  return { updatedAppData, stats, stagedDuplicates: stagedDuplicatesList };
}
