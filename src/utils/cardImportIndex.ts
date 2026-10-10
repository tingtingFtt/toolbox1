import { CardEntry } from '../types';
import { getCardCoreSignature } from './diffEngine';

const clean = (s: string) => s.toLowerCase().replace(/\.(png|webp|json|card)$/i, '').replace(/\s*\(\d+\)$/g, '').replace(/[_\s-]+/g, '').trim();
// Build once per job, then add new cards in O(1), instead of hashing the whole library per file.
export class CardImportIndex {
  private hashes = new Map<string, CardEntry>();
  private names = new Map<string, CardEntry[]>();
  add(card: CardEntry) {
    for (const hash of card.historyFingerprints || []) if (!this.hashes.has(hash)) this.hashes.set(hash, card);
    this.hashes.set(getCardCoreSignature(card), card);
    for (const value of new Set([clean(card.name || ''), clean(card.fileName || '')])) {
      if (!value) continue;
      const entries = this.names.get(value) || []; entries.push(card); this.names.set(value, entries);
    }
  }
  exact(card: CardEntry) { return this.hashes.get(getCardCoreSignature(card)); }
  candidates(card: CardEntry) { return [...new Set([...(this.names.get(clean(card.name || '')) || []), ...(this.names.get(clean(card.fileName || '')) || [])])]; }
  static async build(cards: CardEntry[], signal?: AbortSignal) {
    const index = new CardImportIndex();
    for (let i = 0; i < cards.length; i++) {
      if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
      index.add(cards[i]);
      if (i % 64 === 63) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return index;
  }
}
