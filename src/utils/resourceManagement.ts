import { AppData, CardEntry, ImportRecord, TavernFileKind } from '../types';
import { hydrateCard, hydrateCardAsset } from './largeCardStore';
import { TavernBundle, resourceLeaves } from './tavernFileTypes';
import { reconcilePresetResources } from './presetResources';

export const RESOURCE_FIELDS = { card: 'cards', preset: 'presets', worldbook: 'stWorldBooks', regex: 'stRegexScripts', script: 'scripts', qr: 'scripts', theme: 'themes' } as const;
export type ManagedKind = keyof typeof RESOURCE_FIELDS;
export type AssetField = 'stWorldBooks' | 'stRegexScripts' | 'scripts';
const bindingFields = { stWorldBooks: 'boundWorldBooks', stRegexScripts: 'boundRegexes', scripts: 'boundScripts' } as const;
export const resourceName = (item: any) => item.scriptName || item.name || item.fileName || '未命名';
export const resourceItems = (data: AppData, kind: ManagedKind): any[] => ((data[RESOURCE_FIELDS[kind]] || []) as any[]).filter(item => kind === 'qr' ? item.type === 'qr' : kind !== 'script' || item.type !== 'qr');

/** History is independent of the imported resources, including their bindings and bodies. */
export function deleteImportRecord(data: AppData, id: string): AppData {
  return { ...data, importRecords: (data.importRecords || []).filter(record => record.id !== id) };
}

function cardUsesAny(card: any, field: AssetField, ids: Set<string>): boolean {
  const uses = (value: any) => (value?.[bindingFields[field]] || []).some((id: string) => ids.has(id)) || Object.keys(value?.boundAssetVersions || {}).some(id => ids.has(id));
  return uses(card) || (card.historyBindings?.[bindingFields[field]] || []).some((id: string) => ids.has(id)) || (card.versions || []).some((version: any) => uses(version.data));
}
export function bindingWarning(data: AppData, field: AssetField, ids: string[]): string {
  const selected = new Set(ids), owners = new Set<string>();
  const cardNames = new Map((data.cards || []).map(card => [card.id, card.name]));
  const presetNames = new Map((data.presets || []).map(preset => [preset.id, preset.name]));
  for (const item of (data[field] || []) as any[]) if (selected.has(item.id)) {
    if (item.sourceCardId) owners.add(`角色卡「${cardNames.get(item.sourceCardId) || item.sourceCardName || item.sourceCardId}」`);
    if (item.sourcePresetId) owners.add(`预设「${presetNames.get(item.sourcePresetId) || item.sourcePresetName || item.sourcePresetId}」`);

  }
  for (const card of data.cards || []) if (cardUsesAny(card, field, selected)) owners.add(`角色卡「${card.name}」`);
  if (!owners.size) return '';
  const names = [...owners];
  return `【绑定资源】关联 ${names.length} 个来源：${names.slice(0, 8).join('、')}${names.length > 8 ? '等' : ''}。删除会解除这些绑定；内嵌资源会同步从所属卡片或预设的当前内容中移除。历史版本正文保留。请先导出 JSON 备份，并勾选确认影响。`;
}

