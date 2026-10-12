import assert from 'node:assert/strict';
import test from 'node:test';
import { ImportRecord } from '../types';
import { IMPORT_KIND_PAGES, isUnclassifiedImportRecord, isDuplicateImportRecord, matchesImportRecordArea } from './importRecordAreas';
const record = (patch: Partial<ImportRecord> = {}): ImportRecord => ({ id: 'pending', recordId: 'pending', kind: 'unknown', fileName: 'unknown.json', relativePath: 'folder/unknown.json', fileKey: 'original', hash: 'hash', source: 'local', importedAt: 1, status: 'pending', message: '无法分类', targets: [], ...patch });

test('unclassified area only contains pending unknown files without published targets', () => {
  assert.equal(isUnclassifiedImportRecord(record()), true);
  assert.equal(isUnclassifiedImportRecord(record({ kind: 'card' })), false);
  assert.equal(isUnclassifiedImportRecord(record({ targets: [{ field: 'cards', id: 'card' }] })), false);
  assert.equal(isUnclassifiedImportRecord(record({ status: 'imported' })), false);
});
test('duplicate staging and exact duplicate records never enter the unclassified queue', () => {
  for (const kind of ['card', 'unknown'] as const) {
    const staged = record({ kind, targets: [{ field: 'stagedDuplicateCards', id: 'staged' }] });
    assert.equal(isUnclassifiedImportRecord(staged), false);
    assert.equal(isDuplicateImportRecord(staged), true);
    assert.equal(matchesImportRecordArea(staged, 'unclassified'), false);
    assert.equal(matchesImportRecordArea(staged, 'duplicates'), true);
  }
  assert.equal(isDuplicateImportRecord(record({ status: 'skipped', kind: 'regex' })), true);
  assert.equal(isUnclassifiedImportRecord(record({ status: 'skipped' })), false);
});
test('parse failures remain in failed records and successful classification exits the queue', () => {
  const failed = record({ status: 'failed' });
  assert.equal(matchesImportRecordArea(failed, 'unclassified'), false);
  assert.equal(matchesImportRecordArea(failed, 'failed'), true);
  const imported = record({ status: 'imported', kind: 'worldbook', targets: [{ field: 'stWorldBooks', id: 'book' }] });
  assert.equal(matchesImportRecordArea(imported, 'unclassified'), false);
  assert.equal(matchesImportRecordArea(imported, 'imported'), true);
});
test('classification routes each supported type to its own resource manager', () => {
  assert.deepEqual(IMPORT_KIND_PAGES, { card: 'st-cards', preset: 'st-presets', worldbook: 'st-worldbooks', regex: 'st-regex', script: 'st-scripts', qr: 'st-qr', theme: 'st-themes' });
});
test('large mixed histories keep pending files and duplicates disjoint without mutating history', () => {
  const records = Array.from({ length: 10000 }, (_, i) => record(i % 2 ? { id: String(i), kind: 'card', targets: [{ field: 'stagedDuplicateCards', id: String(i) }] } : { id: String(i) }));
  const before = structuredClone(records);
  const pending = records.filter(item => matchesImportRecordArea(item, 'unclassified'));
  const duplicates = records.filter(item => matchesImportRecordArea(item, 'duplicates'));
  assert.equal(pending.length, 5000); assert.equal(duplicates.length, 5000);
  const ids = new Set(pending.map(item => item.id));
  assert.ok(duplicates.every(item => !ids.has(item.id)));
  assert.deepEqual(records, before);
});
