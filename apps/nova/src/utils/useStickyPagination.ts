import { useState, useEffect, useRef } from "react";

/**
 * StickyPagination guards against snap-backs to page 1 caused by parent re-renders,
 * default props, or remounts. It:
 * 1) Stores page in localStorage (survives re-renders/HMR)
 * 2) Ignores external resets to 1 within a short window after a user-driven change
 * 3) Provides stable handlers you can wire into any UI pager
 * 
 * Use this when your parent keeps pushing page=1 or the component remounts.
 * 
 * @example
 * ```tsx
 * const pagination = useStickyPagination('my-dashboard', 1, 25);
 * 
 * return (
 *   <MyTable
 *     page={pagination.page}
 *     pageSize={pagination.pageSize}
 *     onPageChange={pagination.onUserPageChange}
 *     onPageSizeChange={pagination.onUserPageSizeChange}
 *   />
 * );
 * ```
 */
export function useStickyPagination(
  key: string,
  initialPage = 1,
  initialPageSize = 25
) {
  const readLS = <T,>(k: string, fallback: T): T => {
    try {
      const s = localStorage.getItem(k);
      return s ? JSON.parse(s) : fallback;
    } catch {
      return fallback;
    }
  };

  const [page, setPage] = useState<number>(() => readLS(`${key}:p`, initialPage));
  const [pageSize, setPageSize] = useState<number>(() => readLS(`${key}:ps`, initialPageSize));

  // last user action time – used to ignore immediate parent resets
  const lastUserChangeRef = useRef<number>(0);
  const userChanged = () => {
    lastUserChangeRef.current = performance.now();
  };

  // persist to localStorage
  useEffect(() => {
    localStorage.setItem(`${key}:p`, JSON.stringify(page));
  }, [key, page]);

  useEffect(() => {
    localStorage.setItem(`${key}:ps`, JSON.stringify(pageSize));
  }, [key, pageSize]);

  /**
   * Guard: if an external prop tries to force page=1 right after a user change, ignore it.
   * This prevents snap-backs caused by parent components or race conditions.
   */
  const acceptExternalPage = (next: number) => {
    const dt = performance.now() - lastUserChangeRef.current;
    const isImmediateReset = dt < 400 && next === 1 && page !== 1; // tune window if needed
    if (!isImmediateReset) {
      setPage(next);
    }
  };

  return {
    page,
    pageSize,

    // Wire these to your component's user-triggered events
    onUserPageChange: (next: number) => {
      userChanged();
      setPage(next);
    },

    onUserPageSizeChange: (next: number) => {
      userChanged();
      setPageSize(next);
      setPage(1); // Reset to page 1 when changing page size
    },

    // If your parent computes a "suggested" page (e.g., after fetch), call this instead of setPage
    onExternalPageSuggest: acceptExternalPage,

    // Direct setters (use sparingly, prefer the above methods)
    setPage,
    setPageSize,
  };
}
