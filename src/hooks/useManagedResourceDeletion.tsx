import { flushSync } from 'react-dom';
import React, { useRef, useState } from 'react';
import { AppData } from '../types';
import { AssetField, bindingWarning, prepareResourceDeletion } from '../utils/resourceManagement';
import { isTavernImportRunning } from '../utils/tavernImportPipeline';
import { DeleteConfirmationModal } from '../components/ui/UnifiedModal';
export function useManagedResourceDeletion(data: AppData, update: (apply: (prev: AppData) => AppData) => void, toast: (message: string, type?: 'success' | 'error' | 'info') => void, field: AssetField) {
  const current = useRef(data); current.current = data;
  const [request, setRequest] = useState<{ ids: string[]; warning: string; done?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);
  const requestDelete = (ids: string[], done?: () => void) => {
    if (!ids.length) return;
    if (isTavernImportRunning()) { toast('请等待当前导入完成后再删除', 'info'); return; }
    setRequest({ ids, warning: bindingWarning(current.current, field, ids), done });
  };
  const confirm = async () => {
    if (!request || busy) return;
    if (isTavernImportRunning()) { toast('请等待当前导入完成后再删除', 'info'); return; }
    setBusy(true);
    try {
      const before = current.current, next = await prepareResourceDeletion(before, field, request.ids);
      if (current.current !== before) throw Error('数据已变化，请重新确认删除范围');
      let applied = false;
      flushSync(() => update(prev => { if (prev !== before) return prev; applied = true; return next; }));
      if (!applied) throw Error('数据已变化，原资源保留，请重新操作');
      request.done?.(); setRequest(null); toast('资源已删除，关联绑定已同步处理', 'info');
    } catch (error: any) { toast(error.message, 'error'); }
    finally { setBusy(false); }
  };
  const modal = <DeleteConfirmationModal isOpen={!!request} onClose={() => { if (!busy) setRequest(null); }} onConfirm={() => void confirm()} title={request?.warning ? '删除绑定资源：确认影响' : '确认删除资源'} message={request?.warning || '删除所选资源？此操作不可恢复。'} itemCount={request?.ids.length || 1} requireAcknowledgement={!!request?.warning} acknowledgementText="我已了解绑定影响，并确认删除资源及解除绑定" busy={busy} closeOnConfirm={false} />;
  return { requestDelete, modal };
}
