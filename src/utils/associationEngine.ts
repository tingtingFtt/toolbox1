import { AppData, CardEntry, CardAssociation, STWorldBookEntry, STRegexEntry, ScriptEntry, ChatLogEntry } from '../types';
import { normalizeResourceName } from '../utils';

/**
 * Ensures all cards with the same character name or marked as alternate card faces
 * are bi-directionally associated with each other.
 */
export function linkSameNameCards(cards: CardEntry[]): CardEntry[] {
  // Group cards by normalized character name
  const nameMap = new Map<string, CardEntry[]>();

  cards.forEach(card => {
    const rawData = card.rawData?.data || card.rawData || {};
    const charName = normalizeResourceName(card.name || rawData.name || '');
    if (!charName) return;

    const list = nameMap.get(charName) || [];
    list.push(card);
    nameMap.set(charName, list);
  });

  // For each group with more than 1 card, establish mutual associations
  return cards.map(card => {
    const rawData = card.rawData?.data || card.rawData || {};
    const charName = normalizeResourceName(card.name || rawData.name || '');
    if (!charName) return card;

    const group = nameMap.get(charName) || [];
    if (group.length <= 1) return card;

    // Existing associations
    const currentAssociations: CardAssociation[] = card.associations ? [...card.associations] : [];

    // For all other cards in the same name group, ensure an association exists
    group.forEach((sibling, idx) => {
      if (sibling.id === card.id) return;

      const exists = currentAssociations.some(a => a.cardId === sibling.id);
      if (!exists) {
        currentAssociations.push({
          cardId: sibling.id,
          note: `同名卡面 (卡面 ${idx + 1})`,
          isPrimary: idx === 0,
          createdAt: Date.now()
        });
      }
    });

    return {
      ...card,
      associations: currentAssociations
    };
  });
}

/**
 * Automatically binds embedded or strictly paired WorldBooks, Regexes, and Scripts to cards.
 * Ensures strict 1-to-1 mapping: 1 card maps to at most 1 companion WorldBook, 1 Regex, and 1 Script.
 */
export function autoAssociateAllAssets(appData: AppData): AppData {
  let modifiedCards = [...(appData.cards || [])];
  let modifiedWorldBooks = [...(appData.stWorldBooks || [])];
  let modifiedRegexes = [...(appData.stRegexScripts || [])];
  let modifiedScripts = [...(appData.scripts || [])];

  // 1. Link same name cards
  modifiedCards = linkSameNameCards(modifiedCards);

  // 2. Link WorldBooks, Regexes, and Scripts to Cards (Strict 1-to-1 Companion Binding)
  modifiedCards = modifiedCards.map(card => {
    const raw = card.rawData?.data || card.rawData || {};
    const cardName = (card.name || raw.name || '').trim();
    const cardId = card.id;

    // A. Single WorldBook Binding
    let boundWbId: string | null = null;
    if (card.boundWorldBooks && card.boundWorldBooks.length > 0) {
      const valid = modifiedWorldBooks.find(w => card.boundWorldBooks!.includes(w.id) && (!w.sourceCardId || w.sourceCardId === cardId));
      if (valid) boundWbId = valid.id;
    }
    if (!boundWbId) {
      const bySource = modifiedWorldBooks.find(w => w.sourceCardId === cardId);
      if (bySource) boundWbId = bySource.id;
    }
    if (!boundWbId && cardName) {
      const exactName = `${cardName}_世界书`;
      const byExactName = modifiedWorldBooks.find(w => !w.sourceCardId && (w.name.trim().toLowerCase() === exactName.toLowerCase() || w.name.trim().toLowerCase() === `[${cardName}] 世界书`.toLowerCase()));
      if (byExactName) {
        boundWbId = byExactName.id;
        byExactName.sourceCardId = cardId;
        byExactName.sourceCardName = card.name;
      }
    }

    // B. Single Regex Script Binding
    let boundRegexId: string | null = null;
    if (card.boundRegexes && card.boundRegexes.length > 0) {
      const valid = modifiedRegexes.find(r => card.boundRegexes!.includes(r.id) && (!r.sourceCardId || r.sourceCardId === cardId));
      if (valid) boundRegexId = valid.id;
    }
    if (!boundRegexId) {
      const bySource = modifiedRegexes.find(r => r.sourceCardId === cardId);
      if (bySource) boundRegexId = bySource.id;
    }
    if (!boundRegexId && cardName) {
      const exactName = `[${cardName}] 正则脚本`;
      const byExactName = modifiedRegexes.find(r => !r.sourceCardId && (r.scriptName?.trim().toLowerCase() === exactName.toLowerCase() || r.scriptName?.trim().toLowerCase() === `${cardName}_正则`.toLowerCase()));
      if (byExactName) {
        boundRegexId = byExactName.id;
        byExactName.sourceCardId = cardId;
        byExactName.sourceCardName = card.name;
      }
    }

    // C. Single Script Binding
    let boundScriptId: string | null = null;
    if (card.boundScripts && card.boundScripts.length > 0) {
      const valid = modifiedScripts.find(s => card.boundScripts!.includes(s.id) && (!s.sourceCardId || s.sourceCardId === cardId));
      if (valid) boundScriptId = valid.id;
    }
    if (!boundScriptId) {
      const bySource = modifiedScripts.find(s => s.sourceCardId === cardId);
      if (bySource) boundScriptId = bySource.id;
    }
    if (!boundScriptId && cardName) {
      const exactName = `[${cardName}] 酒馆脚本`;
      const byExactName = modifiedScripts.find(s => !s.sourceCardId && (s.name.trim().toLowerCase() === exactName.toLowerCase() || s.name.trim().toLowerCase() === `${cardName}_脚本`.toLowerCase()));
      if (byExactName) {
        boundScriptId = byExactName.id;
        byExactName.sourceCardId = cardId;
        byExactName.sourceCardName = card.name;
      }
    }

    return {
      ...card,
      boundWorldBooks: boundWbId ? [boundWbId] : [],
      boundRegexes: boundRegexId ? [boundRegexId] : [],
      boundScripts: boundScriptId ? [boundScriptId] : []
    };
  });

  return {
    ...appData,
    cards: modifiedCards,
    stWorldBooks: modifiedWorldBooks,
    stRegexScripts: modifiedRegexes,
    scripts: modifiedScripts
  };
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
