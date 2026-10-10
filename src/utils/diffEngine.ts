import { CardEntry, STWorldBookEntry, STRegexEntry, PresetEntry, ThemeEntry, ItemVersion } from '../types';

export type DiffStatus = 'identical' | 'partially_different' | 'completely_different';

export interface DiffResult {
  status: DiffStatus;
  similarity: number; // 0.0 to 1.0
  summary: string;
  matchedEntityId?: string;
  matchedVersionIndex?: number;
  changedFields: string[];
}

/**
 * Tokenize string for both Latin words and CJK character n-grams
 */
export function extractTextTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  if (!text) return tokens;

  const normalized = text.toLowerCase().replace(/[\r\n\t]+/g, ' ');
  
  // Extract Latin words
  const words = normalized.match(/[a-z0-9_]{2,}/gi) || [];
  words.forEach(w => tokens.add(w));

  // Extract CJK characters and 2-grams
  const cjkChars = normalized.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || [];
  for (let i = 0; i < cjkChars.length; i++) {
    tokens.add(cjkChars[i]);
    if (i < cjkChars.length - 1) {
      tokens.add(cjkChars[i] + cjkChars[i + 1]);
    }
  }

  return tokens;
}

/**
 * Calculate Jaccard similarity score between two texts (0.0 to 1.0)
 */
