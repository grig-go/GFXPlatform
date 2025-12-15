/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ANTHROPIC_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Splitting.js type declarations
declare module 'splitting' {
  interface SplittingOptions {
    target?: string | Element | Element[] | NodeList;
    by?: 'chars' | 'words' | 'lines' | 'items' | 'rows' | 'cols' | 'grid' | 'cells' | 'cellRows' | 'cellCols';
    key?: string;
  }

  interface SplittingResult {
    el: Element;
    chars?: HTMLElement[];
    words?: HTMLElement[];
    lines?: HTMLElement[];
    items?: HTMLElement[];
    rows?: HTMLElement[][];
    cols?: HTMLElement[][];
    cells?: HTMLElement[];
    cellRows?: HTMLElement[][];
    cellCols?: HTMLElement[][];
  }

  function Splitting(options?: SplittingOptions): SplittingResult[];

  export = Splitting;
}

declare module 'splitting/dist/splitting.css';
declare module 'splitting/dist/splitting-cells.css';

