import { AppData, CardEntry } from '../types';
import { hydrateCard, hydrateCardAsset } from './largeCardStore';
import { extractCardRegex, extractCardWorldBook, getCardDisplayName } from '../utils';

type Section = 'worldbook' | 'regex' | 'qr';
/** Prepare full bodies before editing; compact summaries must never overwrite them. */
export async function prepareCardDetailSection(data: AppData, cardId: string, section: Section, payload: any) {
  const summary = data.cards.find(card => card.id === cardId);
  if (!summary) throw Error('角色卡已不存在');
  const full = await hydrateCard(summary);
  const field = section === 'worldbook' ? 'stWorldBooks' : section === 'regex' ? 'stRegexScripts' : 'scripts';
  const owned = (data[field] || []).filter(item => item.sourceCardId === cardId && (section !== 'qr' || (item as any).type === 'qr'));
  const bound = section === 'worldbook' ? full.boundWorldBooks : section === 'regex' ? full.boundRegexes : full.boundScripts;
  const old = owned.find(item => bound?.includes(item.id)) || owned[0];
  const oldFull = old ? await hydrateCardAsset(old) : undefined;
  const updated: CardEntry = { ...full, edited: true, updatedAt: Date.now(), ...(section === 'qr' ? { qrData: payload } : { editHistory: { ...full.editHistory, [section === 'worldbook' ? 'character_book' : 'regex_scripts']: payload } }) };
  let entry: any = section === 'worldbook' ? extractCardWorldBook(updated) : section === 'regex' ? extractCardRegex(updated) : {
    id: `qr_card_${cardId}`, name: payload.name || `${getCardDisplayName(updated)} · QR`, fileName: full.fileName,
    type: 'qr', jsonData: payload, rawContent: JSON.stringify(payload), sourceCardId: cardId,
    sourceCardName: getCardDisplayName(updated), sourceScope: 'card', isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now(),
  };
  // Empty collections remain bound and export as empty, rather than reviving old contents.
  if (!entry && oldFull) entry = { ...oldFull, ...(section === 'regex' ? { rules: [], jsonData: [], findRegex: '', replaceString: '' } : { entries: [], jsonData: payload }) };
  if (entry) entry = { ...oldFull, ...entry, id: old?.id || entry.id, versions: (oldFull as any)?.versions, assetStub: false, sourceScope: 'card' };
  if (entry && section !== 'qr') {
    const binding = section === 'worldbook' ? 'boundWorldBooks' : 'boundRegexes';
    updated[binding] = section === 'worldbook' ? [entry.id, ...(full[binding] || []).filter(id => id !== entry.id)] : [...new Set([...(full[binding] || []), entry.id])];
  }
  return {
    apply(previous: AppData): AppData {
      const current = previous.cards.find(card => card.id === cardId);
      const currentAsset = old && (previous[field] || []).find(item => item.id === old.id);
      if (current !== summary || (old && currentAsset !== old)) throw Error('角色卡数据已变化，请重试本次编辑');
      return { ...previous, cards: previous.cards.map(card => card.id === cardId ? updated : card), [field]: entry ? old ? (previous[field] || []).map(item => item.id === old.id ? entry : item) : [...(previous[field] || []), entry] : previous[field] };
    },
  };
}
