import { unzlibSync } from 'fflate';
import { AppData, CardEntry, ImportInfo, TavernFileKind } from '../types';
import { getCardCoreSignature } from './diffEngine';

export const TAVERN_KIND_LABELS: Record<TavernFileKind, string> = { card: '角色卡', preset: '预设', worldbook: '世界书', regex: '正则集合', script: '脚本集合', qr: 'QR 快捷回复', theme: '主题样式', unknown: '待分类' };
const object = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
const list = (v: any): any[] => Array.isArray(v) ? v : object(v) ? Object.values(v) : [];
const stem = (name: string) => name.split('/').pop()!.replace(/\.[^.]+$/, '');
const regexLeaf = (v: any) => object(v) && typeof v.findRegex === 'string' && typeof v.replaceString === 'string';
const scriptLeaf = (v: any) => object(v) && v.type !== 'folder' && ['content', 'code', 'script'].some(k => typeof v[k] === 'string') && (v.type === 'script' || typeof v.name === 'string');
export const isQRDocument = (v: any) => object(v) && Array.isArray(v.qrList) && v.qrList.every((r: any) => object(r) && typeof r.message === 'string');

export function resourceLeaves(root: any, kind: 'regex' | 'script'): any[] {
  const result: any[] = [];
  const visit = (value: any, depth = 0) => {
    if (depth > 60) return;
    if (Array.isArray(value)) {
      if (value.length === 2 && typeof value[0] === 'string') { if (value[0] !== 'variables') visit(value[1], depth + 1); return; }
      value.forEach(v => visit(v, depth + 1)); return;
    }
    if (!object(value)) return;
    if ((kind === 'regex' ? regexLeaf : scriptLeaf)(value)) { result.push(value); return; }
    Object.entries(value).forEach(([k, v]) => { if (k !== 'variables') visit(v, depth + 1); });
  };
  visit(root); return result;
}

export function detectTavernFileKind(json: any): TavernFileKind {
  const d = json?.data || json;
  if (/^chara_card_v[23]$/.test(json?.spec || '')) return 'card';
  if (isQRDocument(json)) return 'qr';
  if (object(json) && (Array.isArray(json.prompts) || Array.isArray(json.prompt_order))) return 'preset';
  if (object(json) && (Array.isArray(json.entries) || object(json.entries)) && !resourceLeaves(json.entries, 'script').length) return 'worldbook';
  if (object(json) && (typeof json.custom_css === 'string' || ['main_text_color', 'chat_tint_color', 'border_color', 'blur_tint_color'].filter(k => typeof json[k] === 'string').length >= 3)) return 'theme';
  if (object(d) && typeof (d.name || d.char_name) === 'string' && ['description', 'first_mes', 'char_persona', 'char_greeting'].some(k => typeof d[k] === 'string')) return 'card';
  if (resourceLeaves(json, 'regex').length) return 'regex';
  if (resourceLeaves(json, 'script').length) return 'script';
  return 'unknown';
}

