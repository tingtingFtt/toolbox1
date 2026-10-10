import { useFixedPagination } from '../../hooks/useFixedPagination';
import { ManagementPagination } from '../ui/ManagementPagination';
import { ManagementListItem, managementViewClass } from '../ui/ManagementListItem';
import { ViewModeDropdown, ViewMode } from '../ui/ViewModeDropdown';
import { hydrateCardAsset, hydrateCard } from '../../utils/largeCardStore';
import React, { useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { AppData, ScriptEntry } from '../../types';
import { useTavernImport } from '../../hooks/TavernImportContext';
import { isQRDocument } from '../../utils/tavernFileTypes';
import { triggerFileDownload } from '../../utils';
import { ManagementGrid, ManagementHeader, ManagementSearch } from '../ui/ManagementChrome';
import { DetailPanel, DetailHeader, DetailTabs, DetailBody, DetailFooter } from '../ui/DetailChrome';
import { ActionButton } from '../ui/ActionButton';
import { DeleteConfirmationModal } from '../ui/UnifiedModal';
export function STQuickRepliesSection({ appData, updateAppData, showToast }: { appData: AppData; updateAppData: (apply: (prev: AppData) => AppData) => void; showToast: (text: string, type?: 'success' | 'error' | 'info') => void }) {
  const context = useTavernImport(), [search, setSearch] = useState(''), [viewMode, setViewMode] = useState<ViewMode>('grid-3'), [active, setActive] = useState<ScriptEntry | null>(null), [tab, setTab] = useState('items'), [json, setJson] = useState(''), [deleting, setDeleting] = useState<ScriptEntry | null>(null);
  const sets = useMemo(() => (appData.scripts || []).filter(s => s.type === 'qr' && (!search || `${s.name} ${s.fileName}`.toLowerCase().includes(search.toLowerCase()))), [appData.scripts, search]);
  const pagination = useFixedPagination(sets.length, search, 60);
  const open = async (set: ScriptEntry) => { try { const full = await hydrateCardAsset(set); setActive(full); setJson(JSON.stringify(full.jsonData, null, 2)); setTab('items'); } catch (error: any) { showToast(error.message, 'error'); } };
  const exportSet = async (set: ScriptEntry) => { try { const full = await hydrateCardAsset(set); triggerFileDownload(new Blob([JSON.stringify(full.jsonData, null, 2)], { type: 'application/json' }), `${set.name}.json`); } catch (error: any) { showToast(error.message, 'error'); } };
  const save = async () => { try { const doc = JSON.parse(json); if (!isQRDocument(doc)) throw Error('需要 qrList 且每条包含 message'); const source = appData.cards.find(card => card.id === active?.sourceCardId); const fullOwner = source ? await hydrateCard(source) : undefined; updateAppData(prev => ({ ...prev, cards: fullOwner ? prev.cards.map(card => card.id === fullOwner.id ? { ...card, ...fullOwner, qrData: doc } : card) : prev.cards, scripts: (prev.scripts || []).map(s => s.id === active?.id ? { ...s, ...active, name: doc.name || s.name, jsonData: doc, rawContent: JSON.stringify(doc), updatedAt: Date.now() } : s) })); setActive(null); showToast('QR 已保存', 'success'); } catch (e: any) { showToast(e.message, 'error'); } };
  return <div className="max-w-7xl mx-auto space-y-4">
    <ManagementHeader icon={<MessageSquare className="w-4 h-4" />} title="ST QR 快捷回复" badge={`${sets.length} 个集合`} description="按来源保存完整 QR 集合，保留隐藏、触发和发送选项" actions={<ActionButton action="import" onClick={context?.openCenter}>导入 / 来源调整</ActionButton>} />
    <ManagementSearch value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索 QR 名称或文件名" />
    <ViewModeDropdown viewMode={viewMode} setViewMode={setViewMode} />
    <ManagementGrid viewMode={viewMode} className={managementViewClass(viewMode)}>{sets.slice(pagination.start, pagination.end).map(set => viewMode === 'list' ?
      <ManagementListItem key={set.id} title={set.name} summary={`${set.entryCount ?? set.jsonData?.qrList?.length ?? 0} 个回复 · ${set.sourceCardName || set.sourcePresetName || '单独导入'}`} selected={false} batchMode={false} onSelect={() => {}} onOpen={() => open(set)} onExport={() => exportSet(set)} onDelete={() => setDeleting(set)} /> :
      <div className="p-4 border space-y-2 min-w-0" key={set.id}>
        <button className="text-sm font-semibold text-left w-full truncate" onClick={() => open(set)}>{set.name}</button>
        <p className="text-xs text-zinc-500">{set.entryCount ?? set.jsonData?.qrList?.length ?? 0} 个回复 · {set.sourceCardName || set.sourcePresetName || '单独导入'}</p>
        <div className="flex gap-2 flex-wrap"><ActionButton action="custom" onClick={() => open(set)}>详情</ActionButton><ActionButton action="export" onClick={() => exportSet(set)}>导出</ActionButton><ActionButton action="delete" onClick={() => setDeleting(set)}>删除</ActionButton></div>
      </div>)}</ManagementGrid>
    <ManagementPagination total={sets.length} page={pagination.page} pageSize={pagination.pageSize} onPageChange={pagination.setPage} unit="个集合" label="QR 分页" />
    {active && <div role="dialog" aria-modal="true" aria-label="QR 详情" className="fixed inset-0 z-[1800] bg-black/50 flex items-center justify-center sm:p-4"><DetailPanel className="sm:max-w-4xl sm:max-h-[90dvh]"><DetailHeader designPrefix="qr-detail" title={active.name} badge="QR" tags={<span>{active.sourceCardName || active.sourcePresetName || '本地'} · {active.fileName}</span>} onClose={() => setActive(null)} /><DetailTabs designPrefix="qr-detail" label="QR 详情" tabs={[{ id: 'items', name: '快捷回复' }, { id: 'json', name: '完整 JSON' }]} activeTab={tab} onChange={setTab} /><DetailBody>{tab === 'items' ? <div className="space-y-3">{(active.jsonData?.qrList || []).map((qr: any, i: number) => <div className="border p-3 space-y-2" key={i}><p className="text-sm font-semibold">{qr.label || `回复 ${i + 1}`} <span className="text-xs text-zinc-500">{qr.isHidden ? '隐藏' : '可见'}</span></p><pre className="whitespace-pre-wrap break-words text-xs">{qr.message}</pre><p className="text-[10px] text-zinc-500">{Object.entries(qr).filter(([k, v]) => typeof v === 'boolean' && v).map(([k]) => k).join(' · ')}</p></div>)}</div> : <textarea aria-label="完整 QR JSON" className="w-full min-h-[55dvh] p-3 border bg-transparent font-mono text-xs" value={json} onChange={e => setJson(e.target.value)} />}</DetailBody><DetailFooter><ActionButton action="delete" onClick={() => setDeleting(active)}>删除集合</ActionButton><ActionButton action="save" onClick={save}>保存 JSON</ActionButton></DetailFooter></DetailPanel></div>}
    <DeleteConfirmationModal isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => { updateAppData(prev => ({ ...prev, scripts: (prev.scripts || []).filter(s => s.id !== deleting?.id) })); if (active?.id === deleting?.id) setActive(null); setDeleting(null); }} message="删除此 QR 集合？" itemCount={1} />
  </div>;
}
