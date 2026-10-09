import { CardEntry } from '../types';
import { getCardCoreSignature, computeContentHash } from './diffEngine';

export interface TavernFolderLedger {
  folderId: string;
  folderPath: string;
  importCount: number;
  firstImportTime: number;
  lastImportTime: number;
}

export interface TavernCardFingerprint {
  hash: string;
  name: string;
  author?: string;
  fileName?: string;
  folderId?: string;
  confirmedAt: number;
  resolution?: string;
}

const TAVERN_FOLDER_LEDGER_STORAGE_KEY = 'st_tavern_folder_lifecycle_ledger_v1';
const TAVERN_PERMANENT_FINGERPRINTS_KEY = 'st_tavern_permanent_fingerprints_v1';

/**
 * Normalize folder path/identifier for deterministic keying
 */
export function normalizeFolderKey(folderIdOrPath: string): string {
  if (!folderIdOrPath) return 'default_tavern_folder';
  return folderIdOrPath
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
}

/**
 * Load all folder import count ledgers
 */
export function getAllFolderLedgers(): Record<string, TavernFolderLedger> {
  try {
    const raw = localStorage.getItem(TAVERN_FOLDER_LEDGER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse tavern folder ledgers:', e);
    return {};
  }
}

/**
 * Save folder import count ledgers
 */
function saveAllFolderLedgers(ledgers: Record<string, TavernFolderLedger>): void {
  try {
    localStorage.setItem(TAVERN_FOLDER_LEDGER_STORAGE_KEY, JSON.stringify(ledgers));
  } catch (e) {
    console.warn('Failed to save tavern folder ledgers:', e);
  }
}

/**
 * Get import count for a specific folder path / ID
 */
export function getFolderImportCount(folderIdOrPath: string): number {
  const key = normalizeFolderKey(folderIdOrPath);
  const ledgers = getAllFolderLedgers();
  return ledgers[key]?.importCount || 0;
}

/**
 * Check if this is the first import for a folder (importCount === 0)
 */
export function isFirstFolderImport(folderIdOrPath: string): boolean {
  return getFolderImportCount(folderIdOrPath) === 0;
}

/**
 * Increment folder import count and update timestamps
 */
export function incrementFolderImportCount(folderIdOrPath: string, folderName?: string): number {
  const key = normalizeFolderKey(folderIdOrPath);
  const ledgers = getAllFolderLedgers();
  const now = Date.now();

  const existing = ledgers[key];
  const newCount = (existing?.importCount || 0) + 1;

  ledgers[key] = {
    folderId: key,
    folderPath: folderName || existing?.folderPath || folderIdOrPath,
    importCount: newCount,
    firstImportTime: existing?.firstImportTime || now,
    lastImportTime: now
  };

  saveAllFolderLedgers(ledgers);
  return newCount;
}

/**
 * Load permanent tavern card fingerprints ledger (cannot be deleted by normal log clear)
 */
export function getAllTavernFingerprints(): Record<string, TavernCardFingerprint> {
  try {
    const raw = localStorage.getItem(TAVERN_PERMANENT_FINGERPRINTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse permanent tavern fingerprints:', e);
    return {};
  }
}

/**
 * Save permanent tavern card fingerprints ledger
 */
function saveAllTavernFingerprints(fingerprints: Record<string, TavernCardFingerprint>): void {
  try {
    localStorage.setItem(TAVERN_PERMANENT_FINGERPRINTS_KEY, JSON.stringify(fingerprints));
  } catch (e) {
    console.warn('Failed to save permanent tavern fingerprints:', e);
  }
}

/**
 * Calculate robust SHA-256 / 64-bit fingerprint of a card
 */
export function getCardFingerprintHash(card: Partial<CardEntry>): string {
  const sig = getCardCoreSignature(card);
  return computeContentHash(sig);
}

/**
 * Check if a card's fingerprint is already in the permanent Tavern ledger
 */
export function isTavernCardFingerprintRecorded(cardHash: string): boolean {
  if (!cardHash) return false;
  const fingerprints = getAllTavernFingerprints();
  return !!fingerprints[cardHash];
}

/**
 * Record a verified Tavern card into the permanent ledger
 */
export function recordTavernCardFingerprint(
  card: CardEntry,
  resolution: string = 'confirmed',
  folderId?: string
): void {
  const hash = getCardFingerprintHash(card);
  if (!hash) return;

  const fingerprints = getAllTavernFingerprints();
  fingerprints[hash] = {
    hash,
    name: card.name || '未命名卡片',
    author: card.author,
    fileName: card.fileName,
    folderId: folderId ? normalizeFolderKey(folderId) : undefined,
    confirmedAt: Date.now(),
    resolution
  };

  saveAllTavernFingerprints(fingerprints);
}

/**
 * Batch record multiple cards into permanent ledger
 */
export function batchRecordTavernCardFingerprints(
  cards: CardEntry[],
  resolution: string = 'confirmed',
  folderId?: string
): void {
  if (!cards || cards.length === 0) return;
  const fingerprints = getAllTavernFingerprints();
  const now = Date.now();
  const normFolder = folderId ? normalizeFolderKey(folderId) : undefined;

  for (const card of cards) {
    const hash = getCardFingerprintHash(card);
    if (hash) {
      fingerprints[hash] = {
        hash,
        name: card.name || '未命名卡片',
        author: card.author,
        fileName: card.fileName,
        folderId: normFolder,
        confirmedAt: now,
        resolution
      };
    }
  }

  saveAllTavernFingerprints(fingerprints);
}
