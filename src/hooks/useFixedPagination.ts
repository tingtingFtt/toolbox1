import { useEffect, useState } from 'react';
import { paginationBounds } from '../utils/pagination';

export function useFixedPagination(total: number, resetKey: string, pageSize = 50) {
  const [state, setState] = useState({ key: resetKey, page: 0 });
  const bounds = paginationBounds(total, state.key === resetKey ? state.page : 0, pageSize);
  useEffect(() => {
    setState(prev => prev.key === resetKey && prev.page === bounds.page ? prev : { key: resetKey, page: bounds.page });
  }, [resetKey, bounds.page]);
  const setPage = (page: number) => setState({ key: resetKey, page: paginationBounds(total, page, pageSize).page });
  return { ...bounds, setPage, pageSize };
}