export function calculateTextSimilarity(textA: string = '', textB: string = ''): number {
  const tA = (textA || '').trim();
  const tB = (textB || '').trim();

  if (tA === tB) return 1.0;
  if (!tA || !tB) return 0.0;

  const tokensA = extractTextTokens(tA);
  const tokensB = extractTextTokens(tB);

  if (tokensA.size === 0 || tokensB.size === 0) {
    return tA === tB ? 1.0 : 0.0;
  }

  let intersection = 0;
  for (const tok of tokensA) {
    if (tokensB.has(tok)) {
      intersection++;
    }
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0.0;
}

/**
 * High-precision 64-bit fast content hash for exact file & version comparison
 */
export function computeContentHash(str: string): string {
  if (!str) return '0';
  let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return combined.padStart(12, '0');
}

// -------------------------------------------------------------
// 1. CARD COMPARISON ENGINE
// -------------------------------------------------------------
export function getCardCoreSignature(card: Partial<CardEntry>): string {
  if (card.payloadStub && card.contentFingerprint) return card.contentFingerprint;
  const data = card.rawData?.data || card.rawData || {};
  const signatureObj = {
    name: (card.name || data.name || '').trim(),
    description: (data.description || card.rawData?.description || '').trim(),
    personality: (data.personality || card.rawData?.personality || '').trim(),
    first_mes: (data.first_mes || card.rawData?.first_mes || '').trim(),
    scenario: (data.scenario || card.rawData?.scenario || '').trim(),
    mes_example: (data.mes_example || card.rawData?.mes_example || '').trim(),
    creator_notes: (data.creator_notes || card.rawData?.creator_notes || '').trim(),
    system_prompt: (data.system_prompt || card.rawData?.system_prompt || '').trim(),
    post_history_instructions: (data.post_history_instructions || card.rawData?.post_history_instructions || '').trim(),
    alternate_greetings: data.alternate_greetings || card.rawData?.alternate_greetings || [],
    character_book: data.character_book || card.rawData?.character_book || null,
    extensions: data.extensions || card.rawData?.extensions || null,
  };
  return computeContentHash(JSON.stringify(signatureObj));
}

export const generateCardFingerprint = getCardCoreSignature;

export interface CardMatchDetail {
  matchedCard: CardEntry;
  matchedVersionLabel: string;
  matchedVersionIndex: number; // -1 for active, >= 0 for history
  isExactHashMatch: boolean;
  incomingHash: string;
  matchedHash: string;
  status: DiffStatus;
  similarity: number;
  summary: string;
  changedFields: string[];
  preliminaryReason: string;
}

/**
 * Perform two-stage screening:
 * 1. Preliminary screening by filename / character name
 * 2. Deep Hash comparison and full field difference check against active and all historical versions
 */
export function findMatchingCardAndVersion(
  incoming: CardEntry,
  existingCards: CardEntry[]
): CardMatchDetail | null {
  if (!incoming || !existingCards || existingCards.length === 0) return null;

  const incName = (incoming.name || '').trim().toLowerCase();
  const incFileName = (incoming.fileName || '').trim().toLowerCase();
  const incRaw = incoming.rawData?.data || incoming.rawData || {};
  const incRawName = (incRaw.name || '').trim().toLowerCase();
  const incHash = getCardCoreSignature(incoming);

  const cleanName = (s: string) =>
    s
      .replace(/\.(png|webp|json|card)$/i, '')
      .replace(/\s*\(\d+\)$/g, '')
      .replace(/[_\s-]+/g, '')
      .trim()
      .toLowerCase();

  const incCleanName = cleanName(incoming.name || '');
  const incCleanFileName = cleanName(incoming.fileName || '');
  const incCleanRawName = cleanName(incRaw.name || '');

  // Stage 1: Preliminary screening candidates
  const candidates: { card: CardEntry; reason: string }[] = [];
  const candidateIds = new Set<string>();

  for (const ext of existingCards) {
    if (ext.id && incoming.id && ext.id === incoming.id) {
      candidates.push({ card: ext, reason: `卡片唯一标识一致 (${incoming.id})` });
      candidateIds.add(ext.id);
      continue;
    }

    // 1. Direct Content Hash check (Fast Exact Duplicate Detection)
    const activeHash = getCardCoreSignature(ext);
    if (incHash && activeHash && incHash === activeHash) {
      candidates.push({ card: ext, reason: `文件核心内容哈希完全相同` });
      if (ext.id) candidateIds.add(ext.id);
      continue;
    }

    // Check historical version hashes
    if (ext.versions && ext.versions.length > 0) {
      let matchedHist = false;
      for (let i = 0; i < ext.versions.length; i++) {
        const v = ext.versions[i];
        if (v.data) {
          const vCard = { ...ext, ...v.data } as CardEntry;
          const vHash = getCardCoreSignature(vCard);
          if (incHash && vHash && incHash === vHash) {
            candidates.push({ card: ext, reason: `与历史版本 (${v.versionLabel || `v${i + 1}`}) 核心哈希完全一致` });
            if (ext.id) candidateIds.add(ext.id);
            matchedHist = true;
            break;
          }
        }
      }
      if (matchedHist) continue;
    }

    const extName = (ext.name || '').trim().toLowerCase();
    const extFileName = (ext.fileName || '').trim().toLowerCase();
    const extRaw = ext.rawData?.data || ext.rawData || {};
    const extRawName = (extRaw.name || '').trim().toLowerCase();

    if (incFileName && extFileName && incFileName === extFileName) {
      candidates.push({ card: ext, reason: `文件名相同 (${incoming.fileName})` });
      if (ext.id) candidateIds.add(ext.id);
    } else if (incName && extName && incName === extName) {
      candidates.push({ card: ext, reason: `角色名称完全一致 (${incoming.name})` });
      if (ext.id) candidateIds.add(ext.id);
    } else if (incRawName && extRawName && incRawName === extRawName) {
      candidates.push({ card: ext, reason: `角色底层标识一致 (${incRaw.name})` });
      if (ext.id) candidateIds.add(ext.id);
    } else {
      // Normalized name comparison (ignoring (1), extensions, underscores)
      const extCleanName = cleanName(ext.name || '');
      const extCleanFileName = cleanName(ext.fileName || '');
      const extCleanRawName = cleanName(extRaw.name || '');

      if (
        (incCleanName && extCleanName && incCleanName === extCleanName) ||
        (incCleanFileName && extCleanFileName && incCleanFileName === extCleanFileName) ||
        (incCleanRawName && extCleanRawName && incCleanRawName === extCleanRawName)
      ) {
        candidates.push({ card: ext, reason: `归一化角色名/文件名相近 (${incoming.name || incoming.fileName})` });
        if (ext.id) candidateIds.add(ext.id);
      }
    }
  }

  if (candidates.length === 0) return null;

  // Stage 2: Deep Hash & Diff comparison for each candidate (checking active & historical versions)
  let bestMatch: CardMatchDetail | null = null;

  for (const { card: extCard, reason } of candidates) {
    const activeHash = getCardCoreSignature(extCard);
    const activeVerLabel = extCard.activeVersionLabel || `v${(extCard.versions?.length || 0) + 1}`;

    // 2a. Check if exact hash match with active version
    if (incHash === activeHash) {
      return {
        matchedCard: extCard,
        matchedVersionLabel: `当前活跃版本 (${activeVerLabel})`,
        matchedVersionIndex: -1,
        isExactHashMatch: true,
        incomingHash: incHash,
        matchedHash: activeHash,
        status: 'identical',
        similarity: 1.0,
        summary: `与当前活跃版本 [${activeVerLabel}] 内容与哈希完全一致`,
        changedFields: [],
        preliminaryReason: reason
      };
    }

    // 2b. Check if exact hash match with any historical version in versions snapshot
    if (extCard.versions && extCard.versions.length > 0) {
      for (let i = 0; i < extCard.versions.length; i++) {
        const v = extCard.versions[i];
        if (v.data) {
          const vCard = { ...extCard, ...v.data } as CardEntry;
          const vHash = getCardCoreSignature(vCard);
          const vLabel = v.versionLabel || `历史版本 v${v.versionNumber || (i + 1)}`;
          if (incHash === vHash) {
            return {
              matchedCard: extCard,
              matchedVersionLabel: vLabel,
              matchedVersionIndex: i,
              isExactHashMatch: true,
              incomingHash: incHash,
              matchedHash: vHash,
              status: 'identical',
              similarity: 1.0,
              summary: `与历史更迭版本 [${vLabel}] 内容与哈希完全一致`,
              changedFields: [],
              preliminaryReason: reason
            };
          }
        }
      }
    }

    // 2c. If not exact hash match, compute structural and text token similarity
    const diff = compareCards(incoming, extCard);
    const candidateDetail: CardMatchDetail = {
      matchedCard: extCard,
      matchedVersionLabel: `当前活跃版本 (${activeVerLabel})`,
      matchedVersionIndex: -1,
      isExactHashMatch: false,
      incomingHash: incHash,
      matchedHash: activeHash,
      status: diff.status,
      similarity: diff.similarity,
      summary: diff.summary,
      changedFields: diff.changedFields,
      preliminaryReason: reason
    };

    if (!bestMatch || candidateDetail.similarity > bestMatch.similarity) {
      bestMatch = candidateDetail;
    }
  }

  return bestMatch;
}

/**
 * Compares two cards with same or matching names.
 * Determines if they are:
 * - 'identical': 100% identical content -> skip
 * - 'partially_different': evolutionary revision of the same character face -> import as new version
 * - 'completely_different': entirely different character concept sharing the same name -> import as distinct card face
 */
export function compareCards(incoming: CardEntry, existing: CardEntry, checkVersions = true): DiffResult {
  const rootResult = _compareSingleCard(incoming, existing);
  rootResult.matchedVersionIndex = -1;

  if (rootResult.status === 'identical' || !checkVersions || !existing.versions || existing.versions.length === 0) {
    return rootResult;
  }

  let bestResult = rootResult;

  for (let i = 0; i < existing.versions.length; i++) {
    const v = existing.versions[i];
    if (v.data) {
      const vCard = { ...existing, ...v.data } as CardEntry;
      const vResult = _compareSingleCard(incoming, vCard);
      vResult.matchedVersionIndex = i;

      if (vResult.status === 'identical') {
        return vResult;
      }

      if (vResult.status === 'partially_different' && bestResult.status === 'partially_different') {
        if (vResult.similarity > bestResult.similarity) {
          bestResult = vResult;
        }
      } else if (vResult.status === 'partially_different' && bestResult.status === 'completely_different') {
        bestResult = vResult;
      } else if (vResult.status === 'completely_different' && bestResult.status === 'completely_different') {
         if (vResult.similarity > bestResult.similarity) {
          bestResult = vResult;
        }
      }
    }
  }

  return bestResult;
}

function _compareSingleCard(incoming: CardEntry, existing: CardEntry): DiffResult {
  const sigIncoming = getCardCoreSignature(incoming);
  const sigExisting = getCardCoreSignature(existing);

  if (sigIncoming === sigExisting) {
    return {
      status: 'identical',
      similarity: 1.0,
      summary: '内容完全一致，已跳过重复导入',
      matchedEntityId: existing.id,
      changedFields: []
    };
  }

  const dataInc = incoming.rawData?.data || incoming.rawData || {};
  const dataExt = existing.rawData?.data || existing.rawData || {};

  const changedFields: string[] = [];

  const descSim = calculateTextSimilarity(dataInc.description || incoming.rawData?.description, dataExt.description || existing.rawData?.description);
  const firstMesSim = calculateTextSimilarity(dataInc.first_mes || incoming.rawData?.first_mes, dataExt.first_mes || existing.rawData?.first_mes);
  const personSim = calculateTextSimilarity(dataInc.personality || incoming.rawData?.personality, dataExt.personality || existing.rawData?.personality);
  const scenarioSim = calculateTextSimilarity(dataInc.scenario || incoming.rawData?.scenario, dataExt.scenario || existing.rawData?.scenario);
  const mesExSim = calculateTextSimilarity(dataInc.mes_example || incoming.rawData?.mes_example, dataExt.mes_example || existing.rawData?.mes_example);
  const systemPromptSim = calculateTextSimilarity(dataInc.system_prompt || incoming.rawData?.system_prompt, dataExt.system_prompt || existing.rawData?.system_prompt);

  if (descSim < 0.99) changedFields.push('角色描述 (Description)');
  if (firstMesSim < 0.99) changedFields.push('第一条问候语 (First Message)');
  if (personSim < 0.99) changedFields.push('性格设定 (Personality)');
  if (scenarioSim < 0.99) changedFields.push('对话场景 (Scenario)');
  if (mesExSim < 0.99) changedFields.push('对话范例 (Examples)');
  if (systemPromptSim < 0.99) changedFields.push('系统提示词 (System Prompt)');

  const authorInc = (incoming.author || dataInc.creator || dataInc.creator_notes || '').trim().toLowerCase();
  const authorExt = (existing.author || dataExt.creator || dataExt.creator_notes || '').trim().toLowerCase();
  const sameAuthor = Boolean(authorInc && authorExt && (authorInc === authorExt || authorInc.includes(authorExt) || authorExt.includes(authorInc)));

  // Weighted overall similarity
  const overallSimilarity = (
    descSim * 0.35 +
    firstMesSim * 0.20 +
    personSim * 0.20 +
    scenarioSim * 0.10 +
    mesExSim * 0.08 +
    systemPromptSim * 0.07
  );

  // Check if character_book exists and has overlap
  const cbInc = dataInc.character_book || incoming.rawData?.character_book;
  const cbExt = dataExt.character_book || existing.rawData?.character_book;
  let cbOverlap = false;
  if (cbInc && cbExt && Array.isArray(cbInc.entries) && Array.isArray(cbExt.entries)) {
    const keysInc = new Set(cbInc.entries.flatMap((e: any) => Array.isArray(e.keys) ? e.keys : [e.keys]));
    const keysExt = new Set(cbExt.entries.flatMap((e: any) => Array.isArray(e.keys) ? e.keys : [e.keys]));
    let common = 0;
    keysInc.forEach(k => { if (k && keysExt.has(k)) common++; });
    if (common > 0) cbOverlap = true;
  }

  // Decision Threshold:
  // If overallSimilarity >= 0.20 OR (sameAuthor && overallSimilarity >= 0.12) OR cbOverlap OR (descSim >= 0.25 || firstMesSim >= 0.35)
  // -> Partially different (evolutionary new version of the card)
  // Otherwise -> Completely different card face (同名不同卡面)
  const isPartiallyDifferent = 
    overallSimilarity >= 0.20 ||
    (sameAuthor && overallSimilarity >= 0.12) ||
    cbOverlap ||
    descSim >= 0.25 ||
    firstMesSim >= 0.35;

  if (isPartiallyDifferent) {
    const summary = `检测到同角色卡版本更新 (相似度 ${(overallSimilarity * 100).toFixed(0)}%，变动：${changedFields.slice(0, 3).join('、') || '局部参数'})`;
    return {
      status: 'partially_different',
      similarity: overallSimilarity,
      summary,
      matchedEntityId: existing.id,
      changedFields
    };
  }

  // Completely different card face!
  return {
    status: 'completely_different',
    similarity: overallSimilarity,
    summary: `同名但人物设定差异巨大 (相似度仅 ${(overallSimilarity * 100).toFixed(0)}%)，判定为独立新卡面`,
    matchedEntityId: existing.id,
    changedFields
  };
}

// -------------------------------------------------------------
// 2. WORLDBOOK COMPARISON ENGINE
// -------------------------------------------------------------
export function getWorldBookCoreSignature(entries: any[] = [], jsonData?: any): string {
  const normalizedEntries = entries.map(e => ({
    keys: e.keys,
    secondary_keys: e.secondary_keys,
    content: (e.content || '').trim(),
    comment: (e.comment || '').trim(),
    selective: e.selective,
    constant: e.constant,
    order: e.insertion_order || e.order
  }));
  return computeContentHash(JSON.stringify({ entries: normalizedEntries, extra: (jsonData?.name || '').trim() }));
}

export function compareWorldBooks(incomingEntries: any[], incomingJson: any, existingWb: STWorldBookEntry): DiffResult {
  const sigIncoming = getWorldBookCoreSignature(incomingEntries, incomingJson);
  const sigExisting = getWorldBookCoreSignature(existingWb.entries, existingWb.jsonData);

  if (sigIncoming === sigExisting) {
    return {
      status: 'identical',
      similarity: 1.0,
      summary: '世界书词条与配置完全一致，跳过重复项',
      matchedEntityId: existingWb.id,
      changedFields: []
    };
  }

  const existingEntries = Array.isArray(existingWb.entries) ? existingWb.entries : Object.values(existingWb.entries || {});
  const getKeys = (list: any[]) => {
    const set = new Set<string>();
    list.forEach(item => {
      if (Array.isArray(item.keys)) item.keys.forEach((k: string) => k && set.add(k.trim().toLowerCase()));
      else if (typeof item.keys === 'string') set.add(item.keys.trim().toLowerCase());
      if (item.comment) set.add(item.comment.trim().toLowerCase());
    });
    return set;
  };

  const setInc = getKeys(incomingEntries);
  const setExt = getKeys(existingEntries);

  let commonKeys = 0;
  setInc.forEach(k => {
    if (setExt.has(k)) commonKeys++;
  });

  const totalKeys = Math.max(1, setInc.size + setExt.size - commonKeys);
  const keyOverlap = commonKeys / totalKeys;

  const changedFields: string[] = [];
  if (incomingEntries.length !== existingEntries.length) {
    changedFields.push(`词条数量变动 (${existingEntries.length} -> ${incomingEntries.length})`);
  }

  if (keyOverlap >= 0.12 || commonKeys >= 2 || (setInc.size === 0 && setExt.size === 0)) {
    return {
      status: 'partially_different',
      similarity: Math.max(keyOverlap, 0.3),
      summary: `世界书内容更新 (共有词条/关键字 ${commonKeys} 个，变动 ${changedFields.join('、') || '词条内容'})`,
      matchedEntityId: existingWb.id,
      changedFields
    };
  }

  return {
    status: 'completely_different',
    similarity: keyOverlap,
    summary: `同名世界书但词条设定无重叠 (共有关键字 0 个)，判定为独立世界书`,
    matchedEntityId: existingWb.id,
    changedFields
  };
}

// -------------------------------------------------------------
// 3. REGEX SCRIPTS COMPARISON ENGINE
// -------------------------------------------------------------
export function getRegexCoreSignature(rules: any[] = [], jsonData?: any, findRegex?: string, replaceString?: string): string {
  if (rules && rules.length > 0) {
    const normalized = rules.map(r => ({
      find: (typeof r?.findRegex === 'string' ? r.findRegex : typeof r?.find === 'string' ? r.find : '').trim(),
      replace: (typeof r?.replaceString === 'string' ? r.replaceString : typeof r?.replace === 'string' ? r.replace : '').trim(),
      placement: r?.placement,
      disabled: Boolean(r?.disabled)
    }));
    return computeContentHash(JSON.stringify(normalized));
  }
  return computeContentHash(JSON.stringify({
    findRegex: (typeof findRegex === 'string' ? findRegex : '').trim(),
    replaceString: (typeof replaceString === 'string' ? replaceString : '').trim(),
    jsonData
  }));
}

export function compareRegexScripts(
  incomingRules: any[] = [],
  incomingJson: any,
  findRegex?: string,
  replaceString?: string,
  existingRegex?: STRegexEntry
): DiffResult {
  if (!existingRegex) {
    return { status: 'completely_different', similarity: 0, summary: '全新正则脚本', changedFields: [] };
  }

  const sigIncoming = getRegexCoreSignature(incomingRules, incomingJson, findRegex, replaceString);
  const sigExisting = getRegexCoreSignature(existingRegex.rules, existingRegex.jsonData, existingRegex.findRegex, existingRegex.replaceString);

  if (sigIncoming === sigExisting) {
    return {
      status: 'identical',
      similarity: 1.0,
      summary: '正则表达式规则完全一致，跳过重复项',
      matchedEntityId: existingRegex.id,
      changedFields: []
    };
  }

  // Check rule count and pattern overlap
  const extRules = existingRegex.rules || [];
  const findPatternsExt = new Set(extRules.map(r => (typeof r?.findRegex === 'string' ? r.findRegex : typeof r?.find === 'string' ? r.find : '').trim()).filter(Boolean));
  if (existingRegex.findRegex && typeof existingRegex.findRegex === 'string') findPatternsExt.add(existingRegex.findRegex.trim());

  const findPatternsInc = new Set(incomingRules.map(r => (typeof r?.findRegex === 'string' ? r.findRegex : typeof r?.find === 'string' ? r.find : '').trim()).filter(Boolean));
  if (findRegex && typeof findRegex === 'string') findPatternsInc.add(findRegex.trim());

  let matchedPatterns = 0;
  findPatternsInc.forEach(p => {
    if (findPatternsExt.has(p)) matchedPatterns++;
  });

  const changedFields: string[] = [];
  if (incomingRules.length !== extRules.length) changedFields.push(`规则数量变动 (${extRules.length} -> ${incomingRules.length})`);

  if (matchedPatterns > 0 || (findPatternsInc.size === 0 && findPatternsExt.size === 0)) {
    return {
      status: 'partially_different',
      similarity: 0.5,
      summary: `正则脚本规则更新 (${changedFields.join('、') || '表达式或替换文本已修改'})`,
      matchedEntityId: existingRegex.id,
      changedFields
    };
  }

  return {
    status: 'completely_different',
    similarity: 0.0,
    summary: `同名但匹配规则完全不同，判定为独立正则脚本`,
    matchedEntityId: existingRegex.id,
    changedFields
  };
}

// -------------------------------------------------------------
// 4. PRESETS COMPARISON ENGINE
// -------------------------------------------------------------
export function comparePresets(incomingJson: any, rawString: string, existingPreset: PresetEntry): DiffResult {
  const strExt = existingPreset.rawJsonString || JSON.stringify(existingPreset.jsonData || {});
  const strInc = rawString || JSON.stringify(incomingJson || {});

  if (computeContentHash(strExt.trim()) === computeContentHash(strInc.trim())) {
    return {
      status: 'identical',
      similarity: 1.0,
      summary: '预设配置完全一致，跳过重复项',
      matchedEntityId: existingPreset.id,
      changedFields: []
    };
  }

  // Check key schema overlap
  const keysExt = Object.keys(existingPreset.jsonData || {});
  const keysInc = Object.keys(incomingJson || {});
  const overlap = keysInc.filter(k => keysExt.includes(k)).length / Math.max(1, keysInc.length);

  if (overlap >= 0.4) {
    return {
      status: 'partially_different',
      similarity: overlap,
      summary: `预设参数更新 (采样参数或模型配置已变动)`,
      matchedEntityId: existingPreset.id,
      changedFields: ['采样参数', '提示词链']
    };
  }

  return {
    status: 'completely_different',
    similarity: overlap,
    summary: `同名但预设数据结构不一致，判定为独立预设`,
    matchedEntityId: existingPreset.id,
    changedFields: []
  };
}

// -------------------------------------------------------------
// 5. THEMES COMPARISON ENGINE
// -------------------------------------------------------------
export function compareThemes(incomingContent: string, existingTheme: ThemeEntry): DiffResult {
  const contentExt = (existingTheme.content || (existingTheme as any).css || '').trim();
  const contentInc = (incomingContent || '').trim();

  if (computeContentHash(contentExt) === computeContentHash(contentInc)) {
    return {
      status: 'identical',
      similarity: 1.0,
      summary: '主题样式完全一致，跳过重复项',
      matchedEntityId: existingTheme.id,
      changedFields: []
    };
  }

  const sim = calculateTextSimilarity(contentInc, contentExt);
  if (sim >= 0.3) {
    return {
      status: 'partially_different',
      similarity: sim,
      summary: `主题样式变动 (相似度 ${(sim * 100).toFixed(0)}%)`,
      matchedEntityId: existingTheme.id,
      changedFields: ['CSS样式规则']
    };
  }

  return {
    status: 'completely_different',
    similarity: sim,
    summary: `同名但主题样式差异巨大，判定为独立主题`,
    matchedEntityId: existingTheme.id,
    changedFields: []
  };
}

// -------------------------------------------------------------
// 6. SCRIPTS & PLUGINS COMPARISON ENGINE
// -------------------------------------------------------------
export function compareScripts(incomingContent: string | any, existingScript: any): DiffResult {
  const strExt = typeof existingScript.jsonData === 'object' 
    ? JSON.stringify(existingScript.jsonData) 
    : String(existingScript.rawContent || existingScript.content || existingScript.url || '').trim();
  const strInc = typeof incomingContent === 'object' 
    ? JSON.stringify(incomingContent) 
    : String(incomingContent || '').trim();

  if (computeContentHash(strExt) === computeContentHash(strInc)) {
    return {
      status: 'identical',
      similarity: 1.0,
      summary: '脚本内容完全一致，跳过重复项',
      matchedEntityId: existingScript.id,
      changedFields: []
    };
  }

  const sim = calculateTextSimilarity(strInc, strExt);
  if (sim >= 0.25) {
    return {
      status: 'partially_different',
      similarity: sim,
      summary: `脚本内容已迭代升级 (相似度 ${(sim * 100).toFixed(0)}%)`,
      matchedEntityId: existingScript.id,
      changedFields: ['脚本代码/配置']
    };
  }

  return {
    status: 'completely_different',
    similarity: sim,
    summary: `同名但脚本实现代码完全不同，判定为独立脚本`,
    matchedEntityId: existingScript.id,
    changedFields: []
  };
}

// -------------------------------------------------------------
// 7. NORMAL CARDS COMPARISON ENGINE
// -------------------------------------------------------------
export function compareNormalCards(incomingContent: string, existingCard: any): DiffResult {
  const contentExt = String(existingCard.content || '').trim();
  const contentInc = String(incomingContent || '').trim();

  if (computeContentHash(contentExt) === computeContentHash(contentInc)) {
    return {
      status: 'identical',
      similarity: 1.0,
      summary: '卡片内容完全一致，跳过重复项',
      matchedEntityId: existingCard.id,
      changedFields: []
    };
  }

  const sim = calculateTextSimilarity(contentInc, contentExt);
  if (sim >= 0.25) {
    return {
      status: 'partially_different',
      similarity: sim,
      summary: `普通角色卡内容更新 (相似度 ${(sim * 100).toFixed(0)}%)`,
      matchedEntityId: existingCard.id,
      changedFields: ['设定文本']
    };
  }

  return {
    status: 'completely_different',
    similarity: sim,
    summary: `同名但卡片设定差异巨大，判定为独立角色卡`,
    matchedEntityId: existingCard.id,
    changedFields: []
  };
}


