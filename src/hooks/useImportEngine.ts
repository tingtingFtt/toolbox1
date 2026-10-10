import { AppData, BatchImportProgressState } from '../types';
import { createImportAbortController, abortActiveImport } from '../utils/importCancellation';
import { isTavernImportRunning, runTavernImport } from '../utils/tavernImportPipeline';
export function useImportEngine(appData: AppData, updateAppData: any, currentGroup: string, setBatchImportProgress: any, showToast: any, askChoiceAsync: any, setStagedDuplicates: any, setShowStagingVaultModal: any, autoAssociateAllAssets: any, promptDuplicateAction: any) {
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files.length) return;
    if (isTavernImportRunning()) { showToast('已有导入任务进行中，请等待完成或取消后再试', 'info'); return; }
    const controller = createImportAbortController();
    setBatchImportProgress({ isActive: true, isMinimized: false, total: files.length, current: 0, currentName: '准备导入…', currentPhase: 'parsing', startTime: Date.now(), stats: { added: 0, updatedVersion: 0, distinctCard: 0, overwritten: 0, skipped: 0, stagedDuplicates: 0, failed: 0 }, stagedCards: [], isCompleted: false, onCancelImport: abortActiveImport });
    try {
      const result = await runTavernImport(Array.from(files, file => ({ file, relativePath: file.webkitRelativePath || file.name })), appData, { signal: controller.signal, source: Array.from(files).some(f => f.webkitRelativePath) ? 'folder' : 'local', group: currentGroup === '全部分组' ? '默认' : currentGroup, onProgress: p => setBatchImportProgress((prev: BatchImportProgressState | null) => prev && ({ ...prev, total: p.total, current: p.current, currentName: p.name, currentPhase: p.phase, stats: { ...prev.stats, added: p.stats.added, skipped: p.stats.skipped, stagedDuplicates: p.stats.staged, failed: p.stats.failed } })) });
      setBatchImportProgress((prev: BatchImportProgressState | null) => prev && ({ ...prev, current: result.processed, total: result.total, currentName: result.cancelled ? '已取消，已完成的文件保留' : '导入完成，待分类或失败文件可在导入中心处理', currentPhase: result.cancelled ? 'aborted' : 'complete', isCompleted: true }));
      showToast(`${result.cancelled ? '导入已取消' : '导入完成'}：新增 ${result.stats.added}，重复 ${result.stats.skipped}，暂存 ${result.stats.staged}，待分类 ${result.stats.pending}，失败 ${result.stats.failed}`, result.stats.failed ? 'info' : 'success');
      if (result.stats.staged) setShowStagingVaultModal?.(true);
    } catch (error: any) { setBatchImportProgress(null); showToast(`导入停止：${error.message}。已保存的批次保留。`, 'error'); }
  };
  return { handleFileUpload };
}
