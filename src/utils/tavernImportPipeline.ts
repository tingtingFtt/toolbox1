import { delMany } from 'idb-keyval';
import { AppData, CardEntry, ImportRecord, StagedDuplicateCard, TavernFileKind } from '../types';
import { CardImportIndex } from './cardImportIndex';
import { TavernImportClient } from './tavernImportClient';
import { readZipMembers, ZipMember } from './tavernZip';
import { getCardCoreSignature } from './diffEngine';
import { nextTask } from './recordPersistence';

export interface ImportFile { file: File; relativePath: string; member?: ZipMember }
export interface ImportJobStats { added: number; skipped: number; failed: number; pending: number; staged: number; counts: Partial<Record<TavernFileKind, number>> }
export interface ImportJobProgress { current: number; total: number; name: string; phase: 'parsing' | 'diffing' | 'extracting'; stats: ImportJobStats }
type Commit = (apply: (previous: AppData) => AppData) => Promise<AppData>;
let checkpoint: Commit | null = null, running = false;
export const setTavernImportCheckpoint = (commit: Commit | null) => { checkpoint = commit; };
export const isTavernImportRunning = () => running;
export const supportedImportFile = (name: string) => /\.(png|json|css|js|zip)$/i.test(name);

export async function runTavernImport(files: ImportFile[] | AsyncIterable<ImportFile>, initial: AppData, options: {
  signal: AbortSignal; source?: 'local' | 'folder' | 'tavern'; group?: string; folderId?: string;
  forced?: TavernFileKind; replace?: ImportRecord; commit?: Commit; onProgress?: (p: ImportJobProgress) => void;
}) {
  if (running) throw Error('已有导入任务进行中，请等待完成或取消后再试');
  running = true;
  let currentData = initial;
  const commit = options.commit || checkpoint || (async apply => currentData = apply(currentData));
  const client = new TavernImportClient(), stats: ImportJobStats = { added: 0, skipped: 0, failed: 0, pending: 0, staged: 0, counts: {} };
  const allStaged: StagedDuplicateCard[] = [], pendingEntries: { field: keyof AppData; entry: any }[] = [], logs: ImportRecord[] = [], staged: StagedDuplicateCard[] = [];
  const streaming = !Array.isArray(files);
  let total = Array.isArray(files) ? files.length : 0, processed = 0, cancelled = false, replacing = options.replace;
  const check = () => { if (options.signal.aborted) throw new DOMException('已取消导入', 'AbortError'); };
  const report = (name: string, phase: ImportJobProgress['phase']) => options.onProgress?.({ current: processed, total, name, phase, stats: { ...stats, counts: { ...stats.counts } } });
  const flush = async () => {
    if (!logs.length) return;
    report('正在保存本批记录…', 'extracting');
    const entries = pendingEntries.splice(0), records = logs.splice(0), newStaged = staged.splice(0);
    const replacement = replacing && records.some(r => r.status === 'imported') ? replacing : undefined;
    const removes = new Map<keyof AppData, Set<string>>();
    if (replacement) { for (const t of replacement.targets) { const ids = removes.get(t.field) || new Set(); ids.add(t.id); removes.set(t.field, ids); } replacing = undefined; }
    currentData = await commit(prev => {
      const next: AppData = { ...prev };
      const byField = new Map<keyof AppData, any[]>();
      entries.forEach(({ field, entry }) => { const list = byField.get(field) || []; list.push(entry); byField.set(field, list); });
      for (const field of new Set([...byField.keys(), ...removes.keys()])) {
        (next as any)[field] = [...((prev as any)[field] || []).filter((entry: any) => !removes.get(field)?.has(entry.id)), ...(byField.get(field) || [])];
      }
      const oldRecordIds = new Set(records.map(r => r.id));
      next.importRecords = [...(prev.importRecords || []).filter(r => !oldRecordIds.has(r.id) && r.id !== replacement?.id), ...records];
      next.stagedDuplicateCards = [...(next.stagedDuplicateCards || []), ...newStaged];
      if (byField.has('cards')) next.cardTags = [...new Set([...(prev.cardTags || []), ...byField.get('cards')!.flatMap(c => c.customTags || [])])];
      return next;
    });
    await nextTask();
  };
  try {
    report('建立角色卡查重索引…', 'diffing');
    const index = await CardImportIndex.build(initial.cards || [], options.signal);
    const liveIds = new Map(Object.entries(initial).filter(([, value]) => Array.isArray(value)).map(([field, value]) => [field, new Set((value as any[]).map(v => v?.id))]));
    const knownFiles = new Set((initial.importRecords || []).filter(r => r.status === 'imported' && r.targets.some(t => liveIds.get(String(t.field))?.has(t.id))).map(r => `${r.kind}:${r.hash}`));
    async function consume(item: ImportFile) {
      check(); report(item.relativePath, 'parsing');
      let result;
      try { result = await client.parse(item.file, item.relativePath, options.source || 'local', options.signal, options.forced, item.member); }
      catch (error: any) {
        if (error.name === 'AbortError') throw error;
        const id = crypto.randomUUID();
        result = { bundle: null, record: { id, recordId: id, fileKey: '', kind: 'unknown', fileName: item.member?.name.split('/').pop() || item.file.name, relativePath: item.relativePath, source: options.source || 'local', importedAt: Date.now(), hash: '', status: 'failed', message: error.message, targets: [] } as ImportRecord };
      }
      check();
      const { bundle, record } = result;
      if (!bundle || record.status !== 'imported') { record.status === 'failed' ? stats.failed++ : stats.pending++; }
      else {
        const card = bundle.records.find(r => r.field === 'cards')?.entry as CardEntry | undefined;
        const exact = card ? index.exact(card) : undefined;
        const candidates = card && !exact ? index.candidates(card) : [];
        const exactIsReplacement = replacing?.targets.some(t => t.field === 'cards' && t.id === exact?.id);
        if ((!replacing && knownFiles.has(`${bundle.kind}:${record.hash}`)) || (exact && !exactIsReplacement)) {
          record.status = 'skipped'; record.message = '内容相同，保留已存在的条目'; record.targets = []; stats.skipped++;
        } else if (card && candidates.length && !replacing) {
          const match = candidates[0], id = crypto.randomUUID();
          const duplicate: StagedDuplicateCard = { id, incomingCard: card, matchedCard: match, stagedAt: Date.now(), fileSource: options.source === 'tavern' ? 'tavern' : 'local', userDecision: 'new_version', matchDetail: { matchedCard: match, matchedVersionLabel: match.activeVersionLabel || 'v1', matchedVersionIndex: -1, isExactHashMatch: false, incomingHash: getCardCoreSignature(card), matchedHash: getCardCoreSignature(match), status: 'partially_different', similarity: 0, summary: '同名文件内容不同，请在暂存处选择版本或独立卡面', changedFields: [], preliminaryReason: '角色名或文件名相同' } };
          staged.push(duplicate); allStaged.push(duplicate); stats.staged++;
          record.status = 'pending'; record.message = '同名卡片内容不同，已进入决策暂存处'; record.targets = [{ field: 'stagedDuplicateCards', id }];
        } else {
          for (const r of bundle.records) {
            r.entry = { ...r.entry, customTags: options.source === 'tavern' ? [...new Set([...(r.entry.customTags || []).filter((tag: string) => tag !== '本地'), '酒馆'])] : r.entry.customTags, ...(options.folderId ? { sourceFolder: options.folderId } : {}), ...(r.field === 'cards' ? { group: options.group || '默认', source: options.source === 'tavern' ? 'tavern-folder' : 'local' } : {}) };
            pendingEntries.push(r);
          }
          if (card) index.add(card);
          knownFiles.add(`${bundle.kind}:${record.hash}`); stats.added++; stats.counts[bundle.kind] = (stats.counts[bundle.kind] || 0) + 1;
        }
      }
      if (record.status === 'skipped' || (record.status === 'pending' && record.targets.some(t => t.field === 'stagedDuplicateCards'))) {
        const unused = (bundle?.records || []).flatMap(r => r.field === 'cards' && record.status !== 'skipped' ? [] : [r.entry.payloadKey, r.entry.thumbnailKey, r.entry.assetPayloadKey].filter(Boolean));
        if (unused.length) await delMany(unused).catch(() => {});
      }
      logs.push(record); processed++; report(item.relativePath, 'diffing');
      if (logs.length >= 32) await flush();
      await nextTask();
    }
    for await (const item of files) {
      check();
      if (streaming) total++;
      if (/\.zip$/i.test(item.file.name)) {
        let members: ZipMember[];
        try {
          report(`读取 ${item.file.name} 的文件目录…`, 'parsing');
          members = (await readZipMembers(item.file, options.signal)).filter(m => supportedImportFile(m.name) && !/\.zip$/i.test(m.name) && !/(^|\/)(__MACOSX|node_modules|\.git)\//.test(m.name));
          if (!members.length) throw Error('ZIP 中没有支持的酒馆文件');
          total += members.length - 1;
        } catch (error: any) {
          if (error.name === 'AbortError') throw error;
          const id = crypto.randomUUID();
          logs.push({ id, recordId: id, fileKey: '', kind: 'unknown', fileName: item.file.name, relativePath: item.relativePath, source: options.source || 'local', importedAt: Date.now(), hash: '', status: 'failed', message: error.message, targets: [] }); stats.failed++; processed++;
          continue;
        }
        for (const member of members) await consume({ file: item.file, relativePath: `${item.relativePath}/${member.name}`, member });
      } else await consume(item);
    }
  } catch (error: any) { if (error.name === 'AbortError') cancelled = true; else throw error; }
  finally { try { await flush(); } finally { client.close(); running = false; } }
  return { updatedAppData: currentData, stats, stagedDuplicates: allStaged, cancelled, processed, total };
}
