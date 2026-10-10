import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { paginationBounds, paginationNumbers } from './pagination';
import { ManagementPagination } from '../components/ui/ManagementPagination';

test('fixed pages cover 10,000 records exactly once and never exceed the limit', () => {
  const ids = Array.from({ length: 10_003 }, (_, i) => i);
  const collected: number[] = [];
  const { pages } = paginationBounds(ids.length, 0, 50);
  for (let i = 0; i < pages; i++) {
    const { start, end } = paginationBounds(ids.length, i, 50);
    const page = ids.slice(start, end);
    assert.ok(page.length <= 50);
    collected.push(...page);
  }
  assert.deepEqual(collected, ids);
});

test('shrinking filtered or deleted results clamps to a populated page', () => {
  assert.deepEqual(paginationBounds(10, 199, 50), { page: 0, pages: 1, start: 0, end: 10 });
  assert.deepEqual(paginationBounds(100, 2, 50), { page: 1, pages: 2, start: 50, end: 100 });
  assert.deepEqual(paginationBounds(0, 199, 50), { page: 0, pages: 1, start: 0, end: 0 });
  assert.equal(paginationBounds(10_000, -1, 50).page, 0);
});

test('page navigation remains bounded for very large libraries', () => {
  assert.deepEqual(paginationNumbers(100, 200), [0, 99, 100, 101, 199]);
  assert.ok(paginationNumbers(50_000, 100_000).length <= 5);
  const markup = renderToStaticMarkup(React.createElement(ManagementPagination, { total: 10_000, page: 199, pageSize: 50, onPageChange: () => {} }));
  assert.ok(markup.includes('9951–10000'));
  assert.ok(markup.includes('aria-current="page"'));
  assert.ok(markup.includes('aria-label="跳转页码"'));
  assert.ok((markup.match(/<button/g) || []).length <= 8);
});

test('empty pagination has no negative range and disables both directions', () => {
  const markup = renderToStaticMarkup(React.createElement(ManagementPagination, { total: 0, page: 9, pageSize: 50, onPageChange: () => {} }));
  assert.ok(markup.includes('0–0'));
  assert.equal((markup.match(/disabled=""/g) || []).length, 2);
});
