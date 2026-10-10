import { AppData, PresetEntry, ScriptEntry, STRegexEntry } from '../types';

type Path = (string | number)[];
type PresetResourceData = AppData & {
  presets: PresetEntry[];
  stRegexScripts: STRegexEntry[];
  scripts: ScriptEntry[];
};
export interface PresetResource {
  key: string;
  path: Path;
  value: any;
  name: string;
  folder: string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const equal = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const read = (root: any, path: Path) => path.reduce((value, key) => value?.[key], root);

export function getPresetJson(preset: Partial<PresetEntry>): any {
  if (preset.jsonData && typeof preset.jsonData === 'object') return preset.jsonData;
  if (preset.rawJsonString) {
    try {
      return JSON.parse(preset.rawJsonString);
    } catch {
      /* Legacy invalid JSON. */
    }
  }
  return preset.settings && typeof preset.settings === 'object' ? preset.settings : {};
}

export function getPresetDisplayName(json: any, fileName = ''): string {
  const values = [
    json?.name,
    json?.title,
    json?.preset_name,
    json?.metadata?.name,
    fileName.replace(/\.[^/.]+$/, ''),
  ];
  return (
    values.find((value) => typeof value === 'string' && value.trim())?.trim() || '未命名 ST 预设'
  );
}

export function getPresetResources(json: any, kind: 'regex' | 'script'): PresetResource[] {
  const paths: Path[] =
    kind === 'regex'
      ? [
          ['extensions', 'regex_scripts'],
          ['regex_scripts'],
          ['regexes'],
          ['user_regexes'],
          ['data', 'extensions', 'regex_scripts'],
        ]
      : [
          ['extensions', 'tavern_helper'],
          ['extensions', 'scripts'],
          ['scripts'],
          ['data', 'extensions', 'tavern_helper'],
        ];
  const result: PresetResource[] = [];
  const seen = new Map<string, number>();
  const visit = (value: any, path: Path, folder = '') => {
    if (Array.isArray(value)) {
      if (
        kind === 'script' &&
        value.length === 2 &&
        typeof value[0] === 'string' &&
        typeof value[1] === 'object'
      ) {
        if (value[0] !== 'variables') visit(value[1], [...path, 1], folder);
      } else value.forEach((item, index) => visit(item, [...path, index], folder));
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (kind === 'script' && (Array.isArray(value.scripts) || Array.isArray(value.children))) {
      const name = value.name || value.title || '';
      const nextFolder = [folder, name].filter(Boolean).join(' / ');
      if (Array.isArray(value.scripts)) visit(value.scripts, [...path, 'scripts'], nextFolder);
      if (Array.isArray(value.children)) visit(value.children, [...path, 'children'], nextFolder);
      return;
    }
    const isLeaf =
      (kind === 'regex' && typeof value.findRegex === 'string') ||
      ['content', 'script', 'code'].some((key) => typeof value[key] === 'string') ||
      value.type === 'script';
    if (!isLeaf) {
      Object.entries(value).forEach(([key, item]) => { if (key !== 'variables') visit(item, [...path, key], folder); });
      return;
    }
    const nativeId = value.id ?? value.uid;
    const rootPath = paths.find((root) => root.every((key, i) => path[i] === key)) || [];
    const identity =
      nativeId != null ? `${JSON.stringify(rootPath)}:${nativeId}` : JSON.stringify(path);
    const occurrence = seen.get(identity) || 0;
    seen.set(identity, occurrence + 1);
    result.push({
      key: `${identity}:${occurrence}`,
      path,
      value,
      folder,
      name: String(
        kind === 'regex'
          ? value.scriptName ||
              value.script_name ||
              value.name ||
              value.title ||
              `正则 #${result.length + 1}`
          : value.name || value.title || `脚本 #${result.length + 1}`,
      ),
    });
  };
  paths.forEach((path) => visit(read(json, path), path));
  return result;
}

export const presetResourceId = (presetId: string, kind: 'regex' | 'script', key: string) =>
  `preset_${kind}_${presetId}_${encodeURIComponent(key)}`;

export function normalizePreset(preset: PresetEntry): PresetEntry {
  const json = getPresetJson(preset);
  const name = preset.name?.trim() || getPresetDisplayName(json, preset.fileName);
  return {
    ...preset,
    name,
    title: name,
    jsonData: json,
    settings: json,
    rawJsonString: JSON.stringify(json, null, 2),
    regexScripts: getPresetResources(json, 'regex').map((item) => item.value),
    embeddedScripts: getPresetResources(json, 'script').map((item) => item.value),
    activeVersionNumber: preset.activeVersionNumber || (preset.versions?.length || 0) + 1,
    activeVersionLabel:
      preset.activeVersionLabel ||
      `v${preset.activeVersionNumber || (preset.versions?.length || 0) + 1}`,
  };
}

export function createPresetEntry(json: any, fileName: string, category = '默认'): PresetEntry {
  if (
    !json ||
    typeof json !== 'object' ||
    Array.isArray(json) ||
    (!Array.isArray(json.prompts) && !Array.isArray(json.prompt_order))
  ) {
    throw new Error('文件不符合 ST 预设格式：需要 prompts 或 prompt_order');
  }
  const now = Date.now();
  return normalizePreset({
    id: `preset_${now}_${Math.random().toString(36).slice(2, 9)}`,
    name: getPresetDisplayName(json, fileName),
    fileName,
    category,
    author: json.author || json.creator || '',
    description: json.description || json.notes || '',
    jsonData: json,
    customTags: ['ST预设'],
    createdAt: now,
    updatedAt: now,
    importedAt: now,
    versions: [],
    activeVersionNumber: 1,
    activeVersionLabel: 'v1',
    currentVersionSummary: '初始导入版本',
  });
}

const versionData = (preset: PresetEntry) => ({
  name: preset.name,
  fileName: preset.fileName,
  author: preset.author || '',
  description: preset.description || '',
  category: preset.category,
  customTags: preset.customTags || [],
  jsonData: getPresetJson(preset),
});
const contentData = (preset: PresetEntry) => ({
  name: preset.name,
  author: preset.author || '',
  description: preset.description || '',
  jsonData: getPresetJson(preset),
});

export function savePresetVersion(
  previous: PresetEntry | undefined,
  draft: PresetEntry,
  summary = '保存修改',
): PresetEntry {
  const next = normalizePreset(draft);
  if (!previous) return next;
  if (equal(contentData(previous), contentData(next)))
    return { ...next, versions: previous.versions || [] };
  const versions = previous.versions || [];
  const currentNumber = previous.activeVersionNumber || versions.length + 1;
  const nextNumber = Math.max(currentNumber, ...versions.map((v) => v.versionNumber || 0)) + 1;
  const now = Date.now();
  return {
    ...next,
    updatedAt: now,
    activeVersionNumber: nextNumber,
    activeVersionLabel: `v${nextNumber}`,
    activeVersionId: 'current',
    currentVersionSummary: summary,
    versions: [
      {
        versionId: `prever_${previous.id}_${currentNumber}_${now}`,
        versionNumber: currentNumber,
        versionLabel: previous.activeVersionLabel || `v${currentNumber}`,
        fileName: previous.fileName,
        updatedAt: previous.updatedAt || previous.createdAt,
        changeSummary: previous.currentVersionSummary || '初始导入版本',
        data: clone(versionData(previous)),
      },
      ...versions,
    ],
  };
}

// Each preset owns one management collection per resource kind. Child identities stay local.
export const presetCollectionId = (presetId: string, kind: 'regex' | 'script') =>
  `preset_${kind}_${presetId}`;

export function cleanPresetResource(value: any): any {
  if (!value || typeof value !== 'object') return value;
  const { __presetResourceKey, __presetSourceFolder, ...native } = value;
  return native;
}

export function bindPresetResourceItems(values: any[], previous: any[] = []): any[] {
  const used = new Set<string>();
  return values.map((value, index) => {
    let match = value.__presetResourceKey
      ? previous.find(item => item.__presetResourceKey === value.__presetResourceKey)
      : previous.find(item => !used.has(item.__presetResourceKey) &&
          (value.id != null || value.uid != null) &&
          String(item.id ?? item.uid) === String(value.id ?? value.uid));
    if (!match && value.id == null && value.uid == null && !value.__presetResourceKey)
      match = previous[index];
    if (match) used.add(match.__presetResourceKey);
    return {
      ...(match || {}),
      ...value,
      ...(match ? { __presetResourceKey: match.__presetResourceKey, __presetSourceFolder: match.__presetSourceFolder } : {}),
    };
  });
}

export function syncPresetResources(data: AppData): PresetResourceData {
  const presets = (data.presets || []).map(normalizePreset);
  const regexes: STRegexEntry[] = (data.stRegexScripts || []).filter(item => !item.sourcePresetId);
  const scripts: ScriptEntry[] = (data.scripts || []).filter(item => !item.sourcePresetId);
  presets.forEach(preset => {
    (['regex', 'script'] as const).forEach(kind => {
      const resources = getPresetResources(getPresetJson(preset), kind);
      if (!resources.length) return;
      const oldList = kind === 'regex' ? data.stRegexScripts || [] : data.scripts || [];
      const id = presetCollectionId(preset.id, kind);
      const previous = oldList.find(item => item.id === id) || oldList.find(item => item.sourcePresetId === preset.id);
      const native = resources.map(resource => clone(resource.value));
      const children = resources.map(resource => ({
        ...clone(resource.value),
        __presetResourceKey: resource.key,
        __presetSourceFolder: resource.folder,
        ...(kind === 'regex' ? {
          scriptName: resource.name,
          findRegex: String(resource.value.findRegex ?? resource.value.find_regex ?? resource.value.pattern ?? ''),
          replaceString: String(resource.value.replaceString ?? resource.value.replace_string ?? resource.value.replacement ?? ''),
        } : { name: resource.name, enabled: resource.value.enabled !== false }),
      }));
      const common = {
        id,
        fileName: preset.fileName,
        createdAt: previous?.createdAt || preset.createdAt,
        updatedAt: preset.updatedAt || preset.createdAt,
        category: previous?.category || '默认',
        customTags: previous?.customTags || [],
        author: previous?.author ?? preset.author,
        description: previous?.description || '',
        sourcePresetId: preset.id,
        sourcePresetName: preset.name,
        sourceScope: 'preset',
        sourceResources: resources.map(resource => ({ key: resource.key, path: resource.path, folder: resource.folder })),
        activeVersionLabel: preset.activeVersionLabel,
        activeVersionNumber: preset.activeVersionNumber,
        jsonData: native,
      };
      if (kind === 'regex') regexes.push({ ...common,
        scriptName: `${preset.name} · 内嵌正则`,
        findRegex: children[0].findRegex,
        replaceString: children[0].replaceString,
        rules: children,
      });
      else scripts.push({ ...common,
        name: `${preset.name} · 内嵌脚本`,
        type: 'collection',
        rawContent: JSON.stringify(native, null, 2),
        entries: children,
      });
    });
  });
  return { ...data, presets, stRegexScripts: regexes, scripts };
}

function replaceAt(json: any, path: Path, values: any[]) {
  const parent = read(json, path.slice(0, -1));
  const key = path[path.length - 1];
  if (!parent) return;
  // Tavern Helper also stores leaves as ["script", {...}]; preserve that wrapper.
  if (Array.isArray(parent) && key === 1 && parent[0] === 'script') {
    replaceAt(json, path.slice(0, -1), values.map(value => ['script', value]));
  } else if (Array.isArray(parent) && typeof key === 'number') parent.splice(key, 1, ...values);
  else if (values.length) parent[key] = values[0];
  else delete parent[key];
}

function appendResources(json: any, kind: 'regex' | 'script', values: any[]) {
  if (!values.length) return;
  // Append in the original container, preserving folders, dictionary keys and alternate roots.
  const resources = getPresetResources(json, kind);
  let path = resources[resources.length - 1]?.path.slice(0, -1);
  if (path && read(json, path)?.[0] === 'script') path = path.slice(0, -1);
  let parent = path ? read(json, path) : null;
  if (parent && !Array.isArray(parent) && typeof parent === 'object') {
    values.forEach((value, index) => {
      let key = String(value.id || `script_${Date.now()}_${index}`);
      while (Object.prototype.hasOwnProperty.call(parent, key)) key += '_new';
      parent[key] = value;
    });
    return;
  }
  if (!Array.isArray(parent)) {
    json.extensions ||= {};
    if (kind === 'regex') parent = json.extensions.regex_scripts ||= [];
    else {
      json.extensions.tavern_helper ||= {};
      parent = json.extensions.tavern_helper.scripts ||= [];
    }
  }
  const wrapped = kind === 'script' && parent.some((value: any) => Array.isArray(value) && typeof value[0] === 'string');
  parent.push(...values.map(value => wrapped ? ['script', value] : value));
}

function collectionItems(old: any, updated: any, kind: 'regex' | 'script'): any[] {
  const field = kind === 'regex' ? 'rules' : 'entries';
  let values = updated[field] || [];
  if (equal(old[field], values)) {
    if (kind === 'script' && old.rawContent !== updated.rawContent) {
      const parsed = JSON.parse(updated.rawContent);
      if (!Array.isArray(parsed)) throw new Error('预设脚本集合需要 JSON 数组，请在子条目中编辑单个脚本');
      values = parsed;
    } else if (!equal(old.jsonData, updated.jsonData)) {
      values = Array.isArray(updated.jsonData) ? updated.jsonData : [updated.jsonData];
    }
  }
  return bindPresetResourceItems(values, old[field] || []);
}

function updateCollection(json: any, old: any, updated: any, kind: 'regex' | 'script') {
  const resources = getPresetResources(json, kind);
  const items = updated ? collectionItems(old, updated, kind) : [];
  const replacements = new Map(items.filter(item => item.__presetResourceKey).map(item => [item.__presetResourceKey, item]));
  // Add before deleting so an emptied last folder/container remains identifiable.
  appendResources(json, kind, items.filter(item => !item.__presetResourceKey).map(cleanPresetResource));
  [...resources].reverse().forEach(resource => {
    const item = replacements.get(resource.key);
    const oldChild = (kind === 'regex' ? old.rules : old.entries)?.find((entry: any) => entry.__presetResourceKey === resource.key);
    if (item && oldChild && equal(item, oldChild)) return;
    const payload = item ? { ...resource.value, ...cleanPresetResource(item) } : null;
    // Preserve alternate spellings when the editor changes canonical fields.
    if (payload && kind === 'script' && oldChild?.content !== item?.content) {
      if ('code' in resource.value) payload.code = payload.content;
      if ('script' in resource.value) payload.script = payload.content;
    }
    if (payload && kind === 'regex') {
      if ('find_regex' in resource.value) payload.find_regex = payload.findRegex;
      if ('pattern' in resource.value) payload.pattern = payload.findRegex;
      if ('replace_string' in resource.value) payload.replace_string = payload.replaceString;
      if ('replacement' in resource.value) payload.replacement = payload.replaceString;
    }
    replaceAt(json, resource.path, payload ? [payload] : []);
  });
}

// A transaction edits the owner's JSON once, then regenerates its two management collections.
export function reconcilePresetResources(previous: AppData, next: AppData): PresetResourceData {
  if (previous.presets === next.presets && previous.stRegexScripts === next.stRegexScripts && previous.scripts === next.scripts && next.presets && next.stRegexScripts && next.scripts)
    return next as PresetResourceData;
  if (previous.presets === next.presets) {
    const oldCollections = new Map([...(previous.stRegexScripts || []), ...(previous.scripts || [])].filter(item => item.sourcePresetId).map(item => [item.id, item]));
    const newCollections = [...(next.stRegexScripts || []), ...(next.scripts || [])].filter(item => item.sourcePresetId);
    if (oldCollections.size === newCollections.length && newCollections.every(item => oldCollections.get(item.id) === item)) return next as PresetResourceData;
  }
  const presets = (next.presets || []).map(preset => {
    const oldPreset = previous.presets?.find(item => item.id === preset.id);
    let draft = preset;
    const ownerChanged = !oldPreset || !equal(getPresetJson(oldPreset), getPresetJson(preset));
    if (!ownerChanged) {
      const json = clone(getPresetJson(preset));
      (['regex', 'script'] as const).forEach(kind => {
        const oldList = kind === 'regex' ? previous.stRegexScripts : previous.scripts;
        const newList = kind === 'regex' ? next.stRegexScripts : next.scripts;
        if (oldList === newList) return;
        const old = oldList?.find(item => item.sourcePresetId === preset.id && item.sourceResources);
        if (!old) return;
        const updated = newList?.find(item => item.id === old.id);
        const fields = kind === 'regex' ? ['rules', 'jsonData'] : ['entries', 'jsonData', 'rawContent'];
        if (updated && fields.every(field => equal((old as any)[field], (updated as any)[field]))) return;
        updateCollection(json, old, updated, kind);
      });
      if (!equal(json, getPresetJson(preset))) draft = { ...preset, jsonData: json };
    }
    if (!oldPreset) return normalizePreset(draft);
    if (!equal(oldPreset.versions, draft.versions)) return normalizePreset(draft);
    return savePresetVersion(oldPreset, draft, '更新内嵌资源');
  });
  return syncPresetResources({ ...next, presets });
}

export const resourceSource = (item: { sourcePresetId?: string; sourceCardId?: string }) =>
  item.sourcePresetId ? 'preset' : item.sourceCardId ? 'card' : 'standalone';
