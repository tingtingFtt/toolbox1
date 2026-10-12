import React, { useMemo, useRef, useState } from 'react';
import { get } from 'idb-keyval';
import { isUnclassifiedImportRecord, isDuplicateImportRecord, matchesImportRecordArea } from '../../utils/importRecordAreas';
import { AppData, ImportRecord, TavernFileKind } from '../../types';
import { useTavernImport } from '../../hooks/TavernImportContext';
import { useFixedPagination } from '../../hooks/useFixedPagination';
import { TAVERN_KIND_LABELS } from '../../utils/tavernFileTypes';
import { deleteImportRecord } from '../../utils/resourceManagement';
import { triggerFileDownload } from '../../utils';
import { DetailPanel, DetailHeader, DetailTabs, DetailBody, DetailFooter } from '../ui/DetailChrome';
import { ManagementSearch } from '../ui/ManagementChrome';
import { ManagementPagination } from '../ui/ManagementPagination';
import { ActionButton } from '../ui/ActionButton';
import { DeleteConfirmationModal } from '../ui/UnifiedModal';
const statuses = { imported: '已导入', pending: '待处理', failed: '失败', skipped: '重复跳过' };
export function ImportCenter({ open, onClose, onImportBackup, onReviewUnclassified, onOpenDuplicateStaging, appData, updateAppData, showToast }: { open: boolean; onClose: () => void; onImportBackup?: () => void; onReviewUnclassified?: (recordId: string, kind: Exclude<TavernFileKind, 'unknown'>) => void; onOpenDuplicateStaging?: () => void; appData: AppData; updateAppData: (apply: (prev: AppData) => AppData) => void; showToast: (message: string, type?: 'success' | 'error' | 'info') => void }) {
  const context = useTavernImport(), upload = useRef<HTMLInputElement>(null), folder = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(''), [tab, setTab] = useState('all'), [deleteTarget, setDeleteTarget] = useState<ImportRecord | null>(null), [reviewKinds, setReviewKinds] = useState<Record<string, Exclude<TavernFileKind, 'unknown'> | ''>>({});
  const records = useMemo(() => (appData.importRecords || []).filter(record => matchesImportRecordArea(record, tab) && (!search || `${record.fileName} ${record.relativePath} ${TAVERN_KIND_LABELS[record.kind]} ${record.message}`.toLowerCase().includes(search.toLowerCase()))).slice().reverse(), [appData.importRecords, search, tab]);
  const unclassifiedCount = useMemo(() => (appData.importRecords || []).filter(isUnclassifiedImportRecord).length, [appData.importRecords]);
  const duplicateCount = useMemo(() => (appData.importRecords || []).filter(isDuplicateImportRecord).length, [appData.importRecords]);
  const pagination = useFixedPagination(records.length, `${tab}:${search}`, 50);
  if (!open) return null;
  const remove = () => {
    if (!deleteTarget) return;
    updateAppData(prev => deleteImportRecord(prev, deleteTarget.id));
    setDeleteTarget(null); showToast('已删除导入记录，已导入资源和绑定保留', 'info');
  };
  const downloadOriginal = async (record: ImportRecord) => {
    try {
      const file = await get<Blob>(record.fileKey);
      if (!file) throw Error('原文件不可用，请在对应管理页选择本地原文件');
      triggerFileDownload(file, record.fileName);
    } catch (error: any) { showToast(error.message, 'error'); }
  };
  const exportRecords = () => triggerFileDownload(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json;charset=utf-8' }), '导入记录.json');
  return <div className="fixed inset-0 z-[1900] flex items-center justify-center p-0 sm:p-4 bg-black/50" role="dialog" aria-modal="true" aria-label="导入中心">
    <DetailPanel className="sm:max-w-5xl sm:max-h-[90dvh]">
      <DetailHeader designPrefix="import-center" title="导入中心" badge="导入记录" tags={<span>记录来源、类型与结果；资源更换在对应管理页处理</span>} onClose={onClose} />
      <DetailTabs designPrefix="import-center" label="导入记录" tabs={[{ id: 'all', name: `全部 (${appData.importRecords?.length || 0})` }, { id: 'imported', name: '已导入' }, { id: 'unclassified', name: `无法分类待处理 (${unclassifiedCount})` }, { id: 'failed', name: '失败' }, { id: 'duplicates', name: `重复记录 (${duplicateCount})` }]} activeTab={tab} onChange={setTab} />
      <DetailBody className="space-y-4">
        <div className="flex flex-wrap gap-2"><ActionButton action="import" onClick={() => upload.current?.click()}>多选文件 / ZIP</ActionButton><ActionButton action="import" onClick={() => folder.current?.click()}>导入文件夹</ActionButton>{onImportBackup && <ActionButton action="import" onClick={onImportBackup}>恢复项目备份</ActionButton>}<ActionButton action="export" disabled={!records.length} onClick={exportRecords}>导出记录 JSON</ActionButton></div>
        <p className="text-xs text-zinc-500">可同时选择多个文件或整个文件夹。此处只管理导入记录；更换文件、重新识别和资源 JSON 导出请进入对应管理界面。</p>
        <input ref={upload} type="file" aria-label="多选导入文件" multiple accept=".png,.json,.css,.js,.zip" className="hidden" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; if (files.length) void context?.importFiles(files); }} />
        <input ref={folder} type="file" aria-label="选择导入文件夹" multiple {...({ webkitdirectory: '', directory: '' } as any)} className="hidden" onChange={event => { const files = Array.from(event.target.files || []).filter(file => /\.(png|json|css|js|zip)$/i.test(file.name)); event.target.value = ''; if (files.length) void context?.importFiles(files); }} />
        <div className="flex flex-col sm:flex-row gap-2" aria-label="独立待处理区域">
          <div className="flex-1 min-w-0 border p-3 space-y-2"><p className="text-xs font-semibold">无法分类待处理 · {unclassifiedCount} 个文件</p><p className="text-[11px] text-zinc-500">未识别的文件保留原文件，不放入重复卡面暂存区。选择类型后前往对应管理页重新识别。</p><ActionButton action="custom" onClick={() => setTab('unclassified')}>查看无法分类文件</ActionButton></div>
          <div className="flex-1 min-w-0 border p-3 space-y-2"><p className="text-xs font-semibold">重复卡面暂存 · {appData.stagedDuplicateCards?.length || 0} 张卡</p><p className="text-[11px] text-zinc-500">同名但内容不同的卡面在独立暂存区处理版本或保留为新卡。</p>{onOpenDuplicateStaging && <ActionButton action="custom" onClick={onOpenDuplicateStaging}>打开重复卡面暂存区</ActionButton>}</div>
        </div>
        <ManagementSearch value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索文件、来源路径或识别结果" />
        {!records.length && <p className="text-sm text-zinc-500 py-8">{tab === 'unclassified' ? '没有无法分类的待处理文件。' : '暂无导入记录。'}</p>}
        <div className="space-y-2">{records.slice(pagination.start, pagination.end).map(record => <div key={record.id} className="p-3 border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0 space-y-1"><p className="text-xs font-semibold break-all">{record.fileName}</p><p className="text-[10px] break-all text-zinc-500">{record.relativePath}</p><p className="text-[11px] break-all">{TAVERN_KIND_LABELS[record.kind]} · {isDuplicateImportRecord(record) && record.status === 'pending' ? '重复卡面暂存记录' : statuses[record.status]} · {record.message}</p></div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:max-w-[55%]">
            {tab === 'unclassified' && isUnclassifiedImportRecord(record) && <>
              <ActionButton action="export" disabled={!record.fileKey} onClick={() => void downloadOriginal(record)}>下载原文件</ActionButton>
              {onReviewUnclassified && <><select aria-label={`选择 ${record.fileName} 的分类`} className="min-w-0 max-w-full p-1.5 border bg-[var(--card-solid-bg)] text-xs" value={reviewKinds[record.id] || ''} onChange={event => setReviewKinds(prev => ({ ...prev, [record.id]: event.target.value as Exclude<TavernFileKind, 'unknown'> | '' }))}><option value="">选择分类</option>{Object.entries(TAVERN_KIND_LABELS).filter(([kind]) => kind !== 'unknown').map(([kind, name]) => <option key={kind} value={kind}>{name}</option>)}</select><ActionButton action="custom" disabled={!reviewKinds[record.id]} onClick={() => { const kind = reviewKinds[record.id]; if (kind) onReviewUnclassified(record.id, kind); }}>前往管理页处理</ActionButton></>}
            </>}
            <ActionButton action="delete" onClick={() => setDeleteTarget(record)}>删除记录</ActionButton>
          </div>
        </div>)}</div>
      </DetailBody>
      <DetailFooter><ManagementPagination total={records.length} page={pagination.page} pageSize={pagination.pageSize} onPageChange={pagination.setPage} unit="个记录" label="导入记录分页" /></DetailFooter>
    </DetailPanel>
    <DeleteConfirmationModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={remove} title="删除导入记录" message="仅删除这条导入记录。已导入的角色卡、预设、世界书、正则、脚本、QR、主题及其绑定关系全部保留。" itemCount={1} />
  </div>;
}
