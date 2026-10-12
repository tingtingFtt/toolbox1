import { ImportRecord, TavernFileKind } from '../types';

export const IMPORT_KIND_PAGES: Record<Exclude<TavernFileKind, 'unknown'>, string> = {
  card: 'st-cards', preset: 'st-presets', worldbook: 'st-worldbooks', regex: 'st-regex',
  script: 'st-scripts', qr: 'st-qr', theme: 'st-themes',
};

/** Unknown files have no published target; duplicate cards own a separate staging target. */
export function isUnclassifiedImportRecord(record: ImportRecord): boolean {
  return record.status === 'pending' && record.kind === 'unknown' && record.targets.length === 0;
}
export function isDuplicateImportRecord(record: ImportRecord): boolean {
  return record.status === 'skipped' || record.targets.some(target => target.field === 'stagedDuplicateCards');
}
export function matchesImportRecordArea(record: ImportRecord, area: string): boolean {
  if (area === 'all') return true;
  if (area === 'unclassified') return isUnclassifiedImportRecord(record);
  if (area === 'duplicates') return isDuplicateImportRecord(record);
  return record.status === area;
}
