import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ManagementGrid } from './ManagementChrome';
import { ViewMode } from './ViewModeDropdown';

test('chosen 3, 4 and 5 columns stay exact at phone, tablet, desktop and split-screen widths', () => {
  for (const width of [240, 320, 375, 430, 600, 768, 1024, 1280, 1920]) {
    for (const [mode, count] of [['grid-3', 3], ['grid-4', 4], ['grid-5', 5], ['list', 1]] as [ViewMode, number][]) {
      const markup = renderToStaticMarkup(React.createElement(ManagementGrid, {
        viewMode: mode,
        // Caller defaults must not collapse an explicitly chosen grid into one column.
        className: 'grid-cols-1 sm:grid-cols-2',
        style: { width, gridTemplateColumns: 'repeat(1, 1fr)' },
      }, Array.from({ length: 15 }, (_, i) => React.createElement('div', { key: i }, `Card ${i}`))));
      assert.ok(markup.includes(`grid-template-columns:repeat(${count}, minmax(0, 1fr))`), `${mode} at ${width}px`);
      assert.ok(markup.includes(`width:${width}px`));
      assert.ok(markup.includes('display:grid'));
      assert.equal((markup.match(/>Card \d+</g) || []).length, 15);
    }
  }
});

test('grids without a view choice retain custom layouts', () => {
  const markup = renderToStaticMarkup(React.createElement(ManagementGrid, {
    style: { gridTemplateColumns: '120px 1fr' },
  }));
  assert.ok(markup.includes('grid-template-columns:120px 1fr'));
  assert.ok(!markup.includes('data-view-mode'));
});
