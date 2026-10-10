import React, { useMemo, useRef, useState } from 'react';
import { get } from 'idb-keyval';
import { AppData, ImportRecord, TavernFileKind } from '../../types';
import { useTavernImport } from '../../hooks/TavernImportContext';
import { createImportAbortController, abortActiveImport } from '../../utils/importCancellation';
import { isTavernImportRunning, runTavernImport } from '../../utils/tavernImportPipeline';
import { TAVERN_KIND_LABELS } from '../../utils/tavernFileTypes';
import { deleteCardsAndCascadeAssets, triggerFileDownload } from '../../utils';
import { DetailPanel, DetailHeader, DetailTabs, DetailBody, DetailFooter } from '../ui/DetailChrome';
import { ManagementSearch } from '../ui/ManagementChrome';
import { ActionButton } from '../ui/ActionButton';
import { DeleteConfirmationModal } from '../ui/UnifiedModal';
const statuses = { imported: '已导入', pending: '待处理', failed: '失败', skipped: '重复跳过' };
export function ImportCenter({ open, onClose, appData, updateAppData, showToast }: { open: boolean; onClose: () => void; appData: AppData; updateAppData: (apply: (prev: AppData) => AppData) => void; showToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const context = useTavernImport(), upload = useRef<HTMLInputElement>(null), folder = useRef<HTMLInputElement>(null), replacementInput = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), [tab, setTab] = useState('all'), [selected, setSelected] = useState<ImportRecord | null>(null), [kind, setKind] = useState<TavernFileKind>('unknown'), [busy, setBusy] = useState(false), [progress, setProgress] = useState(''), [deleteTarget, setDeleteTarget] = useState<ImportRecord | null>(null);
  const records = useMemo(() => (appData.importRecords || []).filter(r => (tab === 'all' || r.status === tab) && (!search || `${r.fileName} ${r.relativePath} ${TAVERN_KIND_LABELS[r.kind]} ${r.message}`.toLowerCase().includes(search.toLowerCase()))).slice().reverse(), [appData.importRecords, search, tab]);
  if (!open) return null;
  const retry = async (record: ImportRecord, newFile?: File) => {
    if (isTavernImportRunning()) { showToast('请等待当前导入完成或取消', 'info'); return; }
    setBusy(true); setProgress('读取原文件…');
    const controller = createImportAbortController();
    try {
      const original = newFile || await get<Blob>(record.fileKey);
      if (!original) throw Error('原文件不可用，请点击「更换文件重试」重新选择');
      const file = original instanceof File ? original : new File([original], record.fileName);
      const result = await runTavernImport([{ file, relativePath: record.relativePath }], appData, { signal: controller.signal, source: record.source, replace: record, forced: kind === 'unknown' ? undefined : kind, onProgress: p => setProgress(p.name) });
      if (result.cancelled) showToast('已取消，保留已完成的结果', 'info');
      else if (result.stats.added) { showToast('该文件已重新识别并替换原导入条目', 'success'); setSelected(null); }
      else showToast('未替换原条目，请查看新的识别记录', 'info');
    } catch (error: any) { showToast(error.message, 'error'); }
    finally { setBusy(false); setProgress(''); }
  };
  const remove = (record: ImportRecord) => {
    updateAppData(prev => {
      const cardIds = record.targets.filter(t => t.field === 'cards').map(t => t.id);
      let next = cardIds.length ? deleteCardsAndCascadeAssets(cardIds, prev).updatedAppData : { ...prev };
      const ids = new Map<string, Set<string>>();
      record.targets.forEach(t => { const set = ids.get(String(t.field)) || new Set(); set.add(t.id); ids.set(String(t.field), set); });
      for (const [field, set] of ids) if (Array.isArray((next as any)[field])) (next as any)[field] = (next as any)[field].filter((e: any) => !set.has(e.id));
      next.importRecords = (prev.importRecords || []).filter(r => r.id !== record.id);
      return next;
    });
    setDeleteTarget(null); setSelected(null); showToast('已删除该来源导入的条目与记录', 'info');
  };
  return <div className="fixed inset-0 z-[1900] flex items-center justify-center p-0 sm:p-4 bg-black/50" role="dialog" aria-modal="true" aria-label="导入中心">
    <DetailPanel className="sm:max-w-5xl sm:max-h-[90dvh]">
      <DetailHeader designPrefix="import-center" title="导入中心" badge="本地解析" tags={<span>按内容识别 → 查重 → 分批保存 → 单文件调整</span>} onClose={onClose} />
      <DetailTabs designPrefix="import-center" label="导入结果" tabs={[{ id: 'all', name: `全部 (${appData.importRecords?.length || 0})` }, { id: 'imported', name: '已导入' }, { id: 'pending', name: '待处理' }, { id: 'failed', name: '失败' }, { id: 'skipped', name: '重复' }]} activeTab={tab} onChange={value => { setTab(value); setPage(0); }} />
      <DetailBody className="space-y-4">
        <div className="flex flex-wrap gap-2"><ActionButton action="import" onClick={() => upload.current?.click()}>导入文件 / ZIP</ActionButton><ActionButton action="import" onClick={() => folder.current?.click()}>导入文件夹</ActionButton></div>
        <input ref={upload} type="file" multiple accept=".png,.json,.css,.js,.zip" className="hidden" onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; void context?.importFiles(files); }} />
        <input ref={folder} type="file" multiple {...({ webkitdirectory: '', directory: '' } as any)} className="hidden" onChange={e => { const files = Array.from(e.target.files || []).filter(f => /\.(png|json|css|js|zip)$/i.test(f.name)); e.target.value = ''; void context?.importFiles(files); }} />
        <ManagementSearch value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="搜索文件、来源路径或识别结果" />
        {selected && <div className="p-3 border space-y-3">
          <p className="text-sm break-all">调整：{selected.relativePath}</p>
          <div className="flex flex-wrap gap-2 items-center"><label className="text-xs">重新识别为 <select className="p-2 bg-[var(--card-solid-bg)] border" value={kind} onChange={e => setKind(e.target.value as TavernFileKind)}>{Object.entries(TAVERN_KIND_LABELS).map(([id, label]) => <option value={id} key={id}>{id === 'unknown' ? '自动识别' : label}</option>)}</select></label><ActionButton action="save" disabled={busy} onClick={() => void retry(selected)}>用原文件重试</ActionButton><ActionButton action="import" disabled={busy} onClick={() => replacementInput.current?.click()}>更换文件重试</ActionButton><ActionButton action="close" disabled={busy} onClick={() => setSelected(null)}>收起</ActionButton></div>
          <p className="text-xs text-zinc-500">成功后只替换此来源产生的条目；识别失败保留原条目。正则、脚本按来源展示为集合。</p>
        </div>}
        <input ref={replacementInput} type="file" accept=".png,.json,.css,.js" className="hidden" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file && selected) void retry(selected, file); }} />
        {busy && <div className="flex flex-wrap items-center gap-3 text-xs"><span>{progress}</span><ActionButton action="close" onClick={abortActiveImport}>取消重试</ActionButton></div>}
        {!records.length && <p className="text-sm text-zinc-500 py-8">暂无记录。既有资源会保留，新导入会在这里记录来源与识别结果。</p>}
        <div className="space-y-2">{records.slice(page * 50, (page + 1) * 50).map(record => <div key={record.id} className="p-3 border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0 space-y-1"><p className="text-xs font-semibold break-all">{record.fileName}</p><p className="text-[10px] break-all text-zinc-500">{record.relativePath}</p><p className="text-[11px] break-all">{TAVERN_KIND_LABELS[record.kind]} · {statuses[record.status]} · {record.message}</p></div>
          <div className="flex flex-wrap gap-2 shrink-0"><ActionButton action="custom" disabled={busy} onClick={() => { setSelected(record); setKind(record.kind); }}>调整 / 重试</ActionButton><ActionButton action="export" onClick={async () => { try { const file = await get<Blob>(record.fileKey); if (!file) throw Error('原文件不可用'); triggerFileDownload(file, record.fileName); } catch (e: any) { showToast(e.message, 'error'); } }}>原文件</ActionButton><ActionButton action="delete" disabled={busy || isTavernImportRunning()} onClick={() => setDeleteTarget(record)}>删除</ActionButton></div>
        </div>)}</div>
      </DetailBody>
      <DetailFooter><span className="text-xs">{records.length} 个文件记录 · 每页 50 个</span><div className="flex items-center gap-3 text-xs"><button disabled={!page} onClick={() => setPage(p => p - 1)}>上一页</button><span>{page + 1} / {Math.max(1, Math.ceil(records.length / 50))}</span><button disabled={(page + 1) * 50 >= records.length} onClick={() => setPage(p => p + 1)}>下一页</button></div></DetailFooter>
    </DetailPanel>
    <DeleteConfirmationModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove(deleteTarget)} message="删除该文件导入的全部条目和记录？角色卡的专属资源也会一并删除。" itemCount={deleteTarget?.targets.length || 1} />
  </div>;
}
