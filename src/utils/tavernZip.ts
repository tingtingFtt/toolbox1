// Read only the central directory; members are decompressed one at a time in the import worker.
export interface ZipMember { name: string; offset: number; compressedSize: number; size: number; method: number }
export async function readZipMembers(blob: Blob, signal?: AbortSignal): Promise<ZipMember[]> {
  const check = () => { if (signal?.aborted) throw new DOMException('已取消', 'AbortError'); };
  check();
  const tail = new Uint8Array(await blob.slice(Math.max(0, blob.size - 65557)).arrayBuffer());
  const view = new DataView(tail.buffer);
  let end = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === tail.length) { end = i; break; }
  if (end < 0) throw Error('ZIP 目录不完整');
  const count = view.getUint16(end + 10, true), length = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true);
  if (count === 65535 || start === 0xffffffff || length === 0xffffffff) throw Error('暂不支持 ZIP64，请解压后选择文件夹导入');
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || start + length > blob.size || length > 64 * 1024 * 1024) throw Error('不支持此 ZIP 目录，请解压后导入文件夹');
  const bytes = new Uint8Array(await blob.slice(start, start + length).arrayBuffer()), v = new DataView(bytes.buffer), result: ZipMember[] = [];
  for (let offset = 0, i = 0; i < count; i++) {
    check();
    if (offset + 46 > bytes.length || v.getUint32(offset, true) !== 0x02014b50) throw Error('ZIP 成员目录不完整');
    const nameLength = v.getUint16(offset + 28, true), extraLength = v.getUint16(offset + 30, true), commentLength = v.getUint16(offset + 32, true), next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > bytes.length) throw Error('ZIP 成员目录越界');
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (!name.endsWith('/')) {
      if (v.getUint16(offset + 8, true) & 1) throw Error('加密 ZIP 请先解压后导入');
      result.push({ name, method: v.getUint16(offset + 10, true), compressedSize: v.getUint32(offset + 20, true), size: v.getUint32(offset + 24, true), offset: v.getUint32(offset + 42, true) });
    }
    offset = next;
    if (i % 128 === 127) await new Promise(r => setTimeout(r, 0));
  }
  return result;
}
