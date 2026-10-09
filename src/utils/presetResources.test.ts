import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppData, PresetEntry } from '../types';
import {
  createPresetEntry,
  getPresetResources,
  reconcilePresetResources,
  savePresetVersion,
  syncPresetResources,
} from './presetResources';

const fixture = () => ({
  name: 'Example',
  prompts: [{ identifier: 'main', content: 'prompt' }],
  prompt_order: [{ character_id: 100001, order: [{ identifier: 'main', enabled: true }] }],
  temperature: 0.75,
  unknown_setting: { retained: true },
  extensions: {
    regex_scripts: [
      {
        id: 'rx',
        scriptName: 'Rule',
        findRegex: 'a',
        replaceString: 'b',
        disabled: false,
        runOnEdit: true,
        minDepth: 3,
      },
    ],
    tavern_helper: {
      other: true,
      scripts: [
        {
          type: 'folder',
          name: 'Folder',
          scripts: [
            {
              id: 'script',
              type: 'script',
              name: 'Script',
              enabled: true,
              content: 'old code',
              button: { buttons: [{ name: 'Button' }] },
              data: { keep: true },
            },
          ],
        },
      ],
    },
  },
});
const data = (presets: PresetEntry[]): AppData =>
  ({ presets, cards: [], stRegexScripts: [], scripts: [] }) as unknown as AppData;
const setup = () => syncPresetResources(data([createPresetEntry(fixture(), 'example.json')]));

test('import projects leaf scripts and regex with fixed owners and preserves JSON', () => {
  const state = setup();
  assert.equal(state.stRegexScripts.length, 1);
  assert.equal(state.scripts.length, 1);
  assert.equal(state.scripts[0].sourceFolder, 'Folder');
  assert.equal(state.scripts[0].sourcePresetId, state.presets[0].id);
  assert.deepEqual(state.presets[0].jsonData, fixture());
  assert.deepEqual(syncPresetResources(state), state);
});

test('missing names use file basename and invalid preset JSON is rejected', () => {
  assert.equal(createPresetEntry({ prompts: [] }, 'Preset.json').name, 'Preset');
  assert.equal(createPresetEntry({ prompts: [], name: ' ' }, 'Preset.json').name, 'Preset');
  assert.throws(() => createPresetEntry({ unrelated: [] }, 'wrong.json'));
});

test('rule edits update the correct owner and save the actual previous snapshot', () => {
  const state = setup();
  const extra = createPresetEntry(fixture(), 'other.json');
  const before = syncPresetResources({ ...state, presets: [...state.presets, extra] });
  const rx = before.stRegexScripts[0];
  const updated = {
    ...rx,
    rules: [{ ...rx.rules![0], scriptName: 'Renamed', disabled: true, replaceString: 'changed' }],
  };
  const after = reconcilePresetResources(before, {
    ...before,
    stRegexScripts: before.stRegexScripts.map((item) => (item.id === rx.id ? updated : item)),
  });
  assert.equal(after.presets[0].jsonData.extensions.regex_scripts[0].replaceString, 'changed');
  assert.equal(after.presets[0].jsonData.extensions.regex_scripts[0].minDepth, 3);
  assert.equal(after.presets[1].jsonData.extensions.regex_scripts[0].replaceString, 'b');
  assert.equal(after.presets[0].versions?.length, 1);
  assert.equal(
    after.presets[0].versions![0].data.jsonData.extensions.regex_scripts[0].replaceString,
    'b',
  );
  assert.equal(after.stRegexScripts[0].id, rx.id);
});

