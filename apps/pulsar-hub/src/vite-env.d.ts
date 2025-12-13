/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PULSAR_HUB_SUPABASE_URL: string;
  readonly VITE_PULSAR_HUB_SUPABASE_ANON_KEY: string;
  readonly VITE_PULSAR_HUB_PORT: string;
  readonly VITE_PULSAR_GFX_URL: string;
  readonly VITE_PULSAR_VS_URL: string;
  readonly VITE_PULSAR_MCR_URL: string;
  readonly VITE_NEXUS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
