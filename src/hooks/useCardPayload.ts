import { useEffect, useState } from 'react';
import { CardEntry } from '../types';
import { getCardCover, getCardThumbnail, hydrateCard, StoredCard } from '../utils/largeCardStore';

let activeCovers = 0;
const waitingCovers: (() => void)[] = [];
async function coverQueue(load: () => Promise<Blob | string | null>, thumbnail: boolean) {
  if (activeCovers >= 2) await new Promise<void>(resolve => waitingCovers.push(resolve));
  else activeCovers++;
  try {
    const value = await load();
    if (!thumbnail || !value || typeof createImageBitmap === 'undefined') return value;
    const blob = typeof value === 'string' ? await (await fetch(value)).blob() : value;
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(blob);
      if (bitmap.width <= 240 && bitmap.height <= 360) return blob;
      const scale = Math.min(240 / bitmap.width, 360 / bitmap.height);
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.75)) || blob;
    } catch { return blob; } finally { bitmap?.close(); }
  } finally { const next = waitingCovers.shift(); if (next) next(); else activeCovers--; }
}

export function useCardCover(card: CardEntry | undefined, thumbnail = true) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false, objectURL: string | null = null;
    setUrl(null);
    if (!card) return;
    coverQueue(() => cancelled ? Promise.resolve(null) : thumbnail ? getCardThumbnail(card) : getCardCover(card), thumbnail).then(value => {
      if (cancelled) return;
      if (value instanceof Blob) { objectURL = URL.createObjectURL(value); setUrl(objectURL); }
      else setUrl(value);
    }).catch(() => {});
    return () => { cancelled = true; if (objectURL) URL.revokeObjectURL(objectURL); };
  }, [card?.id, card?.coverImage, (card as StoredCard | undefined)?.payloadKey, (card as StoredCard | undefined)?.coverFileKey, card?.thumbnailKey, thumbnail]);
  return url;
}

export function useCardPayload(summary: CardEntry | undefined) {
  const [loaded, setLoaded] = useState<{ key: string; card: CardEntry } | null>(null);
  const [error, setError] = useState('');
  const key = summary ? `${summary.id}:${(summary as StoredCard).payloadKey || ''}` : '';
  useEffect(() => {
    let cancelled = false; setError('');
    if (!summary) { setLoaded(null); return; }
    hydrateCard(summary).then(card => { if (!cancelled) setLoaded({ key, card }); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [summary, key]);
  const card = !(summary as StoredCard)?.payloadStub ? summary : loaded?.key === key ? { ...loaded.card, ...summary, rawData: loaded.card.rawData, versions: loaded.card.versions, qrData: loaded.card.qrData, coverImage: loaded.card?.coverImage, extraCovers: loaded.card.extraCovers, screenshots: loaded.card.screenshots, payloadStub: false } : undefined;
  return { card, error, loading: !!summary && !card && !error };
}
