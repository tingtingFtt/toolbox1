import { get, set, setMany } from 'idb-keyval';
import { getCardCoreSignature } from './diffEngine';
import { AppData, CardEntry } from '../types';

export interface StoredCard extends CardEntry {
  payloadKey?: string;
  coverFileKey?: string;
  payloadStub?: boolean;
  contentFingerprint?: string;
}

const bodyFields = ['rawData', 'coverImage', 'extraCovers', 'screenshots', 'versions', 'qrData'] as const;
export async function storeCardBody(card: StoredCard, original?: Blob): Promise<StoredCard> {
  if (card.payloadStub) return card;
  const key = `tavern_card_body:${card.id}:${crypto.randomUUID()}`;
  const payload = Object.fromEntries(bodyFields.map(field => [field, card[field]]));
  const writes: [IDBValidKey, any][] = [[key, payload]];
  const fileKey = original ? `tavern_card_file:${card.id}` : card.coverFileKey;
  if (original && fileKey) writes.push([fileKey, original]);
  await setMany(writes);
  return compactCard({ ...card, contentFingerprint: getCardCoreSignature(card), historyFingerprints: (card.versions || []).map(version => getCardCoreSignature({ ...card, ...(version.data || {}), payloadStub: false })), payloadKey: key, coverFileKey: fileKey, thumbnailKey: card.coverImage ? undefined : card.thumbnailKey });
}

export function compactCard(card: StoredCard): StoredCard {
  if (!card.payloadKey || card.payloadStub) return card;
  const raw = card.rawData?.data || card.rawData || {};
  const summary = {
    name: raw.name || card.name,
    description: String(raw.description || raw.char_persona || '').slice(0, 800),
    creator: raw.creator || card.author,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    character_version: raw.character_version,
  };
  return {
    ...card, versionCount: card.versions?.length || 0, rawData: summary, coverImage: null, extraCovers: undefined,
    screenshots: undefined, versions: undefined, qrData: undefined, payloadStub: true,
  };
}

export async function hydrateCard<T extends CardEntry>(card: T): Promise<T> {
  const stored = card as StoredCard;
  if (!stored.payloadStub || !stored.payloadKey) return card;
  const body = await get<any>(stored.payloadKey);
  if (!body) throw new Error(`「${card.name}」的完整数据未找到，请从导入记录重新导入原文件`);
  return { ...card, ...body, payloadStub: false } as T;
}

export async function getCardCover(card: CardEntry): Promise<Blob | string | null> {
  if (card.coverImage) return card.coverImage;
  const stored = card as StoredCard;
  if (stored.coverFileKey) {
    const file = await get<Blob>(stored.coverFileKey);
    if (file) return file;
  }
  if (stored.payloadKey) return (await get<any>(stored.payloadKey))?.coverImage || null;
  return null;
}

export async function hydrateCardsForExport(cards: CardEntry[]): Promise<CardEntry[]> {
  const result: CardEntry[] = [];
  for (const card of cards) result.push(await hydrateCard(card));
  return result;
}

export async function portableCard(card: CardEntry): Promise<CardEntry> {
  const full = { ...await hydrateCard(card) }, image = await getCardCover(card);
  if (image instanceof Blob) {
    const bytes = new Uint8Array(await image.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    full.coverImage = `data:${image.type || 'image/png'};base64,${btoa(binary)}`;
  } else if (image) full.coverImage = image;
  if (full.versions) full.versions = await Promise.all(full.versions.map(async version => {
    const data = version.data as any;
    if (!data?.coverFileKey && !data?.payloadStub) return version;
    return { ...version, data: await portableCard({ ...full, ...data, versions: undefined, payloadStub: !!data.payloadStub } as CardEntry) };
  }));
  const { payloadKey, coverFileKey, thumbnailKey, payloadStub, ...portable } = full;
  return portable;
}

const assetFields = ['jsonData', 'entries', 'rules', 'rawContent', 'versions', 'findRegex', 'replaceString'] as const;
export async function storeCardAsset(entry: any) {
  if (!entry.sourceCardId || entry.assetStub) return entry;
  const assetPayloadKey = `tavern_asset_body:${entry.id}:${crypto.randomUUID()}`;
  await set(assetPayloadKey, Object.fromEntries(assetFields.map(key => [key, entry[key]])));
  const count = entry.entries?.length || entry.rules?.length || entry.jsonData?.qrList?.length || 0;
  return { ...entry, assetPayloadKey, assetStub: true, entryCount: count, jsonData: undefined, entries: [], rules: [], rawContent: '', versions: undefined, findRegex: '', replaceString: '' };
}
export async function hydrateCardAsset<T>(entry: T): Promise<T> {
  const asset = entry as any;
  if (!asset.assetStub) return entry;
  const body = await get(asset.assetPayloadKey);
  if (!body) throw Error('资源正文读取失败，请从导入中心重试此来源文件');
  return { ...asset, ...(body as any), assetStub: false };
}


export function referencedImportKeys(data: AppData): Set<string> {
  const keys = new Set<string>();
  const visit = (entry: any) => {
    if (!entry) return;
    for (const key of [entry.payloadKey, entry.coverFileKey, entry.thumbnailKey, entry.assetPayloadKey, entry.fileKey]) if (key) keys.add(key);
    for (const version of entry.versions || []) visit(version.data);
    if (entry.incomingCard) { visit(entry.incomingCard); visit(entry.matchedCard); }
  };
  for (const field of ['cards', 'stWorldBooks', 'stRegexScripts', 'scripts', 'stagedDuplicateCards', 'importRecords']) for (const entry of (data as any)[field] || []) visit(entry);
  return keys;
}


export async function createCardThumbnail(file: Blob, id: string): Promise<string | undefined> {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return undefined;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 240 / bitmap.width, 360 / bitmap.height);
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    const context = canvas.getContext('2d'); if (!context) return undefined;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.75 });
    const key = `tavern_card_thumb:${id}`; await set(key, blob); return key;
  } catch { return undefined; }
  finally { bitmap?.close(); }
}

export async function getCardThumbnail(card: CardEntry) {
  if (card.thumbnailKey && !card.coverImage) {
    const image = await get<Blob>(card.thumbnailKey); if (image) return image;
  }
  return getCardCover(card);
}

export async function hydrateCardBoundAssets(card: CardEntry, data?: AppData): Promise<AppData | undefined> {
  if (!data) return data;
  const read = async (items: any[] | undefined, ids: string[] | undefined) => {
    const selected = new Set(ids || []);
    return Promise.all((items || []).map(item => selected.has(item.id) ? hydrateCardAsset(item) : item));
  };
  return { ...data, stWorldBooks: await read(data.stWorldBooks, card.boundWorldBooks), stRegexScripts: await read(data.stRegexScripts, card.boundRegexes), scripts: await read(data.scripts, card.boundScripts) };
}
