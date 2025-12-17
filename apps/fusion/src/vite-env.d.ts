/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FUSION_SUPABASE_URL: string
  readonly VITE_FUSION_SUPABASE_ANON_KEY: string
  readonly VITE_FUSION_PORT: string
  readonly VITE_CURRENT_ELECTION_YEAR: string
  readonly VITE_SKIP_AUTH: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_CLAUDE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
