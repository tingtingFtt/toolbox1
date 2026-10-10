import { get, getMany, setMany, delMany } from 'idb-keyval';
import { storeCardBody, storeCardAsset, StoredCard } from './largeCardStore';

export const nextTask = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const recordKey = (field: string, id: string) => `tavern_records_v1:${field}:${id}`;
const isRecords = (value: any) => Array.isArray(value) && value.every(item => item && typeof item.id === 'string');
export interface RecordIndex { recordStoreVersion: 1; ids: string[]; keys?: string[] }
export function isRecordIndex(value: any): value is RecordIndex { return value?.recordStoreVersion === 1 && Array.isArray(value.ids); }

// Each write clones only the changed records. The collection index contains IDs, never bodies.
export async function writeCollection(key: string, field: string, value: any, previous?: any): Promise<any> {
  if (!isRecords(value)) { await setMany([[key, value]]); return value; }
  const old = new Map<string, any>((Array.isArray(previous) ? previous : []).map(item => [item.id, item]));
  const priorIndex = await get<RecordIndex>(key);
  const priorKeys = new Map<string, string>(isRecordIndex(priorIndex) ? priorIndex.ids.map((id, i) => [id, priorIndex.keys?.[i] || recordKey(field, id)]) : []);
  const result = value.slice(), writes: [IDBValidKey, any][] = [], keys: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (old.get(item.id) === item && priorKeys.has(item.id)) { keys.push(priorKeys.get(item.id)!); continue; }
    const stored = field === 'cards' ? await storeCardBody(item as StoredCard) : ['stWorldBooks', 'stRegexScripts', 'scripts'].includes(field) ? await storeCardAsset(item) : item;
    const newKey = recordKey(field, item.id + ':' + crypto.randomUUID());
    keys.push(newKey); result[i] = stored; writes.push([newKey, stored]);
    if (writes.length >= 32) { await setMany(writes.splice(0)); await nextTask(); }
  }
  if (writes.length) await setMany(writes);
  // Publish the index only after every record was successfully saved.
  await setMany([[key, { recordStoreVersion: 1, ids: result.map((item: any) => item.id), keys }]]);
  const live = new Set(keys), obsolete = [...priorKeys.values()].filter(k => !live.has(k));
  try { for (let i = 0; i < obsolete.length; i += 64) await delMany(obsolete.slice(i, i + 64)); } catch (error) { console.warn('旧记录清理稍后重试', error); }
  return result;
}

export async function readCollection(field: string, stored: any): Promise<any> {
  if (!isRecordIndex(stored)) return stored;
  const result: any[] = [];
  for (let i = 0; i < stored.ids.length; i += 64) {
    const values = await getMany(stored.keys ? stored.keys.slice(i, i + 64) : stored.ids.slice(i, i + 64).map(id => recordKey(field, id)));
    if (values.some(v => !v)) throw new Error(`${field} 的记录不完整，未加载部分数据`);
    result.push(...values); await nextTask();
  }
  return result;
}