function removeScriptLeaves(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if (!Array.isArray(value) && value.type !== 'folder' && ['content', 'code', 'script'].some(key => typeof value[key] === 'string') && (value.type === 'script' || typeof value.name === 'string')) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 2 && value[0] === 'variables') return value;
    if (value.length === 2 && value[0] === 'script') return undefined;
    return value.map(removeScriptLeaves).filter(value => value !== undefined);
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === 'variables' ? child : removeScriptLeaves(child)]).filter(([, child]) => child !== undefined));
}
function clearEmbedded(card: CardEntry, field: AssetField, items: any[]): CardEntry {
  const raw = structuredClone(card.rawData || {}), d = raw.data || raw, edit = structuredClone(card.editHistory || {});
  if (field === 'stWorldBooks') { delete d.character_book; delete raw.character_book; delete edit.character_book; }
  if (field === 'stRegexScripts') {
    for (const root of [d, raw, edit]) {
      delete root.regex_scripts;
      if (root.extensions) { delete root.extensions.regex_scripts; delete root.extensions.regex; }
      if (root.character_book?.extensions) delete root.character_book.extensions.regex_scripts;
    }
  }
  if (field === 'scripts') {
    const qr = items.some(item => item.type === 'qr'), scripts = items.some(item => item.type !== 'qr');
    for (const root of [d, raw, edit]) {
      if (qr) { delete root.qrData; if (root.extensions) delete root.extensions.qrData; }
      if (scripts && root.extensions) {
        if (root.extensions.scripts) root.extensions.scripts = removeScriptLeaves(root.extensions.scripts);
        if (root.extensions.tavern_helper) root.extensions.tavern_helper = removeScriptLeaves(root.extensions.tavern_helper);
      }
    }
    if (qr) return { ...card, rawData: raw, editHistory: edit, qrData: undefined };
  }
  return { ...card, rawData: raw, editHistory: edit };
}
export async function prepareResourceDeletion(data: AppData, field: AssetField, ids: string[]): Promise<AppData> {
  const selected = new Set(ids), deleted = ((data[field] || []) as any[]).filter(item => selected.has(item.id));
  const embeddedByOwner = new Map<string, any[]>();
  for (const item of deleted) if (item.sourceCardId) embeddedByOwner.set(item.sourceCardId, [...(embeddedByOwner.get(item.sourceCardId) || []), item]);
  const cards: CardEntry[] = [];
  for (const summary of data.cards || []) {
    const embedded = embeddedByOwner.get(summary.id) || [];
    if (!embedded.length && !cardUsesAny(summary, field, selected)) { cards.push(summary); continue; }
    const full = await hydrateCard(summary);
    const unbind = (value: any) => ({ ...value, [bindingFields[field]]: (value[bindingFields[field]] || []).filter((id: string) => !selected.has(id)), boundAssetVersions: Object.fromEntries(Object.entries(value.boundAssetVersions || {}).filter(([id]) => !selected.has(id))) });
    const updated = unbind(embedded.length ? clearEmbedded(full, field, embedded) : full);
    cards.push({ ...updated, versions: full.versions?.map(version => ({ ...version, data: unbind(version.data || {}) })), updatedAt: Date.now() });
  }
  return reconcilePresetResources(data, { ...data, cards, [field]: ((data[field] || []) as any[]).filter(item => !selected.has(item.id)) });
}

function nativeJson(value: any): any {
  if (Array.isArray(value)) return value.map(nativeJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !['__presetResourceKey', '__presetSourceFolder'].includes(key)).map(([key, child]) => [key, nativeJson(child)]));
}
/** Keep collections still used by surviving cards when their preset owner is deleted. */
export function deleteManagedPresets(data: AppData, ids: string[]): AppData {
  const selected = new Set(ids), referenced = new Set<string>();
  for (const card of data.cards || []) {
    for (const value of [card, card.historyBindings, ...(card.versions || []).map(version => version.data)]) {
      for (const id of [...(value?.boundRegexes || []), ...(value?.boundScripts || []), ...Object.keys(value?.boundAssetVersions || {})]) referenced.add(id);
    }
  }
  const preserve = (items: any[]) => items.map(item => item.sourcePresetId && selected.has(item.sourcePresetId) && referenced.has(item.id) ? { ...item, sourcePresetId: undefined, sourcePresetName: undefined, sourceResources: undefined, sourceResourceKey: undefined, sourceResourcePath: undefined, sourceScope: 'standalone', isBuiltIn: false, rules: item.rules ? nativeJson(item.rules) : item.rules, entries: item.entries ? nativeJson(item.entries) : item.entries, jsonData: nativeJson(item.jsonData), rawContent: item.type === 'qr' ? item.rawContent : (item.rawContent ? JSON.stringify(nativeJson(resourceJsonPayload('script', item)), null, 2) : item.rawContent) } : item);
  return reconcilePresetResources(data, { ...data, presets: (data.presets || []).filter(preset => !selected.has(preset.id)), stRegexScripts: preserve(data.stRegexScripts || []), scripts: preserve(data.scripts || []) });
}

