/**
 * System Fixed Tags Utilities (固定系统标签库)
 * 「酒馆」与「本地」为系统固定来源身份标签，不能被随意删除或修改，与普通自定义标签区分开。
 */

export const FIXED_SYSTEM_TAGS = [
  '酒馆',
  '本地',
  '酒馆同步',
  '本地同步',
  '酒馆拉取',
  '本地导入'
] as const;

export type FixedSystemTag = typeof FIXED_SYSTEM_TAGS[number];

/**
 * Checks if a tag is a fixed system tag.
 */
export function isFixedSystemTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') return false;
  const trimmed = tag.trim();
  if (FIXED_SYSTEM_TAGS.includes(trimmed as any)) return true;
  if (trimmed === '酒馆' || trimmed === '本地') return true;
  if (trimmed.startsWith('酒馆') || trimmed.startsWith('本地')) return true;
  return false;
}

/**
 * Check if a card is from SillyTavern (has tavern tag or source).
 */
export function isTavernCard(card: { customTags?: string[]; tags?: string[]; source?: string }): boolean {
  if (!card) return false;
  const tags = [...(card.customTags || []), ...(card.tags || [])];
  if (tags.some(t => typeof t === 'string' && (t === '酒馆' || t === '酒馆同步' || t === '酒馆拉取' || t.toLowerCase().includes('tavern')))) {
    return true;
  }
  if (card.source === 'tavern' || card.source === 'tavern-folder' || card.source === 'tavern-network') {
    return true;
  }
  return false;
}

/**
 * Check if a card is purely a Local Card (not in SillyTavern).
 */
export function isLocalOnlyCard(card: { customTags?: string[]; tags?: string[]; source?: string }): boolean {
  return !isTavernCard(card);
}
