import { useEffect } from "react";

/**
 * Development utility to detect component mount/unmount cycles.
 * Use this to diagnose if pagination snap-backs are caused by remounting.
 * 
 * If you see MOUNT → UNMOUNT → MOUNT right after clicking Next,
 * the component is being remounted (not just re-rendered).
 * 
 * Common causes:
 * - Dynamic key prop: <Table key={rows.length} />
 * - Parent component remounting
 * - Figma Make layout refresh
 * 
 * @example
 * ```tsx
 * export function MyTable() {
 *   useMountProbe("MyTable");
 *   // If pagination jumps, check console for mount cycles
 *   return <table>...</table>;
 * }
 * ```
 */
export function useMountProbe(name: string) {
  useEffect(() => {
    console.log(`[${name}] MOUNT`);
    return () => console.log(`[${name}] UNMOUNT`);
  }, [name]);
}
