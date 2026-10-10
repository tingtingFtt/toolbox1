import { inflateSync } from 'fflate';
import { ZipMember } from '../utils/tavernZip';
import { set } from 'idb-keyval';
import { buildTavernBundle, decodePngCard } from '../utils/tavernFileTypes';
import { storeCardBody, storeCardAsset, createCardThumbnail } from '../utils/largeCardStore';
import { ImportRecord, TavernFileKind } from '../types';

export async function parseTavernFile(file: File, path: string, source: 'local' | 'folder' | 'tavern', forced?: TavernFileKind, member?: ZipMember) {
  if (member) {
    if (member.size > 128 * 1024 * 1024) throw Error('ZIP 单个成员超过 128 MB，请拆分后导入');
    const header = new DataView(await file.slice(member.offset, member.offset + 30).arrayBuffer());
    if (header.byteLength !== 30 || header.getUint32(0, true) !== 0x04034b50) throw Error('ZIP 成员头无效');
    const start = member.offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
    if (start + member.compressedSize > file.size) throw Error('ZIP 成员越界');
    const compressed = new Uint8Array(await file.slice(start, start + member.compressedSize).arrayBuffer());
    const bytes = member.method === 0 ? compressed : member.method === 8 ? inflateSync(compressed, { out: new Uint8Array(member.size) }) : null;
    if (!bytes || bytes.length !== member.size) throw Error('ZIP 压缩格式或成员长度不支持，请先解压');
    file = new File([bytes as BlobPart], member.name.split('/').pop()!);
  }
  if (file.size > 128 * 1024 * 1024) throw Error('单个文件超过 128 MB，请拆分后重试');
  const bytes = await file.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  const id = crypto.randomUUID(), fileKey = `tavern_import_file:${hash}`;
  await set(fileKey, file);
  const info: ImportRecord = { id, recordId: id, fileKey, kind: 'unknown', fileName: file.name, relativePath: path || file.name, source, importedAt: Date.now(), hash, status: 'pending', message: '', targets: [] };
  try {
    let json: any;
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.png')) json = decodePngCard(bytes);
    else if (lower.endsWith('.css')) json = { name: file.name.replace(/\.css$/i, ''), custom_css: new TextDecoder().decode(bytes) };
    else if (lower.endsWith('.js')) json = { type: 'script', name: file.name.replace(/\.js$/i, ''), content: new TextDecoder().decode(bytes) };
    else json = JSON.parse(new TextDecoder().decode(bytes).replace(/^\uFEFF/, ''));
    const bundle = buildTavernBundle(json, file.name, info, forced);
    info.kind = bundle.kind;
    for (const record of bundle.records) {
      if (record.field === 'cards') {
        const thumbnailKey = lower.endsWith('.png') ? await createCardThumbnail(file, record.entry.id) : undefined;
        record.entry = await storeCardBody({ ...record.entry, thumbnailKey, ...(lower.endsWith('.png') ? { coverFileKey: fileKey } : {}) });
      }
      else if (record.entry.sourceCardId) record.entry = await storeCardAsset(record.entry);
      info.targets.push({ field: record.field, id: record.entry.id });
    }
    info.status = bundle.kind === 'unknown' ? 'pending' : 'imported';
    info.message = bundle.kind === 'unknown' ? '未匹配已知结构，可在导入中心单独选择类型或换文件重试' : bundle.title;
    return { bundle, record: info };
  } catch (e: any) {
    info.status = 'failed'; info.message = e.message;
    return { bundle: null, record: info };
  }
}

if (typeof document === 'undefined' && typeof self !== 'undefined' && 'postMessage' in self) {
  self.onmessage = async (event: MessageEvent) => {
    const { requestId, file, path, source, forced, member } = event.data;
    try { self.postMessage({ requestId, result: await parseTavernFile(file, path, source, forced, member) }); }
    catch (error: any) { self.postMessage({ requestId, error: error.message }); }
  };
}
