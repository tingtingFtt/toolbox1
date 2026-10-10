export function paginationBounds(total: number, requestedPage: number, pageSize: number) {
  const size = Math.max(1, Math.floor(pageSize));
  const count = Math.max(0, Math.floor(total));
  const pages = Math.max(1, Math.ceil(count / size));
  const page = Math.min(pages - 1, Math.max(0, Math.floor(requestedPage) || 0));
  return { page, pages, start: page * size, end: Math.min(count, (page + 1) * size) };
}

/** Keep navigation bounded even for libraries with thousands of pages. */
export function paginationNumbers(page: number, pages: number) {
  return [...new Set([0, page - 1, page, page + 1, pages - 1])]
    .filter(n => n >= 0 && n < pages).sort((a, b) => a - b);
}
