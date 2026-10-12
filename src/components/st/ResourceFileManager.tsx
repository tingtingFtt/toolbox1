import { flushSync } from 'react-dom';
import React, { useRef, useState, useEffect } from 'react';
import { get } from 'idb-keyval';
import { AppData, ImportRecord } from '../../types';
import { ManagedKind, RESOURCE_FIELDS, resourceItems, resourceName, resourceJsonPayload, prepareResourceReplacement, bindingWarning } from '../../utils/resourceManagement';
import { TavernImportClient } from '../../utils/tavernImportClient';
import { runTavernImport, isTavernImportRunning } from '../../utils/tavernImportPipeline';
import { createImportAbortController, abortActiveImport } from '../../utils/importCancellation';
import { hydrateCard, hydrateCardAsset, hydrateCardBoundAssets } from '../../utils/largeCardStore';
import { injectBoundAssetsForExport, triggerFileDownload } from '../../utils';
import { IMPORT_KIND_PAGES } from '../../utils/importRecordAreas';
import { TAVERN_KIND_LABELS } from '../../utils/tavernFileTypes';
import { useFixedPagination } from '../../hooks/useFixedPagination';
import { ManagementPagination } from '../ui/ManagementPagination';
import { ActionButton } from '../ui/ActionButton';
import { DetailPanel, DetailHeader, DetailTabs, DetailBody, DetailFooter } from '../ui/DetailChrome';
import { ManagementSearch } from '../ui/ManagementChrome';
const pageKinds = Object.fromEntries(Object.entries(IMPORT_KIND_PAGES).map(([kind, page]) => [page, kind])) as Record<string, ManagedKind>;
export function ResourceFileManager({ page, appData, updateAppData, showToast, reviewRecordId, onReviewOpened }: { page: string; reviewRecordId?: string; onReviewOpened?: () => void; appData: AppData; updateAppData: (apply: (data: AppData) => AppData) => void; showToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const kind = pageKinds[page];
  return kind ? <KindFileManager key={kind} kind={kind} data={appData} update={updateAppData} toast={showToast} reviewRecordId={reviewRecordId} onReviewOpened={onReviewOpened} /> : null;
}
function KindFileManager({ kind, data, update, toast, reviewRecordId, onReviewOpened }: { kind: ManagedKind; reviewRecordId?: string; onReviewOpened?: () => void; data: AppData; update: (apply: (data: AppData) => AppData) => void; toast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const [open, setOpen] = useState(!!reviewRecordId), [search, setSearch] = useState(() => data.importRecords?.find(record => record.id === reviewRecordId)?.relativePath || ''), [tab, setTab] = useState(reviewRecordId ? 'records' : 'resources'), [targetId, setTargetId] = useState(''), [recordId, setRecordId] = useState(reviewRecordId || ''), [busy, setBusy] = useState(false), [ack, setAck] = useState(false);
  useEffect(() => {
    if (!reviewRecordId) return;
    setOpen(true); setTab('records'); setRecordId(reviewRecordId); setTargetId(''); setSearch(data.importRecords?.find(record => record.id === reviewRecordId)?.relativePath || ''); setAck(false);
    onReviewOpened?.();
  }, [reviewRecordId, onReviewOpened]);
  const input = useRef<HTMLInputElement>(null), current = useRef(data); current.current = data;
  const items = resourceItems(data, kind).filter(item => `${resourceName(item)} ${item.fileName || ''}`.toLowerCase().includes(search.toLowerCase()));
  const records = (data.importRecords || []).filter(record => ['pending', 'failed'].includes(record.status) && !record.targets.length && (record.kind === kind || record.kind === 'unknown') && `${record.fileName} ${record.relativePath}`.toLowerCase().includes(search.toLowerCase()));
  const pagination = useFixedPagination(tab === 'resources' ? items.length : records.length, `${tab}:${search}`, 50);
  const target = resourceItems(data, kind).find(item => item.id === targetId), record = data.importRecords?.find(item => item.id === recordId);
  const field = RESOURCE_FIELDS[kind];
  const warning = target && ['stWorldBooks', 'stRegexScripts', 'scripts'].includes(field) ? bindingWarning(data, field as any, [target.id]) : '';
  const needsAck = !!warning || (kind === 'card' && !!target) || (kind === 'preset' && !!target);
  const replace = async (file: File, originalRecord?: ImportRecord) => {
    if (isTavernImportRunning()) { toast('请等待当前导入完成', 'info'); return; }
    if (tab === 'resources' && (!target || (needsAck && !ack))) return;
    setBusy(true); const before = current.current, controller = createImportAbortController(), client = new TavernImportClient();
    let parsedRecord: ImportRecord | undefined;
    try {
      if (tab === 'records' && originalRecord) {
        const result = await runTavernImport([{ file, relativePath: originalRecord.relativePath }], before, { signal: controller.signal, source: originalRecord.source, forced: kind, replace: originalRecord });
        if (!result.stats.added) throw Error(result.cancelled ? '已取消重试' : '重新识别未成功，请查看导入记录');
      } else {
        const parsed = await client.parse(file, file.name, 'local', controller.signal, kind);
        parsedRecord = parsed.record;
        if (!parsed.bundle || parsed.record.status !== 'imported') throw Error(parsed.record.message || '文件解析失败');
        const next = await prepareResourceReplacement(before, kind, targetId, parsed.bundle, parsed.record);
        if (controller.signal.aborted) throw Error('已取消更换，原资源保留');
        if (current.current !== before) throw Error('数据已变化，请重新选择目标后更换');
        let applied = false;
        flushSync(() => update(prev => { if (prev !== before) return prev; applied = true; return next; }));
        if (!applied) throw Error('数据已变化，原资源保留，请重新操作');
      }
      toast('文件已处理，原条目 ID 和已有绑定保留', 'success'); setOpen(false); setTargetId(''); setRecordId('');
    } catch (error: any) {
      if (parsedRecord) {
        const failed = { ...parsedRecord, status: 'failed' as const, targets: [], message: `更换失败，原资源保留：${error.message}` };
        update(prev => ({ ...prev, importRecords: [...(prev.importRecords || []).filter(record => record.id !== failed.id), failed] }));
      }
      toast(error.message, 'error');
    }
    finally { client.close(); setBusy(false); }
  };
  const retryOriginal = async () => {
    if (!record) return;
    try { const blob = await get<Blob>(record.fileKey); if (!blob) throw Error('原文件不可用，请选择修正后的文件'); await replace(blob instanceof File ? blob : new File([blob], record.fileName), record); } catch (error: any) { toast(error.message, 'error'); }
  };
  const exportJson = async () => {
    if (!target) return;
    try {
      const full = kind === 'card' ? await hydrateCard(target) : await hydrateCardAsset(target);
      const payload = kind === 'card' ? injectBoundAssetsForExport(full, await hydrateCardBoundAssets(full, data)) : resourceJsonPayload(kind, full);
      if (payload === undefined) throw Error('没有可导出的 JSON 内容');
      triggerFileDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), `${resourceName(target).replace(/\.[^.]+$/, '')}.json`);
      toast('JSON 已导出', 'success');
    } catch (error: any) { toast(error.message, 'error'); }
  };
  return <>
    <div className="max-w-7xl mx-auto flex justify-end mb-3"><ActionButton action="custom" onClick={() => setOpen(true)}>更换文件 / 重新识别</ActionButton></div>
    {open && <div className="fixed inset-0 z-[1950] flex items-center justify-center p-0 sm:p-4 bg-black/50" role="dialog" aria-modal="true" aria-label={`${TAVERN_KIND_LABELS[kind]}文件管理`}><DetailPanel className="sm:max-w-3xl sm:max-h-[90dvh]">
      <DetailHeader designPrefix="resource-file" title={`${TAVERN_KIND_LABELS[kind]} · 文件管理`} badge="当前管理页" tags={<span>更换文件 · 重新识别 · 导出 JSON</span>} onClose={() => { if (!busy) setOpen(false); }} />
      <DetailTabs designPrefix="resource-file" label="文件管理" tabs={[{ id: 'resources', name: '更换已有资源' }, { id: 'records', name: '重新识别未导入文件' }]} activeTab={tab} onChange={value => { if (!busy) { setTab(value); setTargetId(''); setRecordId(''); setAck(false); } }} />
      <DetailBody className="space-y-3">
        <ManagementSearch value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索要处理的名称或文件" />
        {tab === 'records' && record && <p className="text-xs font-semibold break-all">当前处理文件：{record.relativePath}</p>}
        <p className="text-xs text-zinc-500">更换成功后保留条目 ID、分组、标签和绑定，并保存更换前的历史版本。解析失败时原资源保留。</p>
        <div className="space-y-2">{tab === 'resources' ? items.slice(pagination.start, pagination.end).map(item => <button type="button" disabled={busy} aria-pressed={targetId === item.id} className={`w-full p-3 text-left border text-xs break-all ${targetId === item.id ? 'border-[var(--accent)] bg-[var(--btn-primary-bg)]' : ''}`} key={item.id} onClick={() => { setTargetId(item.id); setAck(false); }}>{resourceName(item)} · {item.sourceCardName || item.sourcePresetName || item.fileName || '独立资源'}</button>) : records.slice(pagination.start, pagination.end).map(item => <button type="button" disabled={busy} aria-pressed={recordId === item.id} className={`w-full p-3 text-left border text-xs break-all ${recordId === item.id ? 'border-[var(--accent)]' : ''}`} key={item.id} onClick={() => setRecordId(item.id)}>{item.relativePath} · {item.message}</button>)}</div>
        <ManagementPagination total={tab === 'resources' ? items.length : records.length} page={pagination.page} pageSize={pagination.pageSize} onPageChange={pagination.setPage} unit="项" label="文件管理分页" />
        {needsAck && <div className="p-3 border border-amber-500 text-xs space-y-2"><p>{warning ? warning.replace('删除会解除这些绑定；内嵌资源会同步从所属卡片或预设的当前内容中移除。历史版本正文保留。请先导出 JSON 备份，并勾选确认影响。', '更换会同步修改所属来源的当前内容，并影响所有使用该资源的绑定；绑定关系保留。') : '更换会更新当前来源的内嵌资源；已有绑定保留，文件中缺少的资源保留。请确认影响。'}</p><label className="flex gap-2 items-center"><input type="checkbox" checked={ack} disabled={busy} onChange={event => setAck(event.target.checked)} />我已了解更换对绑定内容的影响</label></div>}
        <input ref={input} aria-label="选择更换文件" type="file" accept={kind === 'card' ? '.png,.json' : kind === 'theme' ? '.css,.json' : kind === 'script' ? '.js,.json' : '.json'} className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void replace(file, tab === 'records' ? record : undefined); }} />
      </DetailBody>
      <DetailFooter><ActionButton action="export" disabled={!target || busy || tab !== 'resources'} onClick={() => void exportJson()}>导出 JSON</ActionButton>{tab === 'records' && <ActionButton action="custom" disabled={!record || busy} onClick={() => void retryOriginal()}>用原文件重新识别</ActionButton>}<ActionButton action="import" disabled={busy || (tab === 'resources' ? !target || needsAck && !ack : !record)} onClick={() => input.current?.click()}>{busy ? '正在处理…' : '选择更换文件'}</ActionButton>{busy && <ActionButton action="cancel" onClick={abortActiveImport}>取消处理</ActionButton>}</DetailFooter>
    </DetailPanel></div>}
  </>;
}