export function decodePngCard(buffer: ArrayBuffer): any {
  const b = new Uint8Array(buffer), view = new DataView(buffer), decoder = new TextDecoder();
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)) throw new Error('不是有效的 PNG');
  const texts: Record<string, string> = {};
  for (let offset = 8; offset + 12 <= b.length;) {
    const size = view.getUint32(offset), start = offset + 8, end = start + size;
    if (end + 4 > b.length) throw new Error('PNG 区块不完整');
    const type = decoder.decode(b.subarray(offset + 4, offset + 8));
    if (['tEXt', 'iTXt', 'zTXt'].includes(type)) {
      const payload = b.subarray(start, end), split = payload.indexOf(0);
      if (split >= 0) {
        const key = decoder.decode(payload.subarray(0, split)), value = payload.subarray(split + 1);
        try {
          let text = value;
          if (type === 'zTXt') { if (value[0] !== 0) throw Error('压缩格式不支持'); text = unzlibSync(value.subarray(1)); }
          if (type === 'iTXt') {
            let i = 2;
            for (let n = 0; n < 2; n++) { const zero = value.indexOf(0, i); if (zero < 0) throw Error('iTXt 不完整'); i = zero + 1; }
            text = value[0] === 1 ? unzlibSync(value.subarray(i)) : value.subarray(i);
          }
          texts[key] = decoder.decode(text);
        } catch { /* Try the other card keyword. */ }
      }
    }
    offset = end + 4; if (type === 'IEND') break;
  }
  for (const key of ['ccv3', 'chara']) {
    const raw = texts[key]; if (!raw) continue;
    const candidates = [raw.trim().replace(/^\uFEFF/, '')];
    try {
      const normalized = raw.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
      candidates.push(decoder.decode(Uint8Array.from(atob(normalized + '='.repeat((4 - normalized.length % 4) % 4)), c => c.charCodeAt(0))).replace(/^\uFEFF/, ''));
    } catch { /* A raw JSON chunk may still work. */ }
    for (const value of candidates) try { const parsed = JSON.parse(value); if (object(parsed)) return parsed; } catch { /* next */ }
  }
  throw new Error('PNG 没有可解码的 chara / ccv3 数据，请选择原始卡面');
}

