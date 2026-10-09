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
          ['extensions', 'tavern_helper', 'scripts'],
          ['extensions', 'scripts'],
          ['scripts'],
          ['data', 'extensions', 'tavern_helper', 'scripts'],
        ];
  const result: PresetResource[] = [];
  const seen = new Map<string, number>();
  const visit = (value: any, path: Path, folder = '') => {
    if (Array.isArray(value)) {
      if (
        kind === 'script' &&
        value.length === 2 &&
        value[0] === 'script' &&
        typeof value[1] === 'object'
      ) {
        visit(value[1], [...path, 1], folder);
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
      kind === 'regex' ||
      ['content', 'script', 'code'].some((key) => typeof value[key] === 'string') ||
      value.type === 'script';
    if (!isLeaf) {
      Object.entries(value).forEach(([key, item]) => visit(item, [...path, key], folder));
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

export function syncPresetResources(data: AppData): PresetResourceData {
  const presets = (data.presets || []).map(normalizePreset);
  const regexes: STRegexEntry[] = (data.stRegexScripts || []).filter(
    (item) => !item.sourcePresetId,
  );
  const scripts: ScriptEntry[] = (data.scripts || []).filter((item) => !item.sourcePresetId);
  const project = (preset: PresetEntry, kind: 'regex' | 'script') => {
    const oldList = kind === 'regex' ? data.stRegexScripts || [] : data.scripts || [];
    return getPresetResources(getPresetJson(preset), kind).map((resource) => {
      const id = presetResourceId(preset.id, kind, resource.key);
      const previous: any = oldList.find(
        (item) =>
          item.id === id ||
          (item.sourcePresetId === preset.id && item.sourceResourceKey === resource.key),
      );
      const common = {
        ...previous,
        id,
        fileName: preset.fileName,
        createdAt: previous?.createdAt || preset.createdAt,
        updatedAt: preset.updatedAt || preset.createdAt,
        category: previous?.category || '默认',
        customTags: previous?.customTags || [],
        sourcePresetId: preset.id,
        sourcePresetName: preset.name,
        sourceScope: 'preset',
        sourceResourceKey: resource.key,
        sourceResourcePath: resource.path,
        sourceFolder: resource.folder,
        sourceCardId: undefined,
        sourceCardName: undefined,
        author: previous?.author ?? preset.author,
        description: resource.value.info || resource.value.description || '',
        jsonData: clone(resource.value),
      };
      if (kind === 'script')
        return {
          ...common,
          name: resource.name,
          type: 'script',
          rawContent: JSON.stringify(resource.value, null, 2),
          entries: [clone(resource.value)],
        };
      const rule = {
        ...resource.value,
        scriptName: resource.name,
        findRegex: String(
          resource.value.findRegex ?? resource.value.find_regex ?? resource.value.pattern ?? '',
        ),
        replaceString: String(
          resource.value.replaceString ??
            resource.value.replace_string ??
            resource.value.replacement ??
            '',
        ),
      };
      return {
        ...common,
        scriptName: resource.name,
        findRegex: rule.findRegex,
        replaceString: rule.replaceString,
        disabled: !!rule.disabled,
        rules: [rule],
      };
    });
  };
  presets.forEach((preset) => {
    regexes.push(...(project(preset, 'regex') as STRegexEntry[]));
    scripts.push(...(project(preset, 'script') as ScriptEntry[]));
  });
  return { ...data, presets, stRegexScripts: regexes, scripts };
}

function replaceAt(json: any, path: Path, values: any[]) {
  const parent = read(json, path.slice(0, -1));
  const key = path[path.length - 1];
  if (!parent) return;
  if (Array.isArray(parent) && typeof key === 'number') parent.splice(key, 1, ...values);
  else if (values.length) parent[key] = values[0];
  else delete parent[key];
}

function resourcePayload(old: any, updated: any, kind: 'regex' | 'script'): any[] {
  const original = old.jsonData || {};
  if (kind === 'regex') {
    if (!equal(old.rules, updated.rules))
      return (updated.rules || []).map((rule: any) => ({ ...original, ...rule }));
    if (!equal(old.jsonData, updated.jsonData))
      return Array.isArray(updated.jsonData) ? updated.jsonData : [updated.jsonData];
    return [
      {
        ...original,
        scriptName: updated.scriptName,
        findRegex: updated.findRegex,
        replaceString: updated.replaceString,
        disabled: updated.disabled,
      },
    ];
  }
  if (!equal(old.entries, updated.entries))
    return (updated.entries || []).map((entry: any) => ({ ...original, ...entry }));
  let payload = { ...original };
  if (old.rawContent !== updated.rawContent) {
    try {
      const parsed = JSON.parse(updated.rawContent);
      payload =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? { ...original, ...parsed }
          : { ...original, content: updated.rawContent };
    } catch {
      payload = { ...original, content: updated.rawContent };
    }
  } else if (!equal(old.jsonData, updated.jsonData)) payload = { ...original, ...updated.jsonData };
  if (old.name !== updated.name) payload.name = updated.name;
  if (old.description !== updated.description)
    payload[Object.prototype.hasOwnProperty.call(original, 'info') ? 'info' : 'description'] =
      updated.description;
  return [payload];
}

// Reconcile a single state transaction so all editors, deletes and version restores use the same owner data.
export function reconcilePresetResources(previous: AppData, next: AppData): PresetResourceData {
  if (
    previous.presets === next.presets &&
    previous.stRegexScripts === next.stRegexScripts &&
    previous.scripts === next.scripts &&
    next.presets &&
    next.stRegexScripts &&
    next.scripts
  )
    return next as PresetResourceData;
  const changedJson = new Set(
    (next.presets || [])
      .filter((p) => {
        const old = previous.presets?.find((item) => item.id === p.id);
        return !old || !equal(getPresetJson(old), getPresetJson(p));
      })
      .map((p) => p.id),
  );
  const pending = new Map<string, { kind: 'regex' | 'script'; old: any; payload: any[] }[]>();
  const collect = (kind: 'regex' | 'script', oldList: any[], newList: any[]) => {
    if (oldList === newList) return;
    oldList.forEach((old) => {
      if (
        !old.sourcePresetId ||
        changedJson.has(old.sourcePresetId) ||
        !next.presets?.some((p) => p.id === old.sourcePresetId)
      )
        return;
      const updated = newList.find((item) => item.id === old.id);
      const fields =
        kind === 'regex'
          ? ['rules', 'jsonData', 'scriptName', 'findRegex', 'replaceString', 'disabled']
          : ['entries', 'jsonData', 'rawContent', 'name', 'description'];
      if (updated && fields.every((field) => equal(old[field], updated[field]))) return;
      const payload = updated ? resourcePayload(old, updated, kind) : [];
      if (updated && equal(payload, [old.jsonData])) return;
      const list = pending.get(old.sourcePresetId) || [];
      list.push({ kind, old, payload });
      pending.set(old.sourcePresetId, list);
    });
  };
  collect('regex', previous.stRegexScripts || [], next.stRegexScripts || []);
  collect('script', previous.scripts || [], next.scripts || []);
  const presets = (next.presets || []).map((preset) => {
    const edits = pending.get(preset.id);
    let draft = preset;
    if (edits?.length) {
      const json = clone(getPresetJson(preset));
      const resources = {
        regex: getPresetResources(json, 'regex'),
        script: getPresetResources(json, 'script'),
      };
      // Reverse document order keeps array paths valid during batch deletions.
      edits.sort(
        (a, b) =>
          resources[b.kind].findIndex((r) => r.key === b.old.sourceResourceKey) -
          resources[a.kind].findIndex((r) => r.key === a.old.sourceResourceKey),
      );
      edits.forEach((edit) => {
        const target = resources[edit.kind].find((r) => r.key === edit.old.sourceResourceKey);
        if (target) replaceAt(json, target.path, edit.payload);
      });
      draft = { ...preset, jsonData: json, currentVersionSummary: '更新内嵌资源' };
    }
    const old = previous.presets?.find((p) => p.id === preset.id);
    if (!old) return normalizePreset(draft);
    if (!equal(old.versions, draft.versions)) return normalizePreset(draft);
    return savePresetVersion(old, draft, edits?.length ? '更新内嵌资源' : '保存修改');
  });
  return syncPresetResources({ ...next, presets });
}

export const resourceSource = (item: { sourcePresetId?: string; sourceCardId?: string }) =>
  item.sourcePresetId ? 'preset' : item.sourceCardId ? 'card' : 'standalone';