test('script sub-entry editing and raw code editing preserve metadata and folder structure', () => {
  const before = setup();
  const script = before.scripts[0];
  let after = reconcilePresetResources(before, {
    ...before,
    scripts: [
      { ...script, entries: [{ ...script.entries![0], content: 'new code', enabled: false }] },
    ],
  });
  let exported = after.presets[0].jsonData.extensions.tavern_helper.scripts[0].scripts[0];
  assert.equal(exported.content, 'new code');
  assert.equal(exported.enabled, false);
  assert.deepEqual(
    exported.button,
    fixture().extensions.tavern_helper.scripts[0].scripts[0].button,
  );
  const edited = { ...after.scripts[0], rawContent: 'plain JS code' };
  after = reconcilePresetResources(after, { ...after, scripts: [edited] });
  exported = after.presets[0].jsonData.extensions.tavern_helper.scripts[0].scripts[0];
  assert.equal(exported.content, 'plain JS code');
  assert.equal(exported.id, 'script');
  assert.deepEqual(exported.data, { keep: true });
});

test('source filters remain independent of user groups and tags', () => {
  const before = setup();
  const after = reconcilePresetResources(before, {
    ...before,
    scripts: before.scripts.map((item) => ({ ...item, category: 'Moved', customTags: [] })),
  });
  assert.equal(after.scripts[0].category, 'Moved');
  assert.equal(after.scripts[0].sourceScope, 'preset');
  assert.equal(after.presets[0].versions?.length, 0);
});

test('restore creates a reversible version and reprojects linked resource contents', () => {
  const before = setup();
  const original = before.presets[0];
  const changedJson = fixture();
  changedJson.extensions.regex_scripts = [];
  const edited = savePresetVersion(
    original,
    { ...original, jsonData: changedJson },
    'Remove regex',
  );
  const after = reconcilePresetResources(before, { ...before, presets: [edited] });
  assert.equal(after.stRegexScripts.length, 0);
  const version = after.presets[0].versions![0];
  const restored = savePresetVersion(
    after.presets[0],
    { ...after.presets[0], ...version.data },
    'Restore v1',
  );
  const final = reconcilePresetResources(after, { ...after, presets: [restored] });
  assert.equal(final.stRegexScripts.length, 1);
  assert.equal(final.presets[0].activeVersionNumber, 3);
  assert.equal(final.presets[0].versions?.length, 2);
  assert.equal(final.presets[0].versions![0].data.jsonData.extensions.regex_scripts.length, 0);
});

test('batch deletes keep array paths valid and do not touch standalone or card resources', () => {
  const json = fixture();
  json.extensions.regex_scripts.push(
    { ...json.extensions.regex_scripts[0], id: 'rx2' },
    { ...json.extensions.regex_scripts[0], id: 'rx3' },
  );
  const before = syncPresetResources(data([createPresetEntry(json, 'example.json')]));
  const retained = before.stRegexScripts[2];
  const after = reconcilePresetResources(before, { ...before, stRegexScripts: [retained] });
  assert.equal(after.presets[0].jsonData.extensions.regex_scripts.length, 1);
  assert.equal(after.presets[0].jsonData.extensions.regex_scripts[0].id, 'rx3');
  const independent = { ...retained, id: 'standalone', sourcePresetId: undefined };
  const card = { ...retained, id: 'card', sourcePresetId: undefined, sourceCardId: 'card1' };
  const deleted = reconcilePresetResources(after, {
    ...after,
    presets: [],
    stRegexScripts: [...after.stRegexScripts, independent, card],
  });
  assert.deepEqual(
    deleted.stRegexScripts.map((item) => item.id),
    ['standalone', 'card'],
  );
});

test('unchanged saves do not create duplicate versions', () => {
  const state = setup();
  const saved = savePresetVersion(state.presets[0], JSON.parse(JSON.stringify(state.presets[0])));
  assert.equal(saved.versions?.length, 0);
});

test('duplicate native IDs and dictionary scripts do not collide', () => {
  const json = fixture();
  json.extensions.regex_scripts.push({ ...json.extensions.regex_scripts[0] });
  (json.extensions.tavern_helper as any).scripts = {
    first: { id: 'same', name: 'A', content: 'a' },
    second: { id: 'same', name: 'B', content: 'b' },
  };
  assert.equal(new Set(getPresetResources(json, 'regex').map((item) => item.key)).size, 2);
  assert.equal(new Set(getPresetResources(json, 'script').map((item) => item.key)).size, 2);
});