export interface TavernBundle { kind: TavernFileKind; records: { field: keyof AppData; entry: any }[]; title: string; fingerprint?: string }
export function buildTavernBundle(json: any, fileName: string, info: ImportInfo, forced?: TavernFileKind): TavernBundle {
  const kind = forced || detectTavernFileKind(json), d = json?.data || json, now = Date.now();
  const title = String(d?.name || d?.char_name || json?.scriptName || json?.title || json?.preset_name || stem(fileName));
  const id = crypto.randomUUID(), common = { id, fileName, name: title, author: d?.creator || d?.author || json?.author || '', category: '默认', customTags: ['本地'], importedAt: now, createdAt: now, updatedAt: now, importInfo: { ...info, kind }, sourceScope: 'standalone', activeVersionNumber: 1, activeVersionLabel: 'v1', versions: [] };
  const records: TavernBundle['records'] = [];
  const add = (field: keyof AppData, entry: any) => records.push({ field, entry });
  const bookEntries = (book: any) => list(book.entries).map((e, i) => ({ ...e, id: e.id ?? e.uid ?? i, keys: e.keys || e.key || [], secondary_keys: e.secondary_keys || e.keysecondary || [], enabled: e.enabled !== false && !e.disable, insertion_order: e.insertion_order ?? e.order ?? 100 }));
  const regexCollection = (values: any[], owner?: 'card' | 'preset') => ({ ...common, id: owner ? `${owner}_regex_${id}` : id, name: undefined, scriptName: owner ? title + ' · 正则集' : title, rules: values, jsonData: values, findRegex: values[0]?.findRegex || '', replaceString: values[0]?.replaceString || '', ...(owner ? { [`source${owner === 'card' ? 'Card' : 'Preset'}Id`]: id, [`source${owner === 'card' ? 'Card' : 'Preset'}Name`]: title, sourceScope: owner, isBuiltIn: true } : {}) });
  const scriptCollection = (values: any[], owner?: 'card' | 'preset') => ({ ...common, id: owner ? `${owner}_script_${id}` : id, name: owner ? title + ' · 脚本集' : title, jsonData: values, rawContent: JSON.stringify(values), entries: values.map((v, i) => ({ ...v, id: v.id || `entry_${i}`, name: v.name || `脚本 ${i + 1}`, content: v.content || v.code || v.script || '', enabled: v.enabled !== false })), ...(owner ? { [`source${owner === 'card' ? 'Card' : 'Preset'}Id`]: id, [`source${owner === 'card' ? 'Card' : 'Preset'}Name`]: title, sourceScope: owner, isBuiltIn: true } : {}) });
  if (kind === 'card') {
    if (!object(d) || typeof (d.name || d.char_name) !== 'string') throw Error('角色卡需要角色名称');
    const card: CardEntry = { ...common, name: title, fileType: /\.png$/i.test(fileName) ? 'png' : 'json', version: json.spec === 'chara_card_v3' || json.spec_version === '3.0' ? 'v3' : 'v2', authorManual: false, group: '默认', rawData: json, coverImage: null, customTags: [...new Set(['本地', ...list(d.tags).filter(v => typeof v === 'string')])], boundWorldBooks: [], boundRegexes: [], boundScripts: [] };
    card.contentFingerprint = getCardCoreSignature(card); add('cards', card);
    if (d.character_book) { const wbId = `wb_card_${id}`; add('stWorldBooks', { ...common, id: wbId, name: d.character_book.name || title + ' · 世界书', entries: bookEntries(d.character_book), jsonData: d.character_book, sourceCardId: id, sourceCardName: title, sourceScope: 'card', isBuiltIn: true }); card.boundWorldBooks = [wbId]; }
    const rx = resourceLeaves(d.extensions?.regex_scripts || d.regex_scripts || d.character_book?.extensions?.regex_scripts, 'regex');
    if (rx.length) { const entry = regexCollection(rx, 'card'); add('stRegexScripts', entry); card.boundRegexes = [entry.id]; }
    const scripts = resourceLeaves(d.extensions?.tavern_helper || d.extensions?.scripts, 'script');
    if (scripts.length) { const entry = scriptCollection(scripts, 'card'); add('scripts', entry); card.boundScripts = [entry.id]; }
    const qr = d.qrData || d.extensions?.qrData || json.qrData;
    if (isQRDocument(qr)) { card.qrData = qr; add('scripts', { ...common, id: `qr_card_${id}`, name: qr.name || title + ' · QR', type: 'qr', jsonData: qr, rawContent: JSON.stringify(qr), sourceCardId: id, sourceCardName: title, sourceScope: 'card', isBuiltIn: true }); }
    return { kind, records, title, fingerprint: card.contentFingerprint };
  }
  if (kind === 'preset') {
    if (!Array.isArray(json.prompts) && !Array.isArray(json.prompt_order)) throw Error('预设需要 prompts / prompt_order');
    add('presets', { ...common, title, jsonData: json, settings: json, regexScripts: resourceLeaves(json.extensions?.regex_scripts || json.regex_scripts, 'regex'), embeddedScripts: resourceLeaves(json.extensions?.tavern_helper || json.scripts, 'script') });
  } else if (kind === 'worldbook') {
    if (!Array.isArray(json.entries) && !object(json.entries)) throw Error('世界书需要 entries');
    add('stWorldBooks', { ...common, entries: bookEntries(json), jsonData: json });
  } else if (kind === 'regex') {
    const values = resourceLeaves(json, 'regex'); if (!values.length) throw Error('没有有效正则'); add('stRegexScripts', { ...regexCollection(values), jsonData: json });
  } else if (kind === 'script') {
    const values = resourceLeaves(json, 'script'); if (!values.length) throw Error('没有有效脚本'); add('scripts', { ...scriptCollection(values), jsonData: json, rawContent: JSON.stringify(json) });
  } else if (kind === 'qr') {
    if (!isQRDocument(json)) throw Error('QR 需要 qrList 和 message'); add('scripts', { ...common, type: 'qr', jsonData: json, rawContent: JSON.stringify(json), description: `${json.qrList.length} 个快捷回复` });
  } else if (kind === 'theme') {
    if (typeof json.custom_css !== 'string' && detectTavernFileKind(json) !== 'theme') throw Error('未找到主题字段'); add('themes', { ...common, type: 'ST', fileType: /\.css$/i.test(fileName) ? 'css' : 'json', jsonData: json, css: json.custom_css || '', content: json.custom_css || '', description: '本地导入的酒馆主题' });
  }
  return { kind, records, title };
}
