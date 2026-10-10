import ImportWorker from '../workers/tavernImport.worker?worker&inline';
import { ImportRecord, TavernFileKind } from '../types';
import { ZipMember } from './tavernZip';
import { TavernBundle } from './tavernFileTypes';
import { parseTavernFile } from '../workers/tavernImport.worker';

export class TavernImportClient {
  private worker: Worker | null = null;
  constructor() { if (typeof Worker !== 'undefined') { try { this.worker = new ImportWorker(); } catch { this.worker = null; } } }
  async parse(file: File, path: string, source: 'local' | 'folder' | 'tavern', signal: AbortSignal, forced?: TavernFileKind, member?: ZipMember): Promise<{ bundle: TavernBundle | null; record: ImportRecord }> {
    if (signal.aborted) throw new DOMException('已取消导入', 'AbortError');
    if (!this.worker) { await new Promise(r => setTimeout(r, 0)); return parseTavernFile(file, path, source, forced, member); }
    const requestId = crypto.randomUUID(), worker = this.worker;
    return new Promise((resolve, reject) => {
      const clean = () => { worker.removeEventListener('message', message); worker.removeEventListener('error', error); signal.removeEventListener('abort', abort); };
      const abort = () => { clean(); this.close(); reject(new DOMException('已取消导入', 'AbortError')); };
      const error = () => { clean(); this.close(); if (signal.aborted) reject(new DOMException('已取消导入', 'AbortError')); else { void new Promise(r => setTimeout(r, 0)).then(() => parseTavernFile(file, path, source, forced, member)).then(resolve, reject); } };
      const message = (e: MessageEvent) => { if (e.data.requestId !== requestId) return; clean(); if (e.data.error) reject(Error(e.data.error)); else resolve(e.data.result); };
      worker.addEventListener('message', message); worker.addEventListener('error', error); signal.addEventListener('abort', abort, { once: true });
      try { worker.postMessage({ requestId, file, path, source, forced, member }); } catch { error(); }
    });
  }
  close() { this.worker?.terminate(); this.worker = null; }
}
