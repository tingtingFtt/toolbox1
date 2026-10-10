import { AppData, CardEntry, CardAssociation, STWorldBookEntry, STRegexEntry, ScriptEntry, ChatLogEntry } from '../types';
import { normalizeResourceName } from '../utils';

/**
 * Ensures all cards with the same character name or marked as alternate card faces
 * are bi-directionally associated with each other.
 */
export function linkSameNameCards(cards: CardEntry[]): CardEntry[] {
  const groups = new Map<string, CardEntry[]>();
  for (const card of cards) {
    const name = normalizeResourceName(card.name || card.rawData?.data?.name || card.rawData?.name || '');
    if (!name) continue;
    const list = groups.get(name) || []; list.push(card); groups.set(name, list);
  }
  const additions = new Map<string, CardAssociation[]>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      const card = group[i], known = new Set((card.associations || []).map(a => a.cardId)), extra: CardAssociation[] = [];
      // Large groups keep a connected chain rather than materializing millions of pairwise links.
      const siblings = group.length > 64 ? [group[i - 1], group[i + 1]].filter(Boolean) : group;
      for (const sibling of siblings) if (sibling.id !== card.id && !known.has(sibling.id)) extra.push({ cardId: sibling.id, note: '同名卡面', isPrimary: sibling === group[0], createdAt: Date.now() });
      if (extra.length) additions.set(card.id, extra);
    }
  }
  return cards.map(card => additions.has(card.id) ? { ...card, associations: [...(card.associations || []), ...additions.get(card.id)!] } : card);
}

export function autoAssociateAllAssets(appData: AppData): AppData {
  const cards = linkSameNameCards(appData.cards || []);
  const worldbooks = [...(appData.stWorldBooks || [])], regexes = [...(appData.stRegexScripts || [])], scripts = [...(appData.scripts || [])];
  const makeIndex = (items: any[], getName: (item: any) => string) => {
    const ids = new Map(items.map(item => [item.id, item])), owners = new Map<string, any>(), names = new Map<string, any>();
    items.forEach(item => { if (item.sourceCardId && !owners.has(item.sourceCardId)) owners.set(item.sourceCardId, item); if (!item.sourceCardId && !item.sourcePresetId && item.type !== 'qr') names.set(getName(item).trim().toLowerCase(), item); });
    return { ids, owners, names };
  };
  const wbIndex = makeIndex(worldbooks, item => item.name || ''), rxIndex = makeIndex(regexes, item => item.scriptName || ''), scriptIndex = makeIndex(scripts, item => item.name || '');
  const find = (card: CardEntry, bound: string[] | undefined, index: ReturnType<typeof makeIndex>, aliases: string[], items: any[]) => {
    const existing = (bound || []).map(id => index.ids.get(id)).find(item => item && (!item.sourceCardId || item.sourceCardId === card.id));
    if (existing) return [existing.id];
    const owned = index.owners.get(card.id); if (owned) return [owned.id];
    for (const alias of aliases) {
      const paired = index.names.get(alias.toLowerCase());
      if (!paired || paired.sourceCardId) continue;
      const linked = { ...paired, sourceCardId: card.id, sourceCardName: card.name };
      const position = items.indexOf(paired); if (position >= 0) items[position] = linked;
      index.ids.set(linked.id, linked); index.owners.set(card.id, linked); index.names.delete(alias.toLowerCase());
      return [linked.id];
    }
    return [];
  };
  const same = (a: string[] | undefined, b: string[]) => (a || []).length === b.length && (a || []).every((id, i) => id === b[i]);
  const nextCards = cards.map(card => {
    const name = (card.name || '').trim();
    const wb = find(card, card.boundWorldBooks, wbIndex, [`${name}_世界书`, `[${name}] 世界书`], worldbooks);
    const rx = find(card, card.boundRegexes, rxIndex, [`${name}_正则`, `[${name}] 正则脚本`], regexes);
    const sc = find(card, card.boundScripts, scriptIndex, [`${name}_脚本`, `[${name}] 酒馆脚本`], scripts);
    return same(card.boundWorldBooks, wb) && same(card.boundRegexes, rx) && same(card.boundScripts, sc) ? card : { ...card, boundWorldBooks: wb, boundRegexes: rx, boundScripts: sc };
  });
  return { ...appData, cards: nextCards, stWorldBooks: worldbooks, stRegexScripts: regexes, scripts };
}

/**
 * Returns all alternate card faces associated with a given card
 */
export function getAlternateCardFaces(card: CardEntry, allCards: CardEntry[]): CardEntry[] {
  if (!card) return [];

  const raw = card.rawData?.data || card.rawData || {};
  const charName = (card.name || raw.name || '').trim().toLowerCase();

  const associatedIds = new Set<string>((card.associations || []).map(a => a.cardId));

  return allCards.filter(c => {
    if (c.id === card.id) return false;
    if (associatedIds.has(c.id)) return true;

    const otherRaw = c.rawData?.data || c.rawData || {};
    const otherName = (c.name || otherRaw.name || '').trim().toLowerCase();
    return charName && otherName === charName;
  });
}