export function resourceJsonPayload(kind: ManagedKind, item: any): any {
  if (kind === 'script') {
    if (item.rawContent?.trim()) {
      try { const parsed = JSON.parse(item.rawContent); if (parsed && typeof parsed === 'object') return nativeJson(parsed); } catch { return { ...(item.jsonData && !Array.isArray(item.jsonData) && typeof item.jsonData === 'object' ? nativeJson(item.jsonData) : {}), type: 'script', name: item.name || '脚本', content: item.rawContent }; }
    }
    if (item.jsonData && typeof item.jsonData === 'object') return nativeJson(item.jsonData);
    if (item.entries?.length) return item.entries.map(nativeJson);
    return { type: 'script', name: item.name || '脚本', content: item.rawContent || '' };
  }
  if (kind === 'theme') return item.jsonData || { name: item.name, custom_css: item.css || item.content || '' };
  if (kind === 'regex') return nativeJson(item.jsonData || item.rules || [{ scriptName: item.scriptName, findRegex: item.findRegex || '', replaceString: item.replaceString || '', disabled: !!item.disabled }]);
  if (kind === 'worldbook') {
    const original = item.jsonData || {}, values = Array.isArray(item.entries) ? item.entries : Object.values(item.entries || {});
    const entries = original.entries && !Array.isArray(original.entries) ? Object.fromEntries(values.map((entry: any, index: number) => [String(entry.uid ?? entry.id ?? index), entry])) : values;
    return { ...original, name: item.name || original.name, description: item.description ?? original.description, entries };
  }
  if (kind === 'preset') return item.jsonData || item.settings || {};
  if (kind === 'qr') return item.jsonData;
  return item.rawData;
}

export async function syncCardScriptEntry(data: AppData, entry: any): Promise<CardEntry[]> {
  if (!entry.sourceCardId) return data.cards;
  const summary = data.cards.find(card => card.id === entry.sourceCardId);
  if (!summary) throw Error('所属角色卡不存在，请先修复绑定');
  const owner = await hydrateCard(summary), raw = structuredClone(owner.rawData || {}), d = raw.data || raw;
  d.extensions ||= {};
  d.extensions.scripts = entry.entries || resourceLeaves(resourceJsonPayload('script', entry), 'script');
  if (d.extensions.tavern_helper) d.extensions.tavern_helper = removeScriptLeaves(d.extensions.tavern_helper);
  const edit = structuredClone(owner.editHistory || {});
  if (edit.extensions) { delete edit.extensions.scripts; delete edit.extensions.tavern_helper; }
  return data.cards.map(card => card.id === owner.id ? { ...owner, rawData: raw, editHistory: edit, updatedAt: Date.now() } : card);
}

const snapshot = (item: any) => { const { versions, ...body } = item; return body; };
function replaceEntry(old: any, incoming: any) {
  const number = (old.activeVersionNumber || (old.versions?.length || 0) + 1);
  return { ...old, ...incoming, id: old.id, createdAt: old.createdAt, group: old.group ?? incoming.group, category: old.category ?? incoming.category, customTags: old.customTags || incoming.customTags, associations: old.associations, sourceCardId: old.sourceCardId, sourceCardName: old.sourceCardName, sourcePresetId: old.sourcePresetId, sourcePresetName: old.sourcePresetName, sourceResources: old.sourceResources, sourceScope: old.sourceScope || incoming.sourceScope, versions: [...(old.versions || []), { versionId: crypto.randomUUID(), versionNumber: number, versionLabel: old.activeVersionLabel || `v${number}`, updatedAt: Date.now(), data: snapshot(old), changeSummary: '更换文件前的内容' }], activeVersionNumber: number + 1, activeVersionLabel: `v${number + 1}`, activeVersionId: undefined, payloadStub: false, assetStub: false, updatedAt: Date.now() };
}

