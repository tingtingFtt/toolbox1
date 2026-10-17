import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// A minimal hook host runs the actual effects and their cleanup without a browser.
class HookHost {
  slots = []; pending = []; index = 0;
  constructor(component, props) { this.component = component; this.props = props; }
  render() { this.index = 0; globalThis.__cardHookHost = this; try { return this.component(this.props); } finally { globalThis.__cardHookHost = null; } }
  flush() { const pending = this.pending.splice(0); for (const effect of pending) effect(); }
  dispose() { for (const slot of this.slots) slot?.cleanup?.(); }
  useState(initial) { const i = this.index++; if (!this.slots[i]) this.slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [this.slots[i].value, value => { this.slots[i].value = typeof value === 'function' ? value(this.slots[i].value) : value; }]; }
  useRef(value) { return this.useState(() => ({ current: value }))[0]; }
  useMemo(create, deps) { const i = this.index++, old = this.slots[i]; if (!old || !deps || deps.some((value, j) => !Object.is(value, old.deps?.[j]))) this.slots[i] = { value: create(), deps }; return this.slots[i].value; }
  useCallback(fn, deps) { return this.useMemo(() => fn, deps); }
  useEffect(create, deps) { const i = this.index++, old = this.slots[i]; if (!old || !deps || deps.some((value, j) => !Object.is(value, old.deps?.[j]))) { const slot = { deps }; this.slots[i] = slot; this.pending.push(() => { old?.cleanup?.(); slot.cleanup = create(); }); } }
}
function* nodes(value) { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) { for (const child of value) yield* nodes(child); return; } yield value; yield* nodes(value.props?.children); yield* nodes(value.props?.footer); yield* nodes(value.props?.actions); }
const label = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(label).join('') : value?.props ? label(value.props.children) : '';
const button = (tree, text) => { const result = [...nodes(tree)].find(node => typeof node.props?.onClick === 'function' && label(node.props.children).trim() === text); assert.ok(result, `Missing button: ${text}`); return result; };
const settle = async host => { host.flush(); for (let i = 0; i < 8; i++) await new Promise(resolve => setTimeout(resolve, 0)); return host.render(); };
const root = process.cwd(), temp = await mkdtemp(path.join(os.tmpdir(), 'card-surfaces-'));
globalThis.__cardTestReact = React;
globalThis.__cardTestDB = new Map(); globalThis.__cardTestReads = [];
globalThis.localStorage = { getItem: () => null };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
const hooks = `const r=globalThis.__cardTestReact; ${['useState','useEffect','useMemo','useCallback','useRef'].map(name => `export const ${name}=(...args)=>globalThis.__cardHookHost ? globalThis.__cardHookHost.${name}(...args):r.${name}(...args);`).join('\n')} export default {...r,useState,useEffect,useMemo,useCallback,useRef};`;
try {
  const result = await build({ stdin: { contents: `export {HomeSection} from './src/components/sections/HomeSection'; export {GachaModal} from './src/components/ui/GachaModal'; export {CardCover} from './src/components/ui/CardCover'; export {CardDetailModal} from './src/components/modals/CardDetailModal'; export {CardActionModals} from './src/components/modals/CardActionModals'; export {useCardCover} from './src/hooks/useCardPayload';`, resolveDir: root }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, plugins: [{ name: 'browser-contracts', setup(b) {
    b.onResolve({ filter: /^react$/ }, () => ({ path: 'hooks', namespace: 'contracts' }));
    b.onResolve({ filter: /^idb-keyval$/ }, () => ({ path: 'storage', namespace: 'contracts' }));
    b.onResolve({ filter: /\?worker&inline$/ }, () => ({ path: 'worker', namespace: 'contracts' }));
    b.onLoad({ filter: /.*/, namespace: 'contracts' }, args => ({ contents: args.path === 'hooks' ? hooks : args.path === 'worker' ? 'export default class {}' : `export async function get(key){globalThis.__cardTestReads.push(key);return structuredClone(globalThis.__cardTestDB.get(key));} export async function set(){} export async function setMany(){} export async function getMany(keys){return Promise.all(keys.map(get))} export async function delMany(){}` }));
  } }] });
  const file = path.join(root, 'test-card-surfaces.cjs'), loaded = new Module(file); loaded.filename = file; loaded.paths = Module._nodeModulePaths(root); loaded._compile(result.outputFiles[0].text, file);
  const ui = loaded.exports, noop = () => {};
  const full = { id: 'card', name: 'Example', fileName: 'card.png', fileType: 'png', version: 'v3', author: 'Author', authorManual: false, coverImage: null, rawData: { spec: 'chara_card_v3', data: { name: 'Example', description: 'Full description', first_mes: 'Full greeting', character_book: { name: 'Book', entries: [{ content: 'book' }] }, extensions: { regex_scripts: [{ scriptName: 'R', findRegex: 'a', replaceString: 'b' }] } } }, versions: [], qrData: { version: 2, name: 'QR', qrList: [{ message: 'hello' }] }, associations: [], boundWorldBooks: [], boundRegexes: [], boundScripts: [] };
  const compact = { ...full, rawData: { name: 'Example', description: 'Summary' }, versions: undefined, qrData: undefined, payloadStub: true, payloadKey: 'body', coverFileKey: 'original', thumbnailKey: 'thumbnail' };
  globalThis.__cardTestDB.set('body', { rawData: full.rawData, versions: [], qrData: full.qrData, coverImage: null });
  globalThis.__cardTestDB.set('original', new Blob(['original image'], { type: 'image/png' })); globalThis.__cardTestDB.set('thumbnail', new Blob(['thumbnail'], { type: 'image/webp' }));
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL, revoked = []; let nextUrl = 0;
  URL.createObjectURL = () => `blob:test-${++nextUrl}`; URL.revokeObjectURL = url => revoked.push(url);
  try {
    const cover = new HookHost(card => ui.useCardCover(card, false), compact); cover.render(); const first = await settle(cover); assert.match(first, /^blob:test-/);
    cover.props = { ...compact, id: 'second', coverFileKey: 'original-2' }; globalThis.__cardTestDB.set('original-2', new Blob(['second'])); cover.render(); const second = await settle(cover); assert.notEqual(second, first); assert.ok(revoked.includes(first)); cover.dispose(); assert.ok(revoked.includes(second));
    const inline = new HookHost(card => ui.useCardCover(card), { ...full, coverImage: 'data:image/png;base64,inline' }); inline.render(); assert.equal(await settle(inline), 'data:image/png;base64,inline'); inline.dispose();
    const image = new HookHost(ui.CardCover, { card: compact, alt: 'Example', className: 'existing-cover-style', fallback: React.createElement('span', null, 'No cover') }); image.render(); const thumbnail = await settle(image); assert.equal(thumbnail.type, 'img'); assert.equal(thumbnail.props.className, 'existing-cover-style'); const thumbnailUrl = thumbnail.props.src;
    thumbnail.props.onError({}); image.render(); const original = await settle(image); assert.equal(original.type, 'img'); assert.notEqual(original.props.src, thumbnailUrl); assert.ok(globalThis.__cardTestReads.includes('original'));
    original.props.onError({}); const missing = image.render(); assert.equal(label(missing), 'No cover'); image.dispose();
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
  console.log('PASS actual cover effects load stored originals/thumbnails, release object URLs, support inline images and recover from a failed thumbnail without changing classes');

  const homeProps = { appData: { cards: [compact] }, cardViewMode: 'grid-3', recentNormalCards: [], onNavigate: noop, onOpenCardDetail: noop, onDrawRandomCard: noop, onDrawRandomNormalCard: noop, onOpenBigDataExport: noop, onTriggerExport: noop, setCardViewMode: noop };
  for (const mode of ['list', 'grid-3', 'grid-4', 'grid-5']) { const h = new HookHost(ui.HomeSection, { ...homeProps, cardViewMode: mode }); const tree = h.render(); assert.ok([...nodes(tree)].some(node => node.type === ui.CardCover && node.props.card === compact)); h.dispose(); }
  const gacha = new HookHost(ui.GachaModal, { isOpen: true, onClose: noop, appData: { cards: [compact] }, initialCard: compact, onOpenCardDetail: noop, showToast: noop });
  gacha.render(); gacha.flush(); let stage = gacha.render(); stage = await settle(gacha);
  assert.ok([...nodes(stage)].some(node => node.type === ui.CardCover && node.props.card.id === compact.id)); assert.ok(label(stage).includes('Full greeting'));
  button(stage, '历史 (1)').props.onClick(); const history = gacha.render(); assert.ok([...nodes(history)].some(node => node.type === ui.CardCover)); gacha.dispose();
  console.log('PASS homepage list/3/4/5-column previews and gacha stage/history use storage-aware covers; selected gacha card loads its full greeting');

  let exportedJson = 0, exportedPng = 0, coverClicks = 0, updateClicks = 0, alternateOpened = 0, bindingOpened = 0, editorOpened = 0, deletedVersion = 0;
  let data = { cards: [{ ...full, coverFileKey: 'original' }], groups: ['默认'], cardTags: [], stWorldBooks: [], stRegexScripts: [], scripts: [] };
  const props = new Proxy({ appData: data, displayDetailCard: full, detailCardId: full.id, activeLiveCardData: full.rawData, detailTab: 'overview', previewVersionId: null, jumpTargetId: null, customGreetingUsername: '', qrSearchQuery: '', cardWorldBookSearchQuery: '', cardRegexSearchQuery: '', associationTargetId: '', associationNote: '', associationPrimary: false, authorNoteBatchMode: false, selectedAuthorNoteIndices: [], memoryBatchMode: false, selectedMemoryIndices: [], authorNoteInputRef: { current: { click: noop } }, memoryInputRef: { current: { click: noop } }, originalDetailCardRef: { current: full }, coverUploadInputRef: { current: { click: () => coverClicks++ } }, updateCardInputRef: { current: { click: () => updateClicks++ } }, exportAsJson: card => { assert.equal(card.id, full.id); exportedJson++; }, exportAsPng: () => exportedPng++, setShowAddAltGreetingModal: () => alternateOpened++, setEditingCardRegex: () => editorOpened++, handleOpenBindAssetModal: () => bindingOpened++, setVersionToDelete: () => deletedVersion++, getAssociationCandidates: () => [], applyCustomGreetingUsername: text => text, normalizeQrDocument: value => value, updateAppData: apply => { data = typeof apply === 'function' ? apply(data) : apply; } }, { get: (value, key) => key in value ? value[key] : noop });
  const detail = new HookHost(ui.CardDetailModal, props); let tree = detail.render();
  button(tree, '导出 JSON').props.onClick(); button(tree, '导出 PNG').props.onClick(); button(tree, '点击替换/更新封面图').props.onClick(); button(tree, '覆盖更新').props.onClick();
  assert.equal(exportedJson, 1); assert.equal(exportedPng, 1); assert.equal(coverClicks, 1); assert.equal(updateClicks, 1);
  const oldReader = globalThis.FileReader; globalThis.FileReader = class { readAsDataURL() { this.result = 'data:image/png;base64,replaced'; this.onload(); } };
  try { const input = [...nodes(tree)].find(node => node.type === 'input' && node.ref === props.coverUploadInputRef); assert.ok(input); await input.props.onChange({ target: { files: [new File(['cover'], 'new.png')], value: 'selected' } }); assert.equal(data.cards[0].coverImage, 'data:image/png;base64,replaced'); assert.equal(data.cards[0].payloadStub, false); assert.equal(data.cards[0].coverFileKey, undefined); } finally { globalThis.FileReader = oldReader; }
  const oldDocument = globalThis.document; globalThis.document = { getElementById: () => null };
  try { props.appData = data; props.displayDetailCard = data.cards[0]; tree = detail.render(); button(tree, '保存修改').props.onClick(); assert.equal(data.cards[0].author, 'Author'); assert.equal(data.cards[0].coverImage, 'data:image/png;base64,replaced'); } finally { globalThis.document = oldDocument; }
  props.detailTab = 'greetings'; tree = detail.render(); button(tree, '添加备用开场白').props.onClick(); assert.equal(alternateOpened, 1);
  props.detailTab = 'links'; tree = detail.render(); button(tree, '+ 绑定世界书').props.onClick(); assert.equal(bindingOpened, 1);
  for (const tab of ['versions', 'worldbook', 'regex', 'qr', 'raw', 'extras']) { props.detailTab = tab; tree = detail.render(); renderToStaticMarkup(tree); }
  props.detailTab = 'versions'; props.displayDetailCard = { ...full, coverFileKey: 'original', thumbnailKey: 'thumbnail', versions: [{ versionId: 'old', versionNumber: 1, versionLabel: 'V1', updatedAt: 1, data: { ...full, coverFileKey: 'old-original', coverImage: null, versions: undefined } }] };
  tree = detail.render(); button(tree, '删除版本').props.onClick(); assert.equal(deletedVersion, 1);
  button(tree, '切换至此版本').props.onClick(); assert.equal(data.cards[0].coverFileKey, 'old-original'); assert.equal(data.cards[0].versions[0].data.coverFileKey, 'original');
  detail.dispose();
  console.log('PASS actual detail handlers export JSON/PNG, open cover/update inputs, save a new cover, open alternate greeting and binding actions, and render every detail tab without undefined names');

  const actionProps = { section: 'regex', onCloseSection: noop, importMode: 'single', onImportMode: noop, onImportFile: async () => true, regex: { index: 0, scriptName: 'R', findRegex: 'a', replaceString: 'b' }, onRegexChange: noop, onSaveRegex: () => editorOpened++, onCloseRegex: noop, qr: { index: 0, item: { message: 'original', isHidden: true } }, onSaveQr: item => { assert.equal(item.message, 'edited'); assert.equal(item.isHidden, true); }, onCloseQr: noop, showToast: noop };
  const actions = ui.CardActionModals(actionProps); button(actions, '保存正则').props.onClick(); assert.equal(editorOpened, 1);
  let importCalls = 0, importClosed = 0, importAllowed = false;
  const importNode = [...nodes(actions)].find(node => typeof node.type === 'function' && node.props.section === 'regex' && node.props.onImportFile);
  const importHost = new HookHost(importNode.type, { ...importNode.props, importMode: 'all', onCloseSection: () => importClosed++, onImportFile: async () => { importCalls++; return importAllowed; } });
  let importTree = importHost.render(); assert.equal(button(importTree, '确认导入').props.disabled, true);
  [...nodes(importTree)].find(node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [new File(['[]'], 'regex.json')], value: 'selected' } });
  importTree = importHost.render(); assert.equal(button(importTree, '确认导入').props.disabled, true);
  [...nodes(importTree)].find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  importTree = importHost.render(); button(importTree, '确认导入').props.onClick(); await settle(importHost); assert.equal(importCalls, 1); assert.equal(importClosed, 0);
  importAllowed = true; importTree = importHost.render(); button(importTree, '确认导入').props.onClick(); await settle(importHost); assert.equal(importClosed, 1); importHost.dispose();
  const qrNode = [...nodes(actions)].find(node => typeof node.type === 'function' && node.props.item?.message === 'original'); const qrHost = new HookHost(qrNode.type, qrNode.props); let qrTree = qrHost.render(); [...nodes(qrTree)].find(node => node.type === 'textarea').props.onChange({ target: { value: '{"message":"edited","isHidden":true}' } }); qrTree = qrHost.render(); button(qrTree, '保存 QR').props.onClick(); qrHost.dispose();
  const appSource = await readFile(path.join(root, 'src/App.tsx'), 'utf8');
  assert.match(appSource, /<AssetBindingModal\s/); assert.match(appSource, /<CardActionModals\s/); assert.match(appSource, /isOpen=\{!!versionToDelete\}/);
  console.log('PASS missing action dialogs are mounted; regex/QR editors invoke their save handlers and preserve QR options');
} finally { await rm(temp, { recursive: true, force: true }); delete globalThis.__cardHookHost; }
