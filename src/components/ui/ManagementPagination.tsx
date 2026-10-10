import React, { useEffect, useState } from 'react';
import { ActionButton } from './ActionButton';
import { BaseInput } from './BaseInput';
import { paginationBounds, paginationNumbers } from '../../utils/pagination';

export function ManagementPagination({ total, page, pageSize, onPageChange, unit = '项', label = '资源分页' }: {
  total: number; page: number; pageSize: number; onPageChange: (page: number) => void; unit?: string; label?: string;
}) {
  const bounds = paginationBounds(total, page, pageSize);
  const [jump, setJump] = useState(String(bounds.page + 1));
  useEffect(() => setJump(String(bounds.page + 1)), [bounds.page]);
  const numbers = paginationNumbers(bounds.page, bounds.pages);
  return <nav aria-label={label} className="w-full min-w-0 flex flex-col items-center gap-2 py-3 text-[10px] sm:text-xs">
    <p className="text-[var(--dim)]" aria-live="polite">共 {total} {unit} · 每页 {pageSize} {unit} · 当前 {total ? bounds.start + 1 : 0}–{bounds.end} · 第 {bounds.page + 1} / {bounds.pages} 页</p>
    <div className="flex items-center justify-center gap-1 flex-wrap">
      <ActionButton action="custom" disabled={bounds.page === 0} onClick={() => onPageChange(bounds.page - 1)}>上一页</ActionButton>
      {numbers.map((n, i) => <React.Fragment key={n}>
        {i > 0 && n - numbers[i - 1] > 1 && <span aria-hidden="true" className="px-1">…</span>}
        <ActionButton action="custom" aria-label={`第 ${n + 1} 页`} aria-current={bounds.page === n ? 'page' : undefined} tone={bounds.page === n ? 'primary' : 'secondary'} onClick={() => onPageChange(n)}>{n + 1}</ActionButton>
      </React.Fragment>)}
      <ActionButton action="custom" disabled={bounds.page === bounds.pages - 1} onClick={() => onPageChange(bounds.page + 1)}>下一页</ActionButton>
      <form className="flex items-center gap-1 ml-1" onSubmit={e => { e.preventDefault(); const target = Number(jump); if (Number.isInteger(target) && target >= 1 && target <= bounds.pages) onPageChange(target - 1); }}>
        <BaseInput type="number" aria-label="跳转页码" min={1} max={bounds.pages} required value={jump} onChange={e => setJump(e.target.value)} className="w-14 min-w-0 px-1 py-1 text-center bg-transparent border border-[var(--line)] rounded" />
        <ActionButton action="custom" type="submit">跳转</ActionButton>
      </form>
    </div>
  </nav>;
}