/** Preserve the target identity and every existing binding. Missing companions remain available. */
export async function prepareResourceReplacement(data: AppData, kind: ManagedKind, targetId: string, bundle: TavernBundle, record: ImportRecord): Promise<AppData> {
  if (bundle.kind !== kind) throw Error('文件类型与当前管理界面不匹配');
  const field = RESOURCE_FIELDS[kind], oldSummary = resourceItems(data, kind).find(item => item.id === targetId);
  if (!oldSummary) throw Error('目标条目已不存在');
  const old = kind === 'card' ? await hydrateCard(oldSummary) : await hydrateCardAsset(oldSummary);
  const primary = bundle.records.find(item => item.field === field);
  if (!primary) throw Error('文件没有对应资源');
  const incoming = kind === 'card' ? await hydrateCard(primary.entry) : await hydrateCardAsset(primary.entry);
  const updated = replaceEntry(old, incoming);
  let next: AppData = { ...data, [field]: ((data[field] || []) as any[]).map(item => item.id === targetId ? updated : item) };
  const targets: ImportRecord['targets'] = [{ field, id: targetId }];
  if (kind === 'card') {
    updated.editHistory = {}; updated.edited = false;
    for (const childField of ['stWorldBooks', 'stRegexScripts', 'scripts'] as AssetField[]) {
      const children = bundle.records.filter(item => item.field === childField);
      let current = [...((data[childField] || []) as any[])];
      const childIds: string[] = [];
      for (const child of children) {
        const full = await hydrateCardAsset(child.entry);
        const previous = current.find(item => item.sourceCardId === targetId && (item.type === 'qr') === (full.type === 'qr'));
        const entry = previous ? replaceEntry(await hydrateCardAsset(previous), full) : { ...full, assetStub: false };
        entry.sourceCardId = targetId; entry.sourceCardName = updated.name; entry.sourceScope = 'card';
        current = previous ? current.map(item => item.id === previous.id ? entry : item) : [...current, entry];
        childIds.push(entry.id); targets.push({ field: childField, id: entry.id });
      }
      (next as any)[childField] = current.map(item => item.sourceCardId === targetId ? { ...item, sourceCardName: updated.name } : item);
      updated[bindingFields[childField]] = [...new Set([...(old[bindingFields[childField]] || []), ...childIds])];
    }
    updated.boundAssetVersions = old.boundAssetVersions;
  } else if (old.sourceCardId) {
    const ownerSummary = data.cards.find(card => card.id === old.sourceCardId);
    if (!ownerSummary) throw Error('所属角色卡不存在，请先修复绑定');
    const owner = await hydrateCard(ownerSummary), raw = structuredClone(owner.rawData || {}), d = raw.data || raw;
    const edit = structuredClone(owner.editHistory || {});
    if (kind === 'worldbook') { d.character_book = resourceJsonPayload(kind, updated); delete edit.character_book; }
    if (kind === 'regex') { const payload = updated.rules || resourceLeaves(updated.jsonData, 'regex'); d.extensions ||= {}; d.extensions.regex_scripts = payload; delete d.extensions.regex; delete d.regex_scripts; if (d.character_book?.extensions) delete d.character_book.extensions.regex_scripts; delete edit.regex_scripts; if (edit.extensions) { delete edit.extensions.regex; delete edit.extensions.regex_scripts; } }
    if (kind === 'script') { d.extensions ||= {}; d.extensions.scripts = updated.entries; if (d.extensions.tavern_helper) d.extensions.tavern_helper = removeScriptLeaves(d.extensions.tavern_helper); if (edit.extensions) { delete edit.extensions.scripts; delete edit.extensions.tavern_helper; } }
    if (kind === 'qr') { d.qrData = updated.jsonData; if (d.extensions) delete d.extensions.qrData; delete edit.qrData; }
    next.cards = data.cards.map(card => card.id === owner.id ? { ...owner, rawData: raw, editHistory: edit, ...(kind === 'qr' ? { qrData: updated.jsonData } : {}), updatedAt: Date.now() } : card);
  }
  next.importRecords = [...(data.importRecords || []), { ...record, targets, message: `已在管理界面更换「${resourceName(old)}」` }];
  return reconcilePresetResources(data, next);
}
