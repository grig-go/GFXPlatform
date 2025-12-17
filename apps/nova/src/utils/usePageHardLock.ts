import { useState, useRef, useLayoutEffect } from "react";

/**
 * Hard-lock pagination that survives even forced remounts.
 * 
 * This is the nuclear option when:
 * - useStickyPagination still snaps back
 * - Component is being remounted (not just re-rendered)
 * - Figma Make is regenerating the subtree
 * - Dynamic keys are causing remounts
 * 
 * How it works:
 * 1. Stores page in localStorage (survives remount)
 * 2. Uses useLayoutEffect to force page back after every render
 * 3. Microtask lets child UI apply defaults, then we override
 * 
 * Use ONLY when:
 * - useMountProbe shows MOUNT → UNMOUNT cycles
 * - Cannot remove dynamic key prop
 * - Cannot lift pagination outside remounting subtree
 * 
 * @example
 * ```tsx
 * // Instead of:
 * const [page, setPage] = useState(1);
 * 
 * // Use:
 * const { page, setPage } = usePageHardLock("my-table", 1);
 * 
 * // Page will stay locked even if component remounts
 * ```
 */
export function usePageHardLock(storageKey: string, initialPage: number) {
  const readLS = (k: string, fallback: number): number => {
    try {
      const s = localStorage.getItem(k);
      return s ? JSON.parse(s) : fallback;
    } catch {
      return fallback;
    }
  };

  const [page, _setPage] = useState<number>(() => readLS(`${storageKey}:p`, initialPage));
  const pageRef = useRef(page);
  const guardRef = useRef(false);

  const setPage = (next: number) => {
    pageRef.current = next;
    _setPage(next);
    try {
      localStorage.setItem(`${storageKey}:p`, JSON.stringify(next));
    } catch {
      console.warn(`Failed to persist page to localStorage: ${storageKey}`);
    }
  };

  // HARD ENFORCER: after every render where external changes might have applied,
  // force the page back to the last user-chosen value exactly once.
  useLayoutEffect(() => {
    if (guardRef.current) return;
    guardRef.current = true;
    
    // Microtask lets child UI apply internal defaults first, then we override.
    queueMicrotask(() => {
      guardRef.current = false;
      _setPage(pageRef.current); // no-op if equal
    });
  });

  return { page, setPage };
}

/**
 * Hard-lock pagination with page size support.
 * 
 * Same as usePageHardLock but also manages pageSize.
 * 
 * @example
 * ```tsx
 * const { page, pageSize, setPage, setPageSize } = usePageHardLockWithSize("my-table", 1, 25);
 * 
 * <Table
 *   page={page}
 *   pageSize={pageSize}
 *   onPageChange={setPage}
 *   onPageSizeChange={(size) => {
 *     setPageSize(size);
 *     setPage(1); // Reset to page 1 when changing size
 *   }}
 * />
 * ```
 */
export function usePageHardLockWithSize(
  storageKey: string,
  initialPage: number,
  initialPageSize: number
) {
  const readLS = <T,>(k: string, fallback: T): T => {
    try {
      const s = localStorage.getItem(k);
      return s ? JSON.parse(s) : fallback;
    } catch {
      return fallback;
    }
  };

  const [page, _setPage] = useState<number>(() => readLS(`${storageKey}:p`, initialPage));
  const [pageSize, _setPageSize] = useState<number>(() => readLS(`${storageKey}:ps`, initialPageSize));
  
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const guardRef = useRef(false);

  const setPage = (next: number) => {
    pageRef.current = next;
    _setPage(next);
    try {
      localStorage.setItem(`${storageKey}:p`, JSON.stringify(next));
    } catch {
      console.warn(`Failed to persist page to localStorage: ${storageKey}`);
    }
  };

  const setPageSize = (next: number) => {
    pageSizeRef.current = next;
    _setPageSize(next);
    try {
      localStorage.setItem(`${storageKey}:ps`, JSON.stringify(next));
    } catch {
      console.warn(`Failed to persist pageSize to localStorage: ${storageKey}`);
    }
  };

  // HARD ENFORCER: force both page and pageSize back after every render
  useLayoutEffect(() => {
    if (guardRef.current) return;
    guardRef.current = true;
    
    queueMicrotask(() => {
      guardRef.current = false;
      _setPage(pageRef.current);
      _setPageSize(pageSizeRef.current);
    });
  });

  return { page, pageSize, setPage, setPageSize };
}
